import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface NotificationHistoryItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  read?: boolean;
}

interface NotificationHistoryContextType {
  notifications: NotificationHistoryItem[];
  addNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  unreadCount: number;
}

const NotificationHistoryContext = createContext<NotificationHistoryContextType | undefined>(undefined);

const STORAGE_KEY = 'cafesync_notification_history';
const MAX_NOTIFICATIONS = 100; // Keep last 100 notifications

export const NotificationHistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading notification history:', error);
    }
    return [];
  });

  // Save to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notification history:', error);
    }
  }, [notifications]);

  const addNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const newNotification: NotificationHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the last MAX_NOTIFICATIONS
      return updated.slice(0, MAX_NOTIFICATIONS);
    });
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: NotificationHistoryContextType = {
    notifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    unreadCount,
  };

  return (
    <NotificationHistoryContext.Provider value={value}>
      {children}
    </NotificationHistoryContext.Provider>
  );
};

export const useNotificationHistory = (): NotificationHistoryContextType => {
  const context = useContext(NotificationHistoryContext);
  if (!context) {
    throw new Error('useNotificationHistory must be used within NotificationHistoryProvider');
  }
  return context;
};

