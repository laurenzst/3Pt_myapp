import db2 from "$lib/db2.js";

export async function load({ locals }) {
  const userId = locals.user.id;
  const tasks = await db2.getScheduledTasks(userId);
  return { tasks };
}
