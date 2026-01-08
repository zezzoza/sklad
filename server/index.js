import express from 'express';
import cors from 'cors';
import path from 'path';
import db, { dbFile } from './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const categories = {
  raw: 'Сырье',
  equipment: 'Оборудование',
  supply: 'Расходники',
};

const isRaw = (category) => category === 'raw';
const validCategory = (category) => Boolean(categories[category]);

const getItemById = (id) => db.prepare('SELECT * FROM items WHERE id = ?').get(id);

const parseNonNegative = (value, field) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return num;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: path.basename(dbFile) });
});

app.get('/api/items', (req, res) => {
  const { category, search = '', availableOnly = 'false' } = req.query;
  if (!validCategory(category)) {
    return res.status(400).json({ error: 'Unknown category' });
  }

  let where = 'category = ?';
  const params = [category];

  if (search.trim()) {
    where += ' AND lower(name) LIKE ?';
    params.push(`%${search.toLowerCase()}%`);
  }

  if (availableOnly === 'true') {
    where += isRaw(category) ? ' AND (weight > 0 OR length > 0)' : ' AND quantity > 0';
  }

  const items = db
    .prepare(`SELECT * FROM items WHERE ${where} ORDER BY name COLLATE NOCASE`)
    .all(...params);

  res.json(items);
});

app.get('/api/items/:id', (req, res) => {
  const item = getItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

app.post('/api/items', (req, res) => {
  try {
    const { category, name, mode, amount, weight, length, quantity, force = false } = req.body || {};
    if (!validCategory(category)) {
      return res.status(400).json({ error: 'Unknown category' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    let newWeight = 0;
    let newLength = 0;
    let newQuantity = 0;

    if (isRaw(category)) {
      const normalizedMode = mode === 'length' ? 'length' : 'weight';
      const value = parseNonNegative(amount ?? (normalizedMode === 'length' ? length : weight) ?? 0, 'Amount');
      if (normalizedMode === 'length') {
        newLength = value;
      } else {
        newWeight = value;
      }
    } else {
      newQuantity = parseNonNegative(quantity ?? amount ?? 0, 'Quantity');
    }

    const existing = db
      .prepare('SELECT * FROM items WHERE category = ? AND lower(name) = lower(?)')
      .get(category, name.trim());

    if (existing && !force) {
      return res.status(409).json({ error: 'duplicate', existing });
    }

    if (existing && force) {
      const updatedWeight = existing.weight + newWeight;
      const updatedLength = existing.length + newLength;
      const updatedQuantity = existing.quantity + newQuantity;
      db.prepare('UPDATE items SET weight = ?, length = ?, quantity = ? WHERE id = ?').run(
        updatedWeight,
        updatedLength,
        updatedQuantity,
        existing.id,
      );
      return res.json(getItemById(existing.id));
    }

    const result = db
      .prepare('INSERT INTO items (category, name, weight, length, quantity) VALUES (?, ?, ?, ?, ?)')
      .run(category, name.trim(), newWeight, newLength, newQuantity);

    return res.status(201).json(getItemById(result.lastInsertRowid));
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

app.put('/api/items/:id', (req, res) => {
  try {
    const { name, weight, length, quantity } = req.body || {};
    const item = getItemById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const updatedName = name && name.trim() ? name.trim() : item.name;
    const updatedWeight = parseNonNegative(weight ?? item.weight, 'Weight');
    const updatedLength = parseNonNegative(length ?? item.length, 'Length');
    const updatedQuantity = parseNonNegative(quantity ?? item.quantity, 'Quantity');

    const duplicate = db
      .prepare(
        'SELECT * FROM items WHERE category = ? AND lower(name) = lower(?) AND id != ?',
      )
      .get(item.category, updatedName, item.id);
    if (duplicate) {
      return res.status(409).json({ error: 'duplicate', existing: duplicate });
    }

    db.prepare('UPDATE items SET name = ?, weight = ?, length = ?, quantity = ? WHERE id = ?').run(
      updatedName,
      updatedWeight,
      updatedLength,
      updatedQuantity,
      item.id,
    );

    res.json(getItemById(item.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/items/:id/zero', (req, res) => {
  const item = getItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const zeroWeight = isRaw(item.category) ? 0 : item.weight;
  const zeroLength = isRaw(item.category) ? 0 : item.length;
  const zeroQuantity = isRaw(item.category) ? item.quantity : 0;

  db.prepare('UPDATE items SET weight = ?, length = ?, quantity = ? WHERE id = ?').run(
    zeroWeight,
    zeroLength,
    zeroQuantity,
    item.id,
  );

  res.json(getItemById(item.id));
});

app.delete('/api/items/:id', (req, res) => {
  const item = getItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  db.prepare('DELETE FROM items WHERE id = ?').run(item.id);
  res.json({ ok: true, deletedId: item.id });
});

const clientDist = path.join(process.cwd(), 'client', 'dist');
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res, next) => {
  const indexPath = path.join(clientDist, 'index.html');
  return res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`SQLite database: ${dbFile}`);
});
