import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { BETTER_AUTH_SECRET } from "$env/static/private";
import { db } from "$lib/mongodb.server.js";

// Persist rate-limit counters in MongoDB so they survive across serverless
// function instances (Netlify). TTL index on `expiresAt` handles cleanup.
const kv = db.collection("kvStore");
kv.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});

const secondaryStorage = {
  get: async (key) => {
    const doc = await kv.findOne({ _id: key });
    return doc?.value ?? null;
  },
  set: async (key, value, ttl) => {
    const expiresAt = ttl ? new Date(Date.now() + ttl * 1000) : null;
    await kv.updateOne(
      { _id: key },
      { $set: { value, ...(expiresAt && { expiresAt }) } },
      { upsert: true }
    );
  },
  delete: async (key) => {
    await kv.deleteOne({ _id: key });
  },
};

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  secondaryStorage,
  session: {
    storeSessionInDatabase: true,
  },
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    window: 10,
    max: 20,
  },
});
