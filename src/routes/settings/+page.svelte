<script>
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";

  let { data } = $props();

  let name = $state(data.user?.name ?? "");
  let githubUser = $state(deriveGithubUser(data.user?.image));
  let avatarPreview = $derived(
    githubUser ? `https://github.com/${githubUser}.png` : null
  );

  let profileSuccess = $state(false);
  let profileError = $state("");

  function deriveGithubUser(imageUrl) {
    if (!imageUrl) return "";
    const match = imageUrl.match(/^https:\/\/github\.com\/([^/]+)\.png/);
    return match ? match[1] : "";
  }

  function parseBrowser(ua) {
    if (!ua) return "Unbekannt";
    if (ua.includes("Edg")) return "Edge";
    if (ua.includes("Chrome")) return "Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    return "Browser";
  }

  function parseOS(ua) {
    if (!ua) return "";
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac OS")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    return "";
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("de-CH", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }
</script>

<p class="page-breadcrumb">Account</p>
<h1 class="page-title">Einstellungen</h1>
<p class="page-subtitle">Passe dein Profil an und verwalte deine Sitzungen.</p>

<!-- ── Profile ──────────────────────────────────────────── -->
<section class="settings-section">
  <h2 class="section-title">Profil</h2>

  <div class="profile-card">
    <div class="avatar-area">
      <div class="avatar-circle">
        {#if avatarPreview}
          <img src={avatarPreview} alt={name} onerror={(e) => e.target.style.display='none'} />
        {:else}
          <span>{name ? name[0].toUpperCase() : "?"}</span>
        {/if}
      </div>
      <div class="avatar-hint">
        Profilbild via GitHub-Username
      </div>
    </div>

    <form
      method="POST"
      action="?/updateProfile"
      use:enhance={() => {
        return async ({ result, update }) => {
          if (result.type === "failure") {
            profileError = result.data?.error ?? "Fehler beim Speichern.";
          } else {
            profileError = "";
            profileSuccess = true;
            setTimeout(() => profileSuccess = false, 2500);
            await invalidateAll();
          }
          await update({ reset: false });
        };
      }}
      class="profile-form"
    >
      <div class="field">
        <label for="name">Name</label>
        <input
          id="name"
          name="name"
          type="text"
          bind:value={name}
          required
          placeholder="Dein Name"
        />
      </div>

      <div class="field">
        <label for="githubUser">GitHub-Username</label>
        <div class="github-input-wrap">
          <span class="github-prefix">github.com/</span>
          <input
            id="githubUser"
            name="githubUser"
            type="text"
            bind:value={githubUser}
            placeholder="username"
          />
        </div>
        <p class="field-hint">
          Dein Profilbild wird von
          {#if githubUser}
            <a href="https://github.com/{githubUser}" target="_blank" rel="noopener">
              github.com/{githubUser}
            </a>
          {:else}
            GitHub
          {/if}
          geladen.
        </p>
      </div>

      {#if profileError}
        <p class="form-error">{profileError}</p>
      {/if}

      <div class="form-actions">
        <button type="submit" class="btn-save">
          {#if profileSuccess}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Gespeichert
          {:else}
            Speichern
          {/if}
        </button>
      </div>
    </form>
  </div>
</section>

<!-- ── Sessions ─────────────────────────────────────────── -->
<section class="settings-section">
  <div class="section-header">
    <h2 class="section-title">Aktive Sitzungen</h2>
    {#if data.sessions.filter(s => !s.isCurrent).length > 0}
      <form method="POST" action="?/revokeOtherSessions" use:enhance={() => {
        return async ({ update }) => { await update(); await invalidateAll(); };
      }}>
        <button type="submit" class="btn-revoke-all">Alle anderen abmelden</button>
      </form>
    {/if}
  </div>

  <div class="sessions-list">
    {#each data.sessions as session (session.id)}
      <div class="session-row" class:current={session.isCurrent}>
        <div class="session-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <div class="session-info">
          <div class="session-device">
            {parseBrowser(session.userAgent)}
            {#if parseOS(session.userAgent)}· {parseOS(session.userAgent)}{/if}
            {#if session.isCurrent}
              <span class="current-badge">Aktuelle Sitzung</span>
            {/if}
          </div>
          <div class="session-meta">
            {session.ipAddress} · Angemeldet: {formatDate(session.createdAt)}
          </div>
        </div>
        {#if !session.isCurrent}
          <form method="POST" action="?/revokeSession" use:enhance={() => {
            return async ({ update }) => { await update(); await invalidateAll(); };
          }}>
            <input type="hidden" name="sessionId" value={session.id} />
            <button type="submit" class="btn-revoke" title="Sitzung beenden">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </form>
        {/if}
      </div>
    {/each}
  </div>
</section>

<style>
  .settings-section {
    margin-bottom: 2rem;
    max-width: 560px;
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.85rem;
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.85rem;
  }

  .section-header .section-title {
    margin-bottom: 0;
  }

  /* ── Profile card ───────────────────────────── */
  .profile-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 1.25rem;
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
  }

  .avatar-area {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .avatar-circle {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: var(--bg-hover);
    border: 2px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    overflow: hidden;
    position: relative;
  }

  .avatar-circle img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    position: absolute;
    inset: 0;
  }

  .avatar-hint {
    font-size: 11px;
    color: var(--text-muted);
    text-align: center;
    max-width: 72px;
    line-height: 1.3;
  }

  /* ── Profile form ───────────────────────────── */
  .profile-form {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    min-width: 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .field label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .field input {
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    padding: 0.5rem 0.75rem;
    font-size: 13.5px;
    outline: none;
    transition: border-color 0.12s;
    width: 100%;
  }

  .field input:focus { border-color: var(--accent); }
  .field input::placeholder { color: var(--text-muted); }

  .github-input-wrap {
    display: flex;
    align-items: center;
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    transition: border-color 0.12s;
  }

  .github-input-wrap:focus-within { border-color: var(--accent); }

  .github-prefix {
    font-size: 13px;
    color: var(--text-muted);
    padding: 0.5rem 0 0.5rem 0.75rem;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .github-input-wrap input {
    border: none;
    border-radius: 0;
    padding-left: 0.2rem;
  }

  .github-input-wrap input:focus { border-color: transparent; }

  .field-hint {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  .field-hint a {
    color: var(--accent);
    text-decoration: none;
  }

  .field-hint a:hover { text-decoration: underline; }

  .form-error {
    font-size: 12.5px;
    color: var(--danger);
    background: rgba(218, 54, 51, 0.1);
    border: 1px solid rgba(218, 54, 51, 0.25);
    border-radius: var(--radius);
    padding: 0.45rem 0.7rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
  }

  .btn-save {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    background: var(--accent);
    color: #0d1117;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s;
  }

  .btn-save:hover { background: var(--accent-hover); }

  /* ── Sessions ───────────────────────────────── */
  .btn-revoke-all {
    font-size: 12px;
    color: var(--danger);
    background: none;
    border: 1px solid rgba(218, 54, 51, 0.3);
    border-radius: var(--radius);
    padding: 0.3rem 0.65rem;
    cursor: pointer;
    transition: background 0.12s;
  }

  .btn-revoke-all:hover { background: rgba(218, 54, 51, 0.1); }

  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .session-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.7rem 0.85rem;
  }

  .session-row.current {
    border-color: rgba(63, 185, 80, 0.35);
    background: rgba(63, 185, 80, 0.04);
  }

  .session-icon {
    color: var(--text-muted);
    flex-shrink: 0;
    display: flex;
  }

  .session-info {
    flex: 1;
    min-width: 0;
  }

  .session-device {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .current-badge {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(63, 185, 80, 0.12);
    border: 1px solid rgba(63, 185, 80, 0.3);
    border-radius: 4px;
    padding: 0.1rem 0.4rem;
  }

  .session-meta {
    font-size: 11.5px;
    color: var(--text-muted);
    margin-top: 0.1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-revoke {
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
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }

  .btn-revoke:hover {
    background: rgba(218, 54, 51, 0.12);
    color: var(--danger);
    border-color: rgba(218, 54, 51, 0.25);
  }
</style>
