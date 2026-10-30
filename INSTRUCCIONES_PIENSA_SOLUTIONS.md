# Guía de Instalación en Personal Hosting de Piensa Solutions

¡Tu proyecto **PENALTAZO** ya está 100% convertido y preparado para funcionar en tu hosting de Piensa Solutions con **PHP 8.4**!

No necesitas configurar ninguna base de datos MySQL, ni contraseñas, ni terminal SSH. Todo el sistema funciona directamente mediante el backend PHP y almacenamiento ligero protegido.

---

## 📁 ¿Qué archivos hay que subir?

Debes subir todo el contenido de la carpeta `public/` de este repositorio a la carpeta pública de tu hosting en Piensa Solutions.

La estructura que debe quedar en la carpeta de tu dominio (`public_html/` o la raíz FTP de `penaltazo.es`):

```text
public_html/ (o raíz web)
├── api/
│   ├── common.php
│   ├── game.php
│   ├── tournament.php
│   ├── tournament_helper.php
│   └── .htaccess
├── assets/
│   ├── audio/
│   └── icons/
├── css/
│   ├── animations.css
│   └── style.css
├── js/
│   ├── ai-opponent.js
│   ├── animation.js
│   ├── audio.js
│   ├── goal-grid.js
│   ├── main.js
│   ├── network.js
│   ├── qr.js
│   ├── scoreboard.js
│   └── tournament.js
├── .htaccess
├── ads.txt
├── favicon.ico
├── favicon.png
├── index.html
├── index.php
├── manifest.json
└── sw.js
```

> **Nota:** La carpeta `data/` se creará automáticamente la primera vez que se juegue una partida para guardar las salas y torneos de forma segura y protegida contra descargas externas.

---

## 🚀 Pasos para subirlo por FTP

1. **Obtén tus datos de FTP en Piensa Solutions:**
   - En tu panel de control de Piensa Solutions (icono **FTP** o pestaña **Cuentas de FTP**):
     - **Servidor / Host:** `ftp.penaltazo.es` (o la IP del servidor que te indique Piensa Solutions).
     - **Usuario:** El usuario que creaste o el asignado por defecto.
     - **Contraseña:** Tu contraseña FTP.
     - **Puerto:** `21`

2. **Abre un cliente FTP (como FileZilla o WinSCP):**
   - Conéctate con tus credenciales.
   - En el panel derecho (servidor remoto), entra en la carpeta web principal (suele llamarse `public_html`, `httpdocs` o directamente `/`).
   - En el panel izquierdo (tu ordenador local), entra en la carpeta `public` de este proyecto:
     `F:\Github de Legnatore\penaltazo\public`

3. **Sube los archivos:**
   - Selecciona todos los archivos y carpetas dentro de `public/` y arrástralos a la carpeta remota.
   - Espera a que termine la subida (tarda apenas 1 o 2 minutos).

4. **Comprobación:**
   - Abre en tu navegador: `https://penaltazo.es` (o `http://penaltazo.es`).
   - ¡Verás el juego funcionando con todas sus funciones activas: 1v1 online entre amigos, torneos eliminatorios, modo contra la máquina (IA) y desafíos asíncronos!
