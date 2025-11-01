import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  LinearProgress,
  Button,
  Divider,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  Receipt,
  AttachMoney,
  Category,
  Assignment,
  Schedule,
  Lightbulb,
  CheckCircle,
  Cancel,
  ThumbUp,
  ThumbDown,
  PriorityHigh,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import SalesChart from '../../components/Charts/SalesChart';
import WeatherWidget from '../../components/Widgets/WeatherWidget';
import { API_ENDPOINTS } from '../../config/api';
import { notify } from '../../utils/notifications';

interface Recommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  action: string;
  confidence: number;
  impact: string;
  id?: string;
  [key: string]: any;
}

const Analytics: React.FC = () => {
  const theme = useTheme();
  const [analyticsData, setAnalyticsData] = useState<{
    totalSales: number;
    totalOrders: number;
    averageOrderValue: number;
    topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
    hourlySales: Array<{ hour: string; sales: number }>;
    categoryPerformance: Array<{ category: string; quantity: number; revenue: number; percentage: number }>;
    orderStatusBreakdown: Array<{ status: string; count: number; percentage: number }>;
    stationPerformance: Array<{ station: string; orders: number; revenue: number; averageOrderValue: number }>;
    peakHoursHeatmap: Array<{ hour: string; hourFormatted: string; sales: number; orders: number; intensity: number }>;
    loading: boolean;
    error: string | null;
  }>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    topSellingItems: [],
    hourlySales: [],
    categoryPerformance: [],
    orderStatusBreakdown: [],
    stationPerformance: [],
    peakHoursHeatmap: [],
    loading: true,
    error: null
  });

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('month');

  // Fetch recommendations
  const fetchRecommendations = async (period: 'today' | 'week' | 'month' = selectedPeriod) => {
    try {
      setRecommendationsLoading(true);
      const response = await fetch(API_ENDPOINTS.ANALYTICS_RECOMMENDATIONS(period));
      const result = await response.json();
      
      if (result.success) {
        const recs = result.data?.recommendations || [];
        console.log('Fetched recommendations:', { period, count: recs.length, recommendations: recs });
        setRecommendations(recs);
      } else {
        console.error('Recommendations API error:', result.error);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      setRecommendations([]);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Track recommendation feedback and replace with new recommendation
  const trackRecommendationOutcome = async (recommendationId: string, outcome: 'positive' | 'negative' | 'neutral', feedback?: string) => {
    try {
      console.log('Tracking recommendation outcome:', { recommendationId, outcome, feedback });
      
      // Remove the clicked recommendation from UI immediately
      setRecommendations(prevRecs => prevRecs.filter(rec => rec.id !== recommendationId));
      
      // Send feedback to backend for calibration
      const response = await fetch(API_ENDPOINTS.ANALYTICS_RECOMMENDATIONS(selectedPeriod), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recommendationId,
          outcome,
          feedback
        })
      });
      
      const result = await response.json();
      console.log('Recommendation feedback response:', result);
      
      if (result.success) {
        // Show feedback message
        if (outcome === 'positive') {
          notify.success('Thank you! Your feedback has been recorded. Fetching a new recommendation...');
        } else if (outcome === 'negative') {
          notify.info('Feedback received. Generating a new recommendation based on your feedback...');
        }
        
        // Fetch a fresh recommendation to replace the removed one
        // This will use the feedback patterns stored in the backend for better recommendations
        setTimeout(async () => {
          try {
            const fetchResponse = await fetch(API_ENDPOINTS.ANALYTICS_RECOMMENDATIONS(selectedPeriod));
            const fetchResult = await fetchResponse.json();
            
            if (fetchResult.success) {
              const newRecs = fetchResult.data?.recommendations || [];
              
              // Add only the first new recommendation to avoid duplicates
              // Filter out any recommendations that we already have
              setRecommendations(prevRecs => {
                const existingIds = new Set(prevRecs.map(r => r.id));
                const newRec = newRecs.find((r: Recommendation) => r.id && !existingIds.has(r.id));
                
                if (newRec) {
                  return [...prevRecs, newRec];
                }
                // If no new unique recommendation, just return current (don't add duplicates)
                return prevRecs;
              });
              
              console.log('New recommendation added after feedback');
      }
    } catch (error) {
            console.error('Error fetching new recommendation:', error);
            // If fetching new recommendation fails, at least we've removed the old one
          }
        }, 800); // Small delay to ensure backend processed the feedback
      } else {
        notify.error(result.error || 'Failed to save feedback. Please try again.');
        console.error('Recommendation feedback error:', result.error);
        // Restore the recommendation if feedback failed
        setTimeout(() => {
          fetchRecommendations(selectedPeriod);
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error tracking recommendation:', error);
      notify.error('Failed to save feedback. Please check your connection and try again.');
    }
  };

  // Function to seed sample orders (1 month)
  const seedSampleOrders = async () => {
    if (!window.confirm('Generate sample data for testing? This will create realistic order data for the past month (typical local coffee shop volume).')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_DASHBOARD.replace('/dashboard', '/seed-orders')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      
      if (result.success) {
        notify.success(`Successfully created ${result.ordersCreated} sample orders! Generating recommendations...`, true, false);
        // Fetch recommendations after seeding data
        setTimeout(() => {
          fetchRecommendations(selectedPeriod);
          // Refresh analytics data after seeding
          window.location.reload();
        }, 2000);
      } else {
        notify.error(`Error: ${result.error || 'Failed to seed orders'}`, true, false);
      }
    } catch (error) {
      console.error('Error seeding orders:', error);
      notify.error('Failed to seed sample orders. Please check your connection and try again.', true, false);
    }
  };

  // Function to delete sample orders
  const deleteSampleOrders = async () => {
    if (!window.confirm('Delete all sample data? This will permanently delete all orders marked as sample data.')) {
      return;
    }
    
    try {
      const response = await fetch(`${API_ENDPOINTS.ANALYTICS_DASHBOARD.replace('/dashboard', '/seed-orders')}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const result = await response.json();
      
      if (result.success) {
        notify.success(`Successfully deleted ${result.ordersDeleted} sample orders! Refreshing...`, true, false);
        // Refresh analytics data after deletion
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        notify.error(`Error: ${result.error || 'Failed to delete sample orders'}`, true, false);
      }
    } catch (error) {
      console.error('Error deleting sample orders:', error);
      notify.error('Failed to delete sample orders. Please check your connection and try again.', true, false);
    }
  };

  // Fetch analytics data from Firebase Functions
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setAnalyticsData(prev => ({ ...prev, loading: true, error: null }));
        
        // Call Firebase Function to get analytics data with selected period
        // Add timestamp to prevent caching
        const response = await fetch(`${API_ENDPOINTS.ANALYTICS_SALES(selectedPeriod)}&_t=${Date.now()}`);
        const result = await response.json();
        
        if (result.success) {
          // Peak hours heatmap - backend already generates all hours (6AM-10PM), so we should use it directly
          // Only filter if really necessary, but for now let's use all data from backend
          const rawPeakHours = result.data.peakHoursHeatmap || [];
          
          console.log('Raw peak hours heatmap from backend:', {
            count: rawPeakHours.length,
            sample: rawPeakHours.slice(0, 5),
            hasOrders: rawPeakHours.some((h: any) => h.orders > 0),
            ordersPerHour: rawPeakHours.map((h: any) => ({ hour: h.hour, orders: h.orders }))
          });
          
          // Don't filter by operating hours - backend already handles the range (6AM-10PM)
          // Just use the data as-is since backend generates all hours
          const filteredPeakHours = rawPeakHours; // Use all hours from backend
          
          console.log('Using peak hours heatmap (no filter):', {
            count: filteredPeakHours.length,
            sample: filteredPeakHours.slice(0, 3)
          });
          
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
            categoryPerformance: result.data.categoryPerformance || [],
            orderStatusBreakdown: result.data.orderStatusBreakdown || [],
            stationPerformance: result.data.stationPerformance || [],
            peakHoursHeatmap: filteredPeakHours,
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
  }, [selectedPeriod]);

  // Fetch recommendations when period changes or on mount
  useEffect(() => {
    fetchRecommendations(selectedPeriod);
  }, [selectedPeriod]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    trend?: number;
  }> = ({ title, value, icon, color, trend }) => (
    <Card 
      sx={{ 
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(30, 30, 30, 0.8) 100%)`
          : `linear-gradient(135deg, ${theme.palette.background.paper} 0%, rgba(255, 255, 255, 0.9) 100%)`,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          right: 0,
          width: '40%',
          height: '40%',
          background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(20%, -20%)',
        },
      }}
    >
      <CardContent sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flex: 1 }}>
            <Typography 
              color="textSecondary" 
              gutterBottom 
              variant="body2"
              sx={{ 
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem',
                mb: 1,
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700, 
                color,
                mb: trend ? 1 : 0,
                background: theme.palette.mode === 'dark'
                  ? `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`
                  : `linear-gradient(135deg, ${color} 0%, ${color}bb 100%)`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {value}
            </Typography>
            {trend && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <TrendingUp sx={{ fontSize: 18, color: 'success.main', mr: 0.5 }} />
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                +{trend}% from yesterday
              </Typography>
              </Box>
            )}
          </Box>
          <Box
            sx={{
              backgroundColor: `${color}20`,
              borderRadius: 3,
              p: 2,
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 56,
              minHeight: 56,
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'scale(1.1) rotate(5deg)',
                backgroundColor: `${color}30`,
              },
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
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 700,
                mb: 1,
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #fff 0%, #e0e0e0 100%)'
                  : 'linear-gradient(135deg, #6B4423 0%, #8B5A3C 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
        Analytics Dashboard
      </Typography>
            <Typography variant="body2" color="text.secondary">
              Insights and performance metrics
            </Typography>
          </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
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
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={seedSampleOrders}
              sx={{ textTransform: 'none' }}
            >
                  Sample Data for Testing
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={deleteSampleOrders}
              sx={{ textTransform: 'none' }}
            >
              Delete Sample Data
            </Button>
          </Box>
          </Box>
        </Box>
      </Box>

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
                  <SalesChart period={selectedPeriod} />
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

            {/* Category Performance Breakdown */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ 
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(139, 69, 19, 0.2)' : '#8B451320', 
                      borderRadius: 2, 
                      p: 1.5, 
                      mr: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Category sx={{ color: '#8B4513', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      Category Performance
                    </Typography>
                  </Box>
                  {analyticsData.categoryPerformance.length > 0 ? (
                    <>
                      <Box sx={{ height: 280, mb: 3 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <defs>
                              <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                              </filter>
                            </defs>
                            <Pie
                              data={analyticsData.categoryPerformance}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ category, percentage }) => `${category}\n${percentage}%`}
                              outerRadius={95}
                              innerRadius={40}
                              fill="#8884d8"
                              dataKey="revenue"
                              filter="url(#shadow)"
                            >
                              {analyticsData.categoryPerformance.map((entry, index) => {
                                const colors = ['#8B4513', '#2196f3', '#ff9800', '#4caf50', '#9c27b0'];
                                return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="#fff" strokeWidth={2} />;
                              })}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => [
                                `₱${value.toFixed(2)}`,
                                props.payload.category
                              ]}
                              contentStyle={{
                                backgroundColor: theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '8px',
                                boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                                padding: '12px',
                                color: theme.palette.text.primary
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                      <Box>
                        {analyticsData.categoryPerformance.map((cat, index) => {
                          const colors = ['#8B4513', '#2196f3', '#ff9800', '#4caf50', '#9c27b0'];
                          const color = colors[index % colors.length];
                          return (
                            <Box 
                              key={cat.category} 
                              sx={{ 
                                mb: 2, 
                                p: 2, 
                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f9f9f9', 
                                borderRadius: 2,
                                border: `1px solid ${color}20`,
                                transition: 'transform 0.2s',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: 2
                                }
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                  {cat.category}
                                </Typography>
                                <Box sx={{ textAlign: 'right' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: color }}>
                                    {cat.percentage}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    ₱{cat.revenue.toFixed(2)}
                                  </Typography>
                                </Box>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={cat.percentage}
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : '#e0e0e0',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: color,
                                    borderRadius: 4
                                  }
                                }}
                              />
                              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                {cat.quantity} items sold
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No category data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Order Status Breakdown */}
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ 
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(33, 150, 243, 0.2)' : '#2196f320', 
                      borderRadius: 2, 
                      p: 1.5, 
                      mr: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Assignment sx={{ color: '#2196f3', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      Order Status Breakdown
                    </Typography>
                  </Box>
                  {analyticsData.orderStatusBreakdown.length > 0 ? (
                    <>
                      <Box sx={{ height: 280, mb: 3 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <defs>
                              <filter id="shadow2" x="-50%" y="-50%" width="200%" height="200%">
                                <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3"/>
                              </filter>
                            </defs>
                            <Pie
                              data={analyticsData.orderStatusBreakdown}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ status, count, percentage }) => `${status.toUpperCase()}\n${count} (${percentage}%)`}
                              outerRadius={95}
                              innerRadius={40}
                              fill="#8884d8"
                              dataKey="count"
                              filter="url(#shadow2)"
                            >
                              {analyticsData.orderStatusBreakdown.map((entry, index) => {
                                const getStatusColor = (status: string) => {
                                  const statusLower = status.toLowerCase();
                                  if (statusLower === 'completed') return '#4caf50';
                                  if (statusLower === 'preparing') return '#ff9800';
                                  if (statusLower === 'ready') return '#2196f3';
                                  if (statusLower === 'pending') return '#9e9e9e';
                                  if (statusLower === 'cancelled') return '#f44336';
                                  return '#757575';
                                };
                                return <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} stroke="#fff" strokeWidth={2} />;
                              })}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => [
                                `${value} orders`,
                                props.payload.status.toUpperCase()
                              ]}
                              contentStyle={{
                                backgroundColor: theme.palette.background.paper,
                                border: `1px solid ${theme.palette.divider}`,
                                borderRadius: '8px',
                                boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                                padding: '12px',
                                color: theme.palette.text.primary
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                      <Box>
                        {analyticsData.orderStatusBreakdown.map((status) => {
                          const getStatusColor = (s: string) => {
                            const sLower = s.toLowerCase();
                            if (sLower === 'completed') return '#4caf50';
                            if (sLower === 'preparing') return '#ff9800';
                            if (sLower === 'ready') return '#2196f3';
                            if (sLower === 'pending') return '#9e9e9e';
                            if (sLower === 'cancelled') return '#f44336';
                            return '#757575';
                          };
                          const color = getStatusColor(status.status);
                          return (
                            <Box 
                              key={status.status} 
                              sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                mb: 2,
                                p: 1.5,
                                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : '#f9f9f9',
                                borderRadius: 2,
                                border: `1px solid ${color}20`,
                                transition: 'transform 0.2s',
                                '&:hover': {
                                  transform: 'translateX(4px)',
                                  boxShadow: 1
                                }
                              }}
                            >
                              <Chip
                                label={status.status.charAt(0).toUpperCase() + status.status.slice(1)}
                                size="small"
                                sx={{
                                  backgroundColor: `${color}20`,
                                  color: color,
                                  fontWeight: 700,
                                  mr: 2,
                                  minWidth: 100,
                                  height: 28
                                }}
                              />
                              <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>
                                {status.count} orders
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: color, minWidth: 50, textAlign: 'right' }}>
                                {status.percentage}%
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No status data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Peak Hours Heatmap */}
            <Grid item xs={12} lg={6}>
              <Card sx={{ boxShadow: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ 
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 152, 0, 0.2)' : '#ff980020', 
                      borderRadius: 2, 
                      p: 1.5, 
                      mr: 1.5,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Schedule sx={{ color: '#ff9800', fontSize: 28 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      Peak Hours Heatmap
                    </Typography>
                  </Box>
                  {analyticsData.peakHoursHeatmap.length > 0 ? (
                    <Box sx={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.peakHoursHeatmap} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                          <defs>
                            <linearGradient id="heatmapGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8B4513" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#8B4513" stopOpacity={0.3} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} vertical={false} />
                          <XAxis 
                            dataKey="hourFormatted" 
                            stroke={theme.palette.text.secondary}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: theme.palette.text.secondary, fontWeight: 500 }}
                          />
                          <YAxis 
                            stroke={theme.palette.text.secondary}
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            tick={{ fill: theme.palette.text.secondary, fontWeight: 500 }}
                            domain={[0, 'dataMax']}
                            allowDecimals={false}
                          />
                          <Tooltip 
                            formatter={(value: number, name: string, props: any) => {
                              if (name === 'orders') return [`${value} order${value !== 1 ? 's' : ''}`, 'Orders'];
                              if (name === 'sales') return [`₱${value.toFixed(2)}`, 'Sales'];
                              return [value, name];
                            }}
                            labelFormatter={(label) => `Hour: ${label}`}
                            contentStyle={{
                              backgroundColor: theme.palette.background.paper,
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: '8px',
                              boxShadow: theme.palette.mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.1)',
                              padding: '12px',
                              color: theme.palette.text.primary
                            }}
                          />
                          <Bar dataKey="orders" radius={[8, 8, 0, 0]}>
                            {analyticsData.peakHoursHeatmap.map((entry, index) => {
                              // STRICT DATA-DRIVEN: Calculate opacity based on actual order count
                              // Find max orders in the dataset for scaling
                              const maxOrdersInData = Math.max(...analyticsData.peakHoursHeatmap.map(e => e.orders || 0));
                              
                              // If there's actual data, scale based on actual values
                              let opacity = 0.4; // Minimum opacity
                              if (maxOrdersInData > 0 && entry.orders > 0) {
                                // Strict proportional scaling: entry.orders / maxOrdersInData
                                const ratio = entry.orders / maxOrdersInData;
                                // Scale opacity from 0.4 (min) to 1.0 (max) based on actual ratio
                                opacity = 0.4 + (ratio * 0.6); // 0.4 + (ratio * 0.6) gives range 0.4-1.0
                              } else if (entry.orders === 0) {
                                opacity = 0.2; // Very low opacity for zero orders
                              }
                              
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`rgba(139, 69, 19, ${opacity})`}
                                />
                              );
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                      No hourly data available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}

      {/* AI Recommendations Section */}
      <Card sx={{ mt: 4, mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Lightbulb sx={{ mr: 2, fontSize: 32, color: '#ff9800' }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                AI-Powered Recommendations
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Data-driven insights that recalibrate based on results
              </Typography>
            </Box>
            {recommendationsLoading && <CircularProgress size={24} />}
          </Box>

          {recommendationsLoading && recommendations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Analyzing data and generating recommendations...
              </Typography>
            </Box>
          )}

          {!recommendationsLoading && recommendations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Lightbulb sx={{ fontSize: 64, color: 'text.secondary', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary">
                No recommendations available
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate more data to receive personalized recommendations
              </Typography>
            </Box>
          )}

          {!recommendationsLoading && recommendations.length > 0 && (
            <Grid container spacing={2}>
              {recommendations.map((rec, index) => {
                const priorityColor = 
                  rec.priority === 'high' ? '#f44336' : 
                  rec.priority === 'medium' ? '#ff9800' : 
                  '#4caf50';
                
                const typeColors: Record<string, string> = {
                  inventory: '#2196f3',
                  staffing: '#9c27b0',
                  menu: '#ff5722',
                  operations: '#607d8b',
                  marketing: '#e91e63'
                };
                
                return (
                  <Grid item xs={12} md={6} key={index}>
                    <Card 
                      sx={{ 
                        height: '100%',
                        borderLeft: `4px solid ${priorityColor}`,
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-2px)',
                          transition: 'all 0.2s'
                        }
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <Box
                            sx={{
                              backgroundColor: typeColors[rec.type] || '#757575',
                              borderRadius: 1,
                              p: 1,
                              mr: 2,
                              color: 'white',
                              minWidth: 40,
                              textAlign: 'center',
                              fontSize: 24
                            }}
                          >
                            {rec.type === 'inventory' && '📦'}
                            {rec.type === 'staffing' && '👥'}
                            {rec.type === 'menu' && '📋'}
                            {rec.type === 'operations' && '⚙️'}
                            {rec.type === 'marketing' && '📢'}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                                {rec.title}
                              </Typography>
                              {rec.priority === 'high' && (
                                <PriorityHigh sx={{ color: priorityColor, ml: 1 }} />
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {rec.message}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                              <Chip 
                                label={rec.priority.toUpperCase()} 
                                size="small" 
                                sx={{ 
                                  bgcolor: `${priorityColor}20`, 
                                  color: priorityColor,
                                  fontWeight: 600
                                }} 
                              />
                              <Chip 
                                label={`${Math.round(rec.confidence * 100)}% confidence`}
                                size="small"
                                variant="outlined"
                              />
                            </Box>
                          </Box>
                        </Box>
                        
                        <Divider sx={{ my: 2 }} />
                        
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<ThumbUp />}
                            onClick={() => {
                              if (rec.id) {
                                trackRecommendationOutcome(rec.id, 'positive');
                              } else {
                                console.error('Recommendation ID missing:', rec);
                                notify.error('Unable to submit feedback: Missing recommendation ID');
                              }
                            }}
                            sx={{ textTransform: 'none' }}
                            disabled={!rec.id}
                          >
                            Helpful
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<ThumbDown />}
                            onClick={() => {
                              if (rec.id) {
                                trackRecommendationOutcome(rec.id, 'negative');
                              } else {
                                console.error('Recommendation ID missing:', rec);
                                notify.error('Unable to submit feedback: Missing recommendation ID');
                              }
                            }}
                            sx={{ textTransform: 'none' }}
                            disabled={!rec.id}
                          >
                            Not Useful
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Analytics;
