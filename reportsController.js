const { query } = require('../config/db');

// Daily Report / Warbixinta Maanta
const getDailyReport = async (req, res) => {
  try {
    const { date, branch_id } = req.query;
    const reportDate = date || new Date().toISOString().split('T')[0];
    const params = [reportDate];
    let pi = 2;
    let branchWhere = '';
    if (branch_id) { branchWhere = ` AND branch_id = $${pi++}`; params.push(branch_id); }

    const [incomeRes, expenseRes, salesCountRes, topProductsRes, paymentBreakdown] = await Promise.all([
      query(`SELECT COALESCE(SUM(total_amount), 0) as income FROM sales WHERE DATE(created_at) = $1${branchWhere}`, params.slice(0, branch_id ? 2 : 1)),
      query(`SELECT COALESCE(SUM(amount), 0) as expenses FROM expenses WHERE expense_date = $1${branchWhere}`, params.slice(0, branch_id ? 2 : 1)),
      query(`SELECT COUNT(*) as count FROM sales WHERE DATE(created_at) = $1${branchWhere}`, params.slice(0, branch_id ? 2 : 1)),
      query(`
        SELECT si.product_name, SUM(si.quantity) as qty_sold, SUM(si.total_price) as revenue
        FROM sale_items si
        JOIN sales s ON si.sale_id = s.id
        WHERE DATE(s.created_at) = $1${branchWhere}
        GROUP BY si.product_name ORDER BY revenue DESC LIMIT 5`,
        params.slice(0, branch_id ? 2 : 1)),
      query(`
        SELECT payment_method, COALESCE(SUM(paid_amount), 0) as amount, COUNT(*) as count
        FROM sales WHERE DATE(created_at) = $1${branchWhere}
        GROUP BY payment_method`,
        params.slice(0, branch_id ? 2 : 1)),
    ]);

    const income = parseFloat(incomeRes.rows[0].income);
    const expenses = parseFloat(expenseRes.rows[0].expenses);

    res.json({
      success: true,
      data: {
        date: reportDate,
        income,
        expenses,
        profit: income - expenses,
        transaction_count: parseInt(salesCountRes.rows[0].count),
        top_products: topProductsRes.rows,
        payment_breakdown: paymentBreakdown.rows,
      },
    });
  } catch (err) {
    console.error('Daily report error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Monthly Report / Warbixinta Bisha
const getMonthlyReport = async (req, res) => {
  try {
    const { month, year, branch_id } = req.query;
    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year) || new Date().getFullYear();
    const params = [m, y];
    let pi = 3;
    let branchWhere = '';
    if (branch_id) { branchWhere = ` AND branch_id = $${pi++}`; params.push(branch_id); }

    const [incomeRes, expenseRes, dailyBreakdown, topProducts] = await Promise.all([
      query(`SELECT COALESCE(SUM(total_amount),0) as income FROM sales WHERE EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2${branchWhere}`, params.slice(0, branch_id ? 3 : 2)),
      query(`SELECT COALESCE(SUM(amount),0) as expenses FROM expenses WHERE EXTRACT(MONTH FROM expense_date)=$1 AND EXTRACT(YEAR FROM expense_date)=$2${branchWhere.replace('branch_id', 'branch_id')}`, params.slice(0, branch_id ? 3 : 2)),
      query(`
        SELECT DATE(created_at) as day, COALESCE(SUM(total_amount),0) as income, COUNT(*) as sales
        FROM sales WHERE EXTRACT(MONTH FROM created_at)=$1 AND EXTRACT(YEAR FROM created_at)=$2${branchWhere}
        GROUP BY DATE(created_at) ORDER BY day`,
        params.slice(0, branch_id ? 3 : 2)),
      query(`
        SELECT si.product_name, SUM(si.quantity) as qty, SUM(si.total_price) as revenue
        FROM sale_items si JOIN sales s ON si.sale_id = s.id
        WHERE EXTRACT(MONTH FROM s.created_at)=$1 AND EXTRACT(YEAR FROM s.created_at)=$2${branchWhere}
        GROUP BY si.product_name ORDER BY revenue DESC LIMIT 10`,
        params.slice(0, branch_id ? 3 : 2)),
    ]);

    const income = parseFloat(incomeRes.rows[0].income);
    const expenses = parseFloat(expenseRes.rows[0].expenses);

    res.json({
      success: true,
      data: {
        month: m, year: y,
        income, expenses, profit: income - expenses,
        daily_breakdown: dailyBreakdown.rows,
        top_products: topProducts.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Annual Report / Warbixinta Sanadka
const getAnnualReport = async (req, res) => {
  try {
    const { year, branch_id } = req.query;
    const y = parseInt(year) || new Date().getFullYear();
    const params = [y];
    let pi = 2;
    let branchWhere = '';
    if (branch_id) { branchWhere = ` AND branch_id = $${pi++}`; params.push(branch_id); }

    const [incomeRes, expenseRes, monthlyBreakdown] = await Promise.all([
      query(`SELECT COALESCE(SUM(total_amount),0) as income FROM sales WHERE EXTRACT(YEAR FROM created_at)=$1${branchWhere}`, params.slice(0, branch_id ? 2 : 1)),
      query(`SELECT COALESCE(SUM(amount),0) as expenses FROM expenses WHERE EXTRACT(YEAR FROM expense_date)=$1${branchWhere}`, params.slice(0, branch_id ? 2 : 1)),
      query(`
        SELECT EXTRACT(MONTH FROM created_at) as month,
               TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month_name,
               COALESCE(SUM(total_amount),0) as income, COUNT(*) as sales
        FROM sales WHERE EXTRACT(YEAR FROM created_at)=$1${branchWhere}
        GROUP BY EXTRACT(MONTH FROM created_at), month_name ORDER BY month`,
        params.slice(0, branch_id ? 2 : 1)),
    ]);

    const income = parseFloat(incomeRes.rows[0].income);
    const expenses = parseFloat(expenseRes.rows[0].expenses);

    res.json({
      success: true,
      data: {
        year: y, income, expenses, profit: income - expenses,
        monthly_breakdown: monthlyBreakdown.rows,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { getDailyReport, getMonthlyReport, getAnnualReport };
