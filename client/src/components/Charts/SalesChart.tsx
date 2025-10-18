import React from 'react';
import { Box } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const SalesChart: React.FC = () => {
  // Mock sales data - in production, this would come from the analytics API
  const data = [
    { time: '6AM', sales: 120, orders: 15 },
    { time: '8AM', sales: 280, orders: 35 },
    { time: '10AM', sales: 450, orders: 55 },
    { time: '12PM', sales: 680, orders: 85 },
    { time: '2PM', sales: 520, orders: 65 },
    { time: '4PM', sales: 380, orders: 48 },
    { time: '6PM', sales: 220, orders: 28 },
    { time: '8PM', sales: 150, orders: 19 },
  ];

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

  return (
    <Box sx={{ height: 300, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
