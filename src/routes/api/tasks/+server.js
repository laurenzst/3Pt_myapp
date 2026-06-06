import { json, error } from "@sveltejs/kit";
import db2 from "$lib/db2.js";

const VALID_OID     = /^[a-f\d]{24}$/i;
const ALLOWED_COLS  = ["todo", "inprogress", "review", "done"];
const ALLOWED_PRIOS = ["critical", "high", "medium", "low"];
const ALLOWED_SPS   = [1, 2, 3, 5, 8, 13];
const ALLOWED_FIELDS = ["col", "prio", "sp"];

function validateField(field, value) {
  if (!ALLOWED_FIELDS.includes(field)) throw error(400, "Invalid field");
  if (field === "col"  && !ALLOWED_COLS.includes(value))  throw error(400, "Invalid col value");
  if (field === "prio" && !ALLOWED_PRIOS.includes(value)) throw error(400, "Invalid prio value");
  if (field === "sp"   && !ALLOWED_SPS.includes(Number(value))) throw error(400, "Invalid sp value");
}

export async function PATCH({ request, locals }) {
  if (!locals.user) throw error(401, "Unauthorized");
  const userId = locals.user.id;

  let body;
  try { body = await request.json(); } catch { throw error(400, "Invalid JSON"); }

  const { taskId, action, payload = {} } = body;

  if (!taskId || !VALID_OID.test(taskId)) throw error(400, "Invalid taskId");
  if (!action || typeof action !== "string")  throw error(400, "Missing action");

  switch (action) {
    case "setDate": {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) throw error(400, "Invalid date format");
      await db2.setTaskDate(taskId, payload.date, userId);
      break;
    }
    case "setCol": {
      if (!ALLOWED_COLS.includes(payload.col)) throw error(400, "Invalid col");
      await db2.setTaskCol(taskId, payload.col, userId);
      break;
    }
    case "moveToBacklog":
      await db2.moveToBacklog(taskId, userId);
      break;
    case "deleteTask":
      await db2.deleteTask(taskId, userId);
      break;
    case "assignToSprint": {
      const { kw, year, field, value } = payload;
      if (typeof kw !== "number" || typeof year !== "number") throw error(400, "Invalid kw/year");
      validateField(field, value);
      await db2.assignToSprint(taskId, kw, year, field, value, userId);
      break;
    }
    case "setField": {
      validateField(payload.field, payload.value);
      await db2.setTaskField(taskId, payload.field, payload.value, userId);
      break;
    }
    case "updateTask": {
      const { title, description, prio, sp } = payload;
      if (!title?.trim())                         throw error(400, "Title required");
      if (title.length > 300)                     throw error(400, "Title too long");
      if (description && description.length > 5000) throw error(400, "Description too long");
      if (!ALLOWED_PRIOS.includes(prio))          throw error(400, "Invalid prio");
      if (!ALLOWED_SPS.includes(Number(sp)))      throw error(400, "Invalid sp");
      await db2.updateTask(taskId, {
        title:       title.trim(),
        description: (description ?? "").trim().slice(0, 5000),
        prio,
        sp: Number(sp),
      }, userId);
      break;
    }
    default:
      throw error(400, "Unknown action");
  }

  return json({ ok: true });
}
