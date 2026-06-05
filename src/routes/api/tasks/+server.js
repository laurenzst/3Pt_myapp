import { json, error } from "@sveltejs/kit";
import db2 from "$lib/db2.js";

export async function PATCH({ request, locals }) {
  if (!locals.user) throw error(401, "Unauthorized");
  const userId = locals.user.id;

  const { taskId, action, payload } = await request.json();
  if (!taskId || !action) throw error(400, "Missing taskId or action");

  switch (action) {
    case "setDate":
      await db2.setTaskDate(taskId, payload.date, userId);
      break;
    case "setCol":
      await db2.setTaskCol(taskId, payload.col, userId);
      break;
    case "moveToBacklog":
      await db2.moveToBacklog(taskId, userId);
      break;
    case "deleteTask":
      await db2.deleteTask(taskId, userId);
      break;
    default:
      throw error(400, "Unknown action");
  }

  return json({ ok: true });
}
