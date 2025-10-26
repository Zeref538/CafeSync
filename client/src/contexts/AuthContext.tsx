import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase';
import { 
  isEmployeeWhitelisted, 
  getEmployeeByEmail, 
  initializeDemoEmployees 
} from '../utils/employeeUtilsFirestore';
import { 
  isEmployeeWhitelistedLegacy, 
  getEmployeeByEmailLegacy 
} from '../utils/employeeUtils';

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
  loginWithGoogle: () => Promise<boolean>;
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

  // Firebase Auth handles user management - no localStorage needed for passwords

  // Fallback function to check employee whitelist (Firestore first, then localStorage)
  const checkEmployeeWhitelist = async (email: string): Promise<boolean> => {
    try {
      // Try Firestore first
      const isWhitelisted = await isEmployeeWhitelisted(email);
      console.log('🔍 Firestore whitelist check for', email, ':', isWhitelisted);
      return isWhitelisted;
    } catch (error) {
      console.warn('⚠️ Firestore whitelist check failed, trying localStorage:', error);
      try {
        // Fallback to localStorage
        const isWhitelistedLegacy = isEmployeeWhitelistedLegacy(email);
        console.log('🔍 localStorage whitelist check for', email, ':', isWhitelistedLegacy);
        return isWhitelistedLegacy;
      } catch (legacyError) {
        console.error('❌ Both Firestore and localStorage whitelist checks failed:', legacyError);
        return false;
      }
    }
  };

  // Fallback function to get employee data (Firestore first, then localStorage)
  const getEmployeeData = async (email: string): Promise<any> => {
    try {
      // Try Firestore first
      const employeeData = await getEmployeeByEmail(email);
      console.log('🔍 Firestore employee data for', email, ':', employeeData);
      return employeeData;
    } catch (error) {
      console.warn('⚠️ Firestore employee data fetch failed, trying localStorage:', error);
      try {
        // Fallback to localStorage
        const employeeDataLegacy = getEmployeeByEmailLegacy(email);
        console.log('🔍 localStorage employee data for', email, ':', employeeDataLegacy);
        return employeeDataLegacy;
      } catch (legacyError) {
        console.error('❌ Both Firestore and localStorage employee data fetches failed:', legacyError);
        return null;
      }
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    // Initialize essential employees in Firestore
    initializeDemoEmployees();
    
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      try {
        if (firebaseUser && firebaseUser.email) {
          // Check if user is whitelisted employee (with fallback)
          const isWhitelisted = await checkEmployeeWhitelist(firebaseUser.email);
          if (!isWhitelisted) {
            toast.error('Access denied. You are not an authorized employee.');
            await signOut(auth);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // Get employee data (with fallback)
          const employeeData = await getEmployeeData(firebaseUser.email);
          if (employeeData) {
            const userData: User = {
              id: firebaseUser.uid,
              name: employeeData.name || firebaseUser.displayName || 'Employee',
              email: firebaseUser.email,
              role: employeeData.role,
              station: employeeData.station,
              permissions: employeeData.permissions,
            };
            
            setUser(userData);
            localStorage.setItem('cafesync_user', JSON.stringify(userData));
          }
        } else {
          // No Firebase user, check for legacy session
          const token = localStorage.getItem('cafesync_token');
          if (token) {
            const userData = JSON.parse(localStorage.getItem('cafesync_user') || 'null');
            if (userData) {
              setUser(userData);
            }
          } else {
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Check if user is whitelisted employee first (with fallback)
      const isWhitelisted = await checkEmployeeWhitelist(email);
      if (!isWhitelisted) {
        toast.error('Access denied. You are not an authorized employee. Please contact your manager.');
        return false;
      }
      
      // Use Firebase Auth for email/password authentication
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      if (!firebaseUser || !firebaseUser.email) {
        toast.error('Login failed. Please try again.');
        return false;
      }
      
      // Get employee data (with fallback)
      const employeeData = await getEmployeeData(firebaseUser.email);
      if (!employeeData) {
        toast.error('Employee record not found.');
        await signOut(auth);
        return false;
      }
      
      const userData: User = {
        id: firebaseUser.uid,
        name: employeeData.name || firebaseUser.displayName || 'Employee',
        email: firebaseUser.email,
        role: employeeData.role,
        station: employeeData.station,
        permissions: employeeData.permissions,
      };
      
      setUser(userData);
      localStorage.setItem('cafesync_user', JSON.stringify(userData));
      
      toast.success(`Welcome back, ${userData.name}!`);
      
      // Redirect based on role/station
      if (userData.station) {
        navigate(`/station/${userData.station}`);
      } else {
        navigate('/dashboard');
      }
      
      return true;
    } catch (error: any) {
      console.error('Login failed:', error);
      
      if (error.code === 'auth/user-not-found') {
        toast.error('No account found with this email address.');
      } else if (error.code === 'auth/wrong-password') {
        toast.error('Incorrect password. Please try again.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address.');
      } else if (error.code === 'auth/too-many-requests') {
        toast.error('Too many failed attempts. Please try again later.');
      } else {
        toast.error('Login failed. Please try again.');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Check if user is whitelisted employee first (with fallback)
      const isWhitelisted = await checkEmployeeWhitelist(data.email);
      if (!isWhitelisted) {
        toast.error('Access denied. You are not an authorized employee. Please contact your manager.');
        return false;
      }
      
      // Use Firebase Auth to create account
      const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const firebaseUser = result.user;
      
      if (!firebaseUser || !firebaseUser.email) {
        toast.error('Account creation failed. Please try again.');
        return false;
      }
      
      // Get employee data (with fallback)
      const employeeData = await getEmployeeData(firebaseUser.email);
      if (!employeeData) {
        toast.error('Employee record not found.');
        await signOut(auth);
        return false;
      }
      
      const userData: User = {
        id: firebaseUser.uid,
        name: employeeData.name || data.name || 'Employee',
        email: firebaseUser.email,
        role: employeeData.role,
        station: employeeData.station,
        permissions: employeeData.permissions,
      };
      
      setUser(userData);
      localStorage.setItem('cafesync_user', JSON.stringify(userData));
      
      toast.success(`Welcome to CafeSync, ${userData.name}!`);
      
      // Redirect based on role/station
      if (userData.station) {
        navigate(`/station/${userData.station}`);
      } else {
        navigate('/dashboard');
      }
      
      return true;
    } catch (error: any) {
      console.error('Signup failed:', error);
      
      if (error.code === 'auth/email-already-in-use') {
        toast.error('An account with this email already exists.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters.');
      } else {
        toast.error('Registration failed. Please try again.');
      }
      
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

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
    setUser(null);
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

  // Google Sign-in
  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Create Google provider
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: 'select_account',
      });
      
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      if (!firebaseUser || !firebaseUser.email) {
        toast.error('Google sign-in failed. Please try again.');
        return false;
      }
      
      // Check if user is whitelisted employee (with fallback)
      const isWhitelisted = await checkEmployeeWhitelist(firebaseUser.email);
      if (!isWhitelisted) {
        toast.error('Access denied. You are not an authorized employee. Please contact your manager.');
        await signOut(auth);
        return false;
      }
      
      // Get employee data (with fallback)
      const employeeData = await getEmployeeData(firebaseUser.email);
      if (!employeeData) {
        toast.error('Employee record not found.');
        await signOut(auth);
        return false;
      }
      
      const userData: User = {
        id: firebaseUser.uid,
        name: employeeData.name || firebaseUser.displayName || 'Employee',
        email: firebaseUser.email,
        role: employeeData.role,
        station: employeeData.station,
        permissions: employeeData.permissions,
      };
      
      setUser(userData);
      localStorage.setItem('cafesync_user', JSON.stringify(userData));
      
      toast.success(`Welcome back, ${userData.name}!`);
      
      // Redirect based on role/station
      if (userData.station) {
        navigate(`/station/${userData.station}`);
      } else {
        navigate('/dashboard');
      }
      
      return true;
    } catch (error: any) {
      console.error('Google sign-in failed:', error);
      
      if (error.code === 'auth/popup-closed-by-user') {
        toast.error('Sign-in cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        toast.error('Pop-up blocked. Please allow pop-ups for this site.');
      } else {
        toast.error('Google sign-in failed. Please try again.');
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };


  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    loginWithGoogle,
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
