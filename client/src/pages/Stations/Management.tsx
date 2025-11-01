import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Tabs, Tab, Button, useTheme } from '@mui/material';
import { TrendingUp, Restaurant, Add, LocalOffer, Assessment } from '@mui/icons-material';
import SalesChart from '../../components/Charts/SalesChart';
import WeatherWidget from '../../components/Widgets/WeatherWidget';
import MenuManagement from '../../components/Management/MenuManagement';
import AddOnsManagement from '../../components/Management/AddOnsManagement';
import DiscountManagement from '../../components/Management/DiscountManagement';
import StaffPerformancePage from '../../pages/StaffPerformance/StaffPerformance';
import { API_ENDPOINTS } from '../../config/api';

const Management: React.FC = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [managementData, setManagementData] = useState({
    stats: { sales: 0, orders: 0, averageDeliveryTime: 0, averageOrderValue: 0 },
    staffPerformance: [],
    alerts: [],
    inventoryAlerts: [],
    loading: false,
  });

  useEffect(() => {
    const fetchManagementData = async () => {
      try {
        setManagementData(prev => ({ ...prev, loading: true }));
        
        // Fetch sales data for the selected period
        const salesResponse = await fetch(`${API_ENDPOINTS.ANALYTICS_SALES(selectedPeriod)}&_t=${Date.now()}`);
        if (salesResponse.ok) {
          const salesData = await salesResponse.json();
          if (salesData.success) {
            const data = salesData.data;
          setManagementData(prev => ({
            ...prev,
              stats: {
                sales: data.totalSales || 0,
                orders: data.totalOrders || 0,
                averageDeliveryTime: data.averageOrderTime || 0,
                averageOrderValue: data.averageOrderValue || 0,
            },
          }));
          }
        }
        
        // Fetch staff performance data for the selected period
        const staffResponse = await fetch(`${API_ENDPOINTS.ANALYTICS_STAFF}?period=${selectedPeriod}&_t=${Date.now()}`);
        if (staffResponse.ok) {
          const staffData = await staffResponse.json();
          setManagementData(prev => ({
            ...prev,
            staffPerformance: staffData.data?.staffPerformance || [],
          }));
        }
      } catch (error) {
        console.error('Error fetching management data:', error);
      } finally {
        setManagementData(prev => ({ ...prev, loading: false }));
      }
    };
    fetchManagementData();
  }, [selectedPeriod]);

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'today': return "Today";
      case 'week': return "This Week";
      case 'month': return "This Month";
      default: return "Today";
    }
  };

  const getSalesLabel = () => {
    switch (selectedPeriod) {
      case 'today': return "Today's Sales";
      case 'week': return "Week's Sales";
      case 'month': return "Month's Sales";
      default: return "Today's Sales";
    }
  };

  const getOrdersLabel = () => {
    switch (selectedPeriod) {
      case 'today': return "Orders Today";
      case 'week': return "Orders This Week";
      case 'month': return "Orders This Month";
      default: return "Orders Today";
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 700, 
            mb: 2,
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)'
              : 'linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
        Management Dashboard
      </Typography>
        
        {activeTab === 0 && (
          <Box sx={{
            display: 'flex',
            gap: 0.5,
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(107, 68, 35, 0.05)',
            borderRadius: 3,
            p: 0.5,
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(107, 68, 35, 0.1)',
            width: 'fit-content',
            mb: 2,
          }}>
            <Button
              variant={selectedPeriod === 'today' ? 'contained' : 'text'}
              onClick={() => setSelectedPeriod('today')}
              sx={{
                textTransform: 'none',
                minWidth: 90,
                fontWeight: selectedPeriod === 'today' ? 600 : 500,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(107, 68, 35, 0.1)',
                },
              }}
              size="small"
            >
              Today
            </Button>
            <Button
              variant={selectedPeriod === 'week' ? 'contained' : 'text'}
              onClick={() => setSelectedPeriod('week')}
              sx={{
                textTransform: 'none',
                minWidth: 90,
                fontWeight: selectedPeriod === 'week' ? 600 : 500,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(107, 68, 35, 0.1)',
                },
              }}
              size="small"
            >
              Week
            </Button>
            <Button
              variant={selectedPeriod === 'month' ? 'contained' : 'text'}
              onClick={() => setSelectedPeriod('month')}
              sx={{
                textTransform: 'none',
                minWidth: 90,
                fontWeight: selectedPeriod === 'month' ? 600 : 500,
                borderRadius: 2,
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(107, 68, 35, 0.1)',
                },
              }}
              size="small"
            >
              Month
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Overview" icon={<TrendingUp />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Menu Management" icon={<Restaurant />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Add-Ons Management" icon={<Add />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Discount Codes" icon={<LocalOffer />} iconPosition="start" sx={{ textTransform: 'none' }} />
          <Tab label="Staff Performance" icon={<Assessment />} iconPosition="start" sx={{ textTransform: 'none' }} />
        </Tabs>
      </Box>

      {activeTab === 0 && (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                  ₱{managementData.stats.sales.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">{getSalesLabel()}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                  {managementData.stats.orders}
                </Typography>
                <Typography variant="body2" color="text.secondary">{getOrdersLabel()}</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                  ₱{managementData.stats.averageOrderValue.toFixed(2)}
                </Typography>
                <Typography variant="body2" color="text.secondary">Avg Order Value</Typography>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card><CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                  {managementData.stats.averageDeliveryTime}m
                </Typography>
                <Typography variant="body2" color="text.secondary">Avg Delivery Time</Typography>
              </CardContent></Card>
            </Grid>
          </Grid>
          <Grid container spacing={3}>
            <Grid item xs={12} lg={8}>
              <Card sx={{ height: 400 }}><CardContent>
                <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>Sales Overview ({getPeriodLabel()})</Typography>
                <SalesChart period={selectedPeriod} />
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} lg={4}><WeatherWidget /></Grid>
          </Grid>

          {/* Staff Performance Summary */}
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Top 5 Staff by Sales ({getPeriodLabel()})
                  </Typography>
                  {managementData.loading ? (
                    <Typography variant="body2" color="text.secondary">Loading...</Typography>
                  ) : managementData.staffPerformance.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No staff data available for {getPeriodLabel().toLowerCase()}</Typography>
                  ) : (
                    <Box>
                      {managementData.staffPerformance
                        .sort((a: any, b: any) => (b.totalSales || 0) - (a.totalSales || 0))
                        .slice(0, 5)
                        .map((staff: any, index: number) => (
                          <Box
                            key={staff.staffId || index}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1.5,
                              px: 2,
                              mb: 1,
                              borderRadius: 2,
                              backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(107, 68, 35, 0.05)',
                              border: theme.palette.mode === 'dark'
                                ? '1px solid rgba(255,255,255,0.08)'
                                : '1px solid rgba(107, 68, 35, 0.1)',
                            }}
                          >
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {staff.staffName || 'Unknown Staff'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {staff.staffRole || 'staff'} • {staff.completedOrders || 0} orders
                              </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#4caf50' }}>
                              ₱{((staff.totalSales || 0).toFixed(2))}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Top 5 Staff by Orders ({getPeriodLabel()})
                  </Typography>
                  {managementData.loading ? (
                    <Typography variant="body2" color="text.secondary">Loading...</Typography>
                  ) : managementData.staffPerformance.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No staff data available for {getPeriodLabel().toLowerCase()}</Typography>
                  ) : (
                    <Box>
                      {managementData.staffPerformance
                        .sort((a: any, b: any) => (b.totalOrders || 0) - (a.totalOrders || 0))
                        .slice(0, 5)
                        .map((staff: any, index: number) => (
                          <Box
                            key={staff.staffId || index}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1.5,
                              px: 2,
                              mb: 1,
                              borderRadius: 2,
                              backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(107, 68, 35, 0.05)',
                              border: theme.palette.mode === 'dark'
                                ? '1px solid rgba(255,255,255,0.08)'
                                : '1px solid rgba(107, 68, 35, 0.1)',
                            }}
                          >
                            <Box>
                              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                {staff.staffName || 'Unknown Staff'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {staff.staffRole || 'staff'} • ₱{((staff.totalSales || 0).toFixed(2))} sales
                              </Typography>
                            </Box>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2196f3' }}>
                              {staff.totalOrders || 0}
                            </Typography>
                          </Box>
                        ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {activeTab === 1 && <MenuManagement />}
      {activeTab === 2 && <AddOnsManagement />}
      {activeTab === 3 && <DiscountManagement />}
      {activeTab === 4 && <StaffPerformancePage />}
    </Box>
  );
};

export default Management;

