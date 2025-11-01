import toast from 'react-hot-toast';
import React from 'react';
import { CheckCircle, Error as ErrorIcon, Warning, Info } from '@mui/icons-material';

// Notification history will be added by context provider
let addNotificationToHistory: ((type: 'success' | 'error' | 'warning' | 'info', message: string) => void) | null = null;

export const setNotificationHistoryHandler = (handler: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void) => {
  addNotificationToHistory = handler;
};

// Default notification settings
const DEFAULT_SETTINGS = {
  notifications: {
    orderAlerts: true,
    inventoryAlerts: true,
    lowStockWarnings: true,
    weatherUpdates: false,
    soundEnabled: true,
  },
};

// Get notification settings from localStorage
export const getNotificationSettings = () => {
  const settings = localStorage.getItem('cafesync_settings');
  if (!settings) return DEFAULT_SETTINGS.notifications;
  try {
    const parsed = JSON.parse(settings);
    return {
      orderAlerts: parsed.notifications?.orderAlerts !== false,
      inventoryAlerts: parsed.notifications?.inventoryAlerts !== false,
      lowStockWarnings: parsed.notifications?.lowStockWarnings !== false,
      weatherUpdates: parsed.notifications?.weatherUpdates === true,
      soundEnabled: parsed.notifications?.soundEnabled !== false,
    };
  } catch {
    return DEFAULT_SETTINGS.notifications;
  }
};

// Check if a specific notification type is enabled
export const isNotificationEnabled = (type: 'orderAlerts' | 'inventoryAlerts' | 'lowStockWarnings' | 'weatherUpdates') => {
  const settings = getNotificationSettings();
  return settings[type] === true;
};

// Play beep sound
const playBeep = (freq = 700, duration = 200) => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = freq;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
  } catch (error) {
    // Ignore
  }
};

// Check if sound is enabled
const isSoundEnabled = () => {
  const settings = getNotificationSettings();
  return settings.soundEnabled === true;
};

// Show notification with type checking
export const notify = {
  success: (message: string, sound = true, checkEnabled = true, notificationType?: 'orderAlerts' | 'inventoryAlerts' | 'lowStockWarnings' | 'weatherUpdates') => {
    // If checkEnabled is true and notificationType is provided, check if that type is enabled
    if (checkEnabled && notificationType && !isNotificationEnabled(notificationType)) {
      return; // Don't show notification if type is disabled
    }
    if (sound && isSoundEnabled()) playBeep(800, 150);
    // Add to notification history
    if (addNotificationToHistory) {
      addNotificationToHistory('success', message);
    }
    toast.success(message, {
      icon: React.createElement(CheckCircle, { sx: { color: '#4caf50' } }),
      style: {
        borderRadius: '12px',
        border: '2px solid #4caf50',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    });
  },

  error: (message: string, sound = true, checkEnabled = true, notificationType?: 'orderAlerts' | 'inventoryAlerts' | 'lowStockWarnings' | 'weatherUpdates') => {
    if (checkEnabled && notificationType && !isNotificationEnabled(notificationType)) {
      return;
    }
    if (sound && isSoundEnabled()) playBeep(400, 300);
    // Add to notification history
    if (addNotificationToHistory) {
      addNotificationToHistory('error', message);
    }
    toast.error(message, {
      icon: React.createElement(ErrorIcon, { sx: { color: '#f44336' } }),
      style: {
        borderRadius: '12px',
        border: '2px solid #f44336',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    });
  },

  warning: (message: string, sound = true, checkEnabled = true, notificationType?: 'orderAlerts' | 'inventoryAlerts' | 'lowStockWarnings' | 'weatherUpdates') => {
    if (checkEnabled && notificationType && !isNotificationEnabled(notificationType)) {
      return;
    }
    if (sound && isSoundEnabled()) playBeep(600, 200);
    // Add to notification history
    if (addNotificationToHistory) {
      addNotificationToHistory('warning', message);
    }
    toast(message, {
      icon: React.createElement(Warning, { sx: { color: '#ff9800' } }),
      style: {
        borderRadius: '12px',
        border: '2px solid #ff9800',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    });
  },

  info: (message: string, sound = true, checkEnabled = true, notificationType?: 'orderAlerts' | 'inventoryAlerts' | 'lowStockWarnings' | 'weatherUpdates') => {
    if (checkEnabled && notificationType && !isNotificationEnabled(notificationType)) {
      return;
    }
    if (sound && isSoundEnabled()) playBeep(500, 100);
    // Add to notification history
    if (addNotificationToHistory) {
      addNotificationToHistory('info', message);
    }
    toast(message, {
      icon: React.createElement(Info, { sx: { color: '#2196f3' } }),
      style: {
        borderRadius: '12px',
        border: '2px solid #2196f3',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
    });
  },
};
