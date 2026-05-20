<script>
  import TaskList from "$lib/components/TaskList.svelte";
  import { invalidateAll } from "$app/navigation";
  import { flip } from "svelte/animate";

  let {data} = $props();
  let title = $state("");
  let priorityInputs = $state({});
  let showCompleted = $state(false);

  // Local copy for optimistic updates
  let localTasks = $state([]);
  $effect(() => {
    localTasks = data.tasks.map(t => ({...t}));
  });

  let activePrioritized = $derived(
    dragPreview
      ? dragPreview.map(id => localTasks.find(t => t._id === id)).filter(Boolean)
      : localTasks
          .filter(t => t.priority != null && t.status !== "done")
          .sort((a, b) => a.priority - b.priority)
  );
  let activeUnprioritized = $derived(
    localTasks.filter(t => t.priority == null && t.status !== "done")
  );
  let completedTasks = $derived(
    localTasks.filter(t => t.status === "done")
  );

  // ── Drag & Drop ──────────────────────────────────────────
  let draggedId = $state(null);
  let dragPreview = $state(null);
  let baseOrder = [];
  let lastDragKey = "";

  function computePreview(targetId, insertBefore) {
    const fromIdx = baseOrder.indexOf(draggedId);
    let toIdx = baseOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return null;

    if (!insertBefore) toIdx++;
    if (fromIdx < toIdx) toIdx--;
    if (fromIdx === toIdx) return null;

    const next = [...baseOrder];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    return next;
  }

  function handleDragStart(e, taskId) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) {
      e.preventDefault();
      return;
    }
    draggedId = taskId;
    baseOrder = localTasks
      .filter(t => t.priority != null && t.status !== "done")
      .sort((a, b) => a.priority - b.priority)
      .map(t => t._id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, taskId) {
    e.preventDefault();
    if (!draggedId || draggedId === taskId) return;
    e.dataTransfer.dropEffect = "move";

    const rect = e.currentTarget.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    const key = `${taskId}-${before}`;
    if (key === lastDragKey) return;
    lastDragKey = key;

    const preview = computePreview(taskId, before);
    if (preview) dragPreview = preview;
  }

  function handleDrop(e) {
    e.preventDefault();
    const fromId = draggedId;
    const preview = dragPreview;
    draggedId = null;
    dragPreview = null;
    baseOrder = [];
    lastDragKey = "";

    if (!fromId || !preview) return;

    preview.forEach((id, i) => {
      const task = localTasks.find(t => t._id === id);
      if (task) task.priority = i + 1;
    });

    const newPriority = preview.indexOf(fromId) + 1;
    const form = new FormData();
    form.append("taskId", fromId);
    form.append("priority", newPriority);
    fetch("?/reorder", { method: "POST", body: form }).then(() => invalidateAll());
  }

  function handleDragEnd() {
    draggedId = null;
    dragPreview = null;
    baseOrder = [];
    lastDragKey = "";
  }

  // ── Andere Aktionen ───────────────────────────────────────
  async function assignPriority(taskId) {
    const priority = priorityInputs[taskId];
    if (!priority || priority < 1) return;
    const form = new FormData();
    form.append("taskId", taskId);
    form.append("priority", priority);
    await fetch("?/assign", { method: "POST", body: form });
    priorityInputs[taskId] = undefined;
    await invalidateAll();
  }

  async function toggleStatus(taskId) {
    const task = localTasks.find(t => t._id === taskId);
    if (task) {
      if (task.status === "done") {
        task.status = "active";
      } else {
        task.status = "done";
        task.priority = undefined;
      }
    }
    const form = new FormData();
    form.append("taskId", taskId);
    fetch("?/toggleStatus", { method: "POST", body: form }).then(() => invalidateAll());
  }

  async function deleteTask(taskId) {
    const idx = localTasks.findIndex(t => t._id === taskId);
    if (idx !== -1) localTasks.splice(idx, 1);
    const form = new FormData();
    form.append("taskId", taskId);
    fetch("?/remove", { method: "POST", body: form }).then(() => invalidateAll());
  }
</script>

<p class="page-breadcrumb">Aufgaben</p>
<h1 class="page-title">ToDo</h1>
<p class="page-subtitle">Verwalte und priorisiere deine Aufgaben per Drag & Drop.</p>

<form method="POST" action="?/add" class="add-form">
  <input
    type="text"
    name="title"
    placeholder="Neue Aufgabe hinzufügen..."
    bind:value={title}
    class="add-input"
  />
  <button type="submit" class="btn-add">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    Hinzufügen
  </button>
</form>

