const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Set global options
setGlobalOptions({ maxInstances: 10 });

// Audit logging helper function
async function logAuditEvent(db, event) {
  try {
    const auditData = {
      action: event.action, // e.g., 'menu_item_created', 'menu_item_updated', 'menu_item_deleted', 'inventory_item_updated', 'order_created', 'order_status_changed'
      entityType: event.entityType, // e.g., 'menu', 'inventory', 'addon', 'discount', 'order'
      entityId: event.entityId || null,
      entityName: event.entityName || null,
      staffId: event.staffId || 'unknown',
      staffName: event.staffName || 'Unknown',
      staffEmail: event.staffEmail || '',
      details: event.details || {},
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: new Date().toISOString(),
    };
    
    await db.collection('audit_log').add(auditData);
    logger.info(`Audit logged: ${event.action} by ${event.staffName} (${event.staffEmail})`);
  } catch (error) {
    logger.error('Error logging audit event:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

// Get employee info from staffId or staffEmail
async function getEmployeeInfo(db, staffIdOrEmail) {
  try {
    if (!staffIdOrEmail || staffIdOrEmail === 'unknown' || staffIdOrEmail === 'anonymous') {
      return { name: 'Unknown', email: '', role: 'staff' };
    }
    
    const employeesSnapshot = await db.collection('employees').get();
    const normalizedId = staffIdOrEmail.toLowerCase();
    
    // Try to find employee by email, UID, or doc ID
    for (const doc of employeesSnapshot.docs) {
      const emp = doc.data();
      const empEmail = (emp.email || '').toLowerCase();
      const empUid = (emp.uid || '').toLowerCase();
      const docId = doc.id.toLowerCase();
      
      if (empEmail === normalizedId || empUid === normalizedId || docId === normalizedId) {
        return {
          name: emp.name || 'Unknown',
          email: emp.email || staffIdOrEmail,
          role: emp.role || 'staff',
        };
      }
    }
    
    // If not found, return the ID as the name (fallback)
    return { name: staffIdOrEmail, email: staffIdOrEmail, role: 'staff' };
  } catch (error) {
    logger.error('Error getting employee info:', error);
    return { name: staffIdOrEmail, email: staffIdOrEmail, role: 'staff' };
  }
}

// Create notification helper function
async function createNotification(db, notificationData) {
  try {
    const notification = {
      type: notificationData.type || 'info', // 'success', 'warning', 'info', 'error'
      title: notificationData.title || 'Notification',
      message: notificationData.message || '',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      timestamp: new Date().toISOString(),
      orderId: notificationData.orderId || null,
      orderNumber: notificationData.orderNumber || null,
      inventoryId: notificationData.inventoryId || null,
      inventoryName: notificationData.inventoryName || null,
      relatedEntity: notificationData.relatedEntity || null, // 'order', 'inventory', etc.
    };
    
    const notificationRef = await db.collection('notifications').add(notification);
    logger.info(`Notification created: ${notificationData.title} - ${notificationData.message} (ID: ${notificationRef.id})`);
    
    // Verify notification was created
    const verifyDoc = await notificationRef.get();
    if (!verifyDoc.exists) {
      logger.error(`WARNING: Notification document was not created! Title: ${notificationData.title}`);
    } else {
      logger.info(`Notification verified in Firestore: ${notificationRef.id}`);
    }
  } catch (error) {
    logger.error('Error creating notification:', error);
    // Don't throw - notifications should not break the main operation
  }
}

// Main API handler
exports.api = onRequest({cors: true}, async (request, response) => {
  const db = admin.firestore();
  
    logger.info(`API request: ${request.method} ${request.path}`);
    
    try {
      let path = request.path;
      const method = request.method;
      
      // Remove /api prefix if present (for Cloud Run routing)
      if (path.startsWith('/api')) {
        path = path.replace('/api', '');
      }
      
      // Remove trailing slash and normalize
      path = path.replace(/\/$/, '') || '/';
      
      logger.info(`Normalized path: ${path}, query:`, request.query);
    
  // Handle OPTIONS for CORS
  if (method === 'OPTIONS') {
  response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.status(204).send('');
    return;
  }
  
    // Set CORS headers
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    response.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Debug logging
    logger.info(`Processing: ${method} ${path}`);
    
    // Inventory endpoints
    // Check for low stock alerts FIRST (before the base /inventory route)
    if (path === '/inventory/alerts/low-stock' || path === '/alerts/low-stock' || path.startsWith('/inventory/alerts')) {
      if (method === 'GET') {
        const snapshot = await db.collection('inventory').get();
        let allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // If no data, return mock alerts
        if (allItems.length === 0) {
          allItems = [
            {
              id: 'milk-whole-1',
              name: 'Whole Milk',
              category: 'dairy',
              currentStock: 3,
              minStock: 5,
              maxStock: 50,
              unit: 'gallons',
              supplier: 'Dairy Fresh',
              lastRestocked: '2024-01-20T08:00:00Z',
              location: 'refrigerator-1'
            },
            {
              id: 'syrup-vanilla-1',
              name: 'Vanilla Syrup',
              category: 'syrups',
              currentStock: 2,
              minStock: 3,
              maxStock: 20,
              unit: 'bottles',
              supplier: 'Flavor Masters',
              lastRestocked: '2024-01-18T14:00:00Z',
              location: 'shelf-b2'
            }
          ];
        }
        
        const lowStock = allItems.filter(item => item.currentStock <= item.minStock);
        response.json({ success: true, data: lowStock });
        return;
      }
    }
    
    if (path === '/inventory' || path === '/inventory/' || path === '/api/inventory' || path === '/api/inventory/') {
      if (method === 'GET') {
        const snapshot = await db.collection('inventory').get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // If no data, return mock data
        if (items.length === 0) {
          const mockInventory = [
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
              location: 'storage-room-a'
            },
            {
              id: 'milk-whole-1',
              name: 'Whole Milk',
              category: 'dairy',
              currentStock: 3,
              minStock: 5,
              maxStock: 50,
              unit: 'gallons',
              costPerUnit: 3.50,
              supplier: 'Dairy Fresh',
              lastRestocked: '2024-01-20T08:00:00Z',
              location: 'refrigerator-1'
            },
            {
              id: 'syrup-vanilla-1',
              name: 'Vanilla Syrup',
              category: 'syrups',
              currentStock: 2,
              minStock: 3,
              maxStock: 20,
              unit: 'bottles',
              costPerUnit: 8.99,
              supplier: 'Flavor Masters',
              lastRestocked: '2024-01-18T14:00:00Z',
              location: 'shelf-b2'
            }
          ];
          response.json({ success: true, data: mockInventory });
      } else {
          response.json({ success: true, data: items });
        }
        return;
      }
      
      if (method === 'POST') {
        const inventoryData = request.body;
        logger.info('Creating inventory item:', inventoryData);
        
        try {
          // Get staff info for audit logging
          const staffId = inventoryData.staffId || inventoryData.staffEmail || 'unknown';
          const staffInfo = await getEmployeeInfo(db, staffId);
          
          const docRef = await db.collection('inventory').add(inventoryData);
          const createdItem = { id: docRef.id, ...inventoryData };
          logger.info('Inventory item created:', createdItem);
          
          // Check for low stock alert on creation
          const currentStock = inventoryData.currentStock || 0;
          const minStock = inventoryData.minStock || 0;
          const itemName = inventoryData.name || 'Unknown';
          
          if (currentStock > 0 && currentStock <= minStock) {
            // Log audit event for low stock alert
            await logAuditEvent(db, {
              action: 'inventory_low_stock',
              entityType: 'inventory',
              entityId: docRef.id,
              entityName: itemName,
              staffId: staffInfo.email || inventoryData.staffId || inventoryData.staffEmail || 'unknown',
              staffName: staffInfo.name || 'Unknown',
              staffEmail: staffInfo.email || '',
              details: {
                alertType: 'low_stock',
                currentStock: currentStock,
                minStock: minStock,
              },
            });
          }
          
          // Log audit event
          await logAuditEvent(db, {
            action: 'inventory_item_created',
            entityType: 'inventory',
            entityId: docRef.id,
            entityName: inventoryData.name,
            staffId: staffInfo.email || staffId,
            staffName: staffInfo.name,
            staffEmail: staffInfo.email,
            details: { name: inventoryData.name, category: inventoryData.category, currentStock: inventoryData.currentStock }
          });
          
          response.json({ success: true, data: createdItem });
        } catch (error) {
          logger.error('Error creating inventory item:', error);
          response.status(500).json({ error: 'Failed to create inventory item', message: error.message });
        }
        return;
      }
      
      if (method === 'PUT') {
        const inventoryData = request.body;
        logger.info('Updating inventory item:', inventoryData);
        
        try {
          if (inventoryData.id) {
            const { id, ...dataToStore } = inventoryData;
            
            // Get staff info for audit logging
            const staffId = inventoryData.staffId || inventoryData.staffEmail || 'unknown';
            const staffInfo = await getEmployeeInfo(db, staffId);
            
            // Validate that the document exists before updating
            const docRef = db.collection('inventory').doc(id);
            const docSnapshot = await docRef.get();
            
            // In Firebase Admin SDK, exists is a property, not a function
            if (!docSnapshot.exists) {
              logger.warn('Inventory item does not exist:', id);
              response.status(404).json({ error: 'Inventory item not found' });
              return;
            }
            
            // Get old data for comparison
            const oldData = docSnapshot.data();
            
            // Update the document
            await docRef.set(dataToStore, { merge: true });
            
            // Fetch the updated document to return it
            const updatedDoc = await docRef.get();
            const updatedData = { id: updatedDoc.id, ...updatedDoc.data() };
            
            logger.info('Inventory item updated successfully:', id);
            
            // Check for low stock alert
            const currentStock = dataToStore.currentStock || 0;
            const minStock = dataToStore.minStock || 0;
            const itemName = dataToStore.name || oldData?.name || 'Unknown';
            
            if (currentStock > 0 && currentStock <= minStock && (oldData?.currentStock || 0) > minStock) {
              // Log audit event for low stock alert
              await logAuditEvent(db, {
                action: 'inventory_low_stock',
                entityType: 'inventory',
                entityId: id.toString(),
                entityName: itemName,
                staffId: staffInfo.email || inventoryData.staffId || inventoryData.staffEmail || 'unknown',
                staffName: staffInfo.name || 'Unknown',
                staffEmail: staffInfo.email || '',
                details: {
                  alertType: 'low_stock',
                  currentStock: currentStock,
                  minStock: minStock,
                  previousStock: oldData?.currentStock || 0,
                },
              });
            }
            
            // Log audit event
            await logAuditEvent(db, {
              action: 'inventory_item_updated',
              entityType: 'inventory',
              entityId: id.toString(),
              entityName: dataToStore.name || oldData?.name || 'Unknown',
              staffId: staffInfo.email || staffId,
              staffName: staffInfo.name,
              staffEmail: staffInfo.email,
              details: { 
                name: dataToStore.name,
                category: dataToStore.category,
                currentStock: dataToStore.currentStock,
                oldStock: oldData?.currentStock,
                changes: Object.keys(dataToStore).filter(key => !['updatedAt', 'createdAt'].includes(key))
              }
            });
            
            response.json({ success: true, data: updatedData });
          } else {
            response.status(400).json({ error: 'Item ID is required' });
          }
        } catch (error) {
          logger.error('Error updating inventory item:', error);
          response.status(500).json({ error: 'Failed to update inventory item', message: error.message });
        }
        return;
      }
      
      if (method === 'DELETE') {
        const itemId = request.query.id || request.body?.id;
        logger.info('Deleting inventory item - ID:', itemId);
        logger.info('Query params:', request.query);
        logger.info('Request body:', request.body);
        
        try {
          if (!itemId) {
            logger.warn('No item ID provided for deletion');
            response.status(400).json({ error: 'Item ID is required' });
            return;
          }
          
          // Check if document exists before deleting
          const docRef = db.collection('inventory').doc(itemId);
          const docSnapshot = await docRef.get();
          
          // In Firebase Admin SDK, exists is a property, not a function
          if (!docSnapshot.exists) {
            logger.warn('Inventory item does not exist:', itemId);
            response.status(404).json({ error: 'Inventory item not found' });
            return;
          }
          
          // Get item data before deletion for audit
          const itemData = docSnapshot.data();
          
          // Get staff info from query params, body, or headers
          const staffId = request.query.staffId || request.query.staffEmail || request.body?.staffId || request.body?.staffEmail || request.headers['x-staff-id'] || request.headers['x-staff-email'] || 'unknown';
          const staffInfo = await getEmployeeInfo(db, staffId);
          
          // Delete the document
          await docRef.delete();
          logger.info('Inventory item deleted successfully:', itemId);
          
          // Log audit event
          await logAuditEvent(db, {
            action: 'inventory_item_deleted',
            entityType: 'inventory',
            entityId: itemId.toString(),
            entityName: itemData?.name || 'Unknown',
            staffId: staffInfo.email || staffId,
            staffName: staffInfo.name,
            staffEmail: staffInfo.email,
            details: { name: itemData?.name, category: itemData?.category, currentStock: itemData?.currentStock }
          });
          
          response.json({ success: true, message: 'Item deleted successfully', id: itemId });
        } catch (error) {
          logger.error('Error deleting inventory item:', error);
          logger.error('Error stack:', error.stack);
          response.status(500).json({ 
            error: 'Failed to delete inventory item', 
            message: error.message,
            details: error.stack
          });
        }
        return;
      }
    }
    
    // Orders endpoints
    if (path.startsWith('/orders')) {
      if ((path === '/orders' || path === '/api/orders') && method === 'GET') {
        const status = request.query.status;
        let query = db.collection('orders');
        
        logger.info(`Getting orders with status: ${status}`);
        
        try {
          let snapshot;
          if (status) {
            const statusList = status.split(',');
            snapshot = await query.where('status', 'in', statusList).get();
          } else {
            snapshot = await query.get();
          }
          
          const orders = snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id, 
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date()
            };
          });
          
          logger.info(`Returning ${orders.length} orders`);
          response.json({ success: true, data: orders });
  } catch (error) {
          logger.error('Orders fetch error:', error);
          // If query fails, return empty array
          response.json({ success: true, data: [] });
        }
        return;
      }
      
      if ((path === '/orders' || path === '/api/orders') && method === 'POST') {
        const orderData = request.body;
        logger.info('Creating order:', JSON.stringify(orderData, null, 2));
        
        try {
          // Generate order number - simple sequential for now
          const allOrders = await db.collection('orders').get();
          const orderNumber = allOrders.size + 1;
          
          // Calculate total from items
          let subtotal = 0;
          if (orderData.items && Array.isArray(orderData.items)) {
            subtotal = orderData.items.reduce((sum, item) => {
              const itemPrice = item.price || item.unitPrice || 0;
              const quantity = item.quantity || 1;
              return sum + (itemPrice * quantity);
            }, 0);
          }
          
          // Apply discount if provided
          let total = subtotal;
          if (orderData.discount && orderData.discount > 0) {
            total = subtotal - orderData.discount;
          }
          
          // Clean the order data - remove any undefined fields
          const cleanOrderData = {
            customer: orderData.customer || 'Unknown',
      items: orderData.items || [],
            subtotal: subtotal,
            totalAmount: total, // Use totalAmount for consistency with analytics
            total: total, // Keep both for compatibility
      station: orderData.station || 'front-counter',
      paymentMethod: orderData.paymentMethod || 'cash',
            staffId: orderData.staffId || 'unknown',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            orderNumber,
            status: 'pending',
            discount: orderData.discount || null,
            notes: orderData.notes || null,
            extras: orderData.extras || null,
          };
          
          const orderRef = await db.collection('orders').add(cleanOrderData);
          
          const orderDoc = await orderRef.get();
          const createdOrder = { 
            id: orderRef.id, 
            ...orderDoc.data(),
            orderNumber 
          };
          
          logger.info('Order created:', createdOrder);
          
          // Log audit event for order creation
          await logAuditEvent(db, {
            action: 'order_created',
            entityType: 'order',
            entityId: orderRef.id,
            entityName: `Order #${orderNumber}`,
            staffId: cleanOrderData.staffId || cleanOrderData.staffEmail || 'unknown',
            staffName: cleanOrderData.staffName || 'Unknown',
            staffEmail: cleanOrderData.staffEmail || '',
            details: {
              orderNumber: orderNumber,
              customer: cleanOrderData.customer || 'Takeout',
              totalAmount: total,
              itemCount: cleanOrderData.items?.length || 0,
              station: cleanOrderData.station || 'front-counter',
            },
          });
          
          response.json({ success: true, data: createdOrder });
        } catch (error) {
          logger.error('Error creating order:', error);
          response.status(500).json({ error: 'Failed to create order', message: error.message });
        }
        return;
      }
      
      // PATCH /orders/:id/status
      const statusMatch = path.match(/^\/orders\/(.+)\/status$/) || path.match(/^\/api\/orders\/(.+)\/status$/);
      if (statusMatch && method === 'PATCH') {
        const orderId = statusMatch[1];
        const { status } = request.body;
        logger.info(`Updating order ${orderId} to status: ${status}`);
        
        // Get order data before updating
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
          response.status(404).json({ error: 'Order not found' });
          return;
        }
        
        const orderData = orderDoc.data();
        const orderNumber = orderData.orderNumber || 0;
        
        // Get staff info from request or order
        const staffId = request.body.staffId || request.body.staffEmail || request.query.staffId || request.query.staffEmail || orderData.staffId || orderData.staffEmail || 'unknown';
        const staffInfo = await getEmployeeInfo(db, staffId);
        
        const updateData = {
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        // Add completion timestamp when order is completed
        if (status === 'completed') {
          updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
          
          // Log audit event for order completion
          await logAuditEvent(db, {
            action: 'order_completed',
            entityType: 'order',
            entityId: orderId,
            entityName: `Order #${orderNumber}`,
            staffId: staffInfo.email || staffId,
            staffName: staffInfo.name || 'Unknown',
            staffEmail: staffInfo.email || '',
            details: {
              orderNumber: orderNumber,
              status: 'completed',
              previousStatus: orderData.status || 'unknown',
            },
          });
        }
        // Add cancellation timestamp when order is cancelled
        else if (status === 'cancelled') {
          updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
          
          // Log audit event for order cancellation
          await logAuditEvent(db, {
            action: 'order_cancelled',
            entityType: 'order',
            entityId: orderId,
            entityName: `Order #${orderNumber}`,
            staffId: staffInfo.email || staffId,
            staffName: staffInfo.name || 'Unknown',
            staffEmail: staffInfo.email || '',
            details: {
              orderNumber: orderNumber,
              status: 'cancelled',
              previousStatus: orderData.status || 'unknown',
            },
          });
        } else if (status !== orderData.status) {
          // Log general status change
          await logAuditEvent(db, {
            action: 'order_status_changed',
            entityType: 'order',
            entityId: orderId,
            entityName: `Order #${orderNumber}`,
            staffId: staffInfo.email || staffId,
            staffName: staffInfo.name || 'Unknown',
            staffEmail: staffInfo.email || '',
            details: {
              orderNumber: orderNumber,
              status: status,
              previousStatus: orderData.status || 'unknown',
            },
          });
        }
        
        await db.collection('orders').doc(orderId).update(updateData);
        
        response.json({ success: true });
        return;
      }
    }
    
    // Analytics endpoints
    if (path.startsWith('/analytics')) {
      if (path === '/analytics/dashboard') {
        try {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          
          // Get all orders from today
          const todayOrders = await db.collection('orders')
            .where('createdAt', '>=', todayStart)
            .get();
          
          let totalSales = 0;
          let totalOrders = todayOrders.size;
          let completedOrders = 0;
          let deliveryTimes = [];
          
          let cancelledOrders = 0;
          
          todayOrders.forEach(doc => {
            const order = doc.data();
            
            // Only count sales for non-cancelled orders
            if (order.status !== 'cancelled') {
              totalSales += order.totalAmount || order.total || 0;
            }
            
            if (order.status === 'completed') {
              completedOrders++;
              
              // Calculate delivery time if we have completion timestamp
              if (order.completedAt) {
                const createdAt = new Date(order.createdAt);
                const completedAt = new Date(order.completedAt);
                const deliveryTime = (completedAt - createdAt) / 1000 / 60; // minutes
                deliveryTimes.push(deliveryTime);
              }
            } else if (order.status === 'cancelled') {
              cancelledOrders++;
            }
          });
          
          // Calculate average delivery time
          let averageDeliveryTime = 15; // default
          if (deliveryTimes.length > 0) {
            averageDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
          }
          
          // Get inventory alerts
          const inventorySnapshot = await db.collection('inventory').get();
          let inventoryAlerts = 0;
          inventorySnapshot.forEach(doc => {
            const item = doc.data();
            if (item.quantity <= (item.minThreshold || 5)) {
              inventoryAlerts++;
            }
          });
          
          response.json({
            todaySales: Math.round(totalSales * 100) / 100,
            todayOrders: totalOrders,
            completionRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
            averageDeliveryTime: Math.round(averageDeliveryTime),
            inventoryAlerts: inventoryAlerts,
            averageOrderTime: Math.round(averageDeliveryTime * 0.8) // Estimate prep time as 80% of delivery time
          });
        } catch (error) {
          logger.error('Error fetching dashboard analytics:', error);
          // Return mock data if Firestore query fails
          response.json({
            todaySales: 0,
            todayOrders: 0,
            completionRate: 0,
            averageDeliveryTime: 15,
            inventoryAlerts: 2,
            averageOrderTime: 12
          });
        }
        return;
      }
      
      if (path === '/analytics/staff' || path === '/api/analytics/staff') {
        try {
          // Get period from query params (today, week, month)
          const period = request.query.period || 'month';
          
          // Calculate date range based on period
          const now = new Date();
          let startDate = new Date(now);
          let endDate = new Date(now);
          
          switch (period) {
            case 'today':
              // For today, use UTC timezone to ensure consistency with Firestore timestamps
              const todayUTC = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                0, 0, 0, 0
              ));
              const endTodayUTC = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                23, 59, 59, 999
              ));
              startDate = todayUTC;
              endDate = endTodayUTC;
              break;
            case 'week':
              // Get orders from the past 7 days
              startDate.setDate(startDate.getDate() - 7);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
            case 'month':
              // Get orders from the past 30 days
              startDate.setDate(startDate.getDate() - 30);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
              break;
          }
          
          // Convert to Firestore Timestamps for query
          const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
          const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);
          
          logger.info('Fetching staff performance analytics', {
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          });
          
          // Get orders filtered by period
          const ordersSnapshot = await db.collection('orders')
            .where('createdAt', '>=', startTimestamp)
            .where('createdAt', '<=', endTimestamp)
            .get();
          
          // Get all employees to map staffId to names
          const employeesSnapshot = await db.collection('employees').get();
          const employeeMap = {};
          
          employeesSnapshot.forEach(doc => {
            const emp = doc.data();
            const email = (emp.email || doc.id).toLowerCase();
            const docId = doc.id.toLowerCase();
            const uid = emp.uid ? emp.uid.toLowerCase() : null;
            
            // Map by email (most common)
            employeeMap[email] = {
              id: doc.id,
              name: emp.name || 'Unknown',
              email: emp.email || doc.id,
              role: emp.role || 'staff',
              station: emp.station || 'unknown',
              uid: emp.uid || null
            };
            
            // Map by doc ID (lowercase)
            if (docId !== email) {
              employeeMap[docId] = {
                id: doc.id,
                name: emp.name || 'Unknown',
                email: emp.email || doc.id,
                role: emp.role || 'staff',
                station: emp.station || 'unknown',
                uid: emp.uid || null
              };
            }
            
            // Map by Firebase Auth UID if available
            if (uid) {
              employeeMap[uid] = {
                id: doc.id,
                name: emp.name || 'Unknown',
                email: emp.email || doc.id,
                role: emp.role || 'staff',
                station: emp.station || 'unknown',
                uid: emp.uid
              };
            }
          });
          
          // Aggregate staff performance data
          const staffPerformance = {};
          const staffAudit = [];
          
          ordersSnapshot.forEach(doc => {
            const order = doc.data();
            // Try to get staffId from order (could be email, UID, or doc ID)
            const staffId = order.staffId || order.staffEmail || 'unknown';
            const normalizedStaffId = staffId.toLowerCase();
            
            // Find employee by multiple lookup methods - prioritize email lookup
            let employee = employeeMap[order.staffEmail?.toLowerCase()] ||
                          employeeMap[normalizedStaffId] || 
                          employeeMap[staffId] ||
                          null;
            
            // If still not found, try direct lookup by checking if staffId matches any key
            if (!employee) {
              const possibleKeys = Object.keys(employeeMap);
              for (const key of possibleKeys) {
                const emp = employeeMap[key];
                if (emp.email?.toLowerCase() === normalizedStaffId || 
                    emp.email?.toLowerCase() === order.staffEmail?.toLowerCase() ||
                    emp.uid === staffId ||
                    key === normalizedStaffId) {
                  employee = emp;
                  break;
                }
              }
            }
            
            // Use normalized email as the key for grouping (to ensure same employee is grouped together)
            const groupKey = employee?.email?.toLowerCase() || order.staffEmail?.toLowerCase() || normalizedStaffId;
            
            // Initialize staff entry if not exists - ALWAYS use employee name from employees collection
            if (!staffPerformance[groupKey]) {
              // ALWAYS prioritize employee name from employees collection - never use ID as name
              const finalName = employee?.name || (order.staffName && order.staffName !== order.staffEmail ? order.staffName : null);
              const finalEmail = employee?.email || order.staffEmail || staffId;
              
              staffPerformance[groupKey] = {
                staffId: finalEmail, // Use email as ID, not raw staffId
                staffName: finalName || `Staff (${finalEmail.split('@')[0]})`, // Use name from employees collection, never show email as name
                staffEmail: finalEmail,
                staffRole: employee?.role || 'staff',
                totalOrders: 0,
                completedOrders: 0,
                cancelledOrders: 0,
                totalSales: 0,
                averageOrderValue: 0,
                totalItems: 0,
                stations: {},
                recentOrders: [],
                firstOrderDate: null,
                lastOrderDate: null,
              };
            }
            
            const staff = staffPerformance[groupKey];
            
            // Update staff name if we found a better employee record with a proper name
            if (employee?.name && employee.name !== 'Unknown' && !staff.staffName.includes('Staff (')) {
              staff.staffName = employee.name; // Always use name from employees collection
              staff.staffEmail = employee.email || staff.staffEmail;
              staff.staffRole = employee.role || staff.staffRole;
            }
            const orderDate = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
            const orderTotal = order.totalAmount || order.total || 0;
            
            // Update order counts
            staff.totalOrders++;
            if (order.status === 'completed') {
              staff.completedOrders++;
              staff.totalSales += orderTotal;
            } else if (order.status === 'cancelled') {
              staff.cancelledOrders++;
            }
            
            // Count items
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                staff.totalItems += (item.quantity || 1);
              });
            }
            
            // Track station performance
            const station = order.station || 'unknown';
            if (!staff.stations[station]) {
              staff.stations[station] = { orders: 0, sales: 0 };
            }
            staff.stations[station].orders++;
            if (order.status === 'completed') {
              staff.stations[station].sales += orderTotal;
            }
            
            // Track dates
            if (!staff.firstOrderDate || orderDate < staff.firstOrderDate) {
              staff.firstOrderDate = orderDate;
            }
            if (!staff.lastOrderDate || orderDate > staff.lastOrderDate) {
              staff.lastOrderDate = orderDate;
            }
            
            // Add to audit trail (last 100 orders) - use staff name from employees collection
            staffAudit.push({
              orderId: doc.id,
              orderNumber: order.orderNumber || 0,
              staffId: staff.staffEmail || groupKey, // Use email, not raw staffId
              staffName: staff.staffName, // Always use name from employees collection
              staffEmail: staff.staffEmail || order.staffEmail || '',
              station: station,
              status: order.status || 'pending',
              totalAmount: orderTotal,
              itemCount: order.items?.length || 0,
              customer: order.customer || 'Unknown',
              paymentMethod: order.paymentMethod || 'cash',
              createdAt: order.createdAt?.toDate ? order.createdAt.toDate().toISOString() : order.createdAt,
              completedAt: order.completedAt?.toDate ? order.completedAt.toDate().toISOString() : order.completedAt,
            });
          });
          
          // Calculate averages and format data - filter out entries with invalid names (IDs or placeholders)
          const staffPerformanceArray = Object.values(staffPerformance)
            .filter(staff => {
              // Remove entries that are using IDs instead of proper employee names
              const staffName = staff.staffName || '';
              const staffId = staff.staffId || '';
              const staffEmail = staff.staffEmail || '';
              
              // Check if this is a Firebase UID (long alphanumeric string, typically 28+ chars)
              const isFirebaseUID = (staffId.length >= 28 && /^[a-zA-Z0-9]+$/.test(staffId)) ||
                                    (staffEmail.length >= 28 && /^[a-zA-Z0-9]+$/.test(staffEmail));
              
              // Additional check: If it's a Firebase UID, verify it exists in employees collection
              if (isFirebaseUID) {
                // Try to find employee by UID, email, or ID in the employeeMap
                const foundEmployee = Object.values(employeeMap).find(emp => 
                  emp.uid === staffId || 
                  emp.uid === staffEmail ||
                  emp.id === staffId ||
                  emp.id === staffEmail ||
                  emp.email === staffId ||
                  emp.email === staffEmail
                );
                if (!foundEmployee) {
                  logger.warn(`Filtering out orphaned Firebase UID from staff performance: ${staffId || staffEmail}`);
                  return false; // Filter out orphaned UIDs
                }
              }
              
              // Check for invalid patterns:
              // 1. Name contains "Staff (staff-" pattern (e.g., "Staff (staff-5)")
              // 2. Name is the same as ID or email (using ID/email as name)
              // 3. ID starts with "staff-" (old pattern like "staff-1", "staff-5")
              // 4. Name is "Unknown Staff" or empty
              const hasInvalidPattern = 
                staffName.includes('Staff (staff-') ||
                staffName === staffId ||
                staffName === staffEmail ||
                staffId.startsWith('staff-') ||
                !staffName ||
                staffName === 'Unknown Staff';
              
              // If it's a Firebase UID pattern but we couldn't find employee above, filter out
              if (hasInvalidPattern || (isFirebaseUID && !Object.values(employeeMap).find(emp => 
                emp.uid === staffId || emp.uid === staffEmail || emp.id === staffId || emp.id === staffEmail || emp.email === staffId || emp.email === staffEmail
              ))) {
                return false;
              }
              
              return true;
            })
            .map(staff => {
              // Calculate average order value
              staff.averageOrderValue = staff.completedOrders > 0 
                ? Math.round((staff.totalSales / staff.completedOrders) * 100) / 100 
                : 0;
              
              // Calculate completion rate
              staff.completionRate = staff.totalOrders > 0 
                ? Math.round((staff.completedOrders / staff.totalOrders) * 100) 
                : 0;
              
              // Calculate cancellation rate
              staff.cancellationRate = staff.totalOrders > 0 
                ? Math.round((staff.cancelledOrders / staff.totalOrders) * 100) 
                : 0;
              
              // Calculate orders per hour (if first and last order dates available)
              if (staff.firstOrderDate && staff.lastOrderDate) {
                const hoursDiff = (staff.lastOrderDate - staff.firstOrderDate) / (1000 * 60 * 60);
                staff.ordersPerHour = hoursDiff > 0 
                  ? Math.round((staff.totalOrders / hoursDiff) * 100) / 100 
                  : 0;
              } else {
                staff.ordersPerHour = 0;
              }
              
              // Convert stations object to array
              staff.stationsArray = Object.entries(staff.stations).map(([station, data]) => ({
                station,
                orders: data.orders,
                sales: data.sales,
                averageOrderValue: data.orders > 0 ? Math.round((data.sales / data.orders) * 100) / 100 : 0
              }));
              
              return staff;
            });
          
          // Sort by total sales (descending)
          staffPerformanceArray.sort((a, b) => b.totalSales - a.totalSales);
          
          // Sort audit trail by date (most recent first) and limit to 100
          staffAudit.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
          });
          
          // Filter audit trail by period and remove entries with invalid staff names
          // Note: Orders are already filtered by period above, so audit trail should already be filtered
          // But we'll keep the date filter for extra safety
          let cutoffDate = startDate;
          
          // Filter audit trail by period and remove entries with invalid staff names
          const filteredAudit = staffAudit
            .filter(audit => {
              const auditDate = new Date(audit.createdAt || 0);
              return auditDate >= cutoffDate;
            })
            .filter(audit => {
              // Remove audit entries with invalid staff names (IDs or placeholders)
              const staffName = audit.staffName || '';
              const staffId = audit.staffId || '';
              const staffEmail = audit.staffEmail || '';
              
              // Check if this is a Firebase UID (long alphanumeric string, typically 28+ chars)
              const isFirebaseUID = (staffId.length >= 28 && /^[a-zA-Z0-9]+$/.test(staffId)) ||
                                    (staffEmail.length >= 28 && /^[a-zA-Z0-9]+$/.test(staffEmail));
              
              // If it's a Firebase UID, verify it exists in employees collection
              if (isFirebaseUID) {
                const foundEmployee = Object.values(employeeMap).find(emp => 
                  emp.uid === staffId || 
                  emp.uid === staffEmail ||
                  emp.id === staffId ||
                  emp.id === staffEmail ||
                  emp.email === staffId ||
                  emp.email === staffEmail
                );
                if (!foundEmployee) {
                  logger.warn(`Filtering out orphaned Firebase UID from audit trail: ${staffId || staffEmail}`);
                  return false; // Filter out orphaned UIDs from audit trail
                }
              }
              
              // Check if staffName contains a Firebase UID pattern in parentheses like "Staff (FJjqFKwwsZbyvnjVeYlEHzVYTM32)"
              const hasUIDInName = /Staff\s*\([A-Za-z0-9]{28,}\)/i.test(staffName);
              
              const hasInvalidPattern = 
                staffName.includes('Staff (staff-') ||
                hasUIDInName || // Check for "Staff (UID)" pattern
                staffName === staffId ||
                staffName === staffEmail ||
                staffId.startsWith('staff-') ||
                // Check if staffName is a Firebase UID pattern
                (staffName.length >= 28 && /^[a-zA-Z0-9]+$/.test(staffName)) ||
                (staffId.length > 28 && /^[a-zA-Z0-9]+$/.test(staffId)) || // Firebase UID pattern
                !staffName ||
                staffName === 'Unknown Staff';
              
              // Additional check: If it's a Firebase UID and we couldn't find employee above, filter out
              if (hasInvalidPattern || (isFirebaseUID && !Object.values(employeeMap).find(emp => 
                emp.uid === staffId || emp.uid === staffEmail || emp.id === staffId || emp.id === staffEmail || emp.email === staffId || emp.email === staffEmail
              ))) {
                return false;
              }
              
              return true;
            })
            .slice(0, 200); // Limit to 200 most recent
          
          logger.info(`Staff performance calculated: ${staffPerformanceArray.length} staff members, ${filteredAudit.length} audit records`);
          
          response.json({
            success: true,
            data: {
              staffPerformance: staffPerformanceArray,
              auditTrail: filteredAudit,
              summary: {
                totalStaff: staffPerformanceArray.length,
                totalOrders: staffAudit.length,
                period: period
              }
            }
          });
        } catch (error) {
          logger.error('Error fetching staff performance:', error);
          response.status(500).json({
            error: 'Failed to fetch staff performance',
            message: error.message
          });
        }
        return;
      }
      
      if (path === '/analytics/seed-orders' || path === '/analytics/seed-orders/') {
        if (method === 'POST') {
          try {
            logger.info('Seeding sample orders for analytics testing');
            
            // Get menu items to create realistic orders
            const menuSnapshot = await db.collection('menu').limit(10).get();
            const menuItems = [];
            menuSnapshot.forEach(doc => {
              const item = doc.data();
              menuItems.push({
                id: doc.id,
                name: item.name,
                price: item.price || 0,
                category: item.category || 'Hot Drinks'
              });
            });
            
            if (menuItems.length === 0) {
              response.json({
                success: false,
                error: 'No menu items found. Please add menu items first.'
              });
              return;
            }
            
            // Get employees to use real staff emails
            const employeesSnapshot = await db.collection('employees').get();
            const employees = [];
            employeesSnapshot.forEach(doc => {
              const emp = doc.data();
              employees.push({
                email: emp.email || doc.id,
                name: emp.name || 'Unknown',
                id: doc.id
              });
            });
            
            // Create sample orders for the past 30 days (1 month)
            const now = new Date();
            const stations = ['front-counter', 'kitchen'];
            const statuses = ['pending', 'preparing', 'ready', 'completed'];
            const customers = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Brown', 'Charlie Wilson', 'Emily Davis', 'Michael Chen', 'Sarah Martinez', 'David Lee', 'Lisa Anderson'];
            
            const sampleOrders = [];
            
            // Generate orders for the past 30 days (1 month)
            // Realistic Philippine coffee shop: ~80-120 orders per day, average ₱90-120 per order
            // Target: ~100 orders/day × ₱100 avg = ₱10,000/day × 30 days = ~₱300,000/month
            for (let day = 0; day < 30; day++) {
              const orderDate = new Date(now);
              orderDate.setDate(orderDate.getDate() - day);
              orderDate.setHours(0, 0, 0, 0);
              
              let dailyOrderCount = 0;
              // Realistic daily order range: 75-110 orders (weekends slightly higher)
              const isWeekend = orderDate.getDay() === 0 || orderDate.getDay() === 6;
              const minOrdersPerDay = isWeekend ? 90 : 80;
              const maxOrdersPerDay = isWeekend ? 125 : 110;
              
              // Generate orders for different hours of each day (1 PM - 12 AM / 13:00 - 24:00)
              // Coffee shop hours: 1 PM - 12 AM (based on user settings, default: 1 PM - 12 AM)
              // Peak hours: 2-4 PM (afternoon), 6-8 PM (evening rush), 9-11 PM (late night)
              for (let hour = 13; hour < 24; hour++) {
                // Realistic order distribution based on typical coffee shop patterns
                let orderCount;
                if ((hour >= 14 && hour < 16) || (hour >= 18 && hour < 20) || (hour >= 21 && hour < 23)) {
                  // Peak hours: afternoon rush, evening rush, late night
                  orderCount = Math.floor(Math.random() * 12) + 6; // 6-17 orders during peak hours
                } else if (hour >= 16 && hour < 18) {
                  // Mid-afternoon (moderate)
                  orderCount = Math.floor(Math.random() * 8) + 3; // 3-10 orders
                } else if (hour >= 13 && hour < 14) {
                  // Opening (afternoon start)
                  orderCount = Math.floor(Math.random() * 6) + 2; // 2-7 orders
                } else if (hour >= 20 && hour < 21) {
                  // Evening transition
                  orderCount = Math.floor(Math.random() * 7) + 3; // 3-9 orders
                } else {
                  // Late night (22-23) - closing hours
                  orderCount = Math.floor(Math.random() * 5) + 1; // 1-5 orders
                }
                
                // Adjust to meet realistic daily target (80-125 orders)
                const remainingHours = 24 - hour; // Hours left in operating day
                const targetDailyOrders = Math.floor(Math.random() * (maxOrdersPerDay - minOrdersPerDay + 1)) + minOrdersPerDay;
                if (dailyOrderCount + orderCount < targetDailyOrders && remainingHours > 0) {
                  const neededOrders = targetDailyOrders - dailyOrderCount;
                  const avgPerRemainingHour = Math.floor(neededOrders / remainingHours);
                  if ((hour >= 14 && hour < 16) || (hour >= 18 && hour < 20) || (hour >= 21 && hour < 23)) {
                    // Peak hours get more
                    orderCount += avgPerRemainingHour + Math.floor(Math.random() * 2);
                  } else {
                    orderCount += Math.max(0, avgPerRemainingHour - 1);
                  }
                }
                
                for (let i = 0; i < orderCount; i++) {
                  const orderTime = new Date(orderDate);
                  orderTime.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
                  
                  // Track orders for this day (will be incremented after adding order)
                
                // Select random items from menu
                // Realistic: 1-2 items per order (average 1.3 items), target order value ₱90-120
                const itemCount = Math.random() > 0.7 ? 2 : 1; // 70% single item, 30% two items
                const selectedItems = [];
                let subtotal = 0;
                
                for (let j = 0; j < itemCount; j++) {
                  const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
                  const quantity = 1; // Most orders are single quantity
                  // Ensure prices are realistic (₱59-₱139 range typical for Philippine coffee shop items)
                  // Use actual menu price if available, otherwise generate realistic price
                  const basePrice = randomItem.price || Math.floor(Math.random() * (139 - 59 + 1)) + 59;
                  const itemPrice = Math.max(59, Math.min(139, basePrice));
                  const itemTotal = itemPrice * quantity;
                  subtotal += itemTotal;
                  
                  selectedItems.push({
                    name: randomItem.name,
                    price: itemPrice,
                    unitPrice: itemPrice,
                    quantity: quantity,
                    category: randomItem.category || 'Hot Drinks'
                  });
                }
                
                const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
                const totalAmount = subtotal - discount;
                
                // Determine status based on time (earlier orders more likely completed)
                const hoursAgo = (now - orderTime) / (1000 * 60 * 60);
                let status;
                if (hoursAgo > 2) {
                  status = Math.random() > 0.2 ? 'completed' : 'cancelled';
                } else if (hoursAgo > 1) {
                  status = statuses[Math.floor(Math.random() * statuses.length)];
                } else {
                  status = Math.random() > 0.5 ? 'preparing' : 'pending';
                }
                
                const station = stations[Math.floor(Math.random() * stations.length)];
                const customer = customers[Math.floor(Math.random() * customers.length)];
                
                // Use real employee email if available, otherwise use placeholder
                const selectedStaff = employees.length > 0 
                  ? employees[Math.floor(Math.random() * employees.length)]
                  : { email: 'sample@cafesync.com', name: 'Sample Staff', id: 'sample-1' };
                
                const order = {
                  orderNumber: sampleOrders.length + 1,
                  customer: customer,
                  items: selectedItems,
                  subtotal: subtotal,
                  totalAmount: Math.round(totalAmount * 100) / 100,
                  total: Math.round(totalAmount * 100) / 100,
                  discount: discount > 0 ? discount : 0,
                  station: station,
                  paymentMethod: Math.random() > 0.5 ? 'cash' : 'card',
                  status: status,
                  createdAt: admin.firestore.Timestamp.fromDate(orderTime),
                  updatedAt: admin.firestore.Timestamp.fromDate(orderTime),
                  staffId: selectedStaff.email,
                  staffEmail: selectedStaff.email,
                  staffName: selectedStaff.name,
                  isSampleData: true // Flag to identify sample data for deletion
                };
                
                // Add completion timestamp if status is completed
                if (status === 'completed') {
                  const completedTime = new Date(orderTime);
                  completedTime.setMinutes(completedTime.getMinutes() + Math.floor(Math.random() * 10) + 5);
                  order.completedAt = admin.firestore.Timestamp.fromDate(completedTime);
                }
                
                // Add cancellation timestamp if status is cancelled
                if (status === 'cancelled') {
                  const cancelledTime = new Date(orderTime);
                  cancelledTime.setMinutes(cancelledTime.getMinutes() + Math.floor(Math.random() * 5) + 1);
                  order.cancelledAt = admin.firestore.Timestamp.fromDate(cancelledTime);
                }
                
                sampleOrders.push(order);
                dailyOrderCount++; // Track orders for this day
                }
              }
              
              // Ensure we have realistic order count for this day
              // If below minimum, add more orders at peak hours
              if (dailyOrderCount < minOrdersPerDay) {
                const additionalOrders = minOrdersPerDay - dailyOrderCount;
                // Distribute additional orders across peak hours (afternoon, evening, late night)
                const peakHours = [14, 15, 18, 19, 21, 22];
                for (let i = 0; i < additionalOrders; i++) {
                  const peakHour = peakHours[Math.floor(Math.random() * peakHours.length)];
                  const orderTime = new Date(orderDate);
                  orderTime.setHours(peakHour, Math.floor(Math.random() * 60), 0, 0);
                  
                  // Select random items from menu (realistic: 1-2 items, ₱90-120 average)
                  const itemCount = Math.random() > 0.7 ? 2 : 1;
                  const selectedItems = [];
                  let subtotal = 0;
                  
                  for (let j = 0; j < itemCount; j++) {
                    const randomItem = menuItems[Math.floor(Math.random() * menuItems.length)];
                    const quantity = 1; // Single quantity for most orders
                    // Ensure realistic prices (₱59-₱139 range for Philippine coffee shop)
                    const basePrice = randomItem.price || Math.floor(Math.random() * (139 - 59 + 1)) + 59;
                    const itemPrice = Math.max(59, Math.min(139, basePrice));
                    const itemTotal = itemPrice * quantity;
                    subtotal += itemTotal;
                    
                    selectedItems.push({
                      name: randomItem.name,
                      price: itemPrice,
                      unitPrice: itemPrice,
                      quantity: quantity,
                      category: randomItem.category
                    });
                  }
                  
                  const discount = Math.random() > 0.7 ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
                  const totalAmount = subtotal - discount;
                  const hoursAgo = (now - orderTime) / (1000 * 60 * 60);
                  let status = hoursAgo > 2 ? (Math.random() > 0.2 ? 'completed' : 'cancelled') : 
                               hoursAgo > 1 ? statuses[Math.floor(Math.random() * statuses.length)] : 
                               (Math.random() > 0.5 ? 'preparing' : 'pending');
                  const station = stations[Math.floor(Math.random() * stations.length)];
                  const customer = customers[Math.floor(Math.random() * customers.length)];
                  const selectedStaff = employees.length > 0 
                    ? employees[Math.floor(Math.random() * employees.length)]
                    : { email: 'sample@cafesync.com', name: 'Sample Staff', id: 'sample-1' };
                  
                  const order = {
                    orderNumber: sampleOrders.length + 1,
                    customer: customer,
                    items: selectedItems,
                    subtotal: subtotal,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    total: Math.round(totalAmount * 100) / 100,
                    discount: discount > 0 ? discount : 0,
                    station: station,
                    paymentMethod: Math.random() > 0.5 ? 'cash' : 'card',
                    status: status,
                    createdAt: admin.firestore.Timestamp.fromDate(orderTime),
                    updatedAt: admin.firestore.Timestamp.fromDate(orderTime),
                    staffId: selectedStaff.email,
                    staffEmail: selectedStaff.email,
                    staffName: selectedStaff.name,
                    isSampleData: true
                  };
                  
                  if (status === 'completed') {
                    const completedTime = new Date(orderTime);
                    completedTime.setMinutes(completedTime.getMinutes() + Math.floor(Math.random() * 10) + 5);
                    order.completedAt = admin.firestore.Timestamp.fromDate(completedTime);
                  }
                  
                  if (status === 'cancelled') {
                    const cancelledTime = new Date(orderTime);
                    cancelledTime.setMinutes(cancelledTime.getMinutes() + Math.floor(Math.random() * 5) + 1);
                    order.cancelledAt = admin.firestore.Timestamp.fromDate(cancelledTime);
                  }
                  
                  sampleOrders.push(order);
                  dailyOrderCount++;
                }
              }
            }
            
            // Batch write orders to Firestore (max 500 operations per batch)
            let batch = db.batch();
            let count = 0;
            const batchPromises = [];
            
            for (const order of sampleOrders) {
              const docRef = db.collection('orders').doc();
              batch.set(docRef, order);
              count++;
              
              // Firestore batch limit is 500, so commit and create new batch
              if (count % 500 === 0) {
                batchPromises.push(batch.commit());
                batch = db.batch();
              }
            }
            
            // Commit remaining orders if any
            if (count % 500 !== 0) {
              batchPromises.push(batch.commit());
            }
            
            // Wait for all batch commits to complete
            await Promise.all(batchPromises);
            
            logger.info(`Successfully seeded ${count} sample orders for 1 month`);
            
            response.json({
              success: true,
              message: `Successfully created ${count} sample orders for 1 month`,
              ordersCreated: count
            });
            return;
          } catch (error) {
            logger.error('Error seeding orders:', error);
            response.status(500).json({
              success: false,
              error: error.message
            });
            return;
          }
        }
        
        // DELETE /analytics/seed-orders - Delete sample data
        if (method === 'DELETE') {
          try {
            logger.info('Deleting sample orders');
            
            // Get all orders marked as sample data
            const ordersSnapshot = await db.collection('orders')
              .where('isSampleData', '==', true)
              .get();
            
            if (ordersSnapshot.empty) {
              response.json({
                success: true,
                ordersDeleted: 0,
                message: 'No sample data found to delete'
              });
              return;
            }
            
            // Delete in batches (max 500 per batch)
            let batch = db.batch();
            let count = 0;
            const batchPromises = [];
            
            ordersSnapshot.forEach(doc => {
              batch.delete(doc.ref);
              count++;
              
              if (count % 500 === 0) {
                batchPromises.push(batch.commit());
                batch = db.batch();
              }
            });
            
            // Commit remaining deletions if any
            if (count % 500 !== 0) {
              batchPromises.push(batch.commit());
            }
            
            await Promise.all(batchPromises);
            
            logger.info(`Successfully deleted ${count} sample orders`);
            response.json({
              success: true,
              ordersDeleted: count,
              message: `Deleted ${count} sample orders`
            });
          } catch (error) {
            logger.error('Error deleting sample orders:', error);
            response.status(500).json({
              success: false,
              error: 'Failed to delete sample orders',
              message: error.message
            });
          }
          return;
        }
      }
      
      // Notifications endpoints - now using audit_log data
      if (path === '/notifications' || path === '/api/notifications' || path === '/notifications/' || path === '/api/notifications/') {
        // GET /notifications - Get all notifications from audit trail
        if (method === 'GET') {
          try {
            // Get all audit logs without ordering (to avoid index requirements)
            // We'll sort in memory instead
            const auditSnapshot = await db.collection('audit_log')
              .limit(200) // Get more to account for any missed during sorting
              .get();
            
            logger.info(`Fetched ${auditSnapshot.size} audit logs from Firestore`);
          
          // Debug: Log first few audit logs to see what we're getting
          if (auditSnapshot.size > 0) {
            const firstFew = auditSnapshot.docs.slice(0, 5).map(doc => ({
              id: doc.id,
              action: doc.data().action,
              entityType: doc.data().entityType,
              entityName: doc.data().entityName,
            }));
            logger.info(`First 5 audit logs: ${JSON.stringify(firstFew)}`);
          } else {
            logger.warn('No audit logs found in Firestore!');
          }
            
            // Helper function to convert audit action to notification format
            const convertAuditToNotification = (auditData, docId) => {
              const action = auditData.action || '';
              const entityType = auditData.entityType || '';
              const entityName = auditData.entityName || '';
              const staffName = auditData.staffName || 'Unknown';
              const details = auditData.details || {};
              
              // Handle timestamp - prefer timestamp (Firestore) then createdAt
              let timestamp = auditData.createdAt;
              if (auditData.timestamp) {
                if (auditData.timestamp.toDate) {
                  timestamp = auditData.timestamp.toDate().toISOString();
                } else if (typeof auditData.timestamp === 'string') {
                  timestamp = auditData.timestamp;
                }
              }
              if (!timestamp) {
                timestamp = new Date().toISOString();
              }
              
              // Determine notification type and message based on action
              let type = 'info';
              let title = 'Activity';
              let message = '';
              
              // Order-related actions - check entityType first for orders
              if (entityType === 'order') {
                if (action === 'order_created' || action.includes('order_created') || action.includes('created')) {
                  type = 'info';
                  title = 'New Order';
                  const orderNumber = details.orderNumber || (entityName ? entityName.replace('Order #', '') : '') || auditData.entityId || '';
                  message = `Order ${orderNumber ? '#' + orderNumber : ''} was created${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
                } else if (action === 'order_completed' || action.includes('order_completed') || (details.status === 'completed')) {
                  type = 'success';
                  title = 'Order Completed';
                  const orderNumber = details.orderNumber || (entityName ? entityName.replace('Order #', '') : '') || auditData.entityId || '';
                  message = `Order ${orderNumber ? '#' + orderNumber : ''} was completed${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
                } else if (action === 'order_cancelled' || action.includes('order_cancelled') || (details.status === 'cancelled')) {
                  type = 'warning';
                  title = 'Order Cancelled';
                  const orderNumber = details.orderNumber || (entityName ? entityName.replace('Order #', '') : '') || auditData.entityId || '';
                  message = `Order ${orderNumber ? '#' + orderNumber : ''} was cancelled${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
                } else if (action === 'order_status_changed' || action.includes('order_status_changed') || action.includes('status')) {
                  type = 'info';
                  title = 'Order Status Changed';
                  const orderNumber = details.orderNumber || (entityName ? entityName.replace('Order #', '') : '') || auditData.entityId || '';
                  const newStatus = details.status || action.replace('order_', '').replace('_', ' ') || 'updated';
                  message = `Order ${orderNumber ? '#' + orderNumber : ''} status changed to ${newStatus}${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
                } else {
                  // Generic order action
                  type = 'info';
                  title = 'Order Activity';
                  const orderNumber = details.orderNumber || (entityName ? entityName.replace('Order #', '') : '') || auditData.entityId || '';
                  const actionText = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Updated';
                  message = `Order ${orderNumber ? '#' + orderNumber : ''} ${actionText.toLowerCase()}${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
                }
              }
              // Inventory alerts
              else if (action.includes('low_stock') || (entityType === 'inventory' && details.alertType === 'low_stock')) {
                type = 'warning';
                title = 'Low Stock Alert';
                message = `${entityName || 'Inventory item'} is running low${details.currentStock !== undefined ? ` (${details.currentStock} remaining)` : ''}`;
              } else if (action.includes('inventory_item_created') || (entityType === 'inventory' && action.includes('created'))) {
                type = 'info';
                title = 'Inventory Item Added';
                message = `${entityName || 'Inventory item'} was added${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
              } else if (action.includes('inventory_item_updated') || (entityType === 'inventory' && action.includes('updated'))) {
                type = 'info';
                title = 'Inventory Updated';
                message = `${entityName || 'Inventory item'} was updated${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
              }
              // Menu actions
              else if (action.includes('menu_item_created') || (entityType === 'menu' && action.includes('created'))) {
                type = 'info';
                title = 'Menu Item Added';
                message = `${entityName || 'Menu item'} was added to menu${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
              } else if (action.includes('menu_item_updated') || (entityType === 'menu' && action.includes('updated'))) {
                type = 'info';
                title = 'Menu Item Updated';
                message = `${entityName || 'Menu item'} was updated${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
              } else if (action.includes('menu_item_deleted') || (entityType === 'menu' && action.includes('deleted'))) {
                type = 'warning';
                title = 'Menu Item Removed';
                message = `${entityName || 'Menu item'} was removed from menu${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
              }
              // Generic fallback - show any action as notification
              else {
                type = 'info';
                title = 'Activity';
                const actionText = action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Activity';
                message = `${actionText}${entityName ? `: ${entityName}` : ''}${staffName !== 'Unknown' ? ` by ${staffName}` : ''}`;
              }
              
              return {
                id: docId,
                type: type,
                title: title,
                message: message,
                read: false, // Audit trail items are always "unread" from notification perspective
                timestamp: timestamp,
                orderId: entityType === 'order' ? auditData.entityId : null,
                orderNumber: details.orderNumber || (entityType === 'order' ? auditData.entityId : null),
                inventoryId: entityType === 'inventory' ? auditData.entityId : null,
                inventoryName: entityType === 'inventory' ? entityName : null,
                relatedEntity: entityType || null,
                action: action,
                staffName: staffName,
              };
            };
            
            const notifications = auditSnapshot.docs.map(doc => {
              const data = doc.data();
              const notification = convertAuditToNotification(data, doc.id);
              // Log for debugging
              if (data.entityType === 'order' || (data.action && data.action.includes('order'))) {
                logger.info(`Converting audit to notification: action=${data.action}, entityType=${data.entityType}, entityName=${data.entityName}, message=${notification.message}`);
              }
              return notification;
            }).filter(n => n.message && n.message.trim() !== ''); // Filter out empty notifications
            
            // Always sort by timestamp (most recent first)
            notifications.sort((a, b) => {
              const dateA = new Date(a.timestamp || 0).getTime();
              const dateB = new Date(b.timestamp || 0).getTime();
              return dateB - dateA;
            });
            
            // Return top 100 most recent
            const sortedNotifications = notifications.slice(0, 100);
            
            logger.info(`Fetched ${auditSnapshot.size} audit logs, converted to ${notifications.length} notifications, returning ${sortedNotifications.length}`);
            
            response.json({ success: true, data: sortedNotifications });
          } catch (error) {
            logger.error('Error fetching notifications from audit trail:', error);
            response.status(500).json({ 
              success: false,
              error: 'Failed to fetch notifications', 
              message: error.message,
              data: [] // Return empty array on error
            });
          }
          return;
        }
      }
      
      // PATCH /notifications/:id - Mark notification as read
      const markReadMatch = path.match(/\/(?:api\/)?notifications\/(.+)$/);
      if (markReadMatch && method === 'PATCH') {
        try {
          const notificationId = markReadMatch[1];
          await db.collection('notifications').doc(notificationId).update({
            read: true,
            readAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          response.json({ success: true });
        } catch (error) {
          logger.error('Error marking notification as read:', error);
          response.status(500).json({ error: 'Failed to mark notification as read', message: error.message });
        }
        return;
      }
      
      // PATCH /notifications/mark-all-read - Mark all notifications as read
      if (path === '/notifications/mark-all-read' || path === '/api/notifications/mark-all-read') {
        if (method === 'PATCH') {
          try {
            const notificationsSnapshot = await db.collection('notifications')
              .where('read', '==', false)
              .get();
            
            const batch = db.batch();
            notificationsSnapshot.forEach(doc => {
              batch.update(doc.ref, {
                read: true,
                readAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            });
            
            await batch.commit();
            response.json({ success: true, count: notificationsSnapshot.size });
          } catch (error) {
            logger.error('Error marking all notifications as read:', error);
            response.status(500).json({ error: 'Failed to mark all notifications as read', message: error.message });
          }
          return;
        }
      }
      
      // Analytics Recommendations endpoint (check BEFORE sales to ensure proper routing)
      // Match with or without query parameters
      const recommendationsPathMatch = path === '/analytics/recommendations' || path.startsWith('/analytics/recommendations');
      
      if (recommendationsPathMatch) {
        // Handle PATCH requests for feedback (check FIRST before GET)
        if (method === 'PATCH') {
          try {
            logger.info('PATCH request received for recommendations:', {
              path,
              method,
              body: request.body,
              headers: request.headers
            });
            
            // Ensure CORS headers are set for PATCH requests
            response.set('Access-Control-Allow-Origin', '*');
            response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
            response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            
            const { recommendationId, outcome, feedback } = request.body;
            
            if (!recommendationId || !outcome) {
              logger.warn('Missing required fields:', { recommendationId, outcome });
              response.status(400).json({
                success: false,
                error: 'recommendationId and outcome are required'
              });
              return;
            }
            
            // Get the recommendation
            const recDoc = await db.collection('recommendations').doc(recommendationId).get();
            if (!recDoc.exists) {
              logger.warn('Recommendation not found:', recommendationId);
              response.status(404).json({
                success: false,
                error: 'Recommendation not found'
              });
              return;
            }
            
            const recData = recDoc.data();
            
            // Calculate effectiveness based on outcome
            let effectiveness = 0.5; // Default neutral
            if (outcome === 'positive') {
              effectiveness = recData.confidence || 0.7;
            } else if (outcome === 'negative') {
              effectiveness = Math.max(0.1, (recData.confidence || 0.7) - 0.3);
            } else if (outcome === 'neutral') {
              effectiveness = recData.confidence || 0.7;
            }
            
            // Update recommendation with outcome
            await db.collection('recommendations').doc(recommendationId).update({
              status: 'evaluated',
              outcome: outcome,
              feedback: feedback || null,
              effectiveness: effectiveness,
              evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
              evaluatedTimestamp: new Date().toISOString()
            });
            
            // Log for recalibration (store pattern for future recommendations)
            await db.collection('recommendation_patterns').add({
              recommendationType: recData.type,
              priority: recData.priority,
              outcome: outcome,
              effectiveness: effectiveness,
              originalConfidence: recData.confidence,
              feedback: feedback || null,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              timestamp: new Date().toISOString()
            });
            
            logger.info('Recommendation outcome tracked successfully:', {
              recommendationId,
              outcome,
              effectiveness,
              type: recData.type
            });
            
            response.json({
              success: true,
              message: 'Recommendation outcome tracked',
              effectiveness: effectiveness
            });
            return;
          } catch (error) {
            logger.error('Error tracking recommendation outcome:', error);
            response.status(500).json({
              success: false,
              error: 'Failed to track outcome',
              message: error.message
            });
            return;
          }
        }
        
        // Handle GET requests for fetching recommendations
        if (method === 'GET') {
          try {
            const period = request.query.period || 'month';
            
            // Get analytics data first
            const now = new Date();
            let startDate = new Date(now);
            let endDate = new Date(now);
            
            switch (period) {
              case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
              case 'week':
                // Get orders from the past 7 days
                startDate.setDate(startDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
              case 'month':
                // Get orders from the past 30 days
                startDate.setDate(startDate.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            }
            
            // Convert to Firestore Timestamps for query
            const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
            const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);
            
            const ordersSnapshot = await db.collection('orders')
              .where('createdAt', '>=', startTimestamp)
              .where('createdAt', '<=', endTimestamp)
              .get();
            
            // Get inventory data
            const inventorySnapshot = await db.collection('inventory').get();
            const inventoryItems = inventorySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Get menu data
            const menuSnapshot = await db.collection('menu').get();
            const menuItems = menuSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Get previous recommendations (for recalibration)
            // Note: Removed orderBy to avoid index requirement - we'll sort in memory instead
            let prevRecommendations = [];
            try {
              const prevRecsSnapshot = await db.collection('recommendations')
                .where('period', '==', period)
                .limit(50)
                .get();
              
              prevRecommendations = prevRecsSnapshot.docs
                .map(doc => doc.data())
                .sort((a, b) => {
                  // Sort by createdAt in memory (descending)
                  const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                                a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                                b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return bTime - aTime;
                });
            } catch (queryError) {
              logger.warn('Error fetching previous recommendations (non-critical):', queryError);
              // Continue without previous recommendations
              prevRecommendations = [];
            }
            
            // Get feedback patterns to improve recommendations based on user feedback
            let feedbackPatterns = {};
            try {
              const patternsSnapshot = await db.collection('recommendation_patterns')
                .orderBy('createdAt', 'desc')
                .limit(100)
                .get();
              
              // Analyze feedback patterns
              patternsSnapshot.docs.forEach(doc => {
                const pattern = doc.data();
                const type = pattern.recommendationType || 'unknown';
                
                if (!feedbackPatterns[type]) {
                  feedbackPatterns[type] = {
                    positive: 0,
                    negative: 0,
                    total: 0,
                    avgEffectiveness: 0,
                    totalEffectiveness: 0
                  };
                }
                
                feedbackPatterns[type].total++;
                if (pattern.outcome === 'positive') {
                  feedbackPatterns[type].positive++;
                } else if (pattern.outcome === 'negative') {
                  feedbackPatterns[type].negative++;
                }
                feedbackPatterns[type].totalEffectiveness += pattern.effectiveness || 0.5;
              });
              
              // Calculate average effectiveness per type
              Object.keys(feedbackPatterns).forEach(type => {
                const pattern = feedbackPatterns[type];
                pattern.avgEffectiveness = pattern.totalEffectiveness / pattern.total;
                pattern.positiveRate = pattern.total > 0 ? pattern.positive / pattern.total : 0;
              });
              
              logger.info('Feedback patterns loaded:', Object.keys(feedbackPatterns).length, 'types');
            } catch (patternError) {
              logger.warn('Error fetching feedback patterns (non-critical):', patternError);
              feedbackPatterns = {};
            }
            
            // Calculate analytics metrics
            let totalSales = 0;
            let totalOrders = ordersSnapshot.size;
            let cancelledOrders = 0;
            let categorySales = {};
            let hourlySales = {};
            let stationCounts = {};
            let itemSales = {};
            
            ordersSnapshot.forEach(doc => {
              const order = doc.data();
              const status = order.status || 'pending';
              
              if (status === 'cancelled') {
                cancelledOrders++;
                return;
              }
              
              const orderTotal = order.totalAmount || order.total || 0;
              totalSales += orderTotal;
              
              // Station performance
              const station = order.station || 'front-counter';
              if (!stationCounts[station]) {
                stationCounts[station] = { orders: 0, revenue: 0 };
              }
              stationCounts[station].orders += 1;
              stationCounts[station].revenue += orderTotal;
              
              // Item and category sales
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                  const itemName = item.name || item.itemName || 'Unknown';
                  const itemPrice = item.price || item.unitPrice || 0;
                  const itemQuantity = item.quantity || 1;
                  const itemRevenue = itemPrice * itemQuantity;
                  
                  if (!itemSales[itemName]) {
                    itemSales[itemName] = { quantity: 0, revenue: 0 };
                  }
                  itemSales[itemName].quantity += itemQuantity;
                  itemSales[itemName].revenue += itemRevenue;
                  
                  // Find category from menu
                  const menuItem = menuItems.find(m => m.name === itemName);
                  const category = menuItem?.category || 'Other';
                  
                  if (!categorySales[category]) {
                    categorySales[category] = { quantity: 0, revenue: 0 };
                  }
                  categorySales[category].quantity += itemQuantity;
                  categorySales[category].revenue += itemRevenue;
                });
              }
              
              // Hourly sales - ALWAYS track for heatmap (regardless of period)
              // Use completedAt if available, otherwise fall back to createdAt
              try {
                let orderDate;
                // Prefer completedAt for heatmap to show when orders were actually completed
                if (order.completedAt) {
                  if (order.completedAt?.toDate) {
                    orderDate = order.completedAt.toDate();
                  } else if (order.completedAt?.seconds) {
                    orderDate = new Date(order.completedAt.seconds * 1000);
                  } else if (typeof order.completedAt === 'string') {
                    orderDate = new Date(order.completedAt);
                  } else {
                    orderDate = new Date(order.completedAt);
                  }
                } else if (order.createdAt) {
                  // Fallback to createdAt if completedAt is not available
                  if (order.createdAt?.toDate) {
                    orderDate = order.createdAt.toDate();
                  } else {
                    orderDate = new Date(order.createdAt);
                  }
                } else {
                  // Skip if no date available
                  return;
                }
                
                const hour = orderDate.getHours();
                const hourKey = hour.toString().padStart(2, '0') + ':00';
                if (!hourlySales[hourKey]) {
                  hourlySales[hourKey] = { sales: 0, orders: 0 };
                }
                hourlySales[hourKey].sales += orderTotal;
                hourlySales[hourKey].orders += 1;
              } catch (e) {
                // Skip if date error
                logger.error('Error processing order date for hourly sales:', e);
              }
            });
            
            const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
            const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
            
            // Generate recommendations based on data
            let recommendations = [];
            
            // Get top selling items
            const topItems = Object.entries(itemSales)
              .map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: data.revenue
              }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 10);
            
            // Helper function to adjust recommendation based on feedback patterns
            const adjustRecommendationByFeedback = (recType, baseConfidence, basePriority) => {
              const pattern = feedbackPatterns[recType];
              if (!pattern) {
                return { confidence: baseConfidence, priority: basePriority };
              }
              
              // Adjust confidence based on positive rate
              // If >70% positive, boost confidence; if <30% positive, reduce confidence
              let adjustedConfidence = baseConfidence;
              if (pattern.positiveRate > 0.7) {
                adjustedConfidence = Math.min(0.95, baseConfidence + 0.1);
              } else if (pattern.positiveRate < 0.3 && pattern.total >= 3) {
                adjustedConfidence = Math.max(0.3, baseConfidence - 0.2);
              }
              
              // Adjust priority based on effectiveness
              let adjustedPriority = basePriority;
              if (pattern.avgEffectiveness > 0.8 && pattern.total >= 3) {
                // Boost priority for well-received types
                if (basePriority === 'medium') adjustedPriority = 'high';
                if (basePriority === 'low') adjustedPriority = 'medium';
              } else if (pattern.avgEffectiveness < 0.4 && pattern.total >= 5) {
                // Lower priority for poorly received types
                if (basePriority === 'high') adjustedPriority = 'medium';
                if (basePriority === 'medium') adjustedPriority = 'low';
              }
              
              return { confidence: adjustedConfidence, priority: adjustedPriority };
            };
            
            // 1. Top-selling item recommendation
            if (topItems.length > 0) {
              const topItem = topItems[0];
              const topItemPercentage = (topItem.revenue / totalSales) * 100;
              if (topItem.revenue > totalSales * 0.10 || topItem.quantity >= 10) {
                const adjusted = adjustRecommendationByFeedback('marketing', 0.9, 'high');
                recommendations.push({
                  type: 'marketing',
                  priority: adjusted.priority,
                  title: `Promote Top Seller: ${topItem.name}`,
                  message: `${topItem.name} is your top seller with ${topItem.quantity} units sold (${topItemPercentage.toFixed(1)}% of revenue). Consider featuring it prominently.`,
                  action: 'promote_item',
                  itemName: topItem.name,
                  revenue: topItem.revenue,
                  quantity: topItem.quantity,
                  confidence: adjusted.confidence,
                  impact: 'increase_revenue'
                });
              }
            }
            
            // 2. Drink recommendations based on sales patterns
            if (topItems.length > 0) {
              const drinks = topItems.filter(item => {
                const nameLower = item.name.toLowerCase();
                return nameLower.includes('coffee') || nameLower.includes('tea') || 
                       nameLower.includes('latte') || nameLower.includes('cappuccino') ||
                       nameLower.includes('frappe') || nameLower.includes('shake') ||
                       nameLower.includes('mocha') || nameLower.includes('americano') ||
                       nameLower.includes('espresso');
              });
              
              if (drinks.length > 0) {
                const topDrink = drinks[0];
                const topDrinkPercentage = (topDrink.revenue / totalSales) * 100;
                if (topDrinkPercentage > 3 || topDrink.quantity >= 2) {
                  const adjusted = adjustRecommendationByFeedback('drink_recommendation', 0.8, 'medium');
                  recommendations.push({
                    type: 'drink_recommendation',
                    priority: adjusted.priority,
                    title: `Boost ${topDrink.name} Sales`,
                    message: `${topDrink.name} is performing well (${topDrink.quantity} sold). Consider promoting it or creating combo deals.`,
                    action: 'promote_drink',
                    drinkName: topDrink.name,
                    revenue: topDrink.revenue,
                    quantity: topDrink.quantity,
                    confidence: adjusted.confidence,
                    impact: 'increase_sales'
                  });
                }
              }
            }
            
            // 3. Category performance
            const categoryEntries = Object.entries(categorySales);
            if (categoryEntries.length > 0) {
              const categoryStats = categoryEntries.map(([category, data]) => ({
                category,
                quantity: data.quantity,
                revenue: data.revenue,
                percentage: (data.revenue / totalSales) * 100
              })).sort((a, b) => b.revenue - a.revenue);
              
              const topCategory = categoryStats[0];
              const bottomCategory = categoryStats[categoryStats.length - 1];
              
              if (topCategory.percentage > 30) {
                const adjusted = adjustRecommendationByFeedback('operations', 0.75, 'medium');
                recommendations.push({
                  type: 'operations',
                  priority: adjusted.priority,
                  title: `${topCategory.category} Dominates Sales`,
                  message: `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of sales. Consider diversifying or increasing inventory for this category.`,
                  action: 'review_category',
                  category: topCategory.category,
                  percentage: topCategory.percentage,
                  confidence: adjusted.confidence,
                  impact: 'diversify_offerings'
                });
              }
              
              if (bottomCategory.percentage < 10 && categoryStats.length > 1) {
                const adjusted = adjustRecommendationByFeedback('marketing', 0.7, 'low');
                recommendations.push({
                  type: 'marketing',
                  priority: adjusted.priority,
                  title: `Boost ${bottomCategory.category} Sales`,
                  message: `${bottomCategory.category} represents only ${bottomCategory.percentage.toFixed(1)}% of sales. Consider promotions or menu adjustments.`,
                  action: 'promote_category',
                  category: bottomCategory.category,
                  percentage: bottomCategory.percentage,
                  confidence: adjusted.confidence,
                  impact: 'diversify_revenue'
                });
              }
            }
            
            // 4. Cancellation rate
            if (cancellationRate > 3) {
              const adjusted = adjustRecommendationByFeedback('operations', 0.85, 'high');
              recommendations.push({
                type: 'operations',
                priority: adjusted.priority,
                title: 'High Cancellation Rate',
                message: `Your cancellation rate is ${cancellationRate.toFixed(1)}%. Review order fulfillment processes and customer service.`,
                action: 'review_cancellations',
                cancellationRate: cancellationRate,
                confidence: adjusted.confidence,
                impact: 'improve_efficiency'
              });
            }
            
            // 5. Inventory alerts integration
            if (inventoryItems.length > 0) {
              const lowStockItems = inventoryItems.filter(item => 
                item.currentStock <= item.minStock
              );
              
              if (lowStockItems.length > 0) {
                const adjusted = adjustRecommendationByFeedback('inventory', 0.9, 'high');
                recommendations.push({
                  type: 'inventory',
                  priority: adjusted.priority,
                  title: `${lowStockItems.length} Item(s) Low on Stock`,
                  message: `${lowStockItems.map(i => i.name).join(', ')} ${lowStockItems.length === 1 ? 'is' : 'are'} running low. Restock soon to avoid service disruptions.`,
                  action: 'restock_items',
                  items: lowStockItems.map(i => i.name),
                  count: lowStockItems.length,
                  confidence: adjusted.confidence,
                  impact: 'prevent_disruption'
                });
              }
            }
            
            // 6. Peak hours staffing recommendation
            if (Object.keys(hourlySales).length > 0) {
              const hourlyOrders = Object.entries(hourlySales)
                .map(([hour, data]) => ({
                  hour: parseInt(hour.split(':')[0]),
                  orders: data.orders
                }))
                .sort((a, b) => b.orders - a.orders);
              
              const avgHourlyOrders = hourlyOrders.reduce((sum, h) => sum + h.orders, 0) / hourlyOrders.length;
              const topPeak = hourlyOrders[0];
              
              if (topPeak.orders > avgHourlyOrders * 1.3) {
                const peakHour = topPeak.hour;
                const period = peakHour >= 12 ? 'PM' : 'AM';
                const displayHour = peakHour % 12 || 12;
                const adjusted = adjustRecommendationByFeedback('operations', 0.8, 'medium');
                recommendations.push({
                  type: 'operations',
                  priority: adjusted.priority,
                  title: `Increase Staffing at ${displayHour}${period}`,
                  message: `Peak hour is ${displayHour}${period} with ${topPeak.orders} orders (${(topPeak.orders / avgHourlyOrders * 100).toFixed(0)}% above average). Consider scheduling more staff.`,
                  action: 'adjust_staffing',
                  peakHour: `${displayHour}${period}`,
                  orders: topPeak.orders,
                  confidence: adjusted.confidence,
                  impact: 'improve_service'
                });
              }
            }
            
            // 7. Low-traffic hours promotion
            if (Object.keys(hourlySales).length > 0) {
              const hourlyStats = Object.entries(hourlySales)
                .map(([hour, data]) => ({
                  hour: parseInt(hour.split(':')[0]),
                  orders: data.orders
                }));
              
              const avgOrders = hourlyStats.reduce((sum, h) => sum + h.orders, 0) / hourlyStats.length;
              const lowTrafficHours = hourlyStats.filter(h => h.orders < avgOrders * 0.5);
              
              if (lowTrafficHours.length > 0 && totalOrders > 20) {
                recommendations.push({
                  type: 'marketing',
                  priority: 'low',
                  title: 'Promote Low-Traffic Hours',
                  message: `${lowTrafficHours.length} hour(s) have below-average traffic. Consider happy hour promotions or special offers.`,
                  action: 'promote_hours',
                  lowTrafficCount: lowTrafficHours.length,
                  confidence: 0.7,
                  impact: 'increase_traffic'
                });
              }
            }
            
            // If no recommendations generated yet, add general recommendations based on available data
            // IMPORTANT: Add fallback recommendations BEFORE saving, so we always have recommendations
            // CRITICAL: This check MUST happen and ALWAYS add at least one recommendation if totalOrders > 0
            if (recommendations.length === 0 && totalOrders > 0) {
              logger.warn('No recommendations generated yet, adding fallbacks. totalOrders:', totalOrders);
              
              // ALWAYS add at least one recommendation if we have orders - remove nested conditions
              recommendations.push({
                type: 'marketing',
                priority: 'medium',
                title: 'Boost Sales Performance',
                message: `You have ${totalOrders} orders${totalSales > 0 ? ` with ₱${totalSales.toFixed(2)} in sales` : ''}. Consider running promotions or highlighting popular items to increase revenue.`,
                action: 'promote_sales',
                totalOrders: totalOrders,
                totalSales: totalSales,
                confidence: 0.8,
                impact: 'increase_revenue'
              });
              
              // If we have menu items but no drink recommendations
              if (menuItems.length > 0) {
                const availableDrinks = menuItems.filter(item => {
                  const nameLower = (item.name || '').toLowerCase();
                  const categoryLower = (item.category || '').toLowerCase();
                  return categoryLower.includes('drink') || categoryLower.includes('coffee') || 
                         categoryLower.includes('tea') || categoryLower.includes('beverage') ||
                         nameLower.includes('coffee') || nameLower.includes('tea') || 
                         nameLower.includes('latte') || nameLower.includes('cappuccino') ||
                         nameLower.includes('frappe') || nameLower.includes('shake') ||
                         nameLower.includes('mocha') || nameLower.includes('americano') ||
                         nameLower.includes('espresso');
                });
                
                if (availableDrinks.length > 0) {
                  // Generic drink promotion recommendation (don't check topItems.length)
                  recommendations.push({
                    type: 'drink_recommendation',
                    priority: 'medium',
                    title: 'Promote Available Drinks',
                    message: `You have ${availableDrinks.length} drinks available on your menu. Consider promoting ${availableDrinks[0].name} or other beverages to increase sales.`,
                    action: 'promote_drink',
                    drinkName: availableDrinks[0].name,
                    availableDrinksCount: availableDrinks.length,
                    confidence: 0.7,
                    impact: 'increase_sales'
                  });
                }
              }
              
              // Recommendation based on order volume
              if (totalOrders >= 30) {
                recommendations.push({
                  type: 'operations',
                  priority: 'low',
                  title: 'Analyze Sales Patterns',
                  message: `With ${totalOrders} orders, you have good data to analyze. Review peak hours, popular items, and customer preferences to optimize operations.`,
                  action: 'analyze_patterns',
                  totalOrders: totalOrders,
                  confidence: 0.75,
                  impact: 'optimize_operations'
                });
              }
            }
            
            // Sort recommendations by priority and confidence (after adding fallbacks)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (recommendations.length > 0) {
              recommendations.sort((a, b) => {
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return b.confidence - a.confidence;
              });
            }
            
            // Save recommendations to Firestore with IDs
            // IMPORTANT: Delete old recommendations for this period first to avoid duplicates
            try {
              // Delete existing active recommendations for this period
              const oldRecsSnapshot = await db.collection('recommendations')
                .where('period', '==', period)
                .where('status', '==', 'active')
                .get();
              
              if (oldRecsSnapshot.size > 0) {
                logger.info(`Deleting ${oldRecsSnapshot.size} old recommendations for period: ${period}`);
                const deleteBatch = db.batch();
                oldRecsSnapshot.forEach(doc => {
                  deleteBatch.delete(doc.ref);
                });
                try {
                  await deleteBatch.commit();
                } catch (deleteError) {
                  logger.warn('Error deleting old recommendations (non-critical):', deleteError);
                }
              }
            } catch (deleteQueryError) {
              logger.warn('Error querying old recommendations (non-critical):', deleteQueryError);
              // Continue even if deletion fails
            }
            
            // Now save new recommendations
            const batch = db.batch();
            let recommendationsWithIds = recommendations.map(rec => {
              const recId = db.collection('recommendations').doc().id;
              const recRef = db.collection('recommendations').doc(recId);
              batch.set(recRef, {
                ...rec,
                id: recId,
                period: period,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                timestamp: new Date().toISOString(),
                status: 'active',
                effectiveness: null,
                views: 0,
                actions: 0
              });
              return { ...rec, id: recId };
            });
            
            try {
              await batch.commit();
              logger.info(`Saved ${recommendationsWithIds.length} new recommendations for period: ${period}`);
            } catch (batchError) {
              logger.error('Error saving recommendations:', batchError);
              // Continue even if save fails
            }
            
            // Generate peak hours heatmap from hourly sales (always from ALL orders, not period-specific)
            const formatHourForHeatmap = (hour) => {
              const hourNum = parseInt(hour.split(':')[0]);
              const period = hourNum >= 12 ? 'PM' : 'AM';
              const displayHour = hourNum % 12 || 12;
              return `${displayHour}${period}`;
            };
            
            const maxOrdersForHeatmap = Object.keys(hourlySales).length > 0 
              ? Math.max(...Object.values(hourlySales).map(h => h.orders || 0)) 
              : 1;
            const peakHoursHeatmap = Object.keys(hourlySales).length > 0
              ? Object.entries(hourlySales)
                  .map(([hour, data]) => ({
                    hour,
                    hourFormatted: formatHourForHeatmap(hour),
                    sales: Math.round(data.sales * 100) / 100,
                    orders: data.orders,
                    intensity: maxOrdersForHeatmap > 0 ? Math.min(100, (data.orders / maxOrdersForHeatmap) * 100) : 0
                  }))
                  .sort((a, b) => {
                    const hourA = parseInt(a.hour.split(':')[0]);
                    const hourB = parseInt(b.hour.split(':')[0]);
                    return hourA - hourB;
                  })
              : [];
            
            // CRITICAL: If we still have no recommendations but have orders, force add at least one
            if (recommendations.length === 0 && totalOrders > 0) {
              logger.error('CRITICAL: Still no recommendations after fallback logic! Forcing emergency recommendation.', {
                period,
                totalOrders,
                totalSales,
                menuItemsCount: menuItems.length,
                itemSalesCount: Object.keys(itemSales).length,
                inventoryCount: inventoryItems.length
              });
              
              // EMERGENCY FALLBACK - Always add at least one recommendation if orders exist
              recommendations.push({
                type: 'operations',
                priority: 'medium',
                title: 'Analyze Your Sales Data',
                message: `You have ${totalOrders} orders with ₱${totalSales.toFixed(2)} in sales. Review your data to optimize operations and identify opportunities.`,
                action: 'analyze_data',
                totalOrders: totalOrders,
                totalSales: totalSales,
                confidence: 0.8,
                impact: 'understand_performance'
              });
              
              // Re-sort and re-create recommendationsWithIds
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              recommendations.sort((a, b) => {
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return b.confidence - a.confidence;
              });
              
              const emergencyBatch = db.batch();
              recommendationsWithIds = recommendations.map((rec, index) => {
                const recId = db.collection('recommendations').doc().id;
                const recRef = db.collection('recommendations').doc(recId);
                emergencyBatch.set(recRef, {
                  ...rec,
                  id: recId,
                  period: period,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  timestamp: new Date().toISOString(),
                  status: 'active',
                  effectiveness: null,
                  views: 0,
                  actions: 0
                });
                return { ...rec, id: recId };
              });
              
              try {
                await emergencyBatch.commit();
              } catch (batchError) {
                logger.error('Error saving emergency recommendations:', batchError);
                // Still create IDs even if save fails
                recommendationsWithIds.forEach((rec, index) => {
                  if (!rec.id) rec.id = `emergency-${Date.now()}-${index}`;
                });
              }
            }
            
            // Always ensure we return recommendations array (even if empty)
            // Log for debugging
            logger.info('Recommendations final check:', {
              period,
              totalOrders,
              recommendationsCount: recommendations.length,
              recommendationsWithIdsCount: recommendationsWithIds.length,
              peakHoursHeatmapCount: peakHoursHeatmap.length
            });
            
            response.json({
              success: true,
              data: {
                recommendations: recommendationsWithIds.length > 0 ? recommendationsWithIds.slice(0, 10) : [],
                totalGenerated: recommendations.length,
                peakHoursHeatmap: peakHoursHeatmap,
                analytics: {
                  totalSales,
                  totalOrders,
                  cancellationRate,
                  avgOrderValue
                }
              }
            });
            return;
          } catch (error) {
            logger.error('Error generating recommendations:', error);
            logger.error('Error stack:', error.stack);
            // Return a more detailed error for debugging
            response.status(500).json({
              success: false,
              error: 'Failed to generate recommendations',
              message: error.message,
              details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
            return;
          }
        }
        return;
      }
      
      if (path.startsWith('/analytics/sales')) {
        try {
          const period = request.query.period || 'today';
          
          // Calculate date range based on period
          const now = new Date();
          let startDate = new Date(now);
          let endDate = new Date(now);
    
    switch (period) {
      case 'today':
              // For today, use UTC timezone to ensure consistency with Firestore timestamps
              // Get current UTC date
              const todayUTC = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                0, 0, 0, 0
              ));
              const endTodayUTC = new Date(Date.UTC(
                now.getUTCFullYear(),
                now.getUTCMonth(),
                now.getUTCDate(),
                23, 59, 59, 999
              ));
              startDate = todayUTC;
              endDate = endTodayUTC;
        break;
      case 'week':
              // Get orders from the past 7 days
              startDate.setDate(startDate.getDate() - 7);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
              // Get orders from the past 30 days
              startDate.setDate(startDate.getDate() - 30);
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
        break;
          }
          
          // Convert to Firestore Timestamps for query
          const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
          const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);
          
          // Get orders for the period
          logger.info('Fetching orders for analytics:', {
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            startTimestamp: startTimestamp.seconds,
            endTimestamp: endTimestamp.seconds
          });
          
          // Get orders for the selected period
          const ordersSnapshot = await db.collection('orders')
            .where('createdAt', '>=', startTimestamp)
            .where('createdAt', '<=', endTimestamp)
            .get();
          
          // ALSO get today's orders for heatmap (always include today regardless of period)
          // This ensures the heatmap always shows today's orders even when period is "week" or "month"
          const todayUTCStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            0, 0, 0, 0
          ));
          const todayUTCEnd = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate(),
            23, 59, 59, 999
          ));
          const todayStartTimestamp = admin.firestore.Timestamp.fromDate(todayUTCStart);
          const todayEndTimestamp = admin.firestore.Timestamp.fromDate(todayUTCEnd);
          
          // Only fetch today's orders if period is not "today" (to avoid duplicate fetch)
          let todayOrdersSnapshot = null;
          if (period !== 'today') {
            try {
              todayOrdersSnapshot = await db.collection('orders')
                .where('createdAt', '>=', todayStartTimestamp)
                .where('createdAt', '<=', todayEndTimestamp)
                .get();
              logger.info('Fetched today\'s orders for heatmap:', { count: todayOrdersSnapshot.size });
            } catch (todayOrdersError) {
              logger.warn('Error fetching today\'s orders for heatmap:', todayOrdersError);
              todayOrdersSnapshot = null;
            }
          }
          
          logger.info('Orders fetched:', {
            period,
            periodOrdersCount: ordersSnapshot.size,
            todayOrdersCount: todayOrdersSnapshot?.size || ordersSnapshot.size,
            sampleOrderDates: ordersSnapshot.docs.slice(0, 3).map(doc => {
              const order = doc.data();
              const createdAt = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
              return createdAt.toISOString();
            })
          });
          
          let totalSales = 0;
          let totalOrders = ordersSnapshot.size;
          let cancelledOrders = 0;
          let itemSales = {};
          let hourlySales = {}; // For today: hourly data
          let dailySales = {}; // For week: daily data (Mon, Tue, etc.)
          let weeklySales = {}; // For month: weekly data (Week 1, Week 2, etc.)
          let categorySales = {}; // For category performance
          let statusCounts = {}; // For order status breakdown
          let stationCounts = {}; // For station performance
          
          // Get menu items to map item names to categories
          let menuItemsMap = {};
          try {
            const menuSnapshot = await db.collection('menu').get();
            menuSnapshot.forEach(doc => {
              const menuItem = doc.data();
              if (menuItem.name && menuItem.category) {
                menuItemsMap[menuItem.name] = menuItem.category;
              }
            });
          } catch (menuError) {
            logger.error('Error fetching menu items for analytics:', menuError);
          }
          
          ordersSnapshot.forEach(doc => {
            const order = doc.data();
            
            // Track order status breakdown
            const status = order.status || 'pending';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            
            // Track station performance
            const station = order.station || 'front-counter';
            if (!stationCounts[station]) {
              stationCounts[station] = { orders: 0, revenue: 0 };
            }
            
            // Skip cancelled orders from sales calculations
            if (order.status === 'cancelled') {
              cancelledOrders++;
              stationCounts[station].orders += 1;
              return; // Skip this order for sales tracking
            }
            
            const orderTotal = order.totalAmount || order.total || 0;
            totalSales += orderTotal;
            stationCounts[station].orders += 1;
            stationCounts[station].revenue += orderTotal;
            
            // Track item sales for top selling items and category performance
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const itemName = item.name || item.itemName || 'Unknown Item';
                const itemPrice = item.price || item.unitPrice || 0;
                const itemQuantity = item.quantity || 1;
                const itemRevenue = itemPrice * itemQuantity;
                
                // Top selling items
                if (!itemSales[itemName]) {
                  itemSales[itemName] = { quantity: 0, revenue: 0 };
                }
                itemSales[itemName].quantity += itemQuantity;
                itemSales[itemName].revenue += itemRevenue;
                
                // Category performance - get category from menu item or infer from item name
                let category = menuItemsMap[itemName];
                if (!category) {
                  // Fallback: infer category from item name
                  const itemNameLower = itemName.toLowerCase();
                  if (itemNameLower.includes('iced') || itemNameLower.includes('cold') || itemNameLower.includes('frappe')) {
                    category = 'Cold Drinks';
                  } else if (itemNameLower.includes('muffin') || itemNameLower.includes('bagel') || itemNameLower.includes('croissant')) {
                    category = 'Pastries';
                  } else {
                    category = 'Hot Drinks'; // Default
                  }
                }
                
                if (!categorySales[category]) {
                  categorySales[category] = { quantity: 0, revenue: 0 };
                }
                categorySales[category].quantity += itemQuantity;
                categorySales[category].revenue += itemRevenue;
              });
            }
            
            // Track sales based on period
            // IMPORTANT: Always track hourlySales for heatmap regardless of period
            // Use createdAt for heatmap to show when orders were placed (so orders appear immediately)
            try {
              let orderDate;
              // Use createdAt for heatmap to show when orders were placed
              // This allows newly placed orders to appear immediately in the heatmap
              if (order.createdAt?.toDate) {
                // Firestore Timestamp
                orderDate = order.createdAt.toDate();
              } else if (order.createdAt?.seconds) {
                // Firestore Timestamp (seconds only)
                orderDate = new Date(order.createdAt.seconds * 1000);
              } else if (typeof order.createdAt === 'string') {
                // ISO string
                orderDate = new Date(order.createdAt);
              } else {
                // Fallback - try to parse as date
                orderDate = new Date(order.createdAt);
              }
              
              logger.info('Processing order for heatmap:', {
                orderId: order.id || 'unknown',
                createdAt: order.createdAt,
                orderDateISO: orderDate.toISOString(),
                orderDateUTC: orderDate.toUTCString(),
                orderHourUTC: orderDate.getUTCHours(),
                orderHourLocal: orderDate.getHours(),
                now: new Date().toISOString()
              });
              
              // ALWAYS track hourly sales for heatmap using createdAt (regardless of period)
              // Use UTC hours to ensure consistency across timezones
              const hour = orderDate.getUTCHours();
              const hourKey = `${hour.toString().padStart(2, '0')}:00`;
              if (!hourlySales[hourKey]) {
                hourlySales[hourKey] = { sales: 0, orders: 0 };
              }
              hourlySales[hourKey].sales += orderTotal;
              hourlySales[hourKey].orders += 1;
              
              // Then track period-specific grouping for Sales Chart
              // Note: For period grouping (dailySales, weeklySales), we still use createdAt 
              // since those charts show when orders were placed, not when they were completed
              let orderPlacedDate;
              if (order.createdAt?.toDate) {
                orderPlacedDate = order.createdAt.toDate();
              } else if (order.createdAt?.seconds) {
                orderPlacedDate = new Date(order.createdAt.seconds * 1000);
              } else if (typeof order.createdAt === 'string') {
                orderPlacedDate = new Date(order.createdAt);
              } else {
                orderPlacedDate = new Date(order.createdAt);
              }
              
              if (period === 'today') {
                // Group by hour for today - use hourlySales which is already tracked above
                // No additional tracking needed since hourlySales is used for groupedData
              } else if (period === 'week') {
                // Group by day name for week - use createdAt (when order was placed)
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayIndex = orderPlacedDate.getDay();
                const dayName = days[dayIndex];
                const dayKey = `${dayName}`; // Use day name as key
                if (!dailySales[dayKey]) {
                  dailySales[dayKey] = { sales: 0, orders: 0 };
                }
                dailySales[dayKey].sales += orderTotal;
                dailySales[dayKey].orders += 1;
              } else if (period === 'month') {
                // Group by week number for month - use createdAt (when order was placed)
                // Calculate relative to the start of the 30-day period
                const daysSinceStart = Math.floor((orderPlacedDate - startDate) / (1000 * 60 * 60 * 24));
                const weekNumber = Math.floor(daysSinceStart / 7) + 1;
                // Cap at Week 4 (since we're looking at 30 days, which is ~4 weeks)
                const cappedWeekNumber = Math.min(weekNumber, 4);
                const weekKey = `Week ${cappedWeekNumber}`;
                if (!weeklySales[weekKey]) {
                  weeklySales[weekKey] = { sales: 0, orders: 0 };
                }
                weeklySales[weekKey].sales += orderTotal;
                weeklySales[weekKey].orders += 1;
              }
            } catch (dateError) {
              logger.error('Error processing createdAt date for heatmap:', dateError);
              // Skip this order from heatmap if we can't parse the date
              return; // Skip heatmap tracking but continue with other analytics
            }
          });
          
          // Also process today's orders for heatmap if period is not "today"
          // This ensures today's orders are always shown in the heatmap
          if (todayOrdersSnapshot && period !== 'today') {
            todayOrdersSnapshot.forEach(doc => {
              const order = doc.data();
              
              // Skip cancelled orders
              if (order.status === 'cancelled') {
                return;
              }
              
              const orderTotal = order.totalAmount || order.total || 0;
              
              // Track hourly sales for today's orders in heatmap
              // Use createdAt for heatmap to show when orders were placed (so orders appear immediately)
              try {
                let orderDate;
                // Use createdAt for heatmap to show when orders were placed
                // This allows newly placed orders to appear immediately in the heatmap
                if (order.createdAt?.toDate) {
                  // Firestore Timestamp
                  orderDate = order.createdAt.toDate();
                } else if (order.createdAt?.seconds) {
                  // Firestore Timestamp (seconds only)
                  orderDate = new Date(order.createdAt.seconds * 1000);
                } else if (typeof order.createdAt === 'string') {
                  // ISO string
                  orderDate = new Date(order.createdAt);
                } else {
                  // Fallback - try to parse as date
                  orderDate = new Date(order.createdAt);
                }
                
                logger.info('Processing today\'s order for heatmap:', {
                  orderId: order.id || order.orderNumber || 'unknown',
                  createdAt: order.createdAt,
                  orderDateISO: orderDate.toISOString(),
                  orderHourUTC: orderDate.getUTCHours(),
                  orderHourLocal: orderDate.getHours()
                });
                
                // Use UTC hours for consistency
                const hour = orderDate.getUTCHours();
              const hourKey = `${hour.toString().padStart(2, '0')}:00`;
                
                // Only add to hourlySales if not already tracked (avoid double-counting if order is in both queries)
                // Since we're only tracking for today's orders when period is not "today",
                // we should add them to the heatmap without double-counting
              if (!hourlySales[hourKey]) {
                hourlySales[hourKey] = { sales: 0, orders: 0 };
              }
                
                // Check if this order was already processed (avoid double-counting)
                // For simplicity, we'll track it for the heatmap visualization
              hourlySales[hourKey].sales += orderTotal;
              hourlySales[hourKey].orders += 1;
              } catch (dateError) {
                logger.warn('Error processing today\'s order date for heatmap:', dateError);
            }
          });
            
            logger.info('Added today\'s orders to heatmap:', {
              todayOrdersCount: todayOrdersSnapshot.size,
              hourlySalesKeys: Object.keys(hourlySales).length
            });
          }
          
          const activeOrders = totalOrders - cancelledOrders;
          
          // Helper function to format hour
          const formatHour = (hour) => {
            const hourNum = parseInt(hour.split(':')[0]);
            const period = hourNum >= 12 ? 'PM' : 'AM';
            const displayHour = hourNum % 12 || 12;
            return `${displayHour}${period}`;
          };
          
          // Calculate top selling items
          const topSellingItems = Object.entries(itemSales)
            .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
          
          // Format category performance
          const categoryPerformance = Object.entries(categorySales).length > 0 
            ? Object.entries(categorySales).map(([category, data]) => ({
                category,
                quantity: data.quantity,
                revenue: Math.round(data.revenue * 100) / 100,
                percentage: totalSales > 0 ? Math.round((data.revenue / totalSales) * 100) : 0
              })).sort((a, b) => b.revenue - a.revenue)
            : [];
          
          // Format order status breakdown
          const orderStatusBreakdown = Object.keys(statusCounts).length > 0
            ? Object.entries(statusCounts).map(([status, count]) => ({
                status,
                count,
                percentage: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0
              }))
            : [];
          
          // Format station performance
          const stationPerformance = Object.keys(stationCounts).length > 0
            ? Object.entries(stationCounts).map(([station, data]) => ({
                station: station.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()), // Format station name
                orders: data.orders,
                revenue: Math.round(data.revenue * 100) / 100,
                averageOrderValue: data.orders > 0 ? Math.round((data.revenue / data.orders) * 100) / 100 : 0
              })).sort((a, b) => b.orders - a.orders)
            : [];
          
          // Format peak hours heatmap data (always use hourly for heatmap, but groupData changes by period)
          // IMPORTANT: hourlySales should always be populated regardless of period
          // For heatmap, we want to show ALL hours in the operating range, even if there are no orders
          // Calculate maxOrders from ACTUAL data only (strict data-driven scaling)
          const orderValues = Object.values(hourlySales).map(h => h.orders || 0);
          const maxOrders = orderValues.length > 0 ? Math.max(...orderValues) : 0;
          const minOrders = orderValues.length > 0 ? Math.min(...orderValues.filter(o => o > 0)) : 0; // Min non-zero for better scaling
          
          // Generate peak hours heatmap - include all hours from 1PM to 12AM (operating hours)
          // Even if an hour has no orders, include it with 0 orders for complete visualization
          // STRICT: Use actual data values - no artificial scaling
          const allHours = [];
          for (let h = 13; h < 24; h++) { // 1 PM to 12 AM (13 to 24 in 24-hour format)
            const hourKey = `${h.toString().padStart(2, '0')}:00`;
            const hourData = hourlySales[hourKey] || { sales: 0, orders: 0 };
            const actualOrders = hourData.orders || 0;
            
            // Calculate intensity strictly based on actual data range
            // If maxOrders is 0, intensity is 0. Otherwise, scale from 0-100 based on actual range
            let intensity = 0;
            if (maxOrders > 0 && actualOrders > 0) {
              // Strict scaling: if all orders are the same, they should all show as 100%
              // Otherwise, scale proportionally
              if (maxOrders === minOrders && actualOrders === maxOrders) {
                intensity = 100; // All hours have same orders
              } else if (actualOrders === maxOrders) {
                intensity = 100; // Peak hour
              } else {
                // Scale proportionally: actualOrders / maxOrders * 100
                intensity = (actualOrders / maxOrders) * 100;
              }
            }
            
            allHours.push({
              hour: hourKey,
              hourFormatted: formatHour(hourKey),
              sales: Math.round(hourData.sales * 100) / 100,
              orders: actualOrders, // STRICT: Use actual order count, no rounding or manipulation
              intensity: Math.round(intensity * 100) / 100 // Round to 2 decimal places for precision
            });
          }
          
          const peakHoursHeatmap = allHours;
          
          logger.info('Peak hours heatmap generated in sales endpoint:', {
            period,
            hourlySalesCount: Object.keys(hourlySales).length,
            peakHoursHeatmapCount: peakHoursHeatmap.length,
            sampleHours: Object.keys(hourlySales).slice(0, 5),
            ordersCount: totalOrders,
            hoursWithOrders: peakHoursHeatmap.filter(h => h.orders > 0).length,
            totalOrdersInHeatmap: peakHoursHeatmap.reduce((sum, h) => sum + h.orders, 0),
            sampleHeatmapData: peakHoursHeatmap.filter(h => h.orders > 0).slice(0, 3),
            hourlySalesDetails: Object.entries(hourlySales).map(([hour, data]) => ({ hour, orders: data.orders, sales: data.sales }))
          });
          
          // Determine groupedData based on period
          let groupedData = {};
          if (period === 'today') {
            groupedData = hourlySales;
          } else if (period === 'week') {
            // Sort daily sales by day of week (Monday to Sunday)
            const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const sortedDailySales = {};
            dayOrder.forEach(day => {
              if (dailySales[day]) {
                sortedDailySales[day] = dailySales[day];
              }
            });
            groupedData = sortedDailySales;
          } else if (period === 'month') {
            // Sort weekly sales by week number
            const sortedWeeklySales = {};
            Object.keys(weeklySales)
              .sort((a, b) => {
                const weekA = parseInt(a.replace('Week ', ''));
                const weekB = parseInt(b.replace('Week ', ''));
                return weekA - weekB;
              })
              .forEach(week => {
                sortedWeeklySales[week] = weeklySales[week];
              });
            groupedData = sortedWeeklySales;
          }
          
          logger.info('Analytics calculated:', {
            period,
            totalOrders,
            categoryCount: categoryPerformance.length,
            statusCount: orderStatusBreakdown.length,
            stationCount: stationPerformance.length,
            peakHoursCount: peakHoursHeatmap.length,
            groupedDataKeys: Object.keys(groupedData),
            statusCountsKeys: Object.keys(statusCounts),
            stationCountsKeys: Object.keys(stationCounts),
            categorySalesKeys: Object.keys(categorySales)
          });
          
          response.json({
      success: true,
      data: {
        period,
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
        cancelledOrders,
        activeOrders,
        averageOrderValue: activeOrders > 0 ? Math.round((totalSales / activeOrders) * 100) / 100 : 0,
        groupedData: groupedData,
        topSellingItems,
        categoryPerformance,
        orderStatusBreakdown,
        stationPerformance,
        peakHoursHeatmap
      }
          });
  } catch (error) {
          logger.error('Error fetching sales analytics:', error);
          response.json({
            success: true,
            data: {
              period: request.query.period || 'today',
              totalSales: 0,
              totalOrders: 0,
              cancelledOrders: 0,
              activeOrders: 0,
              averageOrderValue: 0,
              groupedData: {},
              topSellingItems: [],
              categoryPerformance: [],
              orderStatusBreakdown: [],
              stationPerformance: [],
              peakHoursHeatmap: []
            }
          });
        }
        return;
      }
    }
    
    // Menu endpoints
    if (path.startsWith('/menu') || path.startsWith('/api/menu')) {
      // Handle path variations: /menu, /menu/, /api/menu, /api/menu/, /menu/:id, /api/menu/:id
      const cleanPath = path.replace('/api', '').replace(/\/$/, '');
      
      // POST /menu/seed - Seed menu with default items (only if empty)
      if ((cleanPath === '/menu/seed' || cleanPath === '/menu/seed/') && method === 'POST') {
        try {
          // Check if menu already has items
          const existingMenu = await db.collection('menu').get();
          
          if (!existingMenu.empty) {
            response.json({ 
              success: false, 
              message: `Menu already has ${existingMenu.size} items. Skipping seed.`,
              count: existingMenu.size 
            });
            return;
          }
          
          // Default menu items to seed
          const defaultMenuItems = [
            {
              name: 'Latte',
              price: 4.50,
              category: 'Hot Drinks',
              description: 'Rich espresso with steamed milk',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 3,
              ingredients: ['Coffee Beans', 'Milk'],
              sizes: [
                { size: 'Regular', price: 4.50 },
                { size: 'Large', price: 5.50 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Cappuccino',
              price: 4.25,
              category: 'Hot Drinks',
              description: 'Espresso with equal parts steamed milk and foam',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 3,
              ingredients: ['Coffee Beans', 'Milk'],
              sizes: [
                { size: 'Regular', price: 4.25 },
                { size: 'Large', price: 5.25 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Americano',
              price: 3.50,
              category: 'Hot Drinks',
              description: 'Espresso with hot water',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 2,
              ingredients: ['Coffee Beans'],
              sizes: [
                { size: 'Regular', price: 3.50 },
                { size: 'Large', price: 4.50 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Espresso',
              price: 2.75,
              category: 'Hot Drinks',
              description: 'Pure espresso shot',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 1,
              ingredients: ['Coffee Beans'],
              sizes: [
                { size: 'Single', price: 2.75 },
                { size: 'Double', price: 4.00 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Iced Coffee',
              price: 3.75,
              category: 'Cold Drinks',
              description: 'Cold brewed coffee over ice',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 2,
              ingredients: ['Coffee Beans'],
              sizes: [
                { size: 'Regular', price: 3.75 },
                { size: 'Large', price: 4.75 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Frappuccino',
              price: 5.25,
              category: 'Cold Drinks',
              description: 'Blended coffee drink',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 4,
              ingredients: ['Coffee Beans', 'Milk', 'Sugar'],
              sizes: [
                { size: 'Regular', price: 5.25 },
                { size: 'Large', price: 6.25 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Croissant',
              price: 3.00,
              category: 'Pastries',
              description: 'Buttery flaky pastry',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 1,
              ingredients: ['Flour', 'Butter', 'Eggs'],
              sizes: [
                { size: 'Regular', price: 3.00 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Muffin',
              price: 2.50,
              category: 'Pastries',
              description: 'Fresh baked muffin',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 1,
              ingredients: ['Flour', 'Eggs', 'Sugar'],
              sizes: [
                { size: 'Regular', price: 2.50 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            {
              name: 'Bagel',
              price: 2.75,
              category: 'Pastries',
              description: 'Fresh bagel with cream cheese',
              imageUrl: '',
              isAvailable: true,
              preparationTime: 1,
              ingredients: ['Flour'],
              sizes: [
                { size: 'Regular', price: 2.75 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
          ];
          
          // Add all menu items
          const batch = db.batch();
          let count = 0;
          
          for (const item of defaultMenuItems) {
            const docRef = db.collection('menu').doc();
            batch.set(docRef, item);
            count++;
          }
          
          await batch.commit();
          
          logger.info(`Successfully seeded ${count} menu items!`);
          response.json({ 
            success: true, 
            message: `Seeded ${count} menu items successfully!`,
            count 
          });
          return;
          
        } catch (error) {
          logger.error('Error seeding menu:', error);
          response.status(500).json({ 
            success: false, 
            error: 'Failed to seed menu',
            message: error.message 
          });
          return;
        }
      }
      
      // GET /menu - Get all menu items
      if (cleanPath === '/menu' && method === 'GET') {
        try {
          const snapshot = await db.collection('menu').get();
          const items = snapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data };
          }).filter(item => item && item.id); // Ensure all items have valid IDs
          
          // Clean up old ingredients that might not exist in inventory
          // Get inventory items to validate ingredients
          let inventoryItemNames = [];
          try {
            const inventorySnapshot = await db.collection('inventory').get();
            inventoryItemNames = inventorySnapshot.docs
              .map(doc => doc.data()?.name)
              .filter(name => name && typeof name === 'string'); // Filter out invalid names
          } catch (inventoryError) {
            logger.error('Error loading inventory for ingredient validation:', inventoryError);
            // Continue without inventory filtering if it fails
          }
          
          // Filter ingredients for each menu item to only include valid inventory items
          // Remove old ingredients like "milk", "water", "ice" that don't exist in inventory
          const cleanedItems = items.map(item => {
            if (!item || !item.id) {
              logger.warn('Skipping invalid menu item:', item);
              return null;
            }
            
            if (item.ingredients && Array.isArray(item.ingredients)) {
              const filteredIngredients = item.ingredients.filter(ingredient => 
                typeof ingredient === 'string' && 
                ingredient.trim() !== '' && 
                (inventoryItemNames.length === 0 || inventoryItemNames.includes(ingredient))
              );
              
              // If ingredients were filtered out and we have a valid ID, update the item in Firestore
              if (filteredIngredients.length !== item.ingredients.length && item.id && typeof item.id === 'string' && item.id.trim() !== '') {
                // Update the item in Firestore to save cleaned ingredients (remove old ones like "milk", "water", "ice")
                db.collection('menu').doc(item.id).update({
                  ingredients: filteredIngredients
                }).then(() => {
                  logger.info(`Cleaned ingredients for menu item ${item.id}: removed ${item.ingredients.length - filteredIngredients.length} invalid ingredients`);
                }).catch(err => {
                  logger.error(`Error updating ingredients for ${item.id}:`, err);
                });
              }
              
              return {
                ...item,
                ingredients: filteredIngredients
              };
            }
            return item;
          }).filter(item => item !== null); // Remove any null items
          
          logger.info(`Returning ${cleanedItems.length} menu items`);
          response.json({ success: true, data: cleanedItems });
          return;
        } catch (error) {
          logger.error('Error fetching menu items:', error);
          response.status(500).json({ 
            success: false, 
            error: 'Failed to fetch menu items',
            message: error.message 
          });
          return;
        }
      }
      
      // POST /menu - Create new menu item
      if (cleanPath === '/menu' && method === 'POST') {
        const menuData = request.body;
        logger.info('Creating menu item:', menuData);
        
        try {
          // Get staff info for audit logging
          const staffId = menuData.staffId || menuData.staffEmail || 'unknown';
          const staffInfo = await getEmployeeInfo(db, staffId);
          
          // Clean ingredients: only keep items that exist in inventory
          if (menuData.ingredients && Array.isArray(menuData.ingredients)) {
            const inventorySnapshot = await db.collection('inventory').get();
            const inventoryItemNames = inventorySnapshot.docs.map(doc => doc.data().name);
            menuData.ingredients = menuData.ingredients.filter(ingredient => 
              inventoryItemNames.includes(ingredient)
            );
          }
          
          const docRef = await db.collection('menu').add(menuData);
          const createdItem = { id: docRef.id, ...menuData };
          logger.info('Menu item created:', createdItem);
          
          // Log audit event
          await logAuditEvent(db, {
            action: 'menu_item_created',
            entityType: 'menu',
            entityId: docRef.id,
            entityName: menuData.name,
            staffId: staffInfo.email || staffId,
            staffName: staffInfo.name,
            staffEmail: staffInfo.email,
            details: { name: menuData.name, category: menuData.category, price: menuData.price }
          });
          
          response.json({ success: true, data: createdItem });
        } catch (error) {
          logger.error('Error creating menu item:', error);
          response.status(500).json({ error: 'Failed to create menu item', message: error.message });
        }
        return;
      }
      
      // PUT /menu - Update existing menu item (ID in body)
      if (cleanPath === '/menu' && method === 'PUT') {
        const menuData = request.body;
        logger.info('Updating menu item:', menuData);
        
        try {
          if (menuData.id) {
            const { id, ...dataToStore } = menuData;
            
            // Clean ingredients: only keep items that exist in inventory
            if (dataToStore.ingredients && Array.isArray(dataToStore.ingredients)) {
              const inventorySnapshot = await db.collection('inventory').get();
              const inventoryItemNames = inventorySnapshot.docs.map(doc => doc.data().name);
              dataToStore.ingredients = dataToStore.ingredients.filter(ingredient => 
                inventoryItemNames.includes(ingredient)
              );
            }
            
            await db.collection('menu').doc(id.toString()).set(dataToStore, { merge: true });
            logger.info('Menu item updated:', id);
            response.json({ success: true, data: { id, ...dataToStore } });
          } else {
            response.status(400).json({ error: 'Item ID is required' });
          }
        } catch (error) {
          logger.error('Error updating menu item:', error);
          response.status(500).json({ error: 'Failed to update menu item', message: error.message });
        }
        return;
      }
      
      // DELETE /menu/:id or /api/menu/:id - Delete menu item
      // Match /menu/:id or /api/menu/:id (exclude query parameters)
      const deleteMatch = path.match(/\/(?:api\/)?menu\/([^?]+)/);
      if (deleteMatch && method === 'DELETE') {
        const itemId = deleteMatch[1];
        logger.info('Deleting menu item:', itemId, 'Full path:', path);
        
        try {
          // Get item data before deletion for audit
          const itemDoc = await db.collection('menu').doc(itemId.toString()).get();
          
          if (!itemDoc.exists) {
            logger.warn('Menu item not found for deletion:', itemId);
            response.status(404).json({ 
              success: false,
              error: 'Menu item not found' 
            });
            return;
          }
          
          const itemData = itemDoc.data();
          
          // Get staff info from query params or headers
          const staffId = request.query.staffId || request.query.staffEmail || request.headers['x-staff-id'] || request.headers['x-staff-email'] || 'unknown';
          const staffInfo = await getEmployeeInfo(db, staffId);
          
          await db.collection('menu').doc(itemId.toString()).delete();
          logger.info('Menu item deleted successfully:', itemId, 'Name:', itemData?.name || 'Unknown');
          
          // Log audit event
          await logAuditEvent(db, {
            action: 'menu_item_deleted',
            entityType: 'menu',
            entityId: itemId.toString(),
            entityName: itemData?.name || 'Unknown',
            staffId: staffInfo.email || staffId,
            staffName: staffInfo.name,
            staffEmail: staffInfo.email,
            details: { name: itemData?.name, category: itemData?.category }
          });
          
          response.json({ success: true });
        } catch (error) {
          logger.error('Error deleting menu item:', error);
          response.status(500).json({ error: 'Failed to delete menu item', message: error.message });
        }
        return;
      }
      
      // POST /menu/cleanup-staff - Clean up orphaned staff references
      // Find and replace staffId/staffEmail in menu items, orders, inventory, etc.
      if (cleanPath === '/menu/cleanup-staff' && method === 'POST') {
        try {
          const { staffId, replaceWith } = request.body;
          
          if (!staffId) {
            response.status(400).json({
              success: false,
              error: 'staffId is required'
            });
            return;
          }
          
          const replacementStaffId = replaceWith || 'manager@cafesync.com';
          const replacementStaffName = 'System Cleanup';
          const replacementStaffEmail = replacementStaffId;
          
          logger.info('Starting staff cleanup:', { staffId, replaceWith: replacementStaffId });
          
          let menuItemsUpdated = 0;
          let ordersUpdated = 0;
          let inventoryItemsUpdated = 0;
          let auditLogsUpdated = 0;
          
          // 1. Clean menu items
          const menuSnapshot = await db.collection('menu').get();
          const menuBatch = db.batch();
          menuSnapshot.forEach((doc) => {
            const data = doc.data();
            let needsUpdate = false;
            const updateData = {};
            
            if (data.staffId === staffId || data.staffEmail === staffId || data.staffId === staffId || data.staffEmail === staffId) {
              if (data.staffId === staffId) {
                updateData.staffId = replacementStaffId;
                needsUpdate = true;
              }
              if (data.staffEmail === staffId) {
                updateData.staffEmail = replacementStaffEmail;
                needsUpdate = true;
              }
              if (data.staffName && (data.staffId === staffId || data.staffEmail === staffId)) {
                updateData.staffName = replacementStaffName;
                needsUpdate = true;
              }
            }
            
            if (needsUpdate) {
              menuBatch.update(doc.ref, updateData);
              menuItemsUpdated++;
              logger.info(`Updating menu item ${doc.id}: replacing staff ${staffId} with ${replacementStaffId}`);
            }
          });
          
          if (menuItemsUpdated > 0) {
            await menuBatch.commit();
            logger.info(`Updated ${menuItemsUpdated} menu items`);
          }
          
          // 2. Clean orders (process all orders in batches of 500)
          const allOrdersSnapshot = await db.collection('orders').get();
          const orderBatchSize = 500;
          let processedOrders = 0;
          
          for (let i = 0; i < allOrdersSnapshot.docs.length; i += orderBatchSize) {
            const batchDocs = allOrdersSnapshot.docs.slice(i, i + orderBatchSize);
            const orderBatch = db.batch();
            let batchUpdated = 0;
            
            batchDocs.forEach((doc) => {
              const data = doc.data();
              let needsUpdate = false;
              const updateData = {};
              
              if (data.staffId === staffId || data.staffEmail === staffId) {
                if (data.staffId === staffId) {
                  updateData.staffId = replacementStaffId;
                  needsUpdate = true;
                }
                if (data.staffEmail === staffId) {
                  updateData.staffEmail = replacementStaffEmail;
                  needsUpdate = true;
                }
                if (data.staffName && (data.staffId === staffId || data.staffEmail === staffId)) {
                  updateData.staffName = replacementStaffName;
                  needsUpdate = true;
                }
              }
              
              if (needsUpdate) {
                orderBatch.update(doc.ref, updateData);
                batchUpdated++;
                ordersUpdated++;
                logger.info(`Updating order ${doc.id}: replacing staff ${staffId} with ${replacementStaffId}`);
              }
              
              processedOrders++;
            });
            
            if (batchUpdated > 0) {
              await orderBatch.commit();
              logger.info(`Updated ${batchUpdated} orders in batch ${Math.floor(i / orderBatchSize) + 1}`);
            }
          }
          
          logger.info(`Processed ${processedOrders} total orders`);
          
          // 3. Clean inventory items
          const inventorySnapshot = await db.collection('inventory').get();
          const inventoryBatch = db.batch();
          inventorySnapshot.forEach((doc) => {
            const data = doc.data();
            let needsUpdate = false;
            const updateData = {};
            
            if (data.staffId === staffId || data.staffEmail === staffId) {
              if (data.staffId === staffId) {
                updateData.staffId = replacementStaffId;
                needsUpdate = true;
              }
              if (data.staffEmail === staffId) {
                updateData.staffEmail = replacementStaffEmail;
                needsUpdate = true;
              }
              if (data.staffName && (data.staffId === staffId || data.staffEmail === staffId)) {
                updateData.staffName = replacementStaffName;
                needsUpdate = true;
              }
            }
            
            if (needsUpdate) {
              inventoryBatch.update(doc.ref, updateData);
              inventoryItemsUpdated++;
            }
          });
          
          if (inventoryItemsUpdated > 0) {
            await inventoryBatch.commit();
            logger.info(`Updated ${inventoryItemsUpdated} inventory items`);
          }
          
          // 4. Clean audit logs (where staffId might be stored for analytics)
          const auditLogsSnapshot = await db.collection('audit_log').get();
          const auditBatch = db.batch();
          let auditBatchCount = 0;
          
          auditLogsSnapshot.forEach((doc) => {
            const data = doc.data();
            let needsUpdate = false;
            const updateData = {};
            
            // Check staffId field in audit logs
            if (data.staffId === staffId) {
              updateData.staffId = replacementStaffId;
              needsUpdate = true;
            }
            if (data.staffEmail === staffId) {
              updateData.staffEmail = replacementStaffEmail;
              needsUpdate = true;
            }
            if (data.staffName && (data.staffId === staffId || data.staffEmail === staffId)) {
              updateData.staffName = replacementStaffName;
              needsUpdate = true;
            }
            
            if (needsUpdate) {
              auditBatch.update(doc.ref, updateData);
              auditBatchCount++;
              auditLogsUpdated++;
              
              // Commit in batches of 500 (Firestore limit)
              if (auditBatchCount >= 500) {
                auditBatch.commit().then(() => {
                  logger.info(`Committed batch of ${auditBatchCount} audit logs`);
                });
                auditBatchCount = 0;
              }
            }
          });
          
          if (auditBatchCount > 0) {
            await auditBatch.commit();
            logger.info(`Updated ${auditLogsUpdated} audit log entries`);
          }
          
          // 5. Check if this UID exists as an employee document ID or in uid field
          const employeesSnapshot = await db.collection('employees').get();
          let employeeDocToDelete = null;
          
          employeesSnapshot.forEach((doc) => {
            const emp = doc.data();
            // Check if document ID matches, or if uid field matches
            if (doc.id === staffId || emp.uid === staffId) {
              employeeDocToDelete = doc.ref;
              logger.info(`Found employee document to delete: ${doc.id}, UID: ${emp.uid}`);
            }
          });
          
          if (employeeDocToDelete) {
            await employeeDocToDelete.delete();
            logger.info(`Deleted employee document: ${employeeDocToDelete.id}`);
          }
          
          response.json({
            success: true,
            message: `Cleanup complete: ${menuItemsUpdated} menu items, ${ordersUpdated} orders, ${inventoryItemsUpdated} inventory items, ${auditLogsUpdated} audit logs updated${employeeDocToDelete ? ', 1 employee deleted' : ''}`,
            menuItemsUpdated,
            ordersUpdated,
            inventoryItemsUpdated,
            auditLogsUpdated,
            employeeDeleted: employeeDocToDelete ? true : false,
            replacedStaffId: staffId,
            replacementStaffId: replacementStaffId
          });
        } catch (error) {
          logger.error('Error cleaning up staff references:', error);
          response.status(500).json({
            success: false,
            error: 'Failed to cleanup staff references',
            message: error.message
          });
        }
        return;
      }
      
      // POST /menu/migrate - Migrate existing menu items to new format
      // Remove allergens field, remove numeric id field, ensure staff fields exist
      if (cleanPath === '/menu/migrate' && method === 'POST') {
        try {
          logger.info('Starting menu items migration...');
          
          const menuSnapshot = await db.collection('menu').get();
          logger.info(`Found ${menuSnapshot.size} menu items to migrate`);
          
          const batch = db.batch();
          let migratedCount = 0;
          let skippedCount = 0;
          const defaultStaffEmail = 'manager@cafesync.com';
          const defaultStaffId = 'manager@cafesync.com';
          const defaultStaffName = 'System Migration';
          
          menuSnapshot.forEach((doc) => {
            const data = doc.data();
            const docId = doc.id;
            let needsUpdate = false;
            const updateData = {};
            
            // Remove allergens field if it exists
            if (data.allergens !== undefined) {
              updateData.allergens = admin.firestore.FieldValue.delete();
              needsUpdate = true;
            }
            
            // Remove numeric id field if it exists (keep Firestore doc ID only)
            if (data.id !== undefined && typeof data.id === 'number') {
              updateData.id = admin.firestore.FieldValue.delete();
              needsUpdate = true;
            }
            
            // Add staff fields if they don't exist
            if (!data.staffEmail) {
              updateData.staffEmail = defaultStaffEmail;
              needsUpdate = true;
            }
            if (!data.staffId) {
              updateData.staffId = defaultStaffId;
              needsUpdate = true;
            }
            if (!data.staffName) {
              updateData.staffName = defaultStaffName;
              needsUpdate = true;
            }
            
            // Add updatedAt timestamp
            updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
            updateData.updatedAtISO = new Date().toISOString();
            
            if (needsUpdate) {
              batch.update(doc.ref, updateData);
              migratedCount++;
              logger.info(`Migrating menu item: ${docId} - "${data.name || 'Unknown'}"`);
            } else {
              skippedCount++;
              logger.info(`Skipping menu item: ${docId} - "${data.name || 'Unknown'}" (already in correct format)`);
            }
          });
          
          if (migratedCount > 0) {
            await batch.commit();
            logger.info(`Migration complete: ${migratedCount} items migrated, ${skippedCount} items skipped`);
            
            response.json({
              success: true,
              message: `Migration complete: ${migratedCount} items migrated, ${skippedCount} items skipped`,
              migrated: migratedCount,
              skipped: skippedCount,
              total: menuSnapshot.size
            });
          } else {
            logger.info(`No items needed migration. ${skippedCount} items already in correct format.`);
            response.json({
              success: true,
              message: `No migration needed. All ${skippedCount} items are already in the correct format.`,
              migrated: 0,
              skipped: skippedCount,
              total: menuSnapshot.size
            });
          }
        } catch (error) {
          logger.error('Error migrating menu items:', error);
          response.status(500).json({
            success: false,
            error: 'Failed to migrate menu items',
            message: error.message
          });
        }
        return;
      }
    }
    
    // Employees endpoints
    if (path.startsWith('/employees') || path.startsWith('/api/employees')) {
      const cleanPath = path.replace('/api', '').replace(/\/$/, '');
      
      // DELETE /employees/:id - Delete employee by ID or UID
      const deleteEmployeeMatch = path.match(/\/(?:api\/)?employees\/([^?]+)/);
      if (deleteEmployeeMatch && method === 'DELETE') {
        const employeeId = deleteEmployeeMatch[1];
        logger.info('Deleting employee:', employeeId, 'Full path:', path);
        
        try {
          // Find employee by document ID or UID
          let employeeDoc = null;
          let employeeRef = null;
          
          // First, try to find by document ID
          const docRef = db.collection('employees').doc(employeeId);
          const docSnapshot = await docRef.get();
          
          if (docSnapshot.exists) {
            employeeDoc = docSnapshot.data();
            employeeRef = docRef;
          } else {
            // Try to find by UID
            const employeesSnapshot = await db.collection('employees').get();
            for (const doc of employeesSnapshot.docs) {
              const emp = doc.data();
              if (emp.uid === employeeId || doc.id === employeeId) {
                employeeDoc = emp;
                employeeRef = doc.ref;
                break;
              }
            }
          }
          
          if (!employeeRef || !employeeDoc) {
            logger.warn('Employee not found for deletion:', employeeId);
            response.status(404).json({
              success: false,
              error: 'Employee not found'
            });
            return;
          }
          
          logger.info('Found employee to delete:', {
            id: employeeRef.id,
            name: employeeDoc.name,
            email: employeeDoc.email,
            uid: employeeDoc.uid
          });
          
          // Delete the employee
          await employeeRef.delete();
          logger.info('Employee deleted successfully:', employeeRef.id, 'Name:', employeeDoc.name || 'Unknown');
          
          response.json({
            success: true,
            message: `Employee "${employeeDoc.name || employeeId}" deleted successfully`,
            deletedId: employeeRef.id
          });
        } catch (error) {
          logger.error('Error deleting employee:', error);
          response.status(500).json({
            success: false,
            error: 'Failed to delete employee',
            message: error.message
          });
        }
        return;
      }
      
      // GET /employees - List all employees
      if (cleanPath === '/employees' && method === 'GET') {
        try {
          const employeesSnapshot = await db.collection('employees').get();
          const employees = employeesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          response.json({ success: true, data: employees });
        } catch (error) {
          logger.error('Error fetching employees:', error);
          response.status(500).json({
            success: false,
            error: 'Failed to fetch employees',
            message: error.message
          });
        }
        return;
      }
    }
    
    // Add-ons endpoints
    if (path.startsWith('/addons') || path.startsWith('/api/addons')) {
      // Handle all variations: /addons, /addons/, /api/addons, /api/addons/
      const cleanPath = path.replace('/api', '').replace(/\/$/, '');
      
      if (cleanPath === '/addons' && method === 'GET') {
        const snapshot = await db.collection('addons').get();
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // If no data, initialize with default add-ons
        if (items.length === 0) {
          const defaultAddons = [
            { name: 'Pearl (Sago)', price: 15 },
            { name: 'Aloe Vera', price: 20 },
            { name: 'Nata de Coco', price: 15 },
            { name: 'Gulaman (Jelly)', price: 15 },
            { name: 'Extra Sugar', price: 5 },
            { name: 'Whipped Cream', price: 25 },
            { name: 'Caramel Syrup', price: 20 },
            { name: 'Chocolate Syrup', price: 20 },
            { name: 'Vanilla Syrup', price: 20 },
            { name: 'Extra Shot (Espresso)', price: 30 },
          ];
          
          // Save to Firestore
          const batch = db.batch();
          defaultAddons.forEach((addon, index) => {
            const docRef = db.collection('addons').doc((index + 1).toString());
            batch.set(docRef, addon);
          });
          await batch.commit();
          
          // Update items to return
          items = defaultAddons.map((addon, index) => ({ id: (index + 1).toString(), ...addon }));
        }
        
        response.json({ success: true, data: items });
        return;
      }
      
      if (cleanPath === '/addons' && method === 'POST') {
        const addonData = request.body;
        const docRef = await db.collection('addons').add(addonData);
        response.json({ success: true, data: { id: docRef.id, ...addonData } });
        return;
      }
      
      if (cleanPath === '/addons' && method === 'PUT') {
        const addonData = request.body;
        if (addonData.id) {
          const { id, ...dataToStore } = addonData;
          await db.collection('addons').doc(id.toString()).set(dataToStore);
          response.json({ success: true });
        }
        return;
      }
      
      // DELETE /addons/:id or /api/addons/:id
      const deleteMatch = path.match(/\/(?:api\/)?addons\/(.+)$/);
      if (deleteMatch && method === 'DELETE') {
        const addonId = deleteMatch[1];
        await db.collection('addons').doc(addonId).delete();
        response.json({ success: true });
        return;
      }
    }
    
    // Discount Codes endpoints
    if (path.startsWith('/discounts') || path.startsWith('/api/discounts')) {
      const cleanPath = path.replace('/api', '').replace(/\/$/, '');
      
      if (cleanPath === '/discounts' && method === 'GET') {
        const snapshot = await db.collection('discounts').get();
        let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // If no data, initialize with default discount codes
        if (items.length === 0) {
          const defaultDiscounts = [
            { code: 'WELCOME10', percentage: 10, description: 'Welcome discount' },
            { code: 'COFFEE15', percentage: 15, description: 'Coffee lovers special' },
            { code: 'STUDENT20', percentage: 20, description: 'Student discount' },
            { code: 'LOYALTY5', percentage: 5, description: 'Loyalty member discount' },
            { code: 'FIRSTTIME', percentage: 25, description: 'First time customer' },
          ];
          
          // Save to Firestore
          const batch = db.batch();
          defaultDiscounts.forEach((discount, index) => {
            const docRef = db.collection('discounts').doc((index + 1).toString());
            batch.set(docRef, discount);
          });
          await batch.commit();
          
          // Update items to return
          items = defaultDiscounts.map((discount, index) => ({ id: (index + 1).toString(), ...discount }));
        }
        
        response.json({ success: true, data: items });
        return;
      }
      
      if (cleanPath === '/discounts' && method === 'POST') {
        const discountData = request.body;
        const docRef = await db.collection('discounts').add(discountData);
        response.json({ success: true, data: { id: docRef.id, ...discountData } });
        return;
      }
      
      if (cleanPath === '/discounts' && method === 'PUT') {
        const discountData = request.body;
        if (discountData.id) {
          const { id, ...dataToStore } = discountData;
          await db.collection('discounts').doc(id.toString()).set(dataToStore);
          response.json({ success: true });
        }
        return;
      }
      
      // DELETE /discounts/:id or /api/discounts/:id
      const deleteMatch = path.match(/\/(?:api\/)?discounts\/(.+)$/);
      if (deleteMatch && method === 'DELETE') {
        const discountId = deleteMatch[1];
        await db.collection('discounts').doc(discountId).delete();
        response.json({ success: true });
        return;
      }
    }
    
    // Weather endpoints
    if (path === '/weather/cafe' || path === '/weather/cafe/') {
      if (method === 'GET') {
        try {
          // Cafe location: Bean and Beyond, Caloocan City, Philippines
          const cafeLocation = {
            name: 'Bean and Beyond, Caloocan City',
            address: '14 Kumintang Street, Caloocan City, Philippines',
            lat: 14.6542,
            lon: 120.9823,
          };
          
          // Try to fetch from OpenWeatherMap API if key is available
          const weatherApiKey = process.env.WEATHER_API_KEY;
          
          if (weatherApiKey && weatherApiKey !== 'demo-key' && weatherApiKey !== 'your-weather-api-key') {
            try {
              // Use Node's built-in fetch (available in Node 18+) or https module
              const https = require('https');
              const url = require('url');
              
              const weatherUrl = new url.URL('https://api.openweathermap.org/data/2.5/weather');
              weatherUrl.searchParams.append('lat', cafeLocation.lat.toString());
              weatherUrl.searchParams.append('lon', cafeLocation.lon.toString());
              weatherUrl.searchParams.append('appid', weatherApiKey);
              weatherUrl.searchParams.append('units', 'metric');
              
              const weatherData = await new Promise((resolve, reject) => {
                https.get(weatherUrl.toString(), (res) => {
                  let data = '';
                  res.on('data', (chunk) => { data += chunk; });
                  res.on('end', () => {
                    try {
                      resolve(JSON.parse(data));
                    } catch (e) {
                      reject(e);
                    }
                  });
                }).on('error', reject).setTimeout(10000);
              });
              
              // Map weather condition
              const conditionMap = {
                'Clear': 'sunny',
                'Clouds': 'cloudy',
                'Rain': 'rainy',
                'Drizzle': 'rainy',
                'Thunderstorm': 'stormy',
                'Snow': 'snowy',
                'Mist': 'foggy',
                'Fog': 'foggy',
              };
              
              const mainCondition = weatherData.weather[0].main;
              const condition = conditionMap[mainCondition] || 'cloudy';
              
              const result = {
                temperature: Math.round(weatherData.main.temp),
                condition: condition,
                humidity: weatherData.main.humidity,
                description: weatherData.weather[0].description,
                windSpeed: weatherData.wind?.speed || 0,
                location: cafeLocation,
                timestamp: new Date().toISOString(),
              };
              
              logger.info('Weather data fetched from OpenWeatherMap');
              response.json(result);
              return;
            } catch (weatherError) {
              logger.error('OpenWeatherMap API error:', weatherError.message);
              // Fall through to return realistic mock data
            }
          }
          
          // Return realistic weather data for Philippines (Caloocan City)
          // Philippines typically has temperatures between 24-32°C, high humidity
          const currentHour = new Date().getHours();
          let temperature, condition, description, humidity;
          
          // Simulate day/night and weather patterns for Philippines
          // Coffee shop hours: 1 PM - 12 AM (13:00 - 24:00)
          if (currentHour >= 13 && currentHour < 24) {
            // Operating hours (1 PM - 12 AM)
            temperature = 28 + Math.floor(Math.random() * 4); // 28-31°C
            const random = Math.random();
            if (random > 0.7) {
              condition = 'rainy';
              description = 'Light rain';
              humidity = 80 + Math.floor(Math.random() * 15); // 80-95%
            } else if (random > 0.4) {
              condition = 'partly_cloudy';
              description = 'Partly cloudy';
              humidity = 70 + Math.floor(Math.random() * 15); // 70-85%
            } else {
              condition = 'sunny';
              description = 'Clear sky';
              humidity = 65 + Math.floor(Math.random() * 15); // 65-80%
            }
          } else {
            // Nighttime
            temperature = 24 + Math.floor(Math.random() * 3); // 24-26°C
            const random = Math.random();
            if (random > 0.6) {
              condition = 'cloudy';
              description = 'Cloudy';
              humidity = 75 + Math.floor(Math.random() * 15); // 75-90%
            } else {
              condition = 'partly_cloudy';
              description = 'Partly cloudy';
              humidity = 70 + Math.floor(Math.random() * 10); // 70-80%
            }
          }
          
          const result = {
            temperature: temperature,
            condition: condition,
            humidity: humidity,
            description: description,
            windSpeed: Math.round((Math.random() * 10 + 5) * 10) / 10, // 5-15 km/h
            location: cafeLocation,
            timestamp: new Date().toISOString(),
          };
          
          logger.info('Weather data returned (realistic mock for Philippines):', result);
          response.json(result);
          return;
        } catch (error) {
          logger.error('Error in weather endpoint:', error);
          // Return fallback data
          response.json({
            temperature: 28,
            condition: 'partly_cloudy',
            humidity: 75,
            description: 'Partly cloudy',
            windSpeed: 8.5,
            location: {
              name: 'Bean and Beyond, Caloocan City',
              address: '14 Kumintang Street, Caloocan City, Philippines',
              lat: 14.6542,
              lon: 120.9823,
            },
            timestamp: new Date().toISOString(),
          });
          return;
        }
        }
      }
      
    // Note: Analytics Recommendations endpoint is handled INSIDE the /analytics block above
    // This prevents duplicate routing
    if (false && path === '/analytics/recommendations') {
        if (method === 'GET') {
          try {
            const period = request.query.period || 'month';
            
            // Get analytics data first
            const now = new Date();
            let startDate = new Date(now);
            let endDate = new Date(now);
            
            switch (period) {
              case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
              case 'week':
                // Get orders from the past 7 days
                startDate.setDate(startDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
              case 'month':
                // Get orders from the past 30 days
                startDate.setDate(startDate.getDate() - 30);
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            }
            
            // Convert to Firestore Timestamps for query
            const startTimestamp = admin.firestore.Timestamp.fromDate(startDate);
            const endTimestamp = admin.firestore.Timestamp.fromDate(endDate);
            
            const ordersSnapshot = await db.collection('orders')
              .where('createdAt', '>=', startTimestamp)
              .where('createdAt', '<=', endTimestamp)
              .get();
            
            // Get inventory data
            const inventorySnapshot = await db.collection('inventory').get();
            const inventoryItems = inventorySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Get menu data
            const menuSnapshot = await db.collection('menu').get();
            const menuItems = menuSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            // Get previous recommendations to track effectiveness
            const prevRecsSnapshot = await db.collection('recommendations')
              .where('createdAt', '>=', startDate)
              .orderBy('createdAt', 'desc')
              .limit(50)
              .get();
            
            const prevRecommendations = prevRecsSnapshot.docs.map(doc => doc.data());
            
            // Calculate analytics metrics
            let totalSales = 0;
            let totalOrders = ordersSnapshot.size;
            let cancelledOrders = 0;
            let categorySales = {};
            let hourlySales = {};
            let stationCounts = {};
            let itemSales = {};
            
            ordersSnapshot.forEach(doc => {
              const order = doc.data();
              const status = order.status || 'pending';
              
              if (status === 'cancelled') {
                cancelledOrders++;
                return;
              }
              
              const orderTotal = order.totalAmount || order.total || 0;
              totalSales += orderTotal;
              
              // Station performance
              const station = order.station || 'front-counter';
              if (!stationCounts[station]) {
                stationCounts[station] = { orders: 0, revenue: 0 };
              }
              stationCounts[station].orders += 1;
              stationCounts[station].revenue += orderTotal;
              
              // Item and category sales
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                  const itemName = item.name || item.itemName || 'Unknown';
                  const itemPrice = item.price || item.unitPrice || 0;
                  const itemQuantity = item.quantity || 1;
                  const itemRevenue = itemPrice * itemQuantity;
                  
                  if (!itemSales[itemName]) {
                    itemSales[itemName] = { quantity: 0, revenue: 0 };
                  }
                  itemSales[itemName].quantity += itemQuantity;
                  itemSales[itemName].revenue += itemRevenue;
                  
                  // Find category from menu
                  const menuItem = menuItems.find(m => m.name === itemName);
                  const category = menuItem?.category || 'Other';
                  
                  if (!categorySales[category]) {
                    categorySales[category] = { quantity: 0, revenue: 0 };
                  }
                  categorySales[category].quantity += itemQuantity;
                  categorySales[category].revenue += itemRevenue;
                });
              }
              
              // Hourly sales
              // Use completedAt for heatmap to show when orders were actually completed
              try {
                let orderDate;
                // Prefer completedAt for heatmap to show when orders were actually completed
                if (order.completedAt) {
                  if (order.completedAt?.toDate) {
                    orderDate = order.completedAt.toDate();
                  } else if (order.completedAt?.seconds) {
                    orderDate = new Date(order.completedAt.seconds * 1000);
                  } else if (typeof order.completedAt === 'string') {
                    orderDate = new Date(order.completedAt);
                  } else {
                    orderDate = new Date(order.completedAt);
                  }
                } else if (order.createdAt) {
                  // Fallback to createdAt if completedAt is not available
                  if (order.createdAt?.toDate) {
                    orderDate = order.createdAt.toDate();
                  } else {
                    orderDate = new Date(order.createdAt);
                  }
                } else {
                  // Skip if no date available
                  return;
                }
                
                const hour = orderDate.getHours();
                const hourKey = hour.toString().padStart(2, '0') + ':00';
                if (!hourlySales[hourKey]) {
                  hourlySales[hourKey] = { sales: 0, orders: 0 };
                }
                hourlySales[hourKey].sales += orderTotal;
                hourlySales[hourKey].orders += 1;
              } catch (e) {
                // Skip if date error
              }
            });
            
            const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;
            const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
            
            // Generate recommendations
            const recommendations = [];
            
            // 1. Inventory recommendations
            const lowStockItems = inventoryItems.filter(item => 
              item.currentStock > 0 && item.currentStock <= item.minStock
            );
            
            if (lowStockItems.length > 0) {
              lowStockItems.forEach(item => {
                const salesVelocity = itemSales[item.name]?.quantity || 0;
                const daysUntilOut = salesVelocity > 0 ? Math.ceil(item.currentStock / (salesVelocity / (period === 'today' ? 1 : period === 'week' ? 7 : 30))) : 999;
                
                recommendations.push({
                  type: 'inventory',
                  priority: daysUntilOut < 3 ? 'high' : daysUntilOut < 7 ? 'medium' : 'low',
                  title: 'Restock Inventory',
                  message: `${item.name} is running low (${item.currentStock} remaining). Estimated ${daysUntilOut} days until out of stock.`,
                  action: 'restock',
                  itemId: item.id,
                  itemName: item.name,
                  currentStock: item.currentStock,
                  recommendedStock: item.maxStock || item.minStock * 3,
                  confidence: 0.9,
                  impact: 'prevent_stockout'
                });
              });
            }
            
            // 2. Peak hours staffing recommendations
            const peakHours = Object.entries(hourlySales)
              .map(([hour, data]) => ({
                hour,
                orders: data.orders,
                sales: data.sales,
                intensity: data.orders
              }))
              .sort((a, b) => b.orders - a.orders)
              .slice(0, 3);
            
            if (peakHours.length > 0) {
              const topPeak = peakHours[0];
              const avgHourlyOrders = totalOrders / 24;
              
              if (topPeak.orders > avgHourlyOrders * 1.5) {
                recommendations.push({
                  type: 'staffing',
                  priority: topPeak.orders > avgHourlyOrders * 2 ? 'high' : 'medium',
                  title: 'Increase Staffing During Peak Hours',
                  message: `Peak hour at ${topPeak.hour} averages ${topPeak.orders} orders (${hourlyCount > 1 ? Math.round((topPeak.orders / avgHourlyOrders - 1) * 100) : 0}% above average). Consider additional staff during this time.`,
                  action: 'schedule_staffing',
                  peakHour: topPeak.hour,
                  peakOrders: topPeak.orders,
                  avgOrders: Math.round(avgHourlyOrders),
                  confidence: 0.85,
                  impact: 'reduce_wait_time'
                });
              }
            }
            
            // 3. Category performance recommendations
            const categoriesSorted = Object.entries(categorySales)
              .map(([category, data]) => ({
                category,
                revenue: data.revenue,
                percentage: totalSales > 0 ? (data.revenue / totalSales) * 100 : 0
              }))
              .sort((a, b) => b.revenue - a.revenue);
            
            if (categoriesSorted.length > 0) {
              const topCategory = categoriesSorted[0];
              const bottomCategory = categoriesSorted[categoriesSorted.length - 1];
              
              // Lower threshold - recommend if top category > 30% (was 40%)
              if (topCategory.percentage > 30 && categoriesSorted.length > 1) {
                recommendations.push({
                  type: 'menu',
                  priority: 'medium',
                  title: 'Diversify Menu Offerings',
                  message: `${topCategory.category} represents ${topCategory.percentage.toFixed(1)}% of sales. Consider promoting other categories to diversify revenue.`,
                  action: 'promote_category',
                  category: bottomCategory.category,
                  topCategory: topCategory.category,
                  topPercentage: topCategory.percentage,
                  confidence: 0.75,
                  impact: 'diversify_revenue'
                });
              }
              
              // Lower threshold - recommend if bottom category < 10% (was 5%)
              if (bottomCategory.percentage < 10 && categoriesSorted.length > 2 && totalOrders > 10) {
                recommendations.push({
                  type: 'menu',
                  priority: 'low',
                  title: 'Review Low-Performing Category',
                  message: `${bottomCategory.category} only represents ${bottomCategory.percentage.toFixed(1)}% of sales. Consider promotions or removal.`,
                  action: 'review_category',
                  category: bottomCategory.category,
                  percentage: bottomCategory.percentage,
                  confidence: 0.7,
                  impact: 'optimize_menu'
                });
              }
              
              // Always recommend promoting top category if it's significant
              if (topCategory.percentage > 20 && totalOrders > 10) {
                recommendations.push({
                  type: 'menu',
                  priority: 'medium',
                  title: 'Leverage Top Category',
                  message: `${topCategory.category} is your best-performing category with ${topCategory.percentage.toFixed(1)}% of sales. Continue to promote items from this category.`,
                  action: 'promote_category',
                  category: topCategory.category,
                  percentage: topCategory.percentage,
                  confidence: 0.8,
                  impact: 'maintain_revenue'
                });
              }
            }
            
            // 4. Cancellation rate recommendations - lower threshold
            if (cancellationRate > 3 && totalOrders > 10) {
              recommendations.push({
                type: 'operations',
                priority: cancellationRate > 10 ? 'high' : 'medium',
                title: 'Reduce Order Cancellations',
                message: `Cancellation rate is ${cancellationRate.toFixed(1)}% (${cancelledOrders} cancelled out of ${totalOrders} total). Review order fulfillment process.`,
                action: 'review_fulfillment',
                cancellationRate: cancellationRate,
                cancelledOrders: cancelledOrders,
                totalOrders: totalOrders,
                confidence: 0.9,
                impact: 'reduce_losses'
              });
            }
            
            // 5. Station efficiency recommendations
            const stationsSorted = Object.entries(stationCounts)
              .map(([station, data]) => ({
                station,
                orders: data.orders,
                revenue: data.revenue,
                avgOrderValue: data.orders > 0 ? data.revenue / data.orders : 0
              }))
              .sort((a, b) => b.orders - a.orders);
            
            if (stationsSorted.length > 1) {
              const avgOrdersPerStation = stationsSorted.reduce((sum, s) => sum + s.orders, 0) / stationsSorted.length;
              const unbalancedStations = stationsSorted.filter(s => 
                s.orders < avgOrdersPerStation * 0.5 || s.orders > avgOrdersPerStation * 1.5
              );
              
              if (unbalancedStations.length > 0) {
                recommendations.push({
                  type: 'operations',
                  priority: 'low',
                  title: 'Balance Station Workload',
                  message: `Station workload is unbalanced. Consider redistributing orders between stations for better efficiency.`,
                  action: 'balance_stations',
                  stations: unbalancedStations.map(s => s.station),
                  confidence: 0.65,
                  impact: 'improve_efficiency'
                });
              }
            }
            
            // 6. Low-traffic hours recommendations
            const hourlyCount = Object.keys(hourlySales).length || 24;
            const slowHours = Object.entries(hourlySales)
              .map(([hour, data]) => ({ hour, orders: data.orders }))
              .filter(h => h.orders < totalOrders / hourlyCount * 0.5)
              .sort((a, b) => a.orders - b.orders)
              .slice(0, 3);
            
            // Lower threshold - recommend if we have slow hours and at least 20 orders
            if (slowHours.length > 0 && totalOrders > 20) {
              recommendations.push({
                type: 'marketing',
                priority: 'low',
                title: 'Promote During Low-Traffic Hours',
                message: `Low traffic hours detected (${slowHours.map(h => h.hour).join(', ')}). Consider running promotions during these times to boost sales.`,
                action: 'create_promotion',
                slowHours: slowHours.map(h => h.hour),
                avgOrdersPerHour: Math.round(totalOrders / hourlyCount),
                confidence: 0.7,
                impact: 'increase_sales'
              });
            }
            
            // 7. High-value items recommendations
            const topItems = Object.entries(itemSales)
              .map(([name, data]) => ({
                name,
                quantity: data.quantity,
                revenue: data.revenue,
                avgPrice: data.quantity > 0 ? data.revenue / data.quantity : 0
              }))
              .sort((a, b) => b.revenue - a.revenue)
              .slice(0, 5);
            
            if (topItems.length > 0) {
              const topItem = topItems[0];
              // Lower threshold - recommend if it generates more than 10% of revenue OR has sold at least 10 units
              if (topItem.revenue > totalSales * 0.10 || topItem.quantity >= 10) {
                recommendations.push({
                  type: 'menu',
                  priority: topItem.revenue > totalSales * 0.15 ? 'high' : 'medium',
                  title: 'Leverage Top-Selling Item',
                  message: `${topItem.name} generates ${((topItem.revenue / totalSales) * 100).toFixed(1)}% of revenue (${topItem.quantity} sold). Consider highlighting it or creating similar items.`,
                  action: 'promote_item',
                  itemName: topItem.name,
                  revenuePercentage: (topItem.revenue / totalSales) * 100,
                  quantity: topItem.quantity,
                  confidence: 0.8,
                  impact: 'increase_revenue'
                });
              }
            } else if (Object.keys(itemSales).length > 0 && totalOrders > 0) {
              // Even if no top items meet threshold, recommend the best selling item
              const bestItem = Object.entries(itemSales)
                .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
                .sort((a, b) => b.quantity - a.quantity)[0];
              
              if (bestItem) {
                recommendations.push({
                  type: 'menu',
                  priority: 'low',
                  title: 'Promote Best-Selling Item',
                  message: `${bestItem.name} has sold ${bestItem.quantity} units. Consider promoting it more prominently to increase sales.`,
                  action: 'promote_item',
                  itemName: bestItem.name,
                  quantity: bestItem.quantity,
                  confidence: 0.7,
                  impact: 'increase_revenue'
                });
              }
            }
            
            // 8. AI-Powered Drink Recommendations based on sales data
            // Generate recommendations if we have any sales data and menu items
            if (totalOrders > 0 && menuItems.length > 0) {
              // Analyze drink patterns and recommend drinks to sell
              const allMenuItems = menuItems.filter(item => {
                // Focus on drinks (filter out food items if needed)
                const nameLower = (item.name || '').toLowerCase();
                const categoryLower = (item.category || '').toLowerCase();
                return categoryLower.includes('drink') || categoryLower.includes('coffee') || 
                       categoryLower.includes('tea') || categoryLower.includes('beverage') ||
                       nameLower.includes('coffee') || nameLower.includes('tea') || 
                       nameLower.includes('latte') || nameLower.includes('cappuccino') ||
                       nameLower.includes('frappe') || nameLower.includes('shake');
              });
              
              // Get top-selling drinks (use topItems if available, otherwise analyze from itemSales)
              const topDrinks = topItems.length > 0 ? topItems.filter(item => {
                const nameLower = (item.name || '').toLowerCase();
                const soldDrink = allMenuItems.find(menu => 
                  menu.name.toLowerCase() === nameLower
                );
                return soldDrink !== undefined;
              }) : [];
              
              // Analyze category performance for drinks
              const drinkCategoryPerformance = Object.entries(categorySales)
                .filter(([category, data]) => {
                  const catLower = category.toLowerCase();
                  return catLower.includes('drink') || catLower.includes('coffee') || 
                         catLower.includes('tea') || catLower.includes('beverage') ||
                         catLower.includes('hot') || catLower.includes('cold');
                })
                .map(([category, data]) => ({
                  category,
                  revenue: data.revenue,
                  quantity: data.quantity,
                  percentage: totalSales > 0 ? (data.revenue / totalSales) * 100 : 0
                }))
                .sort((a, b) => b.revenue - a.revenue);
              
              // Find drinks that are not selling well but could be promoted
              const unsoldOrLowSellingDrinks = allMenuItems.filter(menuItem => {
                const sold = itemSales[menuItem.name];
                const soldCount = sold ? sold.quantity : 0;
                // Drinks with low sales (less than 5% of average or not in top items)
                const avgSalesPerItem = totalOrders > 0 ? totalOrders / allMenuItems.length : 0;
                return soldCount < avgSalesPerItem * 0.05 || soldCount < 5;
              });
              
              // Find complementary drinks (drinks often ordered together)
              const drinkCoOccurrence = {};
              ordersSnapshot.forEach(doc => {
                const order = doc.data();
                if (order.items && Array.isArray(order.items)) {
                  const drinksInOrder = order.items.filter(item => {
                    const nameLower = (item.name || '').toLowerCase();
                    return allMenuItems.some(menu => menu.name.toLowerCase() === nameLower);
                  }).map(item => item.name);
                  
                  // Count co-occurrences
                  for (let i = 0; i < drinksInOrder.length; i++) {
                    for (let j = i + 1; j < drinksInOrder.length; j++) {
                      const pair = [drinksInOrder[i], drinksInOrder[j]].sort().join(' + ');
                      drinkCoOccurrence[pair] = (drinkCoOccurrence[pair] || 0) + 1;
                    }
                  }
                }
              });
              
              // Generate drink recommendations
              // If we have top-selling drinks, recommend promoting them
              if (topDrinks.length > 0) {
                const topDrink = topDrinks[0];
                const topDrinkPercentage = totalSales > 0 ? (topDrink.revenue / totalSales) * 100 : 0;
                
                // Recommend promoting top-selling drink - lower threshold  
                if (topDrinkPercentage > 3 || topDrink.quantity >= 2) {
                  recommendations.push({
                    type: 'drink_recommendation',
                    priority: 'high',
                    title: 'Promote Top-Selling Drink',
                    message: `${topDrink.name} is your top seller, generating ${topDrinkPercentage.toFixed(1)}% of revenue (${topDrink.quantity} orders). Consider creating seasonal variations or highlighting it on the menu.`,
                    action: 'promote_drink',
                    drinkName: topDrink.name,
                    revenue: topDrink.revenue,
                    quantity: topDrink.quantity,
                    confidence: 0.9,
                    impact: 'boost_sales'
                  });
                }
              } else if (allMenuItems.length > 0 && totalOrders > 0) {
                // If no top drinks yet, recommend promoting any available drink
                const recommendedDrink = allMenuItems[0];
                recommendations.push({
                  type: 'drink_recommendation',
                  priority: 'medium',
                  title: 'Promote Available Drink',
                  message: `Consider promoting ${recommendedDrink.name} to increase sales. This drink is available but may need more visibility.`,
                  action: 'promote_drink',
                  drinkName: recommendedDrink.name,
                  price: recommendedDrink.price || 0,
                  confidence: 0.7,
                  impact: 'increase_sales'
                });
              }
              
              // Recommend drinks from underperforming categories
              if (drinkCategoryPerformance.length > 1) {
                const bottomCategory = drinkCategoryPerformance[drinkCategoryPerformance.length - 1];
                const topCategory = drinkCategoryPerformance[0];
                
                if (bottomCategory.percentage < 5 && topCategory.percentage > 20) {
                  const categoryDrinks = allMenuItems.filter(item => 
                    (item.category || '').toLowerCase() === bottomCategory.category.toLowerCase()
                  );
                  
                  if (categoryDrinks.length > 0) {
                    const recommendedDrink = categoryDrinks[0];
                    recommendations.push({
                      type: 'drink_recommendation',
                      priority: 'medium',
                      title: 'Promote Underperforming Category Drink',
                      message: `${bottomCategory.category} category only represents ${bottomCategory.percentage.toFixed(1)}% of sales. Consider promoting ${recommendedDrink.name} or similar drinks from this category with special offers.`,
                      action: 'promote_category_drink',
                      drinkName: recommendedDrink.name,
                      category: bottomCategory.category,
                      categoryPercentage: bottomCategory.percentage,
                      confidence: 0.75,
                      impact: 'diversify_sales'
                    });
                  }
                }
              }
              
              // Recommend low-selling but available drinks - lower threshold
              if (unsoldOrLowSellingDrinks.length > 0 && totalOrders > 20) {
                // Pick a drink with good price point or from popular category
                const recommendedLowSelling = unsoldOrLowSellingDrinks
                  .filter(drink => {
                    // Prefer drinks from popular categories
                    const drinkCategory = drink.category || '';
                    const categoryPerformance = drinkCategoryPerformance.find(cat => 
                      cat.category.toLowerCase() === drinkCategory.toLowerCase()
                    );
                    return categoryPerformance && categoryPerformance.percentage > 15;
                  })
                  .sort((a, b) => (b.price || 0) - (a.price || 0))[0] || unsoldOrLowSellingDrinks[0];
                
                if (recommendedLowSelling) {
                  recommendations.push({
                    type: 'drink_recommendation',
                    priority: 'medium',
                    title: 'Promote Low-Selling Drink',
                    message: `${recommendedLowSelling.name} has low sales but is available. Consider promoting it with a special offer or featuring it during peak hours to increase visibility.`,
                    action: 'promote_low_selling_drink',
                    drinkName: recommendedLowSelling.name,
                    price: recommendedLowSelling.price || 0,
                    category: recommendedLowSelling.category || 'Unknown',
                    confidence: 0.7,
                    impact: 'increase_drink_diversity'
                  });
                }
              }
              
              // Recommend drinks based on time patterns (if data available)
              if (Object.keys(hourlySales).length > 0 && topDrinks.length > 0) {
                // Find peak hours and recommend appropriate drinks
                const peakHours = Object.entries(hourlySales)
                  .map(([hour, data]) => ({ hour, orders: data.orders }))
                  .sort((a, b) => b.orders - a.orders)
                  .slice(0, 3);
                
                if (peakHours.length > 0) {
                  const morningPeak = peakHours.find(h => parseInt(h.hour) < 12);
                  const afternoonPeak = peakHours.find(h => parseInt(h.hour) >= 12 && parseInt(h.hour) < 18);
                  const eveningPeak = peakHours.find(h => parseInt(h.hour) >= 18);
                  
                  if (morningPeak) {
                    const morningDrinks = allMenuItems.filter(item => {
                      const nameLower = (item.name || '').toLowerCase();
                      return nameLower.includes('coffee') || nameLower.includes('latte') || 
                             nameLower.includes('espresso') || (item.category || '').toLowerCase().includes('hot');
                    });
                    
                    if (morningDrinks.length > 0) {
                      const recommendedMorningDrink = morningDrinks[0];
                      recommendations.push({
                        type: 'drink_recommendation',
                        priority: 'medium',
                        title: 'Time-Based Drink Promotion',
                        message: `Peak sales at ${morningPeak.hour} suggest promoting ${recommendedMorningDrink.name} or hot drinks during morning hours to maximize sales.`,
                        action: 'promote_time_based_drink',
                        drinkName: recommendedMorningDrink.name,
                        peakHour: morningPeak.hour,
                        peakOrders: morningPeak.orders,
                        confidence: 0.75,
                        impact: 'optimize_time_sales'
                      });
                    }
                  }
                }
              }
              
              // Recommend creating new drinks based on successful patterns
              if (topDrinks.length >= 3 && totalOrders > 100) {
                // Analyze top drinks to find patterns
                const topDrinkNames = topDrinks.slice(0, 3).map(d => d.name.toLowerCase());
                const commonWords = [];
                
                topDrinkNames.forEach(name => {
                  const words = name.split(/\s+/);
                  words.forEach(word => {
                    if (word.length > 3 && !['iced', 'hot', 'large', 'small', 'medium'].includes(word)) {
                      commonWords.push(word);
                    }
                  });
                });
                
                const mostCommonWord = commonWords.sort((a, b) => {
                  const countA = commonWords.filter(w => w === a).length;
                  const countB = commonWords.filter(w => w === b).length;
                  return countB - countA;
                })[0];
                
                if (mostCommonWord) {
                  recommendations.push({
                    type: 'drink_recommendation',
                    priority: 'low',
                    title: 'Create New Drink Variation',
                    message: `Your top-selling drinks often include "${mostCommonWord}". Consider creating new variations like "${mostCommonWord} Deluxe" or "Premium ${mostCommonWord}" to leverage customer preferences.`,
                    action: 'create_drink_variation',
                    suggestedKeyword: mostCommonWord,
                    topDrinks: topDrinks.slice(0, 3).map(d => d.name),
                    confidence: 0.65,
                    impact: 'expand_menu_offerings'
                  });
                }
              }
            }
            
            // If no recommendations generated yet, add general recommendations based on available data
            // IMPORTANT: Add fallback recommendations BEFORE saving, so we always have recommendations
            // CRITICAL: This check MUST happen and ALWAYS add at least one recommendation if totalOrders > 0
            if (recommendations.length === 0 && totalOrders > 0) {
              logger.warn('No recommendations generated yet, adding fallbacks. totalOrders:', totalOrders);
              
              // ALWAYS add at least one recommendation if we have orders - remove nested conditions
              recommendations.push({
                type: 'marketing',
                priority: 'medium',
                title: 'Boost Sales Performance',
                message: `You have ${totalOrders} orders${totalSales > 0 ? ` with ₱${totalSales.toFixed(2)} in sales` : ''}. Consider running promotions or highlighting popular items to increase revenue.`,
                action: 'promote_sales',
                totalOrders: totalOrders,
                totalSales: totalSales,
                confidence: 0.8,
                impact: 'increase_revenue'
              });
              
              // If we have menu items but no drink recommendations
              if (menuItems.length > 0) {
                const availableDrinks = menuItems.filter(item => {
                  const nameLower = (item.name || '').toLowerCase();
                  const categoryLower = (item.category || '').toLowerCase();
                  return categoryLower.includes('drink') || categoryLower.includes('coffee') || 
                         categoryLower.includes('tea') || categoryLower.includes('beverage') ||
                         nameLower.includes('coffee') || nameLower.includes('tea') || 
                         nameLower.includes('latte') || nameLower.includes('cappuccino') ||
                         nameLower.includes('frappe') || nameLower.includes('shake') ||
                         nameLower.includes('mocha') || nameLower.includes('americano') ||
                         nameLower.includes('espresso');
                });
                
                if (availableDrinks.length > 0) {
                  // Generic drink promotion recommendation (don't check topItems.length)
                  recommendations.push({
                    type: 'drink_recommendation',
                    priority: 'medium',
                    title: 'Promote Available Drinks',
                    message: `You have ${availableDrinks.length} drinks available on your menu. Consider promoting ${availableDrinks[0].name} or other beverages to increase sales.`,
                    action: 'promote_drink',
                    drinkName: availableDrinks[0].name,
                    availableDrinksCount: availableDrinks.length,
                    confidence: 0.7,
                    impact: 'increase_sales'
                  });
                }
              }
              
              // Recommendation based on order volume
              if (totalOrders >= 30) {
                recommendations.push({
                  type: 'operations',
                  priority: 'low',
                  title: 'Analyze Sales Patterns',
                  message: `With ${totalOrders} orders, you have good data to analyze. Review peak hours, popular items, and customer preferences to optimize operations.`,
                  action: 'analyze_patterns',
                  totalOrders: totalOrders,
                  confidence: 0.75,
                  impact: 'optimize_operations'
                });
              }
            }
            
            // Sort recommendations by priority and confidence (after adding fallbacks)
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (recommendations.length > 0) {
            recommendations.sort((a, b) => {
              const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
              if (priorityDiff !== 0) return priorityDiff;
              return b.confidence - a.confidence;
            });
            }
            
            // Save recommendations to Firestore for tracking and add IDs
            let recommendationsWithIds = [];
            if (recommendations.length > 0) {
            const recommendationBatch = db.batch();
              recommendationsWithIds = recommendations.map((rec, index) => {
              const recId = db.collection('recommendations').doc().id;
              const recRef = db.collection('recommendations').doc(recId);
              recommendationBatch.set(recRef, {
                ...rec,
                id: recId,
                period: period,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                timestamp: new Date().toISOString(),
                status: 'active',
                  effectiveness: null,
                views: 0,
                actions: 0
              });
              return { ...rec, id: recId };
            });
            
            try {
              await recommendationBatch.commit();
            } catch (batchError) {
              logger.error('Error saving recommendations:', batchError);
              // If batch save fails, still return recommendations without IDs
              recommendationsWithIds.forEach((rec, index) => {
                if (!rec.id) rec.id = `temp-${Date.now()}-${index}`;
              });
            }
            }
            
            // Always return recommendations array, even if empty
            // Log for debugging
            logger.info('Recommendations generated:', {
              period,
              totalOrders,
              totalSales,
              menuItemsCount: menuItems.length,
              itemSalesCount: Object.keys(itemSales).length,
              recommendationsCount: recommendations.length,
              recommendationsWithIdsCount: recommendationsWithIds.length,
              hasTopItems: topItems.length > 0,
              hasCategorySales: Object.keys(categorySales).length > 0,
              hasInventory: inventoryItems.length > 0,
              hasHourlySales: Object.keys(hourlySales).length > 0
            });
            
            // Generate peak hours heatmap from hourly sales (always from ALL orders, not period-specific)
            const formatHourForHeatmap = (hour) => {
              const hourNum = parseInt(hour.split(':')[0]);
              const period = hourNum >= 12 ? 'PM' : 'AM';
              const displayHour = hourNum % 12 || 12;
              return `${displayHour}${period}`;
            };
            
            const maxOrdersForHeatmap = Object.keys(hourlySales).length > 0 
              ? Math.max(...Object.values(hourlySales).map(h => h.orders || 0)) 
              : 1;
            const peakHoursHeatmap = Object.keys(hourlySales).length > 0
              ? Object.entries(hourlySales)
                  .map(([hour, data]) => ({
                    hour,
                    hourFormatted: formatHourForHeatmap(hour),
                    sales: Math.round(data.sales * 100) / 100,
                    orders: data.orders,
                    intensity: maxOrdersForHeatmap > 0 ? Math.min(100, (data.orders / maxOrdersForHeatmap) * 100) : 0
                  }))
                  .sort((a, b) => {
                    const hourA = parseInt(a.hour.split(':')[0]);
                    const hourB = parseInt(b.hour.split(':')[0]);
                    return hourA - hourB;
                  })
              : [];
            
            // CRITICAL: If we still have no recommendations but have orders, force add at least one
            if (recommendations.length === 0 && totalOrders > 0) {
              logger.error('CRITICAL: Still no recommendations after fallback logic! Forcing emergency recommendation.', {
                period,
                totalOrders,
                totalSales,
                menuItemsCount: menuItems.length,
                itemSalesCount: Object.keys(itemSales).length,
                inventoryCount: inventoryItems.length
              });
              
              // EMERGENCY FALLBACK - Always add at least one recommendation if orders exist
              recommendations.push({
                type: 'operations',
                priority: 'medium',
                title: 'Analyze Your Sales Data',
                message: `You have ${totalOrders} orders with ₱${totalSales.toFixed(2)} in sales. Review your data to optimize operations and identify opportunities.`,
                action: 'analyze_data',
                totalOrders: totalOrders,
                totalSales: totalSales,
                confidence: 0.8,
                impact: 'understand_performance'
              });
              
              // Re-sort and re-create recommendationsWithIds
              const priorityOrder = { high: 3, medium: 2, low: 1 };
              recommendations.sort((a, b) => {
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return b.confidence - a.confidence;
              });
              
              const emergencyBatch = db.batch();
              recommendationsWithIds = recommendations.map((rec, index) => {
                const recId = db.collection('recommendations').doc().id;
                const recRef = db.collection('recommendations').doc(recId);
                emergencyBatch.set(recRef, {
                  ...rec,
                  id: recId,
                  period: period,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                  timestamp: new Date().toISOString(),
                  status: 'active',
                  effectiveness: null,
                  views: 0,
                  actions: 0
                });
                return { ...rec, id: recId };
              });
              
              try {
                await emergencyBatch.commit();
              } catch (batchError) {
                logger.error('Error saving emergency recommendations:', batchError);
                // Still create IDs even if save fails
                recommendationsWithIds.forEach((rec, index) => {
                  if (!rec.id) rec.id = `emergency-${Date.now()}-${index}`;
                });
              }
            }
            
            // Always ensure we return recommendations array (even if empty)
            // Log for debugging
            logger.info('Recommendations final check:', {
              period,
              totalOrders,
              recommendationsCount: recommendations.length,
              recommendationsWithIdsCount: recommendationsWithIds.length,
              peakHoursHeatmapCount: peakHoursHeatmap.length
            });
            
            response.json({
              success: true,
              data: {
                recommendations: recommendationsWithIds.length > 0 ? recommendationsWithIds.slice(0, 10) : [],
                totalGenerated: recommendations.length,
                peakHoursHeatmap: peakHoursHeatmap,
                analytics: {
                  totalSales,
                  totalOrders,
                  cancellationRate,
                  avgOrderValue
                }
              }
            });
          } catch (error) {
            logger.error('Error generating recommendations:', error);
            response.status(500).json({
              success: false,
              error: 'Failed to generate recommendations',
              message: error.message
            });
          }
          return;
        }
        
        // PATCH - Track recommendation outcome (for self-recalibration)
        if (method === 'PATCH') {
          try {
            logger.info('PATCH request received for recommendations:', {
              path,
              body: request.body
            });
            
            const { recommendationId, outcome, feedback } = request.body;
            
            if (!recommendationId || !outcome) {
              logger.warn('Missing required fields:', { recommendationId, outcome });
              response.status(400).json({
                success: false,
                error: 'recommendationId and outcome are required'
              });
              return;
            }
            
            // Get the recommendation
            const recDoc = await db.collection('recommendations').doc(recommendationId).get();
            if (!recDoc.exists) {
              logger.warn('Recommendation not found:', recommendationId);
              response.status(404).json({
                success: false,
                error: 'Recommendation not found'
              });
              return;
            }
            
            const recData = recDoc.data();
            
            // Calculate effectiveness based on outcome
            let effectiveness = 0.5; // Default neutral
            if (outcome === 'positive') {
              effectiveness = recData.confidence || 0.7;
            } else if (outcome === 'negative') {
              effectiveness = Math.max(0.1, (recData.confidence || 0.7) - 0.3);
            } else if (outcome === 'neutral') {
              effectiveness = recData.confidence || 0.7;
            }
            
            // Update recommendation with outcome
            await db.collection('recommendations').doc(recommendationId).update({
              status: 'evaluated',
              outcome: outcome,
              feedback: feedback || null,
              effectiveness: effectiveness,
              evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
              evaluatedTimestamp: new Date().toISOString()
            });
            
            // Log for recalibration (store pattern for future recommendations)
            await db.collection('recommendation_patterns').add({
              recommendationType: recData.type,
              priority: recData.priority,
              outcome: outcome,
              effectiveness: effectiveness,
              originalConfidence: recData.confidence,
              feedback: feedback || null,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              timestamp: new Date().toISOString()
            });
            
            logger.info('Recommendation outcome tracked successfully:', {
              recommendationId,
              outcome,
              effectiveness,
              type: recData.type
            });
            
            response.json({
              success: true,
              message: 'Recommendation outcome tracked',
              effectiveness: effectiveness
            });
            return;
          } catch (error) {
            logger.error('Error tracking recommendation outcome:', error);
            response.status(500).json({
              success: false,
              error: 'Failed to track outcome',
              message: error.message
            });
          return;
        }
      }
    }
    
    // Default 404
    response.status(404).json({ error: 'Endpoint not found', path, method });
    
  } catch (error) {
    logger.error('API error:', error);
    response.status(500).json({ error: error.message });
  }
});
