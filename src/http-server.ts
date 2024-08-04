import JsonRpcHandler from './json-rpc-handler';
import type { Server } from 'bun';

export default class HTTPServer {
  private handler: JsonRpcHandler;
  server: Server | null = null; 
  constructor(handler: JsonRpcHandler) {
    this.handler = handler
  }
  listen(port: number) {
    this.server = Bun.serve({
      port: port,
      fetch: (req) => this.handleRequest(req),
    });
  }
  stop() {
    if (!this.server) {
      return;
    }
    this.server.stop();
  }
  async handleRequest(req: Request): Promise<Response> {
    let request;
    try {
      request = await req.json();
    } catch (error) {
      return new Response(JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32700,
          message: 'Parse error',
        },
        id: null,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const response = this.handler.handleRequest(request);

    if (!response) {
      return new Response(null, {
        status: 204,
      });
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
