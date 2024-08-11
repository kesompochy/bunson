interface JsonRpcResponse {
  jsonrpc: string;
  result?: Object;
  error?: Object;
  id?: number | string | null;
}

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: Record<string, unknown>;
  id?: number | string | null;
}

interface IParams {
  methods?: string[];
  cors?: 'cors' | 'no-cors' | 'same-origin'; 
}

export default class HTTPClient {

  url: string;
  methods: Set<string> = new Set();
  cors: 'cors' | 'no-cors' | 'same-origin' = 'cors';

  constructor(url: string, params?: IParams) {
    this.url = url;
    if (params?.methods) {
      this.methods = new Set(params.methods);
    }
    if (params?.cors) {
      this.cors = params.cors;
    }
  }
  
  async call(method: string, params: Record<string, unknown>, id?: number | string | null): Promise<JsonRpcResponse | JsonRpcResponse[] | Error> {
    const body: JsonRpcRequest = {jsonrpc: '2.0', method: method};

    if (id !== undefined) {
      body.id = id;
    } else {
      body.id = null;
    }

    if ( Object.keys(params).length > 0 ) {
      body.params = params;
    }

    if (!this.methods.has(method)) {
      throw new Error(`Method ${method} not found`);
    }
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        mode: 'cors'
      });
      const data = await response.json();
      return data;
    } catch (e) {
      console.error(e);
      throw new Error(e);
    }
  }

  async notify(method: string, params: Record<string, unknown>): Promise<void> {
    const body: JsonRpcRequest = {jsonrpc: '2.0', method: method};
    if ( Object.keys(params).length > 0 ) {
      body.params = params;
    }

    if (!this.methods.has(method)) {
      throw new Error(`Method ${method} not found`);
    }
    
    try {
      await fetch(this.url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(body),
        mode: this.cors
      });
    } catch (e) {
      console.error(e);
      throw new Error(e);
    }
  }
  
  async batch(batch: {method: string, params: any, id?: number | string | null}[]): Promise<JsonRpcResponse[]> {
    try {
      const request = await fetch(this.url, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(batch.map(({method, params, id}) => ({jsonrpc: '2.0', method, params, id}))),
        mode: this.cors
      });
      const response = await request.json();
      return response;
    } catch (e) {
      console.error(e);
      throw new Error(e);
    }
  }

  addMethod(method: string | string[]): void {
    if (Array.isArray(method)) {
      method.forEach((m) => this.methods.add(m));
    } else {
      this.methods.add(method);
    }
  }

  removeMethod(method: string | string[]): void {
    if (Array.isArray(method)) {
      method.forEach((m) => this.methods.delete(m));
    } else {
      this.methods.delete(method);
    }
  }
}
