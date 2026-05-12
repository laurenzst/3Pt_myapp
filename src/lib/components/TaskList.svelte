<script>
  let { task, onToggleStatus, onDelete, dragging = false } = $props();
  let title = $derived(task.title || task.task);
  let isDone = $derived(task.status === "done");
</script>

<div class="task-card" class:done={isDone} class:dragging>
  <span class="drag-handle" title="Zum Verschieben ziehen">⠿</span>
  <span class="task-title">{title}</span>
  <div class="controls">
    <input type="checkbox" checked={isDone} onchange={onToggleStatus} class="checkbox" />
    <button class="btn-delete" onclick={onDelete}>×</button>
  </div>
</div>

<style>
  .task-card {
    display: flex;
    align-items: center;
    gap: 0.6em;
    border: 1px solid #555;
    background-color: #444;
    color: white;
    padding: 0.55em 0.6em;
    transition: opacity 0.12s, box-shadow 0.12s;
    user-select: none;
    cursor: grab;
  }
  .task-card:active {
    cursor: grabbing;
  }
  .task-card.dragging {
    opacity: 0.35;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .task-card.done {
    opacity: 0.5;
  }
  .drag-handle {
    color: #777;
    font-size: 1.1em;
    flex-shrink: 0;
    line-height: 1;
  }
  .task-title {
    flex: 1;
    font-weight: bold;
  }
  .done .task-title {
    text-decoration: line-through;
  }
  .controls {
    display: flex;
    gap: 0.4em;
    align-items: center;
    flex-shrink: 0;
  }
  .checkbox {
    cursor: pointer;
    width: 1em;
    height: 1em;
    accent-color: #4caf50;
  }
  .btn-delete {
    padding: 0.2em 0.45em;
    font-size: 0.85em;
    background-color: #7a2d2d;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 2px;
  }
  .btn-delete:hover {
    background-color: #a33;
  }
</style>
