import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Alert, Chip, IconButton, Menu, MenuItem, FormControl, InputLabel, Select, TextField } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import apiInstance from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';
import SidePanelsLayout from './common/SidePanelsLayout';
import DynamicFilterPanel, { FilterFieldDefinition, ActiveFilter } from './common/DynamicFilterPanel';
import { useAuth } from '../context/AuthContext';

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

const PurchaseOrderDetailsView = ({ po }: { po: PurchaseOrderListItem | null }) => {
    if (!po) return <Typography sx={{ p: 2 }}>No purchase order selected.</Typography>;
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6">PO #{po.id}</Typography>
            <Typography>Supplier: {po.supplier_name}</Typography>
            <Typography>Store: {po.store_name || 'N/A'}</Typography>
            <Typography>Order Date: {po.order_date}</Typography>
            <Typography>Expected Delivery: {po.expected_delivery_date || 'N/A'}</Typography>
            <Typography>Status: {po.status}</Typography>
            <Typography>Total Amount: {po.total_amount != null ? Number(po.total_amount).toFixed(2) : '0.00'}</Typography>
        </Box>
    );
};

interface FilterableColumnDef extends GridColDef<PurchaseOrderListItem> {
    filterable?: boolean;
    filterType?: FilterFieldDefinition['type'];
    filterOptions?: FilterFieldDefinition['options'];
    filterLabel?: string;
}

