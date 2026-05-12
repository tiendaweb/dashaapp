FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY backend ./backend

RUN mkdir -p /app/backend/data

EXPOSE 3000

CMD ["sh", "-c", "node backend/src/scripts/migrate.js && node backend/src/scripts/seed.js && node backend/src/server.js"]
