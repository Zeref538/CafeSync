import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Divider,
  Paper,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  Receipt,
  ShoppingCart,
  Delete,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';

interface SizePrice {
  size: string;
  price: number; // Keep as number for display purposes
}

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
  sizes?: SizePrice[];
}

const FrontCounter: React.FC = () => {
  const { socket, joinStation, emitOrderUpdate } = useSocket();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentOrder, setCurrentOrder] = useState<any[]>([]);
  const [customerInfo, setCustomerInfo] = useState({
    tableNumber: '', // optional; leave blank for takeout
    paymentMethod: 'cash', // default payment method
  });
  const [customizationOpen, setCustomizationOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('Regular');
  const [selectedMilk, setSelectedMilk] = useState<string>('Whole');
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Load menu items from server
  const loadMenuItems = async () => {
    try {
      setLoading(true);
      // Always use Firebase Functions URL
      const apiUrl = 'https://us-central1-cafesync-3b25a.cloudfunctions.net/api/menu';
        
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        console.log('Front Counter - Loaded menu items:', data);
        console.log('Front Counter - First menu item:', data.data?.[0]);
        console.log('Front Counter - First menu item sizes:', data.data?.[0]?.sizes);
        setMenuItems(data.data || []);
      } else {
        // No fallback - start with empty menu
        console.error('Front Counter - Failed to load menu items');
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error loading menu items:', error);
      // No fallback - start with empty menu
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Load menu items on component mount
  useEffect(() => {
    loadMenuItems();
  }, []);

  // Get unique categories from menu items
  const availableCategories = ['All', ...Array.from(new Set(menuItems.map(item => item.category)))];

  const filteredItems = menuItems
    .filter(item => item.isAvailable) // Only show available items
    .filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(item => selectedCategory === 'All' || item.category === selectedCategory);

  const addToOrder = (item: any) => {
    const existingItem = currentOrder.find(orderItem => orderItem.id === item.id);
    if (existingItem) {
      setCurrentOrder(prev => prev.map(orderItem =>
        orderItem.id === item.id
          ? { ...orderItem, quantity: orderItem.quantity + 1 }
          : orderItem
      ));
    } else {
      setCurrentOrder(prev => [...prev, { ...item, quantity: 1 }]);
    }
  };

  const removeFromOrder = (itemId: number) => {
    setCurrentOrder(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrder(itemId);
    } else {
      setCurrentOrder(prev => prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      ));
    }
  };

  const getTotalPrice = () => {
    return currentOrder.reduce((total, item) => {
      const unit = (item.unitPrice ?? item.price);
      return total + (unit * item.quantity);
    }, 0);
  };

  const openCustomization = (item: any) => {
    setSelectedItem(item);
    
    // Set default size based on available sizes
    if (item.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0].size);
    } else {
      setSelectedSize('Regular');
    }
    
    setSelectedMilk('Whole');
    setSelectedExtras([]);
    setCustomNotes('');
    setCustomizationOpen(true);
  };

  const closeCustomization = () => {
    setCustomizationOpen(false);
    setSelectedItem(null);
  };

  const calculateUnitPrice = (base: number) => {
    if (!selectedItem) return base;
    
    // Find the selected size price from the menu item
    let sizePrice = base;
    if (selectedItem.sizes && selectedItem.sizes.length > 0) {
      const selectedSizeOption = selectedItem.sizes.find((size: SizePrice) => size.size === selectedSize);
      if (selectedSizeOption) {
        sizePrice = selectedSizeOption.price;
      }
    }
    
    // Add milk and extras pricing
    if (selectedMilk === 'Almond' || selectedMilk === 'Oat') sizePrice += 0.5;
    sizePrice += selectedExtras.length * 0.5;
    return sizePrice;
  };

  const addCustomizedToOrder = () => {
    if (!selectedItem) return;
    const unitPrice = parseFloat(calculateUnitPrice(selectedItem.price).toFixed(2));
    const customizations = {
      size: selectedSize,
      milk: selectedMilk,
      extras: selectedExtras,
      notes: customNotes,
    };

    const existingIndex = currentOrder.findIndex((line) => (
      line.id === selectedItem.id &&
      JSON.stringify(line.customizations) === JSON.stringify(customizations)
    ));

    if (existingIndex >= 0) {
      setCurrentOrder(prev => prev.map((line, idx) => idx === existingIndex
        ? { ...line, quantity: line.quantity + 1 }
        : line
      ));
    } else {
      setCurrentOrder(prev => [
        ...prev,
        {
          id: selectedItem.id,
          name: selectedItem.name,
          basePrice: selectedItem.price,
          unitPrice,
          price: unitPrice,
          quantity: 1,
          customizations,
        },
      ]);
    }

    closeCustomization();
  };

  const removeFromOrderByIndex = (lineIndex: number) => {
    setCurrentOrder(prev => prev.filter((_, idx) => idx !== lineIndex));
  };

  const updateQuantityByIndex = (lineIndex: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromOrderByIndex(lineIndex);
    } else {
      setCurrentOrder(prev => prev.map((line, idx) => idx === lineIndex ? { ...line, quantity } : line));
    }
  };

  const handlePlaceOrder = async () => {
    if (currentOrder.length === 0) {
      console.log('No items in order');
      return;
    }

    console.log('Placing order...', currentOrder);

    const order = {
      customer: customerInfo.tableNumber || 'Takeout',
      items: currentOrder,
      total: getTotalPrice(),
      station: 'front-counter',
      paymentMethod: customerInfo.paymentMethod,
      staffId: user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    };

    console.log('Order data:', order);

    try {
      // Send order to server
      console.log('Sending request to server...');
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(order),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        const createdOrder = result.data;

        console.log('Order created successfully:', createdOrder);

        // Emit order update via socket to notify other stations
        emitOrderUpdate({
          ...createdOrder,
          station: 'front-counter',
          timestamp: new Date().toISOString(),
        });

        // Reset form
        setCurrentOrder([]);
        setCustomerInfo({ tableNumber: '', paymentMethod: 'cash' });

        console.log('Order placed successfully:', createdOrder);
      } else {
        const errorText = await response.text();
        console.error('Failed to place order:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error placing order:', error);
    }
  };

  React.useEffect(() => {
    joinStation('front-counter');
  }, [joinStation]);

  // Listen for menu updates from Menu Management
  React.useEffect(() => {
    if (socket) {
      socket.on('menu-update', (data: any) => {
        console.log('Front Counter received menu update:', data);
        // Reload menu items when menu is updated
        loadMenuItems();
      });
    }

    return () => {
      if (socket) {
        socket.off('menu-update');
      }
    };
  }, [socket]);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Front Counter
      </Typography>

      <Grid container spacing={3}>
        {/* Menu Items */}
        <Grid item xs={12} md={9}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                  Menu Items
                </Typography>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel id="category-select-label">Category</InputLabel>
                  <Select
                    labelId="category-select-label"
                    id="category-select"
                    value={selectedCategory}
                    label="Category"
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    {availableCategories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  placeholder="Search menu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 300, minWidth: 220 }}
                />
              </Box>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {filteredItems.map((item) => (
                    <Grid item xs={12} sm={6} md={3} key={item.id}>
                      <Paper
                        sx={{
                          p: 1.5,
                          cursor: 'pointer',
                          border: '1px solid #e0e0e0',
                          borderRadius: 2,
                          '&:hover': {
                            borderColor: '#8B4513',
                            backgroundColor: '#f5f5f5',
                          },
                        }}
                        onClick={() => openCustomization(item)}
                      >
                        <Box sx={{ width: '100%', aspectRatio: '1 / 1', backgroundColor: '#eeeeee', borderRadius: 1, mb: 1 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {item.name}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#8B4513' }}>
                          ₱{item.price.toFixed(2)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Order Summary */}
        <Grid item xs={12} md={3}>
          <Card sx={{ position: 'sticky', top: 20 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                Current Order
              </Typography>

              {/* Customer Info */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                  Customer Information
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Table Number (optional)"
                  placeholder="Leave blank for takeout"
                  value={customerInfo.tableNumber}
                  onChange={(e) => setCustomerInfo(prev => ({ ...prev, tableNumber: e.target.value }))}
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  sx={{ mb: 2 }}
                />
                <FormControl fullWidth size="small">
                  <InputLabel id="payment-method-label">Payment Method</InputLabel>
                  <Select
                    labelId="payment-method-label"
                    id="payment-method-select"
                    value={customerInfo.paymentMethod}
                    label="Payment Method"
                    onChange={(e) => setCustomerInfo(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  >
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="card">Card</MenuItem>
                    <MenuItem value="mobile">Mobile Payment</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Order Items */}
              {currentOrder.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <ShoppingCart sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No items in order
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {currentOrder.map((item, index) => (
                    <ListItem key={`${item.id}-${index}`} sx={{ px: 0, py: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, width: '100%', flexWrap: 'wrap' }}>
                        <Box sx={{ minWidth: 200, flex: '1 1 240px' }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                          {item.customizations ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', mt: 0.5 }}>
                              <Chip label={item.customizations.size} size="small" />
                              <Chip label={item.customizations.milk} size="small" />
                              {item.customizations.extras && item.customizations.extras.map((ex: string) => (
                                <Chip key={ex} label={ex} size="small" />
                              ))}
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                                ₱{ (item.unitPrice ?? item.price).toFixed(2) } each
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                              ₱{item.price.toFixed(2)} each
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => updateQuantityByIndex(index, item.quantity - 1)}
                            sx={{ minWidth: 32, height: 32 }}
                          >
                            -
                          </Button>
                          <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                            {item.quantity}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => updateQuantityByIndex(index, item.quantity + 1)}
                            sx={{ minWidth: 32, height: 32 }}
                          >
                            +
                          </Button>
                          <IconButton
                            size="small"
                            onClick={() => removeFromOrderByIndex(index)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Total and Place Order */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Total:
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#8B4513' }}>
                  ₱{getTotalPrice().toFixed(2)}
                </Typography>
              </Box>

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={<Receipt />}
                onClick={handlePlaceOrder}
                disabled={currentOrder.length === 0}
                sx={{ py: 1.5, fontSize: '1.1rem', fontWeight: 600 }}
              >
                Place Order
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Customization Dialog */}
      <Dialog open={customizationOpen} onClose={closeCustomization} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem ? `Customize ${selectedItem.name}` : 'Customize Item'}
        </DialogTitle>
        <DialogContent sx={{ minHeight: 400 }}>
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="size-label">Size</InputLabel>
                <Select labelId="size-label" label="Size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                  {selectedItem?.sizes && selectedItem.sizes.length > 0 ? (
                    selectedItem.sizes.map((size: SizePrice) => (
                      <MenuItem key={size.size} value={size.size}>
                        {size.size} - ₱{size.price.toFixed(2)}
                      </MenuItem>
                    ))
                  ) : (
                    <MenuItem value="Regular">Regular - ₱{selectedItem?.price.toFixed(2) || '0.00'}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="milk-label">Milk</InputLabel>
                <Select labelId="milk-label" label="Milk" value={selectedMilk} onChange={(e) => setSelectedMilk(e.target.value)}>
                  <MenuItem value="Whole">Whole</MenuItem>
                  <MenuItem value="Skim">Skim</MenuItem>
                  <MenuItem value="Almond">Almond (+₱0.50)</MenuItem>
                  <MenuItem value="Oat">Oat (+₱0.50)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Extras (₱0.50 each)</Typography>
              <FormGroup row>
                {['Extra Shot', 'Vanilla Syrup', 'Caramel Syrup', 'Hazelnut Syrup'].map((extra) => (
                  <FormControlLabel
                    key={extra}
                    control={
                      <Checkbox
                        checked={selectedExtras.includes(extra)}
                        onChange={(e) => {
                          setSelectedExtras(prev => e.target.checked ? [...prev, extra] : prev.filter(x => x !== extra));
                        }}
                      />
                    }
                    label={extra}
                  />
                ))}
              </FormGroup>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                placeholder="e.g., Less ice, no sugar"
                fullWidth
                multiline
                minRows={2}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Price: ₱{selectedItem ? calculateUnitPrice(selectedItem.price).toFixed(2) : '0.00'}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCustomization}>Cancel</Button>
          <Button variant="contained" onClick={addCustomizedToOrder}>Add to Order</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FrontCounter;
