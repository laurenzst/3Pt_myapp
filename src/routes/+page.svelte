<script>
  let { data } = $props();

  const TYPE_LABELS  = { story: "S", task: "T", bug: "B", spike: "R" };
  const DAY_SHORT    = ["So","Mo","Di","Mi","Do","Fr","Sa"];
  const MONTHS_SHORT = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  const PRIO_COLOR   = { critical: "#f85149", high: "#d29922", medium: "#8b949e", low: "#4d9fe0" };
  const STATUS_DOT   = { todo: "#6e7681", inprogress: "#378ADD", review: "#d29922", done: "#3fb950" };
  const COL_ROWS = [
    { col: "todo",       label: "Todo",        dot: "#6e7681" },
    { col: "inprogress", label: "In Progress", dot: "#378ADD" },
    { col: "review",     label: "Review",      dot: "#d29922" },
    { col: "done",       label: "Done",        dot: "#3fb950" },
  ];

  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const r = new Date(y, m - 1, d + n);
    return `${r.getFullYear()}-${String(r.getMonth() + 1).padStart(2, "0")}-${String(r.getDate()).padStart(2, "0")}`;
  }

  let tomorrowStr = $derived(addDays(data.todayStr, 1));

  function formatDay(dateStr) {
    if (dateStr === data.todayStr) return "Heute";
    if (dateStr === tomorrowStr)   return "Morgen";
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return `${DAY_SHORT[date.getDay()]} ${d}. ${MONTHS_SHORT[m - 1]}`;
  }

  // Group upcoming tasks by date
  let groupedUpcoming = $derived.by(() => {
    const map = /** @type {Record<string, any[]>} */ ({});
    for (const t of data.upcoming) {
      (map[t.date] ??= []).push(t);
    }
    return Object.entries(map);
  });

  let sprintPct = $derived(
    data.stats.sprintTotal === 0
      ? 0
      : Math.round((data.stats.sprintDone / data.stats.sprintTotal) * 100)
  );
</script>

<p class="page-breadcrumb">Allgemein</p>
<h1 class="page-title">Dashboard</h1>
<p class="page-subtitle">Überblick über Backlog, aktuellen Sprint und anstehende Kalenderaufgaben.</p>

<!-- ── Stat cards ── -->
<div class="stat-grid">
  <!-- Backlog -->
  <div class="stat-card">
    <div class="stat-top">
      <span class="stat-label">Backlog</span>
      <i class="ti ti-stack-2 stat-icon" aria-hidden="true"></i>
    </div>
    <div class="stat-value">{data.stats.backlogCount}</div>
    <div class="stat-sub">
      {data.stats.backlogSP} SP · {data.stats.backlogCount === 0 ? "alles eingeplant" : "nicht eingeplant"}
    </div>
  </div>

  <!-- Sprint -->
  <div class="stat-card">
    <div class="stat-top">
      <span class="stat-label">Sprint KW {data.curKw}</span>
      <i class="ti ti-layout-kanban stat-icon" aria-hidden="true"></i>
    </div>
    <div class="stat-value">
      {data.stats.sprintDone}<span class="stat-of"> / {data.stats.sprintTotal}</span>
    </div>
    <div class="stat-sub">
      {data.stats.sprintTotalSP} SP total · {data.stats.sprintDoneSP} SP erledigt
    </div>
  </div>

  <!-- Heute -->
  <div class="stat-card" class:stat-highlight={data.stats.todayCount > 0}>
    <div class="stat-top">
      <span class="stat-label">Heute</span>
      <i class="ti ti-calendar-event stat-icon" aria-hidden="true"></i>
    </div>
    <div class="stat-value" class:value-accent={data.stats.todayCount > 0} class:value-muted={data.stats.todayCount === 0}>
      {data.stats.todayCount > 0 ? data.stats.todayCount : "—"}
    </div>
    <div class="stat-sub">
      {data.stats.todayCount > 0 ? "Aufgaben im Kalender" : "Nichts geplant"}
    </div>
  </div>

  <!-- Kritisch -->
  <div class="stat-card" class:stat-danger={data.stats.criticalCount > 0}>
    <div class="stat-top">
      <span class="stat-label">Kritisch im Backlog</span>
      <i class="ti ti-alert-triangle stat-icon" aria-hidden="true"></i>
    </div>
    <div class="stat-value" class:value-danger={data.stats.criticalCount > 0} class:value-ok={data.stats.criticalCount === 0}>
      {data.stats.criticalCount > 0 ? data.stats.criticalCount : "✓"}
    </div>
    <div class="stat-sub">
      {data.stats.criticalCount > 0 ? "Aufgaben mit kritischer Priorität" : "Keine kritischen Tasks"}
    </div>
  </div>
