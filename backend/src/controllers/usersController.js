const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

// Get all users
const getUsers = async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.branch_id, u.is_active, u.created_at, b.name as branch_name
      FROM users u LEFT JOIN branches b ON u.branch_id = b.id
      ORDER BY u.name
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get single user
const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, name, email, role, phone, branch_id, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found / Isticmaalaha lama helin' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create user (admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, branch_id } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role required / Magaca, email-ka, password-ka iyo doorka ayaa loo baahan yahay' });
    }
    const validRoles = ['admin', 'manager', 'cashier', 'storekeeper'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role / Doorka waa khaldan yahay' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (name, email, password, role, phone, branch_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,name,email,role,phone,branch_id,is_active,created_at',
      [name, email, hashed, role, phone || null, branch_id || null]
    );
    res.status(201).json({ success: true, message: 'User created / Isticmaalaha waa la abuuray', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists / Email-kan hore ayuu jiray' });
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, branch_id, is_active } = req.body;

    // Prevent self-demotion from admin if last admin
    if (req.user.id == id && role && role !== 'admin') {
      const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot remove the last admin / Admin-ka kaliya lama bedeli karo' });
      }
    }

    const result = await query(
      'UPDATE users SET name=$1, email=$2, role=$3, phone=$4, branch_id=$5, is_active=$6, updated_at=NOW() WHERE id=$7 RETURNING id,name,email,role,phone,branch_id,is_active',
      [name, email, role, phone, branch_id, is_active !== undefined ? is_active : true, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User updated / Isticmaalaha waa la cusbooneysiiyay', data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email already exists' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Reset password (admin action)
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters / Password-ku waa inuu ka badan yahay 6 xaraf' });
    }
    const hashed = await bcrypt.hash(new_password, 10);
    await query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashed, id]);
    res.json({ success: true, message: 'Password reset successfully / Password-ka waa la beddelay' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Deactivate/Activate user (soft delete)
const toggleUserActive = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id == id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate yourself / Naftaada lama joojin karo' });
    }
    const userRes = await query('SELECT is_active, role FROM users WHERE id = $1', [id]);
    if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

    const newStatus = !userRes.rows[0].is_active;
    if (!newStatus && userRes.rows[0].role === 'admin') {
      const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = true");
      if (parseInt(adminCount.rows[0].count) <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot deactivate the last admin / Admin-ka kaliya lama joojin karo' });
      }
    }

    await query('UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2', [newStatus, id]);
    res.json({ success: true, message: newStatus ? 'User activated / La firfircooniyay' : 'User deactivated / La joojiyay', is_active: newStatus });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, resetPassword, toggleUserActive };
