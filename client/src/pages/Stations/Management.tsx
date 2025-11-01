import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  LinearProgress,
  Divider,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp,
  People,
  Inventory,
  Warning,
  CheckCircle,
  Restaurant,
  Add,
  LocalOffer,
} from '@mui/icons-material';
import SalesChart from '../../components/Charts/SalesChart';
import WeatherWidget from '../../components/Widgets/WeatherWidget';
import MenuManagement from '../../components/Management/MenuManagement';
import AddOnsManagement from '../../components/Management/AddOnsManagement';
import DiscountManagement from '../../components/Management/DiscountManagement';
import { API_ENDPOINTS } from '../../config/api';

const Management: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [managementData, setManagementData] = useState({
    todayStats: {
      sales: 0,
      orders: 0,
      averageDeliveryTime: 0,
      averageOrderValue: 0,
    },
    staffPerformance: [],
    alerts: [],
    inventoryAlerts: [],
  });

  // Fetch real management data
  useEffect(() => {
    const fetchManagementData = async () => {
      try {
        // Fetch dashboard data
        const dashboardResponse = await fetch(API_ENDPOINTS.ANALYTICS_DASHBOARD);
        if (dashboardResponse.ok) {
          const dashboardData = await dashboardResponse.json();
          setManagementData(prev => ({
            ...prev,
            todayStats: {
              sales: dashboardData.todaySales,
              orders: dashboardData.todayOrders,
              averageDeliveryTime: dashboardData.averageDeliveryTime || 0,
              averageOrderValue: dashboardData.todayOrders > 0 ? 
                dashboardData.todaySales / dashboardData.todayOrders : 0,
            },
          }));
        }

        // Fetch staff performance data
        const staffResponse = await fetch(API_ENDPOINTS.ANALYTICS_STAFF);
        if (staffResponse.ok) {
          const staffData = await staffResponse.json();
          setManagementData(prev => ({
            ...prev,
            staffPerformance: staffData.data?.staffPerformance || [],
          }));
        }

        // For now, keep alerts and inventory alerts empty
        // These will be populated by real data in the future
        setManagementData(prev => ({
          ...prev,
          alerts: [],
          inventoryAlerts: [],
        }));
      } catch (error) {
        console.error('Error fetching management data:', error);
        // Keep data at default values (0/empty)
      }
    };

    fetchManagementData();
  }, []);

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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            label="Overview" 
            icon={<TrendingUp />} 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            label="Menu Management" 
            icon={<Restaurant />} 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            label="Add-Ons Management" 
            icon={<Add />} 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            label="Discount Codes" 
            icon={<LocalOffer />} 
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <>
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
                    {managementData.todayStats.averageDeliveryTime}m
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Delivery Time
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
                  <SalesChart period="today" />
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
                  
                  {managementData.staffPerformance.length > 0 ? (
                    <List sx={{ p: 0 }}>
                      {managementData.staffPerformance.map((staff: any, index: number) => (
                        <React.Fragment key={staff.staffId || index}>
                          <ListItem sx={{ px: 0, py: 2 }}>
                            <Avatar sx={{ mr: 2, backgroundColor: '#8B4513' }}>
                              {staff.name ? staff.name.split(' ').map((n: string) => n[0]).join('') : 'S'}
                            </Avatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {staff.name || 'Staff Member'}
                                  </Typography>
                                  <Chip
                                    label={staff.role || 'Staff'}
                                    size="small"
                                    sx={{ fontWeight: 500, textTransform: 'capitalize' }}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                    {staff.ordersCompleted || 0} orders • {staff.averageOrderTime || 0}min avg • {staff.customerRating || 0}/5 rating
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                      Efficiency: {((staff.efficiency || 0) * 100).toFixed(0)}%
                                    </Typography>
                                    <LinearProgress
                                      variant="determinate"
                                      value={(staff.efficiency || 0) * 100}
                                      sx={{ flex: 1, height: 6, borderRadius: 3 }}
                                    />
                                  </Box>
                                </Box>
                              }
                            />
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="h6" sx={{ fontWeight: 700, color: '#8B4513' }}>
                                ₱{(staff.salesGenerated || 0).toFixed(2)}
                              </Typography>
                            </Box>
                          </ListItem>
                          {index < managementData.staffPerformance.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No staff performance data available
                      </Typography>
                    </Box>
                  )}
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
                  
                  {managementData.inventoryAlerts.length > 0 ? (
                    <List sx={{ p: 0 }}>
                      {managementData.inventoryAlerts.map((item: any, index: number) => (
                        <React.Fragment key={item.item || index}>
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
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No inventory alerts
                      </Typography>
                    </Box>
                  )}
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
                  
                  {managementData.alerts.length > 0 ? (
                    <List sx={{ p: 0 }}>
                      {managementData.alerts.map((alert: any, index: number) => (
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
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No system alerts
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 1 && (
        <MenuManagement />
      )}

      {activeTab === 2 && (
        <AddOnsManagement />
      )}

      {activeTab === 3 && (
        <DiscountManagement />
      )}
    </Box>
  );
};

export default Management;
