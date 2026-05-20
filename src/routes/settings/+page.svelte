<script>
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";

  let { data, form } = $props();

  // ── Tabs ─────────────────────────────────────────────────
  let activeTab = $state("profile");

  // ── Profile ──────────────────────────────────────────────
  let name = $state(data.user?.name ?? "");
  let profileSuccess = $state(false);
  let profileError = $state("");

  // ── Security ─────────────────────────────────────────────
  let securityLoading = $state(false);
  let pwFormVisible = $state(false);

  let pwError = $derived(form?.pwError ?? "");
  let pwSuccess = $derived(form?.pwSuccess ?? false);

  // ── Sessions ─────────────────────────────────────────────
  function parseBrowser(ua) {
    if (!ua) return { name: "Unbekannt", color: "#6e7681" };
    if (ua.includes("Edg")) return { name: "Edge", color: "#0078d4" };
    if (ua.includes("Chrome")) return { name: "Chrome", color: "#4285f4" };
    if (ua.includes("Firefox")) return { name: "Firefox", color: "#ff7139" };
    if (ua.includes("Safari")) return { name: "Safari", color: "#1c9aff" };
    return { name: "Browser", color: "#6e7681" };
  }

  function parseOS(ua) {
    if (!ua) return null;
    if (ua.includes("Windows")) return "Windows";
    if (ua.includes("Mac OS")) return "macOS";
    if (ua.includes("Linux")) return "Linux";
    if (ua.includes("Android")) return "Android";
    if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
    return null;
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
<h1 class="page-title">Profil</h1>

<!-- ── Tab bar ──────────────────────────────────────────── -->
<div class="tab-bar">
  {#each [["profile","Profil"],["security","Sicherheit"],["sessions","Sitzungen"]] as [id, label]}
    <button
      class="tab"
      class:active={activeTab === id}
      onclick={() => activeTab = id}
    >{label}</button>
  {/each}
</div>

<!-- ── Profile tab ──────────────────────────────────────── -->
{#if activeTab === "profile"}
  <div class="tab-content">
    <div class="section-card">
      <div class="card-header">
        <h2>Profil bearbeiten</h2>
        <p>Passe deinen Namen und dein Profilbild an.</p>
      </div>

      <form
        method="POST"
        action="?/updateProfile"
        class="profile-form"
        use:enhance={() => {
          return async ({ result, update }) => {
            if (result.type === "failure") {
              profileError = result.data?.error ?? "Fehler beim Speichern.";
            } else {
              profileError = "";
              profileSuccess = true;
              setTimeout(() => (profileSuccess = false), 2500);
              await invalidateAll();
            }
            await update({ reset: false });
          };
        }}
      >
        <div class="field">
          <label for="name">Name</label>
          <input id="name" name="name" type="text" bind:value={name} required placeholder="Dein Name" />
        </div>

        {#if profileError}
          <p class="msg error">{profileError}</p>
        {/if}

        <div class="form-footer">
          <button type="submit" class="btn-primary">
            {#if profileSuccess}✓ Gespeichert{:else}Speichern{/if}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- ── Security tab ─────────────────────────────────────── -->
{#if activeTab === "security"}
  <div class="tab-content">
    <div class="section-card">
      <div class="card-header">
        <h2>Passwort ändern</h2>
        <p>Aktualisiere dein Passwort für diesen Account.</p>
      </div>

      <div class="pw-icon-row">
        <div class="pw-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <div>
          <div class="pw-title">Passwort</div>
          <div class="pw-sub">Sichere deinen Account mit einem starken Passwort.</div>
        </div>
        <button
          class="btn-outline"
          type="button"
          onclick={() => pwFormVisible = !pwFormVisible}
        >
          Passwort ändern
        </button>
      </div>

      {#if pwSuccess}
        <p class="msg success" style="margin: 0 1.25rem 1rem;">✓ Passwort erfolgreich geändert.</p>
      {/if}

      {#if pwFormVisible || pwError}
        <form
          method="POST"
          action="?/changePassword"
          class="pw-form"
          use:enhance={() => {
            securityLoading = true;
            return async ({ result, update }) => {
              securityLoading = false;
              if (result.type === "success") {
                pwFormVisible = false;
              }
              await update({ reset: result.type === "success" });
            };
          }}
        >
          <div class="field">
            <label for="currentPw">Aktuelles Passwort</label>
            <input id="currentPw" name="currentPassword" type="password" required placeholder="••••••••" autocomplete="current-password" />
          </div>
          <div class="field">
            <label for="newPw">Neues Passwort</label>
            <input id="newPw" name="newPassword" type="password" required minlength="8" placeholder="Min. 8 Zeichen" autocomplete="new-password" />
          </div>
          <div class="field">
            <label for="confirmPw">Passwort bestätigen</label>
            <input id="confirmPw" name="confirmPassword" type="password" required placeholder="••••••••" autocomplete="new-password" />
          </div>

          {#if pwError}
            <p class="msg error">{pwError}</p>
          {/if}

          <div class="form-footer" style="gap: 0.5rem;">
            <button type="button" class="btn-outline" onclick={() => { pwFormVisible = false; }}>
              Abbrechen
            </button>
            <button type="submit" class="btn-primary" disabled={securityLoading}>
              {securityLoading ? "Wird geändert…" : "Passwort speichern"}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
{/if}

<!-- ── Sessions tab ─────────────────────────────────────── -->
{#if activeTab === "sessions"}
  <div class="tab-content">
    <div class="section-card">
      <div class="sessions-top">
        <div>
          <h2>Aktive Sitzungen</h2>
          <p>Verwalte deine Sitzungen auf allen Geräten. Du kannst jede Sitzung beenden, um eine Neu-Anmeldung zu erzwingen.</p>
        </div>
        {#if data.sessions.filter(s => !s.isCurrent).length > 0}
          <form method="POST" action="?/revokeOtherSessions" use:enhance={() => {
            return async ({ update }) => { await update(); await invalidateAll(); };
          }}>
            <button type="submit" class="btn-danger-outline">Alle anderen abmelden</button>
          </form>
        {/if}
      </div>

      <div class="sessions-list">
        {#each data.sessions as s (s.id)}
          {@const browser = parseBrowser(s.userAgent)}
          {@const os = parseOS(s.userAgent)}
          <div class="session-card" class:current={s.isCurrent}>
            <div class="session-browser-icon" style:background={browser.color + "22"} style:color={browser.color}>
              {browser.name[0]}
            </div>
            <div class="session-info">
              <div class="session-title">
                {browser.name}{os ? ` on ${os}` : ""}
                {#if s.isCurrent}
                  <span class="badge-current">Current</span>
                {/if}
              </div>
              <div class="session-meta">
                <span class="meta-item">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  {s.ipAddress ?? "Unbekannte IP"}
                </span>
                <span class="meta-sep">·</span>
                <span>Erstellt: {formatDate(s.createdAt)}</span>
                {#if s.updatedAt && s.updatedAt !== s.createdAt}
                  <span class="meta-sep">·</span>
                  <span>Zuletzt aktiv: {formatDate(s.updatedAt)}</span>
                {/if}
              </div>
            </div>

            {#if !s.isCurrent}
              <form method="POST" action="?/revokeSession" use:enhance={() => {
                return async ({ update }) => { await update(); await invalidateAll(); };
              }}>
                <input type="hidden" name="token" value={s.token} />
                <button type="submit" class="btn-revoke" title="Sitzung beenden">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </form>
            {/if}
          </div>
        {:else}
          <p class="empty-hint">Keine aktiven Sitzungen gefunden.</p>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  /* ── Tab bar ────────────────────────────────── */
  .tab-bar {
    display: flex;
    gap: 0.2rem;
    margin-bottom: 1.5rem;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.25rem;
    width: fit-content;
  }

  .tab {
    padding: 0.4rem 0.9rem;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    background: none;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }

  .tab:hover { color: var(--text-primary); background: var(--bg-hover); }

  .tab.active {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  /* ── Content + cards ────────────────────────── */
  .tab-content { max-width: 600px; }

  .section-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  .card-header {
    padding: 1.1rem 1.25rem 0;
  }

  .card-header h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.2rem;
  }

  .card-header p {
    font-size: 12.5px;
    color: var(--text-muted);
    margin-bottom: 1rem;
  }

  /* ── Form fields ────────────────────────────── */
  .profile-form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 0 1.25rem 1.25rem;
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

  /* ── Security ───────────────────────────────── */
  .pw-icon-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0 1.25rem 1.1rem;
  }

  .pw-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    background: rgba(255, 200, 50, 0.12);
    color: #e6b800;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .pw-title {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .pw-sub {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  .pw-icon-row > div:nth-child(2) { flex: 1; }

  .pw-form {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 1rem 1.25rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  /* ── Messages ───────────────────────────────── */
  .msg {
    font-size: 12.5px;
    padding: 0.45rem 0.75rem;
    border-radius: var(--radius);
  }

  .msg.error {
    color: var(--danger);
    background: rgba(218, 54, 51, 0.1);
    border: 1px solid rgba(218, 54, 51, 0.25);
  }

  .msg.success {
    color: var(--accent);
    background: rgba(63, 185, 80, 0.1);
    border: 1px solid rgba(63, 185, 80, 0.25);
  }

  /* ── Buttons ────────────────────────────────── */
  .form-footer { display: flex; justify-content: flex-end; gap: 0.5rem; }

  .btn-primary {
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

  .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

  .btn-outline {
    padding: 0.4rem 0.85rem;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-secondary);
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s, color 0.12s;
  }

  .btn-outline:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* ── Sessions ───────────────────────────────── */
  .sessions-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.1rem 1.25rem 0;
    margin-bottom: 1rem;
  }

  .sessions-top h2 {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.2rem;
  }

  .sessions-top p {
    font-size: 12.5px;
    color: var(--text-muted);
    max-width: 360px;
  }

  .btn-danger-outline {
    padding: 0.4rem 0.85rem;
    font-size: 12.5px;
    font-weight: 500;
    color: var(--danger);
    background: none;
    border: 1px solid rgba(218, 54, 51, 0.35);
    border-radius: var(--radius);
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.12s;
  }

  .btn-danger-outline:hover { background: rgba(218, 54, 51, 0.1); }

  .sessions-list {
    display: flex;
    flex-direction: column;
    padding: 0 1.25rem 1.25rem;
    gap: 0.5rem;
  }

  .session-card {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.75rem 0.85rem;
  }

  .session-card.current {
    border-color: rgba(63, 185, 80, 0.3);
    background: rgba(63, 185, 80, 0.04);
  }

  .session-browser-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .session-info { flex: 1; min-width: 0; }

  .session-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.2rem;
  }

  .badge-current {
    font-size: 10.5px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(63, 185, 80, 0.12);
    border: 1px solid rgba(63, 185, 80, 0.3);
    border-radius: 4px;
    padding: 0.1rem 0.4rem;
  }

  .session-meta {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 11.5px;
    color: var(--text-muted);
    flex-wrap: wrap;
  }

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .meta-sep { opacity: 0.4; }

  .btn-revoke {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
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

  .empty-hint {
    font-size: 13px;
    color: var(--text-muted);
    padding: 0.5rem 0;
  }
</style>
