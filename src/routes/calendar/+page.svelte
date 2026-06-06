<script>
  import { invalidateAll } from "$app/navigation";
  import { drag } from "$lib/dragState.js";
  import { openDrawer } from "$lib/drawerState.svelte.js";

  let { data } = $props();

  // ── Calendar state ──────────────────────────────────────────
  const today    = new Date();
  const todayStr = toDateStr(today);
  let weekOffset   = $state(-1);   // -1 = start 1 week before current week (1 past + N-1 future)
  let visibleWeeks = $state(6);    // how many weeks to display

  // ── Task state (optimistic) ─────────────────────────────────
  let tasks        = $state([]);
  let sprintTasks  = $state([]);
  $effect(() => { tasks       = data.tasks.map(t => ({ ...t })); });
  $effect(() => { sprintTasks = data.sprintTasks.map(t => ({ ...t })); });

  // ── Filter ──────────────────────────────────────────────────
  let activeFilter = $state(null); // null | 'todo' | 'inprogress' | 'review' | 'done'

  // ── Drag state ──────────────────────────────────────────────
  let draggingId    = $state(null);
  let dropActiveDay = $state(null);
  let trashHover    = $state(false);
  let backlogHover  = $state(false);
  let filterDropCol = $state(null);

  // ── Status config ───────────────────────────────────────────
  const COL_CYCLE  = ["todo", "inprogress", "review", "done"];
  const COL_CONFIG  = {
    todo:       { label: "Todo",        dot: "#6e7681", bg: "#1c2028", color: "#8b949e", border: "#2a2f38" },
    inprogress: { label: "In Progress", dot: "#378ADD", bg: "#0c1e33", color: "#4d9fe0", border: "#1a3a5c" },
    review:     { label: "Review",      dot: "#d29922", bg: "#261c08", color: "#c89520", border: "#4a3510" },
    done:       { label: "Done",        dot: "#3fb950", bg: "#0d1e12", color: "#3a9e50", border: "#1a3d22" },
  };

  // ── Calendar helpers ────────────────────────────────────────
  function toDateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

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

  function mondayOf(d) {
    const r   = new Date(d);
    const dow = r.getDay() || 7;
    r.setDate(r.getDate() - dow + 1);
    r.setHours(0, 0, 0, 0);
    return r;
  }

  function addDays(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  // Rolling N-week window: start at (Monday of today) + weekOffset weeks
  let weeks = $derived.by(() => {
    const result = [];
    let cur = addDays(mondayOf(today), weekOffset * 7);
    for (let w = 0; w < visibleWeeks; w++) {
      const days = [];
      for (let i = 0; i < 7; i++) days.push(addDays(cur, i));
      result.push({ kw: isoWeek(cur), year: isoWeekYear(cur), days });
      cur = addDays(cur, 7);
    }
    return result;
  });

  const MONTHS_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const DAY_LABELS   = ["Mo","Di","Mi","Do","Fr","Sa","So"];

  let rangeLabel = $derived.by(() => {
    if (weeks.length === 0) return '';
    const first = weeks[0].days[0];
    const last  = weeks[weeks.length - 1].days[6];
    const fd = first.getDate(), fm = MONTHS_SHORT[first.getMonth()], fy = first.getFullYear();
    const ld = last.getDate(),  lm = MONTHS_SHORT[last.getMonth()],  ly = last.getFullYear();
    if (fy === ly) return `${fd}. ${fm} – ${ld}. ${lm} ${ly}`;
    return `${fd}. ${fm} ${fy} – ${ld}. ${lm} ${ly}`;
  });

  function shiftWeek(n) { weekOffset += n; }
  function goToday()    { weekOffset = -1; }

  function tasksOnDay(dateStr) {
    return tasks.filter(t => t.date === dateStr);
  }

  function sprintTasksForWeek(kw, year) {
    return sprintTasks.filter(t => t.sprintKw === kw && t.sprintYear === year);
  }

  function weekSP(days) {
    return days.reduce((sum, d) =>
      sum + tasksOnDay(toDateStr(d)).reduce((s, t) => s + (t.sp || 0), 0), 0
    );
  }

  // ── API ─────────────────────────────────────────────────────
  const API_OPTS = { method: "PATCH", headers: { "Content-Type": "application/json" } };

  async function api(action, taskId, payload = {}) {
    await fetch("/api/tasks", { ...API_OPTS, body: JSON.stringify({ action, taskId, payload }) });
    invalidateAll(); // intentionally not awaited — local state already updated
  }

  function apiFire(action, taskId, payload = {}) {
    fetch("/api/tasks", { ...API_OPTS, body: JSON.stringify({ action, taskId, payload }) })
      .catch(err => console.error("API error:", err));
  }

  // ── Drag helpers ─────────────────────────────────────────────
  function resetDragState() {
    drag.source   = null;
    drag.taskId   = null;
    draggingId    = null;
    dropActiveDay = null;
    trashHover    = false;
    backlogHover  = false;
    filterDropCol = null;
  }

  // Drop: filter button (status change)
  function onFilterDragOver(e, col) {
    if (drag.source !== "calendar") return;
    e.preventDefault();
    filterDropCol = col;
  }

  function onFilterDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    filterDropCol = null;
  }

  async function onFilterDrop(e, col) {
    e.preventDefault();
    const taskId = drag.taskId;
    const source = drag.source;
    resetDragState();
    if (!taskId || source !== "calendar") return;
    const t = tasks.find(x => x._id === taskId);
    if (t) t.col = col;
    apiFire("setCol", taskId, { col }); // local state already updated
  }

  // Drag: unscheduled sprint chip → start
  function onSprintChipDragStart(e, task) {
    drag.source = "sprint-unscheduled";
    drag.taskId = task._id;
    draggingId  = task._id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task._id);
  }

  function onSprintChipDragEnd() { resetDragState(); }

  // Drag: calendar pill → start
  function onCalendarDragStart(e, task) {
    drag.source = "calendar";
    drag.taskId = task._id;
    draggingId  = task._id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task._id);
  }

  function onCalendarDragEnd() { resetDragState(); }

  // Drop: day cell
  function onDayCellDragOver(e, dateStr) {
    if (drag.source !== "backlog" && drag.source !== "calendar" && drag.source !== "sprint-unscheduled") return;
    e.preventDefault();
    dropActiveDay = dateStr;
  }

  function onDayCellDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    dropActiveDay = null;
  }

  async function onDayCellDrop(e, dateStr) {
    e.preventDefault();
    const taskId = drag.taskId;
    const source = drag.source;
    resetDragState();
    if (!taskId) return;
    if (source === "calendar") {
      const t = tasks.find(x => x._id === taskId);
      if (t) t.date = dateStr;
      apiFire("setDate", taskId, { date: dateStr }); // local state already updated
    } else {
      if (source === "sprint-unscheduled") {
        const idx = sprintTasks.findIndex(t => t._id === taskId);
        if (idx !== -1) sprintTasks.splice(idx, 1);
      }
      await api("setDate", taskId, { date: dateStr }); // cross-boundary: needs refresh
    }
  }

  // Drop: trash zone
  function onTrashDragOver(e) {
    if (drag.source !== "calendar" && drag.source !== "sprint-unscheduled") return;
    e.preventDefault();
    trashHover = true;
  }

  function onTrashDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    trashHover = false;
  }

  async function onTrashDrop(e) {
    e.preventDefault();
    const taskId = drag.taskId;
    const source = drag.source;
    resetDragState();
    if (!taskId || (source !== "calendar" && source !== "sprint-unscheduled")) return;
    if (source === "calendar") {
      const idx = tasks.findIndex(t => t._id === taskId);
      if (idx !== -1) tasks.splice(idx, 1);
    } else {
      const idx = sprintTasks.findIndex(t => t._id === taskId);
      if (idx !== -1) sprintTasks.splice(idx, 1);
    }
    await api("deleteTask", taskId);
  }

  // Drop: back-to-backlog zone
  function onBacklogZoneDragOver(e) {
    if (drag.source !== "calendar" && drag.source !== "sprint-unscheduled") return;
    e.preventDefault();
    backlogHover = true;
  }

  function onBacklogZoneDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    backlogHover = false;
  }

  async function onBacklogZoneDrop(e) {
    e.preventDefault();
    const taskId = drag.taskId;
    const source = drag.source;
    resetDragState();
    if (!taskId || (source !== "calendar" && source !== "sprint-unscheduled")) return;
    if (source === "calendar") {
      const idx = tasks.findIndex(t => t._id === taskId);
      if (idx !== -1) tasks.splice(idx, 1);
    } else {
      const idx = sprintTasks.findIndex(t => t._id === taskId);
      if (idx !== -1) sprintTasks.splice(idx, 1);
    }
    await api("moveToBacklog", taskId);
  }
</script>

<p class="page-breadcrumb">Aufgaben</p>
<h1 class="page-title">Kalender</h1>
<p class="page-subtitle">Plane Aufgaben auf bestimmte Tage. Ziehe Aufgaben aus dem Backlog-Panel auf einen Tag.</p>

<!-- ── Topbar: nav + week picker + filter ── -->
<div class="topbar-row">
  <div class="cal-nav">
    <button class="nav-btn" aria-label="Vorherige Woche" onclick={() => shiftWeek(-1)}>
      <i class="ti ti-chevron-left" aria-hidden="true"></i>
    </button>
    <span class="cal-range-label">{rangeLabel}</span>
    <button class="nav-btn" onclick={goToday}>Heute</button>
    <button class="nav-btn" aria-label="Nächste Woche" onclick={() => shiftWeek(1)}>
      <i class="ti ti-chevron-right" aria-hidden="true"></i>
    </button>
  </div>

  <!-- Week count picker -->
  <div class="week-picker">
    {#each [4, 6, 8, 10] as w}
      <button
        class="week-opt"
        class:week-opt-active={visibleWeeks === w}
        onclick={() => visibleWeeks = w}
      >{w}W</button>
    {/each}
  </div>

  <!-- Status filters (also drop targets for status change) -->
  <div class="status-filters">
    <button
      class="filter-btn"
      class:filter-all-active={activeFilter === null}
      onclick={() => activeFilter = null}
    >Alle</button>
    {#each COL_CYCLE as col}
      {@const cfg = COL_CONFIG[col]}
      <button
        class="filter-btn"
        class:filter-btn-active={activeFilter === col}
        class:filter-is-target={drag.source === "calendar" && filterDropCol !== col}
        class:filter-drop-active={filterDropCol === col}
        style:--fcol={cfg.color}
        style:--fbg={cfg.bg}
        style:--fborder={cfg.border}
        onclick={() => activeFilter = activeFilter === col ? null : col}
        ondragover={(e) => onFilterDragOver(e, col)}
        ondragleave={onFilterDragLeave}
        ondrop={(e) => onFilterDrop(e, col)}
      >
        <span class="filter-dot" style:background={cfg.dot}></span>
        {cfg.label}
      </button>
    {/each}
  </div>
</div>

<!-- ── Calendar grid ── -->
<div class="cal-grid">
  <!-- Header -->
  <div class="cal-head-row">
    <div class="kw-cell kw-head">KW</div>
    {#each DAY_LABELS as d}
      <div class="day-head">{d}</div>
    {/each}
  </div>

  <!-- Weeks -->
  {#each weeks as { kw, year, days }}
    {@const sp  = weekSP(days)}
    {@const cnt = days.reduce((n, d) => n + tasksOnDay(toDateStr(d)).length, 0)}
    {@const unscheduled = sprintTasksForWeek(kw, year)}
    <div class="week-row">
      <!-- Sprint strip: unscheduled sprint tasks for this KW -->
      {#if unscheduled.length > 0}
        <div class="sprint-strip">
          <span class="sprint-strip-label">Sprint</span>
          {#each unscheduled as task (task._id)}
            <div
              class="sprint-chip"
              draggable="true"
              ondragstart={(e) => onSprintChipDragStart(e, task)}
              ondragend={onSprintChipDragEnd}
              role="button"
              tabindex="0"
              title="{task.title} — auf einen Tag ziehen zum Einplanen"
            >
              <i class="ti ti-layout-kanban" aria-hidden="true"></i>
              <span class="sprint-chip-title">{task.title}</span>
              {#if task.sp}
                <span class="sprint-chip-sp">{task.sp}</span>
              {/if}
            </div>
          {/each}
        </div>
      {/if}

      <div class="kw-cell">
        <span class="kw-num">{kw}</span>
        {#if cnt > 0}
          <span class="kw-task-cnt">{cnt}</span>
        {/if}
        {#if sp > 0}
          <span class="kw-sp">{sp} SP</span>
        {/if}
      </div>

      {#each days as day, i}
        {@const ds       = toDateStr(day)}
        {@const dayTasks = tasksOnDay(ds)}
        {@const isToday  = ds === todayStr}
        {@const isPast   = day < today && !isToday}
        {@const isWE     = i >= 5}
        <div
          class="day-cell"
          class:past={isPast}
          class:is-today={isToday}
          class:weekend={isWE}
          class:drop-active={dropActiveDay === ds}
          ondragover={(e) => onDayCellDragOver(e, ds)}
          ondragleave={onDayCellDragLeave}
          ondrop={(e) => onDayCellDrop(e, ds)}
          role="gridcell"
          tabindex="0"
          aria-label={ds}
        >
          <div class="day-num-row">
            <span class="day-num" class:today-badge={isToday}>{day.getDate()}</span>
          </div>

          <div class="day-tasks">
            {#each dayTasks.slice(0, 3) as task (task._id)}
              {@const col = task.col ?? "todo"}
              {@const cfg = COL_CONFIG[col]}
              <div
                class="task-pill"
                class:pill-done={col === 'done'}
                class:pill-dragging={draggingId === task._id}
                class:pill-dimmed={activeFilter !== null && col !== activeFilter}
                class:pill-highlighted={activeFilter === col}
                style:--pill-bg={cfg.bg}
                style:--pill-color={cfg.color}
                style:--pill-border={cfg.border}
                draggable="true"
                title="{task.title} — Klick: bearbeiten · auf Status-Button ziehen: Status ändern"
                ondragstart={(e) => onCalendarDragStart(e, task)}
                ondragend={onCalendarDragEnd}
                onclick={() => openDrawer(task)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && openDrawer(task)}
              >
                <span class="status-dot" style:background={cfg.dot}></span>
                <span class="pill-title">{task.title}</span>
                {#if task.sp}
                  <span class="pill-sp">{task.sp}</span>
                {/if}
              </div>
            {/each}
            {#if dayTasks.length > 3}
              <span class="more-label">+{dayTasks.length - 3}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/each}
</div>

{#if tasks.length === 0}
  <p class="cal-empty">Noch keine Aufgaben geplant. Ziehe Aufgaben aus dem Backlog-Panel auf einen Tag.</p>
{/if}

<!-- ── Backlog zone ── -->
<div
  class="action-zone backlog-zone"
  class:zone-active={draggingId !== null}
  class:zone-hover={backlogHover}
  ondragover={onBacklogZoneDragOver}
  ondragleave={onBacklogZoneDragLeave}
  ondrop={onBacklogZoneDrop}
  role="region"
  aria-label="In Backlog verschieben"
>
  <i class="ti ti-arrow-back-up" aria-hidden="true"></i>
  In Backlog verschieben
</div>

<!-- ── Trash zone (below backlog zone) ── -->
<div
  class="action-zone trash-zone"
  class:zone-active={draggingId !== null}
  class:zone-hover={trashHover}
  ondragover={onTrashDragOver}
  ondragleave={onTrashDragLeave}
  ondrop={onTrashDrop}
  role="region"
  aria-label="Aufgabe löschen"
>
  <i class="ti ti-trash" aria-hidden="true"></i>
  Aufgabe löschen
</div>

<style>
  /* ── Page ───────────────────────────────────── */
  .cal-empty {
    font-size: 13px;
    color: var(--text-muted);
    text-align: center;
    padding: 2rem;
  }

  /* ── Action zones (trash + backlog) ─────────── */
  .action-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 0;
    overflow: hidden;
    padding: 0;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    border: 1.5px dashed transparent;
    transition: height 0.15s, padding 0.15s, margin 0.15s, border-color 0.15s, background 0.15s, color 0.15s;
    color: var(--text-muted);
  }

  .action-zone.zone-active {
    height: 38px;
    border-color: var(--border);
  }

  .backlog-zone.zone-active { margin-top: 10px; }
  .trash-zone.zone-active   { margin-top: 6px; }

  /* Trash: leicht rot im Ruhezustand, intensiver beim Hover */
  .trash-zone.zone-active {
    border-color: rgba(218, 54, 51, 0.4);
    color: rgba(218, 54, 51, 0.55);
    background: rgba(218, 54, 51, 0.04);
  }

  .trash-zone.zone-hover {
    border-color: var(--danger);
    color: var(--danger);
    background: rgba(218, 54, 51, 0.12);
  }

  .backlog-zone.zone-hover {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(63, 185, 80, 0.07);
  }

  /* ── Topbar row ─────────────────────────────── */
  .topbar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  /* ── Navigation ─────────────────────────────── */
  .cal-nav {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .cal-range-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    min-width: 178px;
    white-space: nowrap;
  }

  .nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 9px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .nav-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* ── Week count picker ──────────────────────── */
  .week-picker {
    display: flex;
    gap: 2px;
  }

  .week-opt {
    padding: 5px 8px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text-muted);
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .week-opt:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .week-opt-active {
    background: var(--bg-hover);
    border-color: var(--text-muted);
    color: var(--text-primary);
    font-weight: 600;
  }

  /* ── Status filter buttons ──────────────────── */
  .status-filters {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .filter-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
  }

  .filter-btn:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .filter-all-active {
    background: var(--bg-hover);
    border-color: var(--text-muted);
    color: var(--text-primary);
    font-weight: 500;
  }

  .filter-btn-active {
    background: var(--fbg);
    border-color: var(--fborder);
    color: var(--fcol);
    font-weight: 600;
  }

  /* Drop-target states */
  .filter-btn.filter-is-target {
    border-style: dashed;
    border-color: var(--fborder);
    opacity: 0.75;
  }

  .filter-btn.filter-drop-active {
    background: var(--fbg);
    border-color: var(--fcol);
    border-style: dashed;
    color: var(--fcol);
    font-weight: 600;
    opacity: 1;
    transform: scale(1.05);
  }

  .filter-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ── Grid ───────────────────────────────────── */
  .cal-grid {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .cal-head-row {
    display: grid;
    grid-template-columns: 52px repeat(7, minmax(0, 1fr));
    background: var(--bg-card);
    border-bottom: 1px solid var(--border);
  }

  .day-head {
    padding: 6px 4px;
    text-align: center;
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-left: 1px solid var(--border);
  }

  .week-row {
    display: grid;
    grid-template-columns: 52px repeat(7, minmax(0, 1fr));
    border-bottom: 1px solid var(--border);
  }

  .week-row:last-child { border-bottom: none; }

  /* ── KW cell ────────────────────────────────── */
  .kw-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    padding: 6px 3px;
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    min-height: 84px;
  }

  .kw-head { min-height: unset; }

  .kw-num {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
  }

  .kw-task-cnt {
    font-size: 9px;
    background: var(--accent);
    color: #0d1117;
    border-radius: 5px;
    padding: 1px 4px;
    font-weight: 700;
    line-height: 1.3;
  }

  .kw-sp {
    font-size: 9px;
    color: var(--text-muted);
    font-weight: 500;
    white-space: nowrap;
  }

  /* ── Day cell ───────────────────────────────── */
  .day-cell {
    padding: 5px 5px 6px;
    min-height: 84px;
    min-width: 0;
    border-left: 1px solid var(--border);
    background: var(--bg-main);
    transition: background 0.1s;
  }

  .day-cell.weekend { background: var(--bg-sidebar); }
  .day-cell.past    { opacity: 0.55; }
  .day-cell.is-today { background: #0b1c10; }

  .day-cell.drop-active {
    background: #142012;
    outline: 1.5px dashed var(--accent);
    outline-offset: -2px;
  }

  .day-num-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 4px;
  }

  .day-num {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1;
  }

  .today-badge {
    background: var(--accent);
    color: #0d1117;
    border-radius: 50%;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
  }

  /* ── Task pills ─────────────────────────────── */
  .day-tasks {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .task-pill {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 5px 2px 4px;
    border-radius: 4px;
    font-size: 10px;
    cursor: grab;
    transition: opacity 0.15s;
    user-select: none;
    overflow: hidden;
    border: 1px solid var(--pill-border);
    background: var(--pill-bg);
    color: var(--pill-color);
    width: 100%;
    text-align: left;
  }

  .task-pill:hover:not(.pill-dragging) { opacity: 0.82; }

  .pill-dragging { opacity: 0.25; cursor: grabbing; }

  /* Filter dimming/highlighting */
  .pill-dimmed      { opacity: 0.2; }
  .pill-highlighted { opacity: 1; box-shadow: 0 0 0 1px var(--pill-border); }

  /* Done: strikethrough, lower opacity */
  .pill-done { opacity: 0.45; text-decoration: line-through; text-decoration-color: var(--pill-color); }

  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
    pointer-events: none;
  }

  .pill-title {
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1.35;
    pointer-events: none;
    font-size: 10px;
  }

  .pill-sp {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 700;
    opacity: 0.65;
    pointer-events: none;
    padding-left: 2px;
  }

  .more-label {
    font-size: 9px;
    color: var(--text-muted);
    padding: 1px 3px;
  }

  /* ── Sprint strip ───────────────────────────── */
  .sprint-strip {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    padding: 4px 8px;
    background: rgba(63, 185, 80, 0.04);
    border-bottom: 1px solid rgba(63, 185, 80, 0.18);
  }

  .sprint-strip-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    flex-shrink: 0;
    margin-right: 2px;
    opacity: 0.7;
  }

  .sprint-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 7px 2px 5px;
    background: rgba(63, 185, 80, 0.08);
    border: 1px solid rgba(63, 185, 80, 0.22);
    border-radius: 4px;
    font-size: 10px;
    color: var(--text-secondary);
    cursor: grab;
    user-select: none;
    transition: background 0.1s, color 0.1s;
    max-width: 180px;
  }

  .sprint-chip:hover {
    background: rgba(63, 185, 80, 0.15);
    color: var(--text-primary);
    border-color: rgba(63, 185, 80, 0.4);
  }

  .sprint-chip:active { cursor: grabbing; }

  .sprint-chip i {
    font-size: 9px;
    color: var(--accent);
    opacity: 0.7;
    flex-shrink: 0;
  }

  .sprint-chip-title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1.35;
  }

  .sprint-chip-sp {
    font-size: 9px;
    font-weight: 600;
    color: var(--text-muted);
    flex-shrink: 0;
    padding-left: 2px;
  }
</style>
