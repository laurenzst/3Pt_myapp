<script>
  import "./styles.css";
  import { page } from '$app/state';
  let { children } = $props();

  function isActive(path) {
    if (path === '/') return page.url.pathname === '/';
    return page.url.pathname === path || page.url.pathname.startsWith(path + '/');
  }
</script>

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

    <div class="sidebar-footer">
      <div class="user-info">
        <div class="user-avatar">L</div>
        <span class="user-name">Laurenz</span>
      </div>
    </div>
  </aside>

  <main class="main-content">
    <div class="page-wrapper">
      {@render children()}
    </div>
  </main>
</div>
