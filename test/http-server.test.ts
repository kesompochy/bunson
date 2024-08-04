import BunsonServer from '~/http-server';
import JsonRpcHandler from '~/json-rpc-handler';

const PORT = 3000;

const fetchToServer = async (request: any) => {
  const response = await fetch(`http://localhost:${PORT}`, {
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
    beforeEach(() => {
      const methods = {
        test: () => "test",
        withPositionalParams: (params: number[]) => params[0] - params[1],
        withNamedParams: (param: { a: number, b: number }) => param.a - param.b,
      };
      jsonRpcHandler = new JsonRpcHandler({
        methods: methods,
      });
      bunsonRpcServer = new BunsonServer(jsonRpcHandler);
      bunsonRpcServer.listen(PORT);
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
        const responseJson = await fetchToServer(request);
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
        const responseJson = await fetchToServer(request);

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
        const responseJson = await fetchToServer(request);

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
        const responseJson = await fetchToServer(request); 
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
        const responseJson = await fetchToServer(request);
        expect(responseJson).toEqual([
          { jsonrpc: "2.0", result: -1, id: 1 },
          { jsonrpc: "2.0", result: "test", id: 2 },
          { jsonrpc: "2.0", error: { code: -32600, message: "Invalid Request" }, id: null },
          { jsonrpc: "2.0", error: { code: -32601, message: "Method not found" }, id: 3 },
        ]);
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
        const responseJson = await fetchToServer(request);

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
        const response = await fetch(`http://localhost:${PORT}`, {
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
        const responseJson = await fetchToServer(request);

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
        const response = await fetch(`http://localhost:${PORT}`, {
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
        const responseJson = await fetchToServer(request);

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
        const responseJson = await fetchToServer(request);
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
        const response = await fetch(`http://localhost:${PORT}`);
        expect(response).toBeDefined();
      });
      it("can be closed", async () => {
        bunsonRpcServer.stop();    
        try {
          await fetch(`http://localhost:${PORT}`);
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
      bunsonRpcServer.listen(PORT);
      const request = {
        jsonrpc: "2.0",
        method: "test",
        params: [],
        id: 1,
      };
      const responseJson = await fetchToServer(request);
      expect(responseJson).toEqual({
        jsonrpc: "2.0",
        result: "test",
        id: 1,
      });
      bunsonRpcServer.stop();
    });
  });
});

