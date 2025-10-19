import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
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

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'manager' | 'barista' | 'cashier' | 'kitchen';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: SignupData) => Promise<boolean>;
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

  // Get users from localStorage (in a real app, this would be a database)
  const getStoredUsers = (): Record<string, User & { password: string }> => {
    try {
      const users = localStorage.getItem('cafesync_users');
      return users ? JSON.parse(users) : {};
    } catch {
      return {};
    }
  };

  const saveUsers = (users: Record<string, User & { password: string }>) => {
    localStorage.setItem('cafesync_users', JSON.stringify(users));
  };

  // Initialize demo users if none exist
  const initializeDemoUsers = useCallback(() => {
    const storedUsers = getStoredUsers();
    if (Object.keys(storedUsers).length === 0) {
      const demoUsers: Record<string, User & { password: string }> = {
        'manager@cafesync.com': {
          id: 'demo_manager_1',
          name: 'Sarah Johnson',
          email: 'manager@cafesync.com',
          role: 'manager',
          station: 'management',
          permissions: ['all'],
          password: 'password'
        },
        'barista@cafesync.com': {
          id: 'demo_barista_1',
          name: 'Mike Chen',
          email: 'barista@cafesync.com',
          role: 'barista',
          station: 'front-counter',
          permissions: ['orders', 'inventory', 'loyalty'],
          password: 'password'
        },
        'kitchen@cafesync.com': {
          id: 'demo_kitchen_1',
          name: 'Alex Rodriguez',
          email: 'kitchen@cafesync.com',
          role: 'kitchen',
          station: 'kitchen',
          permissions: ['orders', 'inventory'],
          password: 'password'
        }
      };
      saveUsers(demoUsers);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Initialize demo users if needed
        initializeDemoUsers();
        
        const token = localStorage.getItem('cafesync_token');
        if (token) {
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
  }, [initializeDemoUsers]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const storedUsers = getStoredUsers();
      const userWithPassword = storedUsers[email];
      
      // Check if user exists and password matches
      if (userWithPassword && userWithPassword.password === password) {
        const { password: _, ...userData } = userWithPassword; // Remove password from user data
        
        setUser(userData);
        localStorage.setItem('cafesync_token', `token_${Date.now()}`);
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

  const signup = async (data: SignupData): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      const storedUsers = getStoredUsers();
      
      // Check if user already exists
      if (storedUsers[data.email]) {
        toast.error('An account with this email already exists');
        return false;
      }
      
      // Generate user ID and determine permissions
      const userId = `user_${Date.now()}`;
      const permissions = getPermissionsForRole(data.role);
      const station = getStationForRole(data.role);
      
      const newUser: User & { password: string } = {
        id: userId,
        name: data.name,
        email: data.email,
        role: data.role,
        station,
        permissions,
        password: data.password, // In production, this would be hashed
      };
      
      // Save user to storage
      storedUsers[data.email] = newUser;
      saveUsers(storedUsers);
      
      // Auto-login after signup
      const { password: _, ...userData } = newUser;
      setUser(userData);
      localStorage.setItem('cafesync_token', `token_${Date.now()}`);
      localStorage.setItem('cafesync_user', JSON.stringify(userData));
      
      toast.success(`Welcome to CafeSync, ${userData.name}!`);
      
      // Redirect based on role/station
      if (userData.station) {
        navigate(`/station/${userData.station}`);
      } else {
        navigate('/dashboard');
      }
      
      return true;
    } catch (error) {
      console.error('Signup failed:', error);
      toast.error('Registration failed. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions
  const getPermissionsForRole = (role: string): string[] => {
    const permissions: Record<string, string[]> = {
      manager: ['all'],
      barista: ['orders', 'inventory', 'loyalty'],
      cashier: ['orders', 'loyalty'],
      kitchen: ['orders', 'inventory'],
    };
    return permissions[role] || [];
  };

  const getStationForRole = (role: string): string | undefined => {
    const stations: Record<string, string> = {
      manager: 'management',
      barista: 'front-counter',
      cashier: 'front-counter',
      kitchen: 'kitchen',
    };
    return stations[role];
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
    signup,
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
