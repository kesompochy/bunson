import JsonRpcHandler from "~/json-rpc-handler";

describe("JsonRpcHandler", () => {
  let handler: JsonRpcHandler;
  beforeAll(() => {
    const methods = {
      test: () => "test",
      withPositionalParams: (params: number[]) => params[0] - params[1],
      withNamedParams: (param: { a: number, b: number }) => param.a - param.b,
    };
    handler = new JsonRpcHandler({
      methods: methods,
    });
  });
  describe("with a valid request", () => {
    it("should handle a valid request", () => {
      const request = {
        jsonrpc: "2.0",
        method: "test",
        params: [],
        id: 1,
      };

      const response = handler.handleRequest(request);

      expect(response).toEqual({
        jsonrpc: "2.0",
        result: "test",
        id: 1,
      });
    });
    it("should handle a valid request with positional params", () => {
      const request = {
        jsonrpc: "2.0",
        method: "withPositionalParams",
        params: [3, 7],
        id: 1,
      };
      const response = handler.handleRequest(request);
      expect(response).toEqual({
        jsonrpc: "2.0",
        result: -4,
        id: 1,
      });
    });
    it("should handle a valid request with named params", () => {
      const request = {
        jsonrpc: "2.0",
        method: "withNamedParams",
        params: { a: 3, b: 7 },
        id: 1,
      };
      const response = handler.handleRequest(request);
      expect(response).toEqual({
        jsonrpc: "2.0",
        result: -4,
        id: 1,
      });
    });
    it("should not respond to a notify request", () => {
      const request = {
        jsonrpc: "2.0",
        method: "test",
        params: [],
      };
      const response = handler.handleRequest(request);
      expect(response).toBeUndefined();
    });
    it("should handle a batch request", () => {
      const request = [
        { jsonrpc: "2.0", method: "withNamedParams", params: { a: 1, b: 2 }, id: 1 },
        { jsonrpc: "2.0", method: "test", params: [7] },
        { jsonrpc: "2.0", method: "withPositionalParams", params: [7, 3], id: 2 },
        { foo: "bar" },
        { jsonrpc: "2.0", method: "UnexistingMethod", params: [7], id: 3 },
      ];
      const response = handler.handleRequest(request as any);
      expect(response).toEqual([
        {
          jsonrpc: "2.0",
          result: -1,
          id: 1,
        },
        {
          jsonrpc: "2.0",
          result: 4,
          id: 2
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
            code: -32601,
            message: "Method not found",
          },
          id: 3,
        },
      ]);
    });
    it("should not respond to batch with all notifications", () => {
      const request = [
        { jsonrpc: "2.0", method: "test", params: [] },
        { jsonrpc: "2.0", method: "test", params: [] },
      ];
      const response = handler.handleRequest(request);
      expect(response).toBeUndefined();
    });
  });
  describe("with an invalid request", () => {
    it("should return a error to undefined method request", () => {
      const request = {
        jsonrpc: "2.0",
        method: "undefined",
        params: [],
        id: 1,
      };
      const response = handler.handleRequest(request);
      expect(response).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32601,
          message: "Method not found",
        },
        id: 1,
      });
    });
    it("should return a error to invalid request", () => {
      const request = {
        foo: "bar",
      };
      const response = handler.handleRequest(request as any);
      expect(response).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request",
        },
        id: null,
      });
    });
    it("should return a error to an empty array request", () => {
      const request: [] = [];
      const response = handler.handleRequest(request);
      expect(response).toEqual({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request",
        },
        id: null,
      });
    });
    it("should return an error to an invalid batch but not empty request", () => {
      const request = [
        { foo: "bar" },
      ];
      const response = handler.handleRequest(request as any);
      expect(response).toEqual([{
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request",
        },
        id: null,
      }]);
    });
    it("should return errors to an invalid batch request", () => {
      const request = [1, 2, 3]
      const response = handler.handleRequest(request as any);
      expect(response).toEqual([
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
});
