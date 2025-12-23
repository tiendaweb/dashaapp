window.AAPPCore = {
  init() {
    // Dark mode default
    this.applyDarkClass();

    // Load DB
    const raw = this.safeStorageGet(window.AAPPConstants.STORAGE_KEY);
    if (this.storageBlocked) {
      this.seedMinimal({ persist: false });
      return;
    }
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

    if (!this.forms.pos.date) this.forms.pos.date = this.todayISO();
    if (!this.forms.posCampaign.date) this.forms.posCampaign.date = this.todayISO();
  },

  normalizeDB(input) {
    const safe = (arr) => Array.isArray(arr) ? arr : [];
    return {
      saas: safe(input.saas).map((s) => ({ logoUrl: '', ...s })),
      plans: safe(input.plans).map((p) => ({
        features: [],
        variableFeatures: [],
        ...p,
        features: Array.isArray(p.features) ? p.features : [],
        variableFeatures: Array.isArray(p.variableFeatures) ? p.variableFeatures : []
      })),
      campaigns: safe(input.campaigns).map((c) => ({
        reach: 0,
        views: 0,
        costPerConversation: 0,
        notes: '',
        ...c
      })),
      extras: safe(input.extras).map((e) => ({
        saasId: '',
        features: [],
        variableFeatures: [],
        ...e,
        features: Array.isArray(e.features) ? e.features : [],
        variableFeatures: Array.isArray(e.variableFeatures) ? e.variableFeatures : []
      })),
      resellers: safe(input.resellers),
      partners: safe(input.partners),
      clients: safe(input.clients),
      posSales: safe(input.posSales),
      expenses: safe(input.expenses),
      meta: input.meta || { version: 1, savedAt: null }
    };
  },

  persist() {
    this.db.meta.savedAt = new Date().toISOString();
    const saved = this.safeStorageSet(window.AAPPConstants.STORAGE_KEY, JSON.stringify(this.db));
    if (!saved) {
      alert('El almacenamiento local está bloqueado. Los datos no podrán persistir.');
    }
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
      resellerForm: (this.forms.reseller.id ? 'Editar plan revendedor' : 'Nuevo plan revendedor'),
      partnerForm: (this.forms.partner.id ? 'Editar partner' : 'Nuevo partner'),
      resellerHtml: 'Página de precios revendedor',
      dataTools: 'Datos • Exportar / Importar / Demo'
    };
    this.modal.title = titles[view] || 'Formulario';

    // defaults
    if (view === 'campaignForm' && !this.forms.campaign.date) this.forms.campaign.date = this.todayISO();
    if (view === 'clientForm' && !this.forms.client.date) this.forms.client.date = this.todayISO();
    if (view === 'resellerHtml') this.refreshResellerHTML();
  },

  closeModal() {
    this.modal.open = false;
    this.modal.view = '';
  }
};
