window.AAPPCore = {
  init() {
    // Dark mode default
    this.applyDarkClass();

    // Load DB
    const raw = localStorage.getItem(window.AAPPConstants.STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        this.db = this.normalizeDB(parsed);
      } catch (e) {
        console.warn('DB inválida, usando vacía', e);
        this.persist();
      }
    } else {
      // Seed mínimo con tus dos SaaS
      this.seedMinimal();
    }
  },

  normalizeDB(input) {
    const safe = (arr) => Array.isArray(arr) ? arr : [];
    return {
      saas: safe(input.saas),
      plans: safe(input.plans),
      campaigns: safe(input.campaigns),
      extras: safe(input.extras),
      clients: safe(input.clients),
      expenses: safe(input.expenses),
      meta: input.meta || { version: 1, savedAt: null }
    };
  },

  persist() {
    this.db.meta.savedAt = new Date().toISOString();
    localStorage.setItem(window.AAPPConstants.STORAGE_KEY, JSON.stringify(this.db));
  },

  toggleDark() {
    this.isDark = !this.isDark;
    this.applyDarkClass();
  },

  applyDarkClass() {
    const html = document.documentElement;
    if (this.isDark) html.classList.add('dark');
    else html.classList.remove('dark');
  },

  openModal(view) {
    this.modal.open = true;
    this.modal.view = view;

    const titles = {
      saasForm: (this.forms.saas.id ? 'Editar empresa' : 'Nueva empresa'),
      planForm: (this.forms.plan.id ? 'Editar plan' : 'Nuevo plan'),
      campaignForm: (this.forms.campaign.id ? 'Editar campaña' : 'Nueva campaña'),
      extraForm: (this.forms.extra.id ? 'Editar servicio extra' : 'Nuevo servicio extra'),
      clientForm: (this.forms.client.id ? 'Editar cliente' : 'Nuevo cliente'),
      dataTools: 'Datos • Exportar / Importar / Demo'
    };
    this.modal.title = titles[view] || 'Formulario';

    // defaults
    if (view === 'campaignForm' && !this.forms.campaign.date) this.forms.campaign.date = this.todayISO();
    if (view === 'clientForm' && !this.forms.client.date) this.forms.client.date = this.todayISO();
  },

  closeModal() {
    this.modal.open = false;
    this.modal.view = '';
  }
};
