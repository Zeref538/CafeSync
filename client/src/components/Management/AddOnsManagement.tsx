import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Paper,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';
import { useTheme } from '@mui/material/styles';

interface Addon {
  id: string;
  name: string;
  price: number;
}

const AddOnsManagement: React.FC = () => {
  const theme = useTheme();
  const [addons, setAddons] = useState<Addon[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [formData, setFormData] = useState({ name: '', price: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Addon | null>(null);
  const [loading, setLoading] = useState(false);

  // Load add-ons from API
  const loadAddons = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.ADDONS);
      if (response.ok) {
        const data = await response.json();
        setAddons(data.data || []);
      }
    } catch (error) {
      console.error('Error loading add-ons:', error);
      setError('Failed to load add-ons');
    }
  };

  useEffect(() => {
    loadAddons();
  }, []);

  const handleOpenDialog = (addon?: Addon) => {
    if (addon) {
      setEditingAddon(addon);
      setFormData({ name: addon.name, price: addon.price });
    } else {
      setEditingAddon(null);
      setFormData({ name: '', price: 0 });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingAddon(null);
    setFormData({ name: '', price: 0 });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.name || formData.price <= 0) {
      setError('Please fill in all fields correctly');
      return;
    }

    try {
      const url = API_ENDPOINTS.ADDONS;
      
      if (editingAddon) {
        // Update existing
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingAddon.id,
            name: formData.name,
            price: formData.price,
          }),
        });

        if (response.ok) {
          setSuccess('Add-on updated successfully');
          loadAddons();
          handleCloseDialog();
        } else {
          setError('Failed to update add-on');
        }
      } else {
        // Create new
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          setSuccess('Add-on created successfully');
          loadAddons();
          handleCloseDialog();
        } else {
          setError('Failed to create add-on');
        }
      }
    } catch (error) {
      console.error('Error saving add-on:', error);
      setError('Failed to save add-on');
    }
  };

  const handleDeleteClick = (addon: Addon) => {
    setItemToDelete(addon);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      setDeleteDialogOpen(false);
      
      const response = await fetch(`${API_ENDPOINTS.ADDONS}/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Add-on deleted successfully');
        await loadAddons();
      } else {
        const errorText = await response.text();
        console.error('Delete failed, response:', errorText);
        setError(`Failed to delete add-on: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting add-on:', error);
      setError(`Failed to delete add-on: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const getTotalValue = () => {
    return addons.reduce((total, addon) => total + addon.price, 0);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Add-Ons Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#8B4513' }}
        >
          Add New Add-On
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {addons.map((addon) => (
          <Grid item xs={12} sm={6} md={4} key={addon.id}>
            <Paper
              sx={{
                p: 2,
                border: '1px solid #ddd',
                borderRadius: 2,
                '&:hover': {
                  boxShadow: 3,
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {addon.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    ₱{addon.price}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(addon)}
                    sx={{ color: '#2196f3' }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteClick(addon)}
                    disabled={loading}
                    sx={{ color: '#f44336' }}
                    title="Delete add-on"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}

        {addons.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                No add-ons yet. Click "Add New Add-On" to create one.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingAddon ? 'Edit Add-On' : 'Add New Add-On'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              label="Add-on Name"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              label="Price (₱)"
              type="number"
              fullWidth
              value={formData.price || ''}
              onChange={(e) => {
                const value = e.target.value === '' ? 0 : parseFloat(e.target.value) || 0;
                setFormData({ ...formData, price: value });
              }}
              margin="normal"
              required
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<Cancel />}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={<Save />}
            sx={{ bgcolor: '#8B4513' }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={handleDeleteCancel}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: theme.palette.background.paper,
          }
        }}
      >
        <DialogTitle sx={{ color: theme.palette.text.primary }}>
          Delete Add-On
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: theme.palette.text.primary }}>
            Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel}
            disabled={loading}
            sx={{ color: theme.palette.text.secondary }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            disabled={loading}
            sx={{ 
              bgcolor: '#f44336',
              '&:hover': {
                bgcolor: '#d32f2f',
              }
            }}
            startIcon={loading ? <CircularProgress size={16} /> : <Delete />}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!success}
        autoHideDuration={3000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Box>
  );
};

export default AddOnsManagement;

