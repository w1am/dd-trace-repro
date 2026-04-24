process.env.DD_TRACE_ENABLED = 'true';
process.env.DD_TRACE_STARTUP_LOGS = 'false';
process.env.DD_TRACE_AGENT_URL = 'http://127.0.0.1:1';
process.env.DD_TRACE_TELEMETRY_ENABLED = 'false';
require('dd-trace').init({ logInjection: false });

// dd-trace's wrapper catches the underlying grpc-js error and returns undefined;
// subscribing to this channel is the only way to see what actually went wrong.
require('diagnostics_channel')
  .channel('apm:grpc:client:request:error')
  .subscribe((ctx) => {
    // Ignore normal grpc status-code errors (e.g. CANCELLED from probe cleanup);
    // only surface internal failures that dd-trace silently turns into undefined.
    const err = ctx && ctx.error;
    if (err && err.code == null) console.log('  [swallowed]', err.message);
  });

const path = require('node:path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const def = protoLoader.loadSync(path.join(__dirname, 'service.proto'), {
  keepCase: true, longs: String, enums: String, defaults: true,
});
const { example } = grpc.loadPackageDefinition(def);
const client = new example.Aggregator('127.0.0.1:1', grpc.credentials.createInsecure());

const meta = new grpc.Metadata();
const opts = { deadline: new Date(Date.now() + 10_000) };
const noop = () => {};

function probe(label, call) {
  try {
    const sink = call();
    const result = sink
      ? `ok  (${sink.constructor.name})`
      : `BROKEN (returned ${sink})`;
    console.log(label.padEnd(38), result);
    if (sink && typeof sink.cancel === 'function') sink.cancel();
  } catch (e) {
    console.log(label.padEnd(38), `threw: ${e.message}`);
  }
}

probe('Sum(cb)',                  () => client.Sum(noop));
probe('Sum(metadata, cb)',        () => client.Sum(meta, noop));
probe('Sum(metadata, opts, cb)',  () => client.Sum(meta, opts, noop));

client.close();
