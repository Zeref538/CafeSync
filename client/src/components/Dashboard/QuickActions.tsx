import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Grid,
} from '@mui/material';
import {
  Add,
  Receipt,
  Inventory,
  People,
  Analytics,
  Settings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const QuickActions: React.FC = () => {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'New Order',
      description: 'Take a new customer order',
      icon: <Add />,
      color: '#4caf50',
      onClick: () => navigate('/station/front-counter'),
    },
    {
      title: 'View Orders',
      description: 'Check order status and queue',
      icon: <Receipt />,
      color: '#2196f3',
      onClick: () => navigate('/orders'),
    },
    {
      title: 'Inventory',
      description: 'Check stock levels',
      icon: <Inventory />,
      color: '#ff9800',
      onClick: () => navigate('/inventory'),
    },
    {
      title: 'Customers',
      description: 'Manage loyalty program',
      icon: <People />,
      color: '#9c27b0',
      onClick: () => navigate('/loyalty'),
    },
    {
      title: 'Analytics',
      description: 'View sales reports',
      icon: <Analytics />,
      color: '#f44336',
      onClick: () => navigate('/analytics'),
    },
    {
      title: 'Settings',
      description: 'Configure system',
      icon: <Settings />,
      color: '#607d8b',
      onClick: () => navigate('/settings'),
    },
  ];

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          Quick Actions
        </Typography>
        
        <Grid container spacing={2}>
          {actions.map((action, index) => (
            <Grid item xs={6} sm={4} key={index}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={action.icon}
                onClick={action.onClick}
                sx={{
                  height: 80,
                  flexDirection: 'column',
                  textAlign: 'center',
                  borderColor: action.color,
                  color: action.color,
                  '&:hover': {
                    backgroundColor: `${action.color}10`,
                    borderColor: action.color,
                  },
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {action.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {action.description}
                </Typography>
              </Button>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
