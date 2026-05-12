import db2 from "$lib/db2.js"

export async function load() {
    const tasks = await db2.getTasks();
    // Sort: tasks without priority first, then by priority
    tasks.sort((a, b) => {
      const aPrio = a.priority === null || a.priority === undefined ? -Infinity : a.priority;
      const bPrio = b.priority === null || b.priority === undefined ? -Infinity : b.priority;
      return aPrio - bPrio;
    });
    return { tasks };
}

export const actions = {
  add: async ({ request }) => {
    const data = await request.formData();
    const title = data.get("title");
    if (title) {
      await db2.createTask(title);
    }
  },
  moveUp: async ({ request }) => {
    const data = await request.formData();
    const taskId = data.get("taskId");
    await db2.moveTaskUp(taskId);
  },
  moveDown: async ({ request }) => {
    const data = await request.formData();
    const taskId = data.get("taskId");
    await db2.moveTaskDown(taskId);
  },
  assign: async ({ request }) => {
    const data = await request.formData();
    const taskId = data.get("taskId");
    const priority = parseInt(data.get("priority"));
    if (taskId && priority >= 1) {
      await db2.assignPriority(taskId, priority);
    }
  },
  reorder: async ({ request }) => {
    const data = await request.formData();
    const taskId = data.get("taskId");
    const priority = parseInt(data.get("priority"));
    if (taskId && priority >= 1) {
      await db2.reorderTask(taskId, priority);
    }
  },
  toggleStatus: async ({ request }) => {
    const data = await request.formData();
    const taskId = data.get("taskId");
    if (taskId) await db2.toggleStatus(taskId);
  },
  remove: async ({ request }) => {
    const data = await request.formData();
    const taskId = data.get("taskId");
    if (taskId) await db2.deleteTask(taskId);
  }
}