import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  WbSunny,
  Cloud,
  CloudQueue,
  Thunderstorm,
  AcUnit,
  WaterDrop,
  LocationOn,
  Psychology,
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  description: string;
  windSpeed?: number;
  location?: {
    name: string;
    address: string;
    lat: number;
    lon: number;
  };
  timestamp?: string;
}

const WeatherWidget: React.FC = () => {
  const theme = useTheme();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWeatherData();
    // Refresh weather data every 5 minutes
    const interval = setInterval(fetchWeatherData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchWeatherData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch from AI service
      const response = await fetch(API_ENDPOINTS.WEATHER);
      
      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }
      
      const data = await response.json();
      
      // Handle different response formats
      if (data.data) {
        // Response wrapped in { success: true, data: {...} }
        setWeatherData(data.data);
        setError(null); // Clear any previous errors
      } else {
        // Direct weather data object
        setWeatherData(data);
        setError(null); // Clear any previous errors
      }
    } catch (err) {
      console.error('Error fetching weather:', err);
      setError('Unable to fetch weather data. Using demo data.');
      // Fallback to demo data
      setWeatherData({
        temperature: 28,
        condition: 'partly_cloudy',
        humidity: 75,
        description: 'Partly cloudy',
        windSpeed: 8.5,
        location: {
          name: 'Bean and Beyond, Caloocan City',
          address: '14 Kumintang Street, Caloocan City, Philippines',
          lat: 14.6542,
          lon: 120.9823,
        },
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const getWeatherIcon = (condition: string) => {
    const icons: Record<string, React.ReactNode> = {
      sunny: <WbSunny sx={{ color: '#ff9800' }} />,
      cloudy: <Cloud sx={{ color: '#757575' }} />,
      partly_cloudy: <CloudQueue sx={{ color: '#9e9e9e' }} />,
      rainy: <Thunderstorm sx={{ color: '#2196f3' }} />,
      snowy: <AcUnit sx={{ color: '#e3f2fd' }} />,
    };
    return icons[condition] || <Cloud />;
  };

  // Calculate impact based on weather
  const calculateImpact = () => {
    if (!weatherData) return { hotDrinks: 0, coldDrinks: 0, overall: 0 };
    
    const temp = weatherData.temperature;
    const condition = weatherData.condition;
    
    let hotDrinks = 0;
    let coldDrinks = 0;
    
    // Hot weather increases cold drinks
    if (temp > 30) {
      hotDrinks = -0.20;
      coldDrinks = 0.30;
    } else if (temp > 25) {
      hotDrinks = -0.15;
      coldDrinks = 0.25;
    } else if (temp < 20) {
      hotDrinks = 0.25;
      coldDrinks = -0.15;
    }
    
    // Rainy weather increases hot drinks
    if (condition === 'rainy') {
      hotDrinks += 0.15;
      coldDrinks -= 0.10;
    }
    
    return {
      hotDrinks,
      coldDrinks,
      overall: (hotDrinks + coldDrinks) / 2,
    };
  };

  const impact = calculateImpact();

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!weatherData) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Alert severity="error">Unable to load weather data</Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        {/* AI System Indicator */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2, 
          p: 1.5, 
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(25, 118, 210, 0.15)' 
            : '#e3f2fd', 
          borderRadius: 2 
        }}>
          <Psychology sx={{ mr: 1, color: theme.palette.mode === 'dark' ? '#64b5f6' : '#1976d2' }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#90caf9' : '#1976d2' }}>
              AI-Powered Weather Analysis
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Real-time data processing
            </Typography>
          </Box>
        </Box>

        {/* Location Display */}
        {weatherData.location && (
          <Box sx={{ 
            mb: 2, 
            p: 1.5, 
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : '#f5f5f5', 
            borderRadius: 2 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
              <LocationOn sx={{ mr: 1, color: 'primary.main', mt: 0.5 }} />
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {weatherData.location.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {weatherData.location.address}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Weather & Demand Impact
        </Typography>

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Current Weather */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ fontSize: 40, mr: 2 }}>
            {getWeatherIcon(weatherData.condition)}
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {weatherData.temperature}°
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {weatherData.description}
            </Typography>
          </Box>
        </Box>

        {/* Humidity */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <WaterDrop sx={{ fontSize: 16, color: 'primary.main', mr: 1 }} />
          <Typography variant="body2" sx={{ flex: 1 }}>
            Humidity
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {weatherData.humidity}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={weatherData.humidity}
          sx={{ mb: 3, height: 6, borderRadius: 3 }}
        />

        {/* AI Demand Impact */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(76, 175, 80, 0.15)' 
            : '#e8f5e9', 
          borderRadius: 2, 
          border: `2px solid ${theme.palette.mode === 'dark' ? 'rgba(76, 175, 80, 0.5)' : '#4caf50'}` 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Psychology sx={{ mr: 1, color: theme.palette.mode === 'dark' ? '#81c784' : '#4caf50', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: theme.palette.mode === 'dark' ? '#a5d6a7' : '#2e7d32' }}>
              AI-Predicted Demand Impact
            </Typography>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Hot Drinks</Typography>
              <Typography variant="body2" color={impact.hotDrinks < 0 ? 'error.main' : 'success.main'}>
                {impact.hotDrinks > 0 ? '+' : ''}{(impact.hotDrinks * 100).toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.abs(impact.hotDrinks) * 100}
              color={impact.hotDrinks < 0 ? 'error' : 'success'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Cold Drinks</Typography>
              <Typography variant="body2" color={impact.coldDrinks > 0 ? 'success.main' : 'error.main'}>
                {impact.coldDrinks > 0 ? '+' : ''}{(impact.coldDrinks * 100).toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.abs(impact.coldDrinks) * 100}
              color={impact.coldDrinks > 0 ? 'success' : 'error'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>

          <Box sx={{ 
            mt: 2, 
            p: 1, 
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'white', 
            borderRadius: 1 
          }}>
            <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600 }}>
              Overall: {impact.overall > 0 ? '+' : ''}{(impact.overall * 100).toFixed(0)}% expected change
            </Typography>
          </Box>
        </Box>

        {/* AI Recommendations */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            AI Recommendations
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {impact.coldDrinks > 0 && (
              <Chip 
                label="Increase cold drink prep" 
                size="small" 
                color="primary" 
                variant="outlined" 
              />
            )}
            {impact.hotDrinks > 0 && (
              <Chip 
                label="Increase hot drink inventory" 
                size="small" 
                color="secondary" 
                variant="outlined" 
              />
            )}
            {impact.hotDrinks < 0 && (
              <Chip 
                label="Reduce hot drink stock" 
                size="small" 
                color="warning" 
                variant="outlined" 
              />
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
