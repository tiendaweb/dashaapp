window.AAPPFilters = {
  filteredSaaS() {
    return this.db.saas.filter(s =>
      this.matchQuery(s.name) || this.matchQuery(s.url) || this.matchQuery(s.logoUrl) || this.matchQuery(s.registerUrl) || this.matchQuery(s.loginUrl)
    );
  },

  filteredPlans() {
    return this.db.plans.filter(p =>
      this.matchQuery(p.title) ||
      this.matchQuery(p.description) ||
      this.matchQuery(this.saasName(p.saasId)) ||
      this.matchQuery((p.features || []).map(f => f.label).join(' ')) ||
      this.matchQuery((p.variableFeatures || []).map(f => `${f.key} ${f.value}`).join(' '))
    );
  },

  filteredCampaigns() {
    return this.db.campaigns.filter(c =>
      this.matchQuery(c.adName) || this.matchQuery(c.date) || this.matchQuery(this.saasName(c.saasId))
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  filteredExtras() {
    return this.db.extras.filter(e =>
      this.matchQuery(e.name) ||
      this.matchQuery(e.frequency) ||
      this.matchQuery(this.saasName(e.saasId)) ||
      this.matchQuery((e.features || []).map(f => f.label).join(' ')) ||
      this.matchQuery((e.variableFeatures || []).map(f => `${f.key} ${f.value}`).join(' '))
    );
  },

  filteredClients() {
    return this.db.clients.filter(cl => {
      const extrasText = (cl.extraIds || []).map(id => this.extraName(id)).join(' ');
      return (
        this.matchQuery(cl.name) ||
        this.matchQuery(cl.notes) ||
        this.matchQuery(cl.links) ||
        this.matchQuery(cl.email) ||
        this.matchQuery(this.saasName(cl.saasId)) ||
        this.matchQuery(this.planTitle(cl.planId)) ||
        this.matchQuery(extrasText)
      );
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  filteredResellers() {
    return this.db.resellers.filter((r) => (
      this.matchQuery(this.saasName(r.saasId)) ||
      this.matchQuery(this.resellerBaseName(r)) ||
      this.matchQuery(this.resellerTypeLabel(r)) ||
      this.matchQuery(r.deliveryTime) ||
      this.matchQuery(r.requirements)
    ));
  },

  filteredPartners() {
    return this.db.partners.filter((p) => (
      this.matchQuery(p.name) ||
      this.matchQuery(p.company) ||
      this.matchQuery(p.email) ||
      this.matchQuery(p.phone) ||
      this.matchQuery(p.notes)
    ));
  },

  filteredPosSales() {
    return this.db.posSales.filter((sale) => (
      this.matchQuery(sale.buyerName) ||
      this.matchQuery(sale.buyerEmail) ||
      this.matchQuery(this.saasName(sale.saasId)) ||
      this.matchQuery(this.planTitle(sale.planId)) ||
      this.matchQuery((sale.extraIds || []).map(id => this.extraName(id)).join(' ')) ||
      this.matchQuery(sale.paymentMethod) ||
      this.matchQuery(sale.notes)
    )).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  totalRecordsFiltered() {
    switch (this.activeTab) {
      case 'saas': return this.filteredSaaS().length;
      case 'plans': return this.filteredPlans().length;
      case 'campaigns': return this.filteredCampaigns().length;
      case 'clients': return this.filteredClients().length;
      case 'extras': return this.filteredExtras().length;
      case 'resellers': return this.filteredResellers().length;
      case 'partners': return this.filteredPartners().length;
      case 'pos': return this.filteredPosSales().length;
      default: return this.db.saas.length + this.db.plans.length + this.db.campaigns.length + this.db.clients.length + this.db.extras.length + this.db.resellers.length + this.db.partners.length + this.db.posSales.length;
    }
  }
};
