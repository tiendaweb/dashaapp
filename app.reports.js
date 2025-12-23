window.AAPPReports = {
  calcTaxes(c) {
    const daily = Number(c?.dailySpend || 0);
    const total = Number(c?.totalSpend || 0);
    const taxes = total - daily;
    return taxes > 0 ? taxes : 0;
  },
  calcTotalWithTaxes(c) {
    const daily = Number(c?.dailySpend || 0);
    const total = Number(c?.totalSpend || 0);
    // si el user no completa total, asumimos "sin impuestos"
    if (!total || total <= 0) return daily;
    // si total es menor que daily, no tiene sentido: devolvemos daily
    return total < daily ? daily : total;
  },

  // Totals / reports
  sumDailySpendAll() {
    return this.db.campaigns.reduce((acc, c) => acc + Number(c.dailySpend || 0), 0);
  },
  totalAdsSpendAllTime() {
    return this.db.campaigns.reduce((acc, c) => acc + this.calcTotalWithTaxes(c), 0);
  },
  totalAdsSpendBySaas(saasId) {
    return this.db.campaigns
      .filter(c => c.saasId === saasId)
      .reduce((acc, c) => acc + this.calcTotalWithTaxes(c), 0);
  },
  sumDailySpendBySaas(saasId) {
    return this.db.campaigns
      .filter(c => c.saasId === saasId)
      .reduce((acc, c) => acc + Number(c.dailySpend || 0), 0);
  },
  adsSpendToday() {
    // estimación: suma totalWithTaxes por campaña (como lo pediste)
    return this.db.campaigns.reduce((acc, c) => acc + this.calcTotalWithTaxes(c), 0);
  },
  adsSpendWeek() {
    return this.adsSpendToday() * 7;
  },

  // Client totals (normalizado a "mensual estimado" para dashboard)
  normalizeToMonthly(amount, frequency) {
    const v = Number(amount || 0);
    if (frequency === 'Por año') return v / 12;
    if (frequency === 'Por mes') return v;
    // Única vez: lo prorrateamos en 12 para estimación suave (podés cambiarlo)
    if (frequency === 'Única vez') return v / 12;
    return v;
  },

  clientTotal(cl) {
    // total nominal (no normalizado): plan + extras (sumando como estén)
    const plan = this.db.plans.find(p => p.id === cl.planId);
    const planPrice = Number(plan?.price || 0);
    let extras = 0;
    (cl.extraIds || []).forEach(id => extras += this.extraPrice(id));
    return planPrice + extras;
  },

  incomePlansMonthlyEstimate() {
    return this.db.clients.reduce((acc, cl) => {
      const plan = this.db.plans.find(p => p.id === cl.planId);
      acc += this.normalizeToMonthly(plan?.price || 0, plan?.frequency || 'Por mes');
      return acc;
    }, 0);
  },

  incomeExtrasMonthlyEstimate() {
    return this.db.clients.reduce((acc, cl) => {
      (cl.extraIds || []).forEach(id => {
        acc += this.normalizeToMonthly(this.extraPrice(id), this.extraFrequency(id));
      });
      return acc;
    }, 0);
  },

  totalIncomeEstimate() {
    return this.incomePlansMonthlyEstimate() + this.incomeExtrasMonthlyEstimate();
  },

  incomeEstimateBySaas(saasId) {
    return this.db.clients
      .filter(cl => cl.saasId === saasId)
      .reduce((acc, cl) => {
        const plan = this.db.plans.find(p => p.id === cl.planId);
        acc += this.normalizeToMonthly(plan?.price || 0, plan?.frequency || 'Por mes');
        (cl.extraIds || []).forEach(id => {
          acc += this.normalizeToMonthly(this.extraPrice(id), this.extraFrequency(id));
        });
        return acc;
      }, 0);
  },

  maxIncomeBySaas() {
    if (!this.db.saas.length) return 1;
    return Math.max(1, ...this.db.saas.map(s => this.incomeEstimateBySaas(s.id)));
  },

  maxClientsBySaas() {
    if (!this.db.saas.length) return 1;
    return Math.max(1, ...this.db.saas.map(s => this.countClientsBySaas(s.id)));
  },

  domainExtrasCount() {
    // heurística: cuenta extras que contengan "dominio"
    const domainExtraIds = this.db.extras
      .filter(e => (e.name || '').toLowerCase().includes('dominio'))
      .map(e => e.id);

    return this.db.clients.reduce((acc, cl) => {
      const has = (cl.extraIds || []).some(id => domainExtraIds.includes(id));
      return acc + (has ? 1 : 0);
    }, 0);
  },

  totalExpensesManual() {
    return this.db.expenses.reduce((acc, ex) => acc + Number(ex.amount || 0), 0);
  },

  balanceEstimate() {
    // Saldo estimado: ingresos (mensual estimado) - egresos manuales - ads total
    return this.totalIncomeEstimate() - this.totalExpensesManual() - this.totalAdsSpendAllTime();
  }
};
