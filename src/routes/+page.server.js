import db2 from "$lib/db2.js";

export async function load() {
  const tasks = await db2.getTasks();

  const total = tasks.length;
  const prioritized = tasks.filter(t => t.priority != null && t.status !== "done").length;
  const unprioritized = tasks.filter(t => t.priority == null && t.status !== "done").length;
  const completed = tasks.filter(t => t.status === "done").length;
  const active = prioritized + unprioritized;

  const topTasks = tasks
    .filter(t => t.priority != null && t.status !== "done")
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  return { stats: { total, prioritized, unprioritized, completed, active }, topTasks };
}
