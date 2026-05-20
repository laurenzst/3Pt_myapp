<script>
  import { authClient } from "$lib/auth-client.js";
  import { goto } from "$app/navigation";

  let email = $state("");
  let password = $state("");
  let error = $state("");
  let loading = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    loading = true;
    error = "";

    const { error: err } = await authClient.signIn.email({ email, password });

    if (err) {
      error = err.message ?? "Anmeldung fehlgeschlagen.";
      loading = false;
    } else {
      goto("/");
    }
  }
</script>

<div class="auth-page">
  <div class="auth-card">
    <div class="auth-logo">
      <div class="logo-icon">S</div>
      <span class="app-name">StudyFlow</span>
    </div>

    <h1 class="auth-title">Anmelden</h1>
    <p class="auth-sub">Melde dich mit deinem Account an.</p>

    <form onsubmit={handleSubmit} class="auth-form">
      <div class="field">
        <label for="email">E-Mail</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="name@example.com"
          required
          autocomplete="email"
        />
      </div>

      <div class="field">
        <label for="password">Passwort</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          placeholder="••••••••"
          required
          autocomplete="current-password"
        />
      </div>

      {#if error}
        <p class="error">{error}</p>
      {/if}

      <button type="submit" class="btn-submit" disabled={loading}>
        {loading ? "Wird angemeldet…" : "Anmelden"}
      </button>
    </form>

    <p class="auth-footer">
      Noch kein Account? <a href="/register">Registrieren</a>
    </p>
  </div>
</div>

<style>
  .auth-page {
    min-height: 100vh;
    background: var(--bg-main);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .auth-card {
    width: 100%;
    max-width: 380px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 2rem;
  }

  .auth-logo {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 1.75rem;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
    background: var(--accent);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 13px;
    color: #0d1117;
    flex-shrink: 0;
  }

  .app-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--text-primary);
  }

  .auth-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.25rem;
  }

  .auth-sub {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 1.5rem;
  }

  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field label {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-secondary);
  }

  .field input {
    background: var(--bg-main);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text-primary);
    padding: 0.55rem 0.75rem;
    font-size: 13.5px;
    outline: none;
    transition: border-color 0.12s;
    width: 100%;
  }

  .field input:focus {
    border-color: var(--accent);
  }

  .field input::placeholder {
    color: var(--text-muted);
  }

  .error {
    font-size: 12.5px;
    color: var(--danger);
    background: rgba(218, 54, 51, 0.1);
    border: 1px solid rgba(218, 54, 51, 0.25);
    border-radius: var(--radius);
    padding: 0.5rem 0.75rem;
  }

  .btn-submit {
    width: 100%;
    padding: 0.6rem;
    background: var(--accent);
    color: #0d1117;
    border: none;
    border-radius: var(--radius);
    font-size: 13.5px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.12s;
    margin-top: 0.25rem;
  }

  .btn-submit:hover:not(:disabled) {
    background: var(--accent-hover);
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auth-footer {
    margin-top: 1.25rem;
    text-align: center;
    font-size: 13px;
    color: var(--text-muted);
  }

  .auth-footer a {
    color: var(--accent);
    text-decoration: none;
  }

  .auth-footer a:hover {
    text-decoration: underline;
  }
</style>
