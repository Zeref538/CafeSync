const express = require('express');
const router = express.Router();
const moment = require('moment');

// Mock analytics data - START WITH EMPTY DATA
let salesData = []; // Start with empty array - no mock data

let staffPerformance = []; // Start with empty array - no mock data

// Function to add sales data when orders are created
function addSalesData(order) {
  const sale = {
    id: `sale-${order.id}`,
    orderId: order.id,
    customerId: order.customer || 'walk-in',
    amount: order.totalAmount,
    items: order.items.map(item => ({
      name: item.name,
      price: item.unitPrice || item.price,
      quantity: item.quantity
    })),
    timestamp: order.createdAt,
    station: order.station,
    paymentMethod: order.paymentMethod,
    staffId: order.staffId
  };
  
  salesData.push(sale);
}

// Export the function so it can be used by other routes
module.exports.addSalesData = addSalesData;

// Get sales analytics
router.get('/sales', (req, res) => {
  const { period = 'today', groupBy = 'hour' } = req.query;
  
  let filteredData = [...salesData];
  
  // Filter by period
  switch (period) {
    case 'today':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'day')
      );
      break;
    case 'week':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'week')
      );
      break;
    case 'month':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'month')
      );
      break;
  }
  
  // Calculate metrics
  const totalSales = filteredData.reduce((sum, sale) => sum + sale.amount, 0);
  const totalOrders = filteredData.length;
  const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
  
  // Group by time period
  let groupedData = {};
  if (groupBy === 'hour') {
    groupedData = filteredData.reduce((groups, sale) => {
      const hour = moment(sale.timestamp).format('HH:00');
      if (!groups[hour]) {
        groups[hour] = { sales: 0, orders: 0, items: 0 };
      }
      groups[hour].sales += sale.amount;
      groups[hour].orders += 1;
      groups[hour].items += sale.items.reduce((sum, item) => sum + item.quantity, 0);
      return groups;
    }, {});
  }
  
  res.json({
    success: true,
    data: {
      period,
      totalSales: Math.round(totalSales * 100) / 100,
      totalOrders,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
      groupedData,
      topSellingItems: getTopSellingItems(filteredData)
    }
  });
});

// Get staff performance
router.get('/staff', (req, res) => {
  const { period = 'today' } = req.query;
  
  let filteredStaff = [...staffPerformance];
  
  // Filter by period (simplified for demo)
  if (period === 'today') {
    filteredStaff = filteredStaff.filter(staff => 
      moment(staff.shiftStart).isSame(moment(), 'day')
    );
  }
  
  // Calculate performance metrics
  const totalStaff = filteredStaff.length;
  const averageRating = filteredStaff.reduce((sum, staff) => sum + staff.customerRating, 0) / totalStaff;
  const totalSales = filteredStaff.reduce((sum, staff) => sum + staff.salesGenerated, 0);
  const totalOrders = filteredStaff.reduce((sum, staff) => sum + staff.ordersCompleted, 0);
  
  res.json({
    success: true,
    data: {
      totalStaff,
      averageRating: Math.round(averageRating * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
      totalOrders,
      staffPerformance: filteredStaff.map(staff => ({
        ...staff,
        efficiency: staff.ordersCompleted / (moment(staff.shiftEnd).diff(moment(staff.shiftStart), 'hours')),
        salesPerHour: staff.salesGenerated / (moment(staff.shiftEnd).diff(moment(staff.shiftStart), 'hours'))
      }))
    }
  });
});

// Get revenue analytics
router.get('/revenue', (req, res) => {
  const { period = 'today' } = req.query;
  
  let filteredData = [...salesData];
  
  // Filter by period
  switch (period) {
    case 'today':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'day')
      );
      break;
    case 'week':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'week')
      );
      break;
    case 'month':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'month')
      );
      break;
  }
  
  // Calculate revenue metrics
  const totalRevenue = filteredData.reduce((sum, sale) => sum + sale.amount, 0);
  const paymentMethodBreakdown = filteredData.reduce((breakdown, sale) => {
    breakdown[sale.paymentMethod] = (breakdown[sale.paymentMethod] || 0) + sale.amount;
    return breakdown;
  }, {});
  
  // Hourly revenue breakdown
  const hourlyRevenue = filteredData.reduce((hours, sale) => {
    const hour = moment(sale.timestamp).format('HH:00');
    hours[hour] = (hours[hour] || 0) + sale.amount;
    return hours;
  }, {});
  
  res.json({
    success: true,
    data: {
      period,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      paymentMethodBreakdown,
      hourlyRevenue,
      averageTransactionValue: filteredData.length > 0 ? 
        Math.round((totalRevenue / filteredData.length) * 100) / 100 : 0
    }
  });
});

