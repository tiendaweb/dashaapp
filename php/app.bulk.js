// Utilidades para altas masivas en cualquier CRUD actual o futuro.
window.AAPPBulk = {
  bulkDefaults(area) {
    const defaults = {
      saas: { id: '', name: '', url: '', logoUrl: '', registerUrl: '', loginUrl: '' },
      domains: { id: '', name: '', saasId: '', clientId: '', provider: '', status: 'Activo', notes: '' },
      plans: { id: '', saasId: '', frequency: 'Por mes', title: '', description: '', price: 0, features: [], variableFeatures: [] },
      campaigns: { id: '', saasId: '', adName: '', date: '', dailySpend: 0, totalSpend: 0, reach: 0, views: 0, costPerConversation: 0, notes: '' },
      extras: { id: '', saasId: '', name: '', price: 0, frequency: 'Única vez', features: [], variableFeatures: [] },
      resellers: { id: '', saasId: '', sourceType: 'plan', sourceId: '', costPrice: 0, salePrice: 0, deliveryTime: '', requirements: '' },
      partners: { id: '', name: '', company: '', email: '', phone: '', commission: 0, notes: '' },
      clients: { id: '', name: '', saasId: '', planId: '', extraIds: [], email: '', password: '', date: '', notes: '', links: '' },
      posSales: { id: '', buyerName: '', buyerEmail: '', saasId: '', planId: '', extraIds: [], date: '', paymentMethod: '', amount: 0, notes: '' },
      expenses: { name: '', amount: 0, date: '' }
    };
    return defaults[area] ? { ...defaults[area] } : { id: '' };
  },

  normalizeBulkRecord(area, raw = {}, customDefaults = {}) {
    const defaults = this.bulkDefaults(area);
    const payload = { ...defaults, ...customDefaults, ...(raw || {}) };
    if (!payload.id) payload.id = this.uid();

    if (area === 'plans') {
      payload.price = Number(payload.price || 0);
      payload.features = typeof this.cleanFeatures === 'function' ? this.cleanFeatures(payload.features) : (payload.features || []);
      payload.variableFeatures = typeof this.cleanVariableFeatures === 'function' ? this.cleanVariableFeatures(payload.variableFeatures) : (payload.variableFeatures || []);
    } else if (area === 'extras') {
      payload.price = Number(payload.price || 0);
      payload.features = typeof this.cleanFeatures === 'function' ? this.cleanFeatures(payload.features) : (payload.features || []);
      payload.variableFeatures = typeof this.cleanVariableFeatures === 'function' ? this.cleanVariableFeatures(payload.variableFeatures) : (payload.variableFeatures || []);
      payload.frequency = payload.frequency || 'Única vez';
    } else if (area === 'campaigns') {
      payload.dailySpend = Number(payload.dailySpend || 0);
      payload.totalSpend = Number(payload.totalSpend || 0);
      payload.reach = Number(payload.reach || 0);
      payload.views = Number(payload.views || 0);
      payload.costPerConversation = Number(payload.costPerConversation || 0);
      payload.date = payload.date || this.todayISO();
    } else if (area === 'resellers') {
      payload.costPrice = Number(payload.costPrice || 0);
      payload.salePrice = Number(payload.salePrice || 0);
      payload.deliveryTime = payload.deliveryTime || '';
      payload.requirements = payload.requirements || '';
    } else if (area === 'clients') {
      payload.extraIds = Array.isArray(payload.extraIds) ? payload.extraIds : [];
      payload.date = payload.date || this.todayISO();
    } else if (area === 'posSales') {
      payload.extraIds = Array.isArray(payload.extraIds) ? payload.extraIds : [];
      payload.amount = Number(payload.amount || 0);
      payload.date = payload.date || this.todayISO();
    } else if (area === 'expenses') {
      payload.amount = Number(payload.amount || 0);
      payload.date = payload.date || this.todayISO();
    }

    return payload;
  },

  bulkAddRecords(area, records = [], options = {}) {
    const list = Array.isArray(records) ? records : [];
    if (!area || !list.length) return { added: 0, updated: 0, skipped: list.length || 0 };

    if (!Array.isArray(this.db[area])) this.db[area] = [];
    const collection = this.db[area];
    const existing = new Map(collection.map((item) => [item.id, item]));
    const summary = { added: 0, updated: 0, skipped: 0 };

    list.forEach((item) => {
      const normalized = this.normalizeBulkRecord(area, item, options.defaults || {});
      const current = existing.get(normalized.id);

      if (current) {
        if (options.overwrite) {
          Object.assign(current, normalized);
          summary.updated += 1;
        } else {
          summary.skipped += 1;
        }
        return;
      }

      collection.push(normalized);
      existing.set(normalized.id, normalized);
      summary.added += 1;
    });

    if ((summary.added || summary.updated) && options.persist !== false) {
      this.persist();
    }

    return summary;
  },

  bulkAddAll(payload = {}, options = {}) {
    const results = {};
    Object.entries(payload || {}).forEach(([area, records]) => {
      results[area] = this.bulkAddRecords(area, records, { ...options, persist: false });
    });

    const shouldPersist = Object.values(results).some((res) => (res?.added || res?.updated));
    if (shouldPersist && options.persist !== false) {
      this.persist();
    }

    return results;
  }
};
