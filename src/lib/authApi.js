// lib/authApi.js
const API_BASE_URL = "http://localhost:8080";

const getCallbackUrl = (nextPath) => {
  const base = `${window.location.origin}/auth/callback`;
  if (!nextPath) return base;
  const u = new URL(base);
  u.searchParams.set("next", nextPath);
  return u.toString();
};

export const authApi = {
  // ---------- Email code flow (if you use it) ----------
  async requestCode(email) {
    const resp = await fetch(`${API_BASE_URL}/auth/request-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      credentials: "include",
    });
    if (!resp.ok) throw new Error(`Failed to request code (${resp.status})`);
    return resp.json();
  },

  async verifyCode(email, code) {
    const resp = await fetch(`${API_BASE_URL}/auth/verify-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
      credentials: "include",
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => "");
      throw new Error(t || `Verification failed (${resp.status})`);
    }
    return resp.json(); // you can ignore token if server now also sets cookie
  },

  // ---------- OAuth (Google / GitHub) ----------
  startOAuth(provider, nextPath = "/chat") {
    const cb = getCallbackUrl(nextPath);
    const url = `${API_BASE_URL}/auth/${provider}/login?redirect_url=${encodeURIComponent(
      cb
    )}`;
    // Full-page navigation so the cookie from the API is set properly
    window.location.href = url;
  },

  // New: ask server whether the cookie-auth session is active
  async fetchSession() {
    const resp = await fetch(`${API_BASE_URL}/auth/session/me`, {
      method: "GET",
      credentials: "include",
      headers: { 'Accept': 'application/json' },
    });
    if (!resp.ok) throw new Error(`Session check failed (${resp.status})`);
    return resp.json(); // { authenticated: boolean, email?: string }
  },

  // Keep parser only for `next`/`error` (no token expected anymore)
  parseOAuthCallback() {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash.replace(/^#/, "")
    );
    const pick = (k) => searchParams.get(k) || hashParams.get(k);

    const error = pick("error") || "";
    const next = searchParams.get("next") || "/chat";
    return { error, next };
  },

  // Optional: persist non-sensitive bits locally (email/UI convenience)
  persistSession({ token, email }) {
    localStorage.setItem('auth_token', token);       // <-- match Shell
    localStorage.setItem('auth_email', email || '');
    // IMPORTANT: 'storage' doesn't fire in the same tab; emit your custom event
    window.dispatchEvent(new Event('authUpdated'));
  },
  clearSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    window.dispatchEvent(new Event('authUpdated'));
  },
  getSession() {
    const token = localStorage.getItem('auth_token');
    const email = localStorage.getItem('auth_email');
    return token ? { token, email } : null;
  },

  async logout() {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors; still clear local cache below
    }
    localStorage.removeItem("auth_token"); // legacy
    localStorage.removeItem("user_email");
    window.dispatchEvent(new CustomEvent("authUpdated"));
  },
};

export { API_BASE_URL };
