import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Box, Paper, Typography, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, CircularProgress, Alert, Chip, Tooltip,
    TablePagination, Select, MenuItem, FormControl, InputLabel, TextField
} from '@mui/material';
import { Edit as EditIcon, DeleteOutline as DeleteIcon, Add as AddIcon, Visibility as ViewIcon } from '@mui/icons-material';
import apiInstance from '../services/api';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';

interface PurchaseOrderListItem {
    id: string | number;
    supplier_name: string;
    order_date: string;
    expected_delivery_date?: string;
    status: 'Pending' | 'Ordered' | 'Shipped' | 'Partial' | 'Received' | 'Cancelled';
    total_amount?: number;
    store_name?: string;
}

interface Store {
    id: string | number;
    name: string;
}

const PurchaseOrderList: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, userCan, isLoading: authLoading } = useAuth(); // Added user
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderListItem[]>([]);
    const [loading, setLoading] = useState<boolean>(false); // General loading for PO list
    const [pageError, setPageError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string | null, type: 'success' | 'error' | null }>({ message: null, type: null });

    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string | number | null>(null);
    const [initialStoreLoading, setInitialStoreLoading] = useState<boolean>(true);


    // Pagination state
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalRows, setTotalRows] = useState(0);

    // Effect 1: Fetch stores for global_admin or set store for other users
    useEffect(() => {
        if (authLoading || !user) {
            setInitialStoreLoading(true);
            return;
        }
        setInitialStoreLoading(true);
        setPageError(null);

        if (user.role_name === 'global_admin') {
            apiInstance.get('/stores')
                .then(res => {
                    const fetchedStores = res.data?.data || res.data || [];
                    setStores(fetchedStores);
                    if (fetchedStores.length > 0 && fetchedStores[0]?.id) {
                        setSelectedStoreId(fetchedStores[0].id);
                    } else {
                        setSelectedStoreId(null);
                        setPurchaseOrders([]); // Clear POs if no store can be selected
                        if (fetchedStores.length === 0) {
                            setPageError("No stores available for selection.");
                        }
                    }
                })
                .catch(err => {
                    console.error('[POList] Error fetching stores:', err);
                    setPageError(err.response?.data?.message || 'Failed to fetch stores.');
                    setStores([]);
                    setSelectedStoreId(null);
                    setPurchaseOrders([]);
                })
                .finally(() => setInitialStoreLoading(false));
        } else { // For non-global admins
            if (user.store_id) {
                setSelectedStoreId(user.store_id);
                // Find the store name to display if not directly on user object
                apiInstance.get(`/stores/${user.store_id}`).then(res => {
                    const store = res.data?.data || res.data;
                    if (store) setStores([store]); // Set a single store for display purposes
                }).catch(err => console.error("Failed to fetch store details for non-global admin", err));

            } else {
                setPageError('You do not have an assigned store. Cannot fetch purchase orders.');
                setSelectedStoreId(null);
                setPurchaseOrders([]);
            }
            setInitialStoreLoading(false);
        }
    }, [user, authLoading]);


    const fetchPurchaseOrders = useCallback(async () => {
        if (!isAuthenticated || !selectedStoreId) { // Ensure a store is selected
            if (!selectedStoreId && user && user.role_name === 'global_admin' && stores.length > 0) {
                // Global admin has stores but hasn't selected one (or default selection failed)
                // This case should be handled by initialStoreLoading or pageError
            } else if (!selectedStoreId && user && user.role_name !== 'global_admin' && !user.store_id) {
                setPageError("No store assigned to fetch purchase orders.");
            }
            setPurchaseOrders([]);
            setTotalRows(0);
            setLoading(false);
            return;
        }
        setLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get<{ data: PurchaseOrderListItem[], total: number, count: number }>(
                `/purchase-orders?page=${page + 1}&limit=${rowsPerPage}&store_id=${selectedStoreId}`
            );
            setPurchaseOrders(response.data.data || []);
            setTotalRows(response.data.total || 0);
        } catch (err: any) {
            setPageError(err.response?.data?.message || 'Failed to fetch purchase orders.');
            console.error("Error fetching purchase orders:", err);
            setPurchaseOrders([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, page, rowsPerPage, selectedStoreId, user, stores]); // Added selectedStoreId, user, stores

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    // Effect 2: Fetch POs when selectedStoreId changes or pagination changes
    useEffect(() => {
        if (!authLoading && isAuthenticated && !initialStoreLoading && selectedStoreId) {
            fetchPurchaseOrders();
        } else if (!authLoading && isAuthenticated && !initialStoreLoading && user?.role_name === 'global_admin' && stores.length > 0 && !selectedStoreId) {
            // Global admin, stores loaded, but no store selected (e.g. if default selection failed)
            // setPageError("Please select a store to view purchase orders.");
            setPurchaseOrders([]);
            setTotalRows(0);
        } else if (!authLoading && !isAuthenticated) {
            setPageError("User not authenticated.");
            setLoading(false);
            setPurchaseOrders([]);
            setTotalRows(0);
        }
    }, [isAuthenticated, authLoading, initialStoreLoading, selectedStoreId, fetchPurchaseOrders, user, stores]);


    const handleDelete = async (id: string | number, poIdentifier: string) => {
        if (!isAuthenticated || (userCan && !userCan('purchase_order:delete'))) {
            setFeedback({ message: "You don't have permission to delete purchase orders.", type: 'error' });
            setTimeout(() => setFeedback({ message: null, type: null }), 3000);
            return;
        }
        if (window.confirm(`Are you sure you want to delete Purchase Order #${poIdentifier}? This action might be irreversible.`)) {
            try {
                await apiInstance.delete(`/purchase-orders/${id}`); // Backend should check store ownership for non-global admin
                setFeedback({ message: `Purchase Order #${poIdentifier} deleted successfully.`, type: 'success' });
                fetchPurchaseOrders();
            } catch (err: any) {
                setFeedback({ message: err.response?.data?.message || `Failed to delete PO #${poIdentifier}.`, type: 'error' });
                console.error("Error deleting purchase order:", err);
            }
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleStoreChange = (event: React.ChangeEvent<{ value: unknown }>) => {
        setSelectedStoreId(event.target.value as string | number);
        setPage(0); // Reset page when store changes
    };

    const getStatusChipColor = (status: PurchaseOrderListItem['status']): "warning" | "info" | "secondary" | "success" | "error" | "default" => {
        switch (status) {
            case 'Pending': return 'warning';
            case 'Ordered': return 'info';
            case 'Shipped': return 'secondary';
            case 'Partial': return 'secondary';
            case 'Received': return 'success';
            case 'Cancelled': return 'error';
            default: return 'default';
        }
    };

    if (authLoading || initialStoreLoading) {
        return <Paper sx={{ p: 3, textAlign: 'center' }}><CircularProgress /></Paper>;
    }
    
    const canCreatePO = isAuthenticated && userCan && userCan('purchase_order:create') && selectedStoreId;

    return (
        <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5">Purchase Orders</Typography>
                {canCreatePO && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to={`/dashboard/purchase-orders/new?store_id=${selectedStoreId}`} // Pass store_id for new PO
                    >
                        New Purchase Order
                    </Button>
                )}
            </Box>

            {/* Store Selector */}
            {user && user.role_name === 'global_admin' && (
                <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <FormControl fullWidth>
                        <InputLabel id="store-select-label">Select Store</InputLabel>
                        <Select
                            labelId="store-select-label"
                            value={selectedStoreId || ''}
                            label="Select Store"
                            onChange={handleStoreChange}
                            disabled={stores.length === 0}
                        >
                            {stores.map((store) => (
                                <MenuItem key={store.id} value={store.id}>
                                    {store.name}
                                </MenuItem>
                            ))}
                            {stores.length === 0 && <MenuItem value="" disabled>No stores available</MenuItem>}
                        </Select>
                    </FormControl>
                </Box>
            )}
            {user && user.role_name !== 'global_admin' && user.store_id && (
                 <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <TextField
                        label="Store"
                        value={stores.find(s => s.id === user.store_id)?.name || `Store ID: ${user.store_id}`}
                        fullWidth
                        disabled
                    />
                </Box>
            )}


            {feedback.message && <Alert severity={feedback.type || 'info'} sx={{ mb: 2 }} onClose={() => setFeedback({message: null, type: null})}>{feedback.message}</Alert>}
            {pageError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>{pageError}</Alert>}

            {(loading && purchaseOrders.length === 0) && <Box sx={{textAlign: 'center', p:2}}><CircularProgress /></Box>}
            
            {!loading && purchaseOrders.length === 0 && !pageError && selectedStoreId && (
                <Typography sx={{textAlign: 'center', p:2}}>No purchase orders found for this store.</Typography>
            )}
             {!loading && !selectedStoreId && user && user.role_name === 'global_admin' && stores.length > 0 && (
                <Typography sx={{textAlign: 'center', p:2}}>Please select a store to view purchase orders.</Typography>
            )}


            {purchaseOrders.length > 0 && selectedStoreId && (
                <>
                <TableContainer>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>PO ID</TableCell>
                                <TableCell>Supplier</TableCell>
                                <TableCell>Store</TableCell>
                                <TableCell>Order Date</TableCell>
                                <TableCell>Expected Delivery</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Total Amount</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {purchaseOrders.map((po) => (
                                <TableRow hover key={po.id}>
                                    <TableCell>#{po.id}</TableCell>
                                    <TableCell>{po.supplier_name}</TableCell>
                                    <TableCell>{po.store_name || stores.find(s => s.id === selectedStoreId)?.name || 'N/A'}</TableCell>
                                    <TableCell>{format(parseISO(po.order_date), 'PP')}</TableCell>
                                    <TableCell>{po.expected_delivery_date ? format(parseISO(po.expected_delivery_date), 'PP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Chip label={po.status} color={getStatusChipColor(po.status)} size="small" />
                                    </TableCell>
                                    <TableCell align="right">
                                        {po.total_amount != null ? Number(po.total_amount).toFixed(2) : '0.00'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {isAuthenticated && userCan && userCan('purchase_order:read') && (
                                            <Tooltip title="View Details">
                                                <IconButton component={RouterLink} to={`/dashboard/purchase-orders/view/${po.id}`} color="default" size="small">
                                                    <ViewIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {isAuthenticated && userCan && userCan('purchase_order:update') && (
                                            <Tooltip title="Edit">
                                                <IconButton component={RouterLink} to={`/dashboard/purchase-orders/edit/${po.id}`} color="primary" size="small">
                                                    <EditIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {isAuthenticated && userCan && userCan('purchase_order:delete') && (
                                            <Tooltip title="Delete/Cancel">
                                                <IconButton onClick={() => handleDelete(po.id, String(po.id))} color="error" size="small">
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={totalRows}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
                </>
            )}
        </Paper>
    );
};

export default PurchaseOrderList;