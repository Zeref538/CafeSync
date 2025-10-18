const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

// Mock loyalty program data
let customers = [
  {
    id: 'customer-1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1234567890',
    loyaltyPoints: 150,
    tier: 'gold',
    joinDate: '2023-06-15T00:00:00Z',
    totalSpent: 450.75,
    visitCount: 25,
    lastVisit: '2024-01-20T14:30:00Z',
    preferences: {
      favoriteDrink: 'Latte',
      preferredMilk: 'Oat Milk',
      preferredSize: 'Large',
      dietaryRestrictions: ['Lactose Intolerant']
    },
    rewards: [
      {
        id: 'reward-1',
        type: 'free_drink',
        description: 'Free Medium Drink',
        pointsRequired: 100,
        redeemed: false,
        earnedDate: '2024-01-15T00:00:00Z'
      }
    ]
  },
  {
    id: 'customer-2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1987654321',
    loyaltyPoints: 75,
    tier: 'silver',
    joinDate: '2023-09-10T00:00:00Z',
    totalSpent: 225.50,
    visitCount: 15,
    lastVisit: '2024-01-19T09:15:00Z',
    preferences: {
      favoriteDrink: 'Cappuccino',
      preferredMilk: 'Almond Milk',
      preferredSize: 'Medium',
      dietaryRestrictions: []
    },
    rewards: []
  }
];

let loyaltyTransactions = [
  {
    id: 'transaction-1',
    customerId: 'customer-1',
    type: 'purchase',
    points: 15,
    amount: 12.50,
    timestamp: '2024-01-20T14:30:00Z',
    description: 'Points earned from purchase'
  },
  {
    id: 'transaction-2',
    customerId: 'customer-1',
    type: 'redemption',
    points: -100,
    amount: 0,
    timestamp: '2024-01-15T10:00:00Z',
    description: 'Redeemed free drink reward'
  }
];

// Get all customers
router.get('/customers', (req, res) => {
  const { tier, limit = 50, sortBy = 'lastVisit' } = req.query;
  
  let filteredCustomers = [...customers];
  
  if (tier) {
    filteredCustomers = filteredCustomers.filter(customer => customer.tier === tier);
  }
  
  // Sort customers
  switch (sortBy) {
    case 'lastVisit':
      filteredCustomers.sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));
      break;
    case 'points':
      filteredCustomers.sort((a, b) => b.loyaltyPoints - a.loyaltyPoints);
      break;
    case 'totalSpent':
      filteredCustomers.sort((a, b) => b.totalSpent - a.totalSpent);
      break;
    case 'visitCount':
      filteredCustomers.sort((a, b) => b.visitCount - a.visitCount);
      break;
  }
  
  if (limit) {
    filteredCustomers = filteredCustomers.slice(0, parseInt(limit));
  }
  
  res.json({
    success: true,
    data: filteredCustomers,
    count: filteredCustomers.length
  });
});

// Get customer by ID
router.get('/customers/:id', (req, res) => {
  const customer = customers.find(c => c.id === req.params.id);
  
  if (!customer) {
    return res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
  }
  
  // Get customer's transaction history
  const customerTransactions = loyaltyTransactions.filter(t => t.customerId === req.params.id);
  
  res.json({
    success: true,
    data: {
      ...customer,
      transactionHistory: customerTransactions
    }
  });
});

// Create new customer
router.post('/customers', (req, res) => {
  const { name, email, phone, preferences = {} } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: 'Name and email are required'
    });
  }
  
  // Check if customer already exists
  const existingCustomer = customers.find(c => c.email === email);
  if (existingCustomer) {
    return res.status(400).json({
      success: false,
      error: 'Customer with this email already exists'
    });
  }
  
  const newCustomer = {
    id: uuidv4(),
    name,
    email,
    phone: phone || '',
    loyaltyPoints: 0,
    tier: 'bronze',
    joinDate: moment().toISOString(),
    totalSpent: 0,
    visitCount: 0,
    lastVisit: null,
    preferences: {
      favoriteDrink: preferences.favoriteDrink || '',
      preferredMilk: preferences.preferredMilk || '',
      preferredSize: preferences.preferredSize || '',
      dietaryRestrictions: preferences.dietaryRestrictions || []
    },
    rewards: []
  };
  
  customers.push(newCustomer);
  
  res.status(201).json({
    success: true,
    data: newCustomer,
    message: 'Customer created successfully'
  });
});

// Update customer preferences
router.patch('/customers/:id/preferences', (req, res) => {
  const { preferences } = req.body;
  
  const customerIndex = customers.findIndex(c => c.id === req.params.id);
  
  if (customerIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
  }
  
  customers[customerIndex].preferences = {
    ...customers[customerIndex].preferences,
    ...preferences
  };
  
  res.json({
    success: true,
    data: customers[customerIndex],
    message: 'Customer preferences updated successfully'
  });
});

