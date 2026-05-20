import { auth } from "$lib/auth.server.js";
import { svelteKitHandler } from "better-auth/svelte-kit";

export async function handle({ event, resolve }) {
  const session = await auth.api.getSession({ headers: event.request.headers });
  event.locals.user = session?.user ?? null;
  event.locals.session = session?.session ?? null;

  return svelteKitHandler({ event, resolve, auth });
}
