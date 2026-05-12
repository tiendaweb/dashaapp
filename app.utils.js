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



  confirmDelete(message) {
    return window.confirm(message || '¿Confirmás la eliminación?');
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
    const token = window.AAPPApi?.getToken?.();
    if (!token) { this.isAuthenticated = false; this.authUser = null; return false; }
    try {
      const users = await window.AAPPApi.users();
      this.isAuthenticated = true;
      this.authUser = users?.[0] || { email: 'session@local' };
      return true;
    } catch (_e) {
      window.AAPPApi.setToken('');
      this.isAuthenticated = false;
      this.authUser = null;
      return false;
    }
  },

  async login() {
    this.authError = '';
    try {
      const auth = await window.AAPPApi.login((this.loginForm.email||'').trim(), this.loginForm.password||'');
      window.AAPPApi.setToken(auth.token);
      this.isAuthenticated = true;
      this.authUser = auth.user;
      await this.loadRemoteState();
    } catch (e) {
      this.authError = e.message || 'No se pudo iniciar sesión';
      this.isAuthenticated = false;
    }
  },

  async logout() {
    try { await window.AAPPApi.logout(); } catch (_e) {}
    window.AAPPApi.setToken('');
    this.isAuthenticated = false;
    this.authUser = null;
  },

  async submitPasswordChange() {
    this.passwordFeedback = 'La API Node actual no implementa cambio de contraseña.';
  },

  async fetchStateFromServer() {
    return await window.AAPPApi.state();
  },

  async saveStateToServer(data) {
    return await window.AAPPApi.saveState(data);
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
