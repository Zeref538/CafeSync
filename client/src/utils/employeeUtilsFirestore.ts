// Firestore-based employee management
// This replaces localStorage-based employee management for cross-device compatibility

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  query,
  where,
  onSnapshot 
} from 'firebase/firestore';
import { firestore } from '../firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '../firebase';

export interface EmployeeRecord {
  email: string;
  name: string;
  role: 'manager' | 'barista' | 'cashier' | 'kitchen';
  station?: string;
  permissions: string[];
  invitedBy: string;
  invitedAt: string;
  status: 'active' | 'pending' | 'suspended';
}

const EMPLOYEES_COLLECTION = 'employees';

// Get all employees from Firestore
export const getAllEmployees = async (): Promise<Record<string, EmployeeRecord>> => {
  try {
    const employeesRef = collection(firestore, EMPLOYEES_COLLECTION);
    const snapshot = await getDocs(employeesRef);
    
    const employees: Record<string, EmployeeRecord> = {};
    snapshot.forEach((doc) => {
      const data = doc.data() as EmployeeRecord;
      employees[data.email.toLowerCase()] = data;
    });
    
    return employees;
  } catch (error) {
    console.error('Error loading employees from Firestore:', error);
    return {};
  }
};

// Check if an email is whitelisted (async version)
export const isEmployeeWhitelisted = async (email: string): Promise<boolean> => {
  try {
    const employees = await getAllEmployees();
    const employee = employees[email.toLowerCase()];
    return employee && employee.status === 'active';
  } catch (error) {
    console.error('Error checking employee whitelist:', error);
    return false;
  }
};

// Get employee record by email (async version)
export const getEmployeeByEmail = async (email: string): Promise<EmployeeRecord | null> => {
  try {
    const employees = await getAllEmployees();
    return employees[email.toLowerCase()] || null;
  } catch (error) {
    console.error('Error getting employee by email:', error);
    return null;
  }
};

// Add a new employee to Firestore
export const addEmployee = async (
  email: string,
  name: string,
  role: 'manager' | 'barista' | 'cashier' | 'kitchen',
  invitedBy: string
): Promise<boolean> => {
  try {
    const employeesRef = collection(firestore, EMPLOYEES_COLLECTION);
    const employeeDoc = doc(employeesRef, email.toLowerCase());
    
    // Check if employee already exists
    const existingDoc = await getDoc(employeeDoc);
    if (existingDoc.exists()) {
      throw new Error('Employee already exists');
    }
    
    const station = getStationForRole(role);
    const permissions = getPermissionsForRole(role);
    
    const newEmployee: EmployeeRecord = {
      email: email.toLowerCase(),
      name,
      role,
      station,
      permissions,
      invitedBy,
      invitedAt: new Date().toISOString(),
      status: 'active',
    };
    
    await setDoc(employeeDoc, newEmployee);
    console.log('Employee added to Firestore:', email);
    return true;
  } catch (error) {
    console.error('Error adding employee to Firestore:', error);
    return false;
  }
};

// Remove an employee from Firestore
export const removeEmployee = async (email: string): Promise<boolean> => {
  try {
    const employeesRef = collection(firestore, EMPLOYEES_COLLECTION);
    const employeeDoc = doc(employeesRef, email.toLowerCase());
    
    await deleteDoc(employeeDoc);
    console.log('Employee removed from Firestore:', email);
    return true;
  } catch (error) {
    console.error('Error removing employee from Firestore:', error);
    return false;
  }
};

// Update employee status in Firestore
export const updateEmployeeStatus = async (
  email: string,
  status: 'active' | 'pending' | 'suspended'
): Promise<boolean> => {
  try {
    const employeesRef = collection(firestore, EMPLOYEES_COLLECTION);
    const employeeDoc = doc(employeesRef, email.toLowerCase());
    
    await updateDoc(employeeDoc, { status });
    console.log('Employee status updated in Firestore:', email, status);
    return true;
  } catch (error) {
    console.error('Error updating employee status in Firestore:', error);
    return false;
  }
};

