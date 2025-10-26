import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinStation: (station: string) => void;
  leaveStation: (station: string) => void;
  emitOrderUpdate: (data: any) => void;
  emitInventoryUpdate: (data: any) => void;
  emitAnalyticsUpdate: (data: any) => void;
  syncOrderData: (orderId: string, station: string, action: string, data: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Only initialize socket connection in development or if server URL is provided
    const serverUrl = process.env.REACT_APP_SERVER_URL;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (!serverUrl && !isDevelopment) {
      // In production without server URL, skip socket connection
      console.log('Socket connection skipped in production');
      return;
    }

    // Initialize socket connection
    const newSocket = io(serverUrl || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      if (isDevelopment) {
        toast.success('Connected to CafeSync server');
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect' && isDevelopment) {
        toast.error('Disconnected from server');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setIsConnected(false);
      // Only show error toast in development
      if (isDevelopment) {
        toast.error('Failed to connect to server');
      }
    });

    // Global event handlers
    newSocket.on('order-update', (data) => {
      console.log('Order update received:', data);
      // Handle order updates globally
    });

    newSocket.on('inventory-update', (data) => {
      console.log('Inventory update received:', data);
      if (isDevelopment) {
        toast.success(`Inventory updated: ${data.itemName}`);
      }
    });

    newSocket.on('analytics-update', (data) => {
      console.log('Analytics update received:', data);
      // Handle analytics updates globally
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.close();
    };
  }, []);

  const joinStation = (station: string) => {
    if (socket) {
      socket.emit('join-station', station);
      console.log(`Joined station: ${station}`);
    }
  };

  const leaveStation = (station: string) => {
    if (socket) {
      socket.emit('leave-station', station);
      console.log(`Left station: ${station}`);
    }
  };

  const emitOrderUpdate = (data: any) => {
    if (socket) {
      socket.emit('order-update', data);
    }
  };

  const emitInventoryUpdate = (data: any) => {
    if (socket) {
      socket.emit('inventory-update', data);
    }
  };

  const emitAnalyticsUpdate = (data: any) => {
    if (socket) {
      socket.emit('analytics-update', data);
    }
  };

  const syncOrderData = async (orderId: string, station: string, action: string, data: any) => {
    try {
      // Call Firebase Function for data synchronization
      const response = await fetch('https://us-central1-cafesync-3b25a.cloudfunctions.net/syncOrderData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId,
          station,
          action,
          data
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Order data synced successfully:', result);
        
        // Also emit via socket for real-time updates
        if (socket) {
          socket.emit('order-sync', {
            orderId,
            station,
            action,
            data,
            timestamp: new Date().toISOString()
          });
        }
      } else {
        console.error('Failed to sync order data:', response.status);
      }
    } catch (error) {
      console.error('Error syncing order data:', error);
    }
  };

  const value: SocketContextType = {
    socket,
    isConnected,
    joinStation,
    leaveStation,
    emitOrderUpdate,
    emitInventoryUpdate,
    emitAnalyticsUpdate,
    syncOrderData,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
