<script>
  import "./styles.css";
  import { page } from '$app/state';
  import { authClient } from "$lib/auth-client.js";
  import { goto, invalidateAll } from "$app/navigation";
  import { drag } from "$lib/dragState.js";
  import TaskDrawer from "$lib/TaskDrawer.svelte";
  import { openDrawer } from "$lib/drawerState.svelte.js";

  let { children, data } = $props();

  let showDropdown = $state(false);
  let blPanelHover = $state(false);

  function isActive(path) {
    if (path === '/') return page.url.pathname === '/';
    return page.url.pathname === path || page.url.pathname.startsWith(path + '/');
  }

  async function handleLogout() {
    showDropdown = false;
    await authClient.signOut();
    goto("/login");
  }

  function handleWindowClick(e) {
    if (!e.target.closest('.user-dropdown-area')) {
      showDropdown = false;
    }
  }

  let userInitial = $derived(
    data.user?.name ? data.user.name[0].toUpperCase() : "?"
  );
  let userName  = $derived(data.user?.name ?? "");
  let userEmail = $derived(data.user?.email ?? "");

  const TYPE_LABELS = { story: 'S', task: 'T', bug: 'B', spike: 'R' };

  // ── Backlog chip drag ─────────────────────────────────────────
  function onBacklogChipDragStart(e, task) {
    drag.source = "backlog";
    drag.taskId = task._id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task._id);
  }

  function onBacklogChipDragEnd() {
    drag.source = null;
    drag.taskId = null;
  }

  // ── Backlog panel drop target (calendar task → backlog) ───────
  function onBlPanelDragOver(e) {
    if (!drag.source || drag.source === "backlog") return;
    e.preventDefault();
    blPanelHover = true;
  }

  function onBlPanelDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    blPanelHover = false;
  }

  async function onBlPanelDrop(e) {
    e.preventDefault();
    blPanelHover = false;
    const taskId = drag.taskId;
    const source = drag.source;
    if (!taskId || !source || source === "backlog") return;
    drag.source = null;
    drag.taskId = null;
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "moveToBacklog", taskId, payload: {} }),
    });
    await invalidateAll();
  }
</script>

<svelte:window onclick={handleWindowClick} />

