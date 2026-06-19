const { pool } = require('./db');
require('dotenv').config();

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users / Isticmaalayaasha
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','cashier','storekeeper')),
        phone VARCHAR(20),
        branch_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Branches / Xaruumaha
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        location VARCHAR(200),
        phone VARCHAR(20),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Categories / Noocyada Alaabta
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name_en VARCHAR(100) NOT NULL,
        name_so VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Products / Alaabta
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        barcode VARCHAR(50) UNIQUE,
        category_id INTEGER REFERENCES categories(id),
        sale_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        image_url VARCHAR(500),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Stock (per branch) / Kaydhka Xarun Kasta
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        quantity INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(product_id, branch_id)
      );
    `);

    // Customers / Macaamiisha
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        total_debt DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Suppliers / Saplaayaasha
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        address TEXT,
        total_debt DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Sales / Iibka
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        sale_number VARCHAR(20) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id),
        customer_name VARCHAR(100),
        branch_id INTEGER REFERENCES branches(id),
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        debt_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(30) CHECK (payment_method IN ('cash','evc_plus','sahal','premier','bank','mixed')),
        status VARCHAR(20) DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Sale Items / Alaabta La Iibiyey
    await client.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name VARCHAR(200) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL
      );
    `);

    // Purchases / Iibsiga
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        purchase_number VARCHAR(20) UNIQUE NOT NULL,
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_name VARCHAR(100),
        branch_id INTEGER REFERENCES branches(id),
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        debt_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(30),
        status VARCHAR(20) DEFAULT 'completed',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Purchase Items / Alaabta La Soo Iibsaday
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id SERIAL PRIMARY KEY,
        purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        product_name VARCHAR(200) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL
      );
    `);

    // Expenses / Kharashaadka
    await client.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        type_so VARCHAR(50),
        amount DECIMAL(10,2) NOT NULL,
        branch_id INTEGER REFERENCES branches(id),
        user_id INTEGER REFERENCES users(id),
        notes TEXT,
        expense_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Staff / Shaqaalaha
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        role VARCHAR(50),
        base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
        branch_id INTEGER REFERENCES branches(id),
        hire_date DATE DEFAULT CURRENT_DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Payroll / Mushaarada
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        base_salary DECIMAL(10,2) NOT NULL,
        bonus DECIMAL(10,2) DEFAULT 0,
        deductions DECIMAL(10,2) DEFAULT 0,
        net_salary DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        paid_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(staff_id, month, year)
      );
    `);

    // Stock Transfers / Wareejinta Alaabta
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_transfers (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        from_branch_id INTEGER NOT NULL REFERENCES branches(id),
        to_branch_id INTEGER NOT NULL REFERENCES branches(id),
        quantity INTEGER NOT NULL,
        notes TEXT,
        user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Cash Accounts / Xisaabaha Lacagta
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_accounts (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER REFERENCES branches(id),
        type VARCHAR(30) NOT NULL CHECK (type IN ('cash','bank','evc_plus','sahal','premier')),
        balance DECIMAL(10,2) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(branch_id, type)
      );
    `);

    // Customer Debts / Deymaha Macaamiisha
    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_debts (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        sale_id INTEGER REFERENCES sales(id),
        amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        remaining DECIMAL(10,2) NOT NULL,
        due_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Supplier Debts / Deymaha Saplaayaasha
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_debts (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
        purchase_id INTEGER REFERENCES purchases(id),
        amount DECIMAL(10,2) NOT NULL,
        paid_amount DECIMAL(10,2) DEFAULT 0,
        remaining DECIMAL(10,2) NOT NULL,
        due_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Notifications / Ogeysiisyada
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        branch_id INTEGER REFERENCES branches(id),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Invoices / Qaansheegyada — generated for sales and purchases
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(30) UNIQUE NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('sale','purchase')),
        reference_id INTEGER NOT NULL,
        branch_id INTEGER REFERENCES branches(id),
        user_id INTEGER REFERENCES users(id),
        generated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Backup Log / Diiwaanka Backup-ka
    await client.query(`
      CREATE TABLE IF NOT EXISTS backup_logs (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(200) NOT NULL,
        size_bytes BIGINT,
        type VARCHAR(20) DEFAULT 'manual' CHECK (type IN ('manual','automatic')),
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed','failed','restored')),
        user_id INTEGER REFERENCES users(id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Database tables created successfully / Miisaska database-ka si guul leh ayaa loo abuuray');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

initDb()
  .then(() => {
    console.log('✅ Database initialization complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  });
