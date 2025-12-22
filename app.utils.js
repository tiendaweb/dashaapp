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
