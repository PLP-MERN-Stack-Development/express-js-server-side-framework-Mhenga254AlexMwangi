// server.js - Starter Express server for Week 2 assignment

// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Parse incoming JSON requests
app.use(bodyParser.json());

// Custom request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

//Custom authentication middleware
const authenticate = (req, res, next) => {
  const apiKey = req.header('x-api-key');
  if (apiKey !== 'mysecretkey') {
    return res.status(401).json({ error: 'Unauthorized: Invalid API key' });
  }
  next();
};

// =============================
// 🗄️ Sample in-memory products database
// =============================
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
  },
];
//ROUTES

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to the Product API! Go to /api/products to see all products.');
});

// GET /api/products - Get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// GET /api/products/:id - Get a specific product by ID
app.get('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

//  POST /api/products - Create a new product
// Protected route → requires authentication
app.post('/api/products', authenticate, (req, res) => {
  const { name, description, price, category, inStock } = req.body;

  if (!name || !description || price == null) {
    return res.status(400).json({ error: 'Name, description, and price are required' });
  }

  const newProduct = {
    id: uuidv4(),
    name,
    description,
    price,
    category: category || 'general',
    inStock: inStock ?? true,
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

// PUT /api/products/:id 
app.put('/api/products/:id', authenticate, (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const { name, description, price, category, inStock } = req.body;

  if (name !== undefined) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = price;
  if (category !== undefined) product.category = category;
  if (inStock !== undefined) product.inStock = inStock;

  res.json(product);
});

// DELETE /api/products/:id - Delete a product by ID
app.delete('/api/products/:id', authenticate, (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products.splice(index, 1);
  res.status(204).send();
});

//  Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Export the app for testing
module.exports = app;
