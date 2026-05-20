import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { BETTER_AUTH_SECRET } from "$env/static/private";
import { db } from "$lib/mongodb.server.js";

export const auth = betterAuth({
  secret: BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
  },
});
