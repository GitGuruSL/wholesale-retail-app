// ... (imports and interfaces remain mostly the same, ensure GoodsReceiptListItem matches backend)
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
    Box, Paper, Typography, Button, CircularProgress, Alert, Chip, IconButton, Menu, MenuItem as MuiMenuItem,
    FormControl, Select, TextField
} from '@mui/material';
import { DataGrid, GridColDef, GridRowParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import VisibilityIcon from '@mui/icons-material/Visibility';
import apiInstance from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';
import { useAuth } from '../context/AuthContext';
import SidePanelsLayout from './common/SidePanelsLayout';
import DynamicFilterPanel, { FilterFieldDefinition, ActiveFilter } from './common/DynamicFilterPanel';
import GoodsReceiptDetailsView from './GoodsReceiptDetailsView'; // This is for the side panel

interface GoodsReceiptListItem {
    id: number;
    purchase_order_id: number;
    store_name: string;
    supplier_name?: string;
    received_at: string;
    po_status?: string; // Status from Purchase Order
    po_notes?: string; // Notes from Purchase Order
    // Add other fields you selected in the backend if needed for display
}

interface Store { // Add this if not already present
    id: number | string;
    name: string;
}

// ... (FilterableColumnDef interface remain the same) ...

const GoodsReceiptList: React.FC = () => {
    const navigate = useNavigate();
    const { setMenuProps } = useSecondaryMenu();
    const { user, isLoading: authLoading } = useAuth();

    const [receipts, setReceipts] = useState<GoodsReceiptListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuRow, setMenuRow] = useState<GoodsReceiptListItem | null>(null);

    const [selectionModel, setSelectionModel] = useState<(number | string)[]>([]);
    const [selectedGoodsReceipt, setSelectedGoodsReceipt] = useState<GoodsReceiptListItem | null>(null);

    const [stores, setStores] = useState<Store[]>([]);
    const [selectedStoreId, setSelectedStoreId] = useState<string | number | null>(null);
    const [initialStoreLoading, setInitialStoreLoading] = useState<boolean>(true);

    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
    const [appliedFilters, setAppliedFilters] = useState<ActiveFilter[]>([]);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);


    // Fetch stores (useEffect remains the same)
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
                        setReceipts([]);
                        setError("No stores available for selection.");
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
                setSelectedStoreId(user.store_id);
                apiInstance.get(`/stores/${user.store_id}`).then(res => {
                    const store = res.data?.data || res.data;
                    if (store) setStores([store]);
                }).catch(() => {});
            } else {
                setError('You do not have an assigned store. Cannot fetch goods receipts.');
                setSelectedStoreId(null);
                setReceipts([]);
            }
            setInitialStoreLoading(false);
        }
    }, [user, authLoading]);

    const fetchGoodsReceipts = useCallback(async (filtersToApply: ActiveFilter[]) => {
        if (!selectedStoreId) {
            setReceipts([]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            // Ensure store_id is a string for URLSearchParams
            queryParams.append('store_id', String(selectedStoreId));

            filtersToApply.forEach(filter => {
                if (filter.value !== undefined && filter.value !== '' && filter.value !== null) {
                    // Backend expects field[operator]=value
                    queryParams.append(`${filter.field}[${filter.operator}]`, String(filter.value));
                }
            });
            
            // Construct endpoint with query parameters
            const endpoint = `/goods-receipts?${queryParams.toString()}`;
            const response = await apiInstance.get(endpoint);
            // Assuming backend now returns a direct array
            const fetchedData = response.data || [];
            setReceipts(Array.isArray(fetchedData) ? fetchedData : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message || "Failed to fetch goods receipts.");
            setReceipts([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedStoreId]);

    useEffect(() => {
        if (!initialStoreLoading && selectedStoreId) {
            fetchGoodsReceipts(appliedFilters);
        } else if (!initialStoreLoading && !selectedStoreId) {
            setReceipts([]); // Clear if no store selected
            setIsLoading(false);
        }
    }, [appliedFilters, fetchGoodsReceipts, initialStoreLoading, selectedStoreId]);

    const columns: FilterableColumnDef[] = useMemo(() => [
        { field: 'id', headerName: 'GRN ID', width: 90, type: 'number', filterable: true, filterType: 'number' },
        { field: 'purchase_order_id', headerName: 'PO ID', width: 90, type: 'number', filterable: true, filterType: 'number' },
        { field: 'store_name', headerName: 'Store', flex: 1, minWidth: 150, filterable: true, filterType: 'text' },
        { field: 'supplier_name', headerName: 'Supplier', flex: 1, minWidth: 150, filterable: true, filterType: 'text' },
        {
            field: 'received_at',
            headerName: 'Received Date',
            width: 150,
            type: 'dateTime',
            valueGetter: (params) => params.value ? new Date(params.value) : null,
            filterable: true,
            filterType: 'date',
        },
        {
            field: 'po_status', // Changed from 'status'
            headerName: 'PO Status', // Changed header name
            width: 120,
            filterable: true,
            filterType: 'select',
            filterOptions: ['Pending', 'Ordered', 'Partial', 'Completed', 'Cancelled'], // Adjust as per your actual PO statuses
            renderCell: (params) => params.value ? <Chip label={params.value} size="small" /> : null
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
                        handleMenuOpen(event, params.row as GoodsReceiptListItem);
                    }}
                >
                    <MoreVertIcon />
                </IconButton>
            ),
        },
    ], []);

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

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: GoodsReceiptListItem) => {
        setAnchorEl(event.currentTarget);
        setMenuRow(row);
        setSelectedGoodsReceipt(row);
        setSelectionModel([row.id]);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleAddNew = useCallback(() => {
        navigate('/dashboard/goods-receipts/new');
    }, [navigate]);

    const handleViewFromMenu = useCallback(() => {
        if (menuRow) {
            navigate(`/dashboard/goods-receipts/view/${menuRow.id}`);
        }
        setAnchorEl(null); // Close menu
        setMenuRow(null);
    }, [navigate, menuRow]);

    useEffect(() => {
        if (selectionModel.length === 1) {
            const selected = receipts.find(r => r.id === selectionModel[0]);
            if (selected) {
                setSelectedGoodsReceipt(selected);
            }
        } else {
            // If multiple are somehow selected or none, clear selectedGoodsReceipt for the details panel
            // This shouldn't happen with current setup where onRowClick sets a single selection
            setSelectedGoodsReceipt(null);
        }
    }, [selectionModel, receipts]);

    useEffect(() => {
        if (feedback?.message) {
            const timer = setTimeout(() => setFeedback(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    // Memoize callbacks for setMenuProps
    const toggleFilterPanel = useCallback(() => {
        setIsFilterPanelOpen(prev => !prev);
    }, []); // setIsFilterPanelOpen is stable

    const toggleDetailsPanelFromMenu = useCallback(() => { // Renamed to avoid conflict if another toggleDetailsPanel exists
        setIsDetailsPanelOpen(prev => !prev);
    }, []); // setIsDetailsPanelOpen is stable

    // Memoize JSX elements for setMenuProps
    const storeSelectorComponent = useMemo(() => {
        if (user && user.role_name === 'global_admin') {
            return (
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 250 }}>
                    <Typography sx={{ mr: 1, whiteSpace: 'nowrap' }}>Store:</Typography>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <Select
                            value={selectedStoreId || ''}
                            onChange={e => {
                                setSelectedStoreId(e.target.value as string | number);
                                setAppliedFilters([]);
                                setActiveFilters([]);
                                setSelectedGoodsReceipt(null);
                                setIsDetailsPanelOpen(false); // Close details panel on store change
                            }}
                            disabled={initialStoreLoading || stores.length === 0}
                            displayEmpty
                        >
                            {initialStoreLoading && <MuiMenuItem value="" disabled>Loading stores...</MuiMenuItem>}
                            {!initialStoreLoading && stores.length === 0 && <MuiMenuItem value="" disabled>No stores available</MuiMenuItem>}
                            {stores.map((store) => (
                                <MuiMenuItem key={store.id} value={store.id}>
                                    {store.name}
                                </MuiMenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Box>
            );
        }
        return null;
    }, [user, selectedStoreId, initialStoreLoading, stores]);

    const storeNameDisplayComponent = useMemo(() => {
        if (user && user.role_name !== 'global_admin' && user.store_id) {
            const currentStore = stores.find(s => s.id === user.store_id);
            const storeName = currentStore ? currentStore.name : `Store ID: ${user.store_id}`;
            return (<TextField label="Store" value={storeName} size="small" disabled variant="outlined" sx={{ minWidth: 200 }} />);
        }
        return null;
    }, [user, stores]);

    const newActionIconElement = useMemo(() => <AddIcon fontSize="small" />, []);


    useEffect(() => {
        const menuData = {
            pageTitle: "Goods Receipts",
            breadcrumbs: [{ label: "Dashboard", path: "/dashboard" }, { label: "Goods Receipts" }],
            showFilter: true,
            toggleFilterSidebar: toggleFilterPanel, // Use memoized version
            isFilterSidebarVisible: isFilterPanelOpen,
            showInfo: true,
            onInfoClick: toggleDetailsPanelFromMenu, // Use memoized version
            isInfoActionEnabled: true, // This was true, check if it should depend on selectionModel.length === 1
            showNewAction: true,
            onNewActionClick: handleAddNew, // Use memoized version
            isNewActionEnabled: !!selectedStoreId,
            newActionLabel: "+ New",
            newActionIcon: newActionIconElement, // Use memoized version
            storeSelectorComponent: storeSelectorComponent, // Use memoized version
            storeNameDisplay: storeNameDisplayComponent, // Use memoized version
        };
        
        setMenuProps(menuData);

        // Cleanup function: This is called when the component unmounts or before the effect runs again.
        // Setting to an empty object {} might be part of the issue if the context isn't expecting it
        // or if it causes an immediate re-render and re-run of this effect.
        return () => {
            setMenuProps({}); // Or a more defined initial/default state for the menu
        };
    }, [
        setMenuProps,
        // Dependencies for constructing menuData:
        toggleFilterPanel, 
        isFilterPanelOpen,
        toggleDetailsPanelFromMenu,
        // isInfoActionEnabled, // If this becomes dynamic, add it
        handleAddNew, 
        selectedStoreId,
        newActionIconElement,
        storeSelectorComponent,
        storeNameDisplayComponent
        // Static values like pageTitle, breadcrumbs, newActionLabel are not needed in deps
    ]);
    
    if (authLoading || initialStoreLoading) {
        return ( <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}> <CircularProgress /> <Typography sx={{ ml: 2 }}>Loading initial data...</Typography> </Box> );
    }
    
    const mainGridContent = (
        <Paper sx={{ p: 1, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxSizing: 'border-box', minHeight: 0 }}>
            {feedback && <Alert severity={feedback.type} sx={{ mb: 2, flexShrink: 0 }}>{feedback.message}</Alert>}
            {error && receipts.length === 0 && ( <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> )}
            {error && receipts.length > 0 && ( <Alert severity="warning" sx={{ mb: 2 }}>{`Warning: ${error}`}</Alert> )}

            <Box sx={{ flexGrow: 1, width: '100%', overflow: 'auto', position: 'relative', minHeight: 0 }}>
                {isLoading && ( <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}> <CircularProgress size={24} /> </Box> )}
                {!isLoading && receipts.length === 0 && !error && ( <Alert severity="info" sx={{ mt: 2 }}>No goods receipts found matching your criteria.</Alert> )}
                {receipts.length > 0 && (
                    <DataGrid
                        rows={receipts}
                        columns={columns}
                        disableSelectionOnClick 
                        selectionModel={selectionModel}
                        onRowClick={(params: GridRowParams) => {
                            setSelectedGoodsReceipt(params.row as GoodsReceiptListItem);
                            setSelectionModel([params.id]); 
                        }}
                        density="compact"
                        sx={{ border: 0, '& .MuiDataGrid-virtualScroller': { flexGrow: 1 }, height: '100%' }}
                        autoHeight={false}
                    />
                )}
            </Box>
        </Paper>
    );

    return (
        <SidePanelsLayout
            filterPanelOpen={isFilterPanelOpen}
            onFilterPanelClose={() => setIsFilterPanelOpen(false)}
            filterPanelTitle="Filter Goods Receipts"
            filterPanelContent={
                <DynamicFilterPanel
                    activeFilters={activeFilters}
                    onActiveFiltersChange={setActiveFilters}
                    onApplyFilters={(filters) => {
                        setAppliedFilters(filters);
                        setIsFilterPanelOpen(false); // Close panel after applying
                    }}
                    availableFilterFields={availableFilterFields}
                />
            }
            detailsPanelOpen={isDetailsPanelOpen}
            detailsPanelTitle={selectedGoodsReceipt ? `Details: GRN #${selectedGoodsReceipt.id}` : "Goods Receipt Details"}
            onDetailsPanelClose={() => setIsDetailsPanelOpen(false)}
            detailsPanelContent={<GoodsReceiptDetailsView receipt={selectedGoodsReceipt} />} // Ensure this component handles null `receipt` gracefully
            mainContentSx={{ p: 0, height: 'calc(100vh - 64px)', minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
            {mainGridContent}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose} // Ensure handleMenuClose is defined: const handleMenuClose = () => setAnchorEl(null);
            >
                <MuiMenuItem onClick={handleViewFromMenu}>
                    <VisibilityIcon fontSize="small" sx={{ mr: 1 }} /> View Full Details
                </MuiMenuItem>
                {/* Add other menu items here if needed */}
            </Menu>
        </SidePanelsLayout>
    );
};

export default GoodsReceiptList;
