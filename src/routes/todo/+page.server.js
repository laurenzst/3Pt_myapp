import db2 from "$lib/db2.js";

export async function load({ locals }) {
  const userId = locals.user.id;
  const tasks = await db2.getTasks(userId);

  tasks.sort((a, b) => {
    const aPrio = a.priority === null || a.priority === undefined ? -Infinity : a.priority;
    const bPrio = b.priority === null || b.priority === undefined ? -Infinity : b.priority;
    return aPrio - bPrio;
  });

  return { tasks };
}

export const actions = {
  add: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const title = data.get("title");
    if (title) await db2.createTask(title, userId);
  },

  assign: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const taskId = data.get("taskId");
    const priority = parseInt(data.get("priority"));
    if (taskId && priority >= 1) await db2.assignPriority(taskId, priority, userId);
  },

  reorder: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const taskId = data.get("taskId");
    const priority = parseInt(data.get("priority"));
    if (taskId && priority >= 1) await db2.reorderTask(taskId, priority, userId);
  },

  toggleStatus: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const taskId = data.get("taskId");
    if (taskId) await db2.toggleStatus(taskId, userId);
  },

  remove: async ({ request, locals }) => {
    const userId = locals.user.id;
    const data = await request.formData();
    const taskId = data.get("taskId");
    if (taskId) await db2.deleteTask(taskId, userId);
  },
};
