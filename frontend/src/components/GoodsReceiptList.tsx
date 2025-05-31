import React, { useEffect, useState, useCallback } from 'react';
import {
    Box, Table, TableHead, TableRow, TableCell, TableBody, Button,
    CircularProgress, Typography, FormControl, Select, MenuItem as MuiMenuItem, // Renamed to avoid conflict if you have a local MenuItem
    Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api'; // Import your apiInstance

interface GoodsReceipt {
    id: number;
    purchase_order_id: number;
    store_name: string;
    received_at: string;
    // Add any other fields you expect from the API
}

interface Store {
    id: string | number;
    name: string;
}

const GoodsReceiptList: React.FC = () => {
    const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
    const [isLoading, setIsLoading] = useState(true); // For main data loading
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string | number | null>(null);
    const [initialStoreLoading, setInitialStoreLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    const { setMenuProps } = useSecondaryMenu();
    const { user, isLoading: authLoading } = useAuth();

    // Fetch stores
    useEffect(() => {
        if (authLoading || !user) {
            setInitialStoreLoading(true);
            return;
        }
        setInitialStoreLoading(true);
        setError(null);

        if (user.role_name === 'global_admin') {
            apiInstance.get('/stores') // Use apiInstance
                .then(res => {
                    const fetchedStores = res.data?.data || res.data || [];
                    setStores(fetchedStores);
                    if (fetchedStores.length > 0 && fetchedStores[0]?.id) {
                        setSelectedStoreId(fetchedStores[0].id);
                    } else {
                        setSelectedStoreId(null);
                        setReceipts([]); // No store, no receipts to show initially
                        if (fetchedStores.length === 0) setError("No stores available for selection.");
                    }
                })
                .catch(err => {
                    setError(err.response?.data?.message || 'Failed to fetch stores.');
                    setStores([]);
                    setSelectedStoreId(null);
                    setReceipts([]);
                })
                .finally(() => setInitialStoreLoading(false));
        } else {
            if (user.store_id) {
                apiInstance.get(`/stores/${user.store_id}`) // Use apiInstance
                    .then(res => {
                        const store = res.data?.data || res.data;
                        if (store && store.id) {
                            setStores([store]);
                            setSelectedStoreId(store.id);
                        } else {
                            setStores([]);
                            setSelectedStoreId(null);
                            setError("Assigned store not found.");
                        }
                    })
                    .catch(err => {
                        setError(err.response?.data?.message || 'Failed to fetch assigned store.');
                        setStores([]);
                        setSelectedStoreId(null);
                    });
            } else {
                setError('You do not have an assigned store. Cannot fetch goods receipts.');
                setSelectedStoreId(null);
                setReceipts([]);
            }
            setInitialStoreLoading(false);
        }
    }, [user, authLoading]);

    // Fetch goods receipts for selected store
    const fetchGoodsReceipts = useCallback(async (storeId: string | number | null) => {
        if (!storeId) {
            setReceipts([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        console.log(`Fetching goods receipts for store_id: ${storeId}`); // <-- Add this log
        try {
            const response = await apiInstance.get('/goods-receipts', {
                params: { store_id: storeId } // This sends ?store_id=VALUE
            });
            const fetchedReceipts = response.data?.data || response.data || [];
            console.log('Fetched receipts:', fetchedReceipts); // <-- Add this log
            setReceipts(Array.isArray(fetchedReceipts) ? fetchedReceipts : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Failed to fetch goods receipts.");
            setReceipts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        console.log(`Effect triggered: selectedStoreId is ${selectedStoreId}, initialStoreLoading is ${initialStoreLoading}`); // <-- Add this log
        if (!initialStoreLoading && selectedStoreId) {
            fetchGoodsReceipts(selectedStoreId);
        } else if (!initialStoreLoading && !selectedStoreId && user?.role_name === 'global_admin' && stores.length > 0) {
            setReceipts([]); // Clear receipts if no store is selected by global admin
            setIsLoading(false);
        } else if (!initialStoreLoading && !selectedStoreId && user?.role_name !== 'global_admin' && !user?.store_id) {
            setIsLoading(false);
            setReceipts([]);
        } else if (!initialStoreLoading && stores.length === 0 && user?.role_name === 'global_admin') {
            setIsLoading(false);
            setReceipts([]);
        }
    }, [selectedStoreId, initialStoreLoading, fetchGoodsReceipts, user, stores]);


    // Setup Secondary Menu
    useEffect(() => {
        let storeSelectorComponent = null;
        if (user && user.role_name === 'global_admin') {
            storeSelectorComponent = (
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250 }}>
                    <Typography sx={{ mr: 1, whiteSpace: 'nowrap' }}>Store:</Typography>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                            value={selectedStoreId || ''}
                            onChange={e => setSelectedStoreId(e.target.value as string | number)}
                            disabled={initialStoreLoading || stores.length === 0}
                            displayEmpty
                        >
                            {stores.map((store) => (
                                <MuiMenuItem key={store.id} value={store.id}>
                                    {store.name}
                                </MuiMenuItem>
                            ))}
                            {(stores.length === 0 && !initialStoreLoading) && <MuiMenuItem value="" disabled>No stores available</MuiMenuItem>}
                            {initialStoreLoading && <MuiMenuItem value="" disabled>Loading stores...</MuiMenuItem>}
                        </Select>
                    </FormControl>
                </Box>
            );
        } else if (user && user.store_id) {
            // Optionally display the assigned store name for non-global admins
            const storeName = stores.find(s => s.id === user.store_id)?.name || `Store ID: ${user.store_id}`;
            storeSelectorComponent = (
                 <TextField
                    label="Store"
                    value={storeName}
                    size="small"
                    disabled
                    variant="outlined"
                    sx={{minWidth: 200}}
                />
            );
        }

        setMenuProps({
            pageTitle: "Goods Receipts",
            breadcrumbs: [
                { label: "Dashboard", path: "/dashboard" },
                { label: "Goods Receipts" }
            ],
            showNewAction: true,
            onNewActionClick: () => navigate('/dashboard/goods-receipts/new'),
            isNewActionEnabled: !!selectedStoreId, // Enable "New" only if a store is selected
            newActionLabel: "+ New",
            storeSelectorComponent,
        });
        return () => setMenuProps({});
    }, [setMenuProps, navigate, stores, selectedStoreId, user, initialStoreLoading]);

    if (authLoading || initialStoreLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', p: 3 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading initial data...</Typography>
            </Box>
        );
    }

    if (error && receipts.length === 0) { // Show error prominently if it prevented data loading
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)', p: 3 }}>
                <Alert severity="error" sx={{ width: '100%', maxWidth: '600px', mb: 2 }}>{error}</Alert>
                <Button variant="outlined" onClick={() => window.location.reload()}>Try Again</Button>
            </Box>
        );
    }


    return (
        <Box sx={{p:2}}>
            {error && <Alert severity="warning" sx={{ mb: 2 }}>{`Warning: ${error}`}</Alert>} {/* Show non-critical errors */}
            {isLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Loading goods receipts...</Typography>
                </Box>
            )}
            {!isLoading && receipts.length === 0 && !error && ( // Check !error here
                 <Alert severity="info" sx={{ mt: 2 }}>No goods receipts found for the selected store.</Alert>
            )}
            {!isLoading && receipts.length > 0 && (
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Purchase Order ID</TableCell>
                            <TableCell>Store Name</TableCell>
                            <TableCell>Received At</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {receipts.map(r => (
                            <TableRow key={r.id}>
                                <TableCell>{r.id}</TableCell>
                                <TableCell>{r.purchase_order_id}</TableCell>
                                <TableCell>{r.store_name}</TableCell>
                                <TableCell>{new Date(r.received_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Button
                                        size="small"
                                        onClick={() => navigate(`/dashboard/goods-receipts/view/${r.id}`)}
                                    >
                                        View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </Box>
    );
};

export default GoodsReceiptList;