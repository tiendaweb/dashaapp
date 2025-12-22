window.AAPPState = () => ({
  isDark: true,
  activeTab: 'saas',
  q: '',
  importText: '',

  tabs: [
    { key: 'saas', label: 'Empresas', icon: 'fa-building' },
    { key: 'plans', label: 'Planes', icon: 'fa-tags' },
    { key: 'campaigns', label: 'Campañas', icon: 'fa-bullhorn' },
    { key: 'clients', label: 'Clientes', icon: 'fa-users' },
    { key: 'extras', label: 'Extras', icon: 'fa-puzzle-piece' },
    { key: 'balance', label: 'Balance', icon: 'fa-chart-line' },
    { key: 'help', label: 'Ayuda', icon: 'fa-circle-question' },
  ],

  db: {
    saas: [],
    plans: [],
    campaigns: [],
    extras: [],
    clients: [],
    expenses: [], // egresos manuales
    meta: { version: 1, savedAt: null }
  },

  expenseForm: { name: '', amount: 0, date: '' },

  modal: { open: false, view: '', title: '' },

  forms: {
    saas: { id: '', name: '', url: '', registerUrl: '', loginUrl: '' },
    plan: { id: '', saasId: '', frequency: 'Por mes', title: '', description: '', price: 0 },
    campaign: { id: '', saasId: '', adName: '', date: '', dailySpend: 0, totalSpend: 0 },
    extra: { id: '', name: '', price: 0, frequency: 'Única vez' },
    client: { id: '', name: '', saasId: '', planId: '', extraIds: [], email: '', password: '', date: '', notes: '', links: '' },
  }
});
