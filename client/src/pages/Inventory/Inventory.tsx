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
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  Add,
  Edit,
  Delete,
  Inventory as InventoryIcon,
  ShoppingCart,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { API_ENDPOINTS, API_BASE } from '../../config/api';
import { notify } from '../../utils/notifications';

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
  const theme = useTheme();
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
    location: '',
  });
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Fetch inventory from API
  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Fetching inventory from:', API_ENDPOINTS.INVENTORY);
      const response = await fetch(API_ENDPOINTS.INVENTORY, {
        cache: 'no-cache', // Force fresh data
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📦 Inventory API response:', result);
      
      if (result.success && result.data) {
        console.log('✅ Setting inventory data:', result.data.length, 'items');
        setInventory(result.data);
        setFilteredInventory(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch inventory');
      }
    } catch (err) {
      console.error('❌ Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch inventory');
      // Don't use fallback mock data - let the error show
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

  // Hourly low stock alert pop-ups (only once per hour, per session)
  useEffect(() => {
    const STORAGE_KEY = 'cafesync_last_inventory_alert';
    const ALERT_INTERVAL = 3600000; // 1 hour in milliseconds

    // Function to check and show low stock alerts
    const checkLowStockAlerts = async () => {
      try {
        // Check if we've already alerted in this hour
        const lastAlertTime = localStorage.getItem(STORAGE_KEY);
        const now = Date.now();
        
        if (lastAlertTime) {
          const timeSinceLastAlert = now - parseInt(lastAlertTime, 10);
          // If less than 1 hour has passed, don't alert
          if (timeSinceLastAlert < ALERT_INTERVAL) {
            console.log(`⏰ Inventory alerts already shown ${Math.round((ALERT_INTERVAL - timeSinceLastAlert) / 60000)} minutes ago. Next alert in ${Math.round((ALERT_INTERVAL - timeSinceLastAlert) / 60000)} minutes.`);
            return;
          }
        }

        const response = await fetch(API_ENDPOINTS.INVENTORY_ALERTS);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data && result.data.length > 0) {
            const lowStockItems = result.data;
            
            // Show pop-up notification for each low stock item - check lowStockWarnings setting
            lowStockItems.forEach((item: InventoryItem) => {
              notify.warning(
                `${item.name} is running low! Current: ${item.currentStock} ${item.unit}, Minimum: ${item.minStock} ${item.unit}`,
                true, // Play sound
                true, // Check if enabled
                'lowStockWarnings' // Notification type
              );
            });
            
            // Store the alert time to prevent re-alerting
            localStorage.setItem(STORAGE_KEY, now.toString());
            console.log('✅ Inventory alerts shown. Next alert in 1 hour.');
          }
        }
      } catch (error) {
        console.error('Error checking low stock alerts:', error);
      }
    };

    // Check immediately on mount (will only show if 1 hour has passed since last alert)
    checkLowStockAlerts();

    // Set up interval to check every hour (3600000 milliseconds = 1 hour)
    const interval = setInterval(() => {
      checkLowStockAlerts();
    }, ALERT_INTERVAL);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []); // Empty dependency array - only run on mount

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

  // Handle Delete button click
  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  // Handle Delete confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setDeleting(true);
      const itemId = itemToDelete.id;
      console.log('🗑️ Deleting inventory item:', itemId);
      console.log('🗑️ Delete URL:', `${API_ENDPOINTS.INVENTORY}?id=${itemId}`);
      
      const response = await fetch(`${API_ENDPOINTS.INVENTORY}?id=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🗑️ Delete response status:', response.status);
      const responseText = await response.text();
      console.log('🗑️ Delete response text:', responseText);

      if (response.ok) {
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          result = { success: true };
        }
        console.log('✅ Delete successful:', result);
        setDeleteDialogOpen(false);
        const deletedItemName = itemToDelete.name;
        setItemToDelete(null);
        // Force refresh inventory - wait a bit to ensure Firebase has updated
        setTimeout(async () => {
          await fetchInventory();
          setSnackbarMessage(`"${deletedItemName}" deleted successfully`);
          setSnackbarOpen(true);
        }, 500);
      } else {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { error: responseText };
        }
        console.error('❌ Failed to delete item:', response.status, errorData);
        setSnackbarMessage(`Failed to delete item: ${errorData.error || errorData.message || responseText}`);
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error('❌ Error deleting item:', err);
      setSnackbarMessage(`Failed to delete item: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setSnackbarOpen(true);
    } finally {
      setDeleting(false);
    }
  };

  // Handle Delete cancel
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Handle Save (Add/Edit)
  const handleSaveItem = async () => {
    try {
      setLoading(true);
      
      if (isEditMode && selectedItem) {
        // Update existing item
        // Firebase Functions expects PUT to /api/inventory with ID in body, not in URL
        // Remove id from formData to avoid conflicts, we'll set it explicitly
        const { id: _, ...formDataWithoutId } = formData;
        const updateData = {
          ...formDataWithoutId,
          id: selectedItem.id, // Use the original item ID
          lastRestocked: selectedItem.lastRestocked || new Date().toISOString(),
        };
        
        const response = await fetch(`${API_ENDPOINTS.INVENTORY}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Update successful:', result);
          setEditDialogOpen(false);
          setIsEditMode(false);
          setSelectedItem(null);
          // Clear form data before refreshing to avoid stale data
          setFormData({
            name: '',
            category: '',
            currentStock: 0,
            minStock: 0,
            maxStock: 0,
            unit: '',
            costPerUnit: 0,
            location: '',
          });
          // Force refresh - wait a bit to ensure Firebase has updated
          setTimeout(async () => {
            await fetchInventory(); // Refresh inventory list
            setSnackbarMessage('Item updated successfully');
            setSnackbarOpen(true);
          }, 500);
        } else {
          const errorText = await response.text();
          console.error('Failed to update item:', response.status, errorText);
          setSnackbarMessage(`Failed to update item: ${errorText}`);
          setSnackbarOpen(true);
        }
      } else {
        // Add new item - don't include id, let Firebase generate it
        const newItem = {
          ...formData,
          // Remove id if it exists - Firebase will generate it
          id: undefined,
          lastRestocked: new Date().toISOString(),
        };
        // Remove id from the object
        delete (newItem as any).id;

        const response = await fetch(`${API_ENDPOINTS.INVENTORY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem),
        });

        if (response.ok) {
          setAddDialogOpen(false);
          setIsEditMode(false);
          setSelectedItem(null);
          // Clear form data before refreshing
          setFormData({
            name: '',
            category: '',
            currentStock: 0,
            minStock: 0,
            maxStock: 0,
            unit: '',
            costPerUnit: 0,
            location: '',
          });
          await fetchInventory();
          setSnackbarMessage('Item added successfully');
          setSnackbarOpen(true);
        } else {
          const errorText = await response.text();
          console.error('Failed to add item:', response.status, errorText);
          setSnackbarMessage(`Failed to add item: ${errorText}`);
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
        item.category.toLowerCase().includes(searchTerm.toLowerCase())
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
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            mb: 1,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)'
              : 'linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
        Inventory Management
      </Typography>
        <Typography variant="body2" color="text.secondary">
          Track and manage your inventory items
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '60%',
              height: '60%',
              background: 'radial-gradient(circle, rgba(33, 150, 243, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(30%, -30%)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#2196f3',
                background: 'linear-gradient(135deg, #2196f3 0%, #42a5f5 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {stats.totalItems}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                Total Items
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '60%',
              height: '60%',
              background: 'radial-gradient(circle, rgba(244, 67, 54, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(30%, -30%)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#f44336',
                background: 'linear-gradient(135deg, #f44336 0%, #e57373 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {stats.lowStockItems}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                Low Stock
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '60%',
              height: '60%',
              background: 'radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(30%, -30%)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#4caf50',
                background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                ₱{stats.totalValue.toFixed(0)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                Total Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              right: 0,
              width: '60%',
              height: '60%',
              background: 'radial-gradient(circle, rgba(255, 152, 0, 0.15) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(30%, -30%)',
            },
          }}>
            <CardContent sx={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
              <Typography variant="h4" sx={{ 
                fontWeight: 700, 
                color: '#ff9800',
                background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {stats.categories}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
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
                          {item.category} • {item.location}
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
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteClick(item)}
                          color="error"
                          title="Delete item"
                          disabled={deleting}
                        >
                          <Delete />
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
        setIsEditMode(false);
        setSelectedItem(null);
        setFormData({
          name: '',
          category: '',
          currentStock: 0,
          minStock: 0,
          maxStock: 0,
          unit: '',
          costPerUnit: 0,
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
                value={formData.currentStock || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, currentStock: value });
                }}
                inputProps={{ min: 0, step: 1 }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Min Stock"
                type="number"
                value={formData.minStock || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, minStock: value });
                }}
                inputProps={{ min: 0, step: 1 }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Max Stock"
                type="number"
                value={formData.maxStock || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, maxStock: value });
                }}
                inputProps={{ min: 0, step: 1 }}
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
                value={formData.costPerUnit || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : Number(e.target.value);
                  setFormData({ ...formData, costPerUnit: value });
                }}
                inputProps={{ min: 0, step: 0.01 }}
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
        <DialogTitle sx={{ color: theme.palette.text.primary, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Delete sx={{ color: '#f44336', fontSize: 28 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Delete Inventory Item
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: theme.palette.text.primary, mb: 2 }}>
            Are you sure you want to delete <strong>"{itemToDelete?.name}"</strong>?
          </Typography>
          <Alert severity="warning" sx={{ mt: 1 }}>
            This action cannot be undone. The item will be permanently removed from your inventory.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={handleDeleteCancel}
            disabled={deleting}
            sx={{ 
              color: theme.palette.text.secondary,
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} color="inherit" /> : <Delete />}
            sx={{ 
              bgcolor: '#f44336',
              '&:hover': {
                bgcolor: '#d32f2f',
              },
              textTransform: 'none'
            }}
          >
            {deleting ? 'Deleting...' : 'Delete'}
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
