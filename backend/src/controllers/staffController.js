const { query } = require('../config/db');

// Get all staff
const getStaff = async (req, res) => {
  try {
    const { branch_id } = req.query;
    let sql = `
      SELECT s.*, b.name as branch_name
      FROM staff s
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE s.is_active = true
    `;
    const params = [];
    if (branch_id) { sql += ' AND s.branch_id = $1'; params.push(branch_id); }
    sql += ' ORDER BY s.name';
    const result = await query(sql, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Add staff member
const createStaff = async (req, res) => {
  try {
    const { name, phone, role, base_salary, branch_id, hire_date } = req.body;
    if (!name || !base_salary) {
      return res.status(400).json({ success: false, message: 'Name and salary required / Magaca iyo mushaarada ayaa loo baahan yahay' });
    }
    const result = await query(
      'INSERT INTO staff (name, phone, role, base_salary, branch_id, hire_date) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, phone, role, base_salary, branch_id, hire_date || new Date()]
    );
    res.status(201).json({ success: true, message: 'Staff added / Shaqaalaha waa la daray', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update staff
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, base_salary, branch_id } = req.body;
    const result = await query(
      'UPDATE staff SET name=$1, phone=$2, role=$3, base_salary=$4, branch_id=$5 WHERE id=$6 RETURNING *',
      [name, phone, role, base_salary, branch_id, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, message: 'Staff updated / Shaqaalaha waa la cusbooneysiiyay', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Generate payroll for a month / Samee mushaarada bishii
const generatePayroll = async (req, res) => {
  try {
    const { month, year, branch_id } = req.body;
    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'Month and year required' });
    }

    let staffQuery = 'SELECT * FROM staff WHERE is_active = true';
    const params = [];
    if (branch_id) { staffQuery += ' AND branch_id = $1'; params.push(branch_id); }
    const staffList = await query(staffQuery, params);

    const payrollRecords = [];
    for (const staff of staffList.rows) {
      const net = parseFloat(staff.base_salary);
      const rec = await query(
        `INSERT INTO payroll (staff_id, month, year, base_salary, bonus, deductions, net_salary, status)
         VALUES ($1, $2, $3, $4, 0, 0, $4, 'pending')
         ON CONFLICT (staff_id, month, year) DO NOTHING RETURNING *`,
        [staff.id, month, year, net]
      );
      if (rec.rows.length > 0) payrollRecords.push(rec.rows[0]);
    }

    res.json({
      success: true,
      message: `Payroll generated for ${month}/${year} / Mushaarada ${month}/${year} waa la diyaariyay`,
      data: payrollRecords,
      generated: payrollRecords.length,
    });
  } catch (err) {
    console.error('Payroll error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get payroll list
const getPayroll = async (req, res) => {
  try {
    const { month, year, branch_id } = req.query;
    let sql = `
      SELECT p.*, s.name as staff_name, s.role, s.phone, b.name as branch_name
      FROM payroll p
      JOIN staff s ON p.staff_id = s.id
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];
    let pi = 1;
    if (month) { sql += ` AND p.month = $${pi++}`; params.push(month); }
    if (year) { sql += ` AND p.year = $${pi++}`; params.push(year); }
    if (branch_id) { sql += ` AND s.branch_id = $${pi++}`; params.push(branch_id); }
    sql += ' ORDER BY s.name';

    const result = await query(sql, params);
    const totalNet = result.rows.reduce((sum, r) => sum + parseFloat(r.net_salary), 0);

    res.json({ success: true, data: result.rows, total_net: totalNet });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update payroll (add bonus/deductions)
const updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const { bonus, deductions, status, notes } = req.body;
    const rec = await query('SELECT * FROM payroll WHERE id = $1', [id]);
    if (rec.rows.length === 0) return res.status(404).json({ success: false, message: 'Payroll record not found' });

    const p = rec.rows[0];
    const newBonus = parseFloat(bonus ?? p.bonus);
    const newDeductions = parseFloat(deductions ?? p.deductions);
    const newNet = parseFloat(p.base_salary) + newBonus - newDeductions;
    const paidAt = status === 'paid' ? new Date() : p.paid_at;

    const result = await query(
      'UPDATE payroll SET bonus=$1, deductions=$2, net_salary=$3, status=$4, paid_at=$5, notes=$6 WHERE id=$7 RETURNING *',
      [newBonus, newDeductions, newNet, status || p.status, paidAt, notes || p.notes, id]
    );
    res.json({ success: true, message: 'Payroll updated / Mushaarada waa la cusbooneysiiyay', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getStaff, createStaff, updateStaff, generatePayroll, getPayroll, updatePayroll };
