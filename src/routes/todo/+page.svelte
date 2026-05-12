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
  let dragPreview = $state(null); // ordered array of task IDs shown during drag
  let baseOrder = []; // captured at dragstart, used as reference for all previews
  let lastDragKey = ""; // deduplicate dragover events

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

    // Apply preview priorities to local state (no visual jump on drop)
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
        // restored task goes to unprioritized (no priority)
      } else {
        task.status = "done";
        task.priority = undefined; // remove from prioritized list immediately
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

<h1>ToDo</h1>

<form method="POST" action="?/add" class="mb-3">
  <div class="d-flex gap-2">
    <input
      type="text"
      name="title"
      placeholder="Neue Aufgabe..."
      bind:value={title}
      class="form-control"
    />
    <button type="submit" class="btn btn-primary">Hinzufügen</button>
  </div>
</form>

<div class="columns">
  <div class="column">
    <h2>Priorisiert</h2>
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
    </div>
  </div>

  <div class="column">
    <h2>Nicht priorisiert</h2>
    {#each activeUnprioritized as task (task._id)}
      <div class="unprioritized-card">
        <span class="task-title">{task.title || task.task}</span>
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
          <button class="btn-delete" onclick={() => deleteTask(task._id)}>×</button>
        </div>
      </div>
    {/each}
  </div>
</div>

{#if completedTasks.length > 0}
  <div class="completed-section">
    <button class="toggle-completed" onclick={() => showCompleted = !showCompleted}>
      {showCompleted ? "▾" : "▸"} Erledigt ({completedTasks.length})
    </button>
    {#if showCompleted}
      <div class="completed-list">
        {#each completedTasks as task (task._id)}
          <div class="completed-card">
            <input type="checkbox" checked onchange={() => toggleStatus(task._id)} class="checkbox" />
            <span class="completed-title">{task.title || task.task}</span>
            <button class="btn-delete" onclick={() => deleteTask(task._id)}>×</button>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .columns {
    display: flex;
    gap: 2em;
    align-items: flex-start;
  }
  .column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .column h2 {
    margin-bottom: 0.25em;
  }

  /* Priority list with rank numbers */
  .priority-list {
    display: flex;
    flex-direction: column;
    gap: 0.4em;
  }
  .task-row {
    display: flex;
    align-items: center;
    gap: 0.6em;
  }
  .rank {
    font-size: 0.8em;
    color: #999;
    min-width: 1.2em;
    text-align: right;
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }
  .task-wrapper {
    flex: 1;
    min-width: 0;
  }

  /* Unprioritized */
  .unprioritized-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5em;
    border: 1px solid #555;
    background-color: #444;
    color: white;
    padding: 0.5em;
  }
  .task-title {
    font-weight: bold;
    flex: 1;
  }
  .assign-controls {
    display: flex;
    gap: 0.5em;
    align-items: center;
  }
  .priority-input {
    width: 5em;
    padding: 0.25em;
    background-color: #555;
    color: white;
    border: 1px solid #777;
    border-radius: 2px;
  }
  .btn-assign {
    padding: 0.25em 0.5em;
    font-size: 0.8em;
    background-color: #666;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 2px;
  }
  .btn-assign:hover:not(:disabled) { background-color: #777; }
  .btn-assign:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-delete {
    padding: 0.2em 0.45em;
    font-size: 0.85em;
    background-color: #7a2d2d;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 2px;
  }
  .btn-delete:hover { background-color: #a33; }

  /* Completed section */
  .completed-section {
    margin-top: 1.5em;
    max-width: 600px;
  }
  .toggle-completed {
    background: none;
    border: none;
    color: #555;
    cursor: pointer;
    font-size: 0.95em;
    padding: 0;
    margin-bottom: 0.5em;
  }
  .toggle-completed:hover { color: #222; }
  .completed-list {
    display: flex;
    flex-direction: column;
    gap: 0.5em;
  }
  .completed-card {
    display: flex;
    align-items: center;
    gap: 0.5em;
    border: 1px solid #ccc;
    background-color: #f5f5f5;
    color: #888;
    padding: 0.5em;
  }
  .checkbox {
    flex-shrink: 0;
    cursor: pointer;
    width: 1em;
    height: 1em;
    accent-color: #4caf50;
  }
  .completed-title {
    flex: 1;
    text-decoration: line-through;
  }
</style>