</div>

<!-- ── Main panels ── -->
<div class="main-grid">

  <!-- Sprint status -->
  <div class="panel">
    <div class="panel-header">
      <div class="panel-title-row">
        <h2>Aktueller Sprint</h2>
        <span class="kw-badge">KW {data.curKw} · {data.curYear}</span>
      </div>
      <a href="/sprint" class="panel-link">Zum Board →</a>
    </div>

    {#if data.stats.sprintTotal === 0}
      <p class="empty-hint">
        Kein Sprint für KW {data.curKw} geplant.
        <a href="/sprint">Jetzt im Board planen →</a>
      </p>
    {:else}
      <div class="col-rows">
        {#each COL_ROWS as { col, label, dot }}
          {@const s   = data.breakdown[col]}
          {@const pct = data.stats.sprintTotal > 0 ? (s.count / data.stats.sprintTotal) * 100 : 0}
          <div class="col-row">
            <span class="col-dot" style:background={dot}></span>
            <span class="col-name">{label}</span>
            <span class="col-count">{s.count}</span>
            <span class="col-sp">{s.sp} SP</span>
            <div class="col-bar-track">
              <div class="col-bar-fill" style:width="{pct}%" style:background={dot + "99"}></div>
            </div>
          </div>
        {/each}
      </div>

      <div class="sprint-footer">
        <div class="sprint-footer-text">
          <span class="sprint-pct">{sprintPct}%</span>
          <span class="sprint-footer-sub">
            {data.stats.sprintDone} / {data.stats.sprintTotal} Aufgaben ·
            {data.stats.sprintDoneSP} / {data.stats.sprintTotalSP} SP
          </span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style:width="{sprintPct}%"></div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Backlog top priority -->
  <div class="panel">
    <div class="panel-header">
      <h2>Backlog Prioritäten</h2>
      <a href="/todo" class="panel-link">Erfassen →</a>
    </div>

    {#if data.topBacklog.length === 0}
      <p class="empty-hint">Backlog ist leer. <a href="/todo">Aufgabe erfassen →</a></p>
    {:else}
      <div class="bl-list">
        {#each data.topBacklog as task}
          {@const prio = task.prio ?? "medium"}
          <div class="bl-row">
            <span class="bl-prio-dot" style:background={PRIO_COLOR[prio]}></span>
            <span class="bl-type type-{task.type ?? 'task'}">{TYPE_LABELS[task.type ?? "task"]}</span>
            <span class="bl-title">{task.title}</span>
            {#if task.sp}
              <span class="bl-sp">{task.sp}</span>
            {/if}
          </div>
        {/each}
      </div>
      {#if data.stats.backlogCount > data.topBacklog.length}
        <p class="bl-more">+{data.stats.backlogCount - data.topBacklog.length} weitere im Backlog</p>
      {/if}
      <a href="/sprint" class="plan-link">Im Sprint einplanen →</a>
    {/if}
  </div>
</div>

<!-- ── Upcoming calendar ── -->
<div class="panel upcoming-panel">
  <div class="panel-header">
    <h2>Kalender – Demnächst</h2>
    <a href="/calendar" class="panel-link">Zum Kalender →</a>
  </div>

  {#if groupedUpcoming.length === 0}
    <p class="empty-hint">
      Keine Aufgaben in den nächsten 7 Tagen.
      <a href="/calendar">Jetzt planen →</a>
    </p>
  {:else}
    <div class="upcoming-grid">
      {#each groupedUpcoming as [dateStr, tasks]}
        <div class="upcoming-col">
          <div class="upcoming-day-label" class:label-today={dateStr === data.todayStr}>
            {formatDay(dateStr)}
          </div>
          <div class="upcoming-tasks">
            {#each tasks.slice(0, 4) as task}
              {@const col = task.col ?? "todo"}
              <div class="upcoming-task">
                <span class="upcoming-dot" style:background={STATUS_DOT[col]}></span>
                <span class="upcoming-title">{task.title}</span>
              </div>
            {/each}
            {#if tasks.length > 4}
              <span class="upcoming-more">+{tasks.length - 4} weitere</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* ── Stat cards ─────────────────────────────── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin-bottom: 10px;
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    transition: border-color 0.15s;
  }

  .stat-card.stat-highlight { border-color: rgba(63, 185, 80, 0.35); }
  .stat-card.stat-danger    { border-color: rgba(248, 81, 73, 0.35); }

  .stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .stat-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stat-icon {
    font-size: 14px;
    color: var(--text-muted);
    opacity: 0.5;
  }

  .stat-value {
    font-size: 30px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 5px;
    font-variant-numeric: tabular-nums;
  }

  .stat-of {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-muted);
  }

  .value-accent { color: var(--accent); }
  .value-muted  { color: var(--text-muted); }
  .value-danger { color: #f85149; }
  .value-ok     { color: var(--accent); font-size: 24px; }

  .stat-sub {
    font-size: 11px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  /* ── Main 2-panel grid ──────────────────────── */
  .main-grid {
    display: grid;
    grid-template-columns: 3fr 2fr;
    gap: 10px;
    margin-bottom: 10px;
  }

  /* ── Panel base ─────────────────────────────── */
  .panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .panel-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .panel-header h2 {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .kw-badge {
    font-size: 10px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(63, 185, 80, 0.1);
    border: 1px solid rgba(63, 185, 80, 0.25);
    border-radius: 4px;
    padding: 2px 6px;
  }

  .panel-link {
    font-size: 11px;
    color: var(--accent);
    text-decoration: none;
    white-space: nowrap;
  }

  .panel-link:hover { text-decoration: underline; }

  .empty-hint {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.5;
  }

  .empty-hint a { color: var(--accent); text-decoration: none; }
  .empty-hint a:hover { text-decoration: underline; }

  /* ── Sprint status rows ─────────────────────── */
  .col-rows {
    display: flex;
    flex-direction: column;
    gap: 7px;
    margin-bottom: 14px;
  }

  .col-row {
    display: grid;
    grid-template-columns: 8px 90px 28px 52px 1fr;
    align-items: center;
    gap: 8px;
  }

  .col-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .col-name {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .col-count {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-primary);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .col-sp {
    font-size: 10px;
    color: var(--text-muted);
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .col-bar-track {
    height: 4px;
    background: var(--bg-hover);
    border-radius: 2px;
    overflow: hidden;
  }

  .col-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s ease;
    min-width: 0;
  }

  /* ── Sprint footer progress ─────────────────── */
  .sprint-footer {
    border-top: 1px solid var(--border);
    padding-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .sprint-footer-text {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }

  .sprint-pct {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
  }

  .sprint-footer-sub {
    font-size: 11px;
    color: var(--text-muted);
  }

  .progress-track {
    height: 5px;
    background: var(--bg-hover);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.5s ease;
  }

  /* ── Backlog priority list ───────────────────── */
  .bl-list {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 10px;
  }

  .bl-row {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 5px 8px;
    border-radius: 5px;
    background: var(--bg-main);
    border: 1px solid var(--border);
  }

  .bl-prio-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .bl-type {
    flex-shrink: 0;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 4px;
    border-radius: 3px;
    letter-spacing: 0.04em;
  }

  .type-story { background: #0c1e33; color: #4d9fe0; }
  .type-task  { background: #1c2028; color: #8b949e; }
  .type-bug   { background: #2d1217; color: #f85149; }
  .type-spike { background: #1e0d2e; color: #ab57ee; }

  .bl-title {
    flex: 1;
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .bl-sp {
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 700;
    color: var(--text-muted);
  }

  .bl-more {
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 8px;
    padding-left: 2px;
  }

  .plan-link {
    display: inline-block;
    font-size: 11px;
    color: var(--accent);
    text-decoration: none;
    margin-top: 2px;
  }

  .plan-link:hover { text-decoration: underline; }

  /* ── Upcoming calendar ──────────────────────── */
  .upcoming-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
    gap: 10px;
  }

  .upcoming-day-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
    padding-bottom: 4px;
    border-bottom: 1px solid var(--border);
  }

  .upcoming-day-label.label-today {
    color: var(--accent);
    border-bottom-color: rgba(63, 185, 80, 0.3);
  }

  .upcoming-tasks {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .upcoming-task {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 0;
  }

  .upcoming-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .upcoming-title {
    font-size: 11px;
    color: var(--text-secondary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1.4;
  }

  .upcoming-more {
    font-size: 10px;
    color: var(--text-muted);
    padding-left: 11px;
  }
</style>
