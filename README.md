# DashaApp Backend (Node + SQLite)

## Requisitos
- Node.js 20+
- npm 10+
- (Opcional) Docker + Docker Compose

## 1) Instalar dependencias
```bash
npm install
```

## 2) Migrar y seed
```bash
npm run migrate
npm run seed
```

## 3) Ejecutar local
```bash
npm run dev
```

API disponible en: `http://localhost:3000`

## Arquitectura de persistencia

- **SQLite (`backend/data/app.sqlite`)**
  - Entidades de negocio: `companies`, `plans`, `subscriptions`, `users`, `roles`, `permissions`, `modules`, `plan_modules`, `auth_sessions`.
  - Endpoints `/api/saas`, `/api/plans`, `/api/clients` y `/api/subscriptions` leen desde estas tablas SQL.
- **Archivo JSON (`backend/data/state.json`)**
  - Se mantiene como almacenamiento **legacy/genérico** para pruebas rápidas de estado.
  - Endpoints asociados: `/api/state`, `/api/state/reset` y alias explícitos `/api/legacy/state`, `/api/legacy/state/reset`.
  - Este dominio legacy está separado del dominio SaaS persistido en SQLite.

## Credenciales del usuario admin (seed)
- **Email:** `admin@example.com`
- **Password:** `Admin12345!`

> Si cambiaste los seeds, ajusta estas credenciales según `backend/seeds/001_base_seed.js`.

## 4) Ejecutar con Docker

1. Copia variables de entorno:
   ```bash
   cp .env.example .env
   ```
2. Levanta el backend con build:
   ```bash
   docker compose up --build
   ```

La base SQLite queda persistida en el volumen `sqlite_data` montado en `/app/backend/data`.

## Comando único de arranque (Docker)
```bash
docker compose up --build
```

Este flujo ejecuta migraciones y seed automáticamente antes de iniciar el servidor Node.
