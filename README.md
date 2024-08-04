# Bunson

Bunson is a JSON-RPC 2.0 server implementation for Bun. It provides a simple way to create JSON-RPC servers with HTTP support using Bun.

## Installation

```bash
$ bun add bunson
```

## Usage

```typescript
import { JsonRpcHandler, BunsonServer } from 'bunson';

const methods = {
  add: (params: { a: number, b: number }) => params.a + params.b,
  subtract: (params: { a: number, b: number }) => params.a - params.b,
};

const handler = new JsonRpcHandler({ methods });

const server = new BunsonServer(handler);
server.listen(3000);
```
