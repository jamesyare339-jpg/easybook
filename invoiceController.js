const { query } = require('../config/db');

// Generate invoice number
const generateInvoiceNumber = async (type) => {
  const prefix = type === 'sale' ? 'INV' : 'PINV';
  const date = new Date();
  const datePrefix = `${prefix}-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const countRes = await query('SELECT COUNT(*) FROM invoices WHERE invoice_number LIKE $1', [`${datePrefix}%`]);
  const count = parseInt(countRes.rows[0].count) + 1;
  return `${datePrefix}-${String(count).padStart(3, '0')}`;
};

// Generate invoice for a sale
const generateSaleInvoice = async (req, res) => {
  try {
    const { sale_id } = req.params;

    const saleRes = await query(
      `SELECT s.*, b.name as branch_name, b.phone as branch_phone, b.location as branch_location, u.name as cashier_name
       FROM sales s
       LEFT JOIN branches b ON s.branch_id = b.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [sale_id]
    );
    if (saleRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Sale not found / Iibka lama helin' });

    const itemsRes = await query('SELECT * FROM sale_items WHERE sale_id = $1', [sale_id]);
    const sale = saleRes.rows[0];

    let invoiceRes = await query('SELECT * FROM invoices WHERE type = $1 AND reference_id = $2', ['sale', sale_id]);
    let invoice;
    if (invoiceRes.rows.length > 0) {
      invoice = invoiceRes.rows[0];
    } else {
      const invoiceNumber = await generateInvoiceNumber('sale');
      const newInvRes = await query(
        'INSERT INTO invoices (invoice_number, type, reference_id, branch_id, user_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [invoiceNumber, 'sale', sale_id, sale.branch_id, req.user?.id || sale.user_id]
      );
      invoice = newInvRes.rows[0];
    }

    res.json({
      success: true,
      data: { invoice_number: invoice.invoice_number, generated_at: invoice.generated_at, sale, items: itemsRes.rows },
    });
  } catch (err) {
    console.error('Invoice generation error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Generate invoice for a purchase
const generatePurchaseInvoice = async (req, res) => {
  try {
    const { purchase_id } = req.params;

    const purRes = await query(
      `SELECT p.*, b.name as branch_name, b.phone as branch_phone, u.name as recorded_by
       FROM purchases p
       LEFT JOIN branches b ON p.branch_id = b.id
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.id = $1`,
      [purchase_id]
    );
    if (purRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Purchase not found / Iibsiga lama helin' });

    const itemsRes = await query('SELECT * FROM purchase_items WHERE purchase_id = $1', [purchase_id]);
    const purchase = purRes.rows[0];

    let invoiceRes = await query('SELECT * FROM invoices WHERE type = $1 AND reference_id = $2', ['purchase', purchase_id]);
    let invoice;
    if (invoiceRes.rows.length > 0) {
      invoice = invoiceRes.rows[0];
    } else {
      const invoiceNumber = await generateInvoiceNumber('purchase');
      const newInvRes = await query(
        'INSERT INTO invoices (invoice_number, type, reference_id, branch_id, user_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
        [invoiceNumber, 'purchase', purchase_id, purchase.branch_id, req.user?.id || purchase.user_id]
      );
      invoice = newInvRes.rows[0];
    }

    res.json({
      success: true,
      data: { invoice_number: invoice.invoice_number, generated_at: invoice.generated_at, purchase, items: itemsRes.rows },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get invoice history
const getInvoiceHistory = async (req, res) => {
  try {
    const { branch_id, type } = req.query;
    let sql = `
      SELECT i.*, b.name as branch_name, u.name as generated_by
      FROM invoices i
      LEFT JOIN branches b ON i.branch_id = b.id
      LEFT JOIN users u ON i.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    let pi = 1;
    if (branch_id) { sql += ` AND i.branch_id = $${pi++}`; params.push(branch_id); }
    if (type) { sql += ` AND i.type = $${pi++}`; params.push(type); }
    sql += ' ORDER BY i.generated_at DESC LIMIT 100';

    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { generateSaleInvoice, generatePurchaseInvoice, getInvoiceHistory };
