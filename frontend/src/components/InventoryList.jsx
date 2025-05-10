import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Alert, Box, Select, MenuItem } from '@mui/material';

const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]); // List of stores for global admin
  const [selectedStore, setSelectedStore] = useState(null); // Selected store ID
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const { apiInstance, user } = useAuth();

  console.log('User Role:', user.role_name); // Debug user role

  // Fetch stores for global admin
  const fetchStores = useCallback(async () => {
    if (user.role_name === 'global_admin') {
      try {
        const res = await apiInstance.get('/stores'); // Assuming you have a /stores endpoint
        setStores(res.data || []);
        setSelectedStore(res.data[0]?.id || ''); // Default to the first store or empty string
        console.log('Stores:', res.data); // Debug stores
        console.log('Selected Store:', res.data[0]?.id); // Debug selected store
      } catch (err) {
        console.error('[InventoryList] Error fetching stores:', err);
        setPageError(err.response?.data?.message || 'Failed to fetch stores.');
      }
    } else {
      // For non-global admins, set the assigned store
      setSelectedStore(user.current_store_id);
      console.log('Assigned Store for Non-Global Admin:', user.current_store_id); // Debug assigned store
    }
  }, [apiInstance, user.role_name, user.current_store_id]);

  // Fetch inventory for the selected store
  const fetchInventory = useCallback(async () => {
    if (!selectedStore) {
      console.warn("FetchInventory: No store selected.");
      return;
    }
  
    setIsLoading(true);
    setPageError('');
    try {
      const res = await apiInstance.get('/inventory', {
        params: { storeId: selectedStore }, // Pass storeId in the request
      });
      setInventory(res.data || []);
    } catch (err) {
      console.error('[InventoryList] Error fetching inventory:', err);
      setPageError(err.response?.data?.message || 'Failed to fetch inventory.');
    } finally {
      setIsLoading(false);
    }
  }, [apiInstance, selectedStore]);

  useEffect(() => {
    if (apiInstance) {
      fetchStores();
    }
  }, [apiInstance, fetchStores]);

  useEffect(() => {
    if (selectedStore) {
      fetchInventory();
    }
  }, [selectedStore, fetchInventory]);

  const handleStoreChange = (event) => {
    const storeId = event.target.value;
    setSelectedStore(storeId);
    console.log(`Store selected: ${storeId}`); // Debugging log
  };

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Inventory Management
      </Typography>
      {user.role_name === 'global_admin' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Select Store:</Typography>
          <Select
            value={selectedStore || ''}
            onChange={handleStoreChange}
            fullWidth
            disabled={user.role_name !== 'global_admin'} // Ensure this condition is correct
          >
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
          </Select>
        </Box>
      )}
      {user.role_name !== 'global_admin' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Store:</Typography>
          <Select value={selectedStore || ''} disabled fullWidth>
            <MenuItem value={user.current_store_id}>{user.store_name}</MenuItem>
          </Select>
        </Box>
      )}
      {pageError && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}
      {isLoading ? (
        <Typography align="center">Loading inventory...</Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product ID</TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell>Store</TableCell>
                <TableCell>Quantity (Base Unit)</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No inventory records found.
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((stockItem) => (
                  <TableRow key={stockItem.id}>
                    <TableCell>{stockItem.product_id}</TableCell>
                    <TableCell>{stockItem.product_name}</TableCell>
                    <TableCell>{stockItem.store_name}</TableCell>
                    <TableCell>{stockItem.quantity}</TableCell>
                    <TableCell>{new Date(stockItem.updated_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Paper>
  );
};

export default InventoryList;