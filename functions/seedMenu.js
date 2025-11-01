// Script to seed menu items from old menu data
// Run this in Firebase Functions or as a standalone script

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Old menu items from server/routes/menu.js
const oldMenuItems = [
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

async function seedMenu() {
  try {
    console.log('Starting to seed menu items...');
    
    // Check if menu collection already has items
    const existingMenu = await db.collection('menu').get();
    
    if (!existingMenu.empty) {
      console.log(`Menu collection already has ${existingMenu.size} items. Skipping seed.`);
      return { success: false, message: 'Menu already has items', count: existingMenu.size };
    }
    
    // Add all menu items
    const batch = db.batch();
    let count = 0;
    
    for (const item of oldMenuItems) {
      const docRef = db.collection('menu').doc();
      batch.set(docRef, item);
      count++;
    }
    
    await batch.commit();
    
    console.log(`Successfully seeded ${count} menu items!`);
    return { success: true, message: `Seeded ${count} menu items`, count };
    
  } catch (error) {
    console.error('Error seeding menu:', error);
    return { success: false, message: error.message, error };
  }
}

// Export for use in Firebase Functions
module.exports = { seedMenu, oldMenuItems };

// If run directly, execute the seed function
if (require.main === module) {
  seedMenu()
    .then(result => {
      console.log('Seed result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

