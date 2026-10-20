import assert from "node:assert/strict";
import { beforeEach, mock, test } from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier === "@/lib/database/errors") {
      return nextResolve(new URL("./errors.ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});

const uri = "mongodb+srv://test-user:test-password@example.invalid/campus";
process.env.MONGODB_URI = uri;
delete globalThis.mongooseCache;

const events = [];
let connectError;
let connectCalls;
const mongoose = {
  connection: { readyState: 0 },
  async connect(connectionString, options) {
    events.push("connect");
    connectCalls.push({ connectionString, options });
    if (connectError) throw connectError;
    mongoose.connection.readyState = 1;
    return mongoose;
  },
};

mock.module("node:dns/promises", {
  defaultExport: {
    setServers(servers) {
      events.push({ promiseDnsServers: servers });
    },
  },
});
mock.module("mongoose", { defaultExport: mongoose });

const { connectToDatabase, getMongoConnectionDiagnostics } = await import("./index.ts");
const { MongoConnectionError } = await import("./errors.ts");

beforeEach(() => {
  mongoose.connection.readyState = 0;
  globalThis.mongooseCache.conn = null;
  globalThis.mongooseCache.promise = null;
  connectError = undefined;
  connectCalls = [];
});

test("configures the driver's promise DNS resolver before opening an Atlas connection", async () => {
  assert.deepEqual(events, [{ promiseDnsServers: ["8.8.8.8", "1.1.1.1"] }]);
  assert.equal(await connectToDatabase(), mongoose);
  assert.deepEqual(events, [
    { promiseDnsServers: ["8.8.8.8", "1.1.1.1"] },
    "connect",
  ]);
  assert.deepEqual(connectCalls, [{
    connectionString: uri,
    options: { serverSelectionTimeoutMS: 15000, autoIndex: true },
  }]);
});

test("reuses a connected database without opening another connection", async () => {
  await connectToDatabase();
  assert.equal(await connectToDatabase(), mongoose);
  assert.equal(connectCalls.length, 1);
});

test("failed connections remain retryable and logs do not expose credentials", async () => {
  connectError = Object.assign(new Error(`querySrv failed: ${uri}`), { code: "ECONNREFUSED" });
  const logs = [];
  const logger = mock.method(console, "error", (...args) => logs.push(args));
  try {
    await assert.rejects(connectToDatabase(), error => {
      assert.ok(error instanceof MongoConnectionError);
      assert.equal(error.reason, "unavailable");
      return true;
    });
    assert.equal(globalThis.mongooseCache.conn, null);
    assert.equal(globalThis.mongooseCache.promise, null);
    assert.equal(logs[0][1].errorCode, "ECONNREFUSED");
    assert.doesNotMatch(JSON.stringify(logs), /test-user|test-password|example\.invalid/);
    connectError = undefined;
    assert.equal(await connectToDatabase(), mongoose);
    assert.equal(connectCalls.length, 2);
  } finally {
    logger.mock.restore();
  }
});

test("connection diagnostics report configuration without revealing the URI", () => {
  assert.deepEqual(getMongoConnectionDiagnostics(), {
    isConfigured: true,
    isAtlasUri: true,
    usesLocalhost: false,
    envSource: "MONGODB_URI",
  });
});