const PurchaseOrderList = () => {
    const navigate = useNavigate();
    const { setMenuProps } = useSecondaryMenu();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();

    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
    const [appliedFilters, setAppliedFilters] = useState<ActiveFilter[]>([]);

    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<PurchaseOrderListItem | null>(null);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuRow, setMenuRow] = useState<PurchaseOrderListItem | null>(null);

    const [selectionModel, setSelectionModel] = useState<(number | string)[]>([]);
    const [multiSelectMode, setMultiSelectMode] = useState(false);

    // Store selection state
    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string | number | null>(null);
    const [initialStoreLoading, setInitialStoreLoading] = useState<boolean>(true);

    // Fetch stores and set selectedStoreId
    useEffect(() => {
        if (authLoading || !user) {
            setInitialStoreLoading(true);
            return;
        }
        setInitialStoreLoading(true);
        setError(null);

        if (user.role_name === 'global_admin') {
            apiInstance.get('/stores')
                .then(res => {
                    const fetchedStores = res.data?.data || res.data || [];
                    setStores(fetchedStores);
                    if (fetchedStores.length > 0 && fetchedStores[0]?.id) {
                        setSelectedStoreId(fetchedStores[0].id);
                    } else {
                        setSelectedStoreId(null);
                        setPurchaseOrders([]);
                        setError("No stores available for selection.");
                    }
                })
                .catch(err => {
                    setError(err.response?.data?.message || 'Failed to fetch stores.');
                    setStores([]);
                    setSelectedStoreId(null);
                    setPurchaseOrders([]);
                })
                .finally(() => setInitialStoreLoading(false));
        } else {
            if (user.store_id) {
                setSelectedStoreId(user.store_id);
                apiInstance.get(`/stores/${user.store_id}`).then(res => {
                    const store = res.data?.data || res.data;
                    if (store) setStores([store]);
                }).catch(err => {});
            } else {
                setError('You do not have an assigned store. Cannot fetch purchase orders.');
                setSelectedStoreId(null);
                setPurchaseOrders([]);
            }
            setInitialStoreLoading(false);
        }
    }, [user, authLoading]);

    // Define columns with filter metadata
    const columns: FilterableColumnDef[] = useMemo(() => [
        {
            field: 'id',
            headerName: 'PO ID',
            width: 90,
            type: 'number',
            filterable: true,
            filterType: 'number',
        },
        {
            field: 'supplier_name',
            headerName: 'Supplier',
            flex: 1,
            minWidth: 150,
            type: 'string',
            filterable: true,
            filterType: 'text',
        },
        {
            field: 'store_name',
            headerName: 'Store',
            flex: 1,
            minWidth: 150,
            type: 'string',
            filterable: true,
            filterType: 'text',
        },
        {
            field: 'order_date',
            headerName: 'Order Date',
            width: 130,
            type: 'string',
            filterable: true,
            filterType: 'date',
        },
        {
            field: 'expected_delivery_date',
            headerName: 'Expected Delivery',
            width: 130,
            type: 'string',
            filterable: true,
            filterType: 'date',
        },
        {
            field: 'status',
            headerName: 'Status',
            width: 120,
            type: 'string',
            filterable: true,
            filterType: 'select',
            filterOptions: ['Pending', 'Ordered', 'Shipped', 'Partial', 'Received', 'Cancelled'],
            renderCell: (params) => (
                <Chip label={params.value} size="small" />
            ),
        },
        {
            field: 'total_amount',
            headerName: 'Total Amount',
            width: 120,
            type: 'number',
            filterable: true,
            filterType: 'number',
            renderCell: (params) => (
                params.value != null ? Number(params.value).toFixed(2) : '0.00'
            ),
        },
        {
            field: 'actions',
            headerName: '',
            width: 50,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            align: 'center',
            renderCell: (params) => (
                <IconButton
                    size="small"
                    onClick={(event) => {
                        event.stopPropagation();
                        handleMenuOpen(event, params.row as PurchaseOrderListItem);
                    }}
                >
                    <MoreVertIcon />
                </IconButton>
            ),
        },
    ], []);

    // Dynamically generate availableFilterFields from columns
    const availableFilterFields = useMemo((): FilterFieldDefinition[] => {
        return columns
            .filter(col => col.filterable && col.field)
            .map(col => ({
                value: col.field!,
                label: col.filterLabel || col.headerName || col.field!,
                type: col.filterType || 'text',
                options: col.filterOptions,
                placeholder: `Enter ${col.filterLabel || col.headerName || col.field!}`
            }));
    }, [columns]);

    // Always include store_id in API request
    const fetchPurchaseOrders = useCallback(async (filtersToApply: ActiveFilter[]) => {
        setIsLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            if (selectedStoreId) {
                queryParams.append('store_id', String(selectedStoreId));
            }
            filtersToApply.forEach(filter => {
                if (filter.value !== undefined && filter.value !== '' && filter.value !== null) {
                    queryParams.append(`${filter.field}[${filter.operator}]`, String(filter.value));
                }
            });
            const endpoint = `/purchase-orders${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await apiInstance.get(endpoint);
            if (Array.isArray(response.data.data)) {
                setPurchaseOrders(response.data.data);
            } else if (Array.isArray(response.data)) {
                setPurchaseOrders(response.data);
            } else {
                setPurchaseOrders([]);
                setError("Received invalid data format from server.");
            }
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Failed to fetch purchase orders.");
            setPurchaseOrders([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedStoreId]);

    // Only fetch on appliedFilters change
    useEffect(() => {
        if (!initialStoreLoading && selectedStoreId) {
            fetchPurchaseOrders(appliedFilters);
        }
    }, [appliedFilters, fetchPurchaseOrders, initialStoreLoading, selectedStoreId]);

    useEffect(() => {
        if (!initialStoreLoading && selectedStoreId) {
            fetchPurchaseOrders(activeFilters);
        }
    }, [activeFilters, fetchPurchaseOrders, initialStoreLoading, selectedStoreId]);

    const handleRowClick = (po: PurchaseOrderListItem) => {
        setSelectedPO(po);
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: PurchaseOrderListItem) => {
        setAnchorEl(event.currentTarget);
        setMenuRow(row);
        if (!multiSelectMode) {
            setSelectionModel([row.id]);
        }
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuRow(null);
    };

    useEffect(() => {
        if (selectionModel.length === 1) {
            const selected = purchaseOrders.find(po => po.id === selectionModel[0]) || null;
            setSelectedPO(selected);
        } else {
            setSelectedPO(null);
        }
    }, [selectionModel, purchaseOrders]);

    const handleSelectMore = () => {
        setMultiSelectMode(true);
        setSelectionModel([]);
        handleMenuClose();
    };

    const handleAddNew = () => navigate('/dashboard/purchase-orders/new');

    const handleEditSelected = () => {
        if (selectedPO) {
            navigate(`/dashboard/purchase-orders/edit/${selectedPO.id}`);
        }
    };

    const handleViewSelected = () => {
        if (selectedPO) {
            navigate(`/dashboard/purchase-orders/view/${selectedPO.id}`);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectionModel.length === 0) {
            setFeedback({ message: 'No purchase order selected for deletion.', type: 'warning' });
            return;
        }
        if (window.confirm(`Are you sure you want to delete ${selectionModel.length > 1 ? 'these purchase orders' : 'this purchase order'}?`)) {
            try {
                await Promise.all(
                    selectionModel.map(id => apiInstance.delete(`/purchase-orders/${id}`))
                );
                setFeedback({ message: 'Purchase order(s) deleted successfully.', type: 'success' });
                setSelectedPO(null);
                setIsDetailsPanelOpen(false);
                setSelectionModel([]);
                setMultiSelectMode(false);
                fetchPurchaseOrders(appliedFilters);
            } catch (err: any) {
                setFeedback({ message: err.response?.data?.message || 'Failed to delete purchase order.', type: 'error' });
            }
        }
    };

    useEffect(() => {
        if (feedback?.message) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    useEffect(() => {
        let storeSelectorComponent = null;
        let storeNameDisplay = null;

        if (user && user.role_name === 'global_admin') {
            storeSelectorComponent = (
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250 }}>
                    <Typography sx={{ mr: 1, whiteSpace: 'nowrap' }}>Store:</Typography>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                            value={selectedStoreId || ''}
                            onChange={e => setSelectedStoreId(e.target.value as string | number)}
                            disabled={stores.length === 0}
                            displayEmpty
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
            );
        } else if (user && user.store_id) {
            const storeName = stores.find(s => s.id === user.store_id)?.name || `Store ID: ${user.store_id}`;
            storeNameDisplay = (
                <TextField
                    label="Store"
                    value={storeName}
                    fullWidth
                    size="small"
                    disabled
                    variant="outlined"
                />
            );
        }

        setMenuProps({
            pageTitle: "Manage Purchase Orders",
            breadcrumbs: [{ label: "Dashboard", path: "/dashboard" }, { label: "Purchase Orders" }],
            showFilter: true,
            toggleFilterSidebar: () => setIsFilterPanelOpen(prev => !prev),
            isFilterSidebarVisible: isFilterPanelOpen,
            showNewAction: true,
            onNewActionClick: handleAddNew,
            isNewActionEnabled: true,
            newActionLabel: "+ New",
            newActionIcon: <AddIcon fontSize="small" />,
            showDeleteAction: true,
            onDeleteActionClick: handleDeleteSelected,
            isDeleteActionEnabled: selectionModel.length > 0,
            deleteActionLabel: "Delete",
            deleteActionIcon: <DeleteIcon fontSize="small" />,
            showInfo: true,
            onInfoClick: () => setIsDetailsPanelOpen(prev => !prev),
            isInfoActionEnabled: true,
            actions: [{
                id: 'edit-po',
                type: 'button',
                label: 'Edit',
                icon: <EditIcon fontSize="small" />,
                onClick: handleEditSelected,
                disabled: selectionModel.length !== 1,
                variant: 'outlined',
                color: 'inherit',
            }],
            storeSelectorComponent,
            storeNameDisplay,
        });
        return () => setMenuProps({});
    }, [
        setMenuProps,
        navigate,
        isFilterPanelOpen,
        isDetailsPanelOpen,
        selectedPO,
        appliedFilters,
        selectionModel,
        fetchPurchaseOrders,
        user,
        stores,
        selectedStoreId
    ]);

    useEffect(() => {
        if (!multiSelectMode) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setMultiSelectMode(false);
                setSelectionModel([]);
            }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [multiSelectMode]);

    if (authLoading || initialStoreLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading purchase orders...</Typography>
            </Box>
        );
    }

    // Store selector UI
    const storeSelector = (
        <>
            {user && user.role_name === 'global_admin' && (
                <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <FormControl fullWidth>
                        <InputLabel id="store-select-label">Select Store</InputLabel>
                        <Select
                            labelId="store-select-label"
                            value={selectedStoreId || ''}
                            label="Select Store"
                            onChange={e => setSelectedStoreId(e.target.value as string | number)}
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
        </>
    );

    if (isLoading && purchaseOrders.length === 0 && !error) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading purchase orders...</Typography>
            </Box>
        );
    }

    if (error && purchaseOrders.length === 0) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}>
                <Alert severity="error" sx={{ width: '100%', maxWidth: '600px', mb: 2 }}>{error}</Alert>
                <Button variant="outlined" onClick={() => fetchPurchaseOrders(appliedFilters)}>Try Again</Button>
            </Box>
        );
    }

    const mainContent = (
        <Paper sx={{
            p: 1,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            minHeight: 0
        }}>
            {feedback && <Alert severity={feedback.type} sx={{ mb: 2, flexShrink: 0 }}>{feedback.message}</Alert>}
            {error && purchaseOrders.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{`Warning: ${error}`}</Alert>}

            <Box sx={{
                flexGrow: 1,
                width: '100%',
                overflow: 'auto',
                position: 'relative',
                minHeight: 0
            }}>
                {isLoading && (
                    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
                {purchaseOrders.length === 0 && !isLoading && !error && (
                    <Alert severity="info" sx={{ mt: 2 }}>No purchase orders found matching your criteria.</Alert>
                )}
                {purchaseOrders.length > 0 && (
                    <DataGrid
                        rows={purchaseOrders}
                        columns={columns}
                        checkboxSelection={multiSelectMode}
                        disableSelectionOnClick
                        selectionModel={selectionModel}
                        onSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
                        onRowClick={(params) => {
                            if (!multiSelectMode) {
                                handleRowClick(params.row as PurchaseOrderListItem);
                                setSelectionModel([params.id]);
                            }
                        }}
                        onRowDoubleClick={(params) => {
                            navigate(`/dashboard/purchase-orders/edit/${params.id}`);
                        }}
                        autoHeight={false}
                        sx={{ border: 0, '& .MuiDataGrid-virtualScroller': { flexGrow: 1 }, height: '100%' }}
                        density="compact"
                    />
                )}
            </Box>
        </Paper>
    );

    return (
        <SidePanelsLayout
            filterPanelOpen={isFilterPanelOpen}
            onFilterPanelClose={() => setIsFilterPanelOpen(false)}
            filterPanelTitle="Filter Purchase Orders"
            filterPanelContent={
                <DynamicFilterPanel
                    activeFilters={activeFilters}
                    onActiveFiltersChange={setActiveFilters}
                    availableFilterFields={availableFilterFields}
                />
            }
            detailsPanelOpen={isDetailsPanelOpen}
            detailsPanelTitle={selectedPO ? `Details: #${selectedPO.id} - ${selectedPO.supplier_name}` : "Details"}
            onDetailsPanelClose={() => setIsDetailsPanelOpen(false)}
            detailsPanelContent={<PurchaseOrderDetailsView po={selectedPO} />}
            mainContentSx={{
                p: 0,
                height: 'calc(100vh - 64px)',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column'
            }}
        >
           
            {mainContent}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                onClick={handleMenuClose}
            >
                <MenuItem onClick={() => { setIsDetailsPanelOpen(true); handleMenuClose(); }}>
                    <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Details
                </MenuItem>
                <MenuItem
                    onClick={() => { handleEditSelected(); handleMenuClose(); }}
                    disabled={selectionModel.length !== 1}
                >
                    <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                </MenuItem>
                <MenuItem
                    disabled={selectionModel.length === 0}
                    onClick={() => { handleDeleteSelected(); handleMenuClose(); }}
                >
                    <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                </MenuItem>
                <MenuItem onClick={handleSelectMore}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                        <AddIcon fontSize="small" style={{ marginRight: 8 }} /> Select More
                    </span>
                </MenuItem>
            </Menu>
        </SidePanelsLayout>
    );
};

export default PurchaseOrderList;