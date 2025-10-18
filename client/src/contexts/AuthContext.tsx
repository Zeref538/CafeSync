import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'barista' | 'cashier' | 'kitchen';
  station?: string;
  permissions: string[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('cafesync_token');
        if (token) {
          // In a real app, validate token with server
          const userData = JSON.parse(localStorage.getItem('cafesync_user') || 'null');
          if (userData) {
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('cafesync_token');
        localStorage.removeItem('cafesync_user');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Mock authentication - in production, this would be a real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock user data based on email
      const mockUsers: Record<string, User> = {
        'manager@cafesync.com': {
          id: '1',
          name: 'Sarah Johnson',
          email: 'manager@cafesync.com',
          role: 'manager',
          station: 'management',
          permissions: ['all']
        },
        'barista@cafesync.com': {
          id: '2',
          name: 'Mike Chen',
          email: 'barista@cafesync.com',
          role: 'barista',
          station: 'front-counter',
          permissions: ['orders', 'inventory', 'loyalty']
        },
        'kitchen@cafesync.com': {
          id: '3',
          name: 'Alex Rodriguez',
          email: 'kitchen@cafesync.com',
          role: 'kitchen',
          station: 'kitchen',
          permissions: ['orders', 'inventory']
        }
      };

      const userData = mockUsers[email];
      
      if (userData && password === 'password') {
        setUser(userData);
        localStorage.setItem('cafesync_token', 'mock-token');
        localStorage.setItem('cafesync_user', JSON.stringify(userData));
        
        toast.success(`Welcome back, ${userData.name}!`);
        
        // Redirect based on role/station
        if (userData.station) {
          navigate(`/station/${userData.station}`);
        } else {
          navigate('/dashboard');
        }
        
        return true;
      } else {
        toast.error('Invalid credentials');
        return false;
      }
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Login failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cafesync_token');
    localStorage.removeItem('cafesync_user');
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('cafesync_user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