{#if data.user}
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="app-logo">
          <div class="logo-icon">S</div>
          <span class="app-name">StudyFlow</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section">
          <span class="nav-section-label">Allgemein</span>
          <a href="/" class="nav-item" class:active={isActive('/')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
            Dashboard
          </a>
        </div>

        <div class="nav-section">
          <span class="nav-section-label">Aufgaben</span>
          <a href="/todo" class="nav-item" class:active={isActive('/todo')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="4" y1="12" x2="20" y2="12"/>
            </svg>
            Aufgabe erfassen
          </a>
          <a href="/sprint" class="nav-item" class:active={isActive('/sprint')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="5" height="18" rx="1"/>
              <rect x="10" y="3" width="5" height="12" rx="1"/>
              <rect x="17" y="3" width="5" height="7" rx="1"/>
            </svg>
            Sprint Board
          </a>
          <a href="/calendar" class="nav-item" class:active={isActive('/calendar')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Kalender
          </a>
        </div>
      </nav>

      <div class="sidebar-divider"></div>

      <!-- Backlog panel (also a drop target for calendar → backlog) -->
      <div
        class="bl-panel"
        class:bl-panel-drop={blPanelHover}
        ondragover={onBlPanelDragOver}
        ondragleave={onBlPanelDragLeave}
        ondrop={onBlPanelDrop}
        role="region"
        aria-label="Backlog – Ablagebereich"
      >
        <div class="bl-head">
          <span class="bl-title">Backlog</span>
          <span class="bl-cnt">{data.backlogTasks?.length ?? 0}</span>
        </div>
        <div class="bl-items">
          {#each data.backlogTasks ?? [] as task (task._id)}
            <div
              class="bl-chip"
              draggable="true"
              ondragstart={(e) => onBacklogChipDragStart(e, task)}
              ondragend={onBacklogChipDragEnd}
              onclick={() => openDrawer(task)}
              title="{task.title} — klicken zum Bearbeiten, ziehen zum Planen"
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === "Enter" && openDrawer(task)}
            >
              <span class="bl-type-badge type-{task.type ?? 'task'}">
                {TYPE_LABELS[task.type] ?? 'T'}
              </span>
              <span class="bl-chip-title">{task.title}</span>
              {#if task.sp}
                <span class="bl-sp-pill">{task.sp}</span>
              {/if}
            </div>
          {:else}
            <p class="bl-empty">Noch leer.</p>
          {/each}
        </div>
      </div>

      <!-- User area with dropdown -->
      <div class="sidebar-footer user-dropdown-area">
        {#if showDropdown}
          <div class="user-dropdown">
            <div class="dropdown-header">
              <div class="dropdown-avatar">
                {userInitial}
              </div>
              <div class="dropdown-info">
                <span class="dropdown-name">{userName}</span>
                <span class="dropdown-email">{userEmail}</span>
              </div>
            </div>

            <div class="dropdown-divider"></div>

            <a
              href="/settings"
              class="dropdown-item"
              onclick={() => showDropdown = false}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Profil
            </a>

            <div class="dropdown-divider"></div>

            <button class="dropdown-item danger" onclick={handleLogout}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Abmelden
            </button>
          </div>
        {/if}

        <button
          class="user-btn"
          onclick={() => showDropdown = !showDropdown}
          aria-expanded={showDropdown}
        >
          <div class="user-avatar">
            {userInitial}
          </div>
          <div class="user-text">
            <span class="user-name">{userName}</span>
            <span class="user-email">{userEmail}</span>
          </div>
          <svg
            class="chevron"
            class:open={showDropdown}
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="4 9 12 17 20 9"/>
            <polyline points="4 5 12 13 20 5" opacity="0.4"/>
          </svg>
        </button>
      </div>
    </aside>

    <main class="main-content">
      <div class="page-wrapper">
        {@render children()}
      </div>
    </main>
  </div>
  <TaskDrawer />
{:else}
  {@render children()}
{/if}

<style>
  /* ── Sidebar layout changes ─────────────────── */
  :global(.sidebar) {
    overflow: hidden !important;
  }

  :global(.sidebar-nav) {
    flex: 0 0 auto !important;
    overflow: visible !important;
  }

  .sidebar-divider {
    height: 1px;
    background: var(--border);
    margin: 0;
    flex-shrink: 0;
  }

  /* ── Backlog panel ──────────────────────────── */
  .bl-panel {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .bl-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 1rem 6px;
    flex-shrink: 0;
  }

  .bl-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-muted);
    flex: 1;
  }

  .bl-cnt {
    font-size: 11px;
    color: var(--text-muted);
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1px 6px;
  }

  .bl-items {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px 8px;
  }

  .bl-items::-webkit-scrollbar {
    width: 2px;
  }

  .bl-items::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 1px;
  }

  .bl-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 7px;
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 4px;
    cursor: grab;
    background: var(--bg-card);
    transition: background 0.12s;
  }

  .bl-chip:hover {
    background: var(--bg-hover);
  }

  .bl-chip:active {
    cursor: grabbing;
    opacity: 0.5;
  }

  .bl-type-badge {
    font-size: 10px;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 4px;
    flex-shrink: 0;
  }

  .type-story { background: #EEEDFE; color: #534AB7; }
  .type-task  { background: #E1F5EE; color: #0F6E56; }
  .type-bug   { background: #FCEBEB; color: #A32D2D; }
  .type-spike { background: #FAEEDA; color: #854F0B; }

  .bl-chip-title {
    font-size: 11px;
    color: var(--text-primary);
    flex: 1;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .bl-sp-pill {
    font-size: 10px;
    color: var(--text-muted);
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 1px 5px;
    flex-shrink: 0;
  }

  .bl-panel-drop {
    outline: 1.5px dashed var(--danger);
    outline-offset: -3px;
    background: rgba(218, 54, 51, 0.05);
  }

  .bl-empty {
    font-size: 12px;
    color: var(--text-muted);
    padding: 4px 2px;
  }

  /* ── User button ────────────────────────────── */
  .user-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem 0.6rem;
    border-radius: var(--radius);
    transition: background 0.12s;
  }

  .user-btn:hover {
    background: var(--bg-hover);
  }

  .chevron {
    margin-left: auto;
    color: var(--text-muted);
    transition: transform 0.15s;
    flex-shrink: 0;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  /* ── User avatar (sidebar + dropdown) ───────── */
  :global(.user-avatar) {
    width: 28px;
    height: 28px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    flex-shrink: 0;
    overflow: hidden;
  }

  :global(.user-name) {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    text-align: left;
  }

  .user-email {
    font-size: 11px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Dropdown ───────────────────────────────── */
  .user-dropdown-area {
    position: relative;
  }

  .user-dropdown {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0.5rem;
    right: 0.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    z-index: 100;
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.85rem 0.85rem 0.75rem;
  }

  .dropdown-avatar {
    width: 34px;
    height: 34px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    flex-shrink: 0;
    overflow: hidden;
  }

  .dropdown-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .dropdown-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-email {
    font-size: 11.5px;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--border);
    margin: 0;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.55rem 0.85rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }

  .dropdown-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .dropdown-item.danger {
    color: var(--danger);
  }

  .dropdown-item.danger:hover {
    background: rgba(218, 54, 51, 0.1);
    color: var(--danger);
  }
</style>
