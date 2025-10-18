const express = require('express');
const router = express.Router();
const axios = require('axios');

// Weather API configuration
const WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'demo-key';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';

// Mock weather data for demo purposes
const mockWeatherData = {
  current: {
    temperature: 22,
    condition: 'sunny',
    humidity: 45,
    windSpeed: 8,
    description: 'Clear sky'
  },
  forecast: [
    {
      date: '2024-01-21',
      high: 25,
      low: 18,
      condition: 'partly_cloudy',
      precipitation: 20
    },
    {
      date: '2024-01-22',
      high: 23,
      low: 16,
      condition: 'rainy',
      precipitation: 80
    },
    {
      date: '2024-01-23',
      high: 20,
      low: 14,
      condition: 'cloudy',
      precipitation: 40
    }
  ]
};

// Get current weather
router.get('/current', async (req, res) => {
  try {
    const { lat = 40.7128, lon = -74.0060 } = req.query; // Default to NYC
    
    // In production, use real weather API
    if (WEATHER_API_KEY !== 'demo-key') {
      const response = await axios.get(`${WEATHER_API_URL}/weather`, {
        params: {
          lat,
          lon,
          appid: WEATHER_API_KEY,
          units: 'metric'
        }
      });
      
      const weatherData = {
        temperature: Math.round(response.data.main.temp),
        condition: mapWeatherCondition(response.data.weather[0].main),
        humidity: response.data.main.humidity,
        windSpeed: response.data.wind.speed,
        description: response.data.weather[0].description,
        timestamp: new Date().toISOString()
      };
      
      res.json({
        success: true,
        data: weatherData
      });
    } else {
      // Use mock data for demo
      res.json({
        success: true,
        data: {
          ...mockWeatherData.current,
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('Weather API error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data',
      data: mockWeatherData.current // Fallback to mock data
    });
  }
});

// Get weather forecast
router.get('/forecast', async (req, res) => {
  try {
    const { lat = 40.7128, lon = -74.0060, days = 5 } = req.query;
    
    // In production, use real weather API
    if (WEATHER_API_KEY !== 'demo-key') {
      const response = await axios.get(`${WEATHER_API_URL}/forecast`, {
        params: {
          lat,
          lon,
          appid: WEATHER_API_KEY,
          units: 'metric',
          cnt: days * 8 // 8 forecasts per day (3-hour intervals)
        }
      });
      
      const forecastData = processForecastData(response.data.list);
      
      res.json({
        success: true,
        data: forecastData
      });
    } else {
      // Use mock data for demo
      res.json({
        success: true,
        data: mockWeatherData.forecast.slice(0, parseInt(days))
      });
    }
  } catch (error) {
    console.error('Weather forecast API error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather forecast',
      data: mockWeatherData.forecast // Fallback to mock data
    });
  }
});

// Get weather impact on sales
router.get('/impact', (req, res) => {
  const { period = 'today' } = req.query;
  
  // Mock impact analysis based on weather conditions
  const weatherImpact = {
    sunny: {
      hotDrinks: -0.15, // 15% decrease
      coldDrinks: 0.25, // 25% increase
      pastries: 0.10, // 10% increase
      overall: 0.05 // 5% increase in total sales
    },
    rainy: {
      hotDrinks: 0.20, // 20% increase
      coldDrinks: -0.10, // 10% decrease
      pastries: 0.15, // 15% increase
      overall: 0.08 // 8% increase in total sales
    },
    cold: {
      hotDrinks: 0.30, // 30% increase
      coldDrinks: -0.20, // 20% decrease
      pastries: 0.20, // 20% increase
      overall: 0.12 // 12% increase in total sales
    },
    hot: {
      hotDrinks: -0.25, // 25% decrease
      coldDrinks: 0.35, // 35% increase
      pastries: -0.05, // 5% decrease
      overall: 0.03 // 3% increase in total sales
    }
  };
  
  // Get current weather condition (simplified)
  const currentCondition = mockWeatherData.current.condition;
  const impact = weatherImpact[currentCondition] || weatherImpact.sunny;
  
  res.json({
    success: true,
    data: {
      currentCondition,
      impact,
      recommendations: generateWeatherRecommendations(currentCondition, impact)
    }
  });
});

// Get demand prediction based on weather
router.get('/demand-prediction', (req, res) => {
  const { days = 7 } = req.query;
  
  // Mock demand prediction based on weather forecast
  const predictions = mockWeatherData.forecast.slice(0, parseInt(days)).map(day => {
    const baseDemand = 100; // Base demand units
    let demandMultiplier = 1.0;
    
    // Adjust based on weather conditions
    switch (day.condition) {
      case 'sunny':
        demandMultiplier = 1.1;
        break;
      case 'rainy':
        demandMultiplier = 1.2;
        break;
      case 'cloudy':
        demandMultiplier = 1.0;
        break;
      case 'cold':
        demandMultiplier = 1.15;
        break;
      case 'hot':
        demandMultiplier = 1.05;
        break;
    }
    
    // Adjust for temperature
    if (day.high > 30) {
      demandMultiplier *= 1.1; // Hot weather increases demand
    } else if (day.high < 10) {
      demandMultiplier *= 1.2; // Cold weather increases demand
    }
    
    return {
      date: day.date,
      predictedDemand: Math.round(baseDemand * demandMultiplier),
      confidence: 0.85,
      factors: {
        weather: day.condition,
        temperature: day.high,
        precipitation: day.precipitation
      }
    };
  });
  
  res.json({
    success: true,
    data: {
      predictions,
      averageDemand: Math.round(predictions.reduce((sum, p) => sum + p.predictedDemand, 0) / predictions.length),
      peakDay: predictions.reduce((peak, current) => 
        current.predictedDemand > peak.predictedDemand ? current : peak
      )
    }
  });
});

// Helper functions
function mapWeatherCondition(apiCondition) {
  const conditionMap = {
    'Clear': 'sunny',
    'Clouds': 'cloudy',
    'Rain': 'rainy',
    'Snow': 'snowy',
    'Thunderstorm': 'stormy',
    'Drizzle': 'rainy',
    'Mist': 'foggy',
    'Fog': 'foggy'
  };
  
  return conditionMap[apiCondition] || 'cloudy';
}

function processForecastData(forecastList) {
  // Group forecasts by date and calculate daily averages
  const dailyForecasts = {};
  
  forecastList.forEach(item => {
    const date = new Date(item.dt * 1000).toISOString().split('T')[0];
    
    if (!dailyForecasts[date]) {
      dailyForecasts[date] = {
        date,
        temperatures: [],
        conditions: [],
        humidities: [],
        windSpeeds: []
      };
    }
    
    dailyForecasts[date].temperatures.push(item.main.temp);
    dailyForecasts[date].conditions.push(item.weather[0].main);
    dailyForecasts[date].humidities.push(item.main.humidity);
    dailyForecasts[date].windSpeeds.push(item.wind.speed);
  });
  
  // Calculate daily averages and extremes
  return Object.values(dailyForecasts).map(day => ({
    date: day.date,
    high: Math.round(Math.max(...day.temperatures)),
    low: Math.round(Math.min(...day.temperatures)),
    condition: mapWeatherCondition(day.conditions[0]), // Use first condition of the day
    humidity: Math.round(day.humidities.reduce((sum, h) => sum + h, 0) / day.humidities.length),
    windSpeed: Math.round(day.windSpeeds.reduce((sum, w) => sum + w, 0) / day.windSpeeds.length)
  }));
}

function generateWeatherRecommendations(condition, impact) {
  const recommendations = [];
  
  if (impact.hotDrinks > 0.1) {
    recommendations.push('Increase hot drink inventory and staff');
  }
  
  if (impact.coldDrinks > 0.1) {
    recommendations.push('Prepare additional cold drink ingredients');
  }
  
  if (impact.pastries > 0.1) {
    recommendations.push('Increase pastry production for higher demand');
  }
  
  if (impact.overall > 0.05) {
    recommendations.push('Consider additional staff for expected high demand');
  }
  
  return recommendations;
}

module.exports = router;
