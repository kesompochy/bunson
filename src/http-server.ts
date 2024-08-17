import JsonRpcHandler from './json-rpc-handler';
import type { Server } from 'bun';

interface CORSConfig {
  origin?: string | string[];
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}

export default class HTTPServer {
  private handler: JsonRpcHandler;
  server: Server | null = null; 
  private corsConfig: CORSConfig = {};

  constructor(handler: JsonRpcHandler | { [key: string]: (params: any) => any }, corsConfig?: CORSConfig) {
    if (handler instanceof JsonRpcHandler) {
      this.handler = handler;
    } else {
      this.handler = new JsonRpcHandler({ methods: handler });
    }
    if (corsConfig) {
      this.corsConfig = corsConfig;
    } 
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
  private setCORSHeaders(headers: Headers) {
    const { origin, methods, allowedHeaders, exposedHeaders, credentials, maxAge } = this.corsConfig;
    if (origin) {
      headers.set("Access-Control-Allow-Origin", Array.isArray(origin) ? origin.join(",") : origin);
    }
    if (methods) {
      headers.set("Access-Control-Allow-Methods", methods.join(","));
    }
    if (allowedHeaders) {
      headers.set("Access-Control-Allow-Headers", allowedHeaders.join(","));
    }
    if (exposedHeaders) {
      headers.set("Access-Control-Expose-Headers", exposedHeaders.join(","));
    }
    if (credentials !== undefined) {
      headers.set("Access-Control-Allow-Credentials", credentials.toString());
    }
    if (maxAge) {
      headers.set("Access-Control-Max-Age", maxAge.toString());
    }
  }
  async handleRequest(req: Request): Promise<Response> {
    const headers = new Headers({
      "Content-Type": "application/json",
    });
    this.setCORSHeaders(headers);

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
        headers,
      });
    }
    const response = await this.handler.handleRequest(request);

    if (!response) {
      return new Response(null, {
        status: 204,
        headers
      });
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers,
    });
  }
}
