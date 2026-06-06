<script>
  import { invalidateAll } from "$app/navigation";
  import { flip } from "svelte/animate";

  const PRIOS = [
    { value: "critical", label: "Kritisch", color: "#f85149", bg: "rgba(248,81,73,0.12)"   },
    { value: "high",     label: "Hoch",     color: "#f0883e", bg: "rgba(240,136,62,0.12)"  },
    { value: "medium",   label: "Mittel",   color: "#d29922", bg: "rgba(210,153,34,0.12)"  },
    { value: "low",      label: "Niedrig",  color: "#8b949e", bg: "rgba(139,148,158,0.12)" },
  ];

  const SP_VALUES = [1, 2, 3, 5, 8, 13];

  const PRIO_LABELS = { critical: "Kritisch", high: "Hoch", medium: "Mittel", low: "Niedrig" };

  let title       = $state("");
  let description = $state("");
  let selPrio     = $state("medium");
  let selSp       = $state(5);
  let submitting  = $state(false);
  let recentItems = $state([]);

  let preview = $derived(
    title.trim()
      ? `${PRIO_LABELS[selPrio]} · ${selSp} SP`
      : null
  );

  async function submit() {
    if (!title.trim() || submitting) return;
    submitting = true;

    const item = {
      tempId: Date.now(),
      title:  title.trim(),
      prio:   selPrio,
      sp:     selSp,
    };
    recentItems = [item, ...recentItems].slice(0, 5);

    const form = new FormData();
    form.append("title",       item.title);
    form.append("prio",        selPrio);
    form.append("sp",          String(selSp));
    form.append("description", description);

    title       = "";
    description = "";

    try {
      await fetch("?/add", { method: "POST", body: form });
      await invalidateAll();
    } finally {
      submitting = false;
    }
  }

  function reset() {
    title       = "";
    description = "";
    selPrio     = "medium";
    selSp       = 5;
  }
</script>

