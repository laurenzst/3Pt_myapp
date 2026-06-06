<script>
  import { fly, fade } from "svelte/transition";
  import { invalidateAll } from "$app/navigation";
  import { drawerState, closeDrawer } from "$lib/drawerState.svelte.js";

  const PRIOS = [
    { value: "critical", label: "Kritisch", color: "#f85149", bg: "rgba(248,81,73,0.12)"  },
    { value: "high",     label: "Hoch",     color: "#d29922", bg: "rgba(210,153,34,0.12)" },
    { value: "medium",   label: "Mittel",   color: "#8b949e", bg: "rgba(139,148,158,0.12)"},
    { value: "low",      label: "Niedrig",  color: "#4d9fe0", bg: "rgba(77,159,224,0.12)" },
  ];
  const SP_VALUES = [1, 2, 3, 5, 8, 13];

  let titleInput = $state(null);

  let editTitle       = $state("");
  let editDescription = $state("");
  let editPrio        = $state("medium");
  let editSp          = $state(5);
  let saving          = $state(false);

  // Sync fields when drawer opens with a new task
  $effect(() => {
    if (drawerState.open && drawerState.task) {
      editTitle       = drawerState.task.title       ?? "";
      editDescription = drawerState.task.description ?? "";
      editPrio        = drawerState.task.prio        ?? "medium";
      editSp          = drawerState.task.sp          ?? 5;
      setTimeout(() => titleInput?.focus(), 60);
    }
  });

  function onBackdropClick() { closeDrawer(); }

  function onKeydown(e) {
    if (drawerState.open && e.key === "Escape") closeDrawer();
  }

  async function save() {
    if (!editTitle.trim() || saving) return;
    saving = true;
    try {
      await fetch("/api/tasks", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:  "updateTask",
          taskId:  drawerState.task._id,
          payload: {
            title:       editTitle.trim(),
            description: editDescription,
            prio:        editPrio,
            sp:          editSp,
          },
        }),
      });
      await invalidateAll();
      closeDrawer();
    } finally {
      saving = false;
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if drawerState.open}
  <!-- Backdrop -->
  <div
    class="backdrop"
    transition:fade={{ duration: 180 }}
    onclick={onBackdropClick}
    aria-hidden="true"
  ></div>

  <!-- Drawer -->
  <div
    class="drawer"
    transition:fly={{ x: 420, duration: 220, opacity: 1 }}
    role="dialog"
    aria-modal="true"
    aria-label="Aufgabe bearbeiten"
  >
    <!-- Header -->
    <div class="drawer-header">
      <span class="drawer-label">Aufgabe bearbeiten</span>
      <button class="close-btn" onclick={closeDrawer} aria-label="Schliessen">
        <i class="ti ti-x" aria-hidden="true"></i>
      </button>
    </div>

    <!-- Body -->
    <div class="drawer-body">
      <!-- Title -->
      <div class="field-group">
        <label class="field-label" for="edit-title">Titel</label>
        <input
          id="edit-title"
          class="field-input"
          type="text"
          bind:value={editTitle}
          bind:this={titleInput}
          placeholder="Aufgabentitel"
          onkeydown={(e) => e.key === "Enter" && save()}
        />
      </div>

      <!-- Description -->
      <div class="field-group">
        <label class="field-label" for="edit-desc">Beschreibung</label>
        <textarea
          id="edit-desc"
          class="field-textarea"
          bind:value={editDescription}
          placeholder="Beschreibung, Kontext oder Akzeptanzkriterien…"
          rows="6"
        ></textarea>
      </div>

      <!-- Priority -->
      <div class="field-group">
        <div class="field-label">Priorität</div>
        <div class="chip-row">
          {#each PRIOS as p}
            <button
              class="prio-chip"
              class:prio-chip-sel={editPrio === p.value}
              style:--pc={p.color}
              style:--pb={p.bg}
              onclick={() => editPrio = p.value}
            >{p.label}</button>
          {/each}
        </div>
      </div>

      <!-- Story Points -->
      <div class="field-group">
        <div class="field-label">Story Points</div>
        <div class="chip-row">
          {#each SP_VALUES as sp}
            <button
              class="sp-chip"
              class:sp-chip-sel={editSp === sp}
              onclick={() => editSp = sp}
            >{sp}</button>
          {/each}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="drawer-footer">
      <button class="btn-cancel" onclick={closeDrawer}>Abbrechen</button>
      <button
        class="btn-save"
        onclick={save}
        disabled={!editTitle.trim() || saving}
      >
        {saving ? "Speichern…" : "Speichern"}
      </button>
    </div>
  </div>
{/if}

<style>
  /* ── Backdrop ───────────────────────────── */
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 200;
    cursor: pointer;
  }

  /* ── Drawer panel ───────────────────────── */
  .drawer {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: 400px;
    background: var(--bg-card);
    border-left: 1px solid var(--border);
    z-index: 201;
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.35);
  }

  /* ── Header ─────────────────────────────── */
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .drawer-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 15px;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
  }

  .close-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border);
    color: var(--text-primary);
  }

  /* ── Body ───────────────────────────────── */
  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px 18px;
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .field-input {
    width: 100%;
    padding: 9px 11px;
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: 7px;
    font-size: 14px;
    font-family: inherit;
    color: var(--text-primary);
    transition: border-color 0.12s;
    box-sizing: border-box;
  }

  .field-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .field-textarea {
    width: 100%;
    padding: 9px 11px;
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: 7px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-primary);
    resize: vertical;
    line-height: 1.5;
    transition: border-color 0.12s;
    box-sizing: border-box;
  }

  .field-textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  /* ── Chip rows ──────────────────────────── */
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }

  .prio-chip {
    padding: 5px 11px;
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
  }

  .prio-chip:hover { background: var(--bg-hover); color: var(--text-primary); }

  .prio-chip-sel {
    background: var(--pb);
    border-color: var(--pc);
    color: var(--pc);
    font-weight: 600;
  }

  .sp-chip {
    padding: 5px 10px;
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.12s;
    min-width: 36px;
    text-align: center;
  }

  .sp-chip:hover { background: var(--bg-hover); color: var(--text-primary); }

  .sp-chip-sel {
    background: rgba(63, 185, 80, 0.12);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
  }

  /* ── Footer ─────────────────────────────── */
  .drawer-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 14px 18px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .btn-cancel {
    padding: 8px 16px;
    background: transparent;
    border: 1px solid var(--border);
    border-radius: 7px;
    font-size: 13px;
    font-family: inherit;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .btn-cancel:hover { background: var(--bg-hover); color: var(--text-primary); }

  .btn-save {
    padding: 8px 18px;
    background: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 7px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    color: #0d1117;
    cursor: pointer;
    transition: opacity 0.12s;
  }

  .btn-save:disabled { opacity: 0.45; cursor: not-allowed; }
  .btn-save:not(:disabled):hover { opacity: 0.85; }
</style>
