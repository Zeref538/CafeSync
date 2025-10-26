const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/menu');
    // Create directory if it doesn't exist
    fs.mkdir(uploadDir, { recursive: true }).then(() => {
      cb(null, uploadDir);
    }).catch(err => cb(err, uploadDir));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'menu-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// In-memory storage for menu items (in production, use database)
let menuItems = [
  {
    id: 1,
    name: 'Latte',
    price: 4.50,
    category: 'Hot Drinks',
    description: 'Rich espresso with steamed milk',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 3,
    ingredients: ['Coffee Beans', 'Milk'],
    allergens: ['Dairy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Cappuccino',
    price: 4.25,
    category: 'Hot Drinks',
    description: 'Espresso with equal parts steamed milk and foam',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 3,
    ingredients: ['Coffee Beans', 'Milk'],
    allergens: ['Dairy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Americano',
    price: 3.50,
    category: 'Hot Drinks',
    description: 'Espresso with hot water',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 2,
    ingredients: ['Coffee Beans', 'Water'],
    allergens: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 4,
    name: 'Espresso',
    price: 2.75,
    category: 'Hot Drinks',
    description: 'Pure espresso shot',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 1,
    ingredients: ['Coffee Beans'],
    allergens: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 5,
    name: 'Iced Coffee',
    price: 3.75,
    category: 'Cold Drinks',
    description: 'Cold brewed coffee over ice',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 2,
    ingredients: ['Coffee Beans', 'Ice'],
    allergens: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 6,
    name: 'Frappuccino',
    price: 5.25,
    category: 'Cold Drinks',
    description: 'Blended coffee drink',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 4,
    ingredients: ['Coffee Beans', 'Milk', 'Ice', 'Sugar'],
    allergens: ['Dairy'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 7,
    name: 'Croissant',
    price: 3.00,
    category: 'Pastries',
    description: 'Buttery flaky pastry',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 1,
    ingredients: ['Flour', 'Butter', 'Eggs'],
    allergens: ['Gluten', 'Dairy', 'Eggs'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 8,
    name: 'Muffin',
    price: 2.50,
    category: 'Pastries',
    description: 'Fresh baked muffin',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 1,
    ingredients: ['Flour', 'Eggs', 'Sugar'],
    allergens: ['Gluten', 'Eggs'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 9,
    name: 'Bagel',
    price: 2.75,
    category: 'Pastries',
    description: 'Fresh bagel with cream cheese',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 1,
    ingredients: ['Flour', 'Water', 'Salt'],
    allergens: ['Gluten'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Get all menu items
router.get('/', (req, res) => {
  try {
    const { category, available } = req.query;
    
    let filteredItems = [...menuItems];
    
    // Filter by category
    if (category && category !== 'All') {
      filteredItems = filteredItems.filter(item => item.category === category);
    }
    
    // Filter by availability
    if (available !== undefined) {
      const isAvailable = available === 'true';
      filteredItems = filteredItems.filter(item => item.isAvailable === isAvailable);
    }
    
    res.json({
      success: true,
      data: filteredItems,
      count: filteredItems.length
    });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu items'
    });
  }
});

// Get menu item by ID
router.get('/:id', (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const item = menuItems.find(item => item.id === itemId);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }
    
    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch menu item'
    });
  }
});

// Create new menu item
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const {
      name,
      price,
      category,
      description,
      isAvailable,
      preparationTime,
      ingredients,
      allergens
    } = req.body;
    
    // Validate required fields
    if (!name || !price || !category) {
      return res.status(400).json({
        success: false,
        error: 'Name, price, and category are required'
      });
    }
    
    // Generate new ID
    const newId = Math.max(...menuItems.map(item => item.id), 0) + 1;
    
    // Handle image upload
    let imageUrl = '';
    if (req.file) {
      imageUrl = `/uploads/menu/${req.file.filename}`;
    }
    
    const newItem = {
      id: newId,
      name: name.trim(),
      price: parseFloat(price),
      category: category.trim(),
      description: description?.trim() || '',
      imageUrl,
      isAvailable: isAvailable === 'true' || isAvailable === true,
      preparationTime: parseInt(preparationTime) || 5,
      ingredients: Array.isArray(ingredients) ? ingredients : [],
      allergens: Array.isArray(allergens) ? allergens : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    menuItems.push(newItem);
    
    res.status(201).json({
      success: true,
      data: newItem,
      message: 'Menu item created successfully'
    });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create menu item'
    });
  }
});