<div class="capture-page">

  <!-- ── Capture form card ── -->
  <div class="capture-hero">
    <h2 class="capture-title">Neue Aufgabe erfassen</h2>
    <p class="capture-sub">Direkt in den Backlog – von dort in den Sprint einplanen.</p>

    <div class="title-row">
      <input
        class="title-input"
        type="text"
        placeholder="Was soll gemacht werden?"
        bind:value={title}
        onkeydown={(e) => e.key === "Enter" && submit()}
      />
      <button class="btn-green" onclick={submit} disabled={!title.trim() || submitting}>
        <i class="ti ti-plus" aria-hidden="true"></i>Hinzufügen
      </button>
    </div>

    <div class="options-grid">
      <!-- Priority -->
      <div class="opt-group">
        <div class="opt-label">Priorität</div>
        <div class="opt-chips">
          {#each PRIOS as p}
            <button
              class="opt-chip prio-chip"
              class:chip-sel={selPrio === p.value}
              style:--pc={p.color}
              style:--pb={p.bg}
              onclick={() => selPrio = p.value}
            >{p.label}</button>
          {/each}
        </div>
      </div>

      <!-- Story Points -->
      <div class="opt-group">
        <div class="opt-label">Story Points</div>
        <div class="opt-chips">
          {#each SP_VALUES as sp}
            <button
              class="opt-chip sp-chip"
              class:chip-sel={selSp === sp}
              onclick={() => selSp = sp}
            >{sp}</button>
          {/each}
        </div>
      </div>
    </div>

    <div class="desc-group">
      <div class="opt-label" style="margin-bottom: 5px">Beschreibung (optional)</div>
      <textarea
        class="desc-textarea"
        placeholder="Kurze Beschreibung oder Akzeptanzkriterien..."
        bind:value={description}
      ></textarea>
    </div>

    <div class="capture-actions">
      <div class="preview-chip" style:opacity={preview ? "1" : "0.4"}>
        <i class="ti ti-tag" aria-hidden="true"></i>
        <span>{preview ?? "Vorschau erscheint beim Tippen"}</span>
      </div>
      <button class="btn-secondary" onclick={reset}>
        <i class="ti ti-refresh" aria-hidden="true"></i>Zurücksetzen
      </button>
      <button class="btn-green" onclick={submit} disabled={!title.trim() || submitting}>
        <i class="ti ti-arrow-down" aria-hidden="true"></i>In Backlog
      </button>
    </div>
  </div>

  <!-- ── Recently added ── -->
  <div class="recent-section">
    <div class="recent-title">
      <i class="ti ti-history" aria-hidden="true"></i>
      Zuletzt hinzugefügt
    </div>

    {#if recentItems.length === 0}
      <p class="empty-hint">Noch keine Aufgaben in dieser Sitzung erfasst.</p>
    {:else}
      {#each recentItems as item, i (item.tempId)}
        <div class="recent-item" class:recent-flash={i === 0} animate:flip={{ duration: 150 }}>
          <span class="recent-item-title">{item.title}</span>
          <div class="recent-item-meta">
            <span class="prio-pill prio-{item.prio}">{PRIO_LABELS[item.prio]}</span>
            <span class="sp-pill">{item.sp} SP</span>
            <span class="to-backlog">→ Backlog</span>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  .capture-page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* ── Hero card ─────────────────────────────── */
  .capture-hero {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 20px 22px 22px;
  }

  .capture-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 3px;
  }

  .capture-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 18px;
  }

  /* ── Title row ─────────────────────────────── */
  .title-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .title-input {
    flex: 1;
    font-size: 14px;
    padding: 9px 12px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--text-primary);
    font-family: inherit;
    outline: none;
    transition: border-color 0.12s;
  }

  .title-input:focus {
    border-color: var(--accent);
  }

  .title-input::placeholder {
    color: var(--text-muted);
  }

  /* ── Options grid ──────────────────────────── */
  .options-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 14px;
  }

  .opt-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .opt-label {
    font-size: 10px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .opt-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  /* Base chip style */
  .opt-chip {
    padding: 7px 12px;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    background: var(--bg-main);
    transition: all 0.12s;
  }

  .opt-chip:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* Prio: selected state via CSS vars (set inline per chip) */
  .prio-chip.chip-sel {
    background: var(--pb);
    border-color: var(--pc);
    color: var(--pc);
    font-weight: 600;
  }

  /* SP: bigger, selected state matches accent */
  .sp-chip {
    min-width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 500;
    padding: 7px 12px;
  }

  .sp-chip.chip-sel {
    background: rgba(63, 185, 80, 0.12);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
  }

  /* ── Description ───────────────────────────── */
  .desc-group {
    margin-bottom: 14px;
  }

  .desc-textarea {
    width: 100%;
    font-size: 12px;
    padding: 8px 12px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 7px;
    color: var(--text-primary);
    font-family: inherit;
    resize: none;
    height: 56px;
    outline: none;
    transition: border-color 0.12s;
  }

  .desc-textarea:focus {
    border-color: var(--accent);
  }

  .desc-textarea::placeholder {
    color: var(--text-muted);
  }

  /* ── Capture actions row ───────────────────── */
  .capture-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  }

  .preview-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: 20px;
    font-size: 11px;
    color: var(--text-secondary);
    background: var(--bg-hover);
    margin-right: auto;
    transition: opacity 0.15s;
  }

  .preview-chip i {
    font-size: 12px;
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 5px 10px;
    font-size: 11px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.12s;
  }

  .btn-secondary:hover {
    background: var(--bg-hover);
  }

  .btn-green {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--accent);
    color: #0d1117;
    border: none;
    border-radius: 7px;
    padding: 5px 12px;
    font-size: 11px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: opacity 0.12s;
  }

  .btn-green:hover:not(:disabled) {
    opacity: 0.85;
  }

  .btn-green:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* ── Recent section ────────────────────────── */
  .recent-section {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
  }

  .recent-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 10px;
  }

  .recent-title i {
    font-size: 14px;
    color: var(--text-muted);
  }

  .empty-hint {
    font-size: 12.5px;
    color: var(--text-muted);
    padding: 4px 0;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 10px;
    background: var(--bg-hover);
    border-radius: 7px;
    font-size: 12px;
    margin-bottom: 5px;
  }

  @keyframes recentFlash {
    from { background: #1a2e1d; }
    to   { background: var(--bg-hover); }
  }

  .recent-flash {
    animation: recentFlash 0.6s ease forwards;
  }

  .recent-item-title {
    flex: 1;
    color: var(--text-primary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 13px;
  }

  .recent-item-meta {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-shrink: 0;
  }

  /* ── Recent item badges ─────────────────────── */
  .prio-pill {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 5px;
    font-weight: 600;
    white-space: nowrap;
    border: 1px solid;
  }

  .prio-pill.prio-critical { background: rgba(248,81,73,0.12);   color: #f85149; border-color: rgba(248,81,73,0.3);   }
  .prio-pill.prio-high     { background: rgba(240,136,62,0.12);  color: #f0883e; border-color: rgba(240,136,62,0.3);  }
  .prio-pill.prio-medium   { background: rgba(210,153,34,0.12);  color: #d29922; border-color: rgba(210,153,34,0.3);  }
  .prio-pill.prio-low      { background: rgba(139,148,158,0.12); color: #8b949e; border-color: rgba(139,148,158,0.3); }

  .sp-pill {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 1px 5px;
  }

  .to-backlog {
    font-size: 10px;
    color: var(--text-muted);
  }
</style>
