const { query, getClient } = require('../config/db');

// Generate sale number
const generateSaleNumber = async () => {
  const date = new Date();
  const prefix = `SALE-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const countRes = await query(`SELECT COUNT(*) FROM sales WHERE sale_number LIKE $1`, [`${prefix}%`]);
  const count = parseInt(countRes.rows[0].count) + 1;
  return `${prefix}-${String(count).padStart(3, '0')}`;
};

// Create new sale / Samee iib cusub
const createSale = async (req, res) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { customer_name, customer_id, branch_id, items, payment_method, paid_amount, notes } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sale items required / Alaabta la iibiyey ayaa loo baahan yahay' });
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.quantity * item.unit_price;
    }

    const paidAmt = parseFloat(paid_amount) || totalAmount;
    const debtAmt = Math.max(0, totalAmount - paidAmt);

    const saleNumber = await generateSaleNumber();

    // Create sale record
    const saleRes = await client.query(
      `INSERT INTO sales (sale_number, customer_id, customer_name, branch_id, user_id, total_amount, paid_amount, debt_amount, payment_method, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [saleNumber, customer_id || null, customer_name || 'Walk-in Customer', branch_id, req.user.id, totalAmount, paidAmt, debtAmt, payment_method, notes || null]
    );
    const sale = saleRes.rows[0];

    // Insert sale items & deduct stock
    for (const item of items) {
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [sale.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.quantity * item.unit_price]
      );

      // Deduct from stock
      await client.query(
        'UPDATE stock SET quantity = GREATEST(0, quantity - $1), updated_at = NOW() WHERE product_id = $2 AND branch_id = $3',
        [item.quantity, item.product_id, branch_id]
      );
    }

    // If there's debt, record it
    if (debtAmt > 0 && customer_id) {
      await client.query(
        'INSERT INTO customer_debts (customer_id, sale_id, amount, remaining, due_date) VALUES ($1, $2, $3, $4, $5)',
        [customer_id, sale.id, debtAmt, debtAmt, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
      );
      await client.query('UPDATE customers SET total_debt = total_debt + $1 WHERE id = $2', [debtAmt, customer_id]);
    }

    // Update cash account
    await client.query(
      `INSERT INTO cash_accounts (branch_id, type, balance) VALUES ($1, $2, $3)
       ON CONFLICT (branch_id, type) DO UPDATE SET balance = cash_accounts.balance + $3, updated_at = NOW()`,
      [branch_id, payment_method === 'evc_plus' ? 'evc_plus' : payment_method === 'sahal' ? 'sahal' : payment_method === 'bank' ? 'bank' : 'cash', paidAmt]
    );

    // Check low stock and create notifications
    for (const item of items) {
      const stockCheck = await client.query(
        'SELECT s.quantity, p.low_stock_threshold, p.name FROM stock s JOIN products p ON s.product_id = p.id WHERE s.product_id = $1 AND s.branch_id = $2',
        [item.product_id, branch_id]
      );
      if (stockCheck.rows.length > 0) {
        const { quantity, low_stock_threshold, name } = stockCheck.rows[0];
        if (quantity <= low_stock_threshold) {
          await client.query(
            `INSERT INTO notifications (type, title, message, branch_id) VALUES ('low_stock', '⚠️ Stock Yaraanshaha', $1, $2)`,
            [`${name} — ${quantity} kaliya ayaa hadhay / only ${quantity} left`, branch_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Sale created successfully / Iibka si guul leh ayaa loo diiwaangeliyay',
      data: { ...sale, items },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Create sale error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  } finally {
    client.release();
  }
};

// Get all sales / Dhammaan iibka
const getSales = async (req, res) => {
  try {
    const { branch_id, date_from, date_to, payment_method, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
      SELECT s.*, b.name as branch_name,
             JSON_AGG(JSON_BUILD_OBJECT('product_name', si.product_name, 'quantity', si.quantity, 'unit_price', si.unit_price, 'total_price', si.total_price)) as items
      FROM sales s
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE 1=1
    `;
    const params = [];
    let pi = 1;

    if (branch_id) { sql += ` AND s.branch_id = $${pi++}`; params.push(branch_id); }
    if (date_from) { sql += ` AND DATE(s.created_at) >= $${pi++}`; params.push(date_from); }
    if (date_to) { sql += ` AND DATE(s.created_at) <= $${pi++}`; params.push(date_to); }
    if (payment_method) { sql += ` AND s.payment_method = $${pi++}`; params.push(payment_method); }

    sql += ` GROUP BY s.id, b.name ORDER BY s.created_at DESC LIMIT $${pi++} OFFSET $${pi++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Count total
    let countSql = `SELECT COUNT(*) FROM sales WHERE 1=1`;
    const countParams = [];
    let ci = 1;
    if (branch_id) { countSql += ` AND branch_id = $${ci++}`; countParams.push(branch_id); }
    if (date_from) { countSql += ` AND DATE(created_at) >= $${ci++}`; countParams.push(date_from); }
    if (date_to) { countSql += ` AND DATE(created_at) <= $${ci++}`; countParams.push(date_to); }
    const countRes = await query(countSql, countParams);

    res.json({
      success: true,
      data: result.rows,
      pagination: { total: parseInt(countRes.rows[0].count), page: parseInt(page), limit: parseInt(limit) }
    });
  } catch (err) {
    console.error('Get sales error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get sales summary by payment method
const getSalesSummary = async (req, res) => {
  try {
    const { branch_id, date } = req.query;
    const params = [];
    let pi = 1;
    let where = `WHERE DATE(created_at) = $${pi++}`;
    params.push(date || 'CURRENT_DATE');

    if (branch_id) { where += ` AND branch_id = $${pi++}`; params.push(branch_id); }

    const result = await query(
      `SELECT
         COALESCE(SUM(total_amount), 0) as total_sales,
         COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN paid_amount ELSE 0 END), 0) as cash,
         COALESCE(SUM(CASE WHEN payment_method = 'evc_plus' THEN paid_amount ELSE 0 END), 0) as evc_plus,
         COALESCE(SUM(CASE WHEN payment_method = 'sahal' THEN paid_amount ELSE 0 END), 0) as sahal,
         COALESCE(SUM(CASE WHEN payment_method = 'premier' THEN paid_amount ELSE 0 END), 0) as premier,
         COALESCE(SUM(CASE WHEN payment_method = 'bank' THEN paid_amount ELSE 0 END), 0) as bank,
         COUNT(*) as transaction_count
       FROM sales ${where}`,
      params
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createSale, getSales, getSalesSummary };
