import db2 from "$lib/db2.js";

export async function load({ locals }) {
  const userId = locals.user.id;
  const [sprintTasks, calendarTasks] = await Promise.all([
    db2.getSprintTasks(userId),
    db2.getScheduledTasks(userId),
  ]);
  return { tasks: [...sprintTasks, ...calendarTasks] };
}
