window.AAPPState = () => ({
  appLoading: true,
  isDark: true,
  activeTab: 'dashboard',
  q: '',
  importText: '',
  showSearch: false,
  isAuthenticated: false,
  authChecking: true,
  authError: '',
  authUser: null,
  passwordFeedback: '',

  tabs: [
    { key: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
    { key: 'saas', label: 'Empresas', icon: 'fa-building' },
    { key: 'domains', label: 'Dominios', icon: 'fa-globe' },
    { key: 'plans', label: 'Planes', icon: 'fa-tags' },
    { key: 'campaigns', label: 'Campañas', icon: 'fa-bullhorn' },
    { key: 'campaignRegister', label: 'Registrar Campaña', icon: 'fa-bullseye' },
    { key: 'clients', label: 'Clientes', icon: 'fa-users' },
    { key: 'extras', label: 'Extras', icon: 'fa-puzzle-piece' },
    { key: 'resellers', label: 'Precios Revendedor', icon: 'fa-handshake' },
    { key: 'partners', label: 'Partners', icon: 'fa-people-group' },
    { key: 'pos', label: 'POS', icon: 'fa-cash-register' },
    { key: 'balance', label: 'Balance', icon: 'fa-chart-line' },
    { key: 'help', label: 'Ayuda', icon: 'fa-circle-question' },
  ],

  db: {
    saas: [],
    domains: [],
    plans: [],
    campaigns: [],
    extras: [],
    resellers: [],
    partners: [],
    clients: [],
    posSales: [],
    expenses: [], // egresos manuales
    meta: { version: 1, savedAt: null }
  },

  expenseForm: { name: '', amount: 0, date: '' },
  resellerHtml: '',

  modal: { open: false, view: '', title: '' },
  loginForm: { email: 'admin@aapp.uno', password: '' },
  passwordForm: { current: '', next: '', confirm: '' },

  // UI filters
  domainFilterSaasId: '',

  imports: {
    plan: '',
    extra: '',
    reseller: ''
  },

  forms: {
    saas: { id: '', name: '', url: '', logoUrl: '', registerUrl: '', loginUrl: '' },
    plan: {
      id: '',
      saasId: '',
      frequency: 'Por mes',
      title: '',
      description: '',
      price: 0,
      features: [],
      variableFeatures: []
    },
    domain: {
      id: '',
      name: '',
      saasId: '',
      clientId: '',
      provider: '',
      status: 'Activo',
      notes: ''
    },
    campaign: { id: '', saasId: '', adName: '', date: '', dailySpend: 0, totalSpend: 0, reach: 0, views: 0, costPerConversation: 0, notes: '' },
    extra: {
      id: '',
      saasId: '',
      name: '',
      price: 0,
      frequency: 'Única vez',
      features: [],
      variableFeatures: []
    },
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
    },
    partner: {
      id: '',
      name: '',
      company: '',
      email: '',
      phone: '',
      commission: 0,
      notes: ''
    },
    pos: {
      buyerName: '',
      buyerEmail: '',
      saasId: '',
      planId: '',
      extraIds: [],
      date: '',
      paymentMethod: 'Transferencia',
      notes: ''
    },
    posCampaign: {
      saasId: '',
      adName: '',
      date: '',
      dailySpend: 0,
      totalSpend: 0,
      reach: 0,
      views: 0,
      costPerConversation: 0,
      notes: ''
    }
  }
});
