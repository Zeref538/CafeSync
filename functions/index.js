const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

// Menu management functions
exports.api = onRequest(async (request, response) => {
  const db = admin.firestore();
  
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  
  const path = request.path;
  
  logger.info(`Menu API request: ${request.method} ${path}`);
  console.log(`Menu API request: ${request.method} ${path}`, request.body);
  
  try {
    if (path === '/menu' && request.method === 'GET') {
      // Get all menu items
      const menuSnapshot = await db.collection('menu').get();
      const menuItems = [];
      
      menuSnapshot.forEach(doc => {
        const data = doc.data();
        logger.info(`Menu item data for ${doc.id}:`, JSON.stringify(data));
        console.log(`Menu item data for ${doc.id}:`, JSON.stringify(data));
        menuItems.push({
          id: doc.id,
          ...data
        });
      });
      
      logger.info(`Returning ${menuItems.length} menu items`);
      response.json({ data: menuItems });
      
    } else if (path === '/menu' && request.method === 'POST') {
      // Add new menu item
      const menuData = request.body;
      
      logger.info('POST menu item data:', JSON.stringify(menuData));
      console.log('POST menu item data:', JSON.stringify(menuData));
      
      // Validate required fields
      if (!menuData.name || !menuData.category) {
        response.status(400).json({ error: 'Name and category are required' });
        return;
      }
      
      // Use the provided ID or generate a new one
      if (menuData.id) {
        const { id, ...dataToStore } = menuData;
        await db.collection('menu').doc(id.toString()).set(dataToStore);
        response.status(200).json({ 
          success: true, 
          id: id.toString(),
          message: 'Menu item added successfully' 
        });
      } else {
        const docRef = await db.collection('menu').add(menuData);
        response.status(200).json({ 
          success: true, 
          id: docRef.id,
          message: 'Menu item added successfully' 
        });
      }
      
    } else if (path === '/menu' && request.method === 'PUT') {
      // Update menu item
      const menuData = request.body;
      
      logger.info('PUT menu item data:', JSON.stringify(menuData));
      console.log('PUT menu item data:', JSON.stringify(menuData));
      
      const { id, ...updateData } = menuData;
      
      if (!id) {
        response.status(400).json({ error: 'Menu item ID is required' });
        return;
      }
      
      logger.info(`Updating menu item ${id} with data:`, JSON.stringify(updateData));
      console.log(`Updating menu item ${id} with data:`, JSON.stringify(updateData));
      
      await db.collection('menu').doc(id.toString()).set(updateData, { merge: true });
      
      // Log what was saved
      const savedDoc = await db.collection('menu').doc(id.toString()).get();
      logger.info(`Saved menu item data:`, JSON.stringify(savedDoc.data()));
      console.log(`Saved menu item data:`, JSON.stringify(savedDoc.data()));
      
      response.status(200).json({ 
        success: true, 
        message: 'Menu item updated successfully' 
      });
      
    } else if (path.startsWith('/menu/') && request.method === 'DELETE') {
      // Delete menu item
      const menuId = path.split('/')[2];
      
      if (!menuId) {
        response.status(400).json({ error: 'Menu item ID is required' });
        return;
      }
      
      await db.collection('menu').doc(menuId.toString()).delete();
      
      response.status(200).json({ 
        success: true, 
        message: 'Menu item deleted successfully' 
      });
      
    } else {
      logger.info(`Unhandled path: ${path} with method: ${request.method}`);
      console.log(`Unhandled path: ${path} with method: ${request.method}`);
      response.status(404).json({ error: 'Endpoint not found', path: path, method: request.method });
    }
    
  } catch (error) {
    logger.error('Menu API error:', error);
    console.error('Menu API error:', error);
    response.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Hello World function
exports.helloWorld = onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// OpenAI integration function
exports.generateText = onCall(async (request) => {
  try {
    const { prompt } = request.data;
    
    if (!prompt) {
      throw new Error("Prompt is required");
    }

    // This is where you would integrate with OpenAI
    // For now, we'll return a mock response
    const response = {
      text: `Generated response for: ${prompt}`,
      timestamp: new Date().toISOString()
    };

    logger.info("Text generation completed", {prompt, response});
    return response;
  } catch (error) {
    logger.error("Error in generateText function", error);
    throw new Error(`Text generation failed: ${error.message}`);
  }
});

// Order processing function (callable instead of trigger)
exports.processOrder = onCall(async (request) => {
  try {
    const { orderId, orderData } = request.data;
    
    if (!orderId || !orderData) {
      throw new Error("Order ID and order data are required");
    }

    logger.info(`Processing order: ${orderId}`, orderData);
    
    // Add any processing logic here
    // For example, send notifications, update inventory, etc.
    
    return { 
      success: true, 
      message: `Order ${orderId} processed successfully`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error("Error processing order", error);
    throw new Error(`Order processing failed: ${error.message}`);
  }
});

// Update order status function
exports.updateOrderStatus = onCall(async (request) => {
  try {
    const { orderId, status } = request.data;
    
    if (!orderId || !status) {
      throw new Error("Order ID and status are required");
    }

    await admin.firestore().collection("orders").doc(orderId).update({
      status: status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`Order ${orderId} status updated to ${status}`);
    return { success: true, message: "Order status updated successfully" };
  } catch (error) {
    logger.error("Error updating order status", error);
    throw new Error(`Failed to update order status: ${error.message}`);
  }
});

// Real-time order synchronization - when new order is created
exports.onOrderCreated = onDocumentCreated("orders/{orderId}", async (event) => {
  try {
    const orderData = event.data.data();
    const orderId = event.params.orderId;
    
    logger.info(`New order created: ${orderId}`, orderData);
    
    // Create analytics record for the order
    await admin.firestore().collection("analytics").doc(`sale-${orderId}`).set({
      id: `sale-${orderId}`,
      orderId: orderId,
      customerId: orderData.customer || 'anonymous',
      amount: orderData.totalAmount || 0,
      items: orderData.items || [],
      timestamp: orderData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      station: orderData.station || 'front-counter',
      paymentMethod: orderData.paymentMethod || 'cash',
      status: 'completed', // Assume payment is completed when order is created
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Update daily sales counter
    const today = new Date().toISOString().split('T')[0];
    const dailySalesRef = admin.firestore().collection("daily_sales").doc(today);
    
    await dailySalesRef.set({
      date: today,
      totalSales: admin.firestore.FieldValue.increment(orderData.totalAmount || 0),
      totalOrders: admin.firestore.FieldValue.increment(1),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    // Update staff performance if staffId is provided
    if (orderData.staffId) {
      const staffRef = admin.firestore().collection("staff_performance").doc(orderData.staffId);
      await staffRef.set({
        ordersCompleted: admin.firestore.FieldValue.increment(1),
        salesGenerated: admin.firestore.FieldValue.increment(orderData.totalAmount || 0),
        lastOrderAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    logger.info(`Analytics updated for order: ${orderId}`);
    
  } catch (error) {
    logger.error("Error processing new order", error);
  }
});

// Real-time order synchronization - when order status is updated
exports.onOrderUpdated = onDocumentUpdated("orders/{orderId}", async (event) => {
  try {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const orderId = event.params.orderId;
    
    // Only process if status changed
    if (beforeData.status !== afterData.status) {
      logger.info(`Order ${orderId} status changed from ${beforeData.status} to ${afterData.status}`);
      
      // Update analytics record
      const analyticsRef = admin.firestore().collection("analytics").doc(`sale-${orderId}`);
      await analyticsRef.update({
        status: afterData.status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // If order is completed, update completion metrics
      if (afterData.status === 'completed') {
        const completionTime = new Date(afterData.updatedAt) - new Date(afterData.createdAt);
        await analyticsRef.update({
          completionTime: completionTime,
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
  } catch (error) {
    logger.error("Error processing order update", error);
  }
});

// Sync order data across all devices
exports.syncOrderData = onCall(async (request) => {
  try {
    const { orderId, station, action, data } = request.data;
    
    if (!orderId || !station || !action) {
      throw new Error("Order ID, station, and action are required");
    }
    
    logger.info(`Syncing order ${orderId} from ${station}`, { action, data });
    
    // Update the order document
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const updateData = {
      ...data,
      lastUpdatedBy: station,
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    await orderRef.update(updateData);
    
    // Create a sync log entry
    await admin.firestore().collection("sync_logs").add({
      orderId,
      station,
      action,
      data: updateData,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { 
      success: true, 
      message: `Order ${orderId} synced successfully`,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    logger.error("Error syncing order data", error);
    throw new Error(`Failed to sync order data: ${error.message}`);
  }
});

// Get real-time analytics data
exports.getAnalyticsData = onCall(async (request) => {
  try {
    const { period = 'today', type = 'sales' } = request.data;
    
    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    }
    
    let query = admin.firestore().collection("analytics")
      .where("timestamp", ">=", startDate)
      .where("timestamp", "<=", endDate);
    
    if (type === 'sales') {
      query = query.where("status", "==", "completed");
    }
    
    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Calculate metrics
    const totalSales = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalOrders = data.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    return {
      success: true,
      data: {
        period,
        type,
        totalSales: Math.round(totalSales * 100) / 100,
        totalOrders,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        records: data
      }
    };
    
  } catch (error) {
    logger.error("Error getting analytics data", error);
    throw new Error(`Failed to get analytics data: ${error.message}`);
  }
});

// Store completed order for analysis
exports.storeCompletedOrder = onCall(async (request) => {
  try {
    const { order } = request.data;
    
    if (!order || !order.id) {
      throw new Error("Order data with ID is required");
    }

    const db = admin.firestore();
    const storage = admin.storage();
    
    const completedOrder = {
      ...order,
      completedAt: new Date().toISOString(),
      storedAt: new Date().toISOString(),
      analysisData: {
        totalPrepTime: calculatePrepTime(order),
        orderValue: order.totalAmount,
        itemCount: order.items.length,
        customerType: order.customer === 'Takeout' ? 'takeout' : 'dine-in',
        paymentMethod: order.paymentMethod,
        staffId: order.staffId
      }
    };

    // Store in Firestore
    await db.collection('completedOrders').doc(order.id).set(completedOrder);

    // Store as JSON file in Firebase Storage for backup/analysis
    const fileName = `completed-orders/${new Date().toISOString().split('T')[0]}/${order.id}.json`;
    const file = storage.bucket().file(fileName);
    
    await file.save(JSON.stringify(completedOrder, null, 2), {
      metadata: {
        contentType: 'application/json',
        metadata: {
          orderId: order.id,
          completedAt: completedOrder.completedAt,
          orderNumber: order.orderNumber?.toString() || 'unknown'
        }
      }
    });

    logger.info("Completed order stored", {orderId: order.id, fileName});
    return {
      success: true,
      message: 'Completed order stored successfully',
      orderId: order.id
    };
  } catch (error) {
    logger.error("Error storing completed order", error);
    throw new Error(`Failed to store completed order: ${error.message}`);
  }
});

// Get completed orders analytics
exports.getCompletedOrdersAnalytics = onCall(async (request) => {
  try {
    const { startDate, endDate } = request.data || {};
    
    const db = admin.firestore();
    let query = db.collection('completedOrders').orderBy('completedAt', 'desc');
    
    if (startDate) {
      query = query.where('completedAt', '>=', startDate);
    }
    if (endDate) {
      query = query.where('completedAt', '<=', endDate);
    }
    
    const snapshot = await query.limit(1000).get();
    const completedOrders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    if (completedOrders.length === 0) {
      return {
        success: true,
        data: {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          averagePrepTime: 0,
          topItems: [],
          paymentMethods: {},
          customerTypes: {},
          hourlyDistribution: {}
        }
      };
    }

    // Calculate analytics
    const totalRevenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const averageOrderValue = totalRevenue / completedOrders.length;
    
    const prepTimes = completedOrders.map(order => order.analysisData?.totalPrepTime || 0);
    const averagePrepTime = prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length;

    // Top items analysis
    const itemCounts = {};
    completedOrders.forEach(order => {
      order.items.forEach(item => {
        const key = item.name;
        itemCounts[key] = (itemCounts[key] || 0) + item.quantity;
      });
    });
    const topItems = Object.entries(itemCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Payment methods
    const paymentMethods = {};
    completedOrders.forEach(order => {
      const method = order.paymentMethod || 'unknown';
      paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    });

    // Customer types
    const customerTypes = {};
    completedOrders.forEach(order => {
      const type = order.analysisData?.customerType || 'unknown';
      customerTypes[type] = (customerTypes[type] || 0) + 1;
    });

    // Hourly distribution
    const hourlyDistribution = {};
    completedOrders.forEach(order => {
      const hour = new Date(order.completedAt).getHours().toString().padStart(2, '0');
      hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
    });

    const analyticsData = {
      totalOrders: completedOrders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      averagePrepTime: Math.round(averagePrepTime * 100) / 100,
      topItems,
      paymentMethods,
      customerTypes,
      hourlyDistribution
    };

    logger.info("Completed orders analytics retrieved", {count: completedOrders.length});
    return {
      success: true,
      data: analyticsData,
      count: completedOrders.length
    };
  } catch (error) {
    logger.error("Error retrieving completed orders analytics", error);
    throw new Error(`Analytics retrieval failed: ${error.message}`);
  }
});

// Helper function to calculate prep time
function calculatePrepTime(order) {
  try {
    const createdAt = new Date(order.createdAt);
    const completedAt = new Date(order.completedAt || order.updatedAt);
    return (completedAt - createdAt) / 1000 / 60; // Convert to minutes
  } catch (error) {
    return 0;
  }
}
