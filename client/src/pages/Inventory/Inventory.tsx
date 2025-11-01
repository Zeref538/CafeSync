import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  Add,
  Edit,
  Inventory as InventoryIcon,
  ShoppingCart,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { API_ENDPOINTS, API_BASE } from '../../config/api';

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  lastRestocked: string;
  expiryDate?: string;
  location: string;
}

const Inventory: React.FC = () => {
  const { socket } = useSocket();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTab, setSelectedTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    name: '',
    category: '',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    unit: '',
    costPerUnit: 0,
    supplier: '',
    location: '',
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch inventory from API
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_ENDPOINTS.INVENTORY);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setInventory(result.data);
        setFilteredInventory(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch inventory');
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      // Fallback to mock data if API fails
      const mockInventory: InventoryItem[] = [
        {
          id: 'coffee-beans-1',
          name: 'Premium Arabica Beans',
          category: 'coffee',
          currentStock: 50,
          minStock: 10,
          maxStock: 100,
          unit: 'lbs',
          costPerUnit: 12.50,
          supplier: 'Coffee Supply Co.',
          lastRestocked: '2024-01-15T10:00:00Z',
          expiryDate: '2024-06-15T00:00:00Z',
          location: 'storage-room-a',
        },
        {
          id: 'milk-whole-1',
          name: 'Whole Milk',
          category: 'dairy',
          currentStock: 3,
          minStock: 5,
          maxStock: 50,
          unit: 'gallons',
          costPerUnit: 3.50,
          supplier: 'Dairy Fresh',
          lastRestocked: '2024-01-20T08:00:00Z',
          expiryDate: '2024-01-27T00:00:00Z',
          location: 'refrigerator-1',
        },
        {
          id: 'syrup-vanilla-1',
          name: 'Vanilla Syrup',
          category: 'syrups',
          currentStock: 1,
          minStock: 3,
          maxStock: 20,
          unit: 'bottles',
          costPerUnit: 8.99,
          supplier: 'Flavor Masters',
          lastRestocked: '2024-01-18T14:00:00Z',
          expiryDate: '2025-01-18T00:00:00Z',
          location: 'shelf-b2',
        },
      ];
      setInventory(mockInventory);
      setFilteredInventory(mockInventory);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load inventory on component mount
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Listen for real-time inventory updates
  useEffect(() => {
    if (socket) {
      socket.on('inventory-update', (data) => {
        console.log('Inventory update received:', data);
        fetchInventory(); // Refresh inventory when updates are received
        setSnackbarMessage(`Inventory updated: ${data.itemName || 'Item'}`);
        setSnackbarOpen(true);
      });
    }

    return () => {
      if (socket) {
        socket.off('inventory-update');
      }
    };
  }, [socket, fetchInventory]);

  // Update inventory stock
  const updateStock = async (itemId: string, quantity: number, operation: 'add' | 'subtract' | 'set', reason?: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/inventory/${itemId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quantity,
          operation,
          reason: reason || 'Manual adjustment',
          updatedBy: 'user'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        // Emit inventory update via socket
        if (socket) {
          socket.emit('inventory-update', {
            itemId,
            itemName: result.data.name,
            operation,
            quantity,
            newStock: result.data.currentStock
          });
        }
        
        // Refresh inventory
        await fetchInventory();
        setSnackbarMessage(`Stock updated successfully`);
        setSnackbarOpen(true);
      } else {
        throw new Error(result.error || 'Failed to update stock');
      }
    } catch (err) {
      console.error('Error updating stock:', err);
      setSnackbarMessage(`Failed to update stock: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    }
  };

  // Handle refresh button
  const handleRefresh = () => {
    fetchInventory();
  };

  // Handle Add Item button
  const handleAddItem = () => {
    setFormData({
      name: '',
      category: '',
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      unit: '',
      costPerUnit: 0,
      supplier: '',
      location: '',
    });
    setAddDialogOpen(true);
    setIsEditMode(false);
  };

  // Handle Edit button
  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setFormData(item);
    setEditDialogOpen(true);
    setIsEditMode(true);
  };

  // Handle Reorder button
  const handleReorder = async (item: InventoryItem) => {
    try {
      await updateStock(item.id, item.maxStock, 'set', 'Automatic reorder - Low stock alert');
      setSnackbarMessage(`Reorder initiated for ${item.name}`);
      setSnackbarOpen(true);
    } catch (err) {
      console.error('Error reordering:', err);
    }
  };

  // Handle Save (Add/Edit)
  const handleSaveItem = async () => {
    try {
      setLoading(true);
      
      if (isEditMode && selectedItem) {
        // Update existing item
        const response = await fetch(`${API_BASE}/api/inventory/${selectedItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            id: selectedItem.id,
            lastRestocked: selectedItem.lastRestocked,
          }),
        });

        if (response.ok) {
          setEditDialogOpen(false);
          await fetchInventory();
          setSnackbarMessage('Item updated successfully');
          setSnackbarOpen(true);
        }
      } else {
        // Add new item
        const newItem = {
          ...formData,
          id: `item-${Date.now()}`,
          lastRestocked: new Date().toISOString(),
        };

        const response = await fetch(`${API_BASE}/api/inventory`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });

        if (response.ok) {
          setAddDialogOpen(false);
          await fetchInventory();
          setSnackbarMessage('Item added successfully');
          setSnackbarOpen(true);
        }
      }
    } catch (err) {
      console.error('Error saving item:', err);
      setSnackbarMessage('Failed to save item');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  // Filter inventory based on search and category
  useEffect(() => {
    let filtered = inventory;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    setFilteredInventory(filtered);
  }, [inventory, searchTerm, categoryFilter]);

  const getStockStatus = (current: number, min: number) => {
    if (current <= min) return 'critical';
    if (current <= min * 1.5) return 'low';
    return 'good';
  };

  const getStockColor = (status: string) => {
    const colors: Record<string, string> = {
      critical: '#f44336',
      low: '#ff9800',
      good: '#4caf50',
    };
    return colors[status] || '#666';
  };


  const getCategories = () => {
    return Array.from(new Set(inventory.map(item => item.category)));
  };

  const getInventoryStats = () => {
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => item.currentStock <= item.minStock).length;
    const totalValue = inventory.reduce((sum, item) => sum + (item.currentStock * item.costPerUnit), 0);
    const categories = getCategories().length;

    return { totalItems, lowStockItems, totalValue, categories };
  };

  const stats = getInventoryStats();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Inventory Management
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                {stats.totalItems}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#f44336' }}>
                {stats.lowStockItems}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Low Stock
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                ₱{stats.totalValue.toFixed(0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {stats.categories}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Categories
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Error loading inventory
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      )}

      {/* Low Stock Alert */}
      {stats.lowStockItems > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {stats.lowStockItems} items are running low on stock
          </Typography>
          <Typography variant="body2">
            Consider reordering to avoid stockouts
          </Typography>
        </Alert>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => setCategoryFilter(categoryFilter === 'all' ? 'coffee' : 'all')}
            >
              Filter
            </Button>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleAddItem}
              sx={{ textTransform: 'none' }}
            >
              Add Item
            </Button>
          </Box>

          {/* Category Tabs */}
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => {
              setSelectedTab(newValue);
              const categories = ['all', ...getCategories()];
              setCategoryFilter(categories[newValue]);
            }}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label="All" />
            {getCategories().map(category => (
              <Tab key={category} label={category.charAt(0).toUpperCase() + category.slice(1)} />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Inventory List */}
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Loading inventory...
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {filteredInventory.map((item, index) => {
              const stockStatus = getStockStatus(item.currentStock, item.minStock);
              const stockPercentage = (item.currentStock / item.maxStock) * 100;
              
              return (
                <React.Fragment key={item.id}>
                  <ListItem sx={{ px: 0, py: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                          <Chip
                            label={stockStatus}
                            size="small"
                            sx={{
                              backgroundColor: `${getStockColor(stockStatus)}20`,
                              color: getStockColor(stockStatus),
                              fontWeight: 500,
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {item.category} • {item.supplier} • {item.location}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                          <Typography variant="body2">
                            Stock: {item.currentStock} {item.unit}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Min: {item.minStock} {item.unit}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Max: {item.maxStock} {item.unit}
                          </Typography>
                        </Box>
                        
                        <LinearProgress
                          variant="determinate"
                          value={stockPercentage}
                          color={stockStatus === 'critical' ? 'error' : stockStatus === 'low' ? 'warning' : 'success'}
                          sx={{ height: 6, borderRadius: 3, mb: 1 }}
                        />
                        
                        <Typography variant="body2" color="text.secondary">
                          Value: ₱{(item.currentStock * item.costPerUnit).toFixed(2)} • 
                          Last restocked: {new Date(item.lastRestocked).toLocaleDateString()}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                        {stockStatus === 'critical' && (
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<ShoppingCart />}
                            onClick={() => handleReorder(item)}
                            sx={{ textTransform: 'none' }}
                          >
                            Reorder
                          </Button>
                        )}
                        <IconButton size="small" onClick={() => handleEditItem(item)}>
                          <Edit />
                        </IconButton>
                      </Box>
                    </Box>
                  </ListItem>
                  {index < filteredInventory.length - 1 && <Divider />}
                </React.Fragment>
              );
            })}
            </List>
          )}

          {filteredInventory.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No inventory items found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || categoryFilter !== 'all' ? 'Try adjusting your filters' : 'No items to display'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Item Dialog */}
      <Dialog open={addDialogOpen || editDialogOpen} onClose={() => {
        setAddDialogOpen(false);
        setEditDialogOpen(false);
        setFormData({
          name: '',
          category: '',
          currentStock: 0,
          minStock: 0,
          maxStock: 0,
          unit: '',
          costPerUnit: 0,
          supplier: '',
          location: '',
        });
      }} maxWidth="md" fullWidth>
        <DialogTitle>{isEditMode ? 'Edit Inventory Item' : 'Add New Inventory Item'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Item Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <MenuItem value="coffee">Coffee</MenuItem>
                  <MenuItem value="dairy">Dairy</MenuItem>
                  <MenuItem value="syrups">Syrups</MenuItem>
                  <MenuItem value="pastries">Pastries</MenuItem>
                  <MenuItem value="cups">Cups & Packaging</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Current Stock"
                type="number"
                value={formData.currentStock}
                onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Min Stock"
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Stock"
                type="number"
                value={formData.maxStock}
                onChange={(e) => setFormData({ ...formData, maxStock: Number(e.target.value) })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Unit</InputLabel>
                <Select
                  value={formData.unit}
                  label="Unit"
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                >
                  <MenuItem value="lbs">Lbs</MenuItem>
                  <MenuItem value="kg">Kg</MenuItem>
                  <MenuItem value="g">Grams</MenuItem>
                  <MenuItem value="oz">Ounces</MenuItem>
                  <MenuItem value="gallons">Gallons</MenuItem>
                  <MenuItem value="liters">Liters</MenuItem>
                  <MenuItem value="bottles">Bottles</MenuItem>
                  <MenuItem value="packs">Packs</MenuItem>
                  <MenuItem value="pieces">Pieces</MenuItem>
                  <MenuItem value="boxes">Boxes</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Cost Per Unit"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">₱</InputAdornment>,
                }}
                value={formData.costPerUnit}
                onChange={(e) => setFormData({ ...formData, costPerUnit: Number(e.target.value) })}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Location"
                placeholder="e.g., storage-room-a, refrigerator-1"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAddDialogOpen(false);
            setEditDialogOpen(false);
          }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveItem} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Inventory;
