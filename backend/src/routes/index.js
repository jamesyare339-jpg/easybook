const express = require('express');
const router = express.Router();

// Controllers
const { login, getProfile, changePassword } = require('../controllers/authController');
const { getDashboardSummary } = require('../controllers/dashboardController');
const { getProducts, getProduct, createProduct, updateProduct, deleteProduct, updateStock, transferStock, getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/inventoryController');
const { createSale, getSales, getSalesSummary } = require('../controllers/salesController');
const { getStaff, createStaff, updateStaff, generatePayroll, getPayroll, updatePayroll } = require('../controllers/staffController');
const { getDailyReport, getMonthlyReport, getAnnualReport } = require('../controllers/reportsController');
const { getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer, getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } = require('../controllers/partnersController');
const { getUsers, getUser, createUser, updateUser, resetPassword, toggleUserActive } = require('../controllers/usersController');
const { getStockMovements, getProductMovementSummary } = require('../controllers/stockMovementController');
const { getProfitLossReport, getProfitByProduct, getProfitByBranch } = require('../controllers/profitLossController');
const { generateSaleInvoice, generatePurchaseInvoice, getInvoiceHistory } = require('../controllers/invoiceController');
const { createBackup, restoreBackup, getBackupHistory } = require('../controllers/backupController');

// Middleware
const { authMiddleware, requireRole } = require('../middleware/auth');
const { query } = require('../config/db');

// ─── AUTH ROUTES ───────────────────────────────────────────────
router.post('/auth/login', login);
router.get('/auth/profile', authMiddleware, getProfile);
router.put('/auth/change-password', authMiddleware, changePassword);

// ─── DASHBOARD ─────────────────────────────────────────────────
router.get('/dashboard', authMiddleware, getDashboardSummary);

// ─── INVENTORY ─────────────────────────────────────────────────
router.get('/products', authMiddleware, getProducts);
router.get('/products/categories', authMiddleware, getCategories);
router.post('/products/categories', authMiddleware, requireRole('admin', 'manager'), createCategory);
router.put('/products/categories/:id', authMiddleware, requireRole('admin', 'manager'), updateCategory);
router.delete('/products/categories/:id', authMiddleware, requireRole('admin', 'manager'), deleteCategory);
router.get('/products/:id', authMiddleware, getProduct);
router.post('/products', authMiddleware, requireRole('admin', 'manager', 'storekeeper'), createProduct);
router.put('/products/:id', authMiddleware, requireRole('admin', 'manager', 'storekeeper'), updateProduct);
router.delete('/products/:id', authMiddleware, requireRole('admin', 'manager'), deleteProduct);
router.put('/stock/update', authMiddleware, requireRole('admin', 'manager', 'storekeeper'), updateStock);
router.post('/stock/transfer', authMiddleware, requireRole('admin', 'manager', 'storekeeper'), transferStock);

// ─── SALES ─────────────────────────────────────────────────────
router.get('/sales', authMiddleware, getSales);
router.get('/sales/summary', authMiddleware, getSalesSummary);
router.post('/sales', authMiddleware, requireRole('admin', 'manager', 'cashier'), createSale);

// ─── PURCHASES ─────────────────────────────────────────────────
router.get('/purchases', authMiddleware, async (req, res) => {
  try {
    const { branch_id } = req.query;
    let sql = `SELECT p.*, b.name as branch_name FROM purchases p LEFT JOIN branches b ON p.branch_id = b.id WHERE 1=1`;
    const params = [];
    if (branch_id) { sql += ' AND p.branch_id = $1'; params.push(branch_id); }
    sql += ' ORDER BY p.created_at DESC LIMIT 50';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/purchases', authMiddleware, requireRole('admin', 'manager'), async (req, res) => {
  const { getClient } = require('../config/db');
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { supplier_name, supplier_id, branch_id, items, payment_method, paid_amount, notes } = req.body;
    let total = 0;
    for (const item of items) total += item.quantity * item.unit_cost;
    const paid = parseFloat(paid_amount) || total;
    const debt = Math.max(0, total - paid);
    const date = new Date();
    const num = `PUR-${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*900)+100}`;

    const purRes = await client.query(
      `INSERT INTO purchases (purchase_number, supplier_id, supplier_name, branch_id, user_id, total_amount, paid_amount, debt_amount, payment_method, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [num, supplier_id||null, supplier_name||'Unknown Supplier', branch_id, req.user.id, total, paid, debt, payment_method, notes||null]
    );
    const pur = purRes.rows[0];

    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, unit_cost, total_cost) VALUES ($1,$2,$3,$4,$5,$6)`,
        [pur.id, item.product_id, item.product_name, item.quantity, item.unit_cost, item.quantity * item.unit_cost]
      );
      await client.query(
        `INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1,$2,$3)
         ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = stock.quantity + $3, updated_at = NOW()`,
        [item.product_id, branch_id, item.quantity]
      );
    }
    if (debt > 0 && supplier_id) {
      await client.query('UPDATE suppliers SET total_debt = total_debt + $1 WHERE id = $2', [debt, supplier_id]);
    }
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Purchase recorded / Iibsiga waa la diiwaangeliyay', data: pur });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  } finally { client.release(); }
});

// ─── CUSTOMERS ─────────────────────────────────────────────────
router.get('/customers', authMiddleware, getCustomers);
router.get('/customers/:id', authMiddleware, getCustomer);
router.post('/customers', authMiddleware, createCustomer);
router.put('/customers/:id', authMiddleware, updateCustomer);
router.delete('/customers/:id', authMiddleware, requireRole('admin', 'manager'), deleteCustomer);

// ─── SUPPLIERS ─────────────────────────────────────────────────
router.get('/suppliers', authMiddleware, getSuppliers);
router.get('/suppliers/:id', authMiddleware, getSupplier);
router.post('/suppliers', authMiddleware, requireRole('admin', 'manager'), createSupplier);
router.put('/suppliers/:id', authMiddleware, requireRole('admin', 'manager'), updateSupplier);
router.delete('/suppliers/:id', authMiddleware, requireRole('admin', 'manager'), deleteSupplier);

// ─── EXPENSES ──────────────────────────────────────────────────
router.get('/expenses', authMiddleware, async (req, res) => {
  try {
    const { branch_id, month, year } = req.query;
    let sql = `SELECT e.*, b.name as branch_name FROM expenses e LEFT JOIN branches b ON e.branch_id = b.id WHERE 1=1`;
    const params = []; let pi = 1;
    if (branch_id) { sql += ` AND e.branch_id = $${pi++}`; params.push(branch_id); }
    if (month) { sql += ` AND EXTRACT(MONTH FROM e.expense_date) = $${pi++}`; params.push(month); }
    if (year) { sql += ` AND EXTRACT(YEAR FROM e.expense_date) = $${pi++}`; params.push(year); }
    sql += ' ORDER BY e.expense_date DESC';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.post('/expenses', authMiddleware, async (req, res) => {
  try {
    const { type, type_so, amount, branch_id, notes, expense_date } = req.body;
    const result = await query(
      'INSERT INTO expenses (type, type_so, amount, branch_id, user_id, notes, expense_date) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [type, type_so, amount, branch_id, req.user.id, notes, expense_date || new Date()]
    );
    res.status(201).json({ success: true, message: 'Expense saved / Kharashaadka waa la keydiiyay', data: result.rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── STAFF & PAYROLL ───────────────────────────────────────────
router.get('/staff', authMiddleware, getStaff);
router.post('/staff', authMiddleware, requireRole('admin', 'manager'), createStaff);
router.put('/staff/:id', authMiddleware, requireRole('admin', 'manager'), updateStaff);
router.get('/payroll', authMiddleware, getPayroll);
router.post('/payroll/generate', authMiddleware, requireRole('admin', 'manager'), generatePayroll);
router.put('/payroll/:id', authMiddleware, requireRole('admin', 'manager'), updatePayroll);

// ─── BRANCHES ──────────────────────────────────────────────────
router.get('/branches', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, 
             (SELECT COALESCE(SUM(s.quantity),0) FROM stock s WHERE s.branch_id = b.id) as total_stock,
             (SELECT COUNT(*) FROM staff st WHERE st.branch_id = b.id AND st.is_active = true) as staff_count
      FROM branches b WHERE b.is_active = true ORDER BY b.name`);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── CASH ACCOUNTS ─────────────────────────────────────────────
router.get('/cash', authMiddleware, async (req, res) => {
  try {
    const { branch_id } = req.query;
    let sql = `SELECT ca.*, b.name as branch_name FROM cash_accounts ca LEFT JOIN branches b ON ca.branch_id = b.id WHERE 1=1`;
    const params = [];
    if (branch_id) { sql += ' AND ca.branch_id = $1'; params.push(branch_id); }
    sql += ' ORDER BY b.name, ca.type';
    const result = await query(sql, params);
    const total = result.rows.reduce((sum, r) => sum + parseFloat(r.balance), 0);
    res.json({ success: true, data: result.rows, total_balance: total });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── CREDIT / DEBTS ────────────────────────────────────────────
router.get('/debts/customers', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT cd.*, c.name as customer_name, c.phone
      FROM customer_debts cd JOIN customers c ON cd.customer_id = c.id
      WHERE cd.status = 'active' ORDER BY cd.due_date ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.get('/debts/suppliers', authMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT sd.*, s.name as supplier_name, s.phone
      FROM supplier_debts sd JOIN suppliers s ON sd.supplier_id = s.id
      WHERE sd.status = 'active' ORDER BY sd.due_date ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── NOTIFICATIONS ─────────────────────────────────────────────
router.get('/notifications', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT * FROM notifications WHERE is_read = false ORDER BY created_at DESC LIMIT 30');
    res.json({ success: true, data: result.rows });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) { res.status(500).json({ success: false, message: 'Server error' }); }
});

// ─── REPORTS ───────────────────────────────────────────────────
router.get('/reports/daily', authMiddleware, getDailyReport);
router.get('/reports/monthly', authMiddleware, getMonthlyReport);
router.get('/reports/annual', authMiddleware, getAnnualReport);

// ─── USERS MANAGEMENT (admin only) ─────────────────────────────
router.get('/users', authMiddleware, requireRole('admin'), getUsers);
router.get('/users/:id', authMiddleware, requireRole('admin'), getUser);
router.post('/users', authMiddleware, requireRole('admin'), createUser);
router.put('/users/:id', authMiddleware, requireRole('admin'), updateUser);
router.put('/users/:id/reset-password', authMiddleware, requireRole('admin'), resetPassword);
router.put('/users/:id/toggle-active', authMiddleware, requireRole('admin'), toggleUserActive);

// ─── STOCK MOVEMENT HISTORY ─────────────────────────────────────
router.get('/stock/movements', authMiddleware, getStockMovements);
router.get('/stock/movements/product/:product_id', authMiddleware, getProductMovementSummary);

// ─── PROFIT & LOSS REPORTS ───────────────────────────────────────
router.get('/reports/profit-loss', authMiddleware, requireRole('admin', 'manager'), getProfitLossReport);
router.get('/reports/profit-by-product', authMiddleware, requireRole('admin', 'manager'), getProfitByProduct);
router.get('/reports/profit-by-branch', authMiddleware, requireRole('admin', 'manager'), getProfitByBranch);

// ─── INVOICES (PDF-ready data) ───────────────────────────────────
router.get('/invoices/sale/:sale_id', authMiddleware, generateSaleInvoice);
router.get('/invoices/purchase/:purchase_id', authMiddleware, generatePurchaseInvoice);
router.get('/invoices/history', authMiddleware, getInvoiceHistory);

// ─── BACKUP & RESTORE (admin only) ───────────────────────────────
router.get('/backup/create', authMiddleware, requireRole('admin'), createBackup);
router.post('/backup/restore', authMiddleware, requireRole('admin'), restoreBackup);
router.get('/backup/history', authMiddleware, requireRole('admin'), getBackupHistory);

// ─── ONE-TIME DATABASE SETUP (no shell access needed) ────────────
// Visit /api/setup/init-database?key=YOUR_SECRET once after first deploy.
router.get('/setup/init-database', async (req, res) => {
  try {
    if (req.query.key !== (process.env.SETUP_SECRET || 'easybook-setup-2026')) {
      return res.status(403).json({ success: false, message: 'Invalid setup key' });
    }
    const { execSync } = require('child_process');
    const output = execSync('node src/config/initDb.js', { encoding: 'utf8', cwd: process.cwd() });
    res.json({ success: true, message: 'Database tables created ✓', output });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Init failed', error: err.message, output: err.stdout, stderr: err.stderr });
  }
});

router.get('/setup/seed-database', async (req, res) => {
  try {
    if (req.query.key !== (process.env.SETUP_SECRET || 'easybook-setup-2026')) {
      return res.status(403).json({ success: false, message: 'Invalid setup key' });
    }
    const { execSync } = require('child_process');
    const output = execSync('node src/config/seedDb.js', { encoding: 'utf8', cwd: process.cwd() });
    res.json({ success: true, message: 'Database seeded ✓ Admin login: admin@easybook.so / admin123', output });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Seed failed', error: err.message, output: err.stdout, stderr: err.stderr });
  }
});

module.exports = router;
