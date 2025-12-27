window.AAPPUtils = {
  apiUnavailable: false,

  uid() {
    return 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
  },

  todayISO() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  fmtMoney(v) {
    const n = Number(v || 0);
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  },

  escapeHTML(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  shortUrl(u) {
    if (!u) return '-';
    try {
      const url = new URL(u);
      return url.host;
    } catch {
      return u;
    }
  },

  matchQuery(text) {
    const q = (this.q || '').trim().toLowerCase();
    if (!q) return true;
    return String(text || '').toLowerCase().includes(q);
  },

  async copyToClipboard(text) {
    const value = String(text ?? '');
    if (!value) return false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (e) {
        console.warn('No se pudo copiar al portapapeles.', e);
      }
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      textarea.remove();
      return ok;
    } catch (e) {
      console.warn('No se pudo copiar al portapapeles.', e);
      return false;
    }
  },

  safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('No se pudo acceder a localStorage.', e);
      this.storageBlocked = true;
      return null;
    }
  },

  safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('No se pudo escribir en localStorage.', e);
      this.storageBlocked = true;
      return false;
    }
  },

  safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn('No se pudo borrar en localStorage.', e);
      this.storageBlocked = true;
      return false;
    }
  },

  loadLocalBackup() {
    const raw = this.safeStorageGet(window.AAPPConstants.STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Backup local inválido.', e);
      return null;
    }
  },

  saveLocalBackup(payload) {
    const data = JSON.stringify(payload ?? {});
    return this.safeStorageSet(window.AAPPConstants.STORAGE_KEY, data);
  },

  async checkSession() {
    try {
      const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=session`, {
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
      if (res.status === 401) {
        this.isAuthenticated = false;
        this.authUser = null;
        return false;
      }
      const payload = await res.json();
      if (payload.success && payload.user) {
        this.isAuthenticated = true;
        this.authUser = payload.user;
        return true;
      }
    } catch (e) {
      console.warn('No se pudo verificar la sesión.', e);
    }
    this.isAuthenticated = false;
    this.authUser = null;
    return false;
  },

  async login() {
    this.authError = '';
    this.appLoading = true;
    const email = (this.loginForm.email || '').trim();
    const password = (this.loginForm.password || '').trim();
    if (!email || !password) {
      this.authError = 'Completá email y contraseña.';
      this.appLoading = false;
      return;
    }

    try {
      const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=login`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password })
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || 'Email o contraseña incorrectos.');
      }
      this.isAuthenticated = true;
      this.authUser = payload.user;
      this.apiUnavailable = false;
      this.authError = '';
      await this.loadRemoteState();
      this.appLoading = false;
    } catch (e) {
      console.error('Login falló', e);
      this.authError = e.message || 'No se pudo iniciar sesión.';
      this.isAuthenticated = false;
      this.appLoading = false;
    }
  },

  async logout() {
    const lastEmail = this.authUser?.email || this.loginForm.email || 'admin@aapp.uno';
    try {
      await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=logout`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        credentials: 'same-origin'
      });
    } catch (e) {
      console.warn('Error cerrando sesión', e);
    }
    this.isAuthenticated = false;
    this.authUser = null;
    this.authChecking = false;
    this.authError = '';
    this.saving = false;
    this.saveMessage = '';
    this.loginForm = { email: lastEmail, password: '' };
    this.db = this.normalizeDB({});
    this.appLoading = false;
  },

  async submitPasswordChange() {
    this.passwordFeedback = '';
    const current = (this.passwordForm.current || '').trim();
    const next = (this.passwordForm.next || '').trim();
    const confirm = (this.passwordForm.confirm || '').trim();
    if (!current || !next) {
      this.passwordFeedback = 'Completá ambas contraseñas.';
      return;
    }
    if (next !== confirm) {
      this.passwordFeedback = 'Las contraseñas nuevas no coinciden.';
      return;
    }
    if (next.length < 6) {
      this.passwordFeedback = 'Usá al menos 6 caracteres.';
      return;
    }

    try {
      const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=change_password`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ currentPassword: current, newPassword: next })
      });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.message || 'No se pudo actualizar la contraseña.');
      }
      this.passwordFeedback = 'Contraseña actualizada.';
      this.passwordForm = { current: '', next: '', confirm: '' };
      setTimeout(() => {
        this.passwordFeedback = '';
        this.closeModal();
      }, 600);
    } catch (e) {
      console.error('Cambio de contraseña falló', e);
      this.passwordFeedback = e.message || 'No se pudo actualizar la contraseña.';
    }
  },

  async fetchStateFromServer() {
    const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=load`, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    });
    if (res.status === 401) {
      this.isAuthenticated = false;
      this.authUser = null;
      throw new Error('Sesión expirada. Volvé a iniciar sesión.');
    }
    if (!res.ok) throw new Error('No se pudo cargar el estado desde el servidor.');
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.message || 'Respuesta inválida del servidor.');
    if (payload.user) this.authUser = payload.user;
    return payload.data;
  },

  async saveStateToServer(data) {
    const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=save`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(data)
    });
    if (res.status === 401) {
      this.isAuthenticated = false;
      this.authUser = null;
      throw new Error('Sesión expirada. Volvé a iniciar sesión.');
    }
    if (!res.ok) throw new Error('No se pudo guardar en la base de datos.');
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.message || 'No se pudo guardar en la base de datos.');
    return payload;
  },

  async resetStateOnServer() {
    const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=reset`, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    });
    if (res.status === 401) {
      this.isAuthenticated = false;
      this.authUser = null;
      throw new Error('Sesión expirada. Volvé a iniciar sesión.');
    }
    if (!res.ok) throw new Error('No se pudo reiniciar la base de datos.');
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.message || 'Respuesta inválida al reiniciar.');
    return payload.data;
  }
};