// Initialize with essential accounts in Firestore
export const initializeDemoEmployees = async (): Promise<void> => {
  try {
    console.log('🔧 Initializing essential employees in Firestore...');
    
    // Add your Google accounts AND demo accounts
    const essentialEmployees: Record<string, EmployeeRecord> = {
      // Your Google accounts
      'martinezjandrei8425@gmail.com': {
        email: 'martinezjandrei8425@gmail.com',
        name: 'John Andrei Martinez',
        role: 'manager',
        station: 'management',
        permissions: ['all'],
        invitedBy: 'system',
        invitedAt: new Date().toISOString(),
        status: 'active',
      },
      'johnandreimartinez842@gmail.com': {
        email: 'johnandreimartinez842@gmail.com',
        name: 'John Andrei Martinez',
        role: 'manager',
        station: 'management',
        permissions: ['all'],
        invitedBy: 'system',
        invitedAt: new Date().toISOString(),
        status: 'active',
      },
      // Demo accounts for testing
      'manager@cafesync.com': {
        email: 'manager@cafesync.com',
        name: 'Demo Manager',
        role: 'manager',
        station: 'management',
        permissions: ['all'],
        invitedBy: 'system',
        invitedAt: new Date().toISOString(),
        status: 'active',
      },
      'barista@cafesync.com': {
        email: 'barista@cafesync.com',
        name: 'Demo Barista',
        role: 'barista',
        station: 'front-counter',
        permissions: ['orders', 'inventory', 'loyalty'],
        invitedBy: 'system',
        invitedAt: new Date().toISOString(),
        status: 'active',
      },
      'kitchen@cafesync.com': {
        email: 'kitchen@cafesync.com',
        name: 'Demo Kitchen Staff',
        role: 'kitchen',
        station: 'kitchen',
        permissions: ['orders', 'inventory'],
        invitedBy: 'system',
        invitedAt: new Date().toISOString(),
        status: 'active',
      },
    };
    
    // Add each essential employee to Firestore
    for (const [email, employeeData] of Object.entries(essentialEmployees)) {
      try {
        const employeesRef = collection(firestore, EMPLOYEES_COLLECTION);
        const employeeDoc = doc(employeesRef, email.toLowerCase());
        
        // Check if already exists
        const existingDoc = await getDoc(employeeDoc);
        if (!existingDoc.exists()) {
          await setDoc(employeeDoc, employeeData);
          console.log('✅ Essential employee added to Firestore:', email);
          
          // Create Firebase account for demo users
          if (email.includes('@cafesync.com')) {
            try {
              console.log('🔧 Creating Firebase account for demo user:', email);
              await createUserWithEmailAndPassword(auth, email, 'password');
              console.log('✅ Firebase account created for:', email);
              await signOut(auth); // Sign out the newly created user
            } catch (firebaseError: any) {
              if (firebaseError.code === 'auth/email-already-in-use') {
                console.log('ℹ️ Firebase account already exists for:', email);
              } else {
                console.error('❌ Error creating Firebase account for:', email, firebaseError);
              }
            }
          }
        } else {
          console.log('ℹ️ Essential employee already exists:', email);
        }
      } catch (error) {
        console.error('❌ Error adding essential employee:', email, error);
      }
    }
    
    // Verify the employees were added
    const allEmployees = await getAllEmployees();
    console.log('📋 Current employees in Firestore:', Object.keys(allEmployees));
    
    console.log('✅ Essential employees initialization complete');
  } catch (error) {
    console.error('❌ Error initializing essential employees:', error);
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

// Legacy localStorage functions for backward compatibility (deprecated)
export const getAllEmployeesLegacy = (): Record<string, EmployeeRecord> => {
  try {
    const data = localStorage.getItem('cafesync_employees');
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading employees from localStorage:', error);
    return {};
  }
};

export const isEmployeeWhitelistedLegacy = (email: string): boolean => {
  const employees = getAllEmployeesLegacy();
  const employee = employees[email.toLowerCase()];
  return employee && employee.status === 'active';
};
