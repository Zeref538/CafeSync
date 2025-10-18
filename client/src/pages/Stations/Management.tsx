import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Avatar,
  Chip,
  LinearProgress,
  Divider,
  Paper,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Inventory,
  Receipt,
  Warning,
  CheckCircle,
  Timer,
  AttachMoney,
} from '@mui/icons-material';
import SalesChart from '../../components/Charts/SalesChart';
import WeatherWidget from '../../components/Widgets/WeatherWidget';

const Management: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);

  // Mock management data
  const managementData = {
    todayStats: {
      sales: 1247.50,
      orders: 89,
      customers: 156,
      averageOrderValue: 14.02,
    },
    staffPerformance: [
      {
        name: 'Sarah Johnson',
        role: 'Manager',
        ordersCompleted: 12,
        averageOrderTime: 2.8,
        customerRating: 4.9,
        salesGenerated: 125.50,
        efficiency: 0.95,
      },
      {
        name: 'Mike Chen',
        role: 'Barista',
        ordersCompleted: 45,
        averageOrderTime: 3.2,
        customerRating: 4.8,
        salesGenerated: 450.75,
        efficiency: 0.88,
      },
      {
        name: 'Alex Rodriguez',
        role: 'Kitchen Staff',
        ordersCompleted: 32,
        averageOrderTime: 2.5,
        customerRating: 4.7,
        salesGenerated: 320.25,
        efficiency: 0.92,
      },
    ],
    alerts: [
      {
        type: 'warning',
        title: 'Low Stock Alert',
        message: 'Whole Milk is running low (3 gallons remaining)',
        priority: 'high',
        timestamp: '2024-01-20T14:30:00Z',
      },
      {
        type: 'info',
        title: 'Weather Update',
        message: 'Sunny weather expected to increase cold drink demand by 25%',
        priority: 'medium',
        timestamp: '2024-01-20T14:25:00Z',
      },
      {
        type: 'success',
        title: 'Goal Achieved',
        message: 'Daily sales target exceeded by 12%',
        priority: 'low',
        timestamp: '2024-01-20T14:20:00Z',
      },
    ],
    inventoryAlerts: [
      {
        item: 'Whole Milk',
        currentStock: 3,
        minStock: 5,
        status: 'critical',
      },
      {
        item: 'Vanilla Syrup',
        currentStock: 1,
        minStock: 3,
        status: 'critical',
      },
      {
        item: 'Coffee Beans',
        currentStock: 8,
        minStock: 10,
        status: 'warning',
      },
    ],
  };

  const getAlertColor = (type: string) => {
    const colors: Record<string, string> = {
      warning: '#ff9800',
      info: '#2196f3',
      success: '#4caf50',
      error: '#f44336',
    };
    return colors[type] || '#666';
  };

  const getAlertIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      warning: <Warning />,
      info: <TrendingUp />,
      success: <CheckCircle />,
      error: <Warning />,
    };
    return icons[type] || <TrendingUp />;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      high: '#f44336',
      medium: '#ff9800',
      low: '#4caf50',
    };
    return colors[priority] || '#666';
  };

  const getStockStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      critical: '#f44336',
      warning: '#ff9800',
      good: '#4caf50',
    };
    return colors[status] || '#666';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Management Dashboard
      </Typography>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                ₱{managementData.todayStats.sales.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Today's Sales
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                {managementData.todayStats.orders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Orders Today
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                {managementData.todayStats.customers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                ₱{managementData.todayStats.averageOrderValue.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Order Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alerts */}
      {managementData.alerts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {managementData.alerts.length} alerts require attention
          </Typography>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Sales Chart */}
        <Grid item xs={12} lg={8}>
          <Card sx={{ height: 400 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Sales Overview
              </Typography>
              <SalesChart />
            </CardContent>
          </Card>
        </Grid>

        {/* Weather Widget */}
        <Grid item xs={12} lg={4}>
          <WeatherWidget />
        </Grid>

        {/* Staff Performance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <People />
                Staff Performance
              </Typography>
              
              <List sx={{ p: 0 }}>
                {managementData.staffPerformance.map((staff, index) => (
                  <React.Fragment key={staff.name}>
                    <ListItem sx={{ px: 0, py: 2 }}>
                      <Avatar sx={{ mr: 2, backgroundColor: '#8B4513' }}>
                        {staff.name.split(' ').map(n => n[0]).join('')}
                      </Avatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {staff.name}
                            </Typography>
                            <Chip
                              label={staff.role}
                              size="small"
                              sx={{ fontWeight: 500, textTransform: 'capitalize' }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {staff.ordersCompleted} orders • {staff.averageOrderTime}min avg • {staff.customerRating}/5 rating
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Efficiency: {(staff.efficiency * 100).toFixed(0)}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={staff.efficiency * 100}
                                sx={{ flex: 1, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#8B4513' }}>
                          ₱{staff.salesGenerated.toFixed(2)}
                        </Typography>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < managementData.staffPerformance.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Inventory Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Inventory />
                Inventory Alerts
              </Typography>
              
              <List sx={{ p: 0 }}>
                {managementData.inventoryAlerts.map((item, index) => (
                  <React.Fragment key={item.item}>
                    <ListItem sx={{ px: 0, py: 2 }}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {item.item}
                            </Typography>
                            <Chip
                              label={item.status}
                              size="small"
                              sx={{
                                backgroundColor: `${getStockStatusColor(item.status)}20`,
                                color: getStockStatusColor(item.status),
                                fontWeight: 500,
                                textTransform: 'capitalize',
                              }}
                            />
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Current: {item.currentStock} • Min: {item.minStock}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                Stock Level
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={(item.currentStock / item.minStock) * 100}
                                color={item.status === 'critical' ? 'error' : item.status === 'warning' ? 'warning' : 'success'}
                                sx={{ flex: 1, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < managementData.inventoryAlerts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* System Alerts */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning />
                System Alerts
              </Typography>
              
              <List sx={{ p: 0 }}>
                {managementData.alerts.map((alert, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0, py: 2 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          p: 2,
                          backgroundColor: `${getAlertColor(alert.type)}10`,
                          borderRadius: 2,
                          border: `1px solid ${getAlertColor(alert.type)}30`,
                        }}
                      >
                        <Box sx={{ color: getAlertColor(alert.type) }}>
                          {getAlertIcon(alert.type)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {alert.title}
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
                          <Typography variant="body2" color="text.secondary">
                            {alert.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(alert.timestamp).toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                    {index < managementData.alerts.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Management;
