# Imagem da API (Node + Express). O build usa a raiz do repositório como contexto.
FROM node:22-alpine

WORKDIR /app/backend

# Instala as dependências primeiro para aproveitar o cache do Docker
COPY backend/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Código da API e o front-end (servido pelo próprio Express)
COPY backend/ ./
COPY frontend/ /app/frontend/

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node
CMD ["node", "src/server.js"]
