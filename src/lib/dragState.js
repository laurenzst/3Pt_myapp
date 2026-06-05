// Shared drag state between layout (backlog chips) and calendar page.
// Plain module-level object — no reactivity needed, just sync read/write.
export const drag = { source: null, taskId: null };
