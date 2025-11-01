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
  Chip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Save,
  Cancel,
  LocalOffer,
} from '@mui/icons-material';
import { API_ENDPOINTS } from '../../config/api';

interface Discount {
  id: string;
  code: string;
  percentage: number;
  description: string;
}

const DiscountManagement: React.FC = () => {
  const theme = useTheme();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [formData, setFormData] = useState({ code: '', percentage: 0, description: '' });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Discount | null>(null);
  const [loading, setLoading] = useState(false);

  // Load discounts from API
  const loadDiscounts = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.DISCOUNTS);
      if (response.ok) {
        const data = await response.json();
        setDiscounts(data.data || []);
      }
    } catch (error) {
      console.error('Error loading discounts:', error);
      setError('Failed to load discount codes');
    }
  };

  useEffect(() => {
    loadDiscounts();
  }, []);

  const handleOpenDialog = (discount?: Discount) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        code: discount.code,
        percentage: discount.percentage,
        description: discount.description,
      });
    } else {
      setEditingDiscount(null);
      setFormData({ code: '', percentage: 0, description: '' });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDiscount(null);
    setFormData({ code: '', percentage: 0, description: '' });
    setError(null);
  };

  const handleSave = async () => {
    if (!formData.code || formData.percentage <= 0 || formData.percentage > 100) {
      setError('Please fill in all fields correctly (percentage must be between 1-100)');
      return;
    }

    try {
      const url = API_ENDPOINTS.DISCOUNTS;
      
      if (editingDiscount) {
        // Update existing
        const response = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingDiscount.id,
            code: formData.code.toUpperCase(),
            percentage: formData.percentage,
            description: formData.description,
          }),
        });

        if (response.ok) {
          setSuccess('Discount code updated successfully!');
          loadDiscounts();
          handleCloseDialog();
        } else {
          setError('Failed to update discount code');
        }
      } else {
        // Create new
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: formData.code.toUpperCase(),
            percentage: formData.percentage,
            description: formData.description,
          }),
        });

        if (response.ok) {
          setSuccess('Discount code created successfully!');
          loadDiscounts();
          handleCloseDialog();
        } else {
          setError('Failed to create discount code');
        }
      }
    } catch (error) {
      console.error('Error saving discount:', error);
      setError('Failed to save discount code');
    }
  };

  const handleDeleteClick = (discount: Discount) => {
    setItemToDelete(discount);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    
    try {
      setLoading(true);
      setDeleteDialogOpen(false);
      
      const response = await fetch(`${API_ENDPOINTS.DISCOUNTS}/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSuccess('Discount code deleted successfully!');
        await loadDiscounts();
      } else {
        const errorText = await response.text();
        console.error('Delete failed, response:', errorText);
        setError(`Failed to delete discount code: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting discount:', error);
      setError(`Failed to delete discount code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setItemToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>
          Discount Code Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513',
            '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#543d21' : '#6d3504' } 
          }}
        >
          Add New Discount
        </Button>
      </Box>

      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={4000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      )}

      <Grid container spacing={2}>
        {discounts.map((discount) => (
          <Grid item xs={12} sm={6} md={4} key={discount.id}>
            <Paper
              elevation={2}
              sx={{
                p: 3,
                border: `2px solid ${theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513'}`,
                borderRadius: 2,
                backgroundColor: theme.palette.mode === 'dark' ? 'rgba(212, 165, 116, 0.1)' : '#fff9f0',
                transition: 'all 0.2s ease',
                '&:hover': {
                  boxShadow: 6,
                  transform: 'translateY(-4px)',
                  borderColor: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513',
                },
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocalOffer sx={{ color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513', fontSize: 32 }} />
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.mode === 'dark' ? '#d4a574' : '#8B4513' }}>
                      {discount.code}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {discount.description}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ mb: 2 }}>
                <Chip
                  label={`${discount.percentage}% OFF`}
                  sx={{
                    bgcolor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1rem',
                  }}
                />
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={() => handleOpenDialog(discount)}
                  sx={{ color: '#2196f3', '&:hover': { bgcolor: '#e3f2fd' } }}
                >
                  <Edit />
                </IconButton>
                <IconButton
                  onClick={() => handleDeleteClick(discount)}
                  disabled={loading}
                  sx={{ color: '#f44336', '&:hover': { bgcolor: '#ffebee' } }}
                  title="Delete discount code"
                >
                  <Delete />
                </IconButton>
              </Box>
            </Paper>
          </Grid>
        ))}

        {discounts.length === 0 && (
          <Grid item xs={12}>
            <Paper sx={{ p: 4, textAlign: 'center', border: '2px dashed #ddd' }}>
              <LocalOffer sx={{ fontSize: 64, color: '#ddd', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No discount codes yet. Click "Add New Discount" to create one.
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513', color: 'white' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOffer />
            {editingDiscount ? 'Edit Discount Code' : 'Add New Discount Code'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box>
            <TextField
              label="Discount Code"
              placeholder="e.g., WELCOME10"
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              margin="normal"
              required
              helperText="Enter uppercase code (e.g., WELCOME10)"
            />
            <TextField
              label="Discount Percentage"
              type="number"
              fullWidth
              value={formData.percentage}
              onChange={(e) => setFormData({ ...formData, percentage: parseFloat(e.target.value) || 0 })}
              margin="normal"
              required
              inputProps={{ min: 1, max: 100, step: 1 }}
              helperText="Enter percentage (1-100)"
            />
            <TextField
              label="Description"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              required
              helperText="Brief description of the discount"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} startIcon={<Cancel />} color="inherit">
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={<Save />}
            sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? '#654321' : '#8B4513',
              '&:hover': { bgcolor: theme.palette.mode === 'dark' ? '#543d21' : '#6d3504' } 
            }}
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
          Delete Discount Code
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: theme.palette.text.primary }}>
            Are you sure you want to delete "{itemToDelete?.code}"? This action cannot be undone.
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
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DiscountManagement;

