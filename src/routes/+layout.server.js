import { redirect } from "@sveltejs/kit";
import db2 from "$lib/db2.js";

const PUBLIC_ROUTES = ["/login", "/register"];

export async function load({ locals, url }) {
  const { user } = locals;

  if (!user && !PUBLIC_ROUTES.includes(url.pathname)) {
    redirect(302, "/login");
  }

  if (user && PUBLIC_ROUTES.includes(url.pathname)) {
    redirect(302, "/");
  }

  let backlogTasks = [];
  if (user) {
    backlogTasks = await db2.getBacklogTasks(user.id);
  }

  return { user, backlogTasks };
}
