const {setGlobalOptions} = require("firebase-functions");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 10 });

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
