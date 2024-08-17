import BunsonServer from '~/http-server';
import JsonRpcHandler from '~/json-rpc-handler';
import getPort from 'get-port';

const fetchToServer = async (request: any, port: number) => {
  const response = await fetch(`http://localhost:${port}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const responseJson = await response.json();
  return responseJson;
};

describe("BunsonServer", () => {
  describe("constructed with JsonRpcHandler", () => {
    let bunsonRpcServer: BunsonServer;
    let jsonRpcHandler: JsonRpcHandler;
    let port: number;
    beforeEach(async () => {
      const methods = {
        test: () => "test",
        withPositionalParams: (params: number[]) => params[0] - params[1],
        withNamedParams: (param: { a: number, b: number }) => param.a - param.b,
      };
      jsonRpcHandler = new JsonRpcHandler({
        methods: methods,
      });
      bunsonRpcServer = new BunsonServer(jsonRpcHandler);
      port = await getPort();
      bunsonRpcServer.listen(port);
    });
    afterEach(() => {
      bunsonRpcServer.stop();
    });
    describe("with a valid request", () => {
      it("should handle a valid request", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "test",
          params: [],
          id: 1,
        };
        const responseJson = await fetchToServer(request, port);
        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          result: "test",
          id: 1,
        });
      });   
      it("should handle a valid request with positional params", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "withPositionalParams",
          params: [3, 7],
          id: 1,
        };
        const responseJson = await fetchToServer(request, port);

        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          result: -4,
          id: 1,
        });
      });
      it("should handle a valid request with named params", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "withNamedParams",
          params: { a: 3, b: 7 },
          id: 1,
        };
        const responseJson = await fetchToServer(request, port);

        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          result: -4,
          id: 1,
        });
      });
      it("should not response to a notification", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "test",
          params: [],
        };
        const responseJson = await fetchToServer(request, port); 
        expect(responseJson).toBeNull();
      });
      it("should handle a batch request", async () => {
        const request = [
          { jsonrpc: "2.0", method: "withNamedParams", params: { a: 1, b: 2 }, id: 1 },
          { jsonrpc: "2.0", method: "withPositionalParams", params: [7] },
          { jsonrpc: "2.0", method: "test", params: [7], id: 2 },
          { foo: "bar" },
          { jsonrpc: "2.0", method: "NoSuchMethod", params: [42, 23], id: 3},
        ];
        const responseJson = await fetchToServer(request, port);
        expect(responseJson).toEqual([
          { jsonrpc: "2.0", result: -1, id: 1 },
          { jsonrpc: "2.0", result: "test", id: 2 },
          { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: null },
          { jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: 3 },
        ]);
      });
      it("should handle a request with id 0", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "test",
          params: [],
          id: 0,
        };
        const responseJson = await fetchToServer(request, port);
        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          result: "test",
          id: 0,
        });
      });
      it("should handle a request with id null", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "test",
          params: [],
          id: null,
        };
        const responseJson = await fetchToServer(request, port);
        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          result: "test",
          id: null,
        });
      });
    });
    describe("with a invalid request", () => {
      it("should return a error to undefined method request", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "undefined",
          params: [],
          id: 1,
        };
        const responseJson = await fetchToServer(request, port);

        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          error: {
            code: -32601,
            message: "Method not found",
          },
          id: 1,
        });
      }); 
      it("should return a error to invalid JSON request", async () => {
        const response = await fetch(`http://localhost:${port}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: "{",
        });
        const responseJson = await response.json();

        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
          },
          id: null,
        });
      });
      it("should return a error to invalid JSON-RPC request", async () => {
        const request = {
          jsonrpc: "2.0",
          method: "test",
          params: "foo",
        };
        const responseJson = await fetchToServer(request, port);

        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
          },
          id: null,
        });
      });
      it("should return an error to invalid JSON, batch request", async () => {
        const response = await fetch(`http://localhost:${port}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: `[
            {"jsonrpc": "2.0", "method": "test", "params": [], "id": 1},
            {"jsonrpc": "2.0", "method"
          ]`,
        });
        const responseJson = await response.json();
        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          error: {
            code: -32700,
            message: "Parse error",
          },
          id: null,
        });
      });
      it("should return an error to an empty array", async () => {
        const request: [] = [];
        const responseJson = await fetchToServer(request, port);

        expect(responseJson).toEqual({
          jsonrpc: "2.0",
          error: {
            code: -32600,
            message: "Invalid Request",
          },
          id: null,
        });
      });
      it("should return an error to an invalid batch request", async () => {
        const request = [1, 2, 3]
        const responseJson = await fetchToServer(request, port);
        expect(responseJson).toEqual([
          {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid Request",
            },
            id: null,
          },
          {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid Request",
            },
            id: null,
          },
          {
            jsonrpc: "2.0",
            error: {
              code: -32600,
              message: "Invalid Request",
            },
            id: null,
          },
        ]);
      });
    });
    describe("as a HTTP server", () => {
      it("can listen on a port", async () => {
        const response = await fetch(`http://localhost:${port}`);
        expect(response).toBeDefined();
      });
      it("can be closed", async () => {
        bunsonRpcServer.stop();    
        try {
          await fetch(`http://localhost:${port}`);
        } catch (error) {
          expect(error).toBeDefined();
        }
      });
    });
  });
  describe("constructed with methods object", () => {
    it("should handle a valid request", async () => {
      const methods = {
        test: () => "test",
        withPositionalParams: (params: number[]) => params[0] - params[1],
        withNamedParams: (param: { a: number, b: number }) => param.a - param.b,
      };
      const bunsonRpcServer = new BunsonServer(methods);
      const PORT = await getPort();
      bunsonRpcServer.listen(PORT);
      const request = {
        jsonrpc: "2.0",
        method: "test",
        params: [],
        id: 1,
      };
      const responseJson = await fetchToServer(request, PORT);
      expect(responseJson).toEqual({
        jsonrpc: "2.0",
        result: "test",
        id: 1,
      });
      bunsonRpcServer.stop();
    });
  });
  describe("constructed with CORS configs", () => {
    it("should set CORS headers", async () => {
      const methods = {
        test: () => "test",
      };
      const corsConfig = {
        origin: "http://example.com",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        exposedHeaders: ["Content-Length"],
        credentials: true,
        maxAge: 3600,
      };
      const bunsonRpcServer = new BunsonServer(methods, corsConfig);
      const PORT = await getPort();
      bunsonRpcServer.listen(PORT);
      const response = await fetch(`http://localhost:${PORT}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Origin": "http://example.com",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "test",
          params: [],
          id: 1,
        }),
      });
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com");
      bunsonRpcServer.stop();
    });
  });
  describe("constructed with a async method", () => {
    it("should handle a valid request", async () => {
      const methods = {
        async test() {
          const result = await new Promise((resolve) => {
            setTimeout(() => {
              resolve("test");
            }, 10);
          });
          return result;
        },
      };
      const bunsonRpcServer = new BunsonServer(methods);
      const PORT = await getPort();
      bunsonRpcServer.listen(PORT);
      const request = {
        jsonrpc: "2.0",
        method: "test",
        params: {},
        id: 1,
      };
      const responseJson = await fetchToServer(request, PORT);
      expect(responseJson).toEqual({
        jsonrpc: "2.0",
        result: "test",
        id: 1,
      });
      bunsonRpcServer.stop();
    });
  });
});

