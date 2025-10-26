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
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';

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
  createdAt: string;
  estimatedPrepTime: number;
  actualPrepTime?: number;
  priority: 'normal' | 'high' | 'urgent';
  paymentMethod: string;
  specialInstructions?: string;
  kitchenNotes?: string;
}

const Kitchen: React.FC = () => {
  const { socket, joinStation, emitOrderUpdate, syncOrderData } = useSocket();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null);

  // Load orders from server (only active orders for kitchen)
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        // Fetch only non-completed orders for kitchen
        const response = await fetch('http://localhost:5000/api/orders?status=pending,preparing,ready');
        if (response.ok) {
          const result = await response.json();
          // Double filter to ensure no completed orders slip through
          const kitchenOrders = result.data.filter((order: KitchenOrder) => 
            order.status === 'pending' || order.status === 'preparing' || order.status === 'ready'
          );
          setOrders(kitchenOrders);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
      }
    };

    fetchOrders();
  }, []);

  // Listen for real-time order updates
  useEffect(() => {
    if (socket) {
      socket.on('order-update', (data) => {
        console.log('Kitchen received order update:', data);
        
        // Handle order updates for kitchen
        setOrders(prev => {
          // Check if order already exists
          const existingIndex = prev.findIndex(order => order.id === data.id);
          
          if (existingIndex >= 0) {
            // Update existing order
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...data };
            // Filter out completed orders
            return updated.filter(order => order.status !== 'completed');
          } else {
            // Add new order if it's pending/preparing/ready
            if (data.status === 'pending' || data.status === 'preparing' || data.status === 'ready') {
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
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status: newStatus as any } : order
    ));

    try {
      // Sync with Firebase Functions for multi-device synchronization
      await syncOrderData(orderId, 'kitchen', 'status_update', {
        status: newStatus,
        updatedAt: new Date().toISOString(),
        actualPrepTime: newStatus === 'completed' ? 
          Math.floor((Date.now() - new Date(orders.find(o => o.id === orderId)?.createdAt || Date.now()).getTime()) / 60000) : 
          null
      });

      // Also emit via socket for real-time updates
      emitOrderUpdate({
        orderId,
        status: newStatus,
        station: 'kitchen',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      // Revert local state on error
      setOrders(prev => prev.map(order =>
        order.id === orderId ? { ...order, status: 'pending' as any } : order
      ));
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
  }, [joinStation]);

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => order.status === 'ready');

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Kitchen Station
      </Typography>

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
                        ₱{order.totalAmount.toFixed(2)}
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

export default Kitchen;
