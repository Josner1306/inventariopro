# InventaPro Familiar 📺🔊💡

## Despliegue en Railway.app (gratis, datos permanentes)

1. Ve a https://railway.app → **Login with GitHub**
2. **New Project → Deploy from GitHub repo** → selecciona `inventapro`
3. Railway detecta Node.js automáticamente y despliega solo
4. Ve a **Variables** → agrega: `PORT = 3000`
5. Ve a **Volumes → Add Volume** → Mount Path: `/app/data`
6. En el panel del servicio → **Settings → Networking → Generate Domain**

¡Listo! Tu URL estará disponible para toda la familia en ~2 minutos.
