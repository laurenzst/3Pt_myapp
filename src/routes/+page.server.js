import db2 from "$lib/db2.js";

function isoWeek(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dow);
  const ys = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp - ys) / 86400000 + 1) / 7);
}

function isoWeekYear(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dow);
  return tmp.getUTCFullYear();
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PRIO_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export async function load({ locals }) {
  const userId = locals.user.id;
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(today);
  const curKw    = isoWeek(today);
  const curYear  = isoWeekYear(today);

  const in7days    = new Date(today);
  in7days.setDate(today.getDate() + 7);
  const in7daysStr = toDateStr(in7days);

  const [backlogTasks, sprintTasks, calendarTasks] = await Promise.all([
    db2.getBacklogTasks(userId),
    db2.getSprintTasks(userId),
    db2.getScheduledTasks(userId),
  ]);

  // Tasks for the current sprint (KW): sprint-board tasks + calendar tasks in same KW
  const calInKw = calendarTasks.filter(t => {
    const [y, m, d] = t.date.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return isoWeek(date) === curKw && isoWeekYear(date) === curYear;
  });
  const currentSprint = [
    ...sprintTasks.filter(t => t.sprintKw === curKw && t.sprintYear === curYear),
    ...calInKw,
  ];

  // Sprint breakdown by status
  const breakdown = {};
  for (const col of ["todo", "inprogress", "review", "done"]) {
    const grp = currentSprint.filter(t => (t.col ?? "todo") === col);
    breakdown[col] = { count: grp.length, sp: grp.reduce((s, t) => s + (t.sp || 0), 0) };
  }

  const sprintTotal   = currentSprint.length;
  const sprintDone    = breakdown.done.count;
  const sprintTotalSP = currentSprint.reduce((s, t) => s + (t.sp || 0), 0);
  const sprintDoneSP  = breakdown.done.sp;

  // Backlog
  const backlogCount    = backlogTasks.length;
  const backlogSP       = backlogTasks.reduce((s, t) => s + (t.sp || 0), 0);
  const criticalCount   = backlogTasks.filter(t => t.prio === "critical").length;

  // Calendar upcoming (today → +7 days)
  const upcoming = calendarTasks
    .filter(t => t.date >= todayStr && t.date <= in7daysStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayCount = upcoming.filter(t => t.date === todayStr).length;

  // Top backlog tasks (by priority)
  const topBacklog = [...backlogTasks]
    .sort((a, b) => (PRIO_ORDER[a.prio] ?? 4) - (PRIO_ORDER[b.prio] ?? 4))
    .slice(0, 7);

  return {
    curKw,
    curYear,
    todayStr,
    stats: { backlogCount, backlogSP, sprintTotal, sprintDone, sprintTotalSP, sprintDoneSP, todayCount, criticalCount },
    breakdown,
    topBacklog,
    upcoming,
  };
}
