require('dotenv').config();
const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'blex-store-secret-key-change-in-prod';
const SALT_ROUNDS = 10;
const CJ_EMAIL   = process.env.CJ_EMAIL || '';
const CJ_API_KEY = process.env.CJ_API_KEY || '';
const CJ_BASE    = 'https://developers.cjdropshipping.com/api2.0/v1';

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
      }
    : {
        host: 'localhost',
        port: 5432,
        database: 'blex_db',
        user: 'postgres',
        password: 'postgres'
      }
);

// ─── Create tables ───────────────────────────────────────────────────────────

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(100) DEFAULT 'electronics',
      image TEXT,
      description TEXT,
      stock INTEGER DEFAULT 0,
      sale_price DECIMAL(10,2),
      sale_ends_at TIMESTAMP,
      is_preorder BOOLEAN DEFAULT false,
      preorder_date DATE
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(20),
      address TEXT,
      total DECIMAL(10,2) NOT NULL,
      items JSONB NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(50) DEFAULT 'customer',
      wallet_balance DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      type VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS warranties (
      id SERIAL PRIMARY KEY,
      order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS trade_ins (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_name VARCHAR(255) NOT NULL,
      condition VARCHAR(100) NOT NULL,
      estimated_value DECIMAL(10,2),
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bundles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      products JSONB NOT NULL DEFAULT '[]',
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS group_carts (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      items JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS b2b_companies (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(50),
      discount_rate DECIMAL(5,2) DEFAULT 0,
      approved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS feature_flags (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      enabled BOOLEAN DEFAULT false,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS b2b_applications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      company_name VARCHAR(255) NOT NULL,
      trade_license VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rma_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      order_id VARCHAR(50),
      product_name VARCHAR(255) NOT NULL,
      reason TEXT NOT NULL,
      condition VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      action VARCHAR(255) NOT NULL,
      details TEXT,
      admin_user VARCHAR(100) DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS rfq_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      product_name VARCHAR(255) NOT NULL,
      quantity INTEGER NOT NULL,
      message TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      quoted_price DECIMAL(10,2),
      admin_note TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id SERIAL PRIMARY KEY,
      key VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      revoked BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255),
      phone VARCHAR(50),
      webhook_url TEXT,
      product_ids JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id SERIAL PRIMARY KEY,
      product_id INTEGER,
      product_name VARCHAR(255),
      coupon_code VARCHAR(50) UNIQUE NOT NULL,
      discount_pct INTEGER NOT NULL,
      reason TEXT,
      active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS supplier_regions (
      supplier_id INTEGER PRIMARY KEY REFERENCES suppliers(id) ON DELETE CASCADE,
      country_codes TEXT[] NOT NULL DEFAULT '{}',
      avg_shipping_days INTEGER DEFAULT 7
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_suppliers (
      product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
      supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
      supplier_price DECIMAL(10,2),
      stock_available INTEGER DEFAULT 0,
      PRIMARY KEY (product_id, supplier_id)
    )
  `);

  // Add missing columns to existing tables (idempotent)
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'electronics'`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS email VARCHAR(255)`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price DECIMAL(10,2)`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMP`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_preorder BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS preorder_date DATE`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2)`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS image_gallery JSONB`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS supplier_id INTEGER`);
  await pool.query(`ALTER TABLE b2b_applications ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10,2) DEFAULT 5000`);
  await pool.query(`ALTER TABLE b2b_applications ADD COLUMN IF NOT EXISTS credit_used DECIMAL(10,2) DEFAULT 0`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_ref VARCHAR(50)`);
  await pool.query(`ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS meta JSONB`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating DECIMAL(3,1) DEFAULT 0`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS response_time INTEGER DEFAULT 24`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS return_rate DECIMAL(5,2) DEFAULT 0`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS max_shipping_days INTEGER DEFAULT 14`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS min_order INTEGER DEFAULT 1`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS return_policy VARCHAR(100) DEFAULT '30 days'`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS bulk_discount_threshold INTEGER DEFAULT 10`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100) DEFAULT 'Net 30'`);
  await pool.query(`ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS password_hash TEXT`);
  await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS routed_supplier_id INTEGER`);

  // Seed all 11 feature flags enabled by default
  const FLAGS = ['loyalty_points','wallet','b2b','trade_in','group_cart','back_in_stock','smart_bundles','digital_warranty','coupons','vat','cod'];
  for (const name of FLAGS) {
    await pool.query(
      `INSERT INTO feature_flags (name, enabled, description) VALUES ($1, true, $2) ON CONFLICT (name) DO NOTHING`,
      [name, name]
    );
  }
  await pool.query(`INSERT INTO feature_flags (name, enabled, description) VALUES ('maintenance_mode', false, 'Store maintenance / coming soon mode') ON CONFLICT (name) DO NOTHING`);
}

initDB().catch(console.error);

// ─── Auth middleware ──────────────────────────────────────────────────────────

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token expired or invalid' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

async function auditLog(action, details) {
  try { await pool.query('INSERT INTO audit_logs (action, details) VALUES ($1, $2)', [action, details]); } catch {}
}

const rlMap = {};

async function notifySupplierWebhook(productId, productName, stock) {
  try {
    const s = await pool.query("SELECT * FROM suppliers WHERE product_ids @> $1::jsonb", [JSON.stringify([productId])]);
    if (s.rows[0]?.webhook_url) {
      fetch(s.rows[0].webhook_url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'low_stock', product_id: productId, product_name: productName, stock }) }).catch(() => {});
    }
  } catch {}
  sendLowStockEmail(productName, stock).catch(() => {});
}

// ─── Email Utilities ──────────────────────────────────────────────────────────

async function sendOrderEmail(order) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !order.email) return;
  try {
    const nodemailer = require('nodemailer');
    const tr = nodemailer.createTransporter({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    const items = Array.isArray(order.items) ? order.items : JSON.parse(order.items || '[]');
    const rows = items.map(i => `<tr><td style="padding:7px 12px;border-bottom:1px solid #eee">${i.name||''}</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:center">${i.qty||1}</td><td style="padding:7px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:700">${((i.price||0)*(i.qty||1)).toFixed(2)} SAR</td></tr>`).join('');
    const ref = order.order_ref || `#${order.id}`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:540px;margin:0 auto;color:#111">
      <div style="background:#0a0a0a;padding:24px;text-align:center;border-radius:12px 12px 0 0"><h1 style="color:#fff;margin:0;font-size:26px;letter-spacing:10px;font-weight:900">BLEX</h1><p style="color:#555;margin:4px 0 0;font-size:11px;letter-spacing:2px">PREMIUM STORE</p></div>
      <div style="background:#fff;border:1px solid #e5e5e5;border-top:none;padding:28px;border-radius:0 0 12px 12px">
        <h2 style="margin:0 0 6px">Order Confirmed ✓</h2>
        <p style="color:#666;margin:0 0 20px">Hi ${order.customer}, thank you for shopping with BLEX!</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:14px 16px;margin-bottom:20px"><div style="font-size:11px;color:#888;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">Order Reference</div><div style="font-size:22px;font-weight:900">${ref}</div></div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px"><thead><tr style="background:#f5f5f5"><th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;text-transform:uppercase">Item</th><th style="padding:8px 12px;text-align:center;font-size:11px;color:#888">Qty</th><th style="padding:8px 12px;text-align:right;font-size:11px;color:#888">Price</th></tr></thead><tbody>${rows}</tbody></table>
        <div style="text-align:right;font-size:18px;font-weight:900;border-top:2px solid #111;padding-top:12px">Total: ${Number(order.total).toFixed(2)} SAR</div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;margin-top:20px;color:#15803d"><strong>📦 Estimated Delivery:</strong> 2–4 Business Days within Saudi Arabia</div>
        <p style="color:#999;font-size:11px;text-align:center;margin-top:24px;border-top:1px solid #eee;padding-top:16px">BLEX Store · blex.cart@hotmail.com · Free returns within 30 days · 15% VAT included</p>
      </div></div>`;
    await tr.sendMail({ from: `"BLEX Store" <${process.env.EMAIL_USER}>`, to: order.email, subject: `Order Confirmed – ${ref} | BLEX`, html });
  } catch (e) { console.error('[Email] order confirmation failed:', e.message); }
}

async function sendLowStockEmail(name, stock) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;
  try {
    const nodemailer = require('nodemailer');
    const tr = nodemailer.createTransporter({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } });
    await tr.sendMail({ from: `"BLEX Store" <${process.env.EMAIL_USER}>`, to: process.env.EMAIL_USER, subject: `⚠ Low Stock: ${name} (${stock} left)`, text: `${name} has only ${stock} units remaining. Please restock soon.\n\nBLEX Auto-Alert` });
  } catch (e) { console.error('[Email] low-stock alert failed:', e.message); }
}

// ─── Auth endpoints ───────────────────────────────────────────────────────────

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required' });
    }
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, wallet_balance, created_at',
      [name, email, hash, role === 'admin' ? 'admin' : 'customer']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safe } = user;
    res.json({ user: safe, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/auth/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, wallet_balance, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Products (existing, kept intact) ────────────────────────────────────────

app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/products', async (req, res) => {
  try {
    const { name, price, description, stock, category, image, image_gallery } = req.body;
    const result = await pool.query(
      'INSERT INTO products (name, price, description, stock, category, image, image_gallery) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, price, description, stock, category || 'electronics', image || null, image_gallery || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/products/:id', async (req, res) => {
  try {
    const { name, price, description, stock, category, image, sale_price, sale_ends_at, is_preorder, preorder_date, cost_price, supplier_id, image_gallery } = req.body;
    const result = await pool.query(
      'UPDATE products SET name=$1, price=$2, description=$3, stock=$4, category=$5, image=$6, sale_price=$7, sale_ends_at=$8, is_preorder=$9, preorder_date=$10, cost_price=$11, supplier_id=$12, image_gallery=$13 WHERE id=$14 RETURNING *',
      [name, price, description, stock, category || 'electronics', image || null, sale_price || null, sale_ends_at || null, is_preorder || false, preorder_date || null, cost_price || null, supplier_id || null, image_gallery || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Product not found' });
    await auditLog('product_updated', `Product ${req.params.id}: ${name}`);
    if (result.rows[0].stock < 5) notifySupplierWebhook(result.rows[0].id, result.rows[0].name, result.rows[0].stock);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/products/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Orders (existing, kept intact) ──────────────────────────────────────────

app.post('/orders', async (req, res) => {
  try {
    const { customer, email, phone, address, items, total, order_ref } = req.body;
    const result = await pool.query(
      'INSERT INTO orders (customer, email, phone, address, items, total, order_ref) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [customer, email || null, phone, address, JSON.stringify(items), total, order_ref || null]
    );
    sendOrderEmail(result.rows[0]).catch(() => {});
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/orders/track/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    const byRef = await pool.query('SELECT id, order_ref, customer, status, total, created_at FROM orders WHERE order_ref = $1', [ref]);
    if (byRef.rows[0]) return res.json(byRef.rows[0]);
    const numId = parseInt(ref.replace(/\D/g, ''), 10);
    if (!numId) return res.status(404).json({ error: 'Order not found' });
    const byId = await pool.query('SELECT id, order_ref, customer, status, total, created_at FROM orders WHERE id = $1', [numId]);
    if (!byId.rows[0]) return res.status(404).json({ error: 'Order not found' });
    res.json(byId.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Wallet ───────────────────────────────────────────────────────────────────

app.get('/wallet', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ balance: result.rows[0]?.wallet_balance ?? 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/wallet/topup', authenticate, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    await pool.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [amount, req.user.id]);
    await pool.query(
      'INSERT INTO wallet_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)',
      [req.user.id, amount, 'topup', 'Wallet top-up']
    );
    const result = await pool.query('SELECT wallet_balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ balance: result.rows[0].wallet_balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/wallet/transactions', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Warranties ───────────────────────────────────────────────────────────────

app.get('/warranties', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? 'SELECT w.*, u.name as user_name, p.name as product_name FROM warranties w LEFT JOIN users u ON u.id = w.user_id LEFT JOIN products p ON p.id = w.product_id ORDER BY w.created_at DESC'
      : 'SELECT w.*, p.name as product_name FROM warranties w LEFT JOIN products p ON p.id = w.product_id WHERE w.user_id = $1 ORDER BY w.created_at DESC';
    const args = isAdmin ? [] : [req.user.id];
    const result = await pool.query(query, args);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/warranties', authenticate, async (req, res) => {
  try {
    const { order_id, product_id, expires_at } = req.body;
    if (!expires_at) return res.status(400).json({ error: 'expires_at is required' });
    const result = await pool.query(
      'INSERT INTO warranties (order_id, product_id, user_id, expires_at) VALUES ($1, $2, $3, $4) RETURNING *',
      [order_id || null, product_id || null, req.user.id, expires_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/warranties/:id', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE warranties SET status=$1 WHERE id=$2 AND (user_id=$3 OR $4) RETURNING *',
      [status, req.params.id, req.user.id, req.user.role === 'admin']
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Warranty not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Trade-ins ────────────────────────────────────────────────────────────────

app.get('/trade-ins', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin';
    const query = isAdmin
      ? 'SELECT t.*, u.name as user_name FROM trade_ins t LEFT JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC'
      : 'SELECT * FROM trade_ins WHERE user_id = $1 ORDER BY created_at DESC';
    const args = isAdmin ? [] : [req.user.id];
    const result = await pool.query(query, args);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/trade-ins', authenticate, async (req, res) => {
  try {
    const { product_name, condition, notes } = req.body;
    if (!product_name || !condition) return res.status(400).json({ error: 'product_name and condition are required' });
    const result = await pool.query(
      'INSERT INTO trade_ins (user_id, product_name, condition, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, product_name, condition, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/trade-ins/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, estimated_value } = req.body;
    const result = await pool.query(
      'UPDATE trade_ins SET status=COALESCE($1, status), estimated_value=COALESCE($2, estimated_value) WHERE id=$3 RETURNING *',
      [status || null, estimated_value || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Trade-in not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Stock Alerts ─────────────────────────────────────────────────────────────

app.get('/stock-alerts', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT sa.*, p.name as product_name, p.stock FROM stock_alerts sa LEFT JOIN products p ON p.id = sa.product_id WHERE sa.user_id = $1 ORDER BY sa.created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/stock-alerts', authenticate, async (req, res) => {
  try {
    const { product_id } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });
    const result = await pool.query(
      'INSERT INTO stock_alerts (user_id, product_id) VALUES ($1, $2) ON CONFLICT (user_id, product_id) DO NOTHING RETURNING *',
      [req.user.id, product_id]
    );
    res.status(201).json(result.rows[0] || { message: 'Alert already exists' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/stock-alerts/:id', authenticate, async (req, res) => {
  try {
    await pool.query('DELETE FROM stock_alerts WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Bundles ──────────────────────────────────────────────────────────────────

app.get('/bundles', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bundles WHERE active = true ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/bundles', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, products } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'name and price are required' });
    const result = await pool.query(
      'INSERT INTO bundles (name, description, price, products) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, price, JSON.stringify(products || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/bundles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, products, active } = req.body;
    const result = await pool.query(
      'UPDATE bundles SET name=COALESCE($1,name), description=COALESCE($2,description), price=COALESCE($3,price), products=COALESCE($4,products), active=COALESCE($5,active) WHERE id=$6 RETURNING *',
      [name || null, description || null, price || null, products ? JSON.stringify(products) : null, active != null ? active : null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Bundle not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/bundles/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE bundles SET active = false WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Group Carts ──────────────────────────────────────────────────────────────

app.post('/group-carts', authenticate, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const result = await pool.query(
      'INSERT INTO group_carts (name, code, owner_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/group-carts/:code', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM group_carts WHERE code = $1', [req.params.code]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Group cart not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/group-carts/:code/items', authenticate, async (req, res) => {
  try {
    const { product_id, quantity } = req.body;
    if (!product_id || !quantity) return res.status(400).json({ error: 'product_id and quantity are required' });
    const cart = await pool.query('SELECT * FROM group_carts WHERE code = $1', [req.params.code]);
    if (!cart.rows[0]) return res.status(404).json({ error: 'Group cart not found' });
    const items = cart.rows[0].items || [];
    const existing = items.find(i => i.product_id === product_id && i.added_by === req.user.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      items.push({ product_id, quantity, added_by: req.user.id });
    }
    const result = await pool.query(
      'UPDATE group_carts SET items = $1 WHERE code = $2 RETURNING *',
      [JSON.stringify(items), req.params.code]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── B2B Companies ────────────────────────────────────────────────────────────

app.get('/b2b/companies', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM b2b_companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/b2b/companies', async (req, res) => {
  try {
    const { name, email, phone, discount_rate } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'name and email are required' });
    const result = await pool.query(
      'INSERT INTO b2b_companies (name, email, phone, discount_rate) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, phone || null, discount_rate || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Company email already registered' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/b2b/companies/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const { approved, discount_rate } = req.body;
    const result = await pool.query(
      'UPDATE b2b_companies SET approved=COALESCE($1,approved), discount_rate=COALESCE($2,discount_rate) WHERE id=$3 RETURNING *',
      [approved != null ? approved : null, discount_rate != null ? discount_rate : null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Company not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── B2B Applications (frontend routes) ──────────────────────────────────────
// Rate-limit auth endpoints in production (e.g. express-rate-limit: max 10/min per IP)

app.post('/b2b/apply', authenticate, async (req, res) => {
  try {
    const { company_name, trade_license } = req.body;
    if (!company_name || !trade_license) return res.status(400).json({ error: 'company_name and trade_license are required' });
    const result = await pool.query(
      'INSERT INTO b2b_applications (user_id, company_name, trade_license) VALUES ($1, $2, $3) RETURNING *',
      [req.user.id, company_name, trade_license]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/b2b/applications', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM b2b_applications ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/b2b/approve/:id', async (req, res) => {
  try {
    const { approved } = req.body;
    const status = approved ? 'approved' : 'rejected';
    const result = await pool.query(
      'UPDATE b2b_applications SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Application not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Group Cart (frontend route aliases) ──────────────────────────────────────

app.post('/group-cart/create', authenticate, async (req, res) => {
  try {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { items } = req.body;
    const result = await pool.query(
      'INSERT INTO group_carts (name, code, owner_id, items) VALUES ($1, $2, $3, $4) RETURNING *',
      [`cart-${code}`, code, req.user.id, JSON.stringify(items || [])]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/group-cart/join', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'code is required' });
    const result = await pool.query('SELECT * FROM group_carts WHERE code = $1', [code.toUpperCase()]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Group cart not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RMA (Returns) ────────────────────────────────────────────────────────────

app.post('/rma', authenticate, async (req, res) => {
  try {
    const { order_id, product_name, reason, condition } = req.body;
    if (!product_name || !reason || !condition) return res.status(400).json({ error: 'product_name, reason, and condition are required' });
    const result = await pool.query(
      'INSERT INTO rma_requests (user_id, order_id, product_name, reason, condition) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.user.id, order_id || null, product_name, reason, condition]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/rma', async (req, res) => {
  try {
    const result = await pool.query('SELECT r.*, u.name as user_name FROM rma_requests r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/rma/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const rma = await pool.query('SELECT * FROM rma_requests WHERE id = $1', [req.params.id]);
    if (!rma.rows[0]) return res.status(404).json({ error: 'RMA not found' });
    if (status === 'approved') {
      await pool.query('UPDATE products SET stock = stock + 1 WHERE name = $1', [rma.rows[0].product_name]);
    }
    const result = await pool.query('UPDATE rma_requests SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    await auditLog('rma_' + status, `RMA #${req.params.id}: ${rma.rows[0].product_name}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────

app.get('/audit-logs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── RFQ ─────────────────────────────────────────────────────────────────────

app.post('/rfq', authenticate, async (req, res) => {
  try {
    const { product_name, quantity, message } = req.body;
    if (!product_name || !quantity) return res.status(400).json({ error: 'product_name and quantity are required' });
    const result = await pool.query(
      'INSERT INTO rfq_requests (user_id, product_name, quantity, message) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.id, product_name, quantity, message || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/rfq', async (req, res) => {
  try {
    const result = await pool.query('SELECT r.*, u.name as user_name, u.email as user_email FROM rfq_requests r LEFT JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/rfq/:id', async (req, res) => {
  try {
    const { status, quoted_price, admin_note } = req.body;
    const result = await pool.query(
      'UPDATE rfq_requests SET status=COALESCE($1,status), quoted_price=COALESCE($2,quoted_price), admin_note=COALESCE($3,admin_note) WHERE id=$4 RETURNING *',
      [status || null, quoted_price || null, admin_note || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'RFQ not found' });
    await auditLog('rfq_responded', `RFQ #${req.params.id} ${status} @ ${quoted_price}`);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── API Keys & Supplier Portal ───────────────────────────────────────────────

app.get('/api-keys', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, key, revoked, created_at FROM api_keys ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api-keys', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const key = 'blex_' + require('crypto').randomBytes(24).toString('hex');
    const result = await pool.query('INSERT INTO api_keys (name, key) VALUES ($1, $2) RETURNING *', [name, key]);
    await auditLog('api_key_created', `Key: ${name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api-keys/:id', async (req, res) => {
  try {
    await pool.query('UPDATE api_keys SET revoked=true WHERE id=$1', [req.params.id]);
    await auditLog('api_key_revoked', `Key ID: ${req.params.id}`);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/v1/products', async (req, res) => {
  try {
    const key = req.headers['x-api-key'];
    if (!key) return res.status(401).json({ error: 'X-Api-Key header required' });
    const kRow = await pool.query('SELECT * FROM api_keys WHERE key=$1 AND revoked=false', [key]);
    if (!kRow.rows[0]) return res.status(403).json({ error: 'Invalid or revoked API key' });
    const now = Date.now();
    if (!rlMap[key] || now - rlMap[key].t > 3600000) rlMap[key] = { n: 0, t: now };
    if (++rlMap[key].n > 100) return res.status(429).json({ error: 'Rate limit exceeded (100 req/hour)' });
    const result = await pool.query('SELECT id, name, price, category, stock, image, is_preorder, sale_price FROM products ORDER BY id DESC');
    res.json({ data: result.rows, requests_remaining: 100 - rlMap[key].n });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Suppliers ────────────────────────────────────────────────────────────────

app.get('/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM suppliers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/suppliers', async (req, res) => {
  try {
    const { name, email, phone, webhook_url, max_shipping_days, min_order, return_policy, bulk_discount_threshold, payment_terms } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await pool.query(
      'INSERT INTO suppliers (name, email, phone, webhook_url, max_shipping_days, min_order, return_policy, bulk_discount_threshold, payment_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
      [name, email||null, phone||null, webhook_url||null, max_shipping_days||14, min_order||1, return_policy||'30 days', bulk_discount_threshold||10, payment_terms||'Net 30']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/suppliers/:id', async (req, res) => {
  try {
    const { name, email, phone, webhook_url, product_ids, max_shipping_days, min_order, return_policy, bulk_discount_threshold, payment_terms, return_rate, response_time } = req.body;
    const result = await pool.query(
      `UPDATE suppliers SET name=COALESCE($1,name), email=COALESCE($2,email), phone=COALESCE($3,phone),
       webhook_url=COALESCE($4,webhook_url), product_ids=COALESCE($5,product_ids),
       max_shipping_days=COALESCE($6,max_shipping_days), min_order=COALESCE($7,min_order),
       return_policy=COALESCE($8,return_policy), bulk_discount_threshold=COALESCE($9,bulk_discount_threshold),
       payment_terms=COALESCE($10,payment_terms), return_rate=COALESCE($11,return_rate),
       response_time=COALESCE($12,response_time) WHERE id=$13 RETURNING *`,
      [name||null, email||null, phone||null, webhook_url||null, product_ids?JSON.stringify(product_ids):null,
       max_shipping_days||null, min_order||null, return_policy||null, bulk_discount_threshold||null,
       payment_terms||null, return_rate||null, response_time||null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/suppliers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM suppliers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/suppliers/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1–5 required' });
    const result = await pool.query('UPDATE suppliers SET rating=$1 WHERE id=$2 RETURNING *', [Number(rating), req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Supplier not found' });
    await auditLog('supplier_rated', `Supplier ${req.params.id} rated ${rating}`);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/suppliers/:id/set-password', authenticate, requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'password required' });
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query('UPDATE suppliers SET password_hash=$1 WHERE id=$2 RETURNING id,name,email', [hash, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/suppliers/analytics', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.name, s.rating, s.return_rate, s.response_time, s.max_shipping_days,
             COUNT(DISTINCT ps.product_id) AS products_count,
             COALESCE(SUM(ps.stock_available),0) AS total_stock,
             COUNT(DISTINCT o.id) AS routed_orders
      FROM suppliers s
      LEFT JOIN product_suppliers ps ON ps.supplier_id = s.id
      LEFT JOIN orders o ON o.routed_supplier_id = s.id
      GROUP BY s.id ORDER BY s.rating DESC NULLS LAST
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/orders/:id/route', async (req, res) => {
  try {
    const { customer_country } = req.body;
    const ord = await pool.query('SELECT * FROM orders WHERE id=$1', [req.params.id]);
    if (!ord.rows[0]) return res.status(404).json({ error: 'Order not found' });
    const items = Array.isArray(ord.rows[0].items) ? ord.rows[0].items : JSON.parse(ord.rows[0].items || '[]');
    const productId = items[0]?.id;
    if (!productId) return res.json({ routed: false, reason: 'no items' });
    const cc = (customer_country || 'SA').toUpperCase();
    const { rows } = await pool.query(`
      SELECT ps.supplier_id, s.name AS supplier_name, sr.country_codes, sr.avg_shipping_days, s.max_shipping_days
      FROM product_suppliers ps
      JOIN suppliers s ON s.id = ps.supplier_id
      LEFT JOIN supplier_regions sr ON sr.supplier_id = ps.supplier_id
      WHERE ps.product_id=$1 AND ps.stock_available>0
      ORDER BY (CASE WHEN $2=ANY(sr.country_codes) THEN 0 ELSE 1 END), sr.avg_shipping_days ASC NULLS LAST LIMIT 1
    `, [productId, cc]);
    if (!rows.length) return res.json({ routed: false, reason: 'no supplier with stock' });
    const best = rows[0];
    await pool.query('UPDATE orders SET routed_supplier_id=$1 WHERE id=$2', [best.supplier_id, req.params.id]);
    await pool.query('UPDATE product_suppliers SET stock_available=GREATEST(0,stock_available-1) WHERE supplier_id=$1 AND product_id=$2', [best.supplier_id, productId]);
    await auditLog('order_routed', `Order ${req.params.id} → ${best.supplier_name}`);
    res.json({ routed: true, supplier_name: best.supplier_name, estimated_days: best.avg_shipping_days || best.max_shipping_days || 14 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Supplier Portal ──────────────────────────────────────────────────────────

app.post('/supplier-portal/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const { rows } = await pool.query('SELECT * FROM suppliers WHERE email=$1', [email]);
    const s = rows[0];
    if (!s?.password_hash || !(await bcrypt.compare(password, s.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: s.id, email: s.email, role: 'supplier', name: s.name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, supplier: { id: s.id, name: s.name, email: s.email } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/supplier-portal/orders', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'supplier') return res.status(403).json({ error: 'Supplier access only' });
    const { rows } = await pool.query(
      'SELECT id,customer,email,total,status,created_at,items FROM orders WHERE routed_supplier_id=$1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/supplier-portal/stock', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'supplier') return res.status(403).json({ error: 'Supplier access only' });
    const { product_id, stock_available } = req.body;
    if (!product_id || stock_available == null) return res.status(400).json({ error: 'product_id and stock_available required' });
    const { rows } = await pool.query(
      'UPDATE product_suppliers SET stock_available=$1 WHERE supplier_id=$2 AND product_id=$3 RETURNING *',
      [stock_available, req.user.id, product_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Product-supplier link not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Financial Reports ────────────────────────────────────────────────────────

app.get('/reports/financial', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DATE_TRUNC('month', created_at) as month,
        COUNT(*) as order_count,
        SUM(total) as gross_revenue,
        SUM(total * 0.15 / 1.15) as vat_collected,
        SUM(total / 1.15) as net_revenue
      FROM orders GROUP BY DATE_TRUNC('month', created_at) ORDER BY month DESC LIMIT 12
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Feature Flags ────────────────────────────────────────────────────────────

app.get('/feature-flags', async (req, res) => {
  try {
    const result = await pool.query('SELECT name, enabled, description FROM feature_flags ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/feature-flags', async (req, res) => {
  try {
    const { name, enabled, description } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const result = await pool.query(
      'INSERT INTO feature_flags (name, enabled, description) VALUES ($1, $2, $3) RETURNING *',
      [name, enabled ?? false, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Flag already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.patch('/feature-flags/:name', async (req, res) => {
  try {
    const { enabled, description } = req.body;
    const result = await pool.query(
      'UPDATE feature_flags SET enabled=COALESCE($1,enabled), description=COALESCE($2,description) WHERE name=$3 RETURNING *',
      [enabled != null ? enabled : null, description || null, req.params.name]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Flag not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Maintenance Mode ─────────────────────────────────────────────────────────

app.get('/maintenance', async (req, res) => {
  try {
    const r = await pool.query("SELECT enabled, meta FROM feature_flags WHERE name='maintenance_mode'");
    const row = r.rows[0] || { enabled: false, meta: null };
    res.json({ enabled: !!row.enabled, message: row.meta?.message || '', launch_date: row.meta?.launch_date || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/maintenance', async (req, res) => {
  try {
    const { enabled, message, launch_date } = req.body;
    const meta = { message: message || '', launch_date: launch_date || null };
    await pool.query(
      `INSERT INTO feature_flags (name,enabled,meta,description) VALUES ('maintenance_mode',$1,$2,'Store maintenance mode') ON CONFLICT (name) DO UPDATE SET enabled=$1, meta=$2`,
      [!!enabled, meta]
    );
    await auditLog('maintenance', `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
    res.json({ enabled: !!enabled, message: meta.message, launch_date: meta.launch_date });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/maintenance/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });
    await auditLog('maintenance_subscribe', email);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── CJ Dropshipping ─────────────────────────────────────────────────────────

let cjToken = null, cjTokenExpiry = 0;

// Always read as text first — CJ can return HTML on auth failures or bad routes
async function cjParseJSON(r) {
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    const preview = text.slice(0, 200).replace(/\s+/g, ' ').trim();
    throw new Error(`CJ API returned non-JSON (HTTP ${r.status}): ${preview}`);
  }
}

async function getCJToken() {
  if (cjToken && Date.now() < cjTokenExpiry) return cjToken;
  if (!CJ_API_KEY) throw new Error('CJ_API_KEY not set in environment');

  // Mode 1: no email → CJ_API_KEY is a pre-issued access token from the CJ developer console
  if (!CJ_EMAIL) {
    cjToken = CJ_API_KEY;
    cjTokenExpiry = Date.now() + 6 * 3600 * 1000;
    return cjToken;
  }

  // Mode 2: email present → authenticate with email + password (CJ_API_KEY = account password)
  const r = await fetch(`${CJ_BASE}/authentication/getAccessToken`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CJ_EMAIL, password: CJ_API_KEY })
  });
  const d = await cjParseJSON(r);

  if (!d.result) {
    // Auth failed but we still have CJ_API_KEY — try it as a direct token
    console.warn(`[CJ] Auth failed (${d.message}), falling back to CJ_API_KEY as direct token`);
    cjToken = CJ_API_KEY;
    cjTokenExpiry = Date.now() + 6 * 3600 * 1000;
    return cjToken;
  }

  cjToken = d.data.accessToken;
  // Respect the expiry the API tells us, or default to 6 h
  const exp = d.data.accessTokenExpiryDate ? new Date(d.data.accessTokenExpiryDate).getTime() : 0;
  cjTokenExpiry = exp > Date.now() ? exp : Date.now() + 6 * 3600 * 1000;
  return cjToken;
}

app.post('/cj/token', async (req, res) => {
  // Reset cached token so the status check is always live
  cjToken = null; cjTokenExpiry = 0;
  try {
    await getCJToken();
    const mode = CJ_EMAIL ? 'email+password' : 'direct token';
    res.json({ connected: true, mode });
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.get('/cj/products', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword) return res.status(400).json({ error: 'keyword is required' });
    const token = await getCJToken();
    const r = await fetch(`${CJ_BASE}/product/list?productNameEn=${encodeURIComponent(keyword)}&pageNum=1&pageSize=20`, {
      headers: { 'CJ-Access-Token': token }
    });
    const d = await cjParseJSON(r);
    res.json(d.data || { list: [], total: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/cj/import', async (req, res) => {
  try {
    const { pid } = req.body;
    if (!pid) return res.status(400).json({ error: 'pid is required' });
    const token = await getCJToken();
    const r = await fetch(`${CJ_BASE}/product/query?pid=${encodeURIComponent(pid)}`, {
      headers: { 'CJ-Access-Token': token }
    });
    const d = await cjParseJSON(r);
    if (!d.result || !d.data) return res.status(404).json({ error: d.message || 'Product not found on CJ' });
    const p = d.data;
    const price = Number(p.sellPrice || p.variants?.[0]?.sellPrice || 0);
    const result = await pool.query(
      'INSERT INTO products (name, price, description, stock, category, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [p.productNameEn || p.productName, price, p.description || '', 999, 'electronics', p.productImageSet?.[0] || null]
    );
    await auditLog('cj_import', `Imported CJ product ${pid}: ${p.productNameEn || p.productName}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/cj/order', async (req, res) => {
  try {
    const { orderId, address, items } = req.body;
    if (!orderId || !address || !items?.length) return res.status(400).json({ error: 'orderId, address, and items are required' });
    const token = await getCJToken();
    const payload = {
      orderNumber: `BLEX-${orderId}`,
      shippingCountryCode: 'SA',
      shippingPhone: address.phone || '',
      shippingCustomerName: address.customer || '',
      shippingAddress: address.address || '',
      shippingCity: address.city || '',
      products: items.map(it => ({ vid: it.cj_vid || String(it.id), quantity: it.qty || 1 }))
    };
    const r = await fetch(`${CJ_BASE}/shopping/order/createOrderV2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': token },
      body: JSON.stringify(payload)
    });
    const d = await cjParseJSON(r);
    await auditLog('cj_order', `CJ order for BLEX #${orderId}: ${d.result ? 'success' : d.message}`);
    res.json(d);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Trend Detection ──────────────────────────────────────────────────────

async function scrapeTrends() {
  let browser;
  try {
    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await page.goto('https://trends.google.com/trends/api/dailytrends?hl=en-US&tz=0&geo=US&ns=15', { waitUntil: 'networkidle0', timeout: 20000 });
    const body = await page.evaluate(() => document.body.innerText);
    const json = JSON.parse(body.replace(/^\)\]\}',?\n?/, ''));
    const searches = (json.default?.trendingSearchesDays?.[0]?.trendingSearches || []).slice(0, 20);
    return searches.map(s => s.title?.query).filter(Boolean);
  } catch (e) {
    return [];
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

app.get('/ai/trends', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const googleTerms = await scrapeTrends();
    const ctx = googleTerms.length ? `Real Google Trends today: ${googleTerms.slice(0, 12).join(', ')}. Use these as inspiration.` : 'Use your 2026 knowledge.';
    const prompt = `It is 2026. ${ctx}\n\nIdentify 10 trending products for a Saudi Arabian e-commerce store (electronics, accessories, clothing).\nReturn ONLY a JSON array of exactly 10 objects: {name (string), category ("electronics"|"accessories"|"clothing"), estimated_demand ("Very High"|"High"|"Medium"), price_range (string e.g. "250-450 SAR"), reason (string max 15 words), trending_score (integer 1-10), google_signal (boolean, true if inspired by Google Trends)}.`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const m = (d.content?.[0]?.text || '').match(/\[[\s\S]*\]/);
    if (!m) return res.status(500).json({ error: 'Failed to parse AI response' });
    const results = JSON.parse(m[0]);
    res.json({ results, google_terms: googleTerms.slice(0, 12) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/ai/trend-import', async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const token = await getCJToken();
    const r = await fetch(`${CJ_BASE}/product/list?productNameEn=${encodeURIComponent(name)}&pageNum=1&pageSize=10`, {
      headers: { 'CJ-Access-Token': token }
    });
    const d = await cjParseJSON(r);
    res.json(d.data || { list: [], total: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/ai/trend-approve', async (req, res) => {
  try {
    const { name, price, category, description, image } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'name and price are required' });
    const result = await pool.query(
      'INSERT INTO products (name, price, category, description, stock, image) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, Number(price), category || 'electronics', description || '', 999, image || null]
    );
    await auditLog('trend_import', `Trend product added: ${name} at ${price} SAR`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Price Monitor ────────────────────────────────────────────────────────

app.post('/ai/analyze-price', async (req, res) => {
  try {
    const { name, current_price, category } = req.body;
    if (!name || !current_price) return res.status(400).json({ error: 'name and current_price are required' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const prompt = `Analyze if this product is competitively priced for the Saudi Arabian e-commerce market:\nName: ${name}\nCategory: ${category||'electronics'}\nCurrent Price: ${current_price} SAR\n\nReturn ONLY a JSON object: {suggested_price (number), market_estimate (string e.g. "800-1200 SAR"), reasoning (max 12 words), status ("good"|"adjust"|"expensive")}.`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 512, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const m = (d.content?.[0]?.text || '').match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Failed to parse AI response' });
    res.json(JSON.parse(m[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/ai/price-report', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const { rows } = await pool.query('SELECT id, name, price, category FROM products ORDER BY id DESC LIMIT 50');
    if (!rows.length) return res.json([]);
    const prompt = `Analyze pricing competitiveness for these Saudi Arabian e-commerce products:\n${JSON.stringify(rows)}\n\nReturn ONLY a JSON array. Each element: {id, suggested_price (number), market_estimate (string), reasoning (max 12 words), status ("good"|"adjust"|"expensive")}.`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const m = (d.content?.[0]?.text || '').match(/\[[\s\S]*\]/);
    if (!m) return res.status(500).json({ error: 'Failed to parse AI response' });
    res.json(JSON.parse(m[0]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Puppeteer Competitor Price Monitor ──────────────────────────────────────

app.get('/ai/price-monitor', async (req, res) => {
  let browser;
  try {
    const { rows } = await pool.query('SELECT id, name, price FROM products ORDER BY id DESC LIMIT 15');
    if (!rows.length) return res.json([]);

    const puppeteer = require('puppeteer');
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });

    const scrapePrice = async (url, selector) => {
      const page = await browser.newPage();
      try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 1500));
        const text = await page.$eval(selector, el => el.textContent).catch(() => null);
        return text ? parseFloat(text.replace(/[^0-9.]/g, '')) || null : null;
      } catch { return null; }
      finally { await page.close(); }
    };

    const results = [];
    for (const p of rows) {
      const q = encodeURIComponent(p.name);
      const [amazonRaw, noonPrice] = await Promise.all([
        scrapePrice(`https://www.amazon.com/s?k=${q}`, '.a-price-whole'),
        scrapePrice(`https://www.noon.com/saudi-en/search/?q=${q}`, '[class*="priceNow"]')
      ]);
      const amazonPrice = amazonRaw ? Math.round(amazonRaw * 3.75) : null; // USD → SAR
      const blexPrice = parseFloat(p.price);
      const competitors = [amazonPrice, noonPrice].filter(v => v !== null && v > 0);
      const minComp = competitors.length ? Math.min(...competitors) : null;
      const suggested = minComp && minComp < blexPrice ? Math.round(minComp * 0.95) : null;
      results.push({ id: p.id, name: p.name, blex_price: blexPrice, amazon_price: amazonPrice, noon_price: noonPrice, suggested_price: suggested, status: suggested ? 'expensive' : 'competitive' });
    }

    await browser.close();
    await auditLog('price_monitor', `Scraped competitor prices for ${results.length} products`);
    res.json(results);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Image Processing (Remove.bg) ─────────────────────────────────────────

app.post('/ai/process-image', async (req, res) => {
  try {
    const { image_url } = req.body;
    if (!image_url) return res.status(400).json({ error: 'image_url is required' });
    const apiKey = process.env.REMOVEBG_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'REMOVEBG_API_KEY not configured' });
    const r = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ image_url, size: 'auto', bg_color: 'ffffff' })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return res.status(r.status).json({ error: e.errors?.[0]?.title || `Remove.bg error (${r.status})` });
    }
    const buffer = await r.arrayBuffer();
    const result_url = `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
    await auditLog('ai_image_processed', `BG removed: ${image_url.slice(0, 80)}`);
    res.json({ result_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Currency Rates ──────────────────────────────────────────────────────────

app.get('/currency/rates', (req, res) => {
  res.json({USD:1,SAR:3.75,KRW:1350,JPY:149,CNY:7.2,EUR:0.92,GBP:0.79,MXN:17.5,BRL:5.0,INR:83});
});

// ─── AI Product Image Gallery ─────────────────────────────────────────────────

app.post('/ai/generate-product-images', async (req, res) => {
  try {
    const { name, category, image_url } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    let cleaned = null;
    if (image_url) {
      const rbKey = process.env.REMOVEBG_API_KEY;
      if (rbKey) {
        const rb = await fetch('https://api.remove.bg/v1.0/removebg', {
          method: 'POST',
          headers: { 'X-Api-Key': rbKey, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ image_url, size: 'auto', bg_color: 'ffffff' })
        });
        if (rb.ok) {
          const buf = await rb.arrayBuffer();
          cleaned = `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;
        }
      }
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const prompt = `Write 2 short marketing descriptions for:\nName: ${name}\nCategory: ${category || 'electronics'}\n\nReturn ONLY JSON: {"promo1":{"text":"<max 18 words, benefit-focused>","angle":"Benefit"},"promo2":{"text":"<max 18 words, lifestyle-focused>","angle":"Lifestyle"}}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 256, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    const raw = d.content?.[0]?.text || '{}';
    const m = raw.match(/\{[\s\S]*\}/);
    let promos = { promo1: { text: `Premium quality ${name}`, angle: 'Benefit' }, promo2: { text: `Elevate your lifestyle with ${name}`, angle: 'Lifestyle' } };
    try { if (m) promos = JSON.parse(m[0]); } catch {}
    await auditLog('ai_gallery', `Image gallery: ${name}`);
    res.json({ original: image_url || null, cleaned, promo1: promos.promo1, promo2: promos.promo2 });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Customer Support ─────────────────────────────────────────────────────

app.post('/ai/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const { rows: prods } = await pool.query('SELECT name, price, category, stock FROM products ORDER BY id DESC LIMIT 20');
    const system = `You are BLEX AI, a friendly and helpful customer support assistant for BLEX — a premium online electronics, accessories, and clothing store.

Store details:
- Free shipping on orders over 500 SAR. Standard delivery 2-4 business days.
- Returns accepted within 30 days in original condition.
- 15% VAT included in all prices. Cash on delivery (COD) available.
- Electronics come with 1-year warranty. Trade-in program for old devices.
- Contact: blex.cart@hotmail.com | Support hours: 9am–9pm daily.

Current products in stock: ${JSON.stringify(prods.map(p=>({name:p.name,price:p.price+' SAR',category:p.category,available:p.stock>0})))}

Instructions:
- Be concise (2-4 sentences). Be friendly but professional.
- For order tracking, ask for order number then explain how to check status.
- For returns, explain the 30-day policy and ask them to email with order number.
- If the issue involves fraud, account breach, legal dispute, or major payment error, add [ESCALATE] at the end of your response.`;

    const messages = [...history.slice(-10), { role: 'user', content: message }];
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 512, system, messages })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const raw = d.content?.[0]?.text || 'Sorry, I could not process your request.';
    const escalate = raw.includes('[ESCALATE]');
    res.json({ response: raw.replace('[ESCALATE]', '').trim(), escalate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── AI Content Writer ────────────────────────────────────────────────────────

app.post('/ai/generate-description', async (req, res) => {
  try {
    const { name, category, price } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const prompt = `Write professional e-commerce product descriptions for: Name: ${name}, Category: ${category||'electronics'}, Price: ${price?price+' SAR':'N/A'}.\nReturn ONLY a JSON object with keys: en, ar, zh, ko, ja, fr, es, de, it, pt. Each value is a 2-3 sentence compelling description in that language.`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 2048, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const text = d.content?.[0]?.text || '';
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Failed to parse AI response' });
    res.json({ descriptions: JSON.parse(m[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Smart Promotions ────────────────────────────────────────────────────────

app.post('/ai/generate-promotion', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const { rows } = await pool.query('SELECT id, name, price, category, stock FROM products WHERE stock > 50 ORDER BY stock DESC LIMIT 20');
    if (!rows.length) return res.status(400).json({ error: 'No high-stock products found for promotion analysis' });
    const prompt = `Analyze these Saudi e-commerce products and identify the SINGLE best candidate for a promotional discount to boost sales or clear overstock.\nProducts: ${JSON.stringify(rows)}\nReturn ONLY a JSON object: {product_id (number), product_name (string), discount_pct (integer 10-40), reason (max 15 words), urgency ("high"|"medium"|"low")}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 256, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const m = (d.content?.[0]?.text || '').match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Failed to parse AI response' });
    const promo = JSON.parse(m[0]);
    const code = `BLEX${promo.discount_pct}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    await pool.query(`INSERT INTO promotions (product_id, product_name, coupon_code, discount_pct, reason) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (coupon_code) DO NOTHING`, [promo.product_id, promo.product_name, code, promo.discount_pct, promo.reason]);
    await auditLog('ai_promotion', `Generated ${promo.discount_pct}% off for ${promo.product_name}: ${code}`);
    res.json({ ...promo, coupon_code: code });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/ai/promotions', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM promotions ORDER BY created_at DESC LIMIT 20');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/ai/promotions/:id', async (req, res) => {
  try {
    const { active } = req.body;
    const { rows } = await pool.query('UPDATE promotions SET active=$1 WHERE id=$2 RETURNING *', [active, req.params.id]);
    res.json(rows[0] || {});
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Customer Insights ───────────────────────────────────────────────────────

app.get('/ai/customer-insights', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const { rows } = await pool.query(
      `SELECT email, customer as name, COUNT(*) as order_count, SUM(total) as total_spent, MAX(created_at) as last_order, MIN(created_at) as first_order, json_agg(items) as all_items FROM orders WHERE email IS NOT NULL AND email != '' GROUP BY email, customer ORDER BY total_spent DESC`
    );
    if (!rows.length) return res.json([]);
    const customerData = rows.map(r => {
      const items = r.all_items.flat();
      const cats = {};
      items.forEach(it => { if (it?.category) cats[it.category] = (cats[it.category] || 0) + 1; });
      const favCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
      return { email: r.email, name: r.name, order_count: Number(r.order_count), total_spent: Number(r.total_spent), last_order: r.last_order, fav_category: favCat };
    });
    const prompt = `Analyze these Saudi e-commerce customers and assign each a segment.\nSegments: "VIP" (high spenders, frequent), "Regular" (consistent moderate), "At-Risk" (inactive or declining), "New" (1-2 orders).\nCustomers: ${JSON.stringify(customerData)}\nReturn ONLY a JSON array. Each item: {email, name, segment, total_spent, fav_category, last_order, reason (max 10 words)}.`;
    const text = await callClaude(prompt, 1024);
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) return res.json(customerData.map(c => ({ ...c, segment: 'Regular', reason: 'Default segment' })));
    res.json(JSON.parse(m[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/ai/send-targeted-email', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const { email, name, segment, total_spent, fav_category, last_order } = req.body;
    if (!email) return res.status(400).json({ error: 'email is required' });
    const prompt = `Write a personalized marketing email for a Saudi e-commerce customer.\nCustomer: Name=${name}, Segment=${segment}, Total Spent=${total_spent} SAR, Favorite Category=${fav_category}, Last Order=${last_order}.\nReturn ONLY a JSON object: {subject_en, subject_ar, body_en, body_ar}. Keep each body under 100 words. Be warm and include a relevant offer.`;
    const text = await callClaude(prompt, 1024);
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return res.status(500).json({ error: 'Failed to parse AI response' });
    await auditLog('ai_email', `Generated email for ${email} (${segment})`);
    res.json(JSON.parse(m[0]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Auto-Pilot ──────────────────────────────────────────────────────────────

const AP_DDL = `CREATE TABLE IF NOT EXISTS autopilot_config (key VARCHAR(50) PRIMARY KEY, value TEXT)`;
async function apGet(key) { await pool.query(AP_DDL); const r = await pool.query('SELECT value FROM autopilot_config WHERE key=$1', [key]); return r.rows[0]?.value || null; }
async function apSet(key, val) { await pool.query(AP_DDL); await pool.query(`INSERT INTO autopilot_config(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`, [key, String(val)]); }
async function callClaude(prompt, maxTokens = 1024) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || 'Claude API error');
  return d.content?.[0]?.text || '';
}

async function getCJImage(name) {
  try {
    const token = await getCJToken();
    const r = await fetch(`${CJ_BASE}/product/list?productNameEn=${encodeURIComponent(name)}&pageNum=1&pageSize=5`, {
      headers: { 'CJ-Access-Token': token }
    });
    const d = await cjParseJSON(r);
    const list = Array.isArray(d.data?.list) ? d.data.list : [];
    return list[0]?.productImageSet?.[0] || list[0]?.productImage || null;
  } catch {
    return null;
  }
}

app.post('/autopilot/run', async (req, res) => {
  const results = { imported: 0, prices_updated: 0, descriptions_generated: 0, webhooks_sent: 0, inventory_orders: 0, price_changes: 0, errors: [] };
  try {
    const hasKey = !!process.env.ANTHROPIC_API_KEY;

    // a. Fetch trending products (Google Trends + AI) and import top 3
    if (hasKey) try {
      const gTerms = await scrapeTrends();
      const ctx = gTerms.length ? `Google Trends: ${gTerms.slice(0, 8).join(', ')}. ` : '';
      const text = await callClaude(`It is 2026. ${ctx}List 3 trending products for a Saudi e-commerce store.\nReturn ONLY JSON array: [{name,category("electronics"|"accessories"|"clothing"),price_range}]`, 512);
      const m = text.match(/\[[\s\S]*\]/);
      if (m) {
        for (const tr of JSON.parse(m[0]).slice(0, 3)) {
          const ex = await pool.query('SELECT id FROM products WHERE LOWER(name)=LOWER($1)', [tr.name]);
          if (!ex.rows.length) {
            const price = Number(tr.price_range?.match(/\d+/)?.[0] || 99);
            const image = await getCJImage(tr.name);
            await pool.query('INSERT INTO products (name,price,category,description,stock,image) VALUES($1,$2,$3,$4,$5,$6)',
              [tr.name, price, tr.category || 'electronics', 'Trending product — auto imported', 999, image]);
            results.imported++;
          }
        }
      }
      if (results.imported) await auditLog('autopilot', `Imported ${results.imported} trending products`);
    } catch (e) { results.errors.push('trends:' + e.message.slice(0, 50)); }

    // b. Analyze all product prices and auto-apply suggestions
    if (hasKey) try {
      const { rows } = await pool.query('SELECT id,name,price,category FROM products ORDER BY id DESC LIMIT 30');
      if (rows.length) {
        const text = await callClaude(`Analyze pricing for Saudi e-commerce products: ${JSON.stringify(rows)}\nReturn ONLY JSON array: [{id,suggested_price,status("good"|"adjust"|"expensive")}]`);
        const m = text.match(/\[[\s\S]*\]/);
        if (m) {
          for (const a of JSON.parse(m[0]).filter(x => x.status !== 'good')) {
            await pool.query('UPDATE products SET price=$1 WHERE id=$2', [a.suggested_price, a.id]);
            results.prices_updated++;
          }
        }
        if (results.prices_updated) await auditLog('autopilot', `Updated ${results.prices_updated} product prices`);
      }
    } catch (e) { results.errors.push('prices:' + e.message.slice(0, 50)); }

    // c. Check low stock and notify supplier webhooks
    try {
      const { rows: low } = await pool.query('SELECT * FROM products WHERE stock > 0 AND stock < 5');
      for (const p of low) { await notifySupplierWebhook(p.id, p.name, p.stock); results.webhooks_sent++; }
      if (results.webhooks_sent) await auditLog('autopilot', `Sent ${results.webhooks_sent} low-stock webhooks`);
    } catch (e) { results.errors.push('webhooks:' + e.message.slice(0, 50)); }

    // d. Generate AI descriptions for products missing them (batched)
    if (hasKey) try {
      const { rows: nd } = await pool.query(`SELECT id,name,category,price FROM products WHERE description IS NULL OR description='' OR description='Trending product — auto imported' LIMIT 5`);
      if (nd.length) {
        const text = await callClaude(`Write a 2-sentence product description for each product. Return ONLY JSON array: [{id,description}]\nProducts: ${JSON.stringify(nd.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price + ' SAR' })))}`);
        const m = text.match(/\[[\s\S]*\]/);
        if (m) {
          for (const d of JSON.parse(m[0])) {
            await pool.query('UPDATE products SET description=$1 WHERE id=$2', [d.description, d.id]);
            results.descriptions_generated++;
          }
        }
        if (results.descriptions_generated) await auditLog('autopilot', `Generated ${results.descriptions_generated} descriptions`);
      }
    } catch (e) { results.errors.push('descriptions:' + e.message.slice(0, 50)); }

    // e. Inventory Agent - predict stock-outs
    if (hasKey) try {
      const { rows: ap } = await pool.query('SELECT id,name,stock FROM products WHERE stock>=0 ORDER BY stock ASC LIMIT 20');
      const { rows: as } = await pool.query(`SELECT item->>'id' pid,SUM((item->>'qty')::int) sold FROM orders,jsonb_array_elements(items) item WHERE created_at>NOW()-INTERVAL '30 days' GROUP BY item->>'id'`);
      const asm=Object.fromEntries(as.map(s=>[s.pid,Number(s.sold)]));
      const at=await callClaude(`Flag products needing reorder. Data:${JSON.stringify(ap.map(p=>({id:p.id,name:p.name,stock:p.stock,sold_30d:asm[String(p.id)]||0})))}\nReturn ONLY JSON:{"reorder":[{"product_id":1,"days_left":3}]}`,512);
      const am=at.match(/\{[\s\S]*\}/);if(am){const ar=JSON.parse(am[0]);results.inventory_orders=(ar.reorder||[]).length;if(results.inventory_orders)await auditLog('inventory_agent',`Autopilot: ${results.inventory_orders} need reorder`);}
    } catch(e){results.errors.push('inventory:'+e.message.slice(0,50));}

    // f. Pricing Agent - dynamic price adjustments
    if (hasKey) try {
      const { rows: pp } = await pool.query('SELECT id,name,price,cost_price,stock FROM products ORDER BY id LIMIT 20');
      const { rows: pd } = await pool.query(`SELECT item->>'id' pid,SUM((item->>'qty')::int) sold FROM orders,jsonb_array_elements(items) item WHERE created_at>NOW()-INTERVAL '7 days' GROUP BY item->>'id'`);
      const pdm=Object.fromEntries(pd.map(d=>[d.pid,Number(d.sold)]));
      const pdata=pp.map(p=>({id:p.id,name:p.name,price:Number(p.price),cost:Number(p.cost_price||p.price*0.6),stock:p.stock,sold_7d:pdm[String(p.id)]||0}));
      const pt=await callClaude(`Dynamic pricing: sold_7d>5=+5-15%, sold_7d=0&stock>20=-5-10%, never below cost, only if diff>2%. Data:${JSON.stringify(pdata)}\nReturn ONLY JSON:{"changes":[{"product_id":1,"old_price":100,"new_price":115}]}`,768);
      const pm=pt.match(/\{[\s\S]*\}/);if(pm){for(const ch of(JSON.parse(pm[0]).changes||[])){const orig=pdata.find(p=>p.id===ch.product_id);if(orig&&ch.new_price>=orig.cost&&Math.abs(ch.new_price-ch.old_price)/ch.old_price>0.02){await pool.query('UPDATE products SET price=$1 WHERE id=$2',[ch.new_price,ch.product_id]);await auditLog('pricing_agent',`${orig.name}:${ch.old_price}→${ch.new_price}`);results.price_changes++;}}}
    } catch(e){results.errors.push('pricing:'+e.message.slice(0,50));}

    const summary = { ...results, ran_at: new Date().toISOString() };
    await apSet('last_run', JSON.stringify(summary));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/autopilot/status', async (req, res) => {
  try {
    const [lr, en, hr] = await Promise.all([apGet('last_run'), apGet('enabled'), apGet('hour')]);
    res.json({ enabled: en === 'true', hour: Number(hr ?? 2), last_run: lr ? JSON.parse(lr) : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/autopilot/schedule', async (req, res) => {
  try {
    const { enabled, hour } = req.body;
    await Promise.all([apSet('enabled', !!enabled), apSet('hour', hour ?? 2)]);
    await auditLog('autopilot_schedule', `Auto-pilot ${enabled ? 'enabled' : 'disabled'} at ${hour ?? 2}:00`);
    res.json({ enabled: !!enabled, hour: Number(hour ?? 2) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Geo Routing ─────────────────────────────────────────────────────────────

const GEO_REGIONS = {
  MENA:     ['SA','AE','KW','BH','QA','OM','EG','JO','IQ','YE','LB'],
  Europe:   ['GB','FR','DE','IT','ES','PT','NL','BE','SE','NO','DK','FI','AT','CH','PL'],
  Asia:     ['CN','JP','KR','IN','SG','TH','MY','VN','PH','ID','TW','HK'],
  Americas: ['US','CA','BR','MX','AR','CL','CO','PE'],
  Africa:   ['ZA','NG','KE','GH','TZ','ET']
};
const getRegion = cc => { for (const [r, cs] of Object.entries(GEO_REGIONS)) if (cs.includes(cc)) return r; return 'Other'; };

app.get('/suppliers/best', async (req, res) => {
  try {
    const { product_id, customer_country } = req.query;
    if (!product_id) return res.status(400).json({ error: 'product_id required' });
    const cc = (customer_country || 'US').toUpperCase();

    const { rows } = await pool.query(`
      SELECT ps.supplier_id, ps.supplier_price, ps.stock_available,
             s.name AS supplier_name,
             sr.country_codes, sr.avg_shipping_days
      FROM product_suppliers ps
      JOIN suppliers s ON s.id = ps.supplier_id
      LEFT JOIN supplier_regions sr ON sr.supplier_id = ps.supplier_id
      WHERE ps.product_id = $1 AND ps.stock_available > 0
      ORDER BY sr.avg_shipping_days ASC NULLS LAST
    `, [product_id]);

    const getSimilar = async () => {
      const prod = await pool.query('SELECT category FROM products WHERE id=$1', [product_id]);
      const cat = prod.rows[0]?.category || 'electronics';
      const { rows: sim } = await pool.query(
        'SELECT id,name,price,image,category FROM products WHERE category=$1 AND id!=$2 AND stock>0 ORDER BY id DESC LIMIT 3',
        [cat, product_id]
      );
      return sim;
    };

    if (rows.length === 0) {
      return res.json({ available: false, similar: await getSimilar() });
    }

    const custRegion = getRegion(cc);
    let best = null, shipping = 14, isLocal = false;

    for (const r of rows) {
      if ((r.country_codes || []).includes(cc)) { best = r; shipping = r.avg_shipping_days || 3; isLocal = true; break; }
    }
    if (!best) {
      for (const r of rows) {
        const codes = r.country_codes || [];
        if (codes.length && getRegion(codes[0]) === custRegion) { best = r; shipping = r.avg_shipping_days || 7; break; }
      }
    }
    if (!best) { best = rows[0]; shipping = best.avg_shipping_days || 14; }

    const shipsFrom = best.country_codes?.[0] || 'CN';
    const similar = isLocal ? [] : await getSimilar();

    res.json({
      available: true,
      supplier_id: best.supplier_id,
      supplier_name: best.supplier_name,
      ships_from: shipsFrom,
      estimated_days: shipping,
      is_local: isLocal,
      similar
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/product-suppliers/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ps.supplier_id, ps.supplier_price, ps.stock_available,
             s.name AS supplier_name,
             sr.country_codes, sr.avg_shipping_days
      FROM product_suppliers ps
      JOIN suppliers s ON s.id = ps.supplier_id
      LEFT JOIN supplier_regions sr ON sr.supplier_id = ps.supplier_id
      WHERE ps.product_id = $1
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/supplier-regions', async (req, res) => {
  try {
    const { supplier_id, country_codes, avg_shipping_days } = req.body;
    if (!supplier_id) return res.status(400).json({ error: 'supplier_id required' });
    const { rows } = await pool.query(
      `INSERT INTO supplier_regions (supplier_id, country_codes, avg_shipping_days)
       VALUES ($1, $2, $3)
       ON CONFLICT (supplier_id) DO UPDATE SET country_codes=$2, avg_shipping_days=$3 RETURNING *`,
      [supplier_id, country_codes || [], avg_shipping_days || 7]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/product-suppliers', async (req, res) => {
  try {
    const { product_id, supplier_id, supplier_price, stock_available } = req.body;
    if (!product_id || !supplier_id) return res.status(400).json({ error: 'product_id and supplier_id required' });
    const { rows } = await pool.query(
      `INSERT INTO product_suppliers (product_id, supplier_id, supplier_price, stock_available)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, supplier_id) DO UPDATE SET supplier_price=$3, stock_available=$4 RETURNING *`,
      [product_id, supplier_id, supplier_price || null, stock_available || 0]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Visual Search ────────────────────────────────────────────────────────

app.post('/ai/visual-search', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'image required' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const { rows: prods } = await pool.query('SELECT name, category FROM products WHERE stock > 0 ORDER BY id DESC LIMIT 50');
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 128, messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
        { type: 'text', text: `Products in store: ${JSON.stringify(prods)}. Identify what this image shows and return ONLY a JSON: {"query":"<2-4 word search term matching a product type above>"}` }
      ]}]})
    });
    const d = await r.json();
    if (!r.ok) return res.json({ query: '' });
    const text = d.content?.[0]?.text || '';
    const m = text.match(/\{[\s\S]*\}/);
    res.json(m ? JSON.parse(m[0]) : { query: '' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Style Advisor ────────────────────────────────────────────────────────

app.post('/ai/style-advisor', async (req, res) => {
  try {
    const { query, products = [] } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const { rows: prods } = await pool.query('SELECT id, name, price, category, description FROM products WHERE stock > 0 ORDER BY id DESC LIMIT 40');
    const prompt = `You are a luxury fashion and lifestyle stylist. Customer request: "${query}"\nAvailable products: ${JSON.stringify(prods)}\nRecommend exactly 3 products. Return ONLY JSON: {"recommendations":[{"id":number,"name":"string","reason":"1 sentence why it fits the request","price":number}]}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 512, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const text = d.content?.[0]?.text || '';
    const m = text.match(/\{[\s\S]*\}/);
    res.json(m ? JSON.parse(m[0]) : { recommendations: [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Size & Fit ───────────────────────────────────────────────────────────

app.post('/ai/size-fit', async (req, res) => {
  try {
    const { product, measurements } = req.body;
    if (!product || !measurements) return res.status(400).json({ error: 'product and measurements required' });
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
    const prompt = `For the clothing product "${product}", given measurements: chest=${measurements.chest}cm, waist=${measurements.waist}cm, height=${measurements.height}cm, recommend the correct size. Return ONLY JSON: {"size":"XS|S|M|L|XL|XXL","confidence":"high|medium|low","note":"1 short sentence"}`;
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 128, messages: [{ role: 'user', content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) return res.status(500).json({ error: d.error?.message || 'Claude API error' });
    const text = d.content?.[0]?.text || '';
    const m = text.match(/\{[\s\S]*\}/);
    res.json(m ? JSON.parse(m[0]) : { size: 'M', confidence: 'medium', note: '' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── AI Agents ───────────────────────────────────────────────────────────────

app.get('/ai/agents/status', authenticate, async (req, res) => {
  try {
    const [s, inv, pr] = await Promise.all([apGet('sales_agent_last'), apGet('inventory_agent_last'), apGet('pricing_agent_last')]);
    res.json({ sales_agent_last: s ? JSON.parse(s) : null, inventory_agent_last: inv ? JSON.parse(inv) : null, pricing_agent_last: pr ? JSON.parse(pr) : null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/ai/sales-agent', authenticate, async (req, res) => {
  try {
    const { email, behavior = {} } = req.body;
    const { cart_items = [], wishlist = [], views = [], query = '' } = behavior;
    let pastOrders = [];
    if (email) { const { rows } = await pool.query('SELECT id,total,created_at FROM orders WHERE email=$1 ORDER BY created_at DESC LIMIT 5', [email]); pastOrders = rows; }
    const cartValue = cart_items.reduce((s, i) => s + (Number(i.price) * (i.qty || 1)), 0);
    const text = await callClaude(`Sales AI for BLEX Saudi e-commerce. Customer: email=${email||'guest'}, cart=${cartValue} SAR (${cart_items.length} items), wishlist=${wishlist.length}, past orders=${pastOrders.length}, views=${views.length}, query="${query}". Decide ONE: discount_offer (cart abandon/loyalty), price_negotiate (wants better price), reorder_prompt (repeat buyer), none. Return ONLY JSON: {"action":"discount_offer","message":"<personalized EN message>","discount_pct":10,"confidence":"high"}`, 512);
    const m = text.match(/\{[\s\S]*\}/);
    const result = m ? JSON.parse(m[0]) : { action: 'none', message: '', discount_pct: 0, confidence: 'low' };
    await apSet('sales_agent_last', JSON.stringify({ ...result, ran_at: new Date().toISOString() }));
    await auditLog('sales_agent', `Action: ${result.action} (${result.confidence})`);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/ai/inventory-agent', authenticate, async (req, res) => {
  try {
    const { rows: prods } = await pool.query('SELECT id,name,stock,category FROM products WHERE stock>=0 ORDER BY stock ASC LIMIT 30');
    const { rows: sales } = await pool.query(`SELECT item->>'id' pid,SUM((item->>'qty')::int) sold FROM orders,jsonb_array_elements(items) item WHERE created_at>NOW()-INTERVAL '30 days' GROUP BY item->>'id'`);
    const sm = Object.fromEntries(sales.map(s => [s.pid, Number(s.sold)]));
    const data = prods.map(p => ({ id: p.id, name: p.name, stock: p.stock, sold_30d: sm[String(p.id)] || 0 }));
    const text = await callClaude(`Inventory AI. Flag products needing reorder (stock<20 or daily_velocity>stock/14). Data: ${JSON.stringify(data)}\nReturn ONLY JSON: {"predictions":[{"product_id":1,"product_name":"X","stock":5,"daily_velocity":0.5,"days_until_stockout":10,"action":"reorder_now","reorder_qty":50}]}`, 1024);
    const m = text.match(/\{[\s\S]*\}/);
    const result = m ? JSON.parse(m[0]) : { predictions: [] };
    const criticals = (result.predictions || []).filter(p => p.action === 'reorder_now').length;
    await apSet('inventory_agent_last', JSON.stringify({ ...result, ran_at: new Date().toISOString() }));
    if (criticals) await auditLog('inventory_agent', `${criticals} products flagged for reorder`);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/ai/pricing-agent', authenticate, async (req, res) => {
  try {
    const { rows: prods } = await pool.query('SELECT id,name,price,cost_price,stock,category FROM products ORDER BY id LIMIT 30');
    const { rows: demand } = await pool.query(`SELECT item->>'id' pid,SUM((item->>'qty')::int) sold FROM orders,jsonb_array_elements(items) item WHERE created_at>NOW()-INTERVAL '7 days' GROUP BY item->>'id'`);
    const dm = Object.fromEntries(demand.map(d => [d.pid, Number(d.sold)]));
    const data = prods.map(p => ({ id: p.id, name: p.name, price: Number(p.price), cost: Number(p.cost_price || p.price * 0.6), stock: p.stock, sold_7d: dm[String(p.id)] || 0 }));
    const text = await callClaude(`Dynamic pricing AI. Rules: sold_7d>5=+5-15%, sold_7d=0&stock>20=-5-10%, never below cost, only if diff>2%. Data: ${JSON.stringify(data)}\nReturn ONLY JSON: {"changes":[{"product_id":1,"old_price":100,"new_price":115,"reason":"high demand"}]}`, 1024);
    const m = text.match(/\{[\s\S]*\}/);
    const changes = m ? (JSON.parse(m[0]).changes || []) : [];
    let applied = 0;
    for (const ch of changes) {
      const orig = data.find(p => p.id === ch.product_id);
      if (orig && ch.new_price >= orig.cost && Math.abs(ch.new_price - ch.old_price) / ch.old_price > 0.02) {
        await pool.query('UPDATE products SET price=$1 WHERE id=$2', [ch.new_price, ch.product_id]);
        await auditLog('pricing_agent', `${orig.name}: ${ch.old_price}→${ch.new_price} SAR (${ch.reason})`);
        applied++;
      }
    }
    await apSet('pricing_agent_last', JSON.stringify({ changes, applied, ran_at: new Date().toISOString() }));
    res.json({ changes, applied });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── Static files (React build) ───────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'frontend/build')));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// ─── Server ───────────────────────────────────────────────────────────────────

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
