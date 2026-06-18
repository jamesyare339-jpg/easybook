const { query } = require('../config/db');

// Get full dashboard summary / Koobidda Dashboard-ka
const getDashboardSummary = async (req, res) => {
  try {
    const { branch_id } = req.query;
    const branchFilter = branch_id ? 'AND branch_id = $1' : '';
    const params = branch_id ? [branch_id] : [];

    // Today's income (sales)
    const incomeRes = await query(
      `SELECT COALESCE(SUM(total_amount), 0) as today_income
       FROM sales
       WHERE DATE(created_at) = CURRENT_DATE ${branchFilter}`,
      params
    );

    // Today's expenses
    const expenseRes = await query(
      `SELECT COALESCE(SUM(amount), 0) as today_expenses
       FROM expenses
       WHERE expense_date = CURRENT_DATE ${branchFilter}`,
      params
    );

    // Total stock items
    const stockRes = await query(
      `SELECT COALESCE(SUM(quantity), 0) as total_stock
       FROM stock
       ${branch_id ? 'WHERE branch_id = $1' : ''}`,
      params
    );

    // Customer debt total
    const custDebtRes = await query(
      `SELECT COALESCE(SUM(total_debt), 0) as customer_debt FROM customers`
    );

    // Supplier debt total
    const supDebtRes = await query(
      `SELECT COALESCE(SUM(total_debt), 0) as supplier_debt FROM suppliers`
    );

    // Staff count
    const staffRes = await query(
      `SELECT COUNT(*) as staff_count FROM staff WHERE is_active = true ${branch_id ? 'AND branch_id = $1' : ''}`,
      params
    );

    // Low stock items
    const lowStockRes = await query(
      `SELECT p.name, p.barcode, p.low_stock_threshold, s.quantity, s.branch_id, b.name as branch_name
       FROM stock s
       JOIN products p ON s.product_id = p.id
       JOIN branches b ON s.branch_id = b.id
       WHERE s.quantity <= p.low_stock_threshold
       ${branch_id ? 'AND s.branch_id = $1' : ''}
       ORDER BY s.quantity ASC
       LIMIT 10`,
      params
    );

    // Recent sales (last 10)
    const recentSalesRes = await query(
      `SELECT s.*, b.name as branch_name
       FROM sales s
       LEFT JOIN branches b ON s.branch_id = b.id
       ${branch_id ? 'WHERE s.branch_id = $1' : ''}
       ORDER BY s.created_at DESC
       LIMIT 10`,
      params
    );

    // Notifications (unread)
    const notifRes = await query(
      `SELECT * FROM notifications
       WHERE is_read = false ${branch_id ? 'AND branch_id = $1' : ''}
       ORDER BY created_at DESC
       LIMIT 20`,
      params
    );

    // Monthly chart data (last 6 months)
    const monthlyRes = await query(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month,
         EXTRACT(MONTH FROM created_at) as month_num,
         EXTRACT(YEAR FROM created_at) as year_num,
         COALESCE(SUM(total_amount), 0) as income
       FROM sales
       WHERE created_at >= NOW() - INTERVAL '6 months'
       ${branch_id ? 'AND branch_id = $1' : ''}
       GROUP BY DATE_TRUNC('month', created_at), month_num, year_num
       ORDER BY year_num, month_num`,
      params
    );

    const todayIncome = parseFloat(incomeRes.rows[0].today_income);
    const todayExpenses = parseFloat(expenseRes.rows[0].today_expenses);
    const todayProfit = todayIncome - todayExpenses;

    res.json({
      success: true,
      data: {
        today: {
          income: todayIncome,
          expenses: todayExpenses,
          profit: todayProfit,
        },
        totals: {
          stock: parseInt(stockRes.rows[0].total_stock),
          customer_debt: parseFloat(custDebtRes.rows[0].customer_debt),
          supplier_debt: parseFloat(supDebtRes.rows[0].supplier_debt),
          staff_count: parseInt(staffRes.rows[0].staff_count),
          low_stock_count: lowStockRes.rows.length,
          unread_notifications: notifRes.rows.length,
        },
        low_stock_items: lowStockRes.rows,
        recent_sales: recentSalesRes.rows,
        notifications: notifRes.rows,
        monthly_chart: monthlyRes.rows,
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ success: false, message: 'Server error / Khalad server', error: err.message });
  }
};

module.exports = { getDashboardSummary };
