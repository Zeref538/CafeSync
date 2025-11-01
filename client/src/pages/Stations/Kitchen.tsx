import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  Button,
  Chip,
  LinearProgress,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  useTheme,
} from '@mui/material';
import {
  Restaurant,
  CheckCircle,
  AccessTime,
  Refresh,
  Cancel,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { notify } from '../../utils/notifications';
import { API_ENDPOINTS } from '../../config/api';

interface KitchenOrder {
  id: string;
  orderNumber: number;
  customer: string;
  items: Array<{ 
    name: string; 
    quantity: number; 
    category?: string;
    customizations?: {
      size: string;
      milk: string;
      extras: string[];
      notes: string;
    };
    unitPrice?: number;
    price?: number;
  }>;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  station: string;
  totalAmount: number;
  total?: number;
  createdAt: string;
  estimatedPrepTime: number;
  actualPrepTime?: number;
  priority: 'normal' | 'high' | 'urgent';
  paymentMethod: string;
  specialInstructions?: string;
  kitchenNotes?: string;
}

const Orders: React.FC = () => {
  const { socket, joinStation, emitOrderUpdate } = useSocket();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<KitchenOrder | null>(null);

  // Load orders from server (only active orders for kitchen)
  const fetchOrders = async () => {
    try {
      setIsRefreshing(true);
      // Fetch only non-completed orders for kitchen
      const response = await fetch(API_ENDPOINTS.ORDERS_BY_STATUS('pending,preparing,ready'));
      if (response.ok) {
        const result = await response.json();
        // Double filter to ensure no completed orders slip through
        const kitchenOrders = result.data
          .filter((order: KitchenOrder) => 
            order.status === 'pending' || order.status === 'preparing' || order.status === 'ready'
          )
          .map((order: KitchenOrder) => ({
            ...order,
            createdAt: order.createdAt || new Date().toISOString(),
            estimatedPrepTime: order.estimatedPrepTime || 15,
          }));
        setOrders(kitchenOrders);
      } else {
        console.error('Failed to fetch orders:', response.status);
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Listen for real-time order updates
  useEffect(() => {
    if (socket) {
      socket.on('order-update', (data) => {
        console.log('Kitchen received order update:', data);
        
        // Show notification for new orders or status changes
        setOrders(prev => {
          const existingIndex = prev.findIndex(order => order.id === data.id);
          const existingOrder = prev[existingIndex];
          
          // Handle status changes - check orderAlerts setting
          if (existingOrder && existingOrder.status !== data.status) {
            if (data.status === 'ready') {
              notify.success(`Order #${data.orderNumber} is ready!`, true, true, 'orderAlerts');
            } else if (data.status === 'preparing' && existingOrder.status === 'pending') {
              notify.info(`Order #${data.orderNumber} is being prepared`, false, true, 'orderAlerts');
            }
          }
          
          // Check if order already exists
          if (existingIndex >= 0) {
            // Update existing order
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...data };
            
            // Always filter out completed orders - never show them in kitchen
            return updated.filter(order => 
              order.status !== 'completed' && 
              (order.status === 'pending' || order.status === 'preparing' || order.status === 'ready')
            );
          } else {
            // Add new order only if it's pending/preparing/ready
            if (data.status === 'pending' || data.status === 'preparing' || data.status === 'ready') {
              // Notify about new pending orders - check orderAlerts setting
              if (data.status === 'pending') {
                notify.info(`New order #${data.orderNumber} received`, true, true, 'orderAlerts');
              }
              return [...prev, data];
            }
            return prev;
          }
        });
      });
    }

    return () => {
      if (socket) {
        socket.off('order-update');
      }
    };
  }, [socket]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    // Update local state immediately for better UX
    setOrders(prev => {
      const updated = prev.map(order =>
        order.id === orderId ? { ...order, status: newStatus as any } : order
      );
      
      // If order is completed or cancelled, remove it from kitchen view immediately
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        return updated.filter(order => order.id !== orderId);
      }
      
      return updated;
    });

    try {
      // FIRST: Update the server's API endpoint (this handles local storage and socket broadcast)
      const response = await fetch(API_ENDPOINTS.ORDER_STATUS(orderId), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          updatedBy: 'kitchen'
        }),
      });

      if (!response.ok) {
        throw new Error(`Server update failed: ${response.status}`);
      }

      // Trigger notification refresh (notification created in backend)
      window.dispatchEvent(new CustomEvent('refresh-notifications'));

      // Show notification when order is ready
      if (newStatus === 'ready') {
        const order = orders.find(o => o.id === orderId);
        notify.success(`Order #${order?.orderNumber} is ready!`, true);
      }
      
      // Show notification when order is cancelled
      if (newStatus === 'cancelled') {
        const order = orders.find(o => o.id === orderId);
        notify.warning(`Order #${order?.orderNumber} has been cancelled`, true);
      }

      console.log(`Order ${orderId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      // Revert local state on error - but don't re-add completed or cancelled orders
      if (newStatus !== 'completed' && newStatus !== 'cancelled') {
        setOrders(prev => prev.map(order =>
          order.id === orderId ? { ...order, status: 'pending' as any } : order
        ));
      }
    }
  };

  const handleCancelClick = (order: KitchenOrder) => {
    setOrderToCancel(order);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (orderToCancel) {
      await handleStatusChange(orderToCancel.id, 'cancelled');
      setCancelDialogOpen(false);
      setOrderToCancel(null);
    }
  };

  const handleCancelClose = () => {
    setCancelDialogOpen(false);
    setOrderToCancel(null);
  };


  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      normal: '#4caf50',
      high: '#ff9800',
      urgent: '#f44336',
    };
    return colors[priority] || '#666';
  };

  const getPrepProgress = (order: KitchenOrder) => {
    if (order.status === 'completed') return 100;
    if (order.status === 'ready') return 90;
    if (order.status === 'preparing') return 60;
    return 0;
  };

  React.useEffect(() => {
    joinStation('kitchen');
    
    // Refresh orders when joining kitchen station to ensure latest data
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');

  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
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
          Orders
        </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and track order status
            </Typography>
          </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchOrders}
          disabled={isRefreshing}
            sx={{ 
              textTransform: 'none',
              fontWeight: 600,
              borderWidth: 2,
              '&:hover': {
                borderWidth: 2,
                transform: 'translateY(-2px)',
              },
              transition: 'all 0.3s ease',
            }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Orders'}
        </Button>
        </Box>
      </Box>

      {/* Kitchen Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            borderLeft: '4px solid #ff9800',
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
                {pendingOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                Pending Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            borderLeft: '4px solid #2196f3',
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
                {preparingOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            position: 'relative',
            overflow: 'hidden',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(40, 40, 40, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 248, 245, 0.9) 100%)',
            borderLeft: '4px solid #4caf50',
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
                {readyOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mt: 0.5 }}>
                Ready for Pickup
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Pending Orders */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTime />
                Pending Orders
              </Typography>
              
              <List sx={{ p: 0 }}>
                {pendingOrders.map((order) => (
                  <Paper
                    key={order.id}
                    sx={{
                      p: 2,
                      mb: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: '#8B4513',
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Order #{order.orderNumber}
                      </Typography>
                      <Chip
                        label={order.priority}
                        size="small"
                        sx={{
                          backgroundColor: `${getPriorityColor(order.priority)}20`,
                          color: getPriorityColor(order.priority),
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {order.customer}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Est. {order.estimatedPrepTime}min
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(order.id, 'preparing');
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Start
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelClick(order);
                          }}
                          sx={{ textTransform: 'none' }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Preparing Orders */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Restaurant />
                In Progress
              </Typography>
              
              <List sx={{ p: 0 }}>
                {preparingOrders.map((order) => (
                  <Paper
                    key={order.id}
                    sx={{
                      p: 2,
                      mb: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: '#8B4513',
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Order #{order.orderNumber}
                      </Typography>
                      <Chip
                        label={order.priority}
                        size="small"
                        sx={{
                          backgroundColor: `${getPriorityColor(order.priority)}20`,
                          color: getPriorityColor(order.priority),
                          fontWeight: 500,
                          textTransform: 'capitalize',
                        }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {order.customer}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                    </Typography>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Progress
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {getPrepProgress(order)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getPrepProgress(order)}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(order.id, 'ready');
                        }}
                        sx={{ textTransform: 'none', flex: 1 }}
                      >
                        Mark Ready
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelClick(order);
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Paper>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Ready Orders */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle />
                Ready for Pickup
              </Typography>
              
              <List sx={{ p: 0 }}>
                {readyOrders.map((order) => (
                  <Paper
                    key={order.id}
                    sx={{
                      p: 2,
                      mb: 2,
                      border: '1px solid #e0e0e0',
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        borderColor: '#8B4513',
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600 }}>
                        Order #{order.orderNumber}
                      </Typography>
                      <Chip
                        label="Ready"
                        size="small"
                        color="success"
                        sx={{ fontWeight: 500 }}
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {order.customer}
                    </Typography>
                    
                    <Typography variant="body2" sx={{ mb: 2 }}>
                      {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Prep time: {order.actualPrepTime || order.estimatedPrepTime}min
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#8B4513' }}>
                        ₱{(order.totalAmount || order.total || 0).toFixed(2)}
                      </Typography>
                    </Box>
                    
                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.id, 'completed');
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Complete Order
                    </Button>
                  </Paper>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCancelClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cancel Order</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel Order #{orderToCancel?.orderNumber}? 
            This action cannot be undone and will be reflected in analytics.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelClose} color="inherit">
            Keep Order
          </Button>
          <Button
            onClick={handleCancelConfirm}
            variant="contained"
            color="error"
            startIcon={<Cancel />}
          >
            Cancel Order
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Orders;
