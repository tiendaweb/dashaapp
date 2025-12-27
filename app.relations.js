window.AAPPRelations = {
  saasName(saasId) {
    return this.db.saas.find(x => x.id === saasId)?.name || '-';
  },
  saasLogo(saasId) {
    return this.db.saas.find(x => x.id === saasId)?.logoUrl || '';
  },
  clientName(clientId) {
    return this.db.clients.find(x => x.id === clientId)?.name || '-';
  },
  plansBySaas(saasId) {
    if (!saasId) return [];
    return this.db.plans.filter(p => p.saasId === saasId);
  },
  extrasBySaas(saasId) {
    if (!saasId) return [];
    return this.db.extras.filter(e => e.saasId === saasId || !e.saasId);
  },
  resellersBySaas(saasId) {
    if (!saasId) return [];
    return this.db.resellers.filter(r => r.saasId === saasId);
  },
  campaignsBySaas(saasId) {
    if (!saasId) return [];
    return this.db.campaigns.filter(c => c.saasId === saasId);
  },
  countPlansBySaas(saasId) {
    return this.db.plans.filter(p => p.saasId === saasId).length;
  },
  countClientsBySaas(saasId) {
    return this.db.clients.filter(c => c.saasId === saasId).length;
  },

  planTitle(planId) {
    return this.db.plans.find(p => p.id === planId)?.title || '-';
  },
  planFrequency(planId) {
    return this.db.plans.find(p => p.id === planId)?.frequency || '-';
  },
  planPrice(planId) {
    return Number(this.db.plans.find(p => p.id === planId)?.price || 0);
  },

  extraName(extraId) {
    return this.db.extras.find(e => e.id === extraId)?.name || '(extra borrado)';
  },
  extraPrice(extraId) {
    return Number(this.db.extras.find(e => e.id === extraId)?.price || 0);
  },
  extraFrequency(extraId) {
    return this.db.extras.find(e => e.id === extraId)?.frequency || 'Única vez';
  },

  resellerBase(reseller) {
    if (!reseller) return { name: '-', frequency: '-', price: 0 };
    if (reseller.sourceType === 'plan') {
      const plan = this.db.plans.find(p => p.id === reseller.sourceId);
      return {
        name: plan?.title || '(plan borrado)',
        frequency: plan?.frequency || '-',
        price: Number(plan?.price || 0)
      };
    }
    const extra = this.db.extras.find(e => e.id === reseller.sourceId);
    return {
      name: extra?.name || '(extra borrado)',
      frequency: extra?.frequency || 'Única vez',
      price: Number(extra?.price || 0)
    };
  },
  resellerBaseName(reseller) {
    return this.resellerBase(reseller).name;
  },
  resellerBaseFrequency(reseller) {
    return this.resellerBase(reseller).frequency;
  },
  resellerBasePrice(reseller) {
    return this.resellerBase(reseller).price;
  },
  resellerTypeLabel(reseller) {
    return reseller?.sourceType === 'plan' ? 'Plan' : 'Extra';
  },

  tasksByStatus(status) {
    return this.filteredTasks().filter((t) => t.status === status);
  },
  taskProgress(task) {
    const total = (task.checks || []).length;
    const done = (task.checks || []).filter((c) => c.done).length;
    return { done, total };
  },
  taskStatusLabel(status) {
    const map = { todo: 'Por hacer', doing: 'En progreso', done: 'Listo' };
    return map[status] || status;
  },
  noteCompany(note) {
    return note?.saasId ? this.saasName(note.saasId) : 'General';
  }
};
