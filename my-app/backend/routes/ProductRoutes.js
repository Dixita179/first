const express = require('express');
const router = express.Router();
const { getAllProducts, createProduct } = require('../controllers/productController');

// Get all products
router.get('/', getAllProducts);

// Create a new product
router.post('/', createProduct);

module.exports = router;
