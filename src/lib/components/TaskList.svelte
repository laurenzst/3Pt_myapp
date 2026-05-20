<script>
  let { task, onToggleStatus, onDelete, dragging = false } = $props();
  let title = $derived(task.title || task.task);
  let isDone = $derived(task.status === "done");
</script>

<div class="task-card" class:done={isDone} class:dragging>
  <span class="drag-handle" title="Zum Verschieben ziehen">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
      <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
    </svg>
  </span>
  <span class="task-title">{title}</span>
  <div class="controls">
    <input type="checkbox" checked={isDone} onchange={onToggleStatus} class="checkbox" title="Als erledigt markieren" />
    <button class="btn-delete" onclick={onDelete} title="Löschen">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .task-card {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.6rem;
    transition: opacity 0.12s, box-shadow 0.12s, border-color 0.12s;
    user-select: none;
    cursor: grab;
  }

  .task-card:active {
    cursor: grabbing;
  }

  .task-card:hover {
    border-color: #444c56;
  }

  .task-card.dragging {
    opacity: 0.3;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }

  .task-card.done {
    opacity: 0.45;
  }

  .drag-handle {
    color: var(--text-muted);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    opacity: 0.6;
  }

  .task-card:hover .drag-handle {
    opacity: 1;
  }

  .task-title {
    flex: 1;
    font-size: 13.5px;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .done .task-title {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .controls {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    flex-shrink: 0;
  }

  .checkbox {
    cursor: pointer;
    width: 14px;
    height: 14px;
    accent-color: var(--accent);
  }

  .btn-delete {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: transparent;
    color: var(--text-muted);
    border: 1px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .btn-delete:hover {
    background: rgba(218, 54, 51, 0.15);
    color: var(--danger);
    border-color: rgba(218, 54, 51, 0.3);
  }
</style>
