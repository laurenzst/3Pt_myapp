<script>
  import "./styles.css";
  import { page } from '$app/state';
  import { authClient } from "$lib/auth-client.js";
  import { goto } from "$app/navigation";

  let { children, data } = $props();

  let showDropdown = $state(false);

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
  let userName = $derived(data.user?.name ?? "");
  let userEmail = $derived(data.user?.email ?? "");
  let userImage = $derived(data.user?.image ?? null);
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
              <polyline points="9 11 12 14 22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            ToDo
          </a>
        </div>
      </nav>

      <!-- User area with dropdown -->
      <div class="sidebar-footer user-dropdown-area">
        {#if showDropdown}
          <div class="user-dropdown">
            <div class="dropdown-header">
              <div class="dropdown-avatar">
                {#if userImage}
                  <img src={userImage} alt={userName} />
                {:else}
                  {userInitial}
                {/if}
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
            {#if userImage}
              <img src={userImage} alt={userName} />
            {:else}
              {userInitial}
            {/if}
          </div>
          <span class="user-name">{userName}</span>
          <svg
            class="chevron"
            class:open={showDropdown}
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"
          >
            <polyline points="18 15 12 9 6 15"/>
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
{:else}
  {@render children()}
{/if}

<style>
  /* ── User button ────────────────────────────── */
  .user-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
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

  :global(.user-avatar img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :global(.user-name) {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
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

  .dropdown-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