// Update menu item
router.put('/', upload.single('image'), async (req, res) => {
  try {
    const {
      id,
      name,
      price,
      category,
      description,
      isAvailable,
      preparationTime,
      ingredients,
      allergens
    } = req.body;
    
    const itemId = parseInt(id);
    const itemIndex = menuItems.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }
    
    // Handle image upload
    let imageUrl = menuItems[itemIndex].imageUrl;
    if (req.file) {
      // Delete old image if it exists
      if (imageUrl && imageUrl.startsWith('/uploads/menu/')) {
        try {
          const oldImagePath = path.join(__dirname, '..', imageUrl);
          await fs.unlink(oldImagePath);
        } catch (error) {
          console.log('Could not delete old image:', error.message);
        }
      }
      imageUrl = `/uploads/menu/${req.file.filename}`;
    }
    
    const updatedItem = {
      ...menuItems[itemIndex],
      name: name?.trim() || menuItems[itemIndex].name,
      price: price ? parseFloat(price) : menuItems[itemIndex].price,
      category: category?.trim() || menuItems[itemIndex].category,
      description: description?.trim() || menuItems[itemIndex].description,
      imageUrl,
      isAvailable: isAvailable !== undefined ? (isAvailable === 'true' || isAvailable === true) : menuItems[itemIndex].isAvailable,
      preparationTime: preparationTime ? parseInt(preparationTime) : menuItems[itemIndex].preparationTime,
      ingredients: Array.isArray(ingredients) ? ingredients : menuItems[itemIndex].ingredients,
      allergens: Array.isArray(allergens) ? allergens : menuItems[itemIndex].allergens,
      updatedAt: new Date().toISOString()
    };
    
    menuItems[itemIndex] = updatedItem;
    
    res.json({
      success: true,
      data: updatedItem,
      message: 'Menu item updated successfully'
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update menu item'
    });
  }
});

// Delete menu item
router.delete('/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const itemIndex = menuItems.findIndex(item => item.id === itemId);
    
    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }
    
    const item = menuItems[itemIndex];
    
    // Delete associated image if it exists
    if (item.imageUrl && item.imageUrl.startsWith('/uploads/menu/')) {
      try {
        const imagePath = path.join(__dirname, '..', item.imageUrl);
        await fs.unlink(imagePath);
      } catch (error) {
        console.log('Could not delete image:', error.message);
      }
    }
    
    menuItems.splice(itemIndex, 1);
    
    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete menu item'
    });
  }
});

// Get menu categories
router.get('/categories/list', (req, res) => {
  try {
    const categories = [...new Set(menuItems.map(item => item.category))].sort();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

// Bulk update menu items
router.patch('/bulk', (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({
        success: false,
        error: 'Updates must be an array'
      });
    }
    
    const updatedItems = [];
    
    updates.forEach(update => {
      const itemIndex = menuItems.findIndex(item => item.id === update.id);
      if (itemIndex !== -1) {
        menuItems[itemIndex] = {
          ...menuItems[itemIndex],
          ...update,
          updatedAt: new Date().toISOString()
        };
        updatedItems.push(menuItems[itemIndex]);
      }
    });
    
    res.json({
      success: true,
      data: updatedItems,
      message: `${updatedItems.length} menu items updated successfully`
    });
  } catch (error) {
    console.error('Error bulk updating menu items:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update menu items'
    });
  }
});

module.exports = router;
