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

  async checkSession() {
    this.isAuthenticated = true;
    this.authUser = { email: 'node@local', role: 'admin' };
    return true;
  },

  async login() {
    this.authError = '';
    this.isAuthenticated = true;
    this.authUser = { email: (this.loginForm.email || 'node@local').trim(), role: 'admin' };
    await this.loadRemoteState();
  },

  async logout() {
    this.isAuthenticated = false;
    this.authUser = null;
  },

  async submitPasswordChange() {
    this.passwordFeedback = 'La API Node actual no implementa cambio de contraseña.';
  },

  async fetchStateFromServer() {
    const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}/state`, {
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
    const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}/state`, {
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
    const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}/state/reset`, {
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
