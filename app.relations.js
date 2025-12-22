window.AAPPRelations = {
  saasName(saasId) {
    return this.db.saas.find(x => x.id === saasId)?.name || '-';
  },
  plansBySaas(saasId) {
    if (!saasId) return [];
    return this.db.plans.filter(p => p.saasId === saasId);
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
  }
};
