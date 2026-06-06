<script>
  import { invalidateAll } from "$app/navigation";
  import { drag } from "$lib/dragState.js";
  import { openDrawer } from "$lib/drawerState.svelte.js";

  let { data } = $props();

  const today = new Date();

  // ── Sprint navigation ────────────────────────────────────────
  let viewKw   = $state(isoWeek(today));
  let viewYear = $state(today.getFullYear());

  // ── View mode ────────────────────────────────────────────────
  let activeView = $state("kanban");

  // ── Tasks ────────────────────────────────────────────────────
  let allTasks = $state([]);
  $effect(() => { allTasks = data.tasks.map(t => ({ ...t })); });

  let sprintTasks = $derived.by(() =>
    allTasks.filter(t => {
      if (t.sprint === "sprint") {
        return t.sprintKw === viewKw && t.sprintYear === viewYear;
      }
      if (t.date) {
        const d = parseDateStr(t.date);
        return isoWeek(d) === viewKw && isoWeekYear(d) === viewYear;
      }
      return false;
    })
  );

  // ── Drag state ───────────────────────────────────────────────
  let draggingId    = $state(null);
  let dropActiveCol = $state(null);
  let trashHover    = $state(false);
  let backlogHover  = $state(false);

  // ── Constants ────────────────────────────────────────────────
  const TYPE_LABELS = { story: "S", task: "T", bug: "B", spike: "R" };
  const PRIO_COLOR  = { critical: "#f85149", high: "#d29922", medium: "#8b949e", low: "#4d9fe0" };
  const PRIO_LABEL  = { critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig" };
  const STATUS_DOT  = { todo: "#6e7681", inprogress: "#378ADD", review: "#d29922", done: "#3fb950" };

  // ── View configuration ──────────────────────────────────────
  const VIEWS = {
    kanban: {
      label: "Kanban",
      field: "col",
      defaultVal: "todo",
      columns: [
        { key: "todo",       label: "Todo",        color: "#8b949e", bg: "#1c2028", border: "#2a2f38" },
        { key: "inprogress", label: "In Progress", color: "#4d9fe0", bg: "#0c1e33", border: "#1a3a5c" },
        { key: "review",     label: "Review",      color: "#c89520", bg: "#261c08", border: "#4a3510" },
        { key: "done",       label: "Done",        color: "#3a9e50", bg: "#0d1e12", border: "#1a3d22" },
      ],
    },
    priority: {
      label: "Priorität",
      field: "prio",
      defaultVal: "medium",
      columns: [
        { key: "critical", label: "Kritisch", color: "#f85149", bg: "#2d1217", border: "#5a1e1e" },
        { key: "high",     label: "Hoch",     color: "#d29922", bg: "#261c08", border: "#4a3510" },
        { key: "medium",   label: "Mittel",   color: "#8b949e", bg: "#1c2028", border: "#2a2f38" },
        { key: "low",      label: "Niedrig",  color: "#4d9fe0", bg: "#0c1e33", border: "#1a3a5c" },
      ],
    },
    sp: {
      label: "Story Points",
      field: "sp",
      defaultVal: 5,
      columns: [
        { key: 1,  label: "1 SP",  color: "#3a9e50", bg: "#0d1e12", border: "#1a3d22" },
        { key: 2,  label: "2 SP",  color: "#4d9fe0", bg: "#0c1e33", border: "#1a3a5c" },
        { key: 3,  label: "3 SP",  color: "#c89520", bg: "#261c08", border: "#4a3510" },
        { key: 5,  label: "5 SP",  color: "#f0883e", bg: "#1e1208", border: "#4a2810" },
        { key: 8,  label: "8 SP",  color: "#f85149", bg: "#2d1217", border: "#5a1e1e" },
        { key: 13, label: "13 SP", color: "#ab57ee", bg: "#1e0d2e", border: "#3d1f5e" },
      ],
    },
  };

  let cols = $derived(VIEWS[activeView].columns);

  function getColTasks(colKey) {
    const view  = VIEWS[activeView];
    const field = view.field;
    return sprintTasks.filter(t => {
      const val = t[field];
      if (val === undefined || val === null) return colKey === view.defaultVal;
      return val === colKey;
    });
  }

  function colSP(tasks) {
    return tasks.reduce((s, t) => s + (t.sp || 0), 0);
  }

  // ── KW helpers ───────────────────────────────────────────────
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

  function parseDateStr(s) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  function kwToMonday(kw, year) {
    const jan4    = new Date(year, 0, 4);
    const dow     = jan4.getDay() || 7;
    const firstMon = new Date(year, 0, 4 - dow + 1);
    return new Date(firstMon.getFullYear(), firstMon.getMonth(), firstMon.getDate() + (kw - 1) * 7);
  }

  function shiftKw(n) {
    const mon  = kwToMonday(viewKw, viewYear);
    const next = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + n * 7);
    viewKw   = isoWeek(next);
    viewYear = isoWeekYear(next);
  }

  function goCurrentKw() {
    viewKw   = isoWeek(today);
    viewYear = isoWeekYear(today);
  }

  let isCurrentKw = $derived(viewKw === isoWeek(today) && viewYear === isoWeekYear(today));

  const MONTHS_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];

  let kwDateRange = $derived.by(() => {
    const mon = kwToMonday(viewKw, viewYear);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    const fd = mon.getDate(), fm = MONTHS_SHORT[mon.getMonth()];
    const ld = sun.getDate(), lm = MONTHS_SHORT[sun.getMonth()];
    if (mon.getMonth() === sun.getMonth()) return `${fd}. – ${ld}. ${lm}`;
    return `${fd}. ${fm} – ${ld}. ${lm}`;
  });

  // ── API ──────────────────────────────────────────────────────
  async function api(action, taskId, payload = {}) {
    await fetch("/api/tasks", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action, taskId, payload }),
    });
    await invalidateAll();
  }

  // ── Drag: sprint card ────────────────────────────────────────
  function onCardDragStart(e, task) {
    // Calendar tasks shown in sprint board use a distinct source so the
    // backlog panel won't accept them (moving to backlog would delete the date).
    drag.source = task.date ? "sprint-calendar" : "sprint";
    drag.taskId = task._id;
    draggingId  = task._id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task._id);
  }

  function onCardDragEnd() {
    drag.source   = null;
    drag.taskId   = null;
    draggingId    = null;
    dropActiveCol = null;
    trashHover    = false;
    backlogHover  = false;
  }

  // ── Drop: backlog zone ───────────────────────────────────────
  function onBacklogZoneDragOver(e) {
    if (drag.source !== "sprint" && drag.source !== "sprint-calendar") return;
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
    drag.source   = null;
    drag.taskId   = null;
    draggingId    = null;
    dropActiveCol = null;
    backlogHover  = false;
    if (!taskId || (source !== "sprint" && source !== "sprint-calendar")) return;
    const idx = allTasks.findIndex(t => t._id === taskId);
    if (idx !== -1) allTasks.splice(idx, 1);
    await api("moveToBacklog", taskId);
  }

  // ── Drop: trash zone ─────────────────────────────────────────
  function onTrashDragOver(e) {
    if (drag.source !== "sprint" && drag.source !== "sprint-calendar") return;
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
    drag.source   = null;
    drag.taskId   = null;
    draggingId    = null;
    dropActiveCol = null;
    trashHover    = false;
    if (!taskId || (source !== "sprint" && source !== "sprint-calendar")) return;
    const idx = allTasks.findIndex(t => t._id === taskId);
    if (idx !== -1) allTasks.splice(idx, 1);
    await api("deleteTask", taskId);
  }

  // ── Drop: column ─────────────────────────────────────────────
  function onColDragOver(e, colKey) {
    if (drag.source !== "backlog" && drag.source !== "sprint" && drag.source !== "sprint-calendar") return;
    e.preventDefault();
    dropActiveCol = colKey;
  }

  function onColDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    dropActiveCol = null;
  }

  async function onColDrop(e, colKey) {
    e.preventDefault();
    const taskId = drag.taskId;
    const source = drag.source;
    draggingId    = null;
    dropActiveCol = null;
    drag.source   = null;
    drag.taskId   = null;
    if (!taskId) return;

    const view  = VIEWS[activeView];
    const field = view.field;

    if (source === "backlog") {
      await api("assignToSprint", taskId, { kw: viewKw, year: viewYear, field, value: colKey });
    } else if (source === "sprint" || source === "sprint-calendar") {
      const t = allTasks.find(x => x._id === taskId);
      if (t) {
        if (t[field] === colKey) return;
        t[field] = colKey;
      }
      await api("setField", taskId, { field, value: colKey });
    }
  }
