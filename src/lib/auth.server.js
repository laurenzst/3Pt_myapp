import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { twoFactor } from "better-auth/plugins";
import { BETTER_AUTH_SECRET } from "$env/static/private";
import { db } from "$lib/mongodb.server.js";

// Rate-limit counters stored in MongoDB so they persist across serverless
// instances. TTL index cleans up expired entries automatically.
const rlCol = db.collection("rateLimit");
rlCol.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => {});

const rateLimitStorage = {
  get: async (key) => {
    const doc = await rlCol.findOne({ _id: key });
    return doc?.data ?? null;
  },
  set: async (key, value) => {
    // Keep entries for 60s so MongoDB TTL has time to clean them up;
    // BetterAuth's own shouldRateLimit() checks the timestamps.
    const expiresAt = new Date(Date.now() + 60_000);
    await rlCol.updateOne(
      { _id: key },
      { $set: { data: value, expiresAt } },
      { upsert: true }
    );
  },
};

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    twoFactor(),
  ],
  rateLimit: {
    window: 10,
    max: 20,
    customStorage: rateLimitStorage,
  },
});
