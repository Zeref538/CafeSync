const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { getDb } = require('../firebase');
const { addSalesData } = require('./analytics');
const completedOrdersStorage = require('../services/completedOrdersStorage');

// Import inventory functions
const inventoryRoutes = require('./inventory');

// Mock inventory data (same as in inventory.js for consistency)
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

// Function to deduct inventory for completed orders
async function deductInventoryForOrder(items) {
  try {
    // Simple mapping of menu items to inventory items
    const itemMapping = {
      'Americano': { 'coffee-beans-1': 0.1 }, // 0.1 lbs coffee per americano
      'Latte': { 'coffee-beans-1': 0.1, 'milk-whole-1': 0.2 }, // 0.1 lbs coffee + 0.2 gallons milk
      'Cappuccino': { 'coffee-beans-1': 0.1, 'milk-whole-1': 0.15 },
      'Espresso': { 'coffee-beans-1': 0.05 },
      'Mocha': { 'coffee-beans-1': 0.1, 'milk-whole-1': 0.2, 'syrup-vanilla-1': 0.1 },
      'Frappuccino': { 'coffee-beans-1': 0.1, 'milk-whole-1': 0.3, 'syrup-vanilla-1': 0.2 },
    };

    for (const item of items) {
      const itemName = item.name;
      const quantity = item.quantity || 1;
      
      if (itemMapping[itemName]) {
        for (const [inventoryId, usagePerUnit] of Object.entries(itemMapping[itemName])) {
          const totalUsage = usagePerUnit * quantity;
          
          // Find inventory item
          const inventoryIndex = inventory.findIndex(i => i.id === inventoryId);
          if (inventoryIndex !== -1) {
            // Deduct from inventory
            inventory[inventoryIndex].currentStock = Math.max(0, inventory[inventoryIndex].currentStock - totalUsage);
            inventory[inventoryIndex].lastUpdated = moment().toISOString();
            
            console.log(`Deducted ${totalUsage} ${inventory[inventoryIndex].unit} from ${inventory[inventoryIndex].name}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error deducting inventory:', error);
  }
}

// Firestore collection reference
const ORDERS_COLLECTION = 'orders';

// In-memory storage for development (fallback when Firebase is not configured)
let orders = [];
let orderCounter = 1;

// Clear existing orders to fix the customer object issue
orders = [];

async function nextOrderNumber(db) {
  const counterRef = db.collection('_counters').doc('orders');
  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? (snap.data().value || 0) : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return next;
  });
  return result;
}

// Get all orders
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      // Fallback to in-memory storage
      const { status, station, limit = 50 } = req.query;
      let filteredOrders = [...orders];
      
      // Filter out completed orders that are stored in persistent storage
      filteredOrders = await Promise.all(
        filteredOrders.map(async (order) => {
          if (order.status === 'completed') {
            const isStored = await completedOrdersStorage.isOrderCompleted(order.id);
            return isStored ? null : order; // Return null for stored completed orders
          }
          return order;
        })
      );
      filteredOrders = filteredOrders.filter(order => order !== null);
      
      if (status) {
        // Handle comma-separated status values (e.g., "pending,preparing,ready")
        const statusList = status.includes(',') ? status.split(',') : [status];
        filteredOrders = filteredOrders.filter(order => statusList.includes(order.status));
      }
      if (station) filteredOrders = filteredOrders.filter(order => order.station === station);
      filteredOrders = filteredOrders.slice(0, parseInt(limit));
      return res.json({ success: true, data: filteredOrders, count: filteredOrders.length });
    }

    const { status, station, limit = 50 } = req.query;
    let q = db.collection(ORDERS_COLLECTION).orderBy('createdAt', 'desc');
    
    // Handle comma-separated status values for Firebase
    if (status) {
      if (status.includes(',')) {
        // For multiple statuses, we need to use 'in' operator
        const statusList = status.split(',');
        q = q.where('status', 'in', statusList);
      } else {
        q = q.where('status', '==', status);
      }
    }
    
    if (station) q = q.where('station', '==', station);

    const snap = await q.limit(parseInt(limit)).get();
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter out completed orders that are stored in persistent storage
    data = await Promise.all(
      data.map(async (order) => {
        if (order.status === 'completed') {
          const isStored = await completedOrdersStorage.isOrderCompleted(order.id);
          return isStored ? null : order; // Return null for stored completed orders
        }
        return order;
      })
    );
    data = data.filter(order => order !== null);

    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ success: false, error: 'Database not configured' });
    const doc = await db.collection(ORDERS_COLLECTION).doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new order
router.post('/', async (req, res) => {
  try {
    const db = getDb();
    
    const { customer, items, station, specialInstructions, paymentMethod = 'cash', staffId } = req.body;
    if (!customer || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Customer and items are required' });
    }

    const orderId = uuidv4();
    const now = moment().toISOString();
    
    let orderNumber;
    if (db) {
      orderNumber = await nextOrderNumber(db);
    } else {
      // Fallback to in-memory counter
      orderNumber = orderCounter++;
    }
    
    const totalAmount = calculateTotal(items);
    const estimatedPrepTime = calculatePrepTime(items);
    
    const order = {
      id: orderId,
      orderNumber,
      customer,
      items,
      station: station || 'front-counter',
      status: 'pending',
      specialInstructions: specialInstructions || '',
      paymentMethod,
      staffId,
      totalAmount,
      estimatedPrepTime,
      priority: calculatePriority(items, totalAmount),
      createdAt: now,
      updatedAt: now,
      // Kitchen-specific fields
      kitchenNotes: '',
      actualPrepTime: null,
      completedAt: null
    };

    if (db) {
      await db.collection(ORDERS_COLLECTION).doc(orderId).set(order);
    } else {
      // Fallback to in-memory storage
      orders.push(order);
    }
    
    // Add to sales data for analytics
    addSalesData(order);
    
    res.status(201).json({ success: true, data: order, message: 'Order created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
    });
  }
  try {
    const db = getDb();
    const now = moment().toISOString();
    
    if (!db) {
      // Fallback to in-memory storage
      const orderIndex = orders.findIndex(order => order.id === req.params.id);
      if (orderIndex === -1) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }
      
      // Update order in memory
      const updatedOrder = {
        ...orders[orderIndex],
        status,
        updatedAt: now,
        ...(status === 'completed' && { completedAt: now })
      };
      
      orders[orderIndex] = updatedOrder;
      
      // Store completed order in persistent storage
      if (status === 'completed') {
        await completedOrdersStorage.storeCompletedOrder(updatedOrder);
        // Deduct inventory for completed orders
        await deductInventoryForOrder(updatedOrder.items);
      }
      
      // Broadcast the update via socket
      const { io } = require('../index');
      if (io) {
        io.emit('order-update', {
          id: updatedOrder.id,
          status: updatedOrder.status,
          station: 'kitchen',
          timestamp: now,
          ...updatedOrder
        });
      }
      
      return res.json({ 
        success: true, 
        data: updatedOrder, 
        message: 'Order status updated successfully' 
      });
    }
    
    const ref = db.collection(ORDERS_COLLECTION).doc(req.params.id);
    
    // Prepare update data
    const updateData = { status, updatedAt: now };
    
    // Add completion timestamp if order is completed
    if (status === 'completed') {
      updateData.completedAt = now;
    }
    
    await ref.set(updateData, { merge: true });
    await ref.collection('history').add({ status, timestamp: now, updatedBy: req.body.updatedBy || 'system' });
    const updated = await ref.get();
    const updatedOrder = { id: updated.id, ...updated.data() };
    
    // Store completed order in persistent storage
    if (status === 'completed') {
      await completedOrdersStorage.storeCompletedOrder(updatedOrder);
      // Deduct inventory for completed orders
      await deductInventoryForOrder(updatedOrder.items);
    }
    
    // Broadcast the update via socket
    const { io } = require('../index');
    if (io) {
      io.emit('order-update', {
        id: updatedOrder.id,
        status: updatedOrder.status,
        station: 'kitchen',
        timestamp: now,
        ...updatedOrder
      });
    }
    
    res.json({ success: true, data: updatedOrder, message: 'Order status updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add item to existing order
router.post('/:id/items', async (req, res) => {
  const { items } = req.body;
  
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({
      success: false,
      error: 'Items array is required'
    });
  }
  try {
    const db = getDb();
    if (!db) return res.status(503).json({ success: false, error: 'Database not configured' });
    const ref = db.collection(ORDERS_COLLECTION).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const data = doc.data();
    if (data.status === 'completed' || data.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'Cannot add items to completed or cancelled order' });
    }
    const updatedItems = [...data.items, ...items];
    const now = moment().toISOString();
    const updated = {
      items: updatedItems,
      totalAmount: calculateTotal(updatedItems),
      estimatedPrepTime: calculatePrepTime(updatedItems),
      updatedAt: now,
    };
    await ref.set(updated, { merge: true });
    const after = await ref.get();
    res.json({ success: true, data: { id: after.id, ...after.data() }, message: 'Items added to order successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get orders by station
router.get('/station/:station', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      // Fallback to in-memory storage
      const { station } = req.params;
      const { status } = req.query;
      let filteredOrders = orders.filter(order => order.station === station);
      if (status) filteredOrders = filteredOrders.filter(order => order.status === status);
      filteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, data: filteredOrders, count: filteredOrders.length });
    }
    
    const { station } = req.params;
    const { status } = req.query;
    let q = db.collection(ORDERS_COLLECTION).where('station', '==', station).orderBy('createdAt', 'desc');
    if (status) q = q.where('status', '==', status);
    const snap = await q.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data, count: data.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper functions
function calculateTotal(items) {
  return items.reduce((total, item) => {
    const itemPrice = item.unitPrice || item.price || 0;
    return total + (itemPrice * item.quantity);
  }, 0);
}

function calculatePrepTime(items) {
  // Base prep time in minutes
  const baseTime = 2;
  const timePerItem = 1;
  const complexityMultiplier = items.some(item => 
    item.category === 'specialty' || item.customizations?.extras?.length > 0
  ) ? 1.5 : 1;
  
  return Math.ceil((baseTime + (items.length * timePerItem)) * complexityMultiplier);
}

function calculatePriority(items, totalAmount) {
  // High priority for large orders or specialty items
  if (totalAmount > 50 || items.some(item => item.category === 'specialty')) {
    return 'high';
  }
  if (totalAmount > 25 || items.length > 3) {
    return 'normal';
  }
  return 'normal';
}

// Export function to get orders for analytics
function getOrders() {
  return orders;
}

module.exports = router;
module.exports.getOrders = getOrders;