</script>

<p class="page-breadcrumb">Aufgaben</p>
<h1 class="page-title">Sprint Board</h1>
<p class="page-subtitle">Ziehe Aufgaben aus dem Backlog in eine Spalte. Verschiebe Karten zwischen Spalten um Status, Priorität oder SP zu ändern.</p>

<!-- ── Topbar: KW nav + view switcher ── -->
<div class="topbar-row">
  <div class="kw-nav">
    <button class="nav-btn" aria-label="Vorherige Woche" onclick={() => shiftKw(-1)}>
      <i class="ti ti-chevron-left" aria-hidden="true"></i>
    </button>
    <div class="kw-label-group">
      <span class="kw-badge" class:kw-current={isCurrentKw}>KW {viewKw}</span>
      <span class="kw-year">· {viewYear}</span>
      <span class="kw-range">{kwDateRange}</span>
    </div>
    <button class="nav-btn" onclick={goCurrentKw}>Heute</button>
    <button class="nav-btn" aria-label="Nächste Woche" onclick={() => shiftKw(1)}>
      <i class="ti ti-chevron-right" aria-hidden="true"></i>
    </button>
  </div>

  <!-- View switcher -->
  <div class="view-switcher">
    {#each Object.entries(VIEWS) as [key, view]}
      <button
        class="view-btn"
        class:view-btn-active={activeView === key}
        onclick={() => activeView = key}
      >{view.label}</button>
    {/each}
  </div>
</div>

<!-- ── Sprint summary ── -->
{#if sprintTasks.length > 0}
  {@const totalSP = sprintTasks.reduce((s, t) => s + (t.sp || 0), 0)}
  <div class="sprint-summary">
    <span>{sprintTasks.length} Aufgabe{sprintTasks.length !== 1 ? 'n' : ''}</span>
    <span class="summary-dot">·</span>
    <span>{totalSP} SP total</span>
    <span class="summary-dot">·</span>
    <span>{sprintTasks.filter(t => t.col === 'done').length} erledigt</span>
  </div>
{/if}

<!-- ── Board ── -->
<div class="board" style:--num-cols={cols.length}>
  {#each cols as col}
    {@const colTasks = getColTasks(col.key)}
    {@const totalSP  = colSP(colTasks)}
    <div class="board-col">
      <!-- Column header -->
      <div
        class="col-header"
        style:--col-color={col.color}
        style:--col-bg={col.bg}
        style:--col-border={col.border}
      >
        <span class="col-label">{col.label}</span>
        <div class="col-stats">
          {#if colTasks.length > 0}
            <span class="col-count">{colTasks.length}</span>
          {/if}
          {#if totalSP > 0}
            <span class="col-sp">{totalSP} SP</span>
          {/if}
        </div>
      </div>

      <!-- Column body (drop zone) -->
      <div
        class="col-body"
        class:col-drop-active={dropActiveCol === col.key}
        ondragover={(e) => onColDragOver(e, col.key)}
        ondragleave={onColDragLeave}
        ondrop={(e) => onColDrop(e, col.key)}
        role="list"
        aria-label="Sprint-Spalte {col.label}"
      >
        {#each colTasks as task (task._id)}
          <div
            class="task-card"
            style:--card-color={col.color}
            class:card-dragging={draggingId === task._id}
            draggable="true"
            ondragstart={(e) => onCardDragStart(e, task)}
            ondragend={onCardDragEnd}
            onclick={() => openDrawer(task)}
            role="button"
            tabindex="0"
            onkeydown={(e) => e.key === "Enter" && openDrawer(task)}
            title="{task.title} — klicken zum Bearbeiten, ziehen zum Verschieben"
          >
            <div class="card-top">
              <span class="type-chip type-{task.type ?? 'task'}">{TYPE_LABELS[task.type ?? 'task']}</span>
              <span class="card-title">{task.title}</span>
              {#if task.date}
                <i class="ti ti-calendar card-cal-icon" title="Aus dem Kalender" aria-hidden="true"></i>
              {/if}
            </div>
            <div class="card-meta">
              <span class="meta-dot" style:background={STATUS_DOT[task.col ?? 'todo']}></span>
              <span class="meta-prio" style:color={PRIO_COLOR[task.prio ?? 'medium']}>
                {PRIO_LABEL[task.prio ?? 'medium']}
              </span>
              {#if task.sp}
                <span class="meta-sp">{task.sp} SP</span>
              {/if}
            </div>
          </div>
        {:else}
          <div class="col-empty">Leer</div>
        {/each}
      </div>
    </div>
  {/each}
</div>

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

<!-- ── Trash zone ── -->
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
  /* ── Topbar ─────────────────────────────────── */
  .topbar-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    flex-wrap: wrap;
  }

  .kw-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .kw-label-group {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 215px;
    flex-shrink: 0;
  }

  .kw-badge {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .kw-current { color: var(--accent); }

  .kw-year {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .kw-range {
    font-size: 11px;
    color: var(--text-muted);
  }

  .nav-btn {
    display: inline-flex;
    align-items: center;
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

  .nav-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* ── View switcher ──────────────────────────── */
  .view-switcher {
    display: flex;
    gap: 3px;
    margin-left: auto;
  }

  .view-btn {
    padding: 5px 12px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
  }

  .view-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  .view-btn-active {
    background: var(--bg-hover);
    border-color: var(--text-muted);
    color: var(--text-primary);
    font-weight: 600;
  }

  /* ── Sprint summary ─────────────────────────── */
  .sprint-summary {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 10px;
  }

  .summary-dot { opacity: 0.4; }

  /* ── Board ──────────────────────────────────── */
  .board {
    display: grid;
    grid-template-columns: repeat(var(--num-cols), minmax(185px, 1fr));
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 4px;
    align-items: start;
  }

  /* ── Column ─────────────────────────────────── */
  .board-col {
    border-radius: 8px;
    border: 1px solid var(--border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .col-header {
    padding: 8px 10px;
    background: var(--col-bg);
    border-bottom: 1px solid var(--col-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .col-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--col-color);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .col-stats {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .col-count {
    font-size: 9px;
    background: var(--col-color);
    color: #0d1117;
    border-radius: 4px;
    padding: 1px 5px;
    font-weight: 700;
    line-height: 1.3;
    opacity: 0.85;
  }

  .col-sp {
    font-size: 9px;
    color: var(--col-color);
    opacity: 0.6;
    font-weight: 500;
  }

  .col-body {
    flex: 1;
    min-height: 180px;
    max-height: 540px;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg-main);
    transition: background 0.1s;
  }

  .col-body.col-drop-active {
    background: #0e1f12;
    outline: 1.5px dashed var(--accent);
    outline-offset: -3px;
  }

  .col-empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: var(--text-muted);
    opacity: 0.4;
    min-height: 80px;
  }

  /* ── Task card ──────────────────────────────── */
  .task-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-left: 3px solid var(--card-color);
    border-radius: 6px;
    padding: 7px 9px 6px;
    cursor: grab;
    transition: opacity 0.15s, box-shadow 0.12s;
    user-select: none;
  }

  .task-card:hover:not(.card-dragging) {
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .card-dragging { opacity: 0.25; cursor: grabbing; }

  .card-top {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin-bottom: 5px;
  }

  .card-title {
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
    line-height: 1.4;
    word-break: break-word;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .meta-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .meta-prio {
    font-size: 10px;
    font-weight: 500;
    flex: 1;
  }

  .meta-sp {
    font-size: 10px;
    color: var(--text-muted);
    font-weight: 600;
  }

  .card-cal-icon {
    font-size: 10px;
    color: var(--text-muted);
    opacity: 0.5;
    flex-shrink: 0;
  }

  /* ── Type chips ─────────────────────────────── */
  .type-chip {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
    letter-spacing: 0.04em;
  }

  .type-story { background: #0c1e33; color: #4d9fe0; }
  .type-task  { background: #1c2028; color: #8b949e; }
  .type-bug   { background: #2d1217; color: #f85149; }
  .type-spike { background: #1e0d2e; color: #ab57ee; }

  /* ── Action zones ───────────────────────────── */
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
</style>
