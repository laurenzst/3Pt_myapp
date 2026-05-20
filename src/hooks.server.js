import { auth } from "$lib/auth.server.js";
import { svelteKitHandler } from "better-auth/svelte-kit";

export async function handle({ event, resolve }) {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  const response = await svelteKitHandler({ event, resolve, auth });

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}
