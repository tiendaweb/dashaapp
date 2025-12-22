window.AAPPFilters = {
  filteredSaaS() {
    return this.db.saas.filter(s =>
      this.matchQuery(s.name) || this.matchQuery(s.url) || this.matchQuery(s.registerUrl) || this.matchQuery(s.loginUrl)
    );
  },

  filteredPlans() {
    return this.db.plans.filter(p =>
      this.matchQuery(p.title) || this.matchQuery(p.description) || this.matchQuery(this.saasName(p.saasId))
    );
  },

  filteredCampaigns() {
    return this.db.campaigns.filter(c =>
      this.matchQuery(c.adName) || this.matchQuery(c.date) || this.matchQuery(this.saasName(c.saasId))
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  filteredExtras() {
    return this.db.extras.filter(e =>
      this.matchQuery(e.name) || this.matchQuery(e.frequency)
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

  totalRecordsFiltered() {
    switch (this.activeTab) {
      case 'saas': return this.filteredSaaS().length;
      case 'plans': return this.filteredPlans().length;
      case 'campaigns': return this.filteredCampaigns().length;
      case 'clients': return this.filteredClients().length;
      case 'extras': return this.filteredExtras().length;
      default: return this.db.saas.length + this.db.plans.length + this.db.campaigns.length + this.db.clients.length + this.db.extras.length;
    }
  }
};
