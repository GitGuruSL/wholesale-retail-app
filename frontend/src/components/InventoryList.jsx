import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // <--- ADD THIS LINE
import { Paper, Typography, Table, TableHead, TableRow, TableCell, TableBody, Alert, Box, Select, MenuItem, CircularProgress, TextField } from '@mui/material';

const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const { user, isLoading: authIsLoading } = useAuth();

  // Log what useAuth is providing
  useEffect(() => {
    console.log('[InventoryList] apiInstance (direct import):', apiInstance);
    console.log('[InventoryList] user from useAuth:', user); // IMPORTANT: Check this log in your browser
  }, [user, authIsLoading]);

  // Effect 1: Handles fetching stores for global_admin or setting the store for other users.
  useEffect(() => {
    if (authIsLoading) {
        setIsLoading(true);
        return;
    }

    if (apiInstance && user) {
      setIsLoading(true);
      setPageError('');

      if (user.role_name === 'global_admin') {
        apiInstance.get('/stores')
          .then(res => {
            const fetchedStores = res.data?.data || res.data || [];
            setStores(fetchedStores);
            if (fetchedStores.length > 0 && fetchedStores[0] && typeof fetchedStores[0].id !== 'undefined' && fetchedStores[0].id !== null) { // More robust check
              setSelectedStore(fetchedStores[0].id);
            } else {
              setSelectedStore(null);
              setInventory([]);
              setIsLoading(false);
              if (fetchedStores.length > 0) {
                  setPageError("The first store in the list has an invalid ID.");
              } else {
                  setPageError("No stores available for selection.");
              }
            }
          })
          .catch(err => {
            console.error('[InventoryList] Error fetching stores:', err);
            setPageError(err.response?.data?.message || 'Failed to fetch stores.');
            setStores([]);
            setSelectedStore(null);
            setInventory([]);
            setIsLoading(false);
          });
      } else { // For non-global admins
        if (user.store_id) { // <--- CHANGED FROM user.current_store_id
          // console.log('[InventoryList] Non-global admin: Setting store to', user.store_id);
          setSelectedStore(user.store_id); // <--- CHANGED FROM user.current_store_id
        } else {
          // console.log('[InventoryList] Non-global admin: No assigned store on user object.');
          setPageError('You do not have an assigned store.');
          setSelectedStore(null);
          setInventory([]);
          setIsLoading(false);
        }
      }
    } else if (!authIsLoading && !user) { // If auth is done but there's no user
        setPageError('User not authenticated.');
        setIsLoading(false);
        setInventory([]);
        setSelectedStore(null);
    }
  }, [apiInstance, user, authIsLoading]); // Dependencies

  // Effect 2: Fetches inventory when selectedStore changes and apiInstance is available.
  useEffect(() => {
    if (apiInstance && selectedStore) {
      // console.log(`Effect 2: Fetching inventory for store ${selectedStore}`);
      setIsLoading(true); // Indicate loading for inventory fetch
      setPageError('');
      apiInstance.get('/inventory', { params: { storeId: selectedStore } })
        .then(res => {
          setInventory(res.data || []);
        })
        .catch(err => {
          console.error('[InventoryList] Error fetching inventory:', err);
          setPageError(err.response?.data?.message || 'Failed to fetch inventory.');
          setInventory([]); // Clear inventory on error
        })
        .finally(() => {
          setIsLoading(false); // Stop loading after attempt
        });
    } else if (apiInstance && user && !selectedStore) {
      // This handles cases where Effect 1 determined no store could be selected
      // (e.g., global admin with no stores, or non-admin with no assigned store)
      // console.log('Effect 2: No store selected. Clearing inventory and ensuring loading is false.');
      setInventory([]);
      setIsLoading(false);
    }
  }, [apiInstance, user, selectedStore]); // Dependencies: apiInstance, user, and selectedStore

  const handleStoreChange = (event) => {
    const storeId = event.target.value;
    // console.log(`Store selected via dropdown: ${storeId}`);
    setSelectedStore(storeId); // This will trigger Effect 2 to fetch new inventory
  };

  // Initial loading state while waiting for authentication context
  if (!apiInstance || !user) {
    // console.log('[InventoryList] Still initializing, apiInstance or user is missing.'); // Add this log
    return (
      <Paper sx={{ p: 3, m: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 1 }}>Initializing...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" align="center" gutterBottom>
        Inventory Management
      </Typography>

      {/* Store Selector for Global Admin */}
      {user.role_name === 'global_admin' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Select Store:</Typography>
          <Select
            value={selectedStore || ''} // Use empty string if selectedStore is null
            onChange={handleStoreChange}
            fullWidth
            // Disable if still loading initial store list, or if no stores are available
            disabled={isLoading && stores.length === 0 || (!isLoading && stores.length === 0)}
          >
            {stores.map((store) => (
              <MenuItem key={store.id} value={store.id}>
                {store.name}
              </MenuItem>
            ))}
            {/* Show a placeholder if no stores and not loading */}
            {stores.length === 0 && !isLoading && (
                 <MenuItem value="" disabled>No stores available</MenuItem>
            )}
          </Select>
        </Box>
      )}

      {/* Display Store for Non-Global Admin */}
      {user.role_name !== 'global_admin' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1">Store:</Typography>
          <TextField
            value={user.store_name || (user.store_id ? `Store ID: ${user.store_id}`: 'N/A')} // <--- THIS LINE
            disabled
            fullWidth
          />
        </Box>
      )}

      {pageError && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>}

      {/* Inventory Table or Loading State */}
      {isLoading ? (
        <Box sx={{textAlign: 'center', p: 3}}>
            <CircularProgress />
            <Typography sx={{mt:1}}>Loading inventory...</Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Item ID</TableCell>
                <TableCell>Item Name</TableCell>
                <TableCell>Store</TableCell> {/* Assuming store_name is part of inventory item */}
                <TableCell>Quantity (Base Unit)</TableCell>
                <TableCell>Last Updated</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    {pageError ? "Error loading inventory." : "No inventory records found for this store."}
                  </TableCell>
                </TableRow>
              ) : (
                inventory.map((stockItem) => (
                  // Ensure stockItem has a unique 'id' or combine fields for a key
                  <TableRow key={stockItem.id || `${stockItem.Item_id}-${selectedStore}`}>
                    <TableCell>{stockItem.Item_id}</TableCell>
                    <TableCell>{stockItem.Item_name}</TableCell>
                    <TableCell>{stockItem.store_name || user.store_name || 'N/A'}</TableCell> {/* Display store name */}
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