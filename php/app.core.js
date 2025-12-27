window.AAPPCore = {
  async init() {
    // Dark mode default
    this.applyDarkClass();

    this.appLoading = true;
    // Comprobar sesión antes de cargar datos
    await this.checkSession();
    if (!this.isAuthenticated) {
      this.authChecking = false;
      this.appLoading = false;
      return;
    }

    try {
      await this.loadRemoteState();
    } catch (e) {
      console.warn('No se pudo cargar la base de datos remota, usando seed mínimo.', e);
      this.apiUnavailable = true;
      this.seedMinimal({ persist: false });
    } finally {
      this.authChecking = false;
      this.appLoading = false;
    }

    if (!this.forms.pos.date) this.forms.pos.date = this.todayISO();
    if (!this.forms.posCampaign.date) this.forms.posCampaign.date = this.todayISO();
  },

  normalizeDB(input) {
    const safe = (arr) => Array.isArray(arr) ? arr : [];
    return {
      saas: safe(input.saas).map((s) => ({ logoUrl: '', ...s })),
      domains: safe(input.domains).map((d) => ({
        id: d.id || this.uid(),
        name: d.name || '',
        saasId: d.saasId || '',
        clientId: d.clientId || '',
        provider: d.provider || '',
        status: d.status || 'Activo',
        notes: d.notes || ''
      })),
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

  async persist() {
    if (!this.isAuthenticated) {
      console.warn('No autenticado. Iniciá sesión para guardar.');
      return;
    }
    if (this.apiUnavailable) {
      console.warn('API no disponible, no se guarda el estado todavía.');
      return;
    }
    if (this.saving) return;

    this.saving = true;
    this.saveMessage = 'Guardando…';
    this.db.meta.savedAt = new Date().toISOString();
    try {
      await this.saveStateToServer(this.db);
      this.saveMessage = 'Datos guardados.';
    } catch (err) {
      console.error('No se pudo persistir en la base de datos.', err);
      this.apiUnavailable = true;
      this.saveMessage = 'Error al guardar.';
      alert('No se pudo guardar en la base de datos MySQL. Verificá la conexión.');
    } finally {
      this.saving = false;
      setTimeout(() => {
        this.saveMessage = '';
      }, 2000);
    }
  },

  async loadRemoteState() {
    const remote = await this.fetchStateFromServer();
    if (remote) {
      this.db = this.normalizeDB(remote);
    } else {
      this.seedMinimal();
    }
    if (!this.forms.pos.date) this.forms.pos.date = this.todayISO();
    if (!this.forms.posCampaign.date) this.forms.posCampaign.date = this.todayISO();
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
      domainForm: (this.forms.domain.id ? 'Editar dominio' : 'Nuevo dominio'),
      resellerForm: (this.forms.reseller.id ? 'Editar plan revendedor' : 'Nuevo plan revendedor'),
      partnerForm: (this.forms.partner.id ? 'Editar partner' : 'Nuevo partner'),
      resellerHtml: 'Página de precios revendedor',
      dataTools: 'Datos • Exportar / Importar',
      changePassword: 'Cambiar contraseña'
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
    this.passwordFeedback = '';
    this.passwordForm = { current: '', next: '', confirm: '' };
  }
};
