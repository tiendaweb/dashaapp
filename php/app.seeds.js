window.AAPPSeeds = {
  seedMinimal({ persist = true } = {}) {
    this.db = {
      saas: [
        { id: this.uid(), name: 'AAPP.SPACE', url: 'https://aapp.space', logoUrl: '', registerUrl: '', loginUrl: '' },
        { id: this.uid(), name: 'MiniTienda', url: 'https://minitienda.uno', logoUrl: '', registerUrl: '', loginUrl: '' }
      ],
      domains: [],
      plans: [],
      campaigns: [],
      extras: [],
      resellers: [],
      partners: [],
      clients: [],
      posSales: [],
      expenses: [],
      tasks: [],
      notes: [],
      meta: { version: 1, savedAt: null }
    };
    if (persist) this.persist();
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
    const d1 = this.uid();
    const d2 = this.uid();
    const r1 = this.uid();
    const r2 = this.uid();
    const r3 = this.uid();
    const partner1 = this.uid();
    const sale1 = this.uid();
    const task1 = this.uid();
    const task2 = this.uid();
    const note1 = this.uid();
    const note2 = this.uid();

    this.db = {
      saas: [
        { id: s1, name: 'AAPP.SPACE', url: 'https://aapp.space', logoUrl: 'https://aapp.space/assets/logo.svg', registerUrl: 'https://aapp.space/register', loginUrl: 'https://aapp.space/login' },
        { id: s2, name: 'MiniTienda', url: 'https://minitienda.uno', logoUrl: 'https://minitienda.uno/logo.svg', registerUrl: 'https://minitienda.uno/register', loginUrl: 'https://minitienda.uno/login' }
      ],
      plans: [
        {
          id: p1,
          saasId: s1,
          frequency: 'Por mes',
          title: 'Básico',
          description: 'Sitio/tienda + WhatsApp + panel editable',
          price: 100000,
          features: [
            { label: 'Panel editable', enabled: true },
            { label: 'Dominio incluido', enabled: false }
          ],
          variableFeatures: [
            { key: 'Productos', value: '50' },
            { key: 'Usuarios', value: '2' }
          ]
        },
        {
          id: p2,
          saasId: s1,
          frequency: 'Por año',
          title: 'Premium',
          description: 'Más páginas + soporte + optimizaciones',
          price: 900000,
          features: [
            { label: 'Panel editable', enabled: true },
            { label: 'Dominio incluido', enabled: true }
          ],
          variableFeatures: [
            { key: 'Productos', value: '200' },
            { key: 'Usuarios', value: '5' }
          ]
        },
        {
          id: p3,
          saasId: s2,
          frequency: 'Por año',
          title: 'Oferta Anual',
          description: 'Tienda conectada a WhatsApp + carrito + pedidos',
          price: 150000,
          features: [
            { label: 'Carrito', enabled: true },
            { label: 'Soporte prioritario', enabled: false }
          ],
          variableFeatures: [
            { key: 'Productos', value: '80' }
          ]
        }
      ],
      campaigns: [
        { id: this.uid(), saasId: s2, adName: 'Meta Ads • Tienda WhatsApp', date: this.todayISO(), dailySpend: 15000, totalSpend: 19500, reach: 12000, views: 18000, costPerConversation: 800, notes: 'Campaña con foco en catálogo.' },
        { id: this.uid(), saasId: s1, adName: 'Lead Ads • AAPP.SPACE', date: this.todayISO(), dailySpend: 20000, totalSpend: 26000, reach: 15000, views: 24000, costPerConversation: 950, notes: 'Optimizada para leads.' }
      ],
      extras: [
        {
          id: e1,
          saasId: s1,
          name: 'Dominio .com / .com.ar',
          price: 50000,
          frequency: 'Por año',
          features: [{ label: 'Configuración incluida', enabled: true }],
          variableFeatures: [{ key: 'Renovaciones', value: '1 año' }]
        },
        {
          id: e2,
          saasId: s1,
          name: 'Diseño de logo',
          price: 25000,
          frequency: 'Única vez',
          features: [{ label: 'Incluye isotipo', enabled: true }],
          variableFeatures: [{ key: 'Opciones', value: '3' }]
        },
        {
          id: e3,
          saasId: s2,
          name: 'Setup / Configuración',
          price: 100000,
          frequency: 'Única vez',
          features: [{ label: 'Carga inicial', enabled: true }],
          variableFeatures: [{ key: 'Productos', value: '20' }]
        }
      ],
      resellers: [
        { id: r1, saasId: s1, sourceType: 'plan', sourceId: p1, costPrice: 60000, salePrice: 120000, deliveryTime: '2-3 días', requirements: 'Logo del cliente\nTexto de la propuesta' },
        { id: r2, saasId: s1, sourceType: 'plan', sourceId: p2, costPrice: 450000, salePrice: 850000, deliveryTime: '5-7 días', requirements: 'Branding completo\nAcceso a hosting actual' },
        { id: r3, saasId: s2, sourceType: 'extra', sourceId: e1, costPrice: 30000, salePrice: 60000, deliveryTime: '24-48 hs', requirements: 'Nombre de dominio\nDatos de facturación' }
      ],
      partners: [
        { id: partner1, name: 'Partner Norte', company: 'Agencia Delta', email: 'partner@delta.com', phone: '+54 11 5555-2222', commission: 15, notes: 'Especialista en ecommerce.' }
      ],
      clients: [
        { id: c1, name: 'Cliente Ejemplo 1', saasId: s2, planId: p3, extraIds: [e1], email: 'cliente1@mail.com', password: '1234', date: this.todayISO(), notes: 'Paga anual, pedir catálogo', links: 'Panel: /login' },
        { id: c2, name: 'Cliente Ejemplo 2', saasId: s1, planId: p1, extraIds: [e2, e3], email: 'cliente2@mail.com', password: 'abcd', date: this.todayISO(), notes: 'Quiere activar hoy', links: 'Drive: carpeta propuesta' }
      ],
      domains: [
        { id: d1, name: 'aapp.space', saasId: s1, clientId: '', provider: 'Cloudflare', status: 'Activo', delegated: true, pointed: true, captcha: true, notes: 'Renovar en 60 días' },
        { id: d2, name: 'tiendawpp.com.ar', saasId: s2, clientId: c1, provider: 'Nic.ar', status: 'Activo', delegated: false, pointed: true, captcha: false, notes: 'Facturación al cliente' }
      ],
      posSales: [
        { id: sale1, buyerName: 'Local Demo', buyerEmail: 'venta@demo.com', saasId: s1, planId: p1, extraIds: [e2], date: this.todayISO(), paymentMethod: 'Transferencia', amount: 125000, notes: 'Venta rápida POS.' }
      ],
      expenses: [
        { name: 'Hosting / VPS', amount: 25000, date: this.todayISO() }
      ],
      tasks: [
        { id: task1, title: 'Enviar propuesta inicial', saasId: s1, status: 'doing', notes: 'Esperando feedback del cliente.', checks: [{ label: 'Propuesta lista', done: true }, { label: 'Enviada por mail', done: true }, { label: 'Feedback recibido', done: false }] },
        { id: task2, title: 'Configurar dominio demo', saasId: s2, status: 'todo', notes: 'Usar Cloudflare + Nic.ar', checks: [{ label: 'Crear registro', done: false }, { label: 'Asignar SSL', done: false }] }
      ],
      notes: [
        { id: note1, saasId: s1, title: 'Claves AAPP.SPACE', content: 'Acceso panel admin\nUsuario: admin@aapp.space\nPass: demo123' },
        { id: note2, saasId: '', title: 'Plantilla onboarding', content: '1) Reunión kickoff\n2) Accesos + logo\n3) Checklist QA\n4) Entrega + seguimiento' }
      ],
      meta: { version: 1, savedAt: null }
    };

    this.persist();
    alert('Demo cargada.');
    this.closeModal();
  }
};