// Get customer analytics
router.get('/customers', (req, res) => {
  const { period = 'today' } = req.query;
  
  let filteredData = [...salesData];
  
  // Filter by period
  switch (period) {
    case 'today':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'day')
      );
      break;
    case 'week':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'week')
      );
      break;
    case 'month':
      filteredData = filteredData.filter(sale => 
        moment(sale.timestamp).isSame(moment(), 'month')
      );
      break;
  }
  
  // Calculate customer metrics
  const uniqueCustomers = new Set(filteredData.map(sale => sale.customerId)).size;
  const totalTransactions = filteredData.length;
  const averageTransactionsPerCustomer = uniqueCustomers > 0 ? 
    totalTransactions / uniqueCustomers : 0;
  
  // Customer frequency analysis
  const customerFrequency = filteredData.reduce((freq, sale) => {
    freq[sale.customerId] = (freq[sale.customerId] || 0) + 1;
    return freq;
  }, {});
  
  const frequentCustomers = Object.entries(customerFrequency)
    .filter(([customerId, visits]) => visits > 1)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
  
  res.json({
    success: true,
    data: {
      period,
      uniqueCustomers,
      totalTransactions,
      averageTransactionsPerCustomer: Math.round(averageTransactionsPerCustomer * 100) / 100,
      frequentCustomers: frequentCustomers.map(([customerId, visits]) => ({
        customerId,
        visits,
        totalSpent: filteredData
          .filter(sale => sale.customerId === customerId)
          .reduce((sum, sale) => sum + sale.amount, 0)
      }))
    }
  });
});

// Get dashboard summary data
router.get('/dashboard', async (req, res) => {
  try {
    // Get today's sales data
    const todayData = salesData.filter(sale => 
      moment(sale.timestamp).isSame(moment(), 'day')
    );
    
    // Calculate dashboard metrics
    const todaySales = todayData.reduce((sum, sale) => sum + sale.amount, 0);
    const todayOrders = todayData.length;
    
    // Calculate real average delivery time from actual orders
    let averageDeliveryTime = 0;
    if (todayOrders > 0) {
      // Get all completed orders from today
      const { getDb } = require('../firebase');
      const db = getDb();
      
      if (db) {
        // Query completed orders from today
        const today = moment().startOf('day').toDate();
        const tomorrow = moment().add(1, 'day').startOf('day').toDate();
        
        const completedOrdersSnap = await db.collection('orders')
          .where('status', '==', 'completed')
          .where('createdAt', '>=', today)
          .where('createdAt', '<', tomorrow)
          .get();
        
        const completedOrders = completedOrdersSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        if (completedOrders.length > 0) {
          // Calculate actual delivery times
          const deliveryTimes = completedOrders.map(order => {
            const createdAt = new Date(order.createdAt);
            const completedAt = new Date(order.completedAt || order.updatedAt || Date.now());
            return (completedAt - createdAt) / 1000 / 60; // Convert to minutes
          });
          
          averageDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
        }
      } else {
        // Fallback: calculate from in-memory orders
        const { getOrders } = require('./orders');
        if (typeof getOrders === 'function') {
          const allOrders = getOrders();
          const todayCompletedOrders = allOrders.filter(order => 
            order.status === 'completed' && 
            moment(order.createdAt).isSame(moment(), 'day')
          );
          
          if (todayCompletedOrders.length > 0) {
            const deliveryTimes = todayCompletedOrders.map(order => {
              const createdAt = new Date(order.createdAt);
              const completedAt = new Date(order.completedAt || order.updatedAt || Date.now());
              return (completedAt - createdAt) / 1000 / 60; // Convert to minutes
            });
            
            averageDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length;
          }
        } else {
          // Final fallback: use mock data for development
          averageDeliveryTime = todayOrders > 0 ? 
            todayData.reduce((sum, sale) => sum + (Math.random() * 3 + 2), 0) / todayOrders : 0;
        }
      }
    }
    
    // Calculate completion rate
    const completedOrders = todayData.length; // For now, assume all orders are completed
    const completionRate = todayOrders > 0 ? Math.round((completedOrders / todayOrders) * 100) : 0;
    
    // Calculate average order time (mock data for now)
    const averageOrderTime = todayOrders > 0 ? 
      todayData.reduce((sum, sale) => sum + (Math.random() * 2 + 1), 0) / todayOrders : 0;
    
    // Mock inventory alerts (will be replaced with real inventory data)
    const inventoryAlerts = 0; // Start with 0 alerts
    
    res.json({
      todaySales: Math.round(todaySales * 100) / 100,
      todayOrders,
      averageDeliveryTime: Math.round(averageDeliveryTime * 100) / 100,
      inventoryAlerts,
      completionRate,
      averageOrderTime: Math.round(averageOrderTime * 100) / 100
    });
  } catch (error) {
    console.error('Error calculating dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to calculate dashboard metrics' });
  }
});

// Helper function to get top selling items
function getTopSellingItems(salesData) {
  const itemCounts = {};
  
  salesData.forEach(sale => {
    sale.items.forEach(item => {
      const key = item.name;
      if (!itemCounts[key]) {
        itemCounts[key] = { name: key, quantity: 0, revenue: 0 };
      }
      itemCounts[key].quantity += item.quantity;
      itemCounts[key].revenue += item.price * item.quantity;
    });
  });
  
  return Object.values(itemCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
}

module.exports = router;
module.exports.addSalesData = addSalesData;
