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

interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number;
  ingredients?: string[];
  allergens?: string[];
}

interface MenuManagementProps {
  onMenuUpdate?: (items: MenuItem[]) => void;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ onMenuUpdate }) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    category: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    preparationTime: 5,
    ingredients: [] as string[],
    allergens: [] as string[],
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const categories = [
    'Hot Drinks',
    'Cold Drinks', 
    'Pastries',
    'Sandwiches',
    'Salads',
    'Snacks',
    'Desserts',
    'Beverages'
  ];

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

  // Load menu items on component mount
  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/menu');
      if (response.ok) {
        const data = await response.json();
        setMenuItems(data.data || []);
      } else {
        // Fallback to default menu items
        setMenuItems([
          { id: 1, name: 'Latte', price: 4.50, category: 'Hot Drinks', description: 'Rich espresso with steamed milk', isAvailable: true, preparationTime: 3 },
          { id: 2, name: 'Cappuccino', price: 4.25, category: 'Hot Drinks', description: 'Espresso with equal parts steamed milk and foam', isAvailable: true, preparationTime: 3 },
          { id: 3, name: 'Americano', price: 3.50, category: 'Hot Drinks', description: 'Espresso with hot water', isAvailable: true, preparationTime: 2 },
          { id: 4, name: 'Espresso', price: 2.75, category: 'Hot Drinks', description: 'Pure espresso shot', isAvailable: true, preparationTime: 1 },
          { id: 5, name: 'Iced Coffee', price: 3.75, category: 'Cold Drinks', description: 'Cold brewed coffee over ice', isAvailable: true, preparationTime: 2 },
          { id: 6, name: 'Frappuccino', price: 5.25, category: 'Cold Drinks', description: 'Blended coffee drink', isAvailable: true, preparationTime: 4 },
          { id: 7, name: 'Croissant', price: 3.00, category: 'Pastries', description: 'Buttery flaky pastry', isAvailable: true, preparationTime: 1 },
          { id: 8, name: 'Muffin', price: 2.50, category: 'Pastries', description: 'Fresh baked muffin', isAvailable: true, preparationTime: 1 },
          { id: 9, name: 'Bagel', price: 2.75, category: 'Pastries', description: 'Fresh bagel with cream cheese', isAvailable: true, preparationTime: 1 },
        ]);
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
        price: item.price,
        category: item.category,
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        isAvailable: item.isAvailable,
        preparationTime: item.preparationTime || 5,
        ingredients: item.ingredients || [],
        allergens: item.allergens || [],
      });
      setImagePreview(item.imageUrl || '');
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        price: 0,
        category: '',
        description: '',
        imageUrl: '',
        isAvailable: true,
        preparationTime: 5,
        ingredients: [],
        allergens: [],
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
  };

  const handleSaveItem = async () => {
    try {
      setLoading(true);
      
      const itemData = {
        ...formData,
        id: editingItem?.id || Date.now(),
        imageUrl: imagePreview || formData.imageUrl,
      };

      const response = await fetch('http://localhost:5000/api/menu', {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok) {
        const updatedItems = editingItem 
          ? menuItems.map(item => item.id === editingItem.id ? itemData : item)
          : [...menuItems, itemData];
        
        setMenuItems(updatedItems);
        onMenuUpdate?.(updatedItems);
        setSnackbar({ 
          open: true, 
          message: `Menu item ${editingItem ? 'updated' : 'added'} successfully`, 
          severity: 'success' 
        });
        handleCloseDialog();
      } else {
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
        
        const response = await fetch(`http://localhost:5000/api/menu/${item.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const updatedItems = menuItems.filter(i => i.id !== item.id);
          setMenuItems(updatedItems);
          onMenuUpdate?.(updatedItems);
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
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ textTransform: 'none' }}
        >
          Add Menu Item
        </Button>
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
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                required
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>₱</Typography>
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {categories.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Preparation Time (minutes)"
                type="number"
                value={formData.preparationTime}
                onChange={(e) => setFormData(prev => ({ ...prev, preparationTime: parseInt(e.target.value) || 5 }))}
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
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {commonIngredients.map((ingredient) => (
                    <MenuItem key={ingredient} value={ingredient}>
                      {ingredient}
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
                      {allergen}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
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
            disabled={loading || !formData.name || !formData.price || !formData.category}
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