<div class="columns">
  <div class="panel">
    <div class="panel-header">
      <h2>Priorisiert</h2>
      <span class="badge">{activePrioritized.length}</span>
    </div>
    <div class="priority-list">
      {#each activePrioritized as task, i (task._id)}
        <div class="task-row" animate:flip={{ duration: 180 }}>
          <span class="rank">{i + 1}</span>
          <div
            class="task-wrapper"
            role="listitem"
            draggable="true"
            ondragstart={(e) => handleDragStart(e, task._id)}
            ondragover={(e) => handleDragOver(e, task._id)}
            ondrop={handleDrop}
            ondragend={handleDragEnd}
          >
            <TaskList
              task={task}
              dragging={draggedId === task._id}
              onToggleStatus={() => toggleStatus(task._id)}
              onDelete={() => deleteTask(task._id)}
            />
          </div>
        </div>
      {/each}
      {#if activePrioritized.length === 0}
        <p class="empty-hint">Noch keine priorisierten Aufgaben.</p>
      {/if}
    </div>
  </div>

  <div class="panel">
    <div class="panel-header">
      <h2>Nicht priorisiert</h2>
      <span class="badge">{activeUnprioritized.length}</span>
    </div>
    {#each activeUnprioritized as task (task._id)}
      <div class="unprioritized-card">
        <span class="task-label">{task.title || task.task}</span>
        <div class="assign-controls">
          <input
            type="number"
            min="1"
            placeholder="Priorität"
            bind:value={priorityInputs[task._id]}
            class="priority-input"
            onkeydown={(e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
            onkeypress={(e) => { if (e.key === 'Enter') assignPriority(task._id); }}
          />
          <button
            class="btn-assign"
            onclick={() => assignPriority(task._id)}
            disabled={!priorityInputs[task._id]}
          >
            Priorisieren
          </button>
          <button class="btn-delete" onclick={() => deleteTask(task._id)} title="Löschen">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
    {/each}
    {#if activeUnprioritized.length === 0}
      <p class="empty-hint">Alle Aufgaben sind priorisiert.</p>
    {/if}
  </div>
</div>

{#if completedTasks.length > 0}
  <div class="completed-section">
    <button class="toggle-completed" onclick={() => showCompleted = !showCompleted}>
      <svg
        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
        style="transition: transform 0.15s; transform: rotate({showCompleted ? 90 : 0}deg)"
      >
        <polyline points="9 18 15 12 9 6"/>
      </svg>
      Erledigt ({completedTasks.length})
    </button>
    {#if showCompleted}
      <div class="completed-list">
        {#each completedTasks as task (task._id)}
          <div class="completed-card">
            <input type="checkbox" checked onchange={() => toggleStatus(task._id)} class="checkbox" />
            <span class="completed-title">{task.title || task.task}</span>
            <button class="btn-delete" onclick={() => deleteTask(task._id)} title="Löschen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  /* ── Add form ──────────────────────────────── */
  .add-form {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1.5rem;
  }

  .add-input {
    flex: 1;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    padding: 0.55rem 0.85rem;
    font-size: 13.5px;
    outline: none;
    transition: border-color 0.12s;
  }

  .add-input:focus {
    border-color: var(--accent);
  }

  .add-input::placeholder {
    color: var(--text-muted);
  }

  .btn-add {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 1rem;
    background: var(--accent);
    color: #0d1117;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s;
    white-space: nowrap;
  }

  .btn-add:hover {
    background: var(--accent-hover);
  }

  /* ── Two-column layout ─────────────────────── */
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.25rem;
    align-items: flex-start;
  }

  .panel {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.1rem 1.1rem 1rem;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.85rem;
  }

  .panel-header h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 18px;
    padding: 0 5px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 9px;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-muted);
  }

  /* ── Prioritized list ──────────────────────── */
  .priority-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .task-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .rank {
    font-size: 11px;
    color: var(--text-muted);
    min-width: 1.1em;
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .task-wrapper {
    flex: 1;
    min-width: 0;
  }

  /* ── Unprioritized cards ───────────────────── */
  .unprioritized-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.65rem;
    margin-bottom: 0.35rem;
  }

  .task-label {
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .assign-controls {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-shrink: 0;
  }

  .priority-input {
    width: 72px;
    padding: 0.3rem 0.5rem;
    background: var(--bg-main);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 12.5px;
    outline: none;
    transition: border-color 0.12s;
  }

  .priority-input:focus {
    border-color: var(--accent);
  }

  .btn-assign {
    padding: 0.3rem 0.6rem;
    font-size: 12px;
    font-weight: 500;
    background: var(--bg-main);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .btn-assign:hover:not(:disabled) {
    background: var(--accent);
    color: #0d1117;
    border-color: var(--accent);
  }

  .btn-assign:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
    flex-shrink: 0;
  }

  .btn-delete:hover {
    background: rgba(218, 54, 51, 0.15);
    color: var(--danger);
    border-color: rgba(218, 54, 51, 0.3);
  }

  /* ── Empty hint ────────────────────────────── */
  .empty-hint {
    font-size: 12.5px;
    color: var(--text-muted);
    padding: 0.5rem 0;
  }

  /* ── Completed section ─────────────────────── */
  .completed-section {
    margin-top: 1.5rem;
  }

  .toggle-completed {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    padding: 0;
    margin-bottom: 0.6rem;
    transition: color 0.12s;
  }

  .toggle-completed:hover {
    color: var(--text-secondary);
  }

  .completed-list {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    max-width: 560px;
  }

  .completed-card {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.65rem;
  }

  .checkbox {
    flex-shrink: 0;
    cursor: pointer;
    width: 14px;
    height: 14px;
    accent-color: var(--accent);
  }

  .completed-title {
    flex: 1;
    font-size: 13.5px;
    color: var(--text-muted);
    text-decoration: line-through;
  }
</style>
