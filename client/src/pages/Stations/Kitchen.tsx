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
} from '@mui/material';
import {
  Restaurant,
  CheckCircle,
  AccessTime,
  Refresh,
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
  status: 'pending' | 'preparing' | 'ready' | 'completed';
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
          
          // Handle status changes
          if (existingOrder && existingOrder.status !== data.status) {
            if (data.status === 'ready') {
              notify.success(`Order #${data.orderNumber} is ready!`, true);
            } else if (data.status === 'preparing' && existingOrder.status === 'pending') {
              notify.info(`Order #${data.orderNumber} is being prepared`, false);
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
              // Notify about new pending orders
              if (data.status === 'pending') {
                notify.info(`New order #${data.orderNumber} received`, true);
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
      
      // If order is completed, remove it from kitchen view immediately
      if (newStatus === 'completed') {
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

      // Show notification when order is ready
      if (newStatus === 'ready') {
        const order = orders.find(o => o.id === orderId);
        notify.success(`Order #${order?.orderNumber} is ready!`, true);
      }

      console.log(`Order ${orderId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      // Revert local state on error - but don't re-add completed orders
      if (newStatus !== 'completed') {
        setOrders(prev => prev.map(order =>
          order.id === orderId ? { ...order, status: 'pending' as any } : order
        ));
      }
    }
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

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Orders
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchOrders}
          disabled={isRefreshing}
          sx={{ textTransform: 'none' }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Orders'}
        </Button>
      </Box>

      {/* Kitchen Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {pendingOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                {preparingOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                {readyOrders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
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
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Est. {order.estimatedPrepTime}min
                      </Typography>
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
                    
                    <Button
                      fullWidth
                      variant="contained"
                      color="success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusChange(order.id, 'ready');
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Mark Ready
                    </Button>
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
    </Box>
  );
};

export default Orders;
