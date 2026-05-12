window.AAPPApi = (() => {
  const BASE = '/api';
  const TOKEN_KEY = 'aapp_token';
  const getToken = () => localStorage.getItem(TOKEN_KEY) || '';
  const setToken = (token) => token ? localStorage.setItem(TOKEN_KEY, token) : localStorage.removeItem(TOKEN_KEY);
  async function request(path, options = {}) {
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...options, headers });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.success) {
      const err = new Error(payload?.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return payload.data;
  }
  return { getToken, setToken, request,
    login: (email, password) => request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
    logout: () => request('/auth/logout', { method: 'POST' }),
    users: () => request('/users'), roles: () => request('/roles'), companies: () => request('/saas'), plans: () => request('/plans'), subscriptions: () => request('/subscriptions'), clients: () => request('/clients'),
    state: () => request('/state'), saveState: (body) => request('/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  };
})();