// Add points to customer
router.post('/customers/:id/points', (req, res) => {
  const { points, reason, orderId } = req.body;
  
  if (!points || points <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Valid points amount is required'
    });
  }
  
  const customerIndex = customers.findIndex(c => c.id === req.params.id);
  
  if (customerIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
  }
  
  // Add points
  customers[customerIndex].loyaltyPoints += points;
  
  // Update tier based on points
  const newTier = calculateTier(customers[customerIndex].loyaltyPoints);
  customers[customerIndex].tier = newTier;
  
  // Add transaction record
  const transaction = {
    id: uuidv4(),
    customerId: req.params.id,
    type: 'earned',
    points: points,
    amount: 0,
    timestamp: moment().toISOString(),
    description: reason || 'Points earned',
    orderId: orderId || null
  };
  
  loyaltyTransactions.push(transaction);
  
  // Check for new rewards
  const newRewards = checkForNewRewards(customers[customerIndex]);
  customers[customerIndex].rewards.push(...newRewards);
  
  res.json({
    success: true,
    data: customers[customerIndex],
    message: 'Points added successfully',
    newRewards: newRewards.length > 0 ? newRewards : null
  });
});

// Redeem reward
router.post('/customers/:id/redeem', (req, res) => {
  const { rewardId } = req.body;
  
  const customerIndex = customers.findIndex(c => c.id === req.params.id);
  
  if (customerIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Customer not found'
    });
  }
  
  const rewardIndex = customers[customerIndex].rewards.findIndex(r => r.id === rewardId);
  
  if (rewardIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Reward not found'
    });
  }
  
  const reward = customers[customerIndex].rewards[rewardIndex];
  
  if (reward.redeemed) {
    return res.status(400).json({
      success: false,
      error: 'Reward already redeemed'
    });
  }
  
  if (customers[customerIndex].loyaltyPoints < reward.pointsRequired) {
    return res.status(400).json({
      success: false,
      error: 'Insufficient points for this reward'
    });
  }
  
  // Redeem reward
  customers[customerIndex].loyaltyPoints -= reward.pointsRequired;
  customers[customerIndex].rewards[rewardIndex].redeemed = true;
  customers[customerIndex].rewards[rewardIndex].redeemedDate = moment().toISOString();
  
  // Add transaction record
  const transaction = {
    id: uuidv4(),
    customerId: req.params.id,
    type: 'redemption',
    points: -reward.pointsRequired,
    amount: 0,
    timestamp: moment().toISOString(),
    description: `Redeemed: ${reward.description}`,
    rewardId: rewardId
  };
  
  loyaltyTransactions.push(transaction);
  
  res.json({
    success: true,
    data: customers[customerIndex],
    message: 'Reward redeemed successfully'
  });
});

// Get loyalty analytics
router.get('/analytics', (req, res) => {
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => 
    moment(c.lastVisit).isAfter(moment().subtract(30, 'days'))
  ).length;
  
  const tierBreakdown = customers.reduce((breakdown, customer) => {
    breakdown[customer.tier] = (breakdown[customer.tier] || 0) + 1;
    return breakdown;
  }, {});
  
  const totalPointsIssued = loyaltyTransactions
    .filter(t => t.type === 'earned')
    .reduce((sum, t) => sum + t.points, 0);
  
  const totalPointsRedeemed = loyaltyTransactions
    .filter(t => t.type === 'redemption')
    .reduce((sum, t) => sum + Math.abs(t.points), 0);
  
  const averagePointsPerCustomer = totalCustomers > 0 ? 
    customers.reduce((sum, c) => sum + c.loyaltyPoints, 0) / totalCustomers : 0;
  
  res.json({
    success: true,
    data: {
      totalCustomers,
      activeCustomers,
      tierBreakdown,
      totalPointsIssued,
      totalPointsRedeemed,
      averagePointsPerCustomer: Math.round(averagePointsPerCustomer * 100) / 100,
      redemptionRate: totalPointsIssued > 0 ? 
        Math.round((totalPointsRedeemed / totalPointsIssued) * 100) / 100 : 0
    }
  });
});

// Helper functions
function calculateTier(points) {
  if (points >= 500) return 'platinum';
  if (points >= 200) return 'gold';
  if (points >= 100) return 'silver';
  return 'bronze';
}

function checkForNewRewards(customer) {
  const newRewards = [];
  
  // Free drink at 100 points
  if (customer.loyaltyPoints >= 100 && 
      !customer.rewards.some(r => r.type === 'free_drink' && !r.redeemed)) {
    newRewards.push({
      id: uuidv4(),
      type: 'free_drink',
      description: 'Free Medium Drink',
      pointsRequired: 100,
      redeemed: false,
      earnedDate: moment().toISOString()
    });
  }
  
  // Free pastry at 150 points
  if (customer.loyaltyPoints >= 150 && 
      !customer.rewards.some(r => r.type === 'free_pastry' && !r.redeemed)) {
    newRewards.push({
      id: uuidv4(),
      type: 'free_pastry',
      description: 'Free Pastry',
      pointsRequired: 150,
      redeemed: false,
      earnedDate: moment().toISOString()
    });
  }
  
  return newRewards;
}

module.exports = router;
