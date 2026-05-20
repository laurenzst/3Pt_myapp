import { redirect } from "@sveltejs/kit";

const PUBLIC_ROUTES = ["/login", "/register"];

export async function load({ locals, url }) {
  const { user } = locals;

  if (!user && !PUBLIC_ROUTES.includes(url.pathname)) {
    redirect(302, "/login");
  }

  if (user && PUBLIC_ROUTES.includes(url.pathname)) {
    redirect(302, "/");
  }

  return { user };
}
