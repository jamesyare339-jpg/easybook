const { query } = require('../config/db');

// Get all products with stock / Dhammaan alaabta oo leh stock
const getProducts = async (req, res) => {
  try {
    const { branch_id, search, category_id, low_stock } = req.query;

    let sql = `
      SELECT
        p.*,
        c.name_en as category_en,
        c.name_so as category_so,
        COALESCE(SUM(s.quantity), 0) as total_stock,
        JSON_AGG(
          JSON_BUILD_OBJECT('branch_id', b.id, 'branch_name', b.name, 'quantity', COALESCE(s.quantity, 0))
          ORDER BY b.id
        ) as stock_by_branch
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN stock s ON p.id = s.product_id
      LEFT JOIN branches b ON s.branch_id = b.id
      WHERE p.is_active = true
    `;
    const queryParams = [];
    let paramIndex = 1;

    if (search) {
      sql += ` AND (p.name ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex})`;
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    if (category_id) {
      sql += ` AND p.category_id = $${paramIndex}`;
      queryParams.push(category_id);
      paramIndex++;
    }

    sql += ' GROUP BY p.id, c.name_en, c.name_so';

    if (low_stock === 'true') {
      sql += ' HAVING COALESCE(SUM(s.quantity), 0) <= p.low_stock_threshold';
    }

    if (branch_id) {
      sql = `
        SELECT
          p.*,
          c.name_en as category_en,
          c.name_so as category_so,
          COALESCE(s.quantity, 0) as total_stock,
          COALESCE(s.quantity, 0) as branch_stock
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN stock s ON p.id = s.product_id AND s.branch_id = $${paramIndex}
        WHERE p.is_active = true
      `;
      queryParams.push(branch_id);
      paramIndex++;

      if (search) {
        sql += ` AND (p.name ILIKE $${paramIndex} OR p.barcode ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      sql += ' ORDER BY p.name';
    } else {
      sql += ' ORDER BY p.name';
    }

    const result = await query(sql, queryParams);
    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Get single product
const getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(
      `SELECT p.*, c.name_en as category_en, c.name_so as category_so,
              JSON_AGG(JSON_BUILD_OBJECT('branch_id', b.id, 'branch_name', b.name, 'quantity', COALESCE(s.quantity, 0))) as stock_by_branch
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN stock s ON p.id = s.product_id
       LEFT JOIN branches b ON s.branch_id = b.id
       WHERE p.id = $1 GROUP BY p.id, c.name_en, c.name_so`,
      [id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Product not found / Alaabta lama helin' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create product / Abuur alaab cusub
const createProduct = async (req, res) => {
  try {
    const { name, barcode, category_id, sale_price, cost_price, low_stock_threshold, description, initial_stock, branch_id } = req.body;

    if (!name || !sale_price || !cost_price) {
      return res.status(400).json({ success: false, message: 'Name, sale price, and cost price are required / Magaca, qiimaha iibka, iyo qiimaha iibsiga ayaa loo baahan yahay' });
    }

    const productRes = await query(
      `INSERT INTO products (name, barcode, category_id, sale_price, cost_price, low_stock_threshold, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, barcode || null, category_id || null, sale_price, cost_price, low_stock_threshold || 10, description || null]
    );
    const product = productRes.rows[0];

    // Add initial stock if provided
    if (initial_stock && branch_id) {
      await query(
        `INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1, $2, $3) ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = stock.quantity + $3`,
        [product.id, branch_id, initial_stock]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully / Alaabta si guul leh ayaa loo abuuray',
      data: product,
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, message: 'Barcode already exists / Barcode-kan hore ayaa jiray' });
    }
    console.error('Create product error:', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

// Update product / Tafatir alaab
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, barcode, category_id, sale_price, cost_price, low_stock_threshold, description } = req.body;

    const result = await query(
      `UPDATE products SET name=$1, barcode=$2, category_id=$3, sale_price=$4, cost_price=$5,
       low_stock_threshold=$6, description=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [name, barcode, category_id, sale_price, cost_price, low_stock_threshold || 10, description, id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Product not found / Alaabta lama helin' });

    res.json({ success: true, message: 'Product updated / Alaabta waa la cusbooneysiiyay', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete product / Tirtir alaab
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE products SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);
    res.json({ success: true, message: 'Product deleted / Alaabta waa la tirtiray' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update stock quantity / Cusboonaysii tirada stock-ga
const updateStock = async (req, res) => {
  try {
    const { product_id, branch_id, quantity, operation } = req.body;

    let sql;
    if (operation === 'set') {
      sql = `INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1, $2, $3)
             ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = $3, updated_at = NOW()`;
    } else if (operation === 'add') {
      sql = `INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1, $2, $3)
             ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = stock.quantity + $3, updated_at = NOW()`;
    } else {
      sql = `INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1, $2, $3)
             ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = GREATEST(0, stock.quantity - $3), updated_at = NOW()`;
    }

    await query(sql, [product_id, branch_id, quantity]);
    res.json({ success: true, message: 'Stock updated / Stock-ka waa la cusbooneysiiyay' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Transfer stock between branches / Wareeji alaab bakhaar kale
const transferStock = async (req, res) => {
  try {
    const { product_id, from_branch_id, to_branch_id, quantity, notes } = req.body;

    // Check source stock
    const srcStock = await query(
      'SELECT quantity FROM stock WHERE product_id = $1 AND branch_id = $2',
      [product_id, from_branch_id]
    );
    if (srcStock.rows.length === 0 || srcStock.rows[0].quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock in source branch / Stock kuma filna xarunta aad ka wareejinayso' });
    }

    // Deduct from source
    await query(
      'UPDATE stock SET quantity = quantity - $1, updated_at = NOW() WHERE product_id = $2 AND branch_id = $3',
      [quantity, product_id, from_branch_id]
    );

    // Add to destination
    await query(
      `INSERT INTO stock (product_id, branch_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (product_id, branch_id) DO UPDATE SET quantity = stock.quantity + $3, updated_at = NOW()`,
      [product_id, to_branch_id, quantity]
    );

    // Log transfer
    await query(
      'INSERT INTO stock_transfers (product_id, from_branch_id, to_branch_id, quantity, notes, user_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [product_id, from_branch_id, to_branch_id, quantity, notes || null, req.user.id]
    );

    res.json({ success: true, message: 'Stock transferred successfully / Alaabta si guul leh ayaa loo wareejiyay' });
  } catch (err) {
    console.error('Transfer error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get categories
const getCategories = async (req, res) => {
  try {
    const result = await query(`
      SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = true) as product_count
      FROM categories c ORDER BY c.name_en
    `);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const { name_en, name_so } = req.body;
    if (!name_en || !name_so) {
      return res.status(400).json({ success: false, message: 'Both English and Somali names required / Magaca Ingiriis iyo Soomaali labadaba waa loo baahan yahay' });
    }
    const result = await query('INSERT INTO categories (name_en, name_so) VALUES ($1,$2) RETURNING *', [name_en, name_so]);
    res.status(201).json({ success: true, message: 'Category added / Nooca waa la daray', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name_en, name_so } = req.body;
    const result = await query('UPDATE categories SET name_en=$1, name_so=$2 WHERE id=$3 RETURNING *', [name_en, name_so, id]);
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Category updated / Nooca waa la cusbooneysiiyay', data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const usageCheck = await query('SELECT COUNT(*) FROM products WHERE category_id = $1 AND is_active = true', [id]);
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete category in use / Nooc la isticmaalayo lama tirtirin karo' });
    }
    await query('DELETE FROM categories WHERE id = $1', [id]);
    res.json({ success: true, message: 'Category deleted / Nooca waa la tirtiray' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, updateStock, transferStock, getCategories, createCategory, updateCategory, deleteCategory };
