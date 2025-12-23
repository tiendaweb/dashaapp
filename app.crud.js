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
    this.persist();
  },

  // CRUD: Plans
  resetPlanForm() {
    this.forms.plan = { id: '', saasId: '', frequency: 'Por mes', title: '', description: '', price: 0 };
  },
  editPlan(id) {
    const p = this.db.plans.find(x => x.id === id);
    if (!p) return;
    this.forms.plan = JSON.parse(JSON.stringify(p));
    this.openModal('planForm');
  },
  savePlan() {
    const f = this.forms.plan;
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!String(f.title || '').trim()) return alert('Falta el título.');
    if (!Number(f.price || 0)) return alert('Falta el precio.');

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
    this.forms.campaign = { id: '', saasId: '', adName: '', date: this.todayISO(), dailySpend: 0, totalSpend: 0 };
  },
  editCampaign(id) {
    const c = this.db.campaigns.find(x => x.id === id);
    if (!c) return;
    this.forms.campaign = JSON.parse(JSON.stringify(c));
    this.openModal('campaignForm');
  },
  saveCampaign() {
    const f = this.forms.campaign;
    if (!f.saasId) return alert('Seleccioná una empresa.');
    if (!String(f.adName || '').trim()) return alert('Falta el anuncio/nombre.');
    if (!String(f.date || '').trim()) f.date = this.todayISO();
    f.dailySpend = Number(f.dailySpend || 0);
    f.totalSpend = Number(f.totalSpend || 0);

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
    this.forms.extra = { id: '', name: '', price: 0, frequency: 'Única vez' };
  },
  editExtra(id) {
    const e = this.db.extras.find(x => x.id === id);
    if (!e) return;
    this.forms.extra = JSON.parse(JSON.stringify(e));
    this.openModal('extraForm');
  },
  saveExtra() {
    const f = this.forms.extra;
    if (!String(f.name || '').trim()) return alert('Falta el nombre.');
    f.price = Number(f.price || 0);
    if (!f.price) return alert('Falta el precio.');

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
  },
  syncResellerSource() {
    if (this.forms.reseller.sourceType === 'plan') {
      const plans = this.plansBySaas(this.forms.reseller.saasId);
      if (!plans.find(p => p.id === this.forms.reseller.sourceId)) {
        this.forms.reseller.sourceId = plans[0]?.id || '';
      }
      return;
    }
    if (!this.db.extras.find(e => e.id === this.forms.reseller.sourceId)) {
      this.forms.reseller.sourceId = this.db.extras[0]?.id || '';
    }
  },
  editReseller(id) {
    const r = this.db.resellers.find(x => x.id === id);
    if (!r) return;
    this.forms.reseller = JSON.parse(JSON.stringify(r));
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

  refreshResellerHTML() {
    this.resellerHtml = this.resellerPricingHTML();
  },
  async copyResellerHTML() {
    this.refreshResellerHTML();
    const ok = await this.copyToClipboard(this.resellerHtml);
    if (ok) alert('HTML copiado.');
    else alert('No se pudo copiar el HTML.');
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
  exportAllCSV() {
    const header = [
      'area',
      'id',
      'name',
      'url',
      'logoUrl',
      'registerUrl',
      'loginUrl',
      'saasId',
      'planId',
      'sourceType',
      'sourceId',
      'frequency',
      'title',
      'description',
      'price',
      'costPrice',
      'salePrice',
      'deliveryTime',
      'requirements',
      'adName',
      'date',
      'dailySpend',
      'totalSpend',
      'extraIds',
      'email',
      'password',
      'notes',
      'links',
      'amount',
      'savedAt',
      'metaVersion'
    ];
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const buildRow = (area, data = {}) => header.map((key) => {
      if (key === 'area') return escapeCSV(area);
      if (key === 'extraIds') {
        const extras = Array.isArray(data.extraIds) ? data.extraIds.join('|') : data.extraIds;
        return escapeCSV(extras);
      }
      return escapeCSV(data[key]);
    });

    const rows = [header];
    this.db.saas.forEach((item) => rows.push(buildRow('saas', item)));
    this.db.plans.forEach((item) => rows.push(buildRow('plans', item)));
    this.db.campaigns.forEach((item) => rows.push(buildRow('campaigns', item)));
    this.db.extras.forEach((item) => rows.push(buildRow('extras', item)));
    this.db.resellers.forEach((item) => rows.push(buildRow('resellers', item)));
    this.db.clients.forEach((item) => rows.push(buildRow('clients', item)));
    this.db.expenses.forEach((item) => rows.push(buildRow('expenses', item)));
    rows.push(buildRow('meta', {
      savedAt: this.db.meta?.savedAt || '',
      metaVersion: this.db.meta?.version || ''
    }));

    const csv = rows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aapp_manager_export_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

  resetAll() {
    if (!confirm('RESET TOTAL: se borra todo el localStorage de esta app. ¿Continuar?')) return;
    const removed = this.safeStorageRemove(window.AAPPConstants.STORAGE_KEY);
    if (!removed) {
      alert('El almacenamiento local está bloqueado. No se pueden borrar los datos guardados.');
      return;
    }
    location.reload();
  }
};
