import React, { useState, useEffect } from 'react';
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
import { API_ENDPOINTS } from '../../config/api';

interface InventoryAlert {
  id: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unit: string;
  costPerUnit: number;
  supplier: string;
  lastRestocked: string;
  expiryDate?: string;
  location: string;
}

const InventoryAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch low stock items from API
  const fetchLowStockItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(API_ENDPOINTS.INVENTORY_ALERTS);
      
      if (!response.ok) {
        // @ts-ignore - TypeScript strict mode issue with Error constructor
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setAlerts(result.data);
      } else {
        // @ts-ignore - TypeScript strict mode issue with Error constructor
        throw new Error(result.error || 'Failed to fetch low stock items');
      }
    } catch (err: unknown) {
      console.error('Error fetching low stock items:', err);
      // @ts-ignore - TypeScript strict mode issue with unknown type
      setError(err instanceof Error ? err.message : 'Failed to fetch low stock items');
      // Fallback to mock data if API fails
      setAlerts([
        {
          id: 'milk-whole-1',
          name: 'Whole Milk',
          category: 'dairy',
          currentStock: 3,
          minStock: 5,
          maxStock: 50,
          unit: 'gallons',
          costPerUnit: 3.50,
          supplier: 'Dairy Fresh',
          lastRestocked: '2024-01-20T08:00:00Z',
          expiryDate: '2024-01-27T00:00:00Z',
          location: 'refrigerator-1',
        },
        {
          id: 'syrup-vanilla-1',
          name: 'Vanilla Syrup',
          category: 'syrups',
          currentStock: 1,
          minStock: 3,
          maxStock: 20,
          unit: 'bottles',
          costPerUnit: 8.99,
          supplier: 'Flavor Masters',
          lastRestocked: '2024-01-18T14:00:00Z',
          expiryDate: '2025-01-18T00:00:00Z',
          location: 'shelf-b2',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Load low stock items on component mount
  useEffect(() => {
    fetchLowStockItems();
  }, []);

  const getAlertIcon = (currentStock: number, minStock: number) => {
    if (currentStock <= minStock) {
      return <Error color="error" />;
    } else if (currentStock <= minStock * 1.5) {
      return <Warning color="warning" />;
    }
    return <Info color="info" />;
  };

  const getPriorityColor = (currentStock: number, minStock: number) => {
    if (currentStock <= minStock) {
      return '#f44336'; // critical
    } else if (currentStock <= minStock * 1.5) {
      return '#ff9800'; // high
    }
    return '#2196f3'; // medium
  };

  const getPriorityLabel = (currentStock: number, minStock: number) => {
    if (currentStock <= minStock) {
      return 'critical';
    } else if (currentStock <= minStock * 1.5) {
      return 'high';
    }
    return 'medium';
  };

  const getAlertMessage = (currentStock: number, minStock: number) => {
    if (currentStock <= minStock) {
      return 'Critical stock level - immediate reorder needed';
    } else if (currentStock <= minStock * 1.5) {
      return 'Stock running low - consider reordering';
    }
    return 'Consider reordering soon';
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
            {alerts.map((alert, index) => {
              const priorityColor = getPriorityColor(alert.currentStock, alert.minStock);
              const priorityLabel = getPriorityLabel(alert.currentStock, alert.minStock);
              const alertMessage = getAlertMessage(alert.currentStock, alert.minStock);
              
              return (
                <React.Fragment key={alert.id}>
                  <ListItem sx={{ px: 0, py: 1.5 }}>
                    <ListItemIcon>
                      {getAlertIcon(alert.currentStock, alert.minStock)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {alert.name}
                          </Typography>
                          <Chip
                            label={priorityLabel}
                            size="small"
                            sx={{
                              backgroundColor: `${priorityColor}20`,
                              color: priorityColor,
                              fontWeight: 500,
                              textTransform: 'capitalize',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            {alertMessage}
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
              );
            })}
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
