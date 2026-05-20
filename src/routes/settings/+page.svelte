<script>
  import { enhance } from "$app/forms";
  import { invalidateAll } from "$app/navigation";
  import { authClient } from "$lib/auth-client.js";
  import QRCode from "qrcode";

  let { data, form } = $props();

  // ── Tabs ─────────────────────────────────────────────────
  let activeTab = $state("profile");

  // ── Profile ──────────────────────────────────────────────
  let name = $state(data.user?.name ?? "");
  let profileSuccess = $state(false);
  let profileError = $state("");

  // ── Security / Password ───────────────────────────────────
  let securityLoading = $state(false);
  let pwFormVisible = $state(false);

  let pwError = $derived(form?.pwError ?? "");
  let pwSuccess = $derived(form?.pwSuccess ?? false);

  // ── 2FA Setup Wizard ─────────────────────────────────────
  // step: "idle" | "password" | "qr" | "verify" | "backup" | "done"
  let tfaStep = $state("idle");
  let tfaPassword = $state("");
  let tfaPasswordError = $state("");
  let tfaPasswordLoading = $state(false);
  let tfaTotpUri = $state("");
  let tfaBackupCodes = $state([]);
  let tfaQrDataUrl = $state("");
  let tfaManualSecret = $state("");
  let tfaShowManual = $state(false);
  let tfaVerifyCode = $state("");
  let tfaVerifyError = $state("");
  let tfaVerifyLoading = $state(false);

  // ── 2FA Disable ──────────────────────────────────────────
  let tfaDisableVisible = $state(false);
  let tfaDisablePassword = $state("");
  let tfaDisableError = $state("");
  let tfaDisableLoading = $state(false);

  // Extract secret from otpauth URI for manual entry
  function extractSecret(uri) {
    try {
      const url = new URL(uri);
      return url.searchParams.get("secret") ?? "";
    } catch {
      return "";
    }
  }

  // Step 1: password submitted → call enable, get TOTP URI + backup codes
  async function startTfaSetup() {
    tfaPasswordError = "";
    if (!tfaPassword) {
      tfaPasswordError = "Bitte gib dein Passwort ein.";
      return;
    }
    tfaPasswordLoading = true;

    const { data: d, error } = await authClient.twoFactor.enable({ password: tfaPassword });

    tfaPasswordLoading = false;

    if (error) {
      tfaPasswordError = error.message ?? "Fehler beim Aktivieren.";
      return;
    }

    tfaTotpUri = d.totpURI;
    tfaBackupCodes = d.backupCodes ?? [];
    tfaManualSecret = extractSecret(d.totpURI);

    try {
      tfaQrDataUrl = await QRCode.toDataURL(d.totpURI, { width: 200, margin: 2 });
    } catch {
      tfaQrDataUrl = "";
    }

    tfaStep = "qr";
  }

  // Step 2: verify TOTP code
  async function verifyTfaCode() {
    tfaVerifyError = "";
    if (tfaVerifyCode.length !== 6) {
      tfaVerifyError = "Bitte gib einen 6-stelligen Code ein.";
      return;
    }
    tfaVerifyLoading = true;

    const { error } = await authClient.twoFactor.verifyTotp({ code: tfaVerifyCode });

    tfaVerifyLoading = false;

    if (error) {
      tfaVerifyError = error.message ?? "Ungültiger Code. Versuche es erneut.";
      return;
    }

    tfaStep = "backup";
    await invalidateAll();
  }

  // Disable 2FA
  async function disableTfa() {
    tfaDisableError = "";
    if (!tfaDisablePassword) {
      tfaDisableError = "Bitte gib dein Passwort ein.";
      return;
    }
    tfaDisableLoading = true;

    const { error } = await authClient.twoFactor.disable({ password: tfaDisablePassword });

    tfaDisableLoading = false;

    if (error) {
      tfaDisableError = error.message ?? "Fehler beim Deaktivieren.";
      return;
    }

    tfaDisableVisible = false;
    tfaDisablePassword = "";
    await invalidateAll();
  }

  function resetTfaWizard() {
    tfaStep = "idle";
    tfaPassword = "";
    tfaPasswordError = "";
    tfaTotpUri = "";
    tfaBackupCodes = [];
    tfaQrDataUrl = "";
    tfaManualSecret = "";
    tfaShowManual = false;
    tfaVerifyCode = "";
    tfaVerifyError = "";
  }

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
        <p>Passe deinen Namen an.</p>
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

    <!-- Password section -->
    <div class="section-card" style="margin-bottom: 1rem;">
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

    <!-- 2FA section -->
    <div class="section-card">
      <div class="card-header">
        <h2>Zwei-Faktor-Authentifizierung</h2>
        <p>Schütze deinen Account mit einem zusätzlichen Sicherheitsschritt beim Anmelden.</p>
      </div>

      {#if !data.twoFactorEnabled || tfaStep === "backup"}

        <!-- 2FA not enabled OR just finished setup -->
        {#if tfaStep === "idle"}
          <div class="tfa-status-row">
            <div class="tfa-icon tfa-icon--off">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div class="tfa-label">2FA deaktiviert</div>
              <div class="tfa-sublabel">Dein Account ist nur durch ein Passwort geschützt.</div>
            </div>
            <button class="btn-primary" onclick={() => tfaStep = "password"}>
              2FA aktivieren
            </button>
          </div>
        {/if}

        <!-- Step: enter password -->
        {#if tfaStep === "password"}
          <div class="tfa-wizard">
            <div class="wizard-step-header">
              <div class="wizard-step-num">Schritt 1 von 3</div>
              <div class="wizard-step-title">Passwort bestätigen</div>
              <p class="wizard-step-sub">Bitte gib dein Passwort ein, um fortzufahren.</p>
            </div>
            <div class="field">
              <label for="tfa-pw">Passwort</label>
              <input
                id="tfa-pw"
                type="password"
                bind:value={tfaPassword}
                placeholder="••••••••"
                autocomplete="current-password"
                onkeydown={(e) => e.key === "Enter" && startTfaSetup()}
              />
            </div>
            {#if tfaPasswordError}
              <p class="msg error">{tfaPasswordError}</p>
            {/if}
            <div class="form-footer" style="gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn-outline" onclick={resetTfaWizard}>Abbrechen</button>
              <button class="btn-primary" onclick={startTfaSetup} disabled={tfaPasswordLoading}>
                {tfaPasswordLoading ? "Bitte warten…" : "Weiter"}
              </button>
            </div>
          </div>
        {/if}

        <!-- Step: QR code + manual -->
        {#if tfaStep === "qr"}
          <div class="tfa-wizard">
            <div class="wizard-step-header">
              <div class="wizard-step-num">Schritt 2 von 3</div>
              <div class="wizard-step-title">Authenticator-App einrichten</div>
              <p class="wizard-step-sub">Scanne den QR-Code mit einer Authenticator-App (z. B. Google Authenticator, Authy).</p>
            </div>

            {#if tfaQrDataUrl}
              <div class="qr-wrapper">
                <img src={tfaQrDataUrl} alt="2FA QR Code" class="qr-img" />
              </div>
            {:else}
              <p class="msg error">QR-Code konnte nicht generiert werden.</p>
            {/if}

            <button
              class="btn-link"
              type="button"
              onclick={() => tfaShowManual = !tfaShowManual}
            >
              {tfaShowManual ? "QR-Code anzeigen" : "Code manuell eingeben"}
            </button>

            {#if tfaShowManual}
              <div class="manual-secret-box">
                <div class="manual-secret-label">Manueller Schlüssel</div>
                <div class="manual-secret">{tfaManualSecret}</div>
              </div>
            {/if}

            <div class="form-footer" style="gap: 0.5rem; margin-top: 1rem;">
              <button class="btn-outline" onclick={resetTfaWizard}>Abbrechen</button>
              <button class="btn-primary" onclick={() => tfaStep = "verify"}>Weiter</button>
            </div>
          </div>
        {/if}

        <!-- Step: verify code -->
        {#if tfaStep === "verify"}
          <div class="tfa-wizard">
            <div class="wizard-step-header">
              <div class="wizard-step-num">Schritt 3 von 3</div>
              <div class="wizard-step-title">Code bestätigen</div>
              <p class="wizard-step-sub">Gib den 6-stelligen Code aus deiner Authenticator-App ein.</p>
            </div>
            <div class="field">
              <label for="tfa-code">Authenticator-Code</label>
              <input
                id="tfa-code"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                maxlength="6"
                bind:value={tfaVerifyCode}
                placeholder="000000"
                autocomplete="one-time-code"
                onkeydown={(e) => e.key === "Enter" && verifyTfaCode()}
              />
            </div>
            {#if tfaVerifyError}
              <p class="msg error">{tfaVerifyError}</p>
            {/if}
            <div class="form-footer" style="gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn-outline" onclick={() => tfaStep = "qr"}>Zurück</button>
              <button class="btn-primary" onclick={verifyTfaCode} disabled={tfaVerifyLoading}>
                {tfaVerifyLoading ? "Wird geprüft…" : "Bestätigen"}
              </button>
            </div>
          </div>
        {/if}

        <!-- Step: backup codes -->
        {#if tfaStep === "backup"}
          <div class="tfa-wizard">
            <div class="wizard-success-badge">✓ 2FA erfolgreich aktiviert</div>
            <div class="wizard-step-header" style="margin-top: 1rem;">
              <div class="wizard-step-title">Backup-Codes</div>
              <p class="wizard-step-sub">Speichere diese Backup-Codes an einem sicheren Ort. Jeder Code kann einmalig verwendet werden, falls du keinen Zugriff auf deine Authenticator-App hast.</p>
            </div>
            <div class="backup-codes-grid">
              {#each tfaBackupCodes as code}
                <div class="backup-code">{code}</div>
              {/each}
            </div>
            <div class="form-footer" style="margin-top: 1rem;">
              <button class="btn-primary" onclick={resetTfaWizard}>Fertig</button>
            </div>
          </div>
        {/if}

      {:else}

        <!-- 2FA enabled -->
        <div class="tfa-status-row">
          <div class="tfa-icon tfa-icon--on">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <div>
            <div class="tfa-label">2FA aktiv</div>
            <div class="tfa-sublabel">Dein Account ist durch Zwei-Faktor-Authentifizierung geschützt.</div>
          </div>
          <button class="btn-danger-outline" onclick={() => tfaDisableVisible = !tfaDisableVisible}>
            Deaktivieren
          </button>
        </div>

        {#if tfaDisableVisible}
          <div class="tfa-disable-form">
            <div class="field">
              <label for="tfa-disable-pw">Passwort zur Bestätigung</label>
              <input
                id="tfa-disable-pw"
                type="password"
                bind:value={tfaDisablePassword}
                placeholder="••••••••"
                autocomplete="current-password"
                onkeydown={(e) => e.key === "Enter" && disableTfa()}
              />
            </div>
            {#if tfaDisableError}
              <p class="msg error">{tfaDisableError}</p>
            {/if}
            <div class="form-footer" style="gap: 0.5rem; margin-top: 0.5rem;">
              <button class="btn-outline" onclick={() => { tfaDisableVisible = false; tfaDisablePassword = ""; tfaDisableError = ""; }}>
                Abbrechen
              </button>
              <button class="btn-danger" onclick={disableTfa} disabled={tfaDisableLoading}>
                {tfaDisableLoading ? "Wird deaktiviert…" : "2FA deaktivieren"}
              </button>
            </div>
          </div>
        {/if}

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

  /* ── Security / Password ────────────────────── */
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

  /* ── 2FA ─────────────────────────────────────── */
  .tfa-status-row {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    padding: 0 1.25rem 1.1rem;
  }

  .tfa-icon {
    width: 38px;
    height: 38px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .tfa-icon--off {
    background: rgba(110, 118, 129, 0.12);
    color: #6e7681;
  }

  .tfa-icon--on {
    background: rgba(63, 185, 80, 0.12);
    color: var(--accent);
  }

  .tfa-label {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .tfa-sublabel {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  .tfa-status-row > div:nth-child(2) { flex: 1; }

  .tfa-wizard {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding: 1rem 1.25rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  .wizard-step-header { margin-bottom: 0.25rem; }

  .wizard-step-num {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--accent);
    margin-bottom: 0.25rem;
  }

  .wizard-step-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.2rem;
  }

  .wizard-step-sub {
    font-size: 12.5px;
    color: var(--text-muted);
  }

  .wizard-success-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    background: rgba(63, 185, 80, 0.1);
    border: 1px solid rgba(63, 185, 80, 0.25);
    border-radius: var(--radius);
    padding: 0.45rem 0.75rem;
    align-self: flex-start;
  }

  .qr-wrapper {
    display: flex;
    justify-content: center;
    padding: 0.75rem;
    background: #fff;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    width: fit-content;
  }

  .qr-img {
    display: block;
    width: 180px;
    height: 180px;
  }

  .btn-link {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 12.5px;
    cursor: pointer;
    padding: 0;
    text-align: left;
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  .manual-secret-box {
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
  }

  .manual-secret-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 0.35rem;
  }

  .manual-secret {
    font-family: monospace;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: 0.08em;
    word-break: break-all;
  }

  .backup-codes-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.4rem;
  }

  .backup-code {
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 0.5rem 0.75rem;
    font-family: monospace;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: center;
    letter-spacing: 0.05em;
  }

  .tfa-disable-form {
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

  .btn-danger {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--danger);
    color: #fff;
    border: none;
    border-radius: var(--radius);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.12s;
  }

  .btn-danger:hover:not(:disabled) { opacity: 0.85; }
  .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

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
