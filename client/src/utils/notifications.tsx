import toast from 'react-hot-toast';
import React from 'react';
import { CheckCircle, Error as ErrorIcon, Warning, Info } from '@mui/icons-material';

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
  const settings = localStorage.getItem('cafesync_settings');
  if (!settings) return true;
  try {
    const parsed = JSON.parse(settings);
    return parsed.notifications?.soundEnabled !== false;
  } catch {
    return true;
  }
};

// Show notification
export const notify = {
  success: (message: string, sound = true) => {
    if (sound && isSoundEnabled()) playBeep(800, 150);
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

  error: (message: string, sound = true) => {
    if (sound && isSoundEnabled()) playBeep(400, 300);
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

  warning: (message: string, sound = true) => {
    if (sound && isSoundEnabled()) playBeep(600, 200);
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

  info: (message: string, sound = true) => {
    if (sound && isSoundEnabled()) playBeep(500, 100);
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
