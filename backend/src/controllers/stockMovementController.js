const { query } = require('../config/db');

// Get unified stock movement history (sales out, purchases in, transfers, manual adjustments)
const getStockMovements = async (req, res) => {
  try {
    const { product_id, branch_id, date_from, date_to, type, limit = 50 } = req.query;
    const movements = [];

    // 1. Sales (stock OUT)
    let saleSql = `
      SELECT si.id, 'sale' as movement_type, si.product_id, si.product_name, -si.quantity as quantity_change,
             s.branch_id, b.name as branch_name, s.created_at, s.user_id, u.name as user_name,
             s.sale_number as reference, 'Sale / Iib' as type_label
      FROM sale_items si
      JOIN sales s ON si.sale_id = s.id
      LEFT JOIN branches b ON s.branch_id = b.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const saleParams = [];
    let spi = 1;
    if (product_id) { saleSql += ` AND si.product_id = $${spi++}`; saleParams.push(product_id); }
    if (branch_id) { saleSql += ` AND s.branch_id = $${spi++}`; saleParams.push(branch_id); }
    if (date_from) { saleSql += ` AND DATE(s.created_at) >= $${spi++}`; saleParams.push(date_from); }
    if (date_to) { saleSql += ` AND DATE(s.created_at) <= $${spi++}`; saleParams.push(date_to); }

    // 2. Purchases (stock IN)
    let purSql = `
      SELECT pi.id, 'purchase' as movement_type, pi.product_id, pi.product_name, pi.quantity as quantity_change,
             p.branch_id, b.name as branch_name, p.created_at, p.user_id, u.name as user_name,
             p.purchase_number as reference, 'Purchase / Iibsi' as type_label
      FROM purchase_items pi
      JOIN purchases p ON pi.purchase_id = p.id
      LEFT JOIN branches b ON p.branch_id = b.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE 1=1
    `;
    const purParams = [];
    let ppi = 1;
    if (product_id) { purSql += ` AND pi.product_id = $${ppi++}`; purParams.push(product_id); }
    if (branch_id) { purSql += ` AND p.branch_id = $${ppi++}`; purParams.push(branch_id); }
    if (date_from) { purSql += ` AND DATE(p.created_at) >= $${ppi++}`; purParams.push(date_from); }
    if (date_to) { purSql += ` AND DATE(p.created_at) <= $${ppi++}`; purParams.push(date_to); }

    // 3. Transfers OUT
    let transOutSql = `
      SELECT st.id, 'transfer_out' as movement_type, st.product_id, p.name as product_name, -st.quantity as quantity_change,
             st.from_branch_id as branch_id, b.name as branch_name, st.created_at, st.user_id, u.name as user_name,
             CONCAT('To: ', tb.name) as reference, 'Transfer Out / Wareeji Dirid' as type_label
      FROM stock_transfers st
      JOIN products p ON st.product_id = p.id
      LEFT JOIN branches b ON st.from_branch_id = b.id
      LEFT JOIN branches tb ON st.to_branch_id = tb.id
      LEFT JOIN users u ON st.user_id = u.id
      WHERE 1=1
    `;
    const transOutParams = [];
    let toi = 1;
    if (product_id) { transOutSql += ` AND st.product_id = $${toi++}`; transOutParams.push(product_id); }
    if (branch_id) { transOutSql += ` AND st.from_branch_id = $${toi++}`; transOutParams.push(branch_id); }
    if (date_from) { transOutSql += ` AND DATE(st.created_at) >= $${toi++}`; transOutParams.push(date_from); }
    if (date_to) { transOutSql += ` AND DATE(st.created_at) <= $${toi++}`; transOutParams.push(date_to); }

    // 4. Transfers IN
    let transInSql = `
      SELECT st.id, 'transfer_in' as movement_type, st.product_id, p.name as product_name, st.quantity as quantity_change,
             st.to_branch_id as branch_id, b.name as branch_name, st.created_at, st.user_id, u.name as user_name,
             CONCAT('From: ', fb.name) as reference, 'Transfer In / Wareeji Helid' as type_label
      FROM stock_transfers st
      JOIN products p ON st.product_id = p.id
      LEFT JOIN branches b ON st.to_branch_id = b.id
      LEFT JOIN branches fb ON st.from_branch_id = fb.id
      LEFT JOIN users u ON st.user_id = u.id
      WHERE 1=1
    `;
    const transInParams = [];
    let tii = 1;
    if (product_id) { transInSql += ` AND st.product_id = $${tii++}`; transInParams.push(product_id); }
    if (branch_id) { transInSql += ` AND st.to_branch_id = $${tii++}`; transInParams.push(branch_id); }
    if (date_from) { transInSql += ` AND DATE(st.created_at) >= $${tii++}`; transInParams.push(date_from); }
    if (date_to) { transInSql += ` AND DATE(st.created_at) <= $${tii++}`; transInParams.push(date_to); }

    const queries = [];
    if (!type || type === 'sale') queries.push(query(saleSql, saleParams));
    if (!type || type === 'purchase') queries.push(query(purSql, purParams));
    if (!type || type === 'transfer_out') queries.push(query(transOutSql, transOutParams));
    if (!type || type === 'transfer_in') queries.push(query(transInSql, transInParams));

    const results = await Promise.all(queries);
    let allMovements = [];
    results.forEach(r => allMovements.push(...r.rows));

    allMovements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    allMovements = allMovements.slice(0, parseInt(limit));

    res.json({ success: true, data: allMovements, count: allMovements.length });
  } catch (err) {
    console.error('Stock movements error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get movement summary for a specific product
const getProductMovementSummary = async (req, res) => {
  try {
    const { product_id } = req.params;
    const { branch_id } = req.query;
    const params = branch_id ? [product_id, branch_id] : [product_id];

    const [salesTotal, purchaseTotal, transferOutTotal, transferInTotal, currentStock] = await Promise.all([
      query(`SELECT COALESCE(SUM(si.quantity),0) as total FROM sale_items si JOIN sales s ON si.sale_id=s.id WHERE si.product_id=$1 ${branch_id ? 'AND s.branch_id=$2' : ''}`, params),
      query(`SELECT COALESCE(SUM(pi.quantity),0) as total FROM purchase_items pi JOIN purchases p ON pi.purchase_id=p.id WHERE pi.product_id=$1 ${branch_id ? 'AND p.branch_id=$2' : ''}`, params),
      query(`SELECT COALESCE(SUM(quantity),0) as total FROM stock_transfers WHERE product_id=$1 ${branch_id ? 'AND from_branch_id=$2' : ''}`, params),
      query(`SELECT COALESCE(SUM(quantity),0) as total FROM stock_transfers WHERE product_id=$1 ${branch_id ? 'AND to_branch_id=$2' : ''}`, params),
      query(`SELECT COALESCE(SUM(quantity),0) as total FROM stock WHERE product_id=$1 ${branch_id ? 'AND branch_id=$2' : ''}`, params),
    ]);

    res.json({
      success: true,
      data: {
        total_sold: parseInt(salesTotal.rows[0].total),
        total_purchased: parseInt(purchaseTotal.rows[0].total),
        total_transferred_out: parseInt(transferOutTotal.rows[0].total),
        total_transferred_in: parseInt(transferInTotal.rows[0].total),
        current_stock: parseInt(currentStock.rows[0].total),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { getStockMovements, getProductMovementSummary };
