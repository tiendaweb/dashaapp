window.AAPPUtils = {
  storageBlocked: false,

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
  }
};
