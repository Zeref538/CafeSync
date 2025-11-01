// API Configuration for environment-based endpoints
const getApiBaseUrl = (): string => {
  // Check if we're in production environment
  if (process.env.NODE_ENV === 'production') {
    // In production, use Firebase Functions
    return 'https://api-rr3ogyefda-uc.a.run.app';
  }
  
  // Development environment - use localhost
  return process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';
};

export const API_BASE = getApiBaseUrl();

export const API_ENDPOINTS = {
  // Orders
  ORDERS: `${API_BASE}/api/orders`,
  ORDER_STATUS: (orderId: string) => `${API_BASE}/api/orders/${orderId}/status`,
  ORDERS_BY_STATUS: (statuses: string) => `${API_BASE}/api/orders?status=${statuses}`,
  
  // Analytics
  ANALYTICS_DASHBOARD: `${API_BASE}/api/analytics/dashboard`,
  ANALYTICS_SALES: (period: string) => `${API_BASE}/api/analytics/sales?period=${period}`,
  ANALYTICS_STAFF: `${API_BASE}/api/analytics/staff`,
  ANALYTICS_RECOMMENDATIONS: (period: string) => `${API_BASE}/api/analytics/recommendations?period=${period}`,
  
  // Inventory
  INVENTORY: `${API_BASE}/api/inventory`,
  INVENTORY_ALERTS: `${API_BASE}/api/inventory/alerts/low-stock`,
  
  // Menu
  MENU: `${API_BASE}/api/menu`,
  
  // Add-ons
  ADDONS: `${API_BASE}/api/addons`,
  
  // Discounts
  DISCOUNTS: `${API_BASE}/api/discounts`,
  
  // Weather (AI Services)
  WEATHER: process.env.NODE_ENV === 'production' 
    ? `${API_BASE}/weather/cafe` 
    : 'http://localhost:8000/weather/cafe',
  
  // Notifications
  NOTIFICATIONS: `${API_BASE}/api/notifications`,
  MARK_NOTIFICATION_READ: (id: string) => `${API_BASE}/api/notifications/${id}`,
  MARK_ALL_READ: `${API_BASE}/api/notifications/mark-all-read`,
};

export default API_BASE;

