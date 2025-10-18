import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  IconButton,
  Divider,
} from '@mui/material';
import {
  AccessTime,
  CheckCircle,
  Pending,
  Restaurant,
  MoreVert,
} from '@mui/icons-material';

const RecentOrders: React.FC = () => {
  // Mock recent orders data
  const orders = [
    {
      id: 'ORD-001',
      customer: 'John Smith',
      items: ['Latte', 'Croissant'],
      total: 8.50,
      status: 'preparing',
      time: '2 min ago',
      station: 'front-counter',
    },
    {
      id: 'ORD-002',
      customer: 'Sarah Johnson',
      items: ['Cappuccino', 'Muffin'],
      total: 7.25,
      status: 'ready',
      time: '5 min ago',
      station: 'kitchen',
    },
    {
      id: 'ORD-003',
      customer: 'Mike Chen',
      items: ['Americano'],
      total: 3.50,
      status: 'pending',
      time: '8 min ago',
      station: 'front-counter',
    },
    {
      id: 'ORD-004',
      customer: 'Alex Rodriguez',
      items: ['Espresso', 'Pastry'],
      total: 6.75,
      status: 'completed',
      time: '12 min ago',
      station: 'kitchen',
    },
  ];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#ff9800',
      preparing: '#2196f3',
      ready: '#4caf50',
      completed: '#9e9e9e',
    };
    return colors[status] || '#666';
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      pending: <Pending />,
      preparing: <Restaurant />,
      ready: <CheckCircle />,
      completed: <CheckCircle />,
    };
    return icons[status] || <Pending />;
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Recent Orders
          </Typography>
          <IconButton size="small">
            <MoreVert />
          </IconButton>
        </Box>

        <List sx={{ p: 0 }}>
          {orders.map((order, index) => (
            <React.Fragment key={order.id}>
              <ListItem sx={{ px: 0, py: 1.5 }}>
                <ListItemAvatar>
                  <Avatar
                    sx={{
                      backgroundColor: getStatusColor(order.status),
                      width: 40,
                      height: 40,
                    }}
                  >
                    {getStatusIcon(order.status)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {order.customer}
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
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                        {order.items.join(', ')}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          ${order.total.toFixed(2)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTime sx={{ fontSize: 14, color: 'text.secondary' }} />
                          <Typography variant="caption" color="text.secondary">
                            {order.time}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  }
                />
              </ListItem>
              {index < orders.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
            View all orders
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RecentOrders;
