const express = require('express');
const router = express.Router();
const moment = require('moment');

// Mock analytics data
let salesData = [
  {
    id: 'sale-1',
    orderId: 'order-1',
    customerId: 'customer-1',
    amount: 12.50,
    items: [
      { name: 'Latte', price: 4.50, quantity: 1 },
      { name: 'Croissant', price: 3.00, quantity: 1 },
      { name: 'Cappuccino', price: 5.00, quantity: 1 }
    ],
    timestamp: moment().subtract(2, 'hours').toISOString(),
    station: 'front-counter',
    paymentMethod: 'card'
  },
  {
    id: 'sale-2',
    orderId: 'order-2',
    customerId: 'customer-2',
    amount: 8.75,
    items: [
      { name: 'Americano', price: 3.25, quantity: 1 },
      { name: 'Muffin', price: 2.50, quantity: 1 },
      { name: 'Tea', price: 3.00, quantity: 1 }
    ],
    timestamp: moment().subtract(1, 'hour').toISOString(),
    station: 'front-counter',
    paymentMethod: 'cash'
  }
];

let staffPerformance = [
  {
    staffId: 'staff-1',
    name: 'Sarah Johnson',
    role: 'barista',
    shiftStart: moment().startOf('day').add(6, 'hours').toISOString(),
    shiftEnd: moment().startOf('day').add(14, 'hours').toISOString(),
    ordersCompleted: 45,
    averageOrderTime: 3.2,
    customerRating: 4.8,
    salesGenerated: 450.75
  },
  {
    staffId: 'staff-2',
    name: 'Mike Chen',
    role: 'manager',
    shiftStart: moment().startOf('day').add(8, 'hours').toISOString(),
    shiftEnd: moment().startOf('day').add(16, 'hours').toISOString(),
    ordersCompleted: 12,
    averageOrderTime: 2.8,
    customerRating: 4.9,
    salesGenerated: 125.50
  }
];

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
