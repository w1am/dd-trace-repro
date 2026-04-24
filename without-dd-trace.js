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
