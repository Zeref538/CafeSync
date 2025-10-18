import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  WbSunny,
  Cloud,
  CloudQueue,
  Thunderstorm,
  AcUnit,
  WaterDrop,
} from '@mui/icons-material';

const WeatherWidget: React.FC = () => {
  // Mock weather data - in production, this would come from the weather API
  const weatherData = {
    current: {
      temperature: 22,
      condition: 'sunny',
      humidity: 45,
      description: 'Clear sky',
    },
    forecast: [
      { time: 'Now', temp: 22, condition: 'sunny' },
      { time: '2PM', temp: 24, condition: 'sunny' },
      { time: '4PM', temp: 23, condition: 'partly_cloudy' },
      { time: '6PM', temp: 21, condition: 'cloudy' },
    ],
    impact: {
      hotDrinks: -0.15,
      coldDrinks: 0.25,
      overall: 0.05,
    },
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

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      sunny: '#ff9800',
      cloudy: '#757575',
      partly_cloudy: '#9e9e9e',
      rainy: '#2196f3',
      snowy: '#e3f2fd',
    };
    return colors[condition] || '#757575';
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Weather & Demand Impact
        </Typography>

        {/* Current Weather */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Box sx={{ fontSize: 40, mr: 2 }}>
            {getWeatherIcon(weatherData.current.condition)}
          </Box>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 700, lineHeight: 1 }}>
              {weatherData.current.temperature}°
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {weatherData.current.description}
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
            {weatherData.current.humidity}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={weatherData.current.humidity}
          sx={{ mb: 3, height: 6, borderRadius: 3 }}
        />

        {/* Hourly Forecast */}
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
          Hourly Forecast
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          {weatherData.forecast.map((hour, index) => (
            <Box key={index} sx={{ textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                {hour.time}
              </Typography>
              <Box sx={{ fontSize: 20, my: 0.5 }}>
                {getWeatherIcon(hour.condition)}
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {hour.temp}°
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Demand Impact */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            Expected Demand Impact
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Hot Drinks</Typography>
              <Typography variant="body2" color={weatherData.impact.hotDrinks < 0 ? 'error.main' : 'success.main'}>
                {weatherData.impact.hotDrinks > 0 ? '+' : ''}{(weatherData.impact.hotDrinks * 100).toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.abs(weatherData.impact.hotDrinks) * 100}
              color={weatherData.impact.hotDrinks < 0 ? 'error' : 'success'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">Cold Drinks</Typography>
              <Typography variant="body2" color={weatherData.impact.coldDrinks > 0 ? 'success.main' : 'error.main'}>
                {weatherData.impact.coldDrinks > 0 ? '+' : ''}{(weatherData.impact.coldDrinks * 100).toFixed(0)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.abs(weatherData.impact.coldDrinks) * 100}
              color={weatherData.impact.coldDrinks > 0 ? 'success' : 'error'}
              sx={{ height: 4, borderRadius: 2 }}
            />
          </Box>

          <Box sx={{ mt: 2, p: 1, backgroundColor: 'white', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ textAlign: 'center', fontWeight: 600 }}>
              Overall: +{(weatherData.impact.overall * 100).toFixed(0)}% expected increase
            </Typography>
          </Box>
        </Box>

        {/* Recommendations */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Recommendations
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label="Increase cold drink prep" size="small" color="primary" variant="outlined" />
            <Chip label="Reduce hot drink inventory" size="small" color="secondary" variant="outlined" />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default WeatherWidget;
