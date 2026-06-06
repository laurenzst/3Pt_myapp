import { fail } from "@sveltejs/kit";
import db2 from "$lib/db2.js";

const ALLOWED_PRIOS = ["critical", "high", "medium", "low"];
const ALLOWED_SPS   = [1, 2, 3, 5, 8, 13];

export async function load() {
  return {};
}

export const actions = {
  add: async ({ request, locals }) => {
    const userId = locals.user?.id;
    if (!userId) return fail(401, { error: "Unauthorized" });

    const data  = await request.formData();
    const title = data.get("title")?.toString().trim() ?? "";

    if (!title)           return fail(400, { error: "Title required" });
    if (title.length > 300) return fail(400, { error: "Title too long" });

    const prio = data.get("prio")?.toString() ?? "medium";
    const sp   = parseInt(data.get("sp")?.toString() ?? "5");
    const description = (data.get("description")?.toString() ?? "").trim().slice(0, 5000);

    if (!ALLOWED_PRIOS.includes(prio)) return fail(400, { error: "Invalid priority" });
    if (!ALLOWED_SPS.includes(sp))     return fail(400, { error: "Invalid story points" });

    await db2.createBacklogTask({ title, prio, sp, description, userId });
  },
};
