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
  Alert,
  useTheme,
} from '@mui/material';
import {
  Search,
  Receipt,
  ShoppingCart,
  Delete,
  Add,
  Remove,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { API_ENDPOINTS } from '../../config/api';

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
  const theme = useTheme();
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
  const [quantity, setQuantity] = useState<number>(1);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [addons, setAddons] = useState<any[]>([]);
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [discountCode, setDiscountCode] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // Load discounts from server
  const loadDiscounts = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.DISCOUNTS);
      if (response.ok) {
        const data = await response.json();
        setDiscounts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading discounts:', error);
    }
  };

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

  // Load add-ons from server
  const loadAddons = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADDONS);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded add-ons:', data);
        setAddons(data.data || []);
      } else {
        console.error('Failed to load add-ons');
        setAddons([]);
      }
    } catch (error) {
      console.error('Error loading add-ons:', error);
      setAddons([]);
    }
  };

  // Load menu items and add-ons on component mount
  useEffect(() => {
    loadMenuItems();
    loadAddons();
    loadDiscounts();
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

  const getSubtotal = () => {
    return currentOrder.reduce((total, item) => {
      const unit = (item.unitPrice ?? item.price);
      return total + (unit * item.quantity);
    }, 0);
  };

  const getDiscountAmount = () => {
    if (discountPercentage > 0) {
      return (getSubtotal() * discountPercentage) / 100;
    }
    return 0;
  };

  const getTotalPrice = () => {
    return getSubtotal() - getDiscountAmount();
  };

  // Handle discount code application
  const handleApplyDiscount = () => {
    const code = discountCode.toUpperCase().trim();
    if (!code) {
      toast.error('Please enter a discount code');
      return;
    }

    // Find discount in loaded discounts
    const discount = discounts.find(d => d.code.toUpperCase() === code);
    
    if (discount) {
      setDiscountPercentage(discount.percentage);
      setShowDiscountInput(false);
      toast.success(`Discount code applied! ${discount.percentage}% off`);
    } else {
      toast.error('Invalid discount code');
    }
  };

  const removeDiscount = () => {
    setDiscountCode('');
    setDiscountPercentage(0);
    setShowDiscountInput(false);
  };

  const openCustomization = (item: any) => {
    setSelectedItem(item);
    
    // Set default size based on available sizes
    if (item.sizes && item.sizes.length > 0) {
      setSelectedSize(item.sizes[0].size);
    } else {
      setSelectedSize('Regular');
    }
    
    setSelectedExtras([]);
    setCustomNotes('');
    setQuantity(1);
    setAddonQuantities({}); // Reset add-on quantities
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
    
    // Add extras pricing WITH QUANTITY
    const addOnTotal = Object.entries(addonQuantities).reduce((total, [addonId, qty]) => {
      if (qty > 0) {
        const addon = addons.find(a => a.id === addonId);
        return total + (addon ? addon.price * qty : 0);
      }
      return total;
    }, 0);
    
    return sizePrice + addOnTotal;
  };

  const addCustomizedToOrder = () => {
    if (!selectedItem) return;
    const unitPrice = parseFloat(calculateUnitPrice(selectedItem.price).toFixed(2));
    
    // Convert addon quantities to extras array with quantities
    const extrasWithQuantity = Object.entries(addonQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([addonId, qty]) => {
        const addon = addons.find(a => a.id === addonId);
        return { name: addon?.name || '', quantity: qty, price: addon?.price || 0 };
      });
    
    const customizations = {
      size: selectedSize,
      extras: extrasWithQuantity.length > 0 ? extrasWithQuantity : null,
      notes: customNotes || null,
    };

    const existingIndex = currentOrder.findIndex((line) => (
      line.id === selectedItem.id &&
      JSON.stringify(line.customizations) === JSON.stringify(customizations)
    ));

    if (existingIndex >= 0) {
      setCurrentOrder(prev => prev.map((line, idx) => idx === existingIndex
        ? { ...line, quantity: line.quantity + quantity }
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
          quantity: quantity,
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
      subtotal: getSubtotal(),
      discount: discountPercentage > 0 ? {
        percentage: discountPercentage,
        amount: getDiscountAmount(),
        code: discountCode,
      } : null,
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
      const response = await fetch(API_ENDPOINTS.ORDERS, {
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

        // Reset form
        setCurrentOrder([]);
        setCustomerInfo({ tableNumber: '', paymentMethod: 'cash' });
        setDiscountCode('');
        setDiscountPercentage(0);
        setShowDiscountInput(false);

        // Show success message
        toast.success(`Order #${createdOrder.orderNumber} placed successfully!`);
        
        // Emit order update via socket to notify other stations
        try {
          emitOrderUpdate({
            ...createdOrder,
            station: 'front-counter',
            timestamp: new Date().toISOString(),
          });
        } catch (socketError) {
          console.log('Socket not available in production, skipping emit');
        }

        console.log('Order placed successfully:', createdOrder);
      } else {
        const errorText = await response.text();
        console.error('Failed to place order:', response.status, errorText);
        toast.error('Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Network error. Please check your connection and try again.');
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
                              {item.customizations.extras && item.customizations.extras.map((ex: any, idx: number) => {
                                const label = typeof ex === 'string' ? ex : `${ex.name} (${ex.quantity})`;
                                return <Chip key={idx} label={label} size="small" />;
                              })}
                              {item.customizations.notes && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  Note: {item.customizations.notes}
                                </Typography>
                              )}
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

              {/* Discount Section */}
              {!showDiscountInput && discountPercentage === 0 && currentOrder.length > 0 && (
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  sx={{ mb: 2, textTransform: 'none' }}
                  onClick={() => setShowDiscountInput(true)}
                >
                  Apply Discount Code
                </Button>
              )}

              {showDiscountInput && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Enter discount code"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleApplyDiscount}
                      sx={{ textTransform: 'none' }}
                    >
                      Apply
                    </Button>
                  </Box>
                  <Button
                    fullWidth
                    variant="text"
                    size="small"
                    onClick={() => setShowDiscountInput(false)}
                  >
                    Cancel
                  </Button>
                </Box>
              )}

              {discountPercentage > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={`${discountPercentage}% OFF Applied`}
                    color="success"
                    onDelete={removeDiscount}
                    sx={{ mb: 1 }}
                  />
                </Box>
              )}

              {/* Order Summary */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1" color="text.secondary">
                    Subtotal:
                  </Typography>
                  <Typography variant="body1">
                    ₱{getSubtotal().toFixed(2)}
                  </Typography>
                </Box>
                {discountPercentage > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body1" color="success.main">
                      Discount ({discountPercentage}%):
                    </Typography>
                    <Typography variant="body1" color="success.main">
                      -₱{getDiscountAmount().toFixed(2)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Total:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#8B4513' }}>
                    ₱{getTotalPrice().toFixed(2)}
                  </Typography>
                </Box>
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
      <Dialog open={customizationOpen} onClose={closeCustomization} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513', color: 'white', fontWeight: 600 }}>
          {selectedItem ? `Customize ${selectedItem.name}` : 'Customize Item'}
        </DialogTitle>
        <DialogContent sx={{ minHeight: 500, p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>
                Size
              </Typography>
              <FormControl fullWidth size="small">
                <InputLabel id="size-label">Select Size</InputLabel>
                <Select labelId="size-label" label="Select Size" value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
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
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>
                Quantity
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button
                    variant="outlined"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    sx={{ minWidth: 40 }}
                  >
                    -
                  </Button>
                  <Typography variant="h6" sx={{ minWidth: 30, textAlign: 'center' }}>
                    {quantity}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => setQuantity(quantity + 1)}
                    sx={{ minWidth: 40 }}
                  >
                    +
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>Add-ons</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 280, overflowY: 'auto' }}>
                {addons.map((addon) => {
                  const quantity = addonQuantities[addon.id] || 0;
                  return (
                    <Paper 
                      key={addon.id} 
                      elevation={quantity > 0 ? 1 : 0}
                      sx={{ 
                        p: 1.5, 
                        border: quantity > 0 ? `1.5px solid ${theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513'}` : `1px solid ${theme.palette.divider}`,
                        borderRadius: 1.5,
                        backgroundColor: quantity > 0 
                          ? (theme.palette.mode === 'dark' ? 'rgba(212, 165, 116, 0.1)' : '#fff9f0')
                          : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                            {addon.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                            ₱{addon.price}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <IconButton
                            onClick={() => setAddonQuantities({...addonQuantities, [addon.id]: Math.max(0, quantity - 1)})}
                            disabled={quantity === 0}
                            size="small"
                            sx={{ 
                              color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513',
                              border: `1px solid ${theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513'}`,
                              '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513', color: 'white' },
                              '&.Mui-disabled': { borderColor: theme.palette.divider }
                            }}
                          >
                            <Remove fontSize="small" />
                          </IconButton>
                          <TextField
                            value={quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 0;
                              setAddonQuantities({...addonQuantities, [addon.id]: Math.max(0, newQty)});
                            }}
                            inputProps={{ 
                              style: { 
                                textAlign: 'center', 
                                fontWeight: 600,
                                fontSize: '0.9rem',
                                padding: '8px 4px'
                              }
                            }}
                            variant="outlined"
                            size="small"
                            sx={{ 
                              width: 50,
                              '& .MuiOutlinedInput-root': {
                                borderRadius: 1
                              }
                            }}
                          />
                          <IconButton
                            onClick={() => setAddonQuantities({...addonQuantities, [addon.id]: quantity + 1})}
                            size="small"
                            sx={{ 
                              backgroundColor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513',
                              color: 'white',
                              '&:hover': { backgroundColor: theme.palette.mode === 'dark' ? '#543d21' : '#6d3504' }
                            }}
                          >
                            <Add fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>Special Instructions</Typography>
              <TextField
                label="Notes"
                placeholder="e.g., Less ice, no sugar"
                fullWidth
                multiline
                minRows={4}
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                sx={{ mb: 2 }}
              />
              
              <Paper elevation={2} sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(212, 165, 116, 0.1)' : '#fff9f0', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    Unit Price:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>
                    ₱{selectedItem ? calculateUnitPrice(selectedItem.price).toFixed(2) : '0.00'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body1" color="text.secondary">
                    Quantity:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    × {quantity}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" color="text.secondary">
                    Total Price:
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>
                    ₱{selectedItem ? (calculateUnitPrice(selectedItem.price) * quantity).toFixed(2) : '0.00'}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : '#f5f5f5' }}>
          <Button 
            onClick={closeCustomization} 
            size="large"
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={addCustomizedToOrder}
            size="large"
            sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513',
              '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#543d21' : '#6d3504' },
              textTransform: 'none',
              minWidth: 150
            }}
          >
            Add to Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FrontCounter;
