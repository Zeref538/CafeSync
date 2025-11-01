const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Set global options
setGlobalOptions({ maxInstances: 10 });

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
      
      logger.info(`Normalized path: ${path}`);
    
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
          const docRef = await db.collection('inventory').add(inventoryData);
          const createdItem = { id: docRef.id, ...inventoryData };
          logger.info('Inventory item created:', createdItem);
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
            await db.collection('inventory').doc(id).set(dataToStore, { merge: true });
            logger.info('Inventory item updated:', id);
            response.json({ success: true });
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
        const itemId = request.query.id;
        logger.info('Deleting inventory item:', itemId);
        
        try {
          if (itemId) {
            await db.collection('inventory').doc(itemId).delete();
            logger.info('Inventory item deleted:', itemId);
            response.json({ success: true });
          } else {
            response.status(400).json({ error: 'Item ID is required' });
          }
        } catch (error) {
          logger.error('Error deleting inventory item:', error);
          response.status(500).json({ error: 'Failed to delete inventory item', message: error.message });
        }
        return;
      }
      
      if (path === '/inventory/alerts/low-stock' || path === '/alerts/low-stock') {
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
        
        const updateData = {
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        
        // Add completion timestamp when order is completed
        if (status === 'completed') {
          updateData.completedAt = admin.firestore.FieldValue.serverTimestamp();
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
          
          todayOrders.forEach(doc => {
            const order = doc.data();
            totalSales += order.totalAmount || order.total || 0;
            
            if (order.status === 'completed') {
              completedOrders++;
              
              // Calculate delivery time if we have completion timestamp
              if (order.completedAt) {
                const createdAt = new Date(order.createdAt);
                const completedAt = new Date(order.completedAt);
                const deliveryTime = (completedAt - createdAt) / 1000 / 60; // minutes
                deliveryTimes.push(deliveryTime);
              }
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
      
      if (path === '/analytics/staff') {
        const snapshot = await db.collection('staff_performance').get();
        const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        response.json({ success: true, data: { staffPerformance: staff } });
        return;
      }
      
      if (path.startsWith('/analytics/sales')) {
        try {
          const period = request.query.period || 'today';
          
          // Calculate date range based on period
          let startDate = new Date();
          let endDate = new Date();
    
    switch (period) {
      case 'today':
              startDate.setHours(0, 0, 0, 0);
              endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
              startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
              startDate.setMonth(startDate.getMonth() - 1);
        break;
          }
          
          // Get orders for the period
          const ordersSnapshot = await db.collection('orders')
            .where('createdAt', '>=', startDate)
            .where('createdAt', '<=', endDate)
            .get();
          
          let totalSales = 0;
          let totalOrders = ordersSnapshot.size;
          let itemSales = {};
          let hourlySales = {};
          
          ordersSnapshot.forEach(doc => {
            const order = doc.data();
            const orderTotal = order.totalAmount || order.total || 0;
            totalSales += orderTotal;
            
            // Track item sales for top selling items
            if (order.items && Array.isArray(order.items)) {
              order.items.forEach(item => {
                const itemName = item.name || item.itemName || 'Unknown Item';
                if (!itemSales[itemName]) {
                  itemSales[itemName] = { quantity: 0, revenue: 0 };
                }
                itemSales[itemName].quantity += item.quantity || 1;
                itemSales[itemName].revenue += (item.price || item.unitPrice || 0) * (item.quantity || 1);
              });
            }
            
            // Track hourly sales
            const orderDate = new Date(order.createdAt);
            const hour = orderDate.getHours();
            const hourKey = `${hour.toString().padStart(2, '0')}:00`;
            if (!hourlySales[hourKey]) {
              hourlySales[hourKey] = { sales: 0, orders: 0 };
            }
            hourlySales[hourKey].sales += orderTotal;
            hourlySales[hourKey].orders += 1;
          });
          
          // Calculate top selling items
          const topSellingItems = Object.entries(itemSales)
            .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
          
          response.json({
      success: true,
      data: {
        period,
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
              averageOrderValue: totalOrders > 0 ? Math.round((totalSales / totalOrders) * 100) / 100 : 0,
              groupedData: hourlySales,
              topSellingItems
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
              averageOrderValue: 0,
              groupedData: {},
              topSellingItems: []
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
      
      // GET /menu - Get all menu items
      if (cleanPath === '/menu' && method === 'GET') {
        const snapshot = await db.collection('menu').get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Clean up old ingredients that might not exist in inventory
        // Get inventory items to validate ingredients
        const inventorySnapshot = await db.collection('inventory').get();
        const inventoryItemNames = inventorySnapshot.docs.map(doc => doc.data().name);
        
        // Filter ingredients for each menu item to only include valid inventory items
        // Remove old ingredients like "milk", "water", "ice" that don't exist in inventory
        const cleanedItems = items.map(item => {
          if (item.ingredients && Array.isArray(item.ingredients)) {
            const filteredIngredients = item.ingredients.filter(ingredient => 
              inventoryItemNames.includes(ingredient)
            );
            // If ingredients were filtered out, update the item in Firestore to permanently remove old ingredients
            if (filteredIngredients.length !== item.ingredients.length) {
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
        });
        
        response.json({ success: true, data: cleanedItems });
        return;
      }
      
      // POST /menu - Create new menu item
      if (cleanPath === '/menu' && method === 'POST') {
        const menuData = request.body;
        logger.info('Creating menu item:', menuData);
        
        try {
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
      const deleteMatch = path.match(/\/(?:api\/)?menu\/(.+)$/);
      if (deleteMatch && method === 'DELETE') {
        const itemId = deleteMatch[1];
        logger.info('Deleting menu item:', itemId);
        
        try {
          await db.collection('menu').doc(itemId.toString()).delete();
          logger.info('Menu item deleted:', itemId);
          response.json({ success: true });
        } catch (error) {
          logger.error('Error deleting menu item:', error);
          response.status(500).json({ error: 'Failed to delete menu item', message: error.message });
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
    
    // Default 404
    response.status(404).json({ error: 'Endpoint not found', path, method });
    
  } catch (error) {
    logger.error('API error:', error);
    response.status(500).json({ error: error.message });
  }
});
