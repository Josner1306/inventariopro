const express = require('express');
const multer  = require('multer');
const Database = require('better-sqlite3');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Directorios ──────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
[DATA_DIR, UPLOADS_DIR].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ── Base de datos SQLite ─────────────────────────────────────
const db = new Database(path.join(DATA_DIR, 'inventario.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    cat       TEXT DEFAULT 'Otro',
    model     TEXT DEFAULT '',
    qty       INTEGER DEFAULT 0,
    serial    TEXT DEFAULT '',
    part      TEXT DEFAULT '',
    notes     TEXT DEFAULT '',
    img_url   TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    action    TEXT,
    product   TEXT,
    detail    TEXT,
    user_tag  TEXT DEFAULT 'familiar',
    ts        TEXT DEFAULT (datetime('now'))
  );
`);

// ── Multer (imágenes) ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename:    (_, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ── Middlewares ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── API: Productos ───────────────────────────────────────────
// GET todos
app.get('/api/products', (_, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY name ASC').all();
  res.json(rows);
});

// GET uno
app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  row ? res.json(row) : res.status(404).json({ error: 'No encontrado' });
});

// POST crear
app.post('/api/products', (req, res) => {
  const { id, name, cat, model, qty, serial, part, notes, img_url } = req.body;
  if (!name) return res.status(400).json({ error: 'El nombre es obligatorio' });
  const newId = id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  db.prepare(`
    INSERT INTO products (id,name,cat,model,qty,serial,part,notes,img_url)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(newId, name, cat||'Otro', model||'', qty||0, serial||'', part||'', notes||'', img_url||'');
  log('crear', name, `qty=${qty}`);
  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(newId));
});

// PUT actualizar
app.put('/api/products/:id', (req, res) => {
  const { name, cat, model, qty, serial, part, notes, img_url } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'No encontrado' });
  db.prepare(`
    UPDATE products SET name=?,cat=?,model=?,qty=?,serial=?,part=?,notes=?,img_url=?,updated_at=datetime('now')
    WHERE id=?
  `).run(
    name||existing.name, cat||existing.cat, model??existing.model,
    qty??existing.qty, serial??existing.serial, part??existing.part,
    notes??existing.notes, img_url??existing.img_url, req.params.id
  );
  log('editar', name||existing.name, `qty=${qty}`);
  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
});

// PATCH solo cantidad
app.patch('/api/products/:id/qty', (req, res) => {
  const { delta, qty } = req.body;
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  const newQty = qty !== undefined ? qty : Math.max(0, p.qty + (delta||0));
  db.prepare(`UPDATE products SET qty=?, updated_at=datetime('now') WHERE id=?`).run(newQty, req.params.id);
  log('qty', p.name, `${p.qty} → ${newQty}`);
  res.json({ id: req.params.id, qty: newQty });
});

// DELETE
app.delete('/api/products/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  log('eliminar', p.name, '');
  res.json({ ok: true });
});

// POST imagen
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Sin archivo' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// POST importar lote
app.post('/api/products/bulk', (req, res) => {
  const { products } = req.body;
  if (!Array.isArray(products)) return res.status(400).json({ error: 'Se espera un array' });
  let added = 0, updated = 0;
  const ins = db.prepare(`INSERT INTO products (id,name,cat,model,qty,serial,part,notes,img_url) VALUES (?,?,?,?,?,?,?,?,?)`);
  const upd = db.prepare(`UPDATE products SET qty=qty+?, updated_at=datetime('now') WHERE id=?`);

  const txn = db.transaction(() => {
    for (const p of products) {
      if (!p.name) continue;
      const existing = db.prepare('SELECT id FROM products WHERE LOWER(name)=LOWER(?)').get(p.name);
      if (existing) { upd.run(p.qty||0, existing.id); updated++; }
      else {
        const newId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
        ins.run(newId, p.name, p.cat||'Otro', p.model||'', p.qty||0, p.serial||'', p.part||'', p.notes||'', '');
        added++;
      }
    }
  });
  txn();
  log('importar', `${added} nuevos`, `${updated} actualizados`);
  res.json({ added, updated });
});

// GET actividad
app.get('/api/activity', (_, res) => {
  const rows = db.prepare('SELECT * FROM activity_log ORDER BY id DESC LIMIT 50').all();
  res.json(rows);
});

// GET exportar CSV
app.get('/api/export/csv', (_, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY cat, name').all();
  const header = 'Nombre,Categoría,Modelo,N° Serie,N° Parte,Cantidad,Notas\n';
  const body   = rows.map(p =>
    `"${p.name}","${p.cat}","${p.model}","${p.serial}","${p.part}",${p.qty},"${p.notes}"`
  ).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventario.csv"');
  res.send('\uFEFF' + header + body);
});

// ── Helper log ───────────────────────────────────────────────
function log(action, product, detail) {
  db.prepare('INSERT INTO activity_log (action,product,detail) VALUES (?,?,?)').run(action, product, detail);
}

// ── SPA fallback ─────────────────────────────────────────────
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`InventaPro corriendo en http://localhost:${PORT}`));
