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
  },

  resellerPricingHTML() {
    const sections = this.db.saas.map((saas) => {
      const items = this.db.resellers.filter(r => r.saasId === saas.id);
      if (!items.length) return '';

      const logo = saas.logoUrl
        ? `<img src="${this.escapeHTML(saas.logoUrl)}" alt="${this.escapeHTML(saas.name)} logo" class="logo" />`
        : `<div class="logo-placeholder">${this.escapeHTML(saas.name || '?').slice(0, 1)}</div>`;

      const cards = items.map((r) => {
        const base = this.resellerBase(r);
        const requirements = String(r.requirements || '').split('\n').map(line => line.trim()).filter(Boolean);
        const requirementsHtml = requirements.length
          ? `<ul>${requirements.map(req => `<li>${this.escapeHTML(req)}</li>`).join('')}</ul>`
          : `<p class="muted">Sin requisitos cargados.</p>`;

        return `
          <article class="card">
            <div class="card-header">
              <span class="badge">${this.escapeHTML(this.resellerTypeLabel(r))}</span>
              <span class="title">${this.escapeHTML(base.name)}</span>
              <span class="subtitle">${this.escapeHTML(base.frequency)}</span>
            </div>
            <div class="price-row">
              <div>
                <div class="label">Precio sugerido</div>
                <div class="price">${this.escapeHTML(this.fmtMoney(r.salePrice))}</div>
              </div>
              <div>
                <div class="label">Costo</div>
                <div class="price muted">${this.escapeHTML(this.fmtMoney(r.costPrice))}</div>
              </div>
            </div>
            <div class="detail">
              <div class="label">Precio base actual</div>
              <div class="value">${this.escapeHTML(this.fmtMoney(base.price))}</div>
            </div>
            <div class="detail">
              <div class="label">Tiempo de entrega</div>
              <div class="value">${this.escapeHTML(r.deliveryTime || 'A confirmar')}</div>
            </div>
            <div class="detail">
              <div class="label">Requisitos</div>
              ${requirementsHtml}
            </div>
          </article>
        `;
      }).join('');

      return `
        <section class="saas-section">
          <header class="saas-header">
            ${logo}
            <div>
              <h2>${this.escapeHTML(saas.name)}</h2>
              <p>${this.escapeHTML(saas.url || '')}</p>
            </div>
          </header>
          <div class="cards">
            ${cards}
          </div>
        </section>
      `;
    }).join('');

    return `<!doctype html>
<html lang="es-AR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Planes para revendedores</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #0f172a;
      --panel: #111827;
      --card: #0b1220;
      --accent: #38bdf8;
      --text: #e2e8f0;
      --muted: #94a3b8;
    }
    * { box-sizing: border-box; font-family: "Inter", system-ui, -apple-system, sans-serif; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    .hero { padding: 48px 24px; text-align: center; background: radial-gradient(circle at top, rgba(56,189,248,.25), transparent 60%); }
    .hero h1 { margin: 0 0 8px; font-size: 32px; font-weight: 800; }
    .hero p { margin: 0; color: var(--muted); font-size: 15px; }
    .container { max-width: 1100px; margin: 0 auto; padding: 32px 24px 64px; display: grid; gap: 32px; }
    .saas-section { background: var(--panel); border-radius: 20px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,.25); }
    .saas-header { display: flex; gap: 16px; align-items: center; margin-bottom: 24px; }
    .saas-header h2 { margin: 0; font-size: 22px; font-weight: 700; }
    .saas-header p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
    .logo { width: 56px; height: 56px; border-radius: 16px; object-fit: contain; background: #0b1220; padding: 8px; border: 1px solid rgba(255,255,255,.08); }
    .logo-placeholder { width: 56px; height: 56px; border-radius: 16px; display: grid; place-items: center; background: rgba(56,189,248,.15); color: var(--accent); font-weight: 700; font-size: 20px; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .card { background: var(--card); border-radius: 16px; padding: 20px; border: 1px solid rgba(255,255,255,.06); display: grid; gap: 16px; }
    .card-header { display: grid; gap: 6px; }
    .badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--accent); }
    .title { font-size: 18px; font-weight: 700; }
    .subtitle { font-size: 13px; color: var(--muted); }
    .price-row { display: flex; gap: 12px; justify-content: space-between; align-items: center; }
    .price { font-size: 22px; font-weight: 800; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
    .detail { display: grid; gap: 6px; }
    .detail ul { margin: 0; padding-left: 18px; color: var(--text); }
    .detail li { margin-bottom: 4px; }
    .muted { color: var(--muted); font-size: 13px; }
  </style>
</head>
<body>
  <section class="hero">
    <h1>Planes para revendedores</h1>
    <p>Información actualizada de planes y servicios con costos, precios sugeridos y requisitos.</p>
  </section>
  <main class="container">
    ${sections || '<p class="muted">No hay planes revendedores cargados.</p>'}
  </main>
</body>
</html>`;
  }
};
