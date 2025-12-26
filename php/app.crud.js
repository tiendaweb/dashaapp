window.AAPPCrud = {
  // CRUD: SaaS
  resetSaasForm() {
    this.forms.saas = { id: '', name: '', url: '', logoUrl: '', registerUrl: '', loginUrl: '' };
  },
  editSaas(id) {
    const s = this.db.saas.find(x => x.id === id);
    if (!s) return;
    this.forms.saas = JSON.parse(JSON.stringify(s));
    this.openModal('saasForm');
  },
  saveSaas() {
    const f = this.forms.saas;
    if (!String(f.name || '').trim()) return alert('Falta el nombre.');
    if (!String(f.url || '').trim()) return alert('Falta la URL.');

    if (f.id) {
      const idx = this.db.saas.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.saas[idx] = { ...this.db.saas[idx], ...f };
    } else {
      this.db.saas.push({ ...f, id: this.uid() });
    }
    this.persist();
    this.closeModal();
    this.resetSaasForm();
  },
  delSaas(id) {
    if (!confirm('¿Borrar empresa? Esto NO borra planes/clientes automáticamente.')) return;
    this.db.saas = this.db.saas.filter(x => x.id !== id);
    // limpiar referencias
    this.db.domains = this.db.domains.map(d => d.saasId === id ? { ...d, saasId: '' } : d);
    this.persist();
  },

  // CRUD: Domains
  resetDomainForm() {
    this.forms.domain = { id: '', name: '', saasId: '', clientId: '', provider: '', status: 'Activo', notes: '' };
  },
  editDomain(id) {
    const d = this.db.domains.find(x => x.id === id);
    if (!d) return;
    this.forms.domain = JSON.parse(JSON.stringify(d));
    this.openModal('domainForm');
  },
  saveDomain() {
    const f = this.forms.domain;
    if (!String(f.name || '').trim()) return alert('Falta el dominio.');
    if (!f.saasId) return alert('Elegí una empresa.');
    const payload = {
      ...f,
      saasId: f.saasId || '',
      clientId: f.clientId || ''
    };

    if (f.id) {
      const idx = this.db.domains.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.domains[idx] = { ...this.db.domains[idx], ...payload };
    } else {
      this.db.domains.push({ ...payload, id: this.uid() });
    }
    this.persist();
    this.closeModal();
    this.resetDomainForm();
  },
  delDomain(id) {
    if (!confirm('¿Borrar dominio?')) return;
    this.db.domains = this.db.domains.filter(x => x.id !== id);
    this.persist();
  },

  // CRUD: Plans
  resetPlanForm() {
    this.forms.plan = {
      id: '',
      saasId: '',
      frequency: 'Por mes',
      title: '',
      description: '',
      price: 0,
      features: [],
      variableFeatures: []
    };
    this.imports.plan = '';
  },
  editPlan(id) {
    const p = this.db.plans.find(x => x.id === id);
    if (!p) return;
    this.forms.plan = {
      id: '',
      saasId: '',
      frequency: 'Por mes',
      title: '',
      description: '',
      price: 0,
      features: [],
      variableFeatures: [],
      ...JSON.parse(JSON.stringify(p))
    };
    this.ensureFeatureLists('plan');
    this.imports.plan = '';
    this.openModal('planForm');
  },
  savePlan() {
    const f = this.forms.plan;
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!String(f.title || '').trim()) return alert('Falta el título.');
    if (!Number(f.price || 0)) return alert('Falta el precio.');
    this.ensureFeatureLists('plan');
    f.features = this.cleanFeatures(f.features);
    f.variableFeatures = this.cleanVariableFeatures(f.variableFeatures);

    if (f.id) {
      const idx = this.db.plans.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.plans[idx] = { ...this.db.plans[idx], ...f, price: Number(f.price || 0) };
    } else {
      this.db.plans.push({ ...f, id: this.uid(), price: Number(f.price || 0) });
    }
    this.persist();
    this.closeModal();
    this.resetPlanForm();
  },
  delPlan(id) {
    if (!confirm('¿Borrar plan? Clientes que lo usen quedarán con plan “-”.')) return;
    this.db.plans = this.db.plans.filter(x => x.id !== id);
    this.persist();
  },

  // CRUD: Campaigns
  resetCampaignForm() {
    this.forms.campaign = {
      id: '',
      saasId: '',
      adName: '',
      date: this.todayISO(),
      dailySpend: 0,
      totalSpend: 0,
      reach: 0,
      views: 0,
      costPerConversation: 0,
      notes: ''
    };
  },
  editCampaign(id) {
    const c = this.db.campaigns.find(x => x.id === id);
    if (!c) return;
    this.forms.campaign = {
      id: '',
      saasId: '',
      adName: '',
      date: this.todayISO(),
      dailySpend: 0,
      totalSpend: 0,
      reach: 0,
      views: 0,
      costPerConversation: 0,
      notes: '',
      ...JSON.parse(JSON.stringify(c))
    };
    this.openModal('campaignForm');
  },
  saveCampaign() {
    const f = this.forms.campaign;
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!String(f.adName || '').trim()) return alert('Falta el anuncio/nombre.');
    if (!String(f.date || '').trim()) f.date = this.todayISO();
    f.dailySpend = Number(f.dailySpend || 0);
    f.totalSpend = Number(f.totalSpend || 0);
    f.reach = Number(f.reach || 0);
    f.views = Number(f.views || 0);
    f.costPerConversation = Number(f.costPerConversation || 0);

    if (!f.dailySpend) return alert('Cargá gasto por día.');

    if (f.id) {
      const idx = this.db.campaigns.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.campaigns[idx] = { ...this.db.campaigns[idx], ...f };
    } else {
      this.db.campaigns.push({ ...f, id: this.uid() });
    }
    this.persist();
    this.closeModal();
    this.resetCampaignForm();
  },
  delCampaign(id) {
    if (!confirm('¿Borrar campaña?')) return;
    this.db.campaigns = this.db.campaigns.filter(x => x.id !== id);
    this.persist();
  },

  // CRUD: Extras
  resetExtraForm() {
    this.forms.extra = {
      id: '',
      saasId: '',
      name: '',
      price: 0,
      frequency: 'Única vez',
      features: [],
      variableFeatures: []
    };
    this.imports.extra = '';
  },
  editExtra(id) {
    const e = this.db.extras.find(x => x.id === id);
    if (!e) return;
    this.forms.extra = {
      id: '',
      saasId: '',
      name: '',
      price: 0,
      frequency: 'Única vez',
      features: [],
      variableFeatures: [],
      ...JSON.parse(JSON.stringify(e))
    };
    this.ensureFeatureLists('extra');
    this.imports.extra = '';
    this.openModal('extraForm');
  },
  saveExtra() {
    const f = this.forms.extra;
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!String(f.name || '').trim()) return alert('Falta el nombre.');
    f.price = Number(f.price || 0);
    if (!f.price) return alert('Falta el precio.');
    this.ensureFeatureLists('extra');
    f.features = this.cleanFeatures(f.features);
    f.variableFeatures = this.cleanVariableFeatures(f.variableFeatures);

    if (f.id) {
      const idx = this.db.extras.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.extras[idx] = { ...this.db.extras[idx], ...f };
    } else {
      this.db.extras.push({ ...f, id: this.uid() });
    }
    this.persist();
    this.closeModal();
    this.resetExtraForm();
  },
  delExtra(id) {
    if (!confirm('¿Borrar extra? Clientes que lo usen lo perderán.')) return;
    // quitar de clientes
    this.db.clients = this.db.clients.map(c => ({
      ...c,
      extraIds: (c.extraIds || []).filter(x => x !== id)
    }));
    this.db.extras = this.db.extras.filter(x => x.id !== id);
    this.persist();
  },

  // CRUD: Clients
  resetClientForm() {
    this.forms.client = { id: '', name: '', saasId: '', planId: '', extraIds: [], email: '', password: '', date: this.todayISO(), notes: '', links: '' };
  },
  syncPlanToCompany() {
    // si plan no pertenece a esa empresa, lo limpia
    const saasId = this.forms.client.saasId;
    const plan = this.db.plans.find(p => p.id === this.forms.client.planId);
    if (plan && plan.saasId !== saasId) this.forms.client.planId = '';
    const allowedExtraIds = new Set(this.extrasBySaas(saasId).map(e => e.id));
    this.forms.client.extraIds = (this.forms.client.extraIds || []).filter(id => allowedExtraIds.has(id));
  },
  toggleClientExtra(extraId, checked) {
    const list = new Set(this.forms.client.extraIds || []);
    if (checked) list.add(extraId);
    else list.delete(extraId);
    this.forms.client.extraIds = Array.from(list);
  },
  editClient(id) {
    const cl = this.db.clients.find(x => x.id === id);
    if (!cl) return;
    this.forms.client = JSON.parse(JSON.stringify(cl));
    this.openModal('clientForm');
  },
  saveClient() {
    const f = this.forms.client;
    if (!String(f.name || '').trim()) return alert('Falta el nombre.');
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!f.planId) return alert('Seleccioná un plan activo.');

    if (f.id) {
      const idx = this.db.clients.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.clients[idx] = { ...this.db.clients[idx], ...f };
    } else {
      this.db.clients.push({ ...f, id: this.uid() });
    }
    this.persist();
    this.closeModal();
    this.resetClientForm();
  },
  delClient(id) {
    if (!confirm('¿Borrar cliente?')) return;
    this.db.domains = this.db.domains.map(d => d.clientId === id ? { ...d, clientId: '' } : d);
    this.db.clients = this.db.clients.filter(x => x.id !== id);
    this.persist();
  },

  // CRUD: Resellers
  resetResellerForm() {
    this.forms.reseller = {
      id: '',
      saasId: '',
      sourceType: 'plan',
      sourceId: '',
      costPrice: 0,
      salePrice: 0,
      deliveryTime: '',
      requirements: ''
    };
    this.imports.reseller = '';
  },
  syncResellerSource() {
    if (this.forms.reseller.sourceType === 'plan') {
      const plans = this.plansBySaas(this.forms.reseller.saasId);
      if (!plans.find(p => p.id === this.forms.reseller.sourceId)) {
        this.forms.reseller.sourceId = plans[0]?.id || '';
      }
      return;
    }
    const extras = this.extrasBySaas(this.forms.reseller.saasId);
    if (!extras.find(e => e.id === this.forms.reseller.sourceId)) {
      this.forms.reseller.sourceId = extras[0]?.id || '';
    }
  },
  editReseller(id) {
    const r = this.db.resellers.find(x => x.id === id);
    if (!r) return;
    this.forms.reseller = JSON.parse(JSON.stringify(r));
    this.imports.reseller = '';
    this.openModal('resellerForm');
  },
  saveReseller() {
    const f = this.forms.reseller;
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!f.sourceType) return alert('Seleccioná el tipo.');
    if (!f.sourceId) return alert('Seleccioná el plan o extra.');
    f.costPrice = Number(f.costPrice || 0);
    f.salePrice = Number(f.salePrice || 0);
    if (!f.costPrice) return alert('Falta el precio de costo.');
    if (!f.salePrice) return alert('Falta el precio sugerido.');

    if (f.id) {
      const idx = this.db.resellers.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.resellers[idx] = { ...this.db.resellers[idx], ...f };
    } else {
      this.db.resellers.push({ ...f, id: this.uid() });
    }
    this.persist();
    this.closeModal();
    this.resetResellerForm();
  },
  delReseller(id) {
    if (!confirm('¿Borrar este plan revendedor?')) return;
    this.db.resellers = this.db.resellers.filter(x => x.id !== id);
    this.persist();
  },

  // CRUD: Partners
  resetPartnerForm() {
    this.forms.partner = { id: '', name: '', company: '', email: '', phone: '', commission: 0, notes: '' };
  },
  editPartner(id) {
    const p = this.db.partners.find(x => x.id === id);
    if (!p) return;
    this.forms.partner = JSON.parse(JSON.stringify(p));
    this.openModal('partnerForm');
  },
  savePartner() {
    const f = this.forms.partner;
    if (!String(f.name || '').trim()) return alert('Falta el nombre.');
    f.commission = Number(f.commission || 0);
    if (f.id) {
      const idx = this.db.partners.findIndex(x => x.id === f.id);
      if (idx >= 0) this.db.partners[idx] = { ...this.db.partners[idx], ...f };
    } else {
      this.db.partners.push({ ...f, id: this.uid() });
    }
    this.persist();
    this.closeModal();
    this.resetPartnerForm();
  },
  delPartner(id) {
    if (!confirm('¿Borrar partner?')) return;
    this.db.partners = this.db.partners.filter(x => x.id !== id);
    this.persist();
  },

  // POS
  resetPosForm() {
    this.forms.pos = {
      buyerName: '',
      buyerEmail: '',
      saasId: '',
      planId: '',
      extraIds: [],
      date: this.todayISO(),
      paymentMethod: 'Transferencia',
      notes: ''
    };
  },
  resetPosCampaignForm() {
    this.forms.posCampaign = {
      saasId: '',
      adName: '',
      date: this.todayISO(),
      dailySpend: 0,
      totalSpend: 0,
      reach: 0,
      views: 0,
      costPerConversation: 0,
      notes: ''
    };
  },
  syncPosPlanToCompany() {
    const saasId = this.forms.pos.saasId;
    const plan = this.db.plans.find(p => p.id === this.forms.pos.planId);
    if (plan && plan.saasId !== saasId) this.forms.pos.planId = '';
    const allowedExtraIds = new Set(this.extrasBySaas(saasId).map(e => e.id));
    this.forms.pos.extraIds = (this.forms.pos.extraIds || []).filter(id => allowedExtraIds.has(id));
  },
  togglePosExtra(extraId, checked) {
    const list = new Set(this.forms.pos.extraIds || []);
    if (checked) list.add(extraId);
    else list.delete(extraId);
    this.forms.pos.extraIds = Array.from(list);
  },
  savePosSale() {
    const f = this.forms.pos;
    if (!String(f.buyerName || '').trim()) return alert('Falta el nombre del cliente.');
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!f.planId) return alert('Seleccioná un plan.');
    if (!String(f.date || '').trim()) f.date = this.todayISO();

    const totalAmount = this.posSaleTotal({ planId: f.planId, extraIds: f.extraIds, amount: 0 });

    this.db.posSales.push({
      id: this.uid(),
      buyerName: f.buyerName,
      buyerEmail: f.buyerEmail,
      saasId: f.saasId,
      planId: f.planId,
      extraIds: f.extraIds || [],
      date: f.date,
      paymentMethod: f.paymentMethod || '',
      amount: totalAmount,
      notes: f.notes || ''
    });

    this.db.clients.push({
      id: this.uid(),
      name: f.buyerName,
      saasId: f.saasId,
      planId: f.planId,
      extraIds: f.extraIds || [],
      email: f.buyerEmail || '',
      password: '',
      date: f.date,
      notes: f.notes ? `POS: ${f.notes}` : 'POS: venta rápida',
      links: ''
    });

    this.persist();
    this.resetPosForm();
    alert('Venta registrada.');
  },
  removePosSale(id) {
    if (!confirm('¿Borrar esta venta POS?')) return;
    this.db.posSales = this.db.posSales.filter(x => x.id !== id);
    this.persist();
  },
  savePosCampaign() {
    const f = this.forms.posCampaign;
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!String(f.adName || '').trim()) return alert('Falta el anuncio/nombre.');
    if (!String(f.date || '').trim()) f.date = this.todayISO();

    const dailySpend = Number(f.dailySpend || 0);
    const totalSpend = Number(f.totalSpend || 0);
    const reach = Number(f.reach || 0);
    const views = Number(f.views || 0);
    const costPerConversation = Number(f.costPerConversation || 0);

    if (!dailySpend) return alert('Cargá gasto por día.');

    this.db.campaigns.push({
      id: this.uid(),
      saasId: f.saasId,
      adName: f.adName,
      date: f.date,
      dailySpend,
      totalSpend,
      reach,
      views,
      costPerConversation,
      notes: f.notes || ''
    });
    this.persist();
    this.resetPosCampaignForm();
    alert('Campaña registrada.');
  },

  ensureFeatureLists(formKey) {
    const form = this.forms[formKey];
    if (!Array.isArray(form.features)) form.features = [];
    if (!Array.isArray(form.variableFeatures)) form.variableFeatures = [];
  },
  cleanFeatures(list = []) {
    return list
      .map((item) => ({
        label: String(item?.label || '').trim(),
        enabled: Boolean(item?.enabled)
      }))
      .filter((item) => item.label);
  },
  cleanVariableFeatures(list = []) {
    return list
      .map((item) => ({
        key: String(item?.key || '').trim(),
        value: String(item?.value || '').trim()
      }))
      .filter((item) => item.key || item.value);
  },
  addFeatureRow(formKey) {
    this.ensureFeatureLists(formKey);
    this.forms[formKey].features.push({ label: '', enabled: true });
  },
  removeFeatureRow(formKey, idx) {
    this.ensureFeatureLists(formKey);
    this.forms[formKey].features.splice(idx, 1);
  },
  addVariableFeatureRow(formKey) {
    this.ensureFeatureLists(formKey);
    this.forms[formKey].variableFeatures.push({ key: '', value: '' });
  },
  removeVariableFeatureRow(formKey, idx) {
    this.ensureFeatureLists(formKey);
    this.forms[formKey].variableFeatures.splice(idx, 1);
  },
  importFeaturePreset(formKey) {
    const sourceId = this.imports[formKey];
    if (!sourceId) return;
    const sourceList = formKey === 'plan' ? this.db.plans : this.db.extras;
    const source = sourceList.find(item => item.id === sourceId);
    if (!source) return;
    this.forms[formKey].features = this.cleanFeatures(source.features || []).map(item => ({ ...item }));
    this.forms[formKey].variableFeatures = this.cleanVariableFeatures(source.variableFeatures || []).map(item => ({ ...item }));
  },
  importResellerPreset() {
    const sourceId = this.imports.reseller;
    if (!sourceId) return;
    const source = this.db.resellers.find(item => item.id === sourceId);
    if (!source) return;
    this.forms.reseller = {
      ...this.forms.reseller,
      costPrice: Number(source.costPrice || 0),
      salePrice: Number(source.salePrice || 0),
      deliveryTime: source.deliveryTime || '',
      requirements: source.requirements || ''
    };
  },

  refreshResellerHTML() {
    this.resellerHtml = this.resellerPricingHTML();
  },
  async copyResellerHTML() {
    this.refreshResellerHTML();
    const ok = await this.copyToClipboard(this.resellerHtml);
    if (ok) alert('HTML copiado.');
    else alert('No se pudo copiar el HTML.');
  },
  downloadResellerHTML() {
    this.refreshResellerHTML();
    const blob = new Blob([this.resellerHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `precios_revendedor_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // Manual expenses
  addExpense() {
    const n = (this.expenseForm.name || '').trim();
    const a = Number(this.expenseForm.amount || 0);
    const d = (this.expenseForm.date || '').trim();
    if (!n) return alert('Falta el concepto.');
    if (!a) return alert('Falta el monto.');
    this.db.expenses.push({ name: n, amount: a, date: d || this.todayISO() });
    this.expenseForm = { name: '', amount: 0, date: '' };
    this.persist();
  },
  removeExpense(idx) {
    this.db.expenses.splice(idx, 1);
    this.persist();
  },
  clearExpenses() {
    if (!confirm('¿Borrar todos los egresos manuales?')) return;
    this.db.expenses = [];
    this.persist();
  },

  // Data tools
  excelSheetConfig() {
    return [
      {
        name: 'Empresas',
        target: 'saas',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Nombre' },
          { key: 'url', label: 'URL' },
          { key: 'logoUrl', label: 'Logo' },
          { key: 'registerUrl', label: 'Registro' },
          { key: 'loginUrl', label: 'Login' }
        ],
        serialize() {
          return this.db.saas;
        },
        parseRow(record) {
          return {
            id: record.id || this.uid(),
            name: record.name || '',
            url: record.url || '',
            logoUrl: record.logoUrl || '',
            registerUrl: record.registerUrl || '',
            loginUrl: record.loginUrl || ''
          };
        }
      },
      {
        name: 'Dominios',
        target: 'domains',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Nombre' },
          { key: 'saasId', label: 'Empresa ID' },
          { key: 'clientId', label: 'Cliente ID' },
          { key: 'provider', label: 'Proveedor' },
          { key: 'status', label: 'Estado' },
          { key: 'notes', label: 'Notas' }
        ],
        serialize() {
          return this.db.domains;
        },
        parseRow(record) {
          return {
            id: record.id || this.uid(),
            name: record.name || '',
            saasId: record.saasId || '',
            clientId: record.clientId || '',
            provider: record.provider || '',
            status: record.status || '',
            notes: record.notes || ''
          };
        }
      },
      {
        name: 'Planes',
        target: 'plans',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'saasId', label: 'Empresa ID' },
          { key: 'frequency', label: 'Frecuencia' },
          { key: 'title', label: 'Título' },
          { key: 'description', label: 'Descripción' },
          { key: 'price', label: 'Precio' },
          { key: 'features', label: 'Features (JSON)', format: (value) => JSON.stringify(value || []) },
          { key: 'variableFeatures', label: 'Features variables (JSON)', format: (value) => JSON.stringify(value || []) }
        ],
        serialize() {
          return this.db.plans;
        },
        parseRow(record, helpers) {
          return {
            id: record.id || this.uid(),
            saasId: record.saasId || '',
            frequency: record.frequency || '',
            title: record.title || '',
            description: record.description || '',
            price: helpers.toNumber(record.price),
            features: helpers.parseJSONList(record.features),
            variableFeatures: helpers.parseJSONList(record.variableFeatures)
          };
        }
      },
      {
        name: 'Campañas',
        target: 'campaigns',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'saasId', label: 'Empresa ID' },
          { key: 'adName', label: 'Anuncio / Nombre' },
          { key: 'date', label: 'Fecha' },
          { key: 'dailySpend', label: 'Gasto por día' },
          { key: 'totalSpend', label: 'Gasto total' },
          { key: 'reach', label: 'Alcance' },
          { key: 'views', label: 'Visualizaciones' },
          { key: 'costPerConversation', label: 'Costo por conversación' },
          { key: 'notes', label: 'Notas' }
        ],
        serialize() {
          return this.db.campaigns;
        },
        parseRow(record, helpers) {
          return {
            id: record.id || this.uid(),
            saasId: record.saasId || '',
            adName: record.adName || '',
            date: record.date || '',
            dailySpend: helpers.toNumber(record.dailySpend),
            totalSpend: helpers.toNumber(record.totalSpend),
            reach: helpers.toNumber(record.reach),
            views: helpers.toNumber(record.views),
            costPerConversation: helpers.toNumber(record.costPerConversation),
            notes: record.notes || ''
          };
        }
      },
      {
        name: 'Extras',
        target: 'extras',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'saasId', label: 'Empresa ID' },
          { key: 'name', label: 'Nombre' },
          { key: 'price', label: 'Precio' },
          { key: 'frequency', label: 'Frecuencia' },
          { key: 'features', label: 'Features (JSON)', format: (value) => JSON.stringify(value || []) },
          { key: 'variableFeatures', label: 'Features variables (JSON)', format: (value) => JSON.stringify(value || []) }
        ],
        serialize() {
          return this.db.extras;
        },
        parseRow(record, helpers) {
          return {
            id: record.id || this.uid(),
            saasId: record.saasId || '',
            name: record.name || '',
            price: helpers.toNumber(record.price),
            frequency: record.frequency || '',
            features: helpers.parseJSONList(record.features),
            variableFeatures: helpers.parseJSONList(record.variableFeatures)
          };
        }
      },
      {
        name: 'Revendedores',
        target: 'resellers',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'saasId', label: 'Empresa ID' },
          { key: 'sourceType', label: 'Tipo fuente' },
          { key: 'sourceId', label: 'ID fuente' },
          { key: 'costPrice', label: 'Costo' },
          { key: 'salePrice', label: 'Venta' },
          { key: 'deliveryTime', label: 'Tiempo de entrega' },
          { key: 'requirements', label: 'Requisitos' }
        ],
        serialize() {
          return this.db.resellers;
        },
        parseRow(record, helpers) {
          return {
            id: record.id || this.uid(),
            saasId: record.saasId || '',
            sourceType: record.sourceType || '',
            sourceId: record.sourceId || '',
            costPrice: helpers.toNumber(record.costPrice),
            salePrice: helpers.toNumber(record.salePrice),
            deliveryTime: record.deliveryTime || '',
            requirements: record.requirements || ''
          };
        }
      },
      {
        name: 'Partners',
        target: 'partners',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Nombre' },
          { key: 'company', label: 'Empresa' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Teléfono' },
          { key: 'commission', label: 'Comisión' },
          { key: 'notes', label: 'Notas' }
        ],
        serialize() {
          return this.db.partners;
        },
        parseRow(record, helpers) {
          return {
            id: record.id || this.uid(),
            name: record.name || '',
            company: record.company || '',
            email: record.email || '',
            phone: record.phone || '',
            commission: helpers.toNumber(record.commission),
            notes: record.notes || ''
          };
        }
      },
      {
        name: 'Clientes',
        target: 'clients',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Nombre' },
          { key: 'saasId', label: 'Empresa ID' },
          { key: 'planId', label: 'Plan ID' },
          { key: 'extraIds', label: 'Extras IDs', format: (value) => Array.isArray(value) ? value.join('|') : (value || '') },
          { key: 'email', label: 'Email' },
          { key: 'password', label: 'Contraseña' },
          { key: 'date', label: 'Fecha' },
          { key: 'notes', label: 'Notas' },
          { key: 'links', label: 'Links' }
        ],
        serialize() {
          return this.db.clients;
        },
        parseRow(record, helpers) {
          return {
            id: record.id || this.uid(),
            name: record.name || '',
            saasId: record.saasId || '',
            planId: record.planId || '',
            extraIds: helpers.parseExtraIds(record.extraIds),
            email: record.email || '',
            password: record.password || '',
            date: record.date || '',
            notes: record.notes || '',
            links: record.links || ''
          };
        }
      },
      {
        name: 'POS Ventas',
        target: 'posSales',
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'buyerName', label: 'Cliente' },
          { key: 'buyerEmail', label: 'Email' },
          { key: 'saasId', label: 'Empresa ID' },
          { key: 'planId', label: 'Plan ID' },
          { key: 'extraIds', label: 'Extras IDs', format: (value) => Array.isArray(value) ? value.join('|') : (value || '') },
          { key: 'date', label: 'Fecha' },
          { key: 'paymentMethod', label: 'Método de pago' },
          { key: 'amount', label: 'Total' },
          { key: 'notes', label: 'Notas' }
        ],
        serialize() {
          return this.db.posSales;
        },
        parseRow(record, helpers) {
          return {
            id: record.id || this.uid(),
            buyerName: record.buyerName || '',
            buyerEmail: record.buyerEmail || '',
            saasId: record.saasId || '',
            planId: record.planId || '',
            extraIds: helpers.parseExtraIds(record.extraIds),
            date: record.date || '',
            paymentMethod: record.paymentMethod || '',
            amount: helpers.toNumber(record.amount),
            notes: record.notes || ''
          };
        }
      },
      {
        name: 'Egresos',
        target: 'expenses',
        columns: [
          { key: 'name', label: 'Concepto' },
          { key: 'amount', label: 'Monto' },
          { key: 'date', label: 'Fecha' }
        ],
        serialize() {
          return this.db.expenses;
        },
        parseRow(record, helpers) {
          return {
            name: record.name || '',
            amount: helpers.toNumber(record.amount),
            date: record.date || ''
          };
        }
      },
      {
        name: 'Meta',
        columns: [
          { key: 'savedAt', label: 'Guardado en' },
          { key: 'metaVersion', label: 'Versión' }
        ],
        serialize() {
          return [{
            savedAt: this.db.meta?.savedAt || '',
            metaVersion: this.db.meta?.version || 1
          }];
        },
        parseRow(record, helpers) {
          return {
            savedAt: record.savedAt || '',
            metaVersion: helpers.toNumber(record.metaVersion) || 1
          };
        },
        handle(result, parsed) {
          result.meta = {
            version: parsed.metaVersion || 1,
            savedAt: parsed.savedAt || ''
          };
        }
      }
    ];
  },

  buildExportSheets() {
    const configs = this.excelSheetConfig();
    return configs.map((sheet) => {
      const header = sheet.columns.map((col) => col.label);
      const data = typeof sheet.serialize === 'function' ? (sheet.serialize.call(this) || []) : [];
      const rows = data.map((item) => sheet.columns.map((col) => {
        const value = item ? item[col.key] : '';
        if (typeof col.format === 'function') return col.format.call(this, value, item);
        if (Array.isArray(value)) return value.join('|');
        return value ?? '';
      }));
      return { name: sheet.name, rows: [header, ...rows] };
    });
  },

  exportAllExcel() {
    if (!window.XLSX) {
      alert('No se encontró la librería XLSX.');
      return;
    }
    const wb = window.XLSX.utils.book_new();
    this.buildExportSheets().forEach((sheet) => {
      const ws = window.XLSX.utils.aoa_to_sheet(sheet.rows);
      window.XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
    });
    window.XLSX.writeFile(wb, `aapp_manager_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  },

  importExcelFile(event) {
    if (!window.XLSX) {
      alert('No se encontró la librería XLSX.');
      return;
    }
    const file = event?.target?.files?.[0];
    if (!file) return;
    if (!confirm('Esto reemplaza todos tus datos actuales. ¿Continuar?')) {
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        const parsed = this.parseWorkbook(workbook);
        if (!parsed) return;
        this.db = this.normalizeDB(parsed);
        this.persist();
        alert('Importado OK.');
        this.closeModal();
      } catch (e) {
        alert('No se pudo leer el Excel.');
      } finally {
        event.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  },

  parseWorkbook(workbook) {
    const sheetNames = workbook.SheetNames || [];
    if (!sheetNames.length) {
      alert('El archivo no tiene hojas válidas.');
      return null;
    }

    const firstSheetName = sheetNames[0];
    const previewRows = firstSheetName ? window.XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { header: 1, raw: false }) : [];
    const previewHeader = Array.isArray(previewRows?.[0]) ? previewRows[0].map((h) => String(h || '').trim()) : [];
    if (previewHeader.includes('area')) {
      return this.parseImportRows(previewRows);
    }

    const result = {
      saas: [],
      domains: [],
      plans: [],
      campaigns: [],
      extras: [],
      resellers: [],
      partners: [],
      clients: [],
      posSales: [],
      expenses: [],
      meta: { version: 1, savedAt: null }
    };

    const helpers = {
      toNumber: (value) => {
        if (value === null || value === undefined || value === '') return 0;
        const normalized = String(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
        const parsed = Number(normalized);
        return Number.isNaN(parsed) ? 0 : parsed;
      },
      parseExtraIds: (value) => String(value || '')
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean),
      parseJSONList: (value, fallback = []) => {
        if (!value) return Array.isArray(fallback) ? fallback : [];
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : (Array.isArray(fallback) ? fallback : []);
        } catch {
          return Array.isArray(fallback) ? fallback : [];
        }
      }
    };

    const configs = this.excelSheetConfig();
    configs.forEach((sheet) => {
      const ws = workbook.Sheets[sheet.name];
      if (!ws) return;
      const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
      if (!rows.length) return;
      const header = rows[0].map((h) => String(h || '').trim());
      const indices = sheet.columns.map((col) => header.findIndex((h) => h === col.label));
      rows.slice(1).forEach((row) => {
        if (!row || row.every((cell) => cell === null || cell === undefined || cell === '')) return;
        const record = {};
        sheet.columns.forEach((col, idx) => {
          const pos = indices[idx];
          record[col.key] = pos >= 0 ? (row[pos] ?? '') : '';
        });
        const parsedRow = sheet.parseRow ? sheet.parseRow.call(this, record, helpers) : record;
        if (parsedRow === null || parsedRow === undefined) return;
        if (typeof sheet.handle === 'function') {
          sheet.handle(result, parsedRow);
        } else if (sheet.target && Array.isArray(result[sheet.target])) {
          result[sheet.target].push(parsedRow);
        }
      });
    });

    return result;
  },

  parseImportRows(rows) {
    if (!Array.isArray(rows) || rows.length < 2) {
      alert('El Excel no tiene datos.');
      return null;
    }
    const header = rows[0].map((h) => String(h || '').trim());
    if (!header.includes('area')) {
      alert('El Excel no tiene la columna "area".');
      return null;
    }

    const result = {
      saas: [],
      domains: [],
      plans: [],
      campaigns: [],
      extras: [],
      resellers: [],
      partners: [],
      clients: [],
      posSales: [],
      expenses: [],
      meta: { version: 1, savedAt: null }
    };

    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const normalized = String(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
      const parsed = Number(normalized);
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    rows.slice(1).forEach((row) => {
      if (!row || !row.length) return;
      const record = {};
      header.forEach((key, idx) => {
        record[key] = row[idx] ?? '';
      });
      const area = String(record.area || '').trim();
      if (!area) return;
      const id = String(record.id || '') || this.uid();
      const extraIds = String(record.extraIds || '')
        .split('|')
        .map(item => item.trim())
        .filter(Boolean);

      if (area === 'saas') {
        result.saas.push({
          id,
          name: record.name || '',
          url: record.url || '',
          logoUrl: record.logoUrl || '',
          registerUrl: record.registerUrl || '',
          loginUrl: record.loginUrl || ''
        });
      } else if (area === 'domains') {
        result.domains.push({
          id,
          name: record.name || '',
          saasId: record.saasId || '',
          clientId: record.clientId || '',
          provider: record.provider || '',
          status: record.status || '',
          notes: record.notes || ''
        });
      } else if (area === 'plans') {
        result.plans.push({
          id,
          saasId: record.saasId || '',
          frequency: record.frequency || '',
          title: record.title || '',
          description: record.description || '',
          price: toNumber(record.price)
        });
      } else if (area === 'campaigns') {
        result.campaigns.push({
          id,
          saasId: record.saasId || '',
          adName: record.adName || '',
          date: record.date || '',
          dailySpend: toNumber(record.dailySpend),
          totalSpend: toNumber(record.totalSpend),
          reach: toNumber(record.reach),
          views: toNumber(record.views),
          costPerConversation: toNumber(record.costPerConversation),
          notes: record.notes || ''
        });
      } else if (area === 'extras') {
        result.extras.push({
          id,
          saasId: record.saasId || '',
          name: record.name || '',
          price: toNumber(record.price),
          frequency: record.frequency || ''
        });
      } else if (area === 'resellers') {
        result.resellers.push({
          id,
          saasId: record.saasId || '',
          sourceType: record.sourceType || '',
          sourceId: record.sourceId || '',
          costPrice: toNumber(record.costPrice),
          salePrice: toNumber(record.salePrice),
          deliveryTime: record.deliveryTime || '',
          requirements: record.requirements || ''
        });
      } else if (area === 'partners') {
        result.partners.push({
          id,
          name: record.name || '',
          company: record.company || '',
          email: record.email || '',
          phone: record.phone || '',
          commission: toNumber(record.commission),
          notes: record.notes || ''
        });
      } else if (area === 'clients') {
        result.clients.push({
          id,
          name: record.name || '',
          saasId: record.saasId || '',
          planId: record.planId || '',
          extraIds,
          email: record.email || '',
          password: record.password || '',
          date: record.date || '',
          notes: record.notes || '',
          links: record.links || ''
        });
      } else if (area === 'posSales') {
        result.posSales.push({
          id,
          buyerName: record.buyerName || '',
          buyerEmail: record.buyerEmail || '',
          saasId: record.saasId || '',
          planId: record.planId || '',
          extraIds,
          date: record.date || '',
          paymentMethod: record.paymentMethod || '',
          amount: toNumber(record.amount),
          notes: record.notes || ''
        });
      } else if (area === 'expenses') {
        result.expenses.push({
          name: record.name || '',
          amount: toNumber(record.amount),
          date: record.date || ''
        });
      } else if (area === 'meta') {
        result.meta = {
          savedAt: record.savedAt || '',
          version: toNumber(record.metaVersion) || 1
        };
      }
    });

    return result;
  },

  exportJSON() {
    const blob = new Blob([JSON.stringify(this.db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aapp_manager_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  importJSON() {
    const txt = (this.importText || '').trim();
    if (!txt) return alert('Pegá un JSON primero.');
    if (!confirm('Esto reemplaza todos tus datos actuales. ¿Continuar?')) return;

    try {
      const parsed = JSON.parse(txt);
      this.db = this.normalizeDB(parsed);
      this.persist();
      alert('Importado OK.');
      this.closeModal();
    } catch (e) {
      alert('JSON inválido.');
    }
  },

  async resetAll() {
    if (!confirm('RESET TOTAL: se borra todo en la base de datos. ¿Continuar?')) return;
    try {
      await this.resetStateOnServer();
      location.reload();
    } catch (e) {
      console.error('No se pudo reiniciar la base de datos.', e);
      alert('No se pudo reiniciar la base de datos MySQL.');
    }
  }
};
