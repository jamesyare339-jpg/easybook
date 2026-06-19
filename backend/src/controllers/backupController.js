const { query, pool } = require('../config/db');

const BACKUP_TABLES = [
  'branches', 'users', 'categories', 'products', 'stock', 'customers', 'suppliers',
  'sales', 'sale_items', 'purchases', 'purchase_items', 'expenses', 'staff', 'payroll',
  'stock_transfers', 'cash_accounts', 'customer_debts', 'supplier_debts', 'notifications', 'invoices',
];

// Create a full backup (JSON export of all tables)
const createBackup = async (req, res) => {
  try {
    const backup = { version: '1.0', created_at: new Date().toISOString(), tables: {} };

    for (const table of BACKUP_TABLES) {
      const result = await query(`SELECT * FROM ${table}`);
      backup.tables[table] = result.rows;
    }

    const jsonStr = JSON.stringify(backup);
    const sizeBytes = Buffer.byteLength(jsonStr, 'utf8');
    const filename = `easybook_backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;

    await query(
      'INSERT INTO backup_logs (filename, size_bytes, type, status, user_id, notes) VALUES ($1,$2,$3,$4,$5,$6)',
      [filename, sizeBytes, 'manual', 'completed', req.user?.id || null, `Tables: ${BACKUP_TABLES.length}`]
    );

    res.json({
      success: true,
      message: 'Backup created successfully / Backup-ka si guul leh ayaa loo sameeyay',
      filename,
      size_bytes: sizeBytes,
      data: backup,
    });
  } catch (err) {
    console.error('Backup error:', err);
    res.status(500).json({ success: false, message: 'Backup failed / Backup-ku wuu fashilmay', error: err.message });
  }
};

// Restore from a backup JSON payload
const restoreBackup = async (req, res) => {
  const client = await pool.connect();
  try {
    const { backup } = req.body;
    if (!backup || !backup.tables) {
      return res.status(400).json({ success: false, message: 'Invalid backup file / Faylka backup-ku waa khaldan yahay' });
    }

    await client.query('BEGIN');

    const tablesToRestore = BACKUP_TABLES.filter(t => backup.tables[t] !== undefined);

    for (const table of [...tablesToRestore].reverse()) {
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }

    for (const table of tablesToRestore) {
      const rows = backup.tables[table];
      if (!rows || rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const colNames = columns.join(', ');

      for (const row of rows) {
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        await client.query(
          `INSERT INTO ${table} (${colNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          values
        );
      }

      await client.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))
      `).catch(() => {});
    }

    await client.query('COMMIT');

    await query(
      'INSERT INTO backup_logs (filename, type, status, user_id, notes) VALUES ($1,$2,$3,$4,$5)',
      ['restored_backup.json', 'manual', 'restored', req.user?.id || null, `Restored ${tablesToRestore.length} tables`]
    );

    res.json({ success: true, message: 'Database restored successfully / Database-ka si guul leh ayaa loo soo celiyay', tables_restored: tablesToRestore.length });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Restore error:', err);
    res.status(500).json({ success: false, message: 'Restore failed / Soo celinta wuu fashilmay', error: err.message });
  } finally {
    client.release();
  }
};

// Get backup history log
const getBackupHistory = async (req, res) => {
  try {
    const result = await query(`
      SELECT bl.*, u.name as user_name
      FROM backup_logs bl LEFT JOIN users u ON bl.user_id = u.id
      ORDER BY bl.created_at DESC LIMIT 50
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { createBackup, restoreBackup, getBackupHistory };
