const { query } = require('../config/db');

// ═══════════════ CUSTOMERS ═══════════════

const getCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT c.*,
        (SELECT COUNT(*) FROM sales s WHERE s.customer_id = c.id) as total_orders,
        (SELECT COALESCE(SUM(s.total_amount),0) FROM sales s WHERE s.customer_id = c.id) as lifetime_value
      FROM customers c WHERE 1=1
    `;
    const params = [];
    if (search) { sql += ' AND (c.name ILIKE $1 OR c.phone ILIKE $1)'; params.push(`%${search}%`); }
    sql += ' ORDER BY c.name';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const getCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const custRes = await query('SELECT * FROM customers WHERE id = $1', [id]);
    if (custRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found / Macaamilka lama helin' });

    const salesRes = await query('SELECT * FROM sales WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 20', [id]);
    const debtsRes = await query('SELECT * FROM customer_debts WHERE customer_id = $1 ORDER BY due_date', [id]);

    res.json({ success: true, data: { ...custRes.rows[0], recent_sales: salesRes.rows, debts: debtsRes.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required / Magaca ayaa loo baahan yahay' });
    const result = await query('INSERT INTO customers (name, phone, address) VALUES ($1,$2,$3) RETURNING *', [name, phone || null, address || null]);
    res.status(201).json({ success: true, message: 'Customer added / Macaamilka waa la daray', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;
    const result = await query('UPDATE customers SET name=$1, phone=$2, address=$3 WHERE id=$4 RETURNING *', [name, phone, address, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, message: 'Customer updated / Macaamilka waa la cusbooneysiiyay', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const debtCheck = await query('SELECT total_debt FROM customers WHERE id = $1', [id]);
    if (debtCheck.rows.length > 0 && parseFloat(debtCheck.rows[0].total_debt) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete customer with active debt / Macaamil leh deyn lama tirtirin karo' });
    }
    await query('DELETE FROM customers WHERE id = $1', [id]);
    res.json({ success: true, message: 'Customer deleted / Macaamilka waa la tirtiray' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ═══════════════ SUPPLIERS ═══════════════

const getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    let sql = `
      SELECT s.*,
        (SELECT COUNT(*) FROM purchases p WHERE p.supplier_id = s.id) as total_orders,
        (SELECT COALESCE(SUM(p.total_amount),0) FROM purchases p WHERE p.supplier_id = s.id) as lifetime_value
      FROM suppliers s WHERE 1=1
    `;
    const params = [];
    if (search) { sql += ' AND (s.name ILIKE $1 OR s.phone ILIKE $1)'; params.push(`%${search}%`); }
    sql += ' ORDER BY s.name';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

const getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supRes = await query('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (supRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found / Supplier-ka lama helin' });

    const purchasesRes = await query('SELECT * FROM purchases WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 20', [id]);
    const debtsRes = await query('SELECT * FROM supplier_debts WHERE supplier_id = $1 ORDER BY due_date', [id]);

    res.json({ success: true, data: { ...supRes.rows[0], recent_purchases: purchasesRes.rows, debts: debtsRes.rows } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const createSupplier = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name required / Magaca ayaa loo baahan yahay' });
    const result = await query('INSERT INTO suppliers (name, phone, address) VALUES ($1,$2,$3) RETURNING *', [name, phone || null, address || null]);
    res.status(201).json({ success: true, message: 'Supplier added / Supplier-ka waa la daray', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address } = req.body;
    const result = await query('UPDATE suppliers SET name=$1, phone=$2, address=$3 WHERE id=$4 RETURNING *', [name, phone, address, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found' });
    res.json({ success: true, message: 'Supplier updated / Supplier-ka waa la cusbooneysiiyay', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const debtCheck = await query('SELECT total_debt FROM suppliers WHERE id = $1', [id]);
    if (debtCheck.rows.length > 0 && parseFloat(debtCheck.rows[0].total_debt) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete supplier with active debt / Supplier leh deyn lama tirtirin karo' });
    }
    await query('DELETE FROM suppliers WHERE id = $1', [id]);
    res.json({ success: true, message: 'Supplier deleted / Supplier-ka waa la tirtiray' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier,
};
