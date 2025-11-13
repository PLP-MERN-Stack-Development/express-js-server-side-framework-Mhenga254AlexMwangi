const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== 'mysecretkey') {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// Sample products data
let products = [
  {
    id: '1',
    name: 'Laptop',
    description: 'High-performance laptop with 16GB RAM',
    price: 1200,
    category: 'electronics',
    inStock: true,
  },
  {
    id: '2',
    name: 'Smartphone',
    description: 'Latest model with 128GB storage',
    price: 800,
    category: 'electronics',
    inStock: true,
  },
  {
    id: '3',
    name: 'Coffee Maker',
    description: 'Programmable coffee maker with timer',
    price: 50,
    category: 'kitchen',
    inStock: false,
  }
];

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Product API is running!',
    endpoints: {
      getAllProducts: 'GET /api/products',
      getProduct: 'GET /api/products/:id',
      createProduct: 'POST /api/products (requires auth)',
      updateProduct: 'PUT /api/products/:id (requires auth)',
      deleteProduct: 'DELETE /api/products/:id (requires auth)',
      searchProducts: 'GET /api/products/search?q=query',
      getStats: 'GET /api/products/stats'
    }
  });
});

// GET all products with filtering and pagination
app.get('/api/products', (req, res) => {
  let filteredProducts = [...products];
  
  // Filter by category
  if (req.query.category) {
    filteredProducts = filteredProducts.filter(p => 
      p.category.toLowerCase() === req.query.category.toLowerCase()
    );
  }
  
  // Filter by inStock
  if (req.query.inStock) {
    const inStock = req.query.inStock === 'true';
    filteredProducts = filteredProducts.filter(p => p.inStock === inStock);
  }
  
  // Filter by maxPrice
  if (req.query.maxPrice) {
    const maxPrice = parseFloat(req.query.maxPrice);
    filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
  }
  
  // Pagination
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const resultProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    products: resultProducts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(filteredProducts.length / limit),
      totalProducts: filteredProducts.length,
      hasNext: endIndex < filteredProducts.length,
      hasPrev: page > 1
    }
  });
});

// GET product by ID
app.get('/api/products/:id', (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST create new product
app.post('/api/products', authenticate, (req, res) => {
  const { name, description, price, category, inStock } = req.body;
  
  if (!name || !description || price == null) {
    return res.status(400).json({ error: 'Name, description, and price are required' });
  }
  
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Price must be a non-negative number' });
  }
  
  const newProduct = {
    id: uuidv4(),
    name,
    description,
    price,
    category: category || 'general',
    inStock: inStock !== undefined ? inStock : true,
  };
  
  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PUT update product
app.put('/api/products/:id', authenticate, (req, res) => {
  const product = products.find(p => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const { name, description, price, category, inStock } = req.body;
  
  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) {
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }
    product.price = price;
  }
  if (category !== undefined) product.category = category;
  if (inStock !== undefined) product.inStock = inStock;
  
  res.json(product);
});

// DELETE product
app.delete('/api/products/:id', authenticate, (req, res) => {
  const index = products.findIndex(p => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  const deletedProduct = products.splice(index, 1)[0];
  res.json({ 
    message: 'Product deleted successfully',
    deletedProduct 
  });
});

// Search products
app.get('/api/products/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Search query is required' });
  }
  
  const results = products.filter(p => 
    p.name.toLowerCase().includes(q.toLowerCase()) || 
    p.description.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json({
    query: q,
    results: results,
    count: results.length
  });
});

// Product statistics
app.get('/api/products/stats', (req, res) => {
  const stats = {
    totalProducts: products.length,
    totalInStock: products.filter(p => p.inStock).length,
    totalOutOfStock: products.filter(p => !p.inStock).length,
    averagePrice: products.reduce((sum, p) => sum + p.price, 0) / products.length,
    categories: {}
  };
  
  products.forEach(p => {
    stats.categories[p.category] = (stats.categories[p.category] || 0) + 1;
  });
  
  res.json(stats);
});

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The route ${req.method} ${req.originalUrl} does not exist`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;