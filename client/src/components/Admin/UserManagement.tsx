import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Refresh,
} from '@mui/icons-material';
import { getAllUsers, clearAllUsers, resetToDemoUsers, User } from '../../utils/userUtils';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [action, setAction] = useState<'clear' | 'reset' | null>(null);

  const loadUsers = () => {
    const allUsers = getAllUsers();
    setUsers(allUsers);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleClearUsers = () => {
    setAction('clear');
    setConfirmDialog(true);
  };

  const handleResetUsers = () => {
    setAction('reset');
    setConfirmDialog(true);
  };

  const handleConfirmAction = () => {
    if (action === 'clear') {
      clearAllUsers();
      loadUsers();
    } else if (action === 'reset') {
      resetToDemoUsers();
    }
    setConfirmDialog(false);
    setAction(null);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
      manager: 'primary',
      barista: 'success',
      cashier: 'info',
      kitchen: 'warning',
    };
    return colors[role] || 'default';
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            User Management
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadUsers}
              size="small"
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              color="warning"
              onClick={handleClearUsers}
              size="small"
            >
              Clear All
            </Button>
            <Button
              variant="outlined"
              color="info"
              onClick={handleResetUsers}
              size="small"
            >
              Reset to Demo
            </Button>
          </Box>
        </Box>

        {users.length === 0 ? (
          <Alert severity="info">
            No users found. Create a new account or reset to demo users.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Station</TableCell>
                  <TableCell>Permissions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {user.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.role}
                        color={getRoleColor(user.role)}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>
                      {user.station ? (
                        <Chip
                          label={user.station}
                          variant="outlined"
                          size="small"
                          sx={{ textTransform: 'capitalize' }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {user.permissions.map((permission) => (
                          <Chip
                            key={permission}
                            label={permission}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
          <DialogTitle>
            Confirm Action
          </DialogTitle>
          <DialogContent>
            <Typography>
              {action === 'clear' 
                ? 'Are you sure you want to clear all users? This action cannot be undone.'
                : 'Are you sure you want to reset to demo users? This will clear all current users and reload the page.'
              }
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmAction}
              color={action === 'clear' ? 'warning' : 'info'}
              variant="contained"
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
