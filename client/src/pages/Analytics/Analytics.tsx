import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  People,
  AttachMoney,
} from '@mui/icons-material';
import SalesChart from '../../components/Charts/SalesChart';
import WeatherWidget from '../../components/Widgets/WeatherWidget';
import { API_ENDPOINTS } from '../../config/api';

const Analytics: React.FC = () => {
  const [analyticsData, setAnalyticsData] = useState<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
    hourlySales: Array<{ hour: string; sales: number }>;
    loading: boolean;
    error: string | null;
  }>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topSellingItems: [],
    hourlySales: [],
    loading: true,
    error: null
  });

  // Fetch analytics data from Firebase Functions
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));
        
        // Call Firebase Function to get analytics data
        const response = await fetch(API_ENDPOINTS.ANALYTICS_SALES('today'));
        const result = await response.json();
        
        if (result.success) {
          setAnalyticsData({
            totalSales: result.data.totalSales,
            totalOrders: result.data.totalOrders,
            averageOrderValue: result.data.averageOrderValue,
            topSellingItems: result.data.topSellingItems || [],
            hourlySales: result.data.groupedData ? 
              Object.entries(result.data.groupedData).map(([hour, data]: [string, any]) => ({
                hour: hour,
                sales: data.sales
              })) : [],
            loading: false,
            error: null
          });
        } else {
          throw new Error(result.error || 'Failed to fetch analytics data');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setAnalyticsData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to load analytics data'
        }));
      }
    };

    fetchAnalyticsData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, []);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: number;
  }> = ({ title, value, icon, color, trend }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography color="textSecondary" gutterBottom variant="body2">
              {title}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color }}>
              {value}
            </Typography>
            {trend && (
              <Typography variant="body2" color="success.main" sx={{ mt: 1 }}>
                +{trend}% from yesterday
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: 2,
              p: 1.5,
              color: color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 3 }}>
        Analytics Dashboard
      </Typography>

      {analyticsData.loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {analyticsData.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {analyticsData.error}
        </Alert>
      )}

      {!analyticsData.loading && !analyticsData.error && (
        <>
          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Sales"
                value={`₱${analyticsData.totalSales.toFixed(2)}`}
                icon={<AttachMoney />}
                color="#4caf50"
                trend={12}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Total Orders"
                value={analyticsData.totalOrders}
                icon={<Receipt />}
                color="#2196f3"
                trend={8}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Avg Order Value"
                value={`₱${analyticsData.averageOrderValue.toFixed(2)}`}
                icon={<TrendingUp />}
                color="#ff9800"
                trend={5}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                title="Active Customers"
                value={156}
                icon={<People />}
                color="#9c27b0"
                trend={15}
              />
            </Grid>
          </Grid>

          {/* Main Content */}
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

            {/* Top Selling Items */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Top Selling Items
                  </Typography>
                  {analyticsData.topSellingItems.length > 0 ? (
                    analyticsData.topSellingItems.map((item: any, index: number) => (
                      <Box key={item.name} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mr: 2, minWidth: 24 }}>
                          {index + 1}
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {item.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.quantity} sold • ₱{item.revenue?.toFixed(2) || '0.00'} revenue
                          </Typography>
                        </Box>
                      </Box>
                    ))
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No sales data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Metrics */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                    Performance Metrics
                  </Typography>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Order Completion Rate
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                        <Box sx={{ width: '94%', height: '100%', backgroundColor: '#4caf50', borderRadius: 4 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        94%
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Average Prep Time
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                        <Box sx={{ width: '64%', height: '100%', backgroundColor: '#2196f3', borderRadius: 4 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        3.2min
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Customer Satisfaction
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ flex: 1, height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                        <Box sx={{ width: '96%', height: '100%', backgroundColor: '#ff9800', borderRadius: 4 }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        4.8/5
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default Analytics;
