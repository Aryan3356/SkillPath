import { MongoClient } from "mongodb";
import dns from "node:dns";
import { isIP } from "node:net";

declare global { var _mongoClientPromise: Promise<MongoClient> | undefined; }
export function getMongoClientPromise() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Please add MONGODB_URI to .env.local");
  const dnsServers = (process.env.MONGODB_DNS_SERVERS || "").split(",").map((server) => server.trim()).filter((server) => isIP(server) !== 0);
  if (uri.startsWith("mongodb+srv://") && dnsServers.length) dns.setServers(dnsServers);
  const connect = () => {
    const promise = new MongoClient(uri).connect();
    // Keep the rejection available to route handlers, while preventing an early
    // adapter connection failure from becoming an unhandled process rejection.
    void promise.catch(() => undefined);
    return promise;
  };
  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      const promise = connect();
      global._mongoClientPromise = promise;
      void promise.catch(() => {
        if (global._mongoClientPromise === promise) global._mongoClientPromise = undefined;
      });
    }
    return global._mongoClientPromise;
  }
  return connect();
}

export function getMongoDatabaseName() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return "skillpath";
  const schemeEnd = uri.indexOf("://");
  if (schemeEnd < 0) return "skillpath";
  const pathStart = uri.indexOf("/", schemeEnd + 3);
  if (pathStart < 0) return "skillpath";
  const queryStart = uri.indexOf("?", pathStart);
  const encodedName = uri.slice(pathStart + 1, queryStart < 0 ? undefined : queryStart);
  if (!encodedName) return "skillpath";
  try { return decodeURIComponent(encodedName); } catch { return encodedName; }
}
