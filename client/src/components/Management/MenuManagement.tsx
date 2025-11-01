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
  CheckCircle,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { API_ENDPOINTS } from '../../config/api';
import { useTheme } from '@mui/material/styles';

interface SizePrice {
  size: string;
  price: number; // Back to number for stored data
}

interface FormSizePrice {
  size: string;
  price: string; // String for form editing
}

interface MenuItem {
  id: string | number; // Firestore uses string IDs, but support both for compatibility
  name: string;
  price: number; // Base price (for backward compatibility)
  category: string;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  preparationTime?: number;
  ingredients?: string[];
  sizes?: SizePrice[]; // New size-based pricing
}

interface MenuManagementProps {
  onMenuUpdate?: (items: MenuItem[]) => void;
}

const MenuManagement: React.FC<MenuManagementProps> = ({ onMenuUpdate }) => {
  const { emitMenuUpdate } = useSocket();
  const { user } = useAuth();
  const theme = useTheme();
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
    sizes: FormSizePrice[];
  }>({
    name: '',
    category: '',
    description: '',
    imageUrl: '',
    isAvailable: true,
    preparationTime: '',
    ingredients: [],
    sizes: [],
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const sizeOptions = [
    'Small',
    'Regular',
    'Large',
    'Extra Large'
  ];

  // Load inventory items from API
  const loadInventoryItems = async () => {
    try {
      setLoadingInventory(true);
      const response = await fetch(API_ENDPOINTS.INVENTORY);
      if (response.ok) {
        const data = await response.json();
        setInventoryItems(data.data || []);
        console.log('Loaded inventory items for ingredients:', data.data);
      } else {
        console.error('Failed to load inventory items');
        setInventoryItems([]);
      }
    } catch (error) {
      console.error('Error loading inventory items:', error);
      setInventoryItems([]);
    } finally {
      setLoadingInventory(false);
    }
  };

  // Get ingredient names from inventory
  const availableIngredients = inventoryItems.map(item => item.name);

  // Load inventory first, then menu items
  useEffect(() => {
    const initializeData = async () => {
      await loadInventoryItems();
      // Always load menu items, even if inventory is empty
      await loadMenuItems();
    };
    initializeData();
  }, []);
  
  // Reload menu items when inventory changes to filter ingredients (but don't block initial load)
  useEffect(() => {
    if (inventoryItems.length > 0 && menuItems.length > 0) {
      // Only reload to refilter if we already have menu items
      loadMenuItems();
    }
  }, [inventoryItems.length]);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      
      // Always use Firebase Functions URL
      const apiUrl = 'https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu';
      
      console.log('Loading menu items from:', apiUrl);
        
      // Add cache-busting timestamp to ensure fresh data
      const cacheBustUrl = `${apiUrl}?_t=${Date.now()}`;
      const response = await fetch(cacheBustUrl);
      console.log('Menu API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded menu items from API:', data);
        console.log('Menu items count:', data.data?.length || 0);
        console.log('First menu item data:', data.data?.[0]);
        console.log('First menu item sizes:', data.data?.[0]?.sizes);
        console.log('Available ingredients from inventory:', availableIngredients);
        
        // Filter ingredients on frontend to ensure only valid inventory items are shown
        let items = data.data || [];
        console.log('Menu items before filtering:', items.length);
        
        if (availableIngredients.length > 0) {
          items = items.map((item: MenuItem) => {
            if (item.ingredients && Array.isArray(item.ingredients)) {
              const filteredIngredients = item.ingredients.filter((ingredient: string) => 
                availableIngredients.includes(ingredient)
              );
              console.log(`Filtering ${item.name} ingredients: ${item.ingredients.join(', ')} -> ${filteredIngredients.join(', ')}`);
              return {
                ...item,
                ingredients: filteredIngredients
              };
            }
            return item;
          });
        }
        
        console.log('Menu items after filtering:', items.length);
        console.log('Setting menu items:', items);
        setMenuItems(items);
      } else {
        // No fallback - start with empty menu
        const errorText = await response.text();
        console.error('Failed to load menu items, response status:', response.status);
        console.error('Failed to load menu items, response text:', errorText);
        setMenuItems([]);
        setSnackbar({ open: true, message: `Failed to load menu items: ${response.status} ${errorText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      setSnackbar({ open: true, message: `Failed to load menu items: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
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

      // Prepare item data - ensure ID is included for PUT requests
      const itemData: any = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        isAvailable: formData.isAvailable,
        preparationTime: parseInt(formData.preparationTime) || 5,
        imageUrl: imagePreview || formData.imageUrl,
        ingredients: formData.ingredients,
        price: parseFloat(formData.sizes[0].price) || 0, // Use first size as base price for backward compatibility
        sizes: formData.sizes.map(size => ({
          ...size,
          price: parseFloat(size.price) || 0
        } as SizePrice)),
      };

      // Include ID only when editing (PUT request)
      if (editingItem && editingItem.id) {
        itemData.id = editingItem.id.toString(); // Convert to string for Firestore
      }

      // Add staff info for audit logging
      itemData.staffId = user?.email || user?.id || 'unknown';
      itemData.staffEmail = user?.email || '';
      itemData.staffName = user?.name || 'Unknown';

      // Filter ingredients to only include items that exist in inventory
      if (itemData.ingredients && Array.isArray(itemData.ingredients)) {
        itemData.ingredients = itemData.ingredients.filter((ingredient: string) => 
          availableIngredients.includes(ingredient)
        );
      }

      console.log('Saving menu item with data:', JSON.stringify(itemData, null, 2));
      console.log('Editing item:', editingItem);
      console.log('Sizes array being sent:', JSON.stringify(itemData.sizes, null, 2));
      console.log('Filtered ingredients:', itemData.ingredients);

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
        console.error('Save failed, response status:', response.status);
        console.error('Save failed, response text:', errorText);
        setSnackbar({ open: true, message: `Failed to save menu item: ${errorText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error saving menu item:', error);
      setSnackbar({ open: true, message: 'Failed to save menu item', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item: MenuItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      setDeleteDialogOpen(false);
      
      // Always use Firebase Functions URL - ensure ID is converted to string
      const itemId = itemToDelete.id.toString();
      const staffId = user?.email || user?.id || 'unknown';
      const apiUrl = `https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu/${itemId}?staffId=${encodeURIComponent(staffId)}&staffEmail=${encodeURIComponent(user?.email || '')}`;
      
      console.log('Deleting menu item:', itemId, 'URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Parse response to verify deletion
        const result = await response.json().catch(() => ({}));
        console.log('Delete response:', result);
        
        // Reload menu items to get the latest data from server (with cache-busting)
        await loadMenuItems();
        
        // Also remove from local state immediately for better UX
        setMenuItems(prev => prev.filter(item => item.id.toString() !== itemId));
        
        setSnackbar({ open: true, message: 'Menu item deleted successfully', severity: 'success' });
        
        // Emit menu update to other components
        emitMenuUpdate({
          action: 'delete',
          item: itemToDelete,
          timestamp: new Date().toISOString()
        });
      } else {
        const errorText = await response.text();
        console.error('Delete failed, response status:', response.status);
        console.error('Delete failed, response:', errorText);
        setSnackbar({ open: true, message: `Failed to delete menu item: ${errorText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      setSnackbar({ open: true, message: `Failed to delete menu item: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      setLoading(true);
      
      // Ensure ID is converted to string for Firestore
      const updatedItem = { 
        ...item, 
        id: item.id.toString(), // Convert to string
        isAvailable: !item.isAvailable 
      };
      
      console.log('Toggling availability for item:', updatedItem);
      
      // Always use Firebase Functions URL
      const apiUrl = 'https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu';
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedItem),
      });

      if (response.ok) {
        // Reload menu items to get the latest data from server
        await loadMenuItems();
        
        setSnackbar({ 
          open: true, 
          message: `Menu item ${updatedItem.isAvailable ? 'enabled' : 'disabled'}`, 
          severity: 'success' 
        });
        
        // Emit menu update to other components
        emitMenuUpdate({
          action: 'update',
          item: updatedItem,
          timestamp: new Date().toISOString()
        });
      } else {
        const errorText = await response.text();
        console.error('Toggle availability failed, response status:', response.status);
        console.error('Toggle availability failed, response:', errorText);
        setSnackbar({ open: true, message: `Failed to update availability: ${errorText}`, severity: 'error' });
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      setSnackbar({ open: true, message: `Failed to update availability: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
    } finally {
      setLoading(false);
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
                            disabled={loading}
                            sx={{ color: item.isAvailable ? '#ff9800' : '#4caf50' }}
                            title={item.isAvailable ? 'Disable item' : 'Enable item'}
                          >
                            {item.isAvailable ? <Cancel fontSize="small" /> : <CheckCircle fontSize="small" />}
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(item)}
                            disabled={loading}
                            sx={{ color: '#f44336' }}
                            title="Delete item"
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
             <Grid item xs={12}>
               <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                 Ingredients
               </Typography>
               {loadingInventory ? (
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                   <CircularProgress size={20} />
                   <Typography variant="body2" color="text.secondary">
                     Loading inventory items...
                   </Typography>
                 </Box>
               ) : availableIngredients.length === 0 ? (
                 <Alert severity="info" sx={{ mb: 2 }}>
                   No inventory items found. Please add items to inventory first.
                 </Alert>
               ) : (
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
                     {availableIngredients.map((ingredient) => (
                       <MenuItem key={ingredient} value={ingredient}>
                         <Checkbox checked={formData.ingredients.includes(ingredient)} />
                         <Typography sx={{ ml: 1 }}>{ingredient}</Typography>
                       </MenuItem>
                     ))}
                   </Select>
                 </FormControl>
               )}
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

       {/* Delete Confirmation Dialog */}
       <Dialog 
         open={deleteDialogOpen} 
         onClose={handleDeleteCancel}
         maxWidth="xs"
         fullWidth
         PaperProps={{
           sx: {
             backgroundColor: theme.palette.background.paper,
           }
         }}
       >
         <DialogTitle sx={{ color: theme.palette.text.primary }}>
           Delete Menu Item
         </DialogTitle>
         <DialogContent>
           <Typography sx={{ color: theme.palette.text.primary }}>
             Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
           </Typography>
         </DialogContent>
         <DialogActions>
           <Button 
             onClick={handleDeleteCancel}
             disabled={loading}
             sx={{ color: theme.palette.text.secondary }}
           >
             Cancel
           </Button>
           <Button 
             onClick={handleDeleteConfirm}
             variant="contained"
             disabled={loading}
             sx={{ 
               bgcolor: '#f44336',
               '&:hover': {
                 bgcolor: '#d32f2f',
               }
             }}
             startIcon={loading ? <CircularProgress size={16} /> : <Delete />}
           >
             {loading ? 'Deleting...' : 'Delete'}
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
