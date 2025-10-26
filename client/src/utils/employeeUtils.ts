// Employee whitelist management
// Only whitelisted employees can sign in to CafeSync

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

const EMPLOYEES_KEY = 'cafesync_employees';

// Get all employees from storage
export const getAllEmployees = (): Record<string, EmployeeRecord> => {
  try {
    const data = localStorage.getItem(EMPLOYEES_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error loading employees:', error);
    return {};
  }
};

// Save employees to storage
export const saveEmployees = (employees: Record<string, EmployeeRecord>): void => {
  try {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  } catch (error) {
    console.error('Error saving employees:', error);
  }
};

// Check if an email is whitelisted
export const isEmployeeWhitelisted = (email: string): boolean => {
  const employees = getAllEmployees();
  const employee = employees[email.toLowerCase()];
  return employee && employee.status === 'active';
};

// Get employee record by email
export const getEmployeeByEmail = (email: string): EmployeeRecord | null => {
  const employees = getAllEmployees();
  return employees[email.toLowerCase()] || null;
};

// Add a new employee (manager only)
export const addEmployee = (
  email: string,
  name: string,
  role: 'manager' | 'barista' | 'cashier' | 'kitchen',
  invitedBy: string
): boolean => {
  try {
    const employees = getAllEmployees();
    
    // Check if employee already exists
    if (employees[email.toLowerCase()]) {
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
    
    employees[email.toLowerCase()] = newEmployee;
    saveEmployees(employees);
    return true;
  } catch (error) {
    console.error('Error adding employee:', error);
    return false;
  }
};

// Remove an employee (manager only)
export const removeEmployee = (email: string): boolean => {
  try {
    const employees = getAllEmployees();
    delete employees[email.toLowerCase()];
    saveEmployees(employees);
    return true;
  } catch (error) {
    console.error('Error removing employee:', error);
    return false;
  }
};

// Update employee status
export const updateEmployeeStatus = (
  email: string,
  status: 'active' | 'pending' | 'suspended'
): boolean => {
  try {
    const employees = getAllEmployees();
    const employee = employees[email.toLowerCase()];
    
    if (!employee) {
      return false;
    }
    
    employee.status = status;
    saveEmployees(employees);
    return true;
  } catch (error) {
    console.error('Error updating employee status:', error);
    return false;
  }
};

// Initialize with demo employees
export const initializeDemoEmployees = (): void => {
  const employees = getAllEmployees();
  
  // Always ensure demo accounts and your Google accounts exist
  const demoEmployees: Record<string, EmployeeRecord> = {
    'manager@cafesync.com': {
      email: 'manager@cafesync.com',
      name: 'Sarah Johnson',
      role: 'manager',
      station: 'management',
      permissions: ['all'],
      invitedBy: 'system',
      invitedAt: new Date().toISOString(),
      status: 'active',
    },
    'barista@cafesync.com': {
      email: 'barista@cafesync.com',
      name: 'Mike Chen',
      role: 'barista',
      station: 'front-counter',
      permissions: ['orders', 'inventory', 'loyalty'],
      invitedBy: 'manager@cafesync.com',
      invitedAt: new Date().toISOString(),
      status: 'active',
    },
    'kitchen@cafesync.com': {
      email: 'kitchen@cafesync.com',
      name: 'Alex Rodriguez',
      role: 'kitchen',
      station: 'kitchen',
      permissions: ['orders', 'inventory'],
      invitedBy: 'manager@cafesync.com',
      invitedAt: new Date().toISOString(),
      status: 'active',
    },
    // Add your Google accounts
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
  };
  
  // Merge with existing employees (don't overwrite)
  const mergedEmployees = { ...employees, ...demoEmployees };
  saveEmployees(mergedEmployees);
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

