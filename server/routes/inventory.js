const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Mock inventory database
let inventory = [
  {
    id: 'coffee-beans-1',
    name: 'Premium Arabica Beans',
    category: 'coffee',
    currentStock: 50,
    minStock: 10,
    maxStock: 100,
    unit: 'lbs',
    costPerUnit: 12.50,
    supplier: 'Coffee Supply Co.',
    lastRestocked: '2024-01-15T10:00:00Z',
    expiryDate: '2024-06-15T00:00:00Z',
    location: 'storage-room-a'
  },
  {
    id: 'milk-whole-1',
    name: 'Whole Milk',
    category: 'dairy',
    currentStock: 25,
    minStock: 5,
    maxStock: 50,
    unit: 'gallons',
    costPerUnit: 3.50,
    supplier: 'Dairy Fresh',
    lastRestocked: '2024-01-20T08:00:00Z',
    expiryDate: '2024-01-27T00:00:00Z',
    location: 'refrigerator-1'
  },
  {
    id: 'syrup-vanilla-1',
    name: 'Vanilla Syrup',
    category: 'syrups',
    currentStock: 8,
    minStock: 3,
    maxStock: 20,
    unit: 'bottles',
    costPerUnit: 8.99,
    supplier: 'Flavor Masters',
    lastRestocked: '2024-01-18T14:00:00Z',
    expiryDate: '2025-01-18T00:00:00Z',
    location: 'shelf-b2'
  }
];

let inventoryHistory = [];

// Get all inventory items
router.get('/', (req, res) => {
  const { category, lowStock, location } = req.query;
  
  let filteredInventory = [...inventory];
  
  if (category) {
    filteredInventory = filteredInventory.filter(item => item.category === category);
  }
  
  if (lowStock === 'true') {
    filteredInventory = filteredInventory.filter(item => item.currentStock <= item.minStock);
  }
  
  if (location) {
    filteredInventory = filteredInventory.filter(item => item.location === location);
  }
  
  res.json({
    success: true,
    data: filteredInventory,
    count: filteredInventory.length
  });
});

// Get inventory item by ID
router.get('/:id', (req, res) => {
  const item = inventory.find(i => i.id === req.params.id);
  
  if (!item) {
    return res.status(404).json({
      success: false,
      error: 'Inventory item not found'
    });
  }
  
  res.json({
    success: true,
    data: item
  });
});

// Update inventory stock
router.patch('/:id/stock', (req, res) => {
  const { quantity, operation, reason, updatedBy } = req.body;
  
  if (!quantity || !operation || !['add', 'subtract', 'set'].includes(operation)) {
    return res.status(400).json({
      success: false,
      error: 'Quantity and operation (add/subtract/set) are required'
    });
  }
  
  const itemIndex = inventory.findIndex(i => i.id === req.params.id);
  
  if (itemIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Inventory item not found'
    });
  }
  
  const oldStock = inventory[itemIndex].currentStock;
  let newStock;
  
  switch (operation) {
    case 'add':
      newStock = oldStock + quantity;
      break;
    case 'subtract':
      newStock = Math.max(0, oldStock - quantity);
      break;
    case 'set':
      newStock = quantity;
      break;
  }
  
  inventory[itemIndex].currentStock = newStock;
  inventory[itemIndex].lastUpdated = moment().toISOString();
  
  // Add to history
  inventoryHistory.push({
    id: uuidv4(),
    itemId: req.params.id,
    itemName: inventory[itemIndex].name,
    operation,
    quantity,
    oldStock,
    newStock,
    reason: reason || 'Manual adjustment',
    updatedBy: updatedBy || 'system',
    timestamp: moment().toISOString()
  });
  
  res.json({
    success: true,
    data: inventory[itemIndex],
    message: 'Inventory updated successfully'
  });
});

// Get low stock items
router.get('/alerts/low-stock', (req, res) => {
  const lowStockItems = inventory.filter(item => item.currentStock <= item.minStock);
  
  res.json({
    success: true,
    data: lowStockItems,
    count: lowStockItems.length,
    message: lowStockItems.length > 0 ? 'Low stock items found' : 'All items are adequately stocked'
  });
});

// Get inventory history
router.get('/:id/history', (req, res) => {
  const { limit = 50 } = req.query;
  
  const itemHistory = inventoryHistory
    .filter(entry => entry.itemId === req.params.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, parseInt(limit));
  
  res.json({
    success: true,
    data: itemHistory,
    count: itemHistory.length
  });
});

// Create new inventory item
router.post('/', (req, res) => {
  const {
    name,
    category,
    currentStock,
    minStock,
    maxStock,
    unit,
    costPerUnit,
    supplier,
    location
  } = req.body;
  
  if (!name || !category || currentStock === undefined || !unit) {
    return res.status(400).json({
      success: false,
      error: 'Name, category, currentStock, and unit are required'
    });
  }
  
  const newItem = {
    id: uuidv4(),
    name,
    category,
    currentStock: parseInt(currentStock),
    minStock: parseInt(minStock) || 5,
    maxStock: parseInt(maxStock) || 100,
    unit,
    costPerUnit: parseFloat(costPerUnit) || 0,
    supplier: supplier || 'Unknown',
    location: location || 'storage',
    lastRestocked: moment().toISOString(),
    lastUpdated: moment().toISOString(),
    expiryDate: req.body.expiryDate || null
  };
  
  inventory.push(newItem);
  
  res.status(201).json({
    success: true,
    data: newItem,
    message: 'Inventory item created successfully'
  });
});

// Get inventory analytics
router.get('/analytics/overview', (req, res) => {
  const totalItems = inventory.length;
  const lowStockCount = inventory.filter(item => item.currentStock <= item.minStock).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
  const categories = [...new Set(inventory.map(item => item.category))];
  
  const categoryBreakdown = categories.map(category => {
    const categoryItems = inventory.filter(item => item.category === category);
    return {
      category,
      count: categoryItems.length,
      totalStock: categoryItems.reduce((sum, item) => sum + item.currentStock, 0),
      totalValue: categoryItems.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0)
    };
  });
  
  res.json({
    success: true,
    data: {
      totalItems,
      lowStockCount,
      totalValue: Math.round(totalValue * 100) / 100,
      categories: categories.length,
      categoryBreakdown
    }
  });
});

module.exports = router;
