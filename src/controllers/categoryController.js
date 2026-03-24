const pool = require('../config/db');

function buildCategoryTree(categories, parentId = null) {
  return categories
    .filter((category) => {
      if (parentId === null) {
        return category.parent_id === null;
      }
      return Number(category.parent_id) === Number(parentId);
    })
    .map((category) => ({
      ...category,
      children: buildCategoryTree(categories, category.id),
    }));
}

async function createCategory(req, res) {
  try {
    const { name, slug, parent_id, category_type } = req.body;

    if (!name || !slug) {
      return res.status(400).json({
        message: 'name and slug are required',
      });
    }

    const allowedTypes = ['video', 'product', 'mixed'];
    const finalType = category_type || 'mixed';

    if (!allowedTypes.includes(finalType)) {
      return res.status(400).json({
        message: 'category_type must be video, product, or mixed',
      });
    }

    if (parent_id) {
      const [parentRows] = await pool.query(
        'SELECT id FROM categories WHERE id = ? LIMIT 1',
        [parent_id]
      );

      if (parentRows.length === 0) {
        return res.status(404).json({
          message: 'Parent category not found',
        });
      }
    }

    const [existingSlug] = await pool.query(
      'SELECT id FROM categories WHERE slug = ? LIMIT 1',
      [slug]
    );

    if (existingSlug.length > 0) {
      return res.status(409).json({
        message: 'Category slug already exists',
      });
    }

    const [result] = await pool.query(
      `
      INSERT INTO categories (name, slug, parent_id, category_type)
      VALUES (?, ?, ?, ?)
      `,
      [name, slug, parent_id || null, finalType]
    );

    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Category created successfully',
      category: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to create category',
      error: error.message,
    });
  }
}

async function getCategories(req, res) {
  try {
    const { category_type, parent_id } = req.query;

    let sql = 'SELECT * FROM categories';
    const conditions = [];
    const values = [];

    if (category_type) {
      conditions.push('category_type = ?');
      values.push(category_type);
    }

    if (parent_id !== undefined) {
      if (parent_id === 'null' || parent_id === '') {
        conditions.push('parent_id IS NULL');
      } else {
        conditions.push('parent_id = ?');
        values.push(parent_id);
      }
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY id ASC';

    const [rows] = await pool.query(sql, values);

    return res.json({
      message: 'Categories fetched successfully',
      count: rows.length,
      categories: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch categories',
      error: error.message,
    });
  }
}

async function getCategoryById(req, res) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Category not found',
      });
    }

    return res.json({
      message: 'Category fetched successfully',
      category: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch category',
      error: error.message,
    });
  }
}

async function getCategoryTree(req, res) {
  try {
    const { category_type } = req.query;

    let sql = 'SELECT * FROM categories';
    const values = [];

    if (category_type) {
      sql += ' WHERE category_type = ?';
      values.push(category_type);
    }

    sql += ' ORDER BY id ASC';

    const [rows] = await pool.query(sql, values);
    const tree = buildCategoryTree(rows);

    return res.json({
      message: 'Category tree fetched successfully',
      count: tree.length,
      categories: tree,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch category tree',
      error: error.message,
    });
  }
}

async function getChildCategories(req, res) {
  try {
    const { parentId } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE parent_id = ? ORDER BY id ASC',
      [parentId]
    );

    return res.json({
      message: 'Child categories fetched successfully',
      count: rows.length,
      categories: rows,
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to fetch child categories',
      error: error.message,
    });
  }
}

async function updateCategory(req, res) {
  try {
    const { id } = req.params;
    const { name, slug, parent_id, category_type } = req.body;

    const [existingRows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        message: 'Category not found',
      });
    }

    const existingCategory = existingRows[0];

    const allowedTypes = ['video', 'product', 'mixed'];
    const finalType = category_type || existingCategory.category_type;

    if (!allowedTypes.includes(finalType)) {
      return res.status(400).json({
        message: 'category_type must be video, product, or mixed',
      });
    }

    const finalName = name || existingCategory.name;
    const finalSlug = slug || existingCategory.slug;

    let finalParentId = existingCategory.parent_id;

    if (parent_id !== undefined) {
      finalParentId = parent_id === '' || parent_id === null ? null : parent_id;
    }

    if (Number(finalParentId) === Number(id)) {
      return res.status(400).json({
        message: 'A category cannot be its own parent',
      });
    }

    if (finalParentId) {
      const [parentRows] = await pool.query(
        'SELECT id FROM categories WHERE id = ? LIMIT 1',
        [finalParentId]
      );

      if (parentRows.length === 0) {
        return res.status(404).json({
          message: 'Parent category not found',
        });
      }
    }

    const [slugRows] = await pool.query(
      'SELECT id FROM categories WHERE slug = ? AND id != ? LIMIT 1',
      [finalSlug, id]
    );

    if (slugRows.length > 0) {
      return res.status(409).json({
        message: 'Category slug already exists',
      });
    }

    await pool.query(
      `
      UPDATE categories
      SET name = ?, slug = ?, parent_id = ?, category_type = ?
      WHERE id = ?
      `,
      [finalName, finalSlug, finalParentId, finalType, id]
    );

    const [updatedRows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [id]
    );

    return res.json({
      message: 'Category updated successfully',
      category: updatedRows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to update category',
      error: error.message,
    });
  }
}

async function deleteCategory(req, res) {
  try {
    const { id } = req.params;

    const [existingRows] = await pool.query(
      'SELECT * FROM categories WHERE id = ? LIMIT 1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        message: 'Category not found',
      });
    }

    const [childRows] = await pool.query(
      'SELECT id FROM categories WHERE parent_id = ? LIMIT 1',
      [id]
    );

    if (childRows.length > 0) {
      return res.status(400).json({
        message: 'Cannot delete category with child categories',
      });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    return res.json({
      message: 'Category deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      message: 'Failed to delete category',
      error: error.message,
    });
  }
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  getCategoryTree,
  getChildCategories,
  updateCategory,
  deleteCategory,
};