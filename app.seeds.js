window.AAPPSeeds = {
  seedMinimal() {
    this.db = {
      saas: [
        { id: this.uid(), name: 'AAPP.SPACE', url: 'https://aapp.space', registerUrl: '', loginUrl: '' },
        { id: this.uid(), name: 'MiniTienda', url: 'https://minitienda.uno', registerUrl: '', loginUrl: '' }
      ],
      plans: [],
      campaigns: [],
      extras: [],
      clients: [],
      expenses: [],
      meta: { version: 1, savedAt: null }
    };
    this.persist();
  },

  seedDemo() {
    const s1 = this.uid();
    const s2 = this.uid();
    const p1 = this.uid();
    const p2 = this.uid();
    const p3 = this.uid();
    const e1 = this.uid();
    const e2 = this.uid();
    const e3 = this.uid();
    const c1 = this.uid();
    const c2 = this.uid();

    this.db = {
      saas: [
        { id: s1, name: 'AAPP.SPACE', url: 'https://aapp.space', registerUrl: 'https://aapp.space/register', loginUrl: 'https://aapp.space/login' },
        { id: s2, name: 'MiniTienda', url: 'https://minitienda.uno', registerUrl: 'https://minitienda.uno/register', loginUrl: 'https://minitienda.uno/login' }
      ],
      plans: [
        { id: p1, saasId: s1, frequency: 'Por mes', title: 'Básico', description: 'Sitio/tienda + WhatsApp + panel editable', price: 100000 },
        { id: p2, saasId: s1, frequency: 'Por año', title: 'Premium', description: 'Más páginas + soporte + optimizaciones', price: 900000 },
        { id: p3, saasId: s2, frequency: 'Por año', title: 'Oferta Anual', description: 'Tienda conectada a WhatsApp + carrito + pedidos', price: 150000 }
      ],
      campaigns: [
        { id: this.uid(), saasId: s2, adName: 'Meta Ads • Tienda WhatsApp', date: this.todayISO(), dailySpend: 15000, totalSpend: 19500 },
        { id: this.uid(), saasId: s1, adName: 'Lead Ads • AAPP.SPACE', date: this.todayISO(), dailySpend: 20000, totalSpend: 26000 }
      ],
      extras: [
        { id: e1, name: 'Dominio .com / .com.ar', price: 50000, frequency: 'Por año' },
        { id: e2, name: 'Diseño de logo', price: 25000, frequency: 'Única vez' },
        { id: e3, name: 'Setup / Configuración', price: 100000, frequency: 'Única vez' }
      ],
      clients: [
        { id: c1, name: 'Cliente Ejemplo 1', saasId: s2, planId: p3, extraIds: [e1], email: 'cliente1@mail.com', password: '1234', date: this.todayISO(), notes: 'Paga anual, pedir catálogo', links: 'Panel: /login' },
        { id: c2, name: 'Cliente Ejemplo 2', saasId: s1, planId: p1, extraIds: [e2, e3], email: 'cliente2@mail.com', password: 'abcd', date: this.todayISO(), notes: 'Quiere activar hoy', links: 'Drive: carpeta propuesta' }
      ],
      expenses: [
        { name: 'Hosting / VPS', amount: 25000, date: this.todayISO() }
      ],
      meta: { version: 1, savedAt: null }
    };

    this.persist();
    alert('Demo cargada.');
    this.closeModal();
  }
};
