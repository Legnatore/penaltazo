FROM node:20-alpine

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --production

# Copiar el código de la aplicación
COPY . .

# Puerto por defecto
ENV PORT=3000
EXPOSE 3000

# Arrancar la aplicación
CMD ["node", "server.js"]
