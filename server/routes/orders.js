const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { getDb } = require('../firebase');

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
      if (status) filteredOrders = filteredOrders.filter(order => order.status === status);
      if (station) filteredOrders = filteredOrders.filter(order => order.station === station);
      filteredOrders = filteredOrders.slice(0, parseInt(limit));
      return res.json({ success: true, data: filteredOrders, count: filteredOrders.length });
    }

    const { status, station, limit = 50 } = req.query;
    let q = db.collection(ORDERS_COLLECTION).orderBy('createdAt', 'desc');
    if (status) q = q.where('status', '==', status);
    if (station) q = q.where('station', '==', station);

    const snap = await q.limit(parseInt(limit)).get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
    
    const { customer, items, station, specialInstructions } = req.body;
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
    
    const order = {
      id: orderId,
      orderNumber,
      customer,
      items,
      station: station || 'front-counter',
      status: 'pending',
      specialInstructions: specialInstructions || '',
      createdAt: now,
      updatedAt: now,
      totalAmount: calculateTotal(items),
      estimatedPrepTime: calculatePrepTime(items)
    };

    if (db) {
      await db.collection(ORDERS_COLLECTION).doc(orderId).set(order);
    } else {
      // Fallback to in-memory storage
      orders.push(order);
    }
    
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
    if (!db) return res.status(503).json({ success: false, error: 'Database not configured' });
    const ref = db.collection(ORDERS_COLLECTION).doc(req.params.id);
    const now = moment().toISOString();
    await ref.set({ status, updatedAt: now }, { merge: true });
    await ref.collection('history').add({ status, timestamp: now, updatedBy: req.body.updatedBy || 'system' });
    const updated = await ref.get();
    res.json({ success: true, data: { id: updated.id, ...updated.data() }, message: 'Order status updated successfully' });
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
    return total + (item.price * item.quantity);
  }, 0);
}

function calculatePrepTime(items) {
  // Base prep time in minutes
  const baseTime = 2;
  const timePerItem = 1;
  const complexityMultiplier = items.some(item => 
    item.category === 'specialty' || item.modifiers?.length > 0
  ) ? 1.5 : 1;
  
  return Math.ceil((baseTime + (items.length * timePerItem)) * complexityMultiplier);
}

module.exports = router;
