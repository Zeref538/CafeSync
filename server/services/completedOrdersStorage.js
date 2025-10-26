const admin = require('firebase-admin');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

class CompletedOrdersStorage {
  constructor() {
    this.db = null;
    this.storage = null;
    this.localFilePath = path.join(__dirname, '../data/completed-orders.json');
    this.completedOrderIds = new Set(); // Cache for completed order IDs
    this.init();
  }

  async init() {
    try {
      // Try to initialize Firebase Admin
      if (admin.apps.length === 0) {
        // Firebase Admin is not initialized, use local storage
        console.log('Firebase Admin not initialized, using local storage for completed orders');
        await this.ensureLocalDirectory();
        await this.loadCompletedOrderIds();
        return;
      }

      this.db = admin.firestore();
      this.storage = admin.storage();
      console.log('Firebase Admin initialized, using Firebase Storage for completed orders');
    } catch (error) {
      console.log('Using local storage for completed orders:', error.message);
      await this.ensureLocalDirectory();
      await this.loadCompletedOrderIds();
    }
  }

  async loadCompletedOrderIds() {
    try {
      const data = await fs.readFile(this.localFilePath, 'utf8');
      const completedOrders = JSON.parse(data);
      this.completedOrderIds = new Set(completedOrders.map(order => order.id));
      console.log(`Loaded ${this.completedOrderIds.size} completed order IDs into cache`);
    } catch (error) {
      // File doesn't exist or is empty, start with empty set
      this.completedOrderIds = new Set();
      console.log('No completed orders file found, starting with empty cache');
    }
  }

  async ensureLocalDirectory() {
    try {
      const dataDir = path.dirname(this.localFilePath);
      await fs.mkdir(dataDir, { recursive: true });
    } catch (error) {
      console.error('Error creating local data directory:', error);
    }
  }

  async storeCompletedOrder(order) {
    try {
      const completedOrder = {
        ...order,
        completedAt: new Date().toISOString(),
        storedAt: new Date().toISOString(),
        analysisData: {
          totalPrepTime: this.calculatePrepTime(order),
          orderValue: order.totalAmount,
          itemCount: order.items.length,
          customerType: order.customer === 'Takeout' ? 'takeout' : 'dine-in',
          paymentMethod: order.paymentMethod,
          staffId: order.staffId
        }
      };

      if (this.storage) {
        // Use Firebase Storage for deployed version
        await this.storeInFirebase(completedOrder);
      } else {
        // Use local file storage for development
        await this.storeLocally(completedOrder);
      }

      console.log(`Completed order ${order.id} stored successfully`);
      return true;
    } catch (error) {
      console.error('Error storing completed order:', error);
      return false;
    }
  }

  async storeInFirebase(completedOrder) {
    try {
      // Store in Firestore for easy querying
      await this.db.collection('completedOrders').doc(completedOrder.id).set(completedOrder);

      // Also store as JSON file in Firebase Storage for backup/analysis
      const fileName = `completed-orders/${moment().format('YYYY-MM-DD')}/${completedOrder.id}.json`;
      const file = this.storage.bucket().file(fileName);
      
      await file.save(JSON.stringify(completedOrder, null, 2), {
        metadata: {
          contentType: 'application/json',
          metadata: {
            orderId: completedOrder.id,
            completedAt: completedOrder.completedAt,
            orderNumber: completedOrder.orderNumber.toString()
          }
        }
      });

      console.log(`Order ${completedOrder.id} stored in Firebase Storage`);
    } catch (error) {
      console.error('Error storing in Firebase:', error);
      throw error;
    }
  }

  async storeLocally(completedOrder) {
    try {
      // Read existing completed orders
      let completedOrders = [];
      try {
        const data = await fs.readFile(this.localFilePath, 'utf8');
        completedOrders = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is empty, start with empty array
        completedOrders = [];
      }

      // Add new completed order
      completedOrders.push(completedOrder);

      // Keep only last 1000 orders to prevent file from growing too large
      if (completedOrders.length > 1000) {
        completedOrders = completedOrders.slice(-1000);
      }

      // Write back to file
      await fs.writeFile(this.localFilePath, JSON.stringify(completedOrders, null, 2));
      
      // Add to cache
      this.completedOrderIds.add(completedOrder.id);
      
      console.log(`Order ${completedOrder.id} stored locally`);
    } catch (error) {
      console.error('Error storing locally:', error);
      throw error;
    }
  }

  async getCompletedOrders(dateRange = null) {
    try {
      if (this.db) {
        // Get from Firestore
        let query = this.db.collection('completedOrders').orderBy('completedAt', 'desc');
        
        if (dateRange) {
          if (dateRange.start) {
            query = query.where('completedAt', '>=', dateRange.start);
          }
          if (dateRange.end) {
            query = query.where('completedAt', '<=', dateRange.end);
          }
        }

        const snapshot = await query.limit(1000).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        // Get from local file
        try {
          const data = await fs.readFile(this.localFilePath, 'utf8');
          let completedOrders = JSON.parse(data);
          
          if (dateRange) {
            completedOrders = completedOrders.filter(order => {
              const orderDate = new Date(order.completedAt);
              if (dateRange.start && orderDate < new Date(dateRange.start)) return false;
              if (dateRange.end && orderDate > new Date(dateRange.end)) return false;
              return true;
            });
          }
          
          return completedOrders.slice(0, 1000); // Limit to 1000 most recent
        } catch (error) {
          console.error('Error reading local completed orders:', error);
          return [];
        }
      }
    } catch (error) {
      console.error('Error getting completed orders:', error);
      return [];
    }
  }

  async getAnalyticsData(dateRange = null) {
    try {
      const completedOrders = await this.getCompletedOrders(dateRange);
      
      if (completedOrders.length === 0) {
        return {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0,
          averagePrepTime: 0,
          topItems: [],
          paymentMethods: {},
          customerTypes: {},
          hourlyDistribution: {}
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
        const hour = moment(order.completedAt).format('HH');
        hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
      });

      return {
        totalOrders: completedOrders.length,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        averagePrepTime: Math.round(averagePrepTime * 100) / 100,
        topItems,
        paymentMethods,
        customerTypes,
        hourlyDistribution
      };
    } catch (error) {
      console.error('Error calculating analytics:', error);
      return null;
    }
  }

  calculatePrepTime(order) {
    try {
      const createdAt = new Date(order.createdAt);
      const completedAt = new Date(order.completedAt || order.updatedAt);
      return (completedAt - createdAt) / 1000 / 60; // Convert to minutes
    } catch (error) {
      return 0;
    }
  }

  async isOrderCompleted(orderId) {
    try {
      if (this.db) {
        const doc = await this.db.collection('completedOrders').doc(orderId).get();
        return doc.exists;
      } else {
        // Use cache for fast lookup
        return this.completedOrderIds.has(orderId);
      }
    } catch (error) {
      console.error('Error checking if order is completed:', error);
      return false;
    }
  }
}

module.exports = new CompletedOrdersStorage();
