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
  Avatar,
  Divider,
} from '@mui/material';
import {
  Search,
  FilterList,
  Refresh,
  CheckCircle,
  AccessTime,
  Restaurant,
  Receipt,
  MoreVert,
} from '@mui/icons-material';
import { useSocket } from '../../contexts/SocketContext';
import { API_ENDPOINTS } from '../../config/api';

interface Order {
  id: string;
  orderNumber: number;
  customer: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  station: string;
  totalAmount: number;
  total?: number;
  createdAt: string;
  estimatedPrepTime: number;
}

const Orders: React.FC = () => {
  const { socket, emitOrderUpdate } = useSocket();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);

  // Load orders from server
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await fetch(API_ENDPOINTS.ORDERS);
        if (response.ok) {
          const result = await response.json();
          const ordersWithDefaults = (result.data || []).map((order: Order) => ({
            ...order,
            totalAmount: order.totalAmount || order.total || 0,
            estimatedPrepTime: order.estimatedPrepTime || 15,
            createdAt: order.createdAt || new Date().toISOString(),
          }));
          setOrders(ordersWithDefaults);
          setFilteredOrders(ordersWithDefaults);
        } else {
          console.error('Failed to fetch orders');
          setOrders([]);
          setFilteredOrders([]);
        }
      } catch (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
        setFilteredOrders([]);
      }
    };

    fetchOrders();
  }, []);

  // Listen for real-time order updates
  useEffect(() => {
    if (socket) {
      socket.on('order-update', (data) => {
        console.log('Orders page received order update:', data);
        
        setOrders(prev => {
          // Check if order already exists
          const existingIndex = prev.findIndex(order => order.id === data.id);
          if (existingIndex >= 0) {
            // Update existing order
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], ...data };
            return updated;
          } else {
            // Add new order
            return [...prev, data];
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
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTab, setSelectedTab] = useState(0);

  // Filter orders based on search and status
  useEffect(() => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNumber.toString().includes(searchTerm) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  const handleStatusChange = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, status: newStatus as any } : order
    ));

    // Emit status change via socket
    emitOrderUpdate({
      orderId,
      status: newStatus,
      station: 'orders',
      timestamp: new Date().toISOString(),
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#ff9800',
      preparing: '#2196f3',
      ready: '#4caf50',
      completed: '#9e9e9e',
      cancelled: '#f44336',
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      pending: <AccessTime />,
      preparing: <Restaurant />,
      ready: <CheckCircle />,
      completed: <CheckCircle />,
      cancelled: <Receipt />,
    };
    return icons[status] || <AccessTime />;
  };

  const getStatusCounts = () => {
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      preparing: orders.filter(o => o.status === 'preparing').length,
      ready: orders.filter(o => o.status === 'ready').length,
      completed: orders.filter(o => o.status === 'completed').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Order Management
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                {statusCounts.all}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {statusCounts.pending}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Pending
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                {statusCounts.preparing}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Preparing
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                {statusCounts.ready}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ready
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#9e9e9e' }}>
                {statusCounts.completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <TextField
              size="small"
              placeholder="Search orders..."
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
              onClick={() => setStatusFilter(statusFilter === 'all' ? 'pending' : 'all')}
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
          </Box>

          {/* Status Tabs */}
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => {
              setSelectedTab(newValue);
              const statuses = ['all', 'pending', 'preparing', 'ready', 'completed'];
              setStatusFilter(statuses[newValue]);
            }}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab label={`All (${statusCounts.all})`} />
            <Tab label={`Pending (${statusCounts.pending})`} />
            <Tab label={`Preparing (${statusCounts.preparing})`} />
            <Tab label={`Ready (${statusCounts.ready})`} />
            <Tab label={`Completed (${statusCounts.completed})`} />
          </Tabs>
        </CardContent>
      </Card>

      {/* Orders List */}
      <Card>
        <CardContent>
          <List sx={{ p: 0 }}>
            {filteredOrders.map((order, index) => (
              <React.Fragment key={order.id}>
                <ListItem sx={{ px: 0, py: 2 }}>
                  <Avatar
                    sx={{
                      backgroundColor: getStatusColor(order.status),
                      mr: 2,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {getStatusIcon(order.status)}
                  </Avatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Order #{order.orderNumber}
                        </Typography>
                        <Chip
                          label={order.status}
                          size="small"
                          sx={{
                            backgroundColor: `${getStatusColor(order.status)}20`,
                            color: getStatusColor(order.status),
                            fontWeight: 500,
                            textTransform: 'capitalize',
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Customer: {order.customer} • Station: {order.station}
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {order.items.map(item => `${item.name} (${item.quantity})`).join(', ')}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#8B4513' }}>
                            ₱{(order.totalAmount || order.total || 0).toFixed(2)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Est. {order.estimatedPrepTime}min
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      {order.status === 'pending' && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleStatusChange(order.id, 'preparing')}
                          sx={{ textTransform: 'none' }}
                        >
                          Start
                        </Button>
                      )}
                      {order.status === 'preparing' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          sx={{ textTransform: 'none' }}
                        >
                          Ready
                        </Button>
                      )}
                      {order.status === 'ready' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          sx={{ textTransform: 'none' }}
                        >
                          Complete
                        </Button>
                      )}
                      <IconButton size="small">
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < filteredOrders.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {filteredOrders.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Receipt sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No orders found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || statusFilter !== 'all' ? 'Try adjusting your filters' : 'No orders to display'}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Orders;
