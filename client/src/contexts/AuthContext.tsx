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
  User as FirebaseUser,
  linkWithCredential,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  updatePassword,
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
      // Normalize email to lowercase for consistent lookup
      const normalizedEmail = email.toLowerCase();
      console.log('🔍 Checking whitelist for:', normalizedEmail);
      
      // Try Firestore first
      const isWhitelisted = await isEmployeeWhitelisted(normalizedEmail);
      console.log('🔍 Firestore whitelist check for', normalizedEmail, ':', isWhitelisted);
      
      if (isWhitelisted) {
        return true;
      }
      
      // Fallback to localStorage
      console.warn('⚠️ Firestore whitelist check failed, trying localStorage');
      const isWhitelistedLegacy = isEmployeeWhitelistedLegacy(normalizedEmail);
      console.log('🔍 localStorage whitelist check for', normalizedEmail, ':', isWhitelistedLegacy);
      
      return isWhitelistedLegacy;
    } catch (error) {
      console.error('❌ Error checking employee whitelist:', error);
      // Try localStorage as last resort
      try {
        const isWhitelistedLegacy = isEmployeeWhitelistedLegacy(email.toLowerCase());
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
      // Normalize email to lowercase for consistent lookup
      const normalizedEmail = email.toLowerCase();
      console.log('🔍 Getting employee data for:', normalizedEmail);
      
      // Try Firestore first
      const employeeData = await getEmployeeByEmail(normalizedEmail);
      console.log('🔍 Firestore employee data for', normalizedEmail, ':', employeeData);
      
      if (employeeData) {
        return employeeData;
      }
      
      // Fallback to localStorage
      console.warn('⚠️ Firestore employee not found, trying localStorage');
      const employeeDataLegacy = getEmployeeByEmailLegacy(normalizedEmail);
      console.log('🔍 localStorage employee data for', normalizedEmail, ':', employeeDataLegacy);
      
      if (employeeDataLegacy) {
        return employeeDataLegacy;
      }
      
      console.error('❌ Employee not found in Firestore or localStorage:', normalizedEmail);
      return null;
    } catch (error) {
      console.error('❌ Error getting employee data:', error);
      // Try localStorage as last resort
      try {
        const employeeDataLegacy = getEmployeeByEmailLegacy(email.toLowerCase());
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
          console.log('🔍 Auth state changed - Firebase user found:', firebaseUser.email);
          
          // Normalize email to lowercase
          const normalizedEmail = firebaseUser.email.toLowerCase();
          
          // Check if user is whitelisted employee (with fallback)
          console.log('🔍 Checking whitelist for auth state change:', normalizedEmail);
          const isWhitelisted = await checkEmployeeWhitelist(normalizedEmail);
          console.log('🔍 Whitelist check result:', isWhitelisted);
          
          if (!isWhitelisted) {
            console.error('❌ User not whitelisted during auth state change:', normalizedEmail);
            toast.error('Access denied. You are not an authorized employee.');
            await signOut(auth);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // Get employee data (with fallback)
          console.log('🔍 Getting employee data for auth state change:', normalizedEmail);
          const employeeData = await getEmployeeData(normalizedEmail);
          console.log('🔍 Employee data result:', employeeData);
          
          if (!employeeData) {
            console.error('❌ Employee data not found during auth state change:', normalizedEmail);
            toast.error('Employee record not found. Please contact your manager.');
            await signOut(auth);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          // Verify employee status
          if (employeeData.status !== 'active') {
            console.error('❌ Employee status is not active:', employeeData.status);
            toast.error(`Your account is ${employeeData.status}. Please contact your manager.`);
            await signOut(auth);
            setUser(null);
            setIsLoading(false);
            return;
          }
          
          const userData: User = {
            id: firebaseUser.uid,
            name: employeeData.name || firebaseUser.displayName || 'Employee',
            email: firebaseUser.email,
            role: employeeData.role,
            station: employeeData.station,
            permissions: employeeData.permissions,
          };
          
          console.log('✅ Setting user data:', userData);
          setUser(userData);
          localStorage.setItem('cafesync_user', JSON.stringify(userData));
        } else {
          console.log('🔍 No Firebase user, checking for legacy session');
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
        console.error('❌ Auth check failed:', error);
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
      
      // Get employee data first to check if they exist in Firestore
      const employeeData = await getEmployeeData(email);
      if (!employeeData) {
        toast.error('Employee record not found.');
        return false;
      }
      
      // Check if account exists and what sign-in methods are available
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        console.log('🔍 Available sign-in methods for', email, ':', signInMethods);
        
        // Try to sign in with email/password
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = result.user;
        
        if (!firebaseUser || !firebaseUser.email) {
          toast.error('Login failed. Please try again.');
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
      } catch (authError: any) {
          // If account exists but only has Google sign-in, try to link email/password
        if (authError.code === 'auth/user-not-found') {
            // Account doesn't exist at all
          toast.error('Account not found. Please use Sign Up to create your account first.');
          navigate('/signup');
          return false;
        } else if (authError.code === 'auth/wrong-password') {
            // Check if account only has Google sign-in
            if (signInMethods.includes('google.com') && !signInMethods.includes('password')) {
              toast.error(
                'This account was created with Google sign-in. Please sign in with Google first, then you can set a password in your account settings.',
                { duration: 6000 }
              );
              return false;
            } else {
          toast.error('Incorrect password. Please try again.');
          return false;
            }
        } else if (authError.code === 'auth/invalid-email') {
          toast.error('Invalid email address.');
          return false;
        } else if (authError.code === 'auth/too-many-requests') {
          toast.error('Too many failed attempts. Please try again later.');
          return false;
          } else if (authError.code === 'auth/operation-not-allowed') {
            toast.error('Email/password authentication is not enabled for this account. Please sign in with Google.');
            return false;
          } else {
            throw authError;
          }
        }
      } catch (checkError: any) {
        // If fetchSignInMethodsForEmail fails, try regular sign-in anyway
        console.error('Error checking sign-in methods:', checkError);
        try {
          const result = await signInWithEmailAndPassword(auth, email, password);
          const firebaseUser = result.user;
          
          if (!firebaseUser || !firebaseUser.email) {
            toast.error('Login failed. Please try again.');
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
        } catch (authError: any) {
          if (authError.code === 'auth/user-not-found') {
            toast.error('Account not found. Please use Sign Up to create your account first.');
            navigate('/signup');
            return false;
          } else if (authError.code === 'auth/wrong-password') {
            toast.error('Incorrect password. Please try again.');
            return false;
        } else {
          throw authError;
          }
        }
      }
    } catch (error: any) {
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
      // Check if user is whitelisted employee first (with fallback)
      const isWhitelisted = await checkEmployeeWhitelist(data.email);
      if (!isWhitelisted) {
        toast.error('Access denied. You are not an authorized employee. Please contact your manager.');
        return false;
      }
      
      // Get employee data from Firestore first
      const employeeData = await getEmployeeData(data.email);
      if (!employeeData) {
        toast.error('Employee record not found in system. Please contact your manager.');
        return false;
      }
      
      // Use Firebase Auth to create account (or sign in if already exists)
      let firebaseUser;
      try {
        const result = await createUserWithEmailAndPassword(auth, data.email, data.password);
        firebaseUser = result.user;
        console.log('Firebase Auth account created successfully');
      } catch (authError: any) {
        // If account already exists, try to sign in instead
        if (authError.code === 'auth/email-already-in-use') {
          toast.success('Account already exists. Signing you in...');
          try {
            const signInResult = await signInWithEmailAndPassword(auth, data.email, data.password);
            firebaseUser = signInResult.user;
            console.log('Signed in with existing Firebase Auth account');
          } catch (signInError: any) {
            if (signInError.code === 'auth/wrong-password') {
              toast.error('An account already exists with this email. Please use the correct password or contact your manager.');
            } else {
              toast.error('Account exists but sign in failed. Please try again.');
            }
            return false;
          }
        } else {
          throw authError;
        }
      }
      
      if (!firebaseUser || !firebaseUser.email) {
        toast.error('Account creation failed. Please try again.');
        return false;
      }
      
      const userData: User = {
        id: firebaseUser.uid,
        name: employeeData.name || data.name || firebaseUser.displayName || 'Employee',
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
      
      if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password should be at least 6 characters.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/password authentication is not enabled. Please contact the administrator.');
      } else {
        toast.error('Signup failed. Please try again.');
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
      
      console.log('🔍 Google sign-in successful for:', firebaseUser.email);
      console.log('🔍 Firebase Auth UID:', firebaseUser.uid);
      
      // Normalize email to lowercase for consistent lookup
      const normalizedEmail = firebaseUser.email.toLowerCase();
      
      // Check if user is whitelisted employee (with fallback)
      console.log('🔍 Checking whitelist for:', normalizedEmail);
      const isWhitelisted = await checkEmployeeWhitelist(normalizedEmail);
      console.log('🔍 Whitelist check result:', isWhitelisted);
      
      if (!isWhitelisted) {
        console.error('❌ User not whitelisted:', normalizedEmail);
        toast.error('Access denied. You are not an authorized employee. Please contact your manager.');
        await signOut(auth);
        return false;
      }
      
      // Get employee data (with fallback)
      console.log('🔍 Getting employee data for:', normalizedEmail);
      const employeeData = await getEmployeeData(normalizedEmail);
      console.log('🔍 Employee data result:', employeeData);
      
      if (!employeeData) {
        console.error('❌ Employee data not found for:', normalizedEmail);
        toast.error('Employee record not found. Please contact your manager.');
        await signOut(auth);
        return false;
      }
      
      // Verify employee status
      if (employeeData.status !== 'active') {
        console.error('❌ Employee status is not active:', employeeData.status);
        toast.error(`Your account is ${employeeData.status}. Please contact your manager.`);
        await signOut(auth);
        return false;
      }
      
      // Check if email/password auth is already linked, if not, try to link it
      // This allows users to sign in with email/password if manager created account with password
      const signInMethods = await fetchSignInMethodsForEmail(auth, normalizedEmail);
      console.log('🔍 Sign-in methods after Google sign-in:', signInMethods);
      
      // If email/password is not linked but account exists, we'll handle it in the login function
      // For now, just proceed with normal Google sign-in
      
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
