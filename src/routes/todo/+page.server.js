import db2 from "$lib/db2.js";

export async function load() {
  return {};
}

export const actions = {
  add: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const title = data.get("title")?.toString().trim();
    if (!title) return;
    await db2.createBacklogTask({
      title,
      type: data.get("type")?.toString() || "story",
      prio: data.get("prio")?.toString() || "medium",
      sp: parseInt(data.get("sp")?.toString() ?? "5") || 5,
      description: data.get("description")?.toString() || "",
      userId,
    });
  },
};
