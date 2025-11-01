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
  Analytics,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface Action {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  requiredPermission?: string;
}

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const hasPermission = (permission: string | undefined): boolean => {
    if (!user || !permission) return true;
    return user.permissions.includes('all') || user.permissions.includes(permission);
  };

  const allActions: Action[] = [
    {
      title: 'New Order',
      description: 'Take a new customer order',
      icon: <Add />,
      color: '#4caf50',
      onClick: () => navigate('/station/front-counter'),
      requiredPermission: 'orders',
    },
    {
      title: 'View Orders',
      description: 'Check order status and queue',
      icon: <Receipt />,
      color: '#2196f3',
      onClick: () => navigate('/orders'),
      requiredPermission: 'orders',
    },
    {
      title: 'Inventory',
      description: 'Check stock levels',
      icon: <Inventory />,
      color: '#ff9800',
      onClick: () => navigate('/inventory'),
      requiredPermission: 'inventory',
    },
    {
      title: 'Analytics',
      description: 'View sales reports',
      icon: <Analytics />,
      color: '#f44336',
      onClick: () => navigate('/analytics'),
      requiredPermission: 'analytics',
    },
  ];

  // Filter actions based on user permissions
  const actions = allActions.filter(action => hasPermission(action.requiredPermission));

  return (
    <Card>
      <CardContent>
        <Grid container spacing={2}>
          {actions.map((action, index) => (
            <Grid item xs={6} sm={4} md={2} key={index}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={action.icon}
                onClick={action.onClick}
                sx={{
                  height: { xs: 100, sm: 90 },
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
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
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
