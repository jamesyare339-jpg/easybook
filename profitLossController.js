const { query } = require('../config/db');

// Comprehensive Profit & Loss statement
const getProfitLossReport = async (req, res) => {
  try {
    const { date_from, date_to, branch_id } = req.query;
    const from = date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const to = date_to || new Date().toISOString().split('T')[0];

    const params = branch_id ? [from, to, branch_id] : [from, to];

    const revenueRes = await query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as sale_count
       FROM sales WHERE DATE(created_at) BETWEEN $1 AND $2 ${branch_id ? 'AND branch_id = $3' : ''}`,
      params
    );

    const cogsRes = await query(
      `SELECT COALESCE(SUM(si.quantity * p.cost_price),0) as cogs
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN products p ON si.product_id = p.id
       WHERE DATE(s.created_at) BETWEEN $1 AND $2 ${branch_id ? 'AND s.branch_id = $3' : ''}`,
      params
    );

    const expensesRes = await query(
      `SELECT type, type_so, COALESCE(SUM(amount),0) as total
       FROM expenses WHERE expense_date BETWEEN $1 AND $2 ${branch_id ? 'AND branch_id = $3' : ''}
       GROUP BY type, type_so ORDER BY total DESC`,
      params
    );

    const totalExpensesRes = await query(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date BETWEEN $1 AND $2 ${branch_id ? 'AND branch_id = $3' : ''}`,
      params
    );

    const payrollRes = await query(
      `SELECT COALESCE(SUM(net_salary),0) as total FROM payroll p
       JOIN staff s ON p.staff_id = s.id
       WHERE make_date(p.year, p.month, 1) BETWEEN date_trunc('month', $1::date) AND date_trunc('month', $2::date)
       ${branch_id ? 'AND s.branch_id = $3' : ''} AND p.status = 'paid'`,
      params
    );

    const revenue = parseFloat(revenueRes.rows[0].revenue);
    const cogs = parseFloat(cogsRes.rows[0].cogs);
    const grossProfit = revenue - cogs;
    const operatingExpenses = parseFloat(totalExpensesRes.rows[0].total);
    const payrollCosts = parseFloat(payrollRes.rows[0].total);
    const totalExpenses = operatingExpenses + payrollCosts;
    const netProfit = grossProfit - totalExpenses;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    res.json({
      success: true,
      data: {
        period: { from, to },
        revenue,
        sale_count: parseInt(revenueRes.rows[0].sale_count),
        cogs,
        gross_profit: grossProfit,
        gross_margin: grossMargin,
        operating_expenses: operatingExpenses,
        payroll_costs: payrollCosts,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        net_margin: netMargin,
        expense_breakdown: expensesRes.rows,
      },
    });
  } catch (err) {
    console.error('P&L report error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Profit by product
const getProfitByProduct = async (req, res) => {
  try {
    const { date_from, date_to, branch_id, limit = 20 } = req.query;
    const from = date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const to = date_to || new Date().toISOString().split('T')[0];

    const params = [from, to];
    let branchFilter = '';
    if (branch_id) { branchFilter = 'AND s.branch_id = $3'; params.push(branch_id); }

    const result = await query(
      `SELECT
         si.product_id, si.product_name,
         SUM(si.quantity) as units_sold,
         SUM(si.total_price) as revenue,
         SUM(si.quantity * p.cost_price) as cost,
         SUM(si.total_price) - SUM(si.quantity * p.cost_price) as profit,
         CASE WHEN SUM(si.total_price) > 0
           THEN ROUND(((SUM(si.total_price) - SUM(si.quantity * p.cost_price)) / SUM(si.total_price) * 100)::numeric, 1)
           ELSE 0 END as margin_pct
       FROM sale_items si
       JOIN sales s ON si.sale_id = s.id
       JOIN products p ON si.product_id = p.id
       WHERE DATE(s.created_at) BETWEEN $1 AND $2 ${branchFilter}
       GROUP BY si.product_id, si.product_name
       ORDER BY profit DESC
       LIMIT ${parseInt(limit)}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Profit by branch
const getProfitByBranch = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const from = date_from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const to = date_to || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT
         b.id as branch_id, b.name as branch_name,
         COALESCE(SUM(s.total_amount), 0) as revenue,
         COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.branch_id = b.id AND e.expense_date BETWEEN $1 AND $2), 0) as expenses
       FROM branches b
       LEFT JOIN sales s ON s.branch_id = b.id AND DATE(s.created_at) BETWEEN $1 AND $2
       WHERE b.is_active = true
       GROUP BY b.id, b.name
       ORDER BY revenue DESC`,
      [from, to]
    );

    const data = result.rows.map(r => ({
      ...r,
      revenue: parseFloat(r.revenue),
      expenses: parseFloat(r.expenses),
      profit: parseFloat(r.revenue) - parseFloat(r.expenses),
    }));

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { getProfitLossReport, getProfitByProduct, getProfitByBranch };
