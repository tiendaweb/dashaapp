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
      this.matchQuery(c.adName) || this.matchQuery(c.date) || this.matchQuery(this.saasName(c.saasId)) || this.matchQuery(c.notes)
    ).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  },

  filteredDomains() {
    const list = this.db.domains.filter((d) => {
      const matchesQ = this.matchQuery(d.name) || this.matchQuery(d.provider) || this.matchQuery(d.status) || this.matchQuery(d.notes) || this.matchQuery(this.saasName(d.saasId)) || this.matchQuery(this.clientName(d.clientId));
      if (!matchesQ) return false;
      if (this.domainFilterSaasId && d.saasId !== this.domainFilterSaasId) return false;
      return true;
    });
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

  filteredTasks() {
    return this.db.tasks.filter((t) => (
      this.matchQuery(t.title) ||
      this.matchQuery(t.notes) ||
      this.matchQuery(t.status) ||
      this.matchQuery(this.saasName(t.saasId)) ||
      this.matchQuery((t.checks || []).map((c) => c.label).join(' '))
    ));
  },

  filteredNotes() {
    return this.db.notes
      .filter((n) => {
        if (this.noteFilterSaasId && n.saasId !== this.noteFilterSaasId) return false;
        return this.matchQuery(n.title) || this.matchQuery(n.content) || this.matchQuery(this.saasName(n.saasId));
      })
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  },

  totalRecordsFiltered() {
    switch (this.activeTab) {
      case 'saas': return this.filteredSaaS().length;
      case 'domains': return this.filteredDomains().length;
      case 'plans': return this.filteredPlans().length;
      case 'campaigns': return this.filteredCampaigns().length;
      case 'clients': return this.filteredClients().length;
      case 'extras': return this.filteredExtras().length;
      case 'resellers': return this.filteredResellers().length;
      case 'partners': return this.filteredPartners().length;
      case 'pos': return this.filteredPosSales().length;
      case 'tasks': return this.filteredTasks().length;
      case 'notes': return this.filteredNotes().length;
      default: return this.db.saas.length + this.db.domains.length + this.db.plans.length + this.db.campaigns.length + this.db.clients.length + this.db.extras.length + this.db.resellers.length + this.db.partners.length + this.db.posSales.length + this.db.tasks.length + this.db.notes.length;
    }
  }
};
