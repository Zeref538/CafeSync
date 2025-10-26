import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Avatar,
  Alert,
  Snackbar,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Image,
  Upload,
  Save,
  Cancel,
  Restaurant,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';

interface SizePrice {
  size: string;
  price: number; // Back to number for stored data
}

interface FormSizePrice {
  size: string;
  price: string; // String for form editing
}

interface MenuItem {
  id: number;
  name: string;
  price: number; // Base price (for backward compatibility)
  category: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number;
  ingredients?: string[];
  allergens?: string[];
  sizes?: SizePrice[]; // New size-based pricing
}

interface MenuManagementProps {
  onMenuUpdate?: (items: MenuItem[]) => void;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ onMenuUpdate }) => {
  const { emitMenuUpdate } = useSocket();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    description: string;
    imageUrl: string;
    isAvailable: boolean;
    preparationTime: string;
    ingredients: string[];
    allergens: string[];
    sizes: FormSizePrice[];
  }>({
    name: '',
    category: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    preparationTime: '',
    ingredients: [],
    allergens: [],
    sizes: [],
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');


  const commonIngredients = [
    'Coffee Beans',
    'Milk',
    'Sugar',
    'Vanilla',
    'Chocolate',
    'Caramel',
    'Whipped Cream',
    'Ice',
    'Water',
    'Flour',
    'Butter',
    'Eggs'
  ];

  const commonAllergens = [
    'Dairy',
    'Gluten',
    'Nuts',
    'Soy',
    'Eggs',
    'Sesame'
  ];

  const sizeOptions = [
    'Small',
    'Regular',
    'Large',
    'Extra Large'
  ];

  // Load menu items on component mount
  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      
      // Always use Firebase Functions URL
      const apiUrl = 'https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu';
        
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded menu items from API:', data);
        console.log('First menu item data:', data.data?.[0]);
        console.log('First menu item sizes:', data.data?.[0]?.sizes);
        setMenuItems(data.data || []);
      } else {
        // No fallback - start with empty menu
        console.error('Failed to load menu items, response status:', response.status);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      setSnackbar({ open: true, message: 'Failed to load menu items', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
        setFormData(prev => ({ ...prev, imageUrl: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenDialog = (item?: MenuItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
        preparationTime: (item.preparationTime || 5).toString(),
        ingredients: item.ingredients || [],
        allergens: item.allergens || [],
        sizes: item.sizes && item.sizes.length > 0 ? item.sizes.map(size => ({
          ...size,
          price: size.price.toString()
        } as FormSizePrice)) : [{ size: 'Regular', price: item.price.toString() } as FormSizePrice],
      });
      setImagePreview(item.imageUrl || '');
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: '',
        description: '',
        imageUrl: '',
        isAvailable: true,
        preparationTime: '',
        ingredients: [],
        allergens: [],
        sizes: [{ size: 'Regular', price: '' } as FormSizePrice], // Add default size
      });
      setImagePreview('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setImageFile(null);
    setImagePreview('');
    // Reset form data to clean state
    setFormData({
      name: '',
      category: '',
      description: '',
      imageUrl: '',
      isAvailable: true,
      preparationTime: '',
      ingredients: [],
      allergens: [],
      sizes: [],
    });
  };

  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { size: 'Regular', price: '' } as FormSizePrice]
    }));
  };

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index)
    }));
  };

  const updateSize = (index: number, field: 'size' | 'price', value: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.map((size, i) => 
        i === index ? { ...size, [field]: value } : size
      )
    }));
  };

  const handleSaveItem = async () => {
    try {
      setLoading(true);
      
      // Validate that at least one size is provided
      if (formData.sizes.length === 0) {
        setSnackbar({ open: true, message: 'Please add at least one size option', severity: 'error' });
        setLoading(false);
        return;
      }

      // Validate that all sizes have valid prices
      const invalidSizes = formData.sizes.filter(size => !size.price || parseFloat(size.price) <= 0);
      if (invalidSizes.length > 0) {
        setSnackbar({ open: true, message: 'Please enter valid prices for all size options', severity: 'error' });
        setLoading(false);
        return;
      }

      const itemData = {
        id: editingItem?.id || Date.now(),
        name: formData.name,
        category: formData.category,
        description: formData.description,
        isAvailable: formData.isAvailable,
        preparationTime: parseInt(formData.preparationTime) || 5,
        imageUrl: imagePreview || formData.imageUrl,
        ingredients: formData.ingredients,
        allergens: formData.allergens,
        price: parseFloat(formData.sizes[0].price) || 0, // Use first size as base price for backward compatibility
        sizes: formData.sizes.map(size => ({
          ...size,
          price: parseFloat(size.price) || 0
        } as SizePrice)),
      };

      console.log('Saving menu item with data:', JSON.stringify(itemData, null, 2));
      console.log('Sizes array being sent:', JSON.stringify(itemData.sizes, null, 2));

      // Always use Firebase Functions URL
      const apiUrl = 'https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu';

      const response = await fetch(apiUrl, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Save response from server:', result);
        
        setSnackbar({ 
          open: true, 
          message: `Menu item ${editingItem ? 'updated' : 'added'} successfully`, 
          severity: 'success' 
        });
        handleCloseDialog();
        
        // Reload menu items to get the latest data from server
        await loadMenuItems();
        
        // Emit menu update to other components (only works in development)
        emitMenuUpdate({
          action: editingItem ? 'update' : 'add',
          item: itemData,
          timestamp: new Date().toISOString()
        });
      } else {
        const errorText = await response.text();
        console.error('Save failed, response text:', errorText);
        throw new Error('Failed to save menu item');
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      setSnackbar({ open: true, message: 'Failed to save menu item', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        setLoading(true);
        
        // Always use Firebase Functions URL
        const apiUrl = `https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu/${item.id}`;
          
        const response = await fetch(apiUrl, {
          method: 'DELETE',
        });

        if (response.ok) {
          const updatedItems = menuItems.filter(i => i.id !== item.id);
          setMenuItems(updatedItems);
          onMenuUpdate?.(updatedItems);
          
          // Emit menu update to other components
          emitMenuUpdate({
            action: 'delete',
            item: item,
            items: updatedItems,
            timestamp: new Date().toISOString()
          });
          
          setSnackbar({ open: true, message: 'Menu item deleted successfully', severity: 'success' });
        } else {
          throw new Error('Failed to delete menu item');
        }
      } catch (error) {
        console.error('Error deleting menu item:', error);
        setSnackbar({ open: true, message: 'Failed to delete menu item', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const updatedItem = { ...item, isAvailable: !item.isAvailable };
      
      const response = await fetch('http://localhost:5000/api/menu', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedItem),
      });

      if (response.ok) {
        const updatedItems = menuItems.map(i => i.id === item.id ? updatedItem : i);
        setMenuItems(updatedItems);
        onMenuUpdate?.(updatedItems);
        
        // Emit menu update to other components
        emitMenuUpdate({
          action: 'update',
          item: updatedItem,
          items: updatedItems,
          timestamp: new Date().toISOString()
        });
        
        setSnackbar({ 
          open: true, 
          message: `Menu item ${updatedItem.isAvailable ? 'enabled' : 'disabled'}`, 
          severity: 'success' 
        });
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      setSnackbar({ open: true, message: 'Failed to update availability', severity: 'error' });
    }
  };

  const bulkUploadMenuItems = async () => {
    if (window.confirm('This will add all the cafe menu items. Continue?')) {
      try {
        setLoading(true);
        
        const cafeMenuItems = [
          {
            name: 'Americano',
            category: 'Espresso',
            description: 'Rich espresso with hot water',
            ingredients: ['Water', 'Coffee (Depende if may sugar[Fructose])'],
            allergens: [],
            isAvailable: true,
            preparationTime: 3,
            sizes: [
              { size: 'M', price: 59 },
              { size: 'L', price: 79 }
            ]
          },
          {
            name: 'Americano Hot',
            category: 'Hot Drinks',
            description: 'Rich espresso with hot water',
            ingredients: ['Water', 'Coffee (Depende if may sugar[Fructose])'],
            allergens: [],
            isAvailable: true,
            preparationTime: 3,
            sizes: [
              { size: 'M', price: 69 },
              { size: 'L', price: 89 }
            ]
          },
          {
            name: 'Latte',
            category: 'Espresso',
            description: 'Rich espresso with steamed milk',
            ingredients: ['Milk', 'Coffee (add on sugar)'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 69 },
              { size: 'L', price: 89 }
            ]
          },
          {
            name: 'Latte Hot',
            category: 'Hot Drinks',
            description: 'Rich espresso with steamed milk',
            ingredients: ['Milk', 'Coffee (add on sugar)'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 79 },
              { size: 'L', price: 99 }
            ]
          },
          {
            name: 'Roasted Almond',
            category: 'Espresso',
            description: 'Espresso with roasted almond flavor',
            ingredients: ['Milk', 'Coffee', 'Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 99 },
              { size: 'L', price: 119 }
            ]
          },
          {
            name: 'Roasted Almond Hot',
            category: 'Hot Drinks',
            description: 'Espresso with roasted almond flavor',
            ingredients: ['Milk', 'Coffee', 'Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 109 },
              { size: 'L', price: 129 }
            ]
          },
          {
            name: 'French Vanilla',
            category: 'Espresso',
            description: 'Espresso with French vanilla flavor',
            ingredients: ['Milk', 'Coffee', 'Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 109 },
              { size: 'L', price: 129 }
            ]
          },
          {
            name: 'French Vanilla Hot',
            category: 'Hot Drinks',
            description: 'Espresso with French vanilla flavor',
            ingredients: ['Milk', 'Coffee', 'Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 119 },
              { size: 'L', price: 139 }
            ]
          },
          {
            name: 'Butterscotch',
            category: 'Espresso',
            description: 'Espresso with butterscotch flavor',
            ingredients: ['Milk', 'Coffee Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 109 },
              { size: 'L', price: 129 }
            ]
          },
          {
            name: 'Butterscotch Hot',
            category: 'Hot Drinks',
            description: 'Espresso with butterscotch flavor',
            ingredients: ['Milk', 'Coffee Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 4,
            sizes: [
              { size: 'M', price: 119 },
              { size: 'L', price: 139 }
            ]
          },
          {
            name: 'Caramel Macchiato',
            category: 'Espresso',
            description: 'Espresso with caramel and vanilla',
            ingredients: ['Milk', 'Coffee', 'Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 5,
            sizes: [
              { size: 'M', price: 119 },
              { size: 'L', price: 139 }
            ]
          },
          {
            name: 'Caramel Macchiato Hot',
            category: 'Hot Drinks',
            description: 'Espresso with caramel and vanilla',
            ingredients: ['Milk', 'Coffee', 'Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 5,
            sizes: [
              { size: 'M', price: 129 },
              { size: 'L', price: 149 }
            ]
          },
          {
            name: 'White Mocha',
            category: 'Espresso',
            description: 'Espresso with white chocolate',
            ingredients: ['Milk', 'Coffee', 'White Choco'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 5,
            sizes: [
              { size: 'M', price: 119 },
              { size: 'L', price: 139 }
            ]
          },
          {
            name: 'White Mocha Hot',
            category: 'Hot Drinks',
            description: 'Espresso with white chocolate',
            ingredients: ['Milk', 'Coffee', 'White Choco'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 5,
            sizes: [
              { size: 'M', price: 129 },
              { size: 'L', price: 149 }
            ]
          },
          {
            name: 'Mocha',
            category: 'Espresso',
            description: 'Espresso with chocolate flavor',
            ingredients: ['Milk', 'Coffee', 'Syrup', 'Choco Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 5,
            sizes: [
              { size: 'M', price: 119 },
              { size: 'L', price: 139 }
            ]
          },
          {
            name: 'Mocha Hot',
            category: 'Hot Drinks',
            description: 'Espresso with chocolate flavor',
            ingredients: ['Milk', 'Coffee', 'Syrup', 'Choco Syrup'],
            allergens: ['Dairy'],
            isAvailable: true,
            preparationTime: 5,
            sizes: [
              { size: 'M', price: 129 },
              { size: 'L', price: 149 }
            ]
          }
        ];

        // Always use Firebase Functions URL
        const apiUrl = 'https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu';

        // Upload each item
        for (const item of cafeMenuItems) {
          const itemData = {
            ...item,
            id: Date.now() + Math.random(), // Generate unique ID
            price: item.sizes[0].price, // Use first size as base price
          };

          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(itemData),
          });

          if (!response.ok) {
            throw new Error(`Failed to upload ${item.name}`);
          }
        }

        // Reload menu items to show the new items
        await loadMenuItems();
        
        setSnackbar({ 
          open: true, 
          message: `Successfully uploaded ${cafeMenuItems.length} menu items!`, 
          severity: 'success' 
        });
        
      } catch (error) {
        console.error('Error bulk uploading menu items:', error);
        setSnackbar({ open: true, message: 'Failed to upload menu items', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const groupedItems = menuItems.reduce((groups, item) => {
    const category = item.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {} as Record<string, MenuItem[]>);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Restaurant />
          Menu Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={bulkUploadMenuItems}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Add Default Menu Items
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ textTransform: 'none' }}
          >
            Add Menu Item
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {Object.entries(groupedItems).map(([category, items]) => (
        <Card key={category} sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#8B4513' }}>
              {category} ({items.length} items)
            </Typography>
            
            <Grid container spacing={2}>
              {items.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      opacity: item.isAvailable ? 1 : 0.6,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        borderColor: '#8B4513',
                        boxShadow: 2,
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                      <Avatar
                        src={item.imageUrl}
                        sx={{ 
                          width: 60, 
                          height: 60, 
                          backgroundColor: '#8B4513',
                          fontSize: '1.2rem'
                        }}
                      >
                        {item.imageUrl ? null : item.name.charAt(0)}
                      </Avatar>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {item.name}
                          </Typography>
                          <Chip
                            label={item.isAvailable ? 'Available' : 'Unavailable'}
                            size="small"
                            color={item.isAvailable ? 'success' : 'error'}
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.8rem' }}>
                          ₱{item.price.toFixed(2)}
                        </Typography>
                        
                        {item.description && (
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            {item.description}
                          </Typography>
                        )}
                        
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(item)}
                            sx={{ color: '#8B4513' }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => toggleAvailability(item)}
                            sx={{ color: item.isAvailable ? '#ff9800' : '#4caf50' }}
                          >
                            {item.isAvailable ? 'Disable' : 'Enable'}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteItem(item)}
                            sx={{ color: '#f44336' }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      ))}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Image Upload */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Item Image
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar
                  src={imagePreview}
                  sx={{ width: 80, height: 80, backgroundColor: '#8B4513' }}
                >
                  <Image />
                </Avatar>
                <Box>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="image-upload"
                    type="file"
                    onChange={handleImageUpload}
                  />
                  <label htmlFor="image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<Upload />}
                      size="small"
                    >
                      Upload Image
                    </Button>
                  </label>
                </Box>
              </Box>
            </Grid>

            {/* Basic Info */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Item Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </Grid>
            

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Category"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., Espresso, Hot Drinks, Cold Drinks"
                helperText="Enter the category for this menu item"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Preparation Time (minutes)"
                type="number"
                value={formData.preparationTime}
                onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: e.target.value }))}
                placeholder="5"
                inputProps={{
                  step: "1",
                  min: "1"
                }}
                helperText="How long it takes to prepare this item"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the menu item..."
              />
            </Grid>

            {/* Ingredients */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Ingredients
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Select Ingredients</InputLabel>
                <Select
                  multiple
                  value={formData.ingredients}
                  onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value as string[] }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" color="primary" />
                      ))}
                    </Box>
                  )}
                >
                  {commonIngredients.map((ingredient) => (
                    <MenuItem key={ingredient} value={ingredient}>
                      <Checkbox checked={formData.ingredients.includes(ingredient)} />
                      <Typography sx={{ ml: 1 }}>{ingredient}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Allergens */}
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Allergens
              </Typography>
              <FormControl fullWidth>
                <InputLabel>Select Allergens</InputLabel>
                <Select
                  multiple
                  value={formData.allergens}
                  onChange={(e) => setFormData(prev => ({ ...prev, allergens: e.target.value as string[] }))}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {(selected as string[]).map((value) => (
                        <Chip key={value} label={value} size="small" color="warning" />
                      ))}
                    </Box>
                  )}
                >
                  {commonAllergens.map((allergen) => (
                    <MenuItem key={allergen} value={allergen}>
                      <Checkbox checked={formData.allergens.includes(allergen)} color="warning" />
                      <Typography sx={{ ml: 1 }}>{allergen}</Typography>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Size Pricing */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Size Pricing (Required)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Add at least one size option with pricing for this item
                  </Typography>
                </Box>
                <Button
                  size="small"
                  startIcon={<Add />}
                  onClick={addSize}
                  variant="outlined"
                >
                  Add Size
                </Button>
              </Box>
              
              {formData.sizes.length === 0 ? (
                <Typography variant="body2" color="error" sx={{ fontStyle: 'italic' }}>
                  Please add at least one size option to continue.
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {formData.sizes.map((size, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Size</InputLabel>
                        <Select
                          value={size.size}
                          onChange={(e) => updateSize(index, 'size', e.target.value)}
                        >
                          {sizeOptions.map((option) => (
                            <MenuItem key={option} value={option}>
                              {option}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      
                      <TextField
                        size="small"
                        label="Price"
                        type="number"
                        value={size.price}
                        onChange={(e) => updateSize(index, 'price', e.target.value)}
                        placeholder="0.00"
                        inputProps={{
                          step: "0.01",
                          min: "0"
                        }}
                        InputProps={{
                          startAdornment: <Typography sx={{ mr: 1, fontSize: '0.875rem' }}>₱</Typography>
                        }}
                        sx={{ width: 120 }}
                      />
                      
                      <IconButton
                        size="small"
                        onClick={() => removeSize(index)}
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveItem}
            variant="contained"
            startIcon={<Save />}
            disabled={loading || !formData.name || !formData.category || !formData.preparationTime || parseInt(formData.preparationTime) <= 0 || formData.sizes.length === 0}
          >
            {loading ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MenuManagement;
