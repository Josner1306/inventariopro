# InventaPro Familiar 📺🔊💡

Sistema de inventario para pantallas, equipos de sonido, iluminación y más.

---

## 🚀 Despliegue gratuito en Render.com (recomendado)

### Paso 1 — Subir el código a GitHub
1. Ve a https://github.com y crea una cuenta (gratis)
2. Haz clic en **New repository** → ponle nombre: `inventapro`
3. Sube todos los archivos de esta carpeta al repositorio

   Si tienes Git instalado:
   ```bash
   git init
   git add .
   git commit -m "InventaPro Familiar"
   git remote add origin https://github.com/TU_USUARIO/inventapro.git
   git push -u origin main
   ```

### Paso 2 — Conectar a Render.com
1. Ve a https://render.com y crea una cuenta con tu correo (gratis)
2. Haz clic en **New → Web Service**
3. Conecta tu cuenta de GitHub y selecciona el repositorio `inventapro`
4. Render detectará automáticamente la configuración del `render.yaml`
5. Haz clic en **Create Web Service**

### Paso 3 — Agregar disco persistente (para guardar datos)
1. En tu servicio en Render, ve a **Disks** → **Add Disk**
2. Nombre: `inventario-data`
3. Mount path: `/opt/render/project/src/data`
4. Size: 1 GB (gratis)
5. Guarda los cambios

### Paso 4 — ¡Listo!
- Render te dará una URL tipo: `https://inventapro-familiar.onrender.com`
- Comparte esa URL con toda la familia
- Funciona en computadora, tablet y celular

---

## 💻 Usar en red local (sin internet)

Requiere tener Node.js instalado (https://nodejs.org):

```bash
# En la carpeta del proyecto:
npm install
node server.js
```

El sistema estará en: http://localhost:3000

Para que otros en la misma WiFi accedan, busca tu IP local:
- Windows: ejecuta `ipconfig` → busca "IPv4 Address"
- Mac/Linux: ejecuta `ifconfig` → busca "inet"

Comparte: `http://192.168.X.X:3000` con tu familia.

---

## 📁 Estructura del proyecto

```
inventapro/
├── server.js          → Servidor Node.js + API REST
├── package.json       → Dependencias
├── render.yaml        → Configuración de Render
├── data/              → Base de datos SQLite (se crea automático)
│   ├── inventario.db
│   └── uploads/       → Imágenes de productos
└── public/
    └── index.html     → Interfaz web completa
```

---

## 📋 Importar desde Excel

El archivo Excel/CSV debe tener estas columnas:
| Nombre | Categoría | Modelo | N° Serie | N° Parte | Cantidad |
|--------|-----------|--------|----------|----------|----------|
| TV Samsung 55" | Pantallas | UN55TU7000 | SN-001 | PT-012 | 3 |

- Si el producto ya existe, **suma** la cantidad (no duplica)
- Formatos aceptados: `.xlsx`, `.xls`, `.csv`

---

## 🌐 Acceso multi-usuario

Una vez desplegado en Render, cualquier familiar puede acceder
desde su celular o computadora al mismo tiempo usando la URL.
Todos ven los mismos datos en tiempo real.

---

## 🆓 Costo

| Servicio | Plan | Costo |
|---------|------|-------|
| GitHub | Free | $0 |
| Render Web Service | Free | $0 |
| Render Disk 1GB | Free | $0 |
| **Total** | | **$0** |

> Nota: En el plan gratuito de Render, el servicio puede tardar ~30 segundos
> en arrancar si estuvo inactivo. Después funciona normal.
