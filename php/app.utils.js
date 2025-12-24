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

  async fetchStateFromServer() {
    const res = await fetch(`${window.AAPPConstants.API_ENDPOINT}?action=load`, {
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    });
    if (!res.ok) throw new Error('No se pudo cargar el estado desde el servidor.');
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.message || 'Respuesta inválida del servidor.');
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
    if (!res.ok) throw new Error('No se pudo reiniciar la base de datos.');
    const payload = await res.json();
    if (!payload.success) throw new Error(payload.message || 'Respuesta inválida al reiniciar.');
    return payload.data;
  }
};
