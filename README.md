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
