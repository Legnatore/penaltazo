# Guía de Despliegue de PENALTAZO en AWS (Node.js + WebSockets)

Este proyecto está optimizado para ejecutarse en Node.js (v18+) con comunicación bidireccional en tiempo real vía **Socket.io**.

A continuación tienes las dos opciones más sencillas y recomendadas para desplegarlo en Amazon Web Services (AWS):

---

## Opción 1: AWS Lightsail (Recomendada: económica, sencilla y con IP fija)

AWS Lightsail es la opción más directa y barata (desde ~3.50$/mes) para proyectos Node.js:

1. **Crear una instancia:**
   - Entra en la consola de **AWS Lightsail**.
   - Haz clic en **Create instance**.
   - Elige **Linux/Unix** y plataforma **OS Only** -> **Ubuntu 22.04 LTS** (o el plano **Node.js** de Bitnami).
   - Selecciona el plan más básico (3.50$ o 5$/mes).

2. **Conectar por SSH y clonar el repositorio:**
   ```bash
   # Actualizar paquetes e instalar Node.js 20 si usas Ubuntu limpio:
   sudo apt update && sudo apt upgrade -y
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs git

   # Clonar el proyecto:
   git clone https://github.com/Legnatore/penaltazo.git
   cd penaltazo

   # Instalar dependencias:
   npm install --production

   # Instalar PM2 para mantener la app activa 24/7 en segundo plano:
   sudo npm install -g pm2
   pm2 start server.js --name "penaltazo"
   pm2 startup
   pm2 save
   ```

3. **Abrir el puerto en el Firewall de Lightsail:**
   - En la pestaña **Networking** de tu instancia en Lightsail, añade una regla de firewall:
     - **Custom / TCP / Port 3000** (o si pones Nginx delante, puertos 80 y 443).
   - ¡Listo! Accede a `http://TU_IP_PUBLICA:3000`.

---

## Opción 2: AWS App Runner (Sin gestionar servidores / Serverless)

Si prefieres no gestionar máquinas virtuales ni Linux:

1. En la consola de AWS busca **App Runner**.
2. Haz clic en **Create service**.
3. Elige **Source code repository** y conecta tu cuenta de **GitHub**.
4. Selecciona el repositorio `Legnatore/penaltazo` y la rama `main`.
5. En la configuración de compilación:
   - **Runtime:** `Nodejs 18` o `Nodejs 20`.
   - **Build command:** `npm install --production`
   - **Start command:** `node server.js`
   - **Port:** `3000`
6. Haz clic en **Deploy**. AWS te dará una URL segura con HTTPS y certificado SSL automático (compatible con WebSockets).

---

## Opción 3: Despliegue con Docker (Cualquier servicio AWS / ECS / Fargate)

El repositorio incluye un `Dockerfile` listo para usar:

```bash
docker build -t penaltazo .
docker run -d -p 3000:3000 --name penaltazo penaltazo
```
