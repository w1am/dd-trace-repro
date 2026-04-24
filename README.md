# dd-trace-repro

Minimal, self-contained reproduction for a bug in
[`dd-trace-js`](https://github.com/DataDog/dd-trace-js)'s `@grpc/grpc-js`
instrumentation: client-streaming and bidi RPCs silently return `undefined`
when called with the `(metadata, options, callback)` overload.

## Run

```bash
npm install
node with-dd-trace.js     # bug:      sink = undefined
node without-dd-trace.js  # control:  sink = ClientWritableStreamImpl
```

No gRPC server is required. The bug is synchronous; the wrapped stub returns
`undefined` before any network I/O.