import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, Typography, Button, CircularProgress, Alert } from '@mui/material';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';

import SidePanelsLayout from './common/SidePanelsLayout';
import DynamicFilterPanel, { FilterFieldDefinition, ActiveFilter } from './common/DynamicFilterPanel';

import apiInstance from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';

interface Warranty {
    id: number | string;
    name: string;
    productName?: string;
    status?: string;
    duration_months?: number | null;
    description?: string;
}

const WarrantyDetailsView = ({ warranty }: { warranty: Warranty | null }) => {
    if (!warranty) return <Typography sx={{ p: 2 }}>No warranty selected.</Typography>;
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6">Details: {warranty.name || 'N/A'}</Typography>
            <Typography>ID: {warranty.id}</Typography>
            <Typography>Product: {warranty.productName || 'N/A'}</Typography>
            <Typography>Status: {warranty.status || 'N/A'}</Typography>
            <Typography>Duration: {warranty.duration_months !== null && warranty.duration_months !== undefined ? `${warranty.duration_months} months` : 'N/A'}</Typography>
            <Typography>Description: {warranty.description || 'N/A'}</Typography>
        </Box>
    );
};

const WARRANTY_AVAILABLE_FILTER_FIELDS: FilterFieldDefinition[] = [
    { value: 'name', label: 'Warranty Name', type: 'text', placeholder: 'Enter warranty name' },
    { value: 'productName', label: 'Product Name', type: 'text', placeholder: 'Enter product name' },
    { value: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive', 'Expired'] },
    { value: 'duration_months', label: 'Duration (Months)', type: 'number', placeholder: 'Enter duration' },
];

const WarrantyList = () => {
    const navigate = useNavigate();
    const { setMenuProps } = useSecondaryMenu();

    const [warranties, setWarranties] = useState<Warranty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

    const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]); // Filters currently in the panel
    const [appliedFilters, setAppliedFilters] = useState<ActiveFilter[]>([]); // Filters applied for fetching

    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [isDetailsPanelOpen, setIsDetailsPanelOpen] = useState(false);
    const [selectedWarranty, setSelectedWarranty] = useState<Warranty | null>(null);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [menuRow, setMenuRow] = useState<Warranty | null>(null);

    const [selectionModel, setSelectionModel] = useState<(number | string)[]>([]);
    const [multiSelectMode, setMultiSelectMode] = useState(false);

    const fetchWarranties = useCallback(async (filtersToApply: ActiveFilter[]) => {
        console.log('[WarrantyList] fetchWarranties called. Filters:', filtersToApply);
        setIsLoading(true);
        setError(null);
        try {
            const queryParams = new URLSearchParams();
            filtersToApply.forEach(filter => {
                if (filter.value !== undefined && filter.value !== '' && filter.value !== null) {
                    // Example: field=name&operator=contains&value=test
                    // Adjust the key format based on your backend API's expectation
                    // e.g., queryParams.append(filter.field, filter.value.toString());
                    // or queryParams.append(`${filter.field}[${filter.operator}]`, filter.value.toString());
                    queryParams.append(`${filter.field}[${filter.operator}]`, String(filter.value));
                }
            });

            const endpoint = `/warranties${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            console.log('[WarrantyList] Fetching from endpoint:', endpoint);
            const response = await apiInstance.get(endpoint);

            console.log('[WarrantyList] API Response status:', response.status);
            console.log('[WarrantyList] API Response data (raw):', response.data);

            if (Array.isArray(response.data)) {
                const validWarranties = response.data.filter(item => item != null);
                setWarranties(validWarranties);
            } else {
                console.error('[WarrantyList] API response.data is not an array:', response.data);
                setWarranties([]);
                setError("Received invalid data format from server.");
            }
        } catch (err: any) {
            console.error('[WarrantyList] fetchWarranties - API Error:', err.response || err.message || err);
            setError(err.response?.data?.message || err.message || "Failed to fetch warranties.");
            setWarranties([]);
        } finally {
            setIsLoading(false);
            console.log('[WarrantyList] fetchWarranties finished.');
        }
    }, []);

    useEffect(() => {
        console.log('[WarrantyList] useEffect for appliedFilters/fetchWarranties triggered. Current appliedFilters:', appliedFilters);
        fetchWarranties(appliedFilters);
    }, [appliedFilters, fetchWarranties]);

    useEffect(() => {
        fetchWarranties(activeFilters); // fetchWarranties should use activeFilters directly
    }, [activeFilters, fetchWarranties]);

    const handleRowClick = (warranty: Warranty) => {
        setSelectedWarranty(warranty);
        // Optionally open details panel on row click if not already open, or toggle
        // if (!isDetailsPanelOpen) {
        //     setIsDetailsPanelOpen(true);
        // }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: Warranty) => {
        setAnchorEl(event.currentTarget);
        setMenuRow(row);
        if (!multiSelectMode) {
            setSelectionModel([row.id]); // <-- Set selection to this row
        }
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
        setMenuRow(null);
    };

    // Update selectedWarranty when single row is selected
    useEffect(() => {
        if (selectionModel.length === 1) {
            const selected = warranties.find(w => w.id === selectionModel[0]) || null;
            setSelectedWarranty(selected);
        } else {
            setSelectedWarranty(null);
        }
    }, [selectionModel, warranties]);

    const handleSelectMore = () => {
        setMultiSelectMode(true);
        setSelectionModel([]); // Clear previous selection
        handleMenuClose();
    };

    const columns: GridColDef<Warranty>[] = [
        { field: 'id', headerName: 'ID', width: 90, type: 'number' },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 150, type: 'string' },
        { field: 'productName', headerName: 'Product', flex: 1, minWidth: 150, type: 'string' },
        { field: 'status', headerName: 'Status', width: 120, type: 'string' },
        {
            field: 'duration_months',
            headerName: 'Duration', 
            width: 150,
            type: 'number', 
            valueGetter: (params) => (params && params.row) ? params.row.duration_months : null, 
            renderCell: (params) => {
                const duration = params.value; 
                return duration !== null && duration !== undefined ? `${duration} months` : 'N/A';
            }
        },
        {
            field: 'description',
            headerName: 'Description',
            flex: 1, // Changed from 2 to 1 to match your current code
            minWidth: 200,
            type: 'string',
            valueGetter: (params) => (params && params.row) ? (params.row.description || '-') : '-', 
            // If you want Typography for description as in previous versions:
            // renderCell: (params) => (
            //   <Typography noWrap title={params.value || ''} sx={{overflow: 'hidden', textOverflow: 'ellipsis'}}>
            //       {params.value || '-'}
            //   </Typography>
            // )
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
                <>
                    <IconButton
                        size="small"
                        onClick={(event) => {
                            event.stopPropagation();
                            handleMenuOpen(event, params.row as Warranty);
                        }}
                    >
                        <MoreVertIcon />
                    </IconButton>
                </>
            ),
        },
    ];

    const handleAddNew = () => navigate('/dashboard/warranties/new');

    const handleEditSelected = () => {
        if (selectedWarranty) {
            navigate(`/dashboard/warranties/edit/${selectedWarranty.id}`);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectionModel.length === 0) {
            setFeedback({ message: 'No warranty selected for deletion.', type: 'warning' });
            return;
        }
        if (window.confirm(`Are you sure you want to delete ${selectionModel.length > 1 ? 'these warranties' : 'this warranty'}?`)) {
            try {
                await Promise.all(
                    selectionModel.map(id => apiInstance.delete(`/warranties/${id}`))
                );
                setFeedback({ message: 'Warranty(s) deleted successfully.', type: 'success' });
                setSelectedWarranty(null);
                setIsDetailsPanelOpen(false);
                setSelectionModel([]);
                setMultiSelectMode(false);
                fetchWarranties(appliedFilters); // Refresh list with current filters
            } catch (err: any) {
                setFeedback({ message: err.response?.data?.message || 'Failed to delete warranty.', type: 'error' });
                console.error("Error deleting warranty:", err);
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
        setMenuProps({
            pageTitle: "Manage Warranties",
            breadcrumbs: [{ label: "Dashboard", path: "/dashboard" }, { label: "Warranties" }],
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
            isDeleteActionEnabled: selectionModel.length > 0, // <-- Enable delete for 1 or more
            deleteActionLabel: "Delete",
            deleteActionIcon: <DeleteIcon fontSize="small" />,
            showInfo: true,
            onInfoClick: () => setIsDetailsPanelOpen(prev => !prev),
            isInfoActionEnabled: true,
            actions: [{
                id: 'edit-warranty',
                type: 'button',
                label: 'Edit',
                icon: <EditIcon fontSize="small" />,
                onClick: handleEditSelected,
                disabled: selectionModel.length !== 1, // <-- Only enable edit for exactly one
                variant: 'outlined',
                color: 'inherit',
            }]
        });
        return () => setMenuProps({});
    }, [
        setMenuProps, 
        navigate, 
        isFilterPanelOpen, 
        isDetailsPanelOpen, 
        selectedWarranty,
        appliedFilters,
        selectionModel
    ]);

    // Fetch warranties whenever activeFilters changes (live filtering)
    useEffect(() => {
        fetchWarranties(activeFilters);
    }, [fetchWarranties, activeFilters]);

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

    if (isLoading && warranties.length === 0 && !error) {
        console.log('[WarrantyList] Rendering: Loading state (initial)');
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}> {/* Adjust height if needed */}
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Loading warranties...</Typography>
            </Box>
        );
    }

    if (error && warranties.length === 0) {
        console.log('[WarrantyList] Rendering: Error state');
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px)', p: 3 }}>
                <Alert severity="error" sx={{ width: '100%', maxWidth: '600px', mb: 2 }}>{error}</Alert>
                <Button variant="outlined" onClick={() => fetchWarranties(appliedFilters)}>Try Again</Button>
            </Box>
        );
    }
    
    console.log('[WarrantyList] Rendering: Main content. Warranties count:', warranties.length, 'IsLoading:', isLoading, 'Error:', error);

    const mainContent = (
        <Paper sx={{
            p: 1, // Reduce padding
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxSizing: 'border-box',
            minHeight: 0 // Important for flex layouts
        }}>
            {feedback && <Alert severity={feedback.type} sx={{ mb: 2, flexShrink: 0 }}>{feedback.message}</Alert>}
            {/* Show non-blocking error if data is already present */}
            {error && warranties.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{`Warning: ${error}`}</Alert>}

            <Box sx={{
                flexGrow: 1,
                width: '100%',
                overflow: 'auto',
                position: 'relative',
                minHeight: 0 // Important for flex layouts
            }}>
                {isLoading && ( /* More subtle loading indicator when data is already present */
                    <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }}>
                        <CircularProgress size={24} />
                    </Box>
                )}
                {warranties.length === 0 && !isLoading && !error && (
                     <Alert severity="info" sx={{mt: 2}}>No warranties found matching your criteria.</Alert>
                )}
                {warranties.length > 0 && (
                    <DataGrid
                        rows={warranties}
                        columns={columns}
                        checkboxSelection={multiSelectMode}
                        disableSelectionOnClick
                        selectionModel={selectionModel}
                        onSelectionModelChange={(newSelection) => setSelectionModel(newSelection)}
                        onRowClick={(params) => {
                            if (!multiSelectMode) {
                                handleRowClick(params.row as Warranty);
                                setSelectionModel([params.id]);
                            }
                        }}
                        onRowDoubleClick={(params) => {
                            navigate(`/dashboard/warranties/edit/${params.id}`);
                        }}
                        autoHeight={false} // Important for layout to fill height
                        sx={{ border: 0, '& .MuiDataGrid-virtualScroller': { flexGrow: 1 }, height: '100%' }}
                        density="compact"
                        // loading={isLoading} // Can be redundant if using the absolute positioned CircularProgress
                        // pageSizeOptions={[10, 25, 50]} // MUI X v6+
                        // initialState={{ pagination: { paginationModel: { pageSize: 10 }}}} // MUI X v6+
                    />
                )}
            </Box>
        </Paper>
    );

    return (
        <SidePanelsLayout
            filterPanelOpen={isFilterPanelOpen}
            onFilterPanelClose={() => setIsFilterPanelOpen(false)}
            filterPanelTitle="Filter Warranties"
            filterPanelContent={
                <DynamicFilterPanel
                    activeFilters={activeFilters}
                    onActiveFiltersChange={setActiveFilters}
                    availableFilterFields={WARRANTY_AVAILABLE_FILTER_FIELDS}
                />
            }
            detailsPanelOpen={isDetailsPanelOpen}
            detailsPanelTitle={selectedWarranty ? `Details: ${selectedWarranty.name || 'N/A'}` : "Details"}
            onDetailsPanelClose={() => setIsDetailsPanelOpen(false)}
            detailsPanelContent={<WarrantyDetailsView warranty={selectedWarranty} />}
            mainContentSx={{
                p: 0, // Remove extra padding
                height: 'calc(100vh - 64px)', // Only subtract your top bar height
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
                <MenuItem onClick={() => { setIsDetailsPanelOpen(true); handleMenuClose(); }}>View Details</MenuItem>
                <MenuItem 
                    onClick={() => { handleEditSelected(); handleMenuClose(); }} 
                    disabled={selectionModel.length !== 1}
                >
                    Edit
                </MenuItem>
                <MenuItem 
                    disabled={selectionModel.length === 0}
                    onClick={() => { handleDeleteSelected(); handleMenuClose(); }}
                >
                    Delete
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

export default WarrantyList;