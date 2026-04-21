/**
 * ============================================================
 *  Auth Modal Module
 *  - Shows a glassmorphism login/register popup on page load
 *  - Connects to the Express backend at localhost:3001
 *  - Stores JWT in localStorage; auto-refreshes on expiry
 *  - Emits callbacks: onLogin, onLogout
 * ============================================================
 */

const API = 'http://localhost:3001/api';

// ── State ────────────────────────────────────────────────────
let _accessToken = localStorage.getItem('mc_access_token') || null;
let _currentUser = null;
let _onLoginCb   = () => {};
let _onLogoutCb  = () => {};

// ── Token helpers ─────────────────────────────────────────────
function saveToken(token) {
    _accessToken = token;
    localStorage.setItem('mc_access_token', token);
}
function clearToken() {
    _accessToken = null;
    _currentUser = null;
    localStorage.removeItem('mc_access_token');
}

async function apiFetch(path, options = {}) {
    const res = await fetch(`${API}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
            ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
        },
    });

    // Try to refresh if token expired
    if (res.status === 401) {
        const data = await res.json();
        if (data.code === 'TOKEN_EXPIRED') {
            const refreshed = await tryRefresh();
            if (refreshed) {
                return apiFetch(path, options); // retry once
            }
        }
        throw Object.assign(new Error(data.message || 'Unauthorised'), { status: 401 });
    }

    const json = await res.json();
    if (!json.success) throw new Error(json.message || 'Server error');
    return json;
}

async function tryRefresh() {
    try {
        const data = await fetch(`${API}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
        }).then(r => r.json());
        if (data.success) { saveToken(data.accessToken); return true; }
    } catch (_) {}
    return false;
}

// ── API actions ───────────────────────────────────────────────
async function register(username, email, password) {
    const data = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });
    saveToken(data.accessToken);
    _currentUser = data.user;
    return data.user;
}

async function login(username, password) {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    saveToken(data.accessToken);
    _currentUser = data.user;
    return data.user;
}

async function logout() {
    try {
        await apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) {}
    clearToken();
    _onLogoutCb();
}

async function fetchMe() {
    const data = await apiFetch('/auth/me');
    _currentUser = data.user;
    return data.user;
}

// ── HTML ──────────────────────────────────────────────────────
function buildModal() {
    const el = document.createElement('div');
    el.id = 'auth-overlay';
    el.innerHTML = `
    <div class="auth-backdrop"></div>
    <div class="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">

      <!-- Floating particles decoration -->
      <div class="auth-particles">
        <span></span><span></span><span></span>
        <span></span><span></span><span></span>
      </div>

      <!-- Logo / branding -->
      <div class="auth-brand">
        <div class="auth-icon">🏰</div>
        <h1 class="auth-title" id="auth-title">Math Castle</h1>
        <p class="auth-subtitle">Sign in to defend the realm</p>
      </div>

      <!-- Tab switcher -->
      <div class="auth-tabs" role="tablist">
        <button class="auth-tab active" id="tab-login"  role="tab" aria-selected="true"  aria-controls="panel-login">Login</button>
        <button class="auth-tab"        id="tab-reg"    role="tab" aria-selected="false" aria-controls="panel-reg">Register</button>
      </div>

      <!-- ── LOGIN PANEL ── -->
      <div class="auth-panel active" id="panel-login" role="tabpanel">
        <form id="form-login" novalidate autocomplete="off">
          <div class="auth-field">
            <label for="login-username">⚔️ Username</label>
            <input type="text" id="login-username" placeholder="Enter your username" autocomplete="username" required />
          </div>
          <div class="auth-field">
            <label for="login-password">🔑 Password</label>
            <div class="password-wrap">
              <input type="password" id="login-password" placeholder="Enter your password" autocomplete="current-password" required />
              <button type="button" class="eye-btn" data-target="login-password" title="Toggle password">👁</button>
            </div>
          </div>

          <div class="auth-row">
            <label class="remember-me">
              <input type="checkbox" id="remember-me" />
              <span>Remember me</span>
            </label>
            <button type="button" class="link-btn" id="btn-forgot">Forgot password?</button>
          </div>

          <div class="auth-error" id="login-error"></div>

          <button type="submit" class="auth-submit" id="btn-login">
            <span class="btn-label">Enter the Castle</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>
        </form>
      </div>

      <!-- ── REGISTER PANEL ── -->
      <div class="auth-panel" id="panel-reg" role="tabpanel">
        <form id="form-reg" novalidate autocomplete="off">
          <div class="auth-field">
            <label for="reg-username">⚔️ Username</label>
            <input type="text" id="reg-username" placeholder="3–20 chars (letters, numbers, _)" required />
            <div class="field-hint">3–20 characters · letters, numbers, underscores</div>
          </div>
          <div class="auth-field">
            <label for="reg-email">📧 Email</label>
            <input type="email" id="reg-email" placeholder="you@example.com" required />
          </div>
          <div class="auth-field">
            <label for="reg-password">🔑 Password</label>
            <div class="password-wrap">
              <input type="password" id="reg-password" placeholder="Min 8 chars" required />
              <button type="button" class="eye-btn" data-target="reg-password" title="Toggle password">👁</button>
            </div>
            <div class="password-strength-bar"><div class="strength-fill" id="strength-fill"></div></div>
            <div class="field-hint" id="strength-label">Enter a password</div>
          </div>
          <div class="auth-field">
            <label for="reg-confirm">✅ Confirm Password</label>
            <div class="password-wrap">
              <input type="password" id="reg-confirm" placeholder="Repeat password" required />
              <button type="button" class="eye-btn" data-target="reg-confirm" title="Toggle password">👁</button>
            </div>
          </div>

          <div class="auth-error" id="reg-error"></div>

          <button type="submit" class="auth-submit" id="btn-reg">
            <span class="btn-label">Create Account</span>
            <span class="btn-spinner hidden">⏳</span>
          </button>
        </form>
      </div>

      <!-- ── SUCCESS BANNER (hidden until login) ── -->
      <div class="auth-success hidden" id="auth-success">
        <div class="success-icon">✅</div>
        <p id="success-msg">Welcome back!</p>
      </div>

    </div>
    `;
    document.body.insertBefore(el, document.body.firstChild);
    return el;
}

