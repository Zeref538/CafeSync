// Utility functions for user management and testing

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'manager' | 'barista' | 'cashier' | 'kitchen';
  station?: string;
  permissions: string[];
}

export const getAllUsers = (): User[] => {
  try {
    const users = localStorage.getItem('cafesync_users');
    if (users) {
      const userData = JSON.parse(users);
      // Remove passwords from the returned data
      return Object.values(userData).map((user: any) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
    }
    return [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

export const getUserByEmail = (email: string): User | null => {
  try {
    const users = localStorage.getItem('cafesync_users');
    if (users) {
      const userData = JSON.parse(users);
      const user = userData[email];
      if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const clearAllUsers = (): void => {
  localStorage.removeItem('cafesync_users');
  localStorage.removeItem('cafesync_token');
  localStorage.removeItem('cafesync_user');
};

export const resetToDemoUsers = (): void => {
  clearAllUsers();
  // This will trigger the demo user initialization on next app load
  window.location.reload();
};

// Development helper - log all users to console
export const logAllUsers = (): User[] => {
  const users = getAllUsers();
  console.log('All registered users:', users);
  return users;
};
