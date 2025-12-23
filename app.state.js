window.AAPPState = () => ({
  isDark: true,
  activeTab: 'dashboard',
  q: '',
  importText: '',

  tabs: [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
    { key: 'saas', label: 'Empresas', icon: 'fa-building' },
    { key: 'plans', label: 'Planes', icon: 'fa-tags' },
    { key: 'campaigns', label: 'Campañas', icon: 'fa-bullhorn' },
    { key: 'clients', label: 'Clientes', icon: 'fa-users' },
    { key: 'extras', label: 'Extras', icon: 'fa-puzzle-piece' },
    { key: 'resellers', label: 'Revendedores', icon: 'fa-handshake' },
    { key: 'balance', label: 'Balance', icon: 'fa-chart-line' },
    { key: 'help', label: 'Ayuda', icon: 'fa-circle-question' },
  ],

  db: {
    saas: [],
    plans: [],
    campaigns: [],
    extras: [],
    resellers: [],
    clients: [],
    expenses: [], // egresos manuales
    meta: { version: 1, savedAt: null }
  },

  expenseForm: { name: '', amount: 0, date: '' },
  resellerHtml: '',

  modal: { open: false, view: '', title: '' },

  forms: {
    saas: { id: '', name: '', url: '', logoUrl: '', registerUrl: '', loginUrl: '' },
    plan: { id: '', saasId: '', frequency: 'Por mes', title: '', description: '', price: 0 },
    campaign: { id: '', saasId: '', adName: '', date: '', dailySpend: 0, totalSpend: 0 },
    extra: { id: '', name: '', price: 0, frequency: 'Única vez' },
    client: { id: '', name: '', saasId: '', planId: '', extraIds: [], email: '', password: '', date: '', notes: '', links: '' },
    reseller: {
      id: '',
      saasId: '',
      sourceType: 'plan',
      sourceId: '',
      costPrice: 0,
      salePrice: 0,
      deliveryTime: '',
      requirements: ''
    }
  }
});
