import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  Divider,
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  Inventory,
  TrendingDown,
  ShoppingCart,
} from '@mui/icons-material';

const InventoryAlerts: React.FC = () => {
  // Mock inventory alerts data
  const alerts = [
    {
      id: 1,
      type: 'warning',
      item: 'Whole Milk',
      currentStock: 3,
      minStock: 5,
      unit: 'gallons',
      priority: 'high',
      message: 'Stock running low',
    },
    {
      id: 2,
      type: 'error',
      item: 'Vanilla Syrup',
      currentStock: 1,
      minStock: 3,
      unit: 'bottles',
      priority: 'critical',
      message: 'Critical stock level',
    },
    {
      id: 3,
      type: 'info',
      item: 'Coffee Beans',
      currentStock: 8,
      minStock: 10,
      unit: 'lbs',
      priority: 'medium',
      message: 'Consider reordering soon',
    },
  ];

  const getAlertIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      warning: <Warning color="warning" />,
      error: <Error color="error" />,
      info: <Info color="info" />,
    };
    return icons[type] || <Info />;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: '#f44336',
      high: '#ff9800',
      medium: '#2196f3',
      low: '#4caf50',
    };
    return colors[priority] || '#666';
  };

  const getAlertSeverity = (type: string) => {
    const severities: Record<string, 'error' | 'warning' | 'info'> = {
      error: 'error',
      warning: 'warning',
      info: 'info',
    };
    return severities[type] || 'info';
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Inventory Alerts
          </Typography>
          <Chip
            label={`${alerts.length} alerts`}
            color="warning"
            size="small"
            icon={<Inventory />}
          />
        </Box>

        {alerts.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Inventory sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="body1" color="text.secondary">
              All inventory levels are healthy
            </Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {alerts.map((alert, index) => (
              <React.Fragment key={alert.id}>
                <ListItem sx={{ px: 0, py: 1.5 }}>
                  <ListItemIcon>
                    {getAlertIcon(alert.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {alert.item}
                        </Typography>
                        <Chip
                          label={alert.priority}
                          size="small"
                          sx={{
                            backgroundColor: `${getPriorityColor(alert.priority)}20`,
                            color: getPriorityColor(alert.priority),
                            fontWeight: 500,
                            textTransform: 'capitalize',
                          }}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          {alert.message}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {alert.currentStock} {alert.unit} remaining
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Min: {alert.minStock} {alert.unit}
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < alerts.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        {alerts.length > 0 && (
          <Box sx={{ mt: 3, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<ShoppingCart />}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              Auto Reorder
            </Button>
            <Button
              variant="contained"
              startIcon={<TrendingDown />}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              View Inventory
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryAlerts;
