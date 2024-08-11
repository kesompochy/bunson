interface Options {
  methods: { [key: string]: (parmas: any) => any; };
}

interface JsonRpcResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number | string | null;
}

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params: any;
  id?: number | string | null;
}

export default class JsonRpcHandler {
  private methods: { [key: string]: (parmas: any) => any } = {};
  constructor(Options?: Options) {
    if (!Options) {
      return;
    }
    this.methods = Options.methods;
  }

  handleRequest(request: JsonRpcRequest | JsonRpcRequest[]): JsonRpcResponse | JsonRpcResponse[] | void { 
    if (request instanceof Array) {
      if (request.length === 0) {
        const response: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32600,
            message: 'Invalid Request',
          },
        };
        return response;
      }
      const responses = this.handleBatchRequest(request);
      if (responses.length === 0) {
        return ;
      }
      return responses;
    }
    return this.handleSingleRequest(request as JsonRpcRequest);
  }

  handleSingleRequest(request: JsonRpcRequest): JsonRpcResponse | void {
    const id = request.id || ((request.id === 0) ? 0 : null);
    const response: JsonRpcResponse = {
      jsonrpc: '2.0',
      id: id,
    };

    if (request.jsonrpc !== '2.0' || (request.params instanceof Array === false && typeof request.params !== 'object')) {
      response.error = {
        code: -32600,
        message: 'Invalid Request',
      };
      return response;
    }

    if (!request.id && request.id !== 0 && request.id !== null) {
      return ;
    }

    if (!this.methods[request.method]) {
      response.error = {
        code: -32601,
        message: 'Method not found',
      };
    } else {
      try {
        response.result = this.methods[request.method](request.params);
      } catch (error) {
        response.error = {
          code: -32000,
          message: 'Server error',
          data: error,
        };
      }
    }

    return response;
  }

  handleBatchRequest(requests: JsonRpcRequest[]): JsonRpcResponse[] {
    const responses = requests.map((request) => this.handleRequest(request));
    return responses.filter((response) => response !== undefined) as JsonRpcResponse[];
  }
}
