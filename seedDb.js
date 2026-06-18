const { pool } = require('./db');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const seedDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Branches
    await client.query(`
      INSERT INTO branches (name, location, phone) VALUES
        ('Muqdisho - Bakaaraha', 'Bakaaraha Market, Mogadishu', '+252612345678'),
        ('Hargeisa - Waaheen', 'Waaheen Market, Hargeisa', '+252634567890'),
        ('Kismaayo - Suuqa Weyn', 'Main Market, Kismayo', '+252645678901')
      ON CONFLICT DO NOTHING;
    `);

    // Admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (name, email, password, role, phone, branch_id) VALUES
        ('Hallane Manager', 'admin@easybook.so', $1, 'admin', '+252612345678', 1),
        ('Sahra Cashier', 'cashier@easybook.so', $1, 'cashier', '+252611111111', 1),
        ('Omar Storekeeper', 'store@easybook.so', $1, 'storekeeper', '+252622222222', 2)
      ON CONFLICT (email) DO NOTHING;
    `, [hashedPassword]);

    // Categories
    await client.query(`
      INSERT INTO categories (name_en, name_so) VALUES
        ('Footwear', 'Kabo'),
        ('Jerseys & Kits', 'Gaadhiga'),
        ('Balls', 'Kubbadda'),
        ('Trophies & Medals', 'Abaalmarinta'),
        ('Bags & Equipment', 'Baadhiyaha'),
        ('Accessories', 'Qalab kale')
      ON CONFLICT DO NOTHING;
    `);

    // Products
    await client.query(`
      INSERT INTO products (name, barcode, category_id, sale_price, cost_price, low_stock_threshold) VALUES
        ('Football Boots Nike', '101-NIK', 1, 85.00, 55.00, 5),
        ('Football Boots Adidas', '102-ADI', 1, 90.00, 60.00, 5),
        ('Jersey Set (Home)', '103-JRS', 2, 40.00, 22.00, 10),
        ('Jersey Set (Away)', '104-JRA', 2, 40.00, 22.00, 10),
        ('Football Size 5', '105-BAL', 3, 25.00, 14.00, 8),
        ('Football Size 4', '106-BAL', 3, 20.00, 11.00, 8),
        ('Trophy Gold Large', '107-TRL', 4, 65.00, 38.00, 5),
        ('Trophy Silver Medium', '108-TRS', 4, 45.00, 26.00, 5),
        ('Sports Bag Large', '109-SBL', 5, 30.00, 18.00, 6),
        ('Shin Guards Adult', '110-SHG', 6, 18.00, 10.00, 8),
        ('Referee Whistle', '111-RFW', 6, 8.00, 4.00, 15),
        ('Goal Keeper Gloves', '112-GKG', 6, 35.00, 20.00, 5),
        ('Sports Water Bottle', '113-SWB', 6, 12.00, 6.00, 10)
      ON CONFLICT (barcode) DO NOTHING;
    `);

    // Stock per branch
    await client.query(`
      INSERT INTO stock (product_id, branch_id, quantity) VALUES
        (1, 1, 3), (1, 2, 15), (1, 3, 8),
        (2, 1, 12), (2, 2, 6), (2, 3, 4),
        (3, 1, 5), (3, 2, 20), (3, 3, 10),
        (4, 1, 8), (4, 2, 15), (4, 3, 5),
        (5, 1, 30), (5, 2, 18), (5, 3, 12),
        (6, 1, 25), (6, 2, 10), (6, 3, 8),
        (7, 1, 20), (7, 2, 12), (7, 3, 6),
        (8, 1, 32), (8, 2, 18), (8, 3, 9),
        (9, 1, 47), (9, 2, 22), (9, 3, 11),
        (10, 1, 2), (10, 2, 14), (10, 3, 7),
        (11, 1, 90), (11, 2, 45), (11, 3, 20),
        (12, 1, 8), (12, 2, 5), (12, 3, 3),
        (13, 1, 35), (13, 2, 28), (13, 3, 15)
      ON CONFLICT (product_id, branch_id) DO NOTHING;
    `);

    // Customers
    await client.query(`
      INSERT INTO customers (name, phone, total_debt) VALUES
        ('Ahmed Ali Hassan', '+252611001001', 450.00),
        ('Fadumo Hassan Omar', '+252612002002', 200.00),
        ('Mohamed Abdi Noor', '+252613003003', 750.00),
        ('Halimo Ibrahim', '+252614004004', 0.00),
        ('Bashir Warsame', '+252615005005', 0.00)
      ON CONFLICT DO NOTHING;
    `);

    // Suppliers
    await client.query(`
      INSERT INTO suppliers (name, phone, total_debt) VALUES
        ('Sports Co. Dubai', '+97150111222', 0.00),
        ('Ali Trading Mogadishu', '+252612999888', 550.00),
        ('Gulf Trophies LLC', '+97155333444', 840.00),
        ('Kenya Sports Imports', '+254712345678', 0.00)
      ON CONFLICT DO NOTHING;
    `);

    // Staff
    await client.query(`
      INSERT INTO staff (name, phone, role, base_salary, branch_id, hire_date) VALUES
        ('Hallane Manager', '+252612345678', 'Branch Manager', 600.00, 1, '2023-01-15'),
        ('Sahra Ahmed', '+252611111111', 'Cashier', 350.00, 1, '2023-03-01'),
        ('Omar Ibrahim', '+252622222222', 'Store Keeper', 300.00, 2, '2023-06-01'),
        ('Faadumo Ali', '+252633333333', 'Cashier', 320.00, 2, '2024-01-10'),
        ('Abdi Hassan', '+252644444444', 'Store Keeper', 280.00, 3, '2024-03-20')
      ON CONFLICT DO NOTHING;
    `);

    // Cash Accounts
    await client.query(`
      INSERT INTO cash_accounts (branch_id, type, balance) VALUES
        (1, 'cash', 3200.00),
        (1, 'bank', 12400.00),
        (1, 'evc_plus', 1850.00),
        (1, 'sahal', 920.00),
        (2, 'cash', 1500.00),
        (2, 'evc_plus', 800.00),
        (3, 'cash', 600.00)
      ON CONFLICT (branch_id, type) DO NOTHING;
    `);

    // Sample Sales
    await client.query(`
      INSERT INTO sales (sale_number, customer_name, branch_id, user_id, total_amount, paid_amount, debt_amount, payment_method) VALUES
        ('SALE-001', 'Ahmed Ali Hassan', 1, 2, 85.00, 85.00, 0, 'evc_plus'),
        ('SALE-002', 'Walk-in Customer', 1, 2, 120.00, 120.00, 0, 'cash'),
        ('SALE-003', 'Fadumo Hassan Omar', 1, 2, 45.00, 45.00, 0, 'sahal'),
        ('SALE-004', 'Mohamed Abdi', 1, 2, 30.00, 30.00, 0, 'cash')
      ON CONFLICT (sale_number) DO NOTHING;
    `);

    // Sample Expenses
    await client.query(`
      INSERT INTO expenses (type, type_so, amount, branch_id, user_id, expense_date) VALUES
        ('Electricity', 'Koronto', 120.00, 1, 1, CURRENT_DATE - INTERVAL '5 days'),
        ('Water', 'Biyo', 40.00, 1, 1, CURRENT_DATE - INTERVAL '3 days'),
        ('Internet', 'Internet', 60.00, 1, 1, CURRENT_DATE - INTERVAL '1 day'),
        ('Rent', 'Kirada', 500.00, 1, 1, CURRENT_DATE - INTERVAL '10 days'),
        ('Fuel', 'Shidaal', 80.00, 1, 1, CURRENT_DATE - INTERVAL '2 days')
      ON CONFLICT DO NOTHING;
    `);

    // Notifications
    await client.query(`
      INSERT INTO notifications (type, title, message, branch_id) VALUES
        ('low_stock', '⚠️ Stock Yaraanshaha', 'Football Boots Nike — 3 kaliya ayaa hadhay', 1),
        ('low_stock', '⚠️ Stock Yaraanshaha', 'Shin Guards — 2 kaliya ayaa hadhay', 1),
        ('debt_due', '💰 Deyn Waqtigeeda', 'Ahmed Ali — $450 — Berri ayay bixinaysaa', 1),
        ('payroll', '👤 Mushaar Waqtigeeda', 'Bisha July mushaarada la bixiyo', 1)
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ Database seeded successfully / Xogta tusaalaha ah si guul leh ayaa loo geliay');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding database:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

seedDb()
  .then(() => {
    console.log('✅ Seeding complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  });
