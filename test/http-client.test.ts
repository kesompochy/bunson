import HTTPClient from '~/http-client';
import { spyOn, describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { Server } from 'bun';

describe('HTTPClient', () => {
  describe('request', () => {
    let server: Server;
    let fetchSpy: any;

    beforeEach(() => {
      server = Bun.serve({
        port: 8545,
        fetch() {
          return new Response(JSON.stringify({jsonrpc: '2.0', result: 'Hello, world!', id: 0}));
        },
      });
      fetchSpy = spyOn(global, 'fetch');
    });

    afterEach(() => {
      server.stop();
      fetchSpy.mockRestore();
    });
    
    it("can call remote functon", async () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"]
      });
      await client.call('hello', {name: 'world'}, 0);

      expect(fetchSpy).toHaveBeenCalled();
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual(
          {jsonrpc: "2.0", method: "hello", params: {name: "world"}, id: 0}
      );
      expect(fetchSpy.mock.calls[0][1].method).toEqual("POST");
      expect(fetchSpy.mock.calls[0][1].headers).toEqual({"Content-Type": "application/json"});
      expect(fetchSpy.mock.calls[0][0]).toEqual("http://localhost:8545");
    });

    it("should not call remote function if not in methods", async () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"]
      });
      try {
        await client.call('goodbye', {name: 'world'}, 0);
      } catch (e) {
        expect(e.message).toBe("Method goodbye not found");
      }
    });

    it("can call remote function without params", async () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"]
      });
      await client.call('hello', {}, 0);
      expect(fetchSpy).toHaveBeenCalled();
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({jsonrpc: "2.0", method: "hello", id: 0});
    });

    it("can notify remote function", async () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"]
      });
      await client.notify('hello', {name: 'world'});
      expect(fetchSpy).toHaveBeenCalled();
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual({jsonrpc: "2.0", method: "hello", params: {name: "world"}});
    });

    it("can batch remote function calls", async () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"]
      });
      await client.batch([
        {method: "hello", params: {name: "world"}, id: 0},
        {method: "hello", params: {name: "world"}},
      ]);
      expect(fetchSpy).toHaveBeenCalled();
      expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).toEqual([
        {jsonrpc: "2.0", method: "hello", params: {name: "world"}, id: 0},
        {jsonrpc: "2.0", method: "hello", params: {name: "world"}}
      ]);
    });
    it("should fetch with cors mode options", async () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"],
        cors: "no-cors"
      });
      await client.call('hello', {name: 'world'}, 0);
      expect(fetchSpy).toHaveBeenCalled();
      expect(fetchSpy.mock.calls[0][1].mode).toEqual("no-cors");
    });
  });
  describe("other methods", () => {
    it("should add methods to the client", () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"]
      });
      client.addMethod(["goodbye", "seeYouLater"]);
      expect(client.methods).toEqual(new Set(["hello", "goodbye", "seeYouLater"]));
    });
    it("should add a single method to the client", () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello"]
      });
      client.addMethod("goodbye");
      expect(client.methods).toEqual(new Set(["hello", "goodbye"]));
    });
    it("should remove methods from the client", () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello", "goodbye", "seeYouLater"]
      });
      client.removeMethod(["goodbye", "seeYouLater"]);
      expect(client.methods).toEqual(new Set(["hello"]));
    });
    it("should remove a single method from the client", () => {
      const client = new HTTPClient('http://localhost:8545', {
        methods: ["hello", "goodbye", "seeYouLater"]
      });
      client.removeMethod("goodbye");
      expect(client.methods).toEqual(new Set(["hello", "seeYouLater"]));
    });
  });
});
