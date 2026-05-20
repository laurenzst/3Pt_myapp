<script>
  let { data } = $props();
  let { stats, topTasks } = $derived(data);

  let completionRate = $derived(
    stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100)
  );
</script>

<p class="page-breadcrumb">Allgemein</p>
<h1 class="page-title">Dashboard</h1>
<p class="page-subtitle">Willkommen zurück. Hier siehst du einen Überblick über deine Aufgaben.</p>

<div class="stat-grid">
  <div class="stat-card">
    <div class="stat-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    </div>
    <div class="stat-value">{stats.total}</div>
    <div class="stat-label">Aufgaben gesamt</div>
  </div>

  <div class="stat-card">
    <div class="stat-icon accent">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    </div>
    <div class="stat-value accent">{stats.prioritized}</div>
    <div class="stat-label">Priorisiert</div>
  </div>

  <div class="stat-card">
    <div class="stat-icon">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    </div>
    <div class="stat-value">{stats.unprioritized}</div>
    <div class="stat-label">Nicht priorisiert</div>
  </div>

  <div class="stat-card">
    <div class="stat-icon muted">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    </div>
    <div class="stat-value">{stats.completed}</div>
    <div class="stat-label">Erledigt</div>
  </div>
</div>

<div class="bottom-grid">
  <div class="panel">
    <div class="panel-header">
      <h2>Top Prioritäten</h2>
      <a href="/todo" class="panel-link">Alle anzeigen →</a>
    </div>
    {#if topTasks.length === 0}
      <p class="empty-hint">Noch keine priorisierten Aufgaben. <a href="/todo">Jetzt hinzufügen →</a></p>
    {:else}
      <div class="top-list">
        {#each topTasks as task, i}
          <div class="top-item">
            <span class="top-rank">{i + 1}</span>
            <span class="top-title">{task.title || task.task}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="panel">
    <div class="panel-header">
      <h2>Fortschritt</h2>
    </div>
    <div class="progress-block">
      <div class="progress-numbers">
        <span class="progress-big">{completionRate}%</span>
        <span class="progress-sub">{stats.completed} von {stats.total} erledigt</span>
      </div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" style="width: {completionRate}%"></div>
      </div>
      <div class="progress-legend">
        <span class="legend-dot active"></span><span>Aktiv ({stats.active})</span>
        <span class="legend-dot done"></span><span>Erledigt ({stats.completed})</span>
      </div>
    </div>
  </div>
</div>

<style>
  /* ── Stat cards ─────────────────────────────── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
    margin-bottom: 1.25rem;
  }

  .stat-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
  }

  .stat-icon {
    color: var(--text-muted);
    margin-bottom: 0.75rem;
    display: flex;
  }

  .stat-icon.accent { color: var(--accent); }
  .stat-icon.muted  { color: var(--text-muted); }

  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 0.3rem;
  }

  .stat-value.accent { color: var(--accent); }

  .stat-label {
    font-size: 12px;
    color: var(--text-muted);
    font-weight: 500;
  }

  /* ── Bottom panels ──────────────────────────── */
  .bottom-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.25rem;
  }

  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .panel-header h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .panel-link {
    font-size: 12px;
    color: var(--accent);
    text-decoration: none;
  }

  .panel-link:hover {
    text-decoration: underline;
  }

  /* ── Top priority list ──────────────────────── */
  .top-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .top-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.75rem;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: var(--radius);
  }

  .top-rank {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent);
    min-width: 1rem;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .top-title {
    font-size: 13.5px;
    color: var(--text-primary);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .empty-hint {
    font-size: 13px;
    color: var(--text-muted);
  }

  .empty-hint a {
    color: var(--accent);
    text-decoration: none;
  }

  .empty-hint a:hover {
    text-decoration: underline;
  }

  /* ── Progress panel ─────────────────────────── */
  .progress-block {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .progress-numbers {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
  }

  .progress-big {
    font-size: 36px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
  }

  .progress-sub {
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .progress-bar-track {
    height: 6px;
    background: var(--bg-hover);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 100%;
    background: var(--accent);
    border-radius: 3px;
    transition: width 0.4s ease;
    min-width: 0;
  }

  .progress-legend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 12px;
    color: var(--text-muted);
  }

  .legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-dot.active { background: var(--text-muted); }
  .legend-dot.done   { background: var(--accent); }
</style>
