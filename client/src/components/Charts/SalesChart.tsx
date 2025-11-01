import React, { useState, useEffect } from 'react';
import { Box, CircularProgress } from '@mui/material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { API_ENDPOINTS } from '../../config/api';

interface SalesChartProps {
  period?: 'today' | 'week' | 'month';
}

interface HourlyData {
  time: string;
  sales: number;
  orders: number;
}

const SalesChart: React.FC<SalesChartProps> = ({ period = 'today' }) => {
  const [data, setData] = useState<HourlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        setLoading(true);
        // Add timestamp to prevent caching
        const response = await fetch(`${API_ENDPOINTS.ANALYTICS_SALES(period)}&_t=${Date.now()}`);
        
        if (response.ok) {
          const result = await response.json();
          
          // Transform the data for the chart based on period
          if (result.data && result.data.groupedData) {
            let transformedData: HourlyData[] = [];
            
            if (period === 'today') {
              // Today: format as hourly (9AM, 10AM, etc.)
              transformedData = Object.entries(result.data.groupedData).map(([hour, data]: [string, any]) => ({
                time: formatHour(hour),
                sales: data.sales || 0,
                orders: data.orders || 0,
              })).sort((a, b) => {
                // Sort by hour
                const hourA = parseInt(a.time.match(/\d+/)?.[0] || '0');
                const hourB = parseInt(b.time.match(/\d+/)?.[0] || '0');
                const isPM_A = a.time.includes('PM') && hourA !== 12;
                const isPM_B = b.time.includes('PM') && hourB !== 12;
                const hourA_24 = isPM_A ? hourA + 12 : (hourA === 12 && a.time.includes('AM') ? 0 : hourA);
                const hourB_24 = isPM_B ? hourB + 12 : (hourB === 12 && b.time.includes('AM') ? 0 : hourB);
                return hourA_24 - hourB_24;
              });
            } else if (period === 'week') {
              // Week: format as day names (Monday, Tuesday, etc.)
              const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
              transformedData = dayOrder
                .filter(day => result.data.groupedData[day])
                .map((day) => ({
                  time: day.substring(0, 3), // Short form: Mon, Tue, etc.
                  sales: result.data.groupedData[day].sales || 0,
                  orders: result.data.groupedData[day].orders || 0,
                }));
            } else if (period === 'month') {
              // Month: format as weeks (Week 1, Week 2, etc.)
              transformedData = Object.entries(result.data.groupedData)
                .sort((a, b) => {
                  const weekA = parseInt(a[0].replace('Week ', ''));
                  const weekB = parseInt(b[0].replace('Week ', ''));
                  return weekA - weekB;
                })
                .map(([week, data]: [string, any]) => ({
                  time: week, // Week 1, Week 2, etc.
                  sales: data.sales || 0,
                  orders: data.orders || 0,
                }));
            }
            
            setData(transformedData);
          } else {
            // Use empty data if no sales data available
            setData([]);
          }
        } else {
          // Fallback to empty data on error
          setData([]);
        }
      } catch (error) {
        console.error('Error fetching sales data:', error);
        // Fallback to empty data on error
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [period]);

  const formatHour = (hour: string): string => {
    // Convert "06:00" format to "6AM", "12:00" to "12PM", etc.
    const [hours] = hour.split(':');
    const hourNum = parseInt(hours, 10);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum % 12 || 12;
    return `${displayHour}${period}`;
  };

  // Default mock data structure for chart rendering based on period
  const getDefaultData = () => {
    if (period === 'today') {
      return [
        { time: '6AM', sales: 0, orders: 0 },
        { time: '8AM', sales: 0, orders: 0 },
        { time: '10AM', sales: 0, orders: 0 },
        { time: '12PM', sales: 0, orders: 0 },
        { time: '2PM', sales: 0, orders: 0 },
        { time: '4PM', sales: 0, orders: 0 },
        { time: '6PM', sales: 0, orders: 0 },
        { time: '8PM', sales: 0, orders: 0 },
      ];
    } else if (period === 'week') {
      return [
        { time: 'Mon', sales: 0, orders: 0 },
        { time: 'Tue', sales: 0, orders: 0 },
        { time: 'Wed', sales: 0, orders: 0 },
        { time: 'Thu', sales: 0, orders: 0 },
        { time: 'Fri', sales: 0, orders: 0 },
        { time: 'Sat', sales: 0, orders: 0 },
        { time: 'Sun', sales: 0, orders: 0 },
      ];
    } else { // month
      return [
        { time: 'Week 1', sales: 0, orders: 0 },
        { time: 'Week 2', sales: 0, orders: 0 },
        { time: 'Week 3', sales: 0, orders: 0 },
        { time: 'Week 4', sales: 0, orders: 0 },
      ];
    }
  };
  
  const chartData = data.length > 0 ? data : getDefaultData();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const firstPoint = payload[0];
    const salesValue = firstPoint?.value;
    const ordersValue = firstPoint?.payload?.orders;

    return (
      <div
        style={{
          backgroundColor: 'white',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: '#333' }}>{label}</p>
        <p style={{ margin: '4px 0 0 0', color: '#8B4513' }}>
          Sales: ₱{typeof salesValue === 'number' ? salesValue.toLocaleString() : salesValue}
        </p>
        {ordersValue !== undefined && (
          <p style={{ margin: '4px 0 0 0', color: '#2196f3' }}>
            Orders: {ordersValue}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: 300, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B4513" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#8B4513" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="time" 
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            stroke="#666"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `₱${value}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="sales"
            stroke="#8B4513"
            strokeWidth={3}
            fill="url(#salesGradient)"
            dot={{ fill: '#8B4513', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#8B4513', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default SalesChart;
