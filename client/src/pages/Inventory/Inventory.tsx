import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Paper,
  LinearProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  Add,
  Edit,
  Warning,
  CheckCircle,
  Inventory as InventoryIcon,
  TrendingDown,
  ShoppingCart,
} from '@mui/icons-material';

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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTab, setSelectedTab] = useState(0);

  // Mock inventory data
  useEffect(() => {
    const mockInventory: InventoryItem[] = [
      {
        id: '1',
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
        id: '2',
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
        id: '3',
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
      {
        id: '4',
        name: 'Oat Milk',
        category: 'dairy',
        currentStock: 15,
        minStock: 5,
        maxStock: 30,
        unit: 'cartons',
        costPerUnit: 4.25,
        supplier: 'Plant Based Co.',
        lastRestocked: '2024-01-19T11:00:00Z',
        expiryDate: '2024-02-15T00:00:00Z',
        location: 'refrigerator-2',
      },
    ];
    setInventory(mockInventory);
    setFilteredInventory(mockInventory);
  }, []);

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

  const getStockIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      critical: <Warning color="error" />,
      low: <TrendingDown color="warning" />,
      good: <CheckCircle color="success" />,
    };
    return icons[status] || <Inventory />;
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
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
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
                            sx={{ textTransform: 'none' }}
                          >
                            Reorder
                          </Button>
                        )}
                        <IconButton size="small">
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
    </Box>
  );
};

export default Inventory;