// ── Strength meter ────────────────────────────────────────────
function passwordStrength(pwd) {
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[@$!%*?&#^]/.test(pwd)) score++;
    return score; // 0-5
}

const STRENGTH_LABELS = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Excellent'];
const STRENGTH_COLORS = ['', '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#27ae60'];

function updateStrength(pwd) {
    const score = passwordStrength(pwd);
    const fill  = document.getElementById('strength-fill');
    const label = document.getElementById('strength-label');
    if (!fill) return;
    fill.style.width = `${(score / 5) * 100}%`;
    fill.style.background = STRENGTH_COLORS[score] || '#ccc';
    label.textContent = STRENGTH_LABELS[score] || 'Enter a password';
    label.style.color = STRENGTH_COLORS[score] || '#aaa';
}

// ── UI helpers ────────────────────────────────────────────────
function setError(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.style.display = msg ? 'block' : 'none';
}

function setLoading(btnId, loading) {
    const btn    = document.getElementById(btnId);
    if (!btn) return;
    const label  = btn.querySelector('.btn-label');
    const spin   = btn.querySelector('.btn-spinner');
    btn.disabled = loading;
    label.classList.toggle('hidden', loading);
    spin.classList.toggle('hidden', !loading);
}

function showSuccess(username) {
    const overlay  = document.getElementById('auth-overlay');
    const panels   = overlay.querySelectorAll('.auth-panel, .auth-tabs, .auth-brand');
    const successEl = document.getElementById('auth-success');
    const msg       = document.getElementById('success-msg');

    panels.forEach(p => p.style.opacity = '0');
    setTimeout(() => {
        panels.forEach(p => p.style.display = 'none');
        msg.textContent = `Welcome, ${username}! 🏰 Entering the castle…`;
        successEl.classList.remove('hidden');
    }, 300);

    setTimeout(() => {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.remove();
            _onLoginCb(_currentUser);
        }, 600);
    }, 1800);
}

// ── Wire up events ────────────────────────────────────────────
function wireEvents(overlay) {
    // Tab switching
    const tabLogin = overlay.querySelector('#tab-login');
    const tabReg   = overlay.querySelector('#tab-reg');
    const panelLogin = overlay.querySelector('#panel-login');
    const panelReg   = overlay.querySelector('#panel-reg');

    function activateTab(tab) {
        [tabLogin, tabReg].forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        [panelLogin, panelReg].forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        const target = overlay.querySelector(`#${tab.getAttribute('aria-controls')}`);
        if (target) target.classList.add('active');
        setError('login-error', '');
        setError('reg-error', '');
    }

    tabLogin.addEventListener('click', () => activateTab(tabLogin));
    tabReg.addEventListener('click',   () => activateTab(tabReg));

    // Eye toggle
    overlay.querySelectorAll('.eye-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = overlay.querySelector(`#${btn.dataset.target}`);
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.textContent = input.type === 'password' ? '👁' : '🙈';
        });
    });

    // Password strength
    const regPwd = overlay.querySelector('#reg-password');
    if (regPwd) regPwd.addEventListener('input', () => updateStrength(regPwd.value));

    // Login submit
    overlay.querySelector('#form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#login-username').value.trim();
        const password = overlay.querySelector('#login-password').value;
        if (!username || !password) return setError('login-error', 'Please fill in all fields.');

        setLoading('btn-login', true);
        setError('login-error', '');
        try {
            const user = await login(username, password);
            showSuccess(user.username);
        } catch (err) {
            setError('login-error', err.message);
        } finally {
            setLoading('btn-login', false);
        }
    });

    // Register submit
    overlay.querySelector('#form-reg').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = overlay.querySelector('#reg-username').value.trim();
        const email    = overlay.querySelector('#reg-email').value.trim();
        const password = overlay.querySelector('#reg-password').value;
        const confirm  = overlay.querySelector('#reg-confirm').value;

        if (!username || !email || !password || !confirm)
            return setError('reg-error', 'Please fill in all fields.');
        if (password !== confirm)
            return setError('reg-error', 'Passwords do not match.');

        setLoading('btn-reg', true);
        setError('reg-error', '');
        try {
            const user = await register(username, email, password);
            showSuccess(user.username);
        } catch (err) {
            setError('reg-error', err.message);
        } finally {
            setLoading('btn-reg', false);
        }
    });

    // Forgot password placeholder
    overlay.querySelector('#btn-forgot')?.addEventListener('click', () => {
        setError('login-error', '💡 Contact your castle admin to reset your password.');
    });
}

// ── Public API ────────────────────────────────────────────────
async function init({ onLogin, onLogout }) {
    _onLoginCb  = onLogin  || (() => {});
    _onLogoutCb = onLogout || (() => {});

    // If we have a saved token, try to validate it silently
    if (_accessToken) {
        try {
            const user = await fetchMe();
            _onLoginCb(user);
            return; // skip modal – already authenticated
        } catch (_) {
            clearToken();
        }
    }

    // Show modal
    const overlay = buildModal();
    wireEvents(overlay);
}

function getUser()  { return _currentUser; }
function getToken() { return _accessToken; }

export default { init, logout, getUser, getToken };
