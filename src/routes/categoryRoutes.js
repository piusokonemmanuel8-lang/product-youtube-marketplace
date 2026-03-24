const express = require('express');
const {
  createCategory,
  getCategories,
  getCategoryById,
  getCategoryTree,
  getChildCategories,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const router = express.Router();

router.post('/categories', createCategory);
router.get('/categories', getCategories);
router.get('/categories/tree', getCategoryTree);
router.get('/categories/:id', getCategoryById);
router.get('/categories/parent/:parentId/children', getChildCategories);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;