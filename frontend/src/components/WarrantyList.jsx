import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Paper, Typography, Box, Alert, CircularProgress, Button, IconButton, Divider 
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import { Add as AddIcon, DeleteOutline as DeleteIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close'; // Uncommented this line

import apiInstance from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';
import { useFilterDrawer } from '../context/FilterDrawerContext';
import { useDetailsDrawer } from '../context/DetailsDrawerContext';

import GenericFilterForm from './GenericFilterForm';
import WarrantyDetailsView from './WarrantyDetailsView';

const WARRANTY_FILTERABLE_FIELDS = [
    { field: 'name', id: 'name_filter', label: 'Name', type: 'text' },
    { field: 'productName', id: 'productName_filter', label: 'Product Name', type: 'text' },
    { field: 'status', id: 'status_filter', label: 'Status', type: 'select', options: ['Active', 'Expired', 'Pending'] },
    { field: 'duration_months', id: 'duration_months_filter', label: 'Duration (Months)', type: 'number' },
    { field: 'description', id: 'description_filter', label: 'Description', type: 'text' },
];

// ... WarrantyListMainContent component definition remains the same ...
// (Assuming WarrantyListMainContent is defined as in your provided code, it's self-contained and doesn't need changes for this fix)
const WarrantyListMainContent = ({
    authLoading, 
    isLoading: parentIsLoading,
    pageError: parentPageError,
    warranties: parentWarranties,
    feedback = { message: '', type: '' },
    isAuthenticated, 
    userCan,         
    onViewDetails,
    onRowClick,
    onEditRow,
    onDeleteRow,
    activeFiltersFromParent,
    onSelectRow, // <-- Add this prop
}) => {
    const [warranties, setWarranties] = useState(Array.isArray(parentWarranties) ? parentWarranties : []);
    const [isLoading, setIsLoading] = useState(parentIsLoading || false);
    const [pageError, setLocalPageError] = useState(parentPageError || null);

    // Add selection model state
    const [multiSelectMode, setMultiSelectMode] = useState(false);
    const [selectionModel, setSelectionModel] = useState([]);

    useEffect(() => {
        setWarranties(Array.isArray(parentWarranties) ? parentWarranties : []);
    }, [parentWarranties]);

    useEffect(() => {
        setIsLoading(parentIsLoading);
    }, [parentIsLoading]);

    useEffect(() => {
        setLocalPageError(parentPageError);
    }, [parentPageError]);

    // Call parent when selection changes
    useEffect(() => {
        if (onSelectRow) {
            const selectedRow = warranties.find(w => w.id === selectionModel[0]);
            onSelectRow(selectedRow || null);
        }
    }, [selectionModel, warranties, onSelectRow]);

    const columns = [
        { field: 'id', headerName: 'ID', width: 90 },
        {
            field: 'actions',
            type: 'actions',
            headerName: '',
            width: 50,
            cellClassName: 'actions',
            getActions: (params) => {
                const menuActions = [];
                const placeholderIcon = <Box component="span" sx={{ width: 20, height: 20 }} />;

                if (isAuthenticated && userCan && userCan('warranty:read') && onViewDetails) {
                    menuActions.push(
                        <GridActionsCellItem
                            key={`view-${params.id}`}
                            icon={placeholderIcon}
                            label="View Details"
                            onClick={() => onViewDetails(params.row)}
                            showInMenu
                        />
                    );
                }
                if (isAuthenticated && userCan && userCan('warranty:update') && onEditRow) {
                     menuActions.push(
                        <GridActionsCellItem
                            key={`edit-${params.id}`}
                            icon={placeholderIcon}
                            label="Edit"
                            onClick={() => onEditRow(params.row)}
                            showInMenu
                        />
                    );
                }
                if (isAuthenticated && userCan && userCan('warranty:delete') && onDeleteRow) {
                    menuActions.push(
                        <GridActionsCellItem
                            key={`delete-${params.id}`}
                            icon={placeholderIcon}
                            label="Delete"
                            onClick={() => onDeleteRow(params.row)}
                            showInMenu
                        />
                    );
                }
                // Add "Select More" only if not already in multi-select mode
                if (!multiSelectMode) {
                    menuActions.push(
                        <GridActionsCellItem
                            key={`select-more-${params.id}`}
                            icon={<AddIcon fontSize="small" />}
                            label="Select More"
                            onClick={() => setMultiSelectMode(true)}
                            showInMenu
                        />
                    );
                }
                return menuActions;
            }
        },
        { field: 'name', headerName: 'Name', width: 200, flex: 1 },
        { field: 'productName', headerName: 'Product Name', width: 200, flex: 1 },
        { field: 'status', headerName: 'Status', width: 120 },
        { field: 'duration_months', headerName: 'Duration (Months)', type: 'number', width: 150 },
        {
            field: 'description',
            headerName: 'Description',
            width: 250,
            flex: 2,
            renderCell: (params) => (
                <Typography noWrap title={params.value || ''}>
                    {params.value || '-'}
                </Typography>
            )
        },
    ];

    const handleGridRowClick = (params) => {
        if (onRowClick) {
            onRowClick(params.row); // Only select, do not open drawer
        }
    };

    const handleGridRowDoubleClick = (params) => {
        if (isAuthenticated && userCan && userCan('warranty:update') && onEditRow) {
            onEditRow(params.row);
        }
    };

    const handleRowClick = (params) => {
        if (!multiSelectMode) {
            setSelectedWarranty(params.row);
            setSelectionModel([params.row.id]);
        }
        // If in multi-select mode, let checkboxes handle selection
    };

    const handleSelectMore = () => setMultiSelectMode(true);
    const handleCancelMultiSelect = () => {
        setMultiSelectMode(false);
        setSelectionModel([]);
    };

    useEffect(() => {
        if (!multiSelectMode) return;

        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                setMultiSelectMode(false);
                setSelectionModel([]);
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [multiSelectMode]);

    return (
        <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, m: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {feedback.message && (
                <Alert severity={feedback.type === 'error' ? 'error' : 'success'} sx={{ mb: 2, flexShrink: 0 }}>
                    {feedback.message}
                </Alert>
            )}
            {pageError && warranties.length > 0 && ( // Changed from parentWarranties to warranties
                <Alert severity="warning" sx={{ mb: 2, width: '100%', flexShrink: 0 }}>
                    {`Warning: ${pageError}`}
                </Alert>
            )}
            {isLoading && warranties.length === 0 && !pageError && ( // Changed from parentWarranties to warranties
                 <Box sx={{ display: 'flex', justifyContent: 'center', p: 3, flexGrow: 1, alignItems: 'center' }}><CircularProgress /></Box>
            )}
            {!isLoading && warranties.length === 0 && !pageError && ( // Changed from parentWarranties to warranties
                <Alert severity="info" sx={{ textAlign: 'center', mb: 2, flexShrink: 0 }}>
                    No warranties found. {activeFiltersFromParent && activeFiltersFromParent.length > 0 && "Try adjusting your filters."}
                </Alert>
            )}
            {pageError && warranties.length === 0 && ( // Changed from parentWarranties to warranties
                <Alert severity="error" sx={{ mb: 2 }}>{`Error: ${pageError}`}</Alert>
            )}
            {warranties.length > 0 && ( // Changed from parentWarranties to warranties
                <Box sx={{ flexGrow: 1, width: '100%', overflow: 'hidden' }}>
                     <DataGrid
                        rows={warranties} // Use local warranties state
                        columns={columns}
                        loading={isLoading} // Use local isLoading state
                        pageSizeOptions={[5, 10, 25, 50]}
                        initialState={{
                            pagination: { paginationModel: { pageSize: 10 } },
                        }}
                        autoHeight={false} 
                        onRowClick={handleGridRowClick}
                        onRowDoubleClick={handleGridRowDoubleClick}
                        // Add these lines:
                        checkboxSelection={multiSelectMode}
                        selectionModel={selectionModel}
                        onSelectionModelChange={setSelectionModel}
                        sx={{
                            border: 0,
                            '& .MuiDataGrid-columnHeaders': {
                                backgroundColor: (theme) => theme.palette.action.hover,
                                fontWeight: 'bold',
                            },
                            '& .MuiDataGrid-virtualScroller': {
                                flexGrow: 1,
                            },
                            height: '100%' 
                        }}
                    />
                </Box>
            )}
        </Paper>
    );
};


const WarrantyListView = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, isLoading: authLoading, userCan } = useAuth();
    const { setMenuProps } = useSecondaryMenu();
    const filterDrawer = useFilterDrawer();
    const detailsDrawer = useDetailsDrawer();

    const [warranties, setWarrantiesData] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [dataError, setDataError] = useState(null);
    const [activeFilters, setActiveFilters] = useState([]);
    const [feedback, setFeedback] = useState({ message: '', type: '' });
    const [selectedWarranty, setSelectedWarranty] = useState(null);

    const fetchWarranties = useCallback(async (filtersToApply = []) => {
        setIsLoadingData(true);
        setDataError(null);
        try {
            const queryParams = new URLSearchParams();
            filtersToApply.forEach(filter => {
                if (filter.value !== undefined && filter.value !== '' && filter.field) {
                    const fieldKey = filter.field;
                    queryParams.append(`${fieldKey}[${filter.operator || 'eq'}]`, filter.value);
                }
            });
            const endpoint = `/warranties${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
            const response = await apiInstance.get(endpoint);
            setWarrantiesData(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            setDataError(error.response?.data?.message || 'Failed to fetch warranties.');
            setWarrantiesData([]);
        } finally {
            setIsLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchWarranties(activeFilters);
        } else if (!authLoading) {
            setWarrantiesData([]);
            setIsLoadingData(false);
        }
    }, [fetchWarranties, activeFilters, isAuthenticated, authLoading]);
    
    useEffect(() => {
        if (location.state?.message && location.state?.type) {
            setFeedback({ message: location.state.message, type: location.state.type });
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);

    // Add this effect to auto-clear feedback
    useEffect(() => {
        if (feedback.message) {
            const timer = setTimeout(() => {
                setFeedback({ message: '', type: '' });
            }, 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback.message]);

    const handleApplyFiltersFromPanel = useCallback((appliedFiltersFromForm) => {
        const filtersForApi = appliedFiltersFromForm.map(criterion => {
            const fieldDefinition = WARRANTY_FILTERABLE_FIELDS.find(f => f.id === criterion.fieldId);
            return {
                ...criterion,
                field: fieldDefinition ? fieldDefinition.field : criterion.fieldId,
            };
        });
        setActiveFilters(filtersForApi);
        // The global FilterDrawer.jsx handles its own closure if needed, or user closes it.
    }, [/* WARRANTY_FILTERABLE_FIELDS */]);

    const handleRowOrViewDetailsClick = useCallback((warranty) => {
        setSelectedWarranty(warranty);
        if (warranty) {
            // This will open the global DetailsDrawer and set its content
            detailsDrawer.openDrawer(
                `Details: ${warranty.name || 'Warranty'}`,
                <WarrantyDetailsView warranty={warranty} />
            );
        } else {
            setSelectedWarranty(null);
            detailsDrawer.openDrawer( // Open with a default message if no warranty
                 "Information",
                 <Box sx={{ p: 2 }}><Typography>Select an item to view details.</Typography></Box>
            );
        }
    }, [detailsDrawer, setSelectedWarranty]); // detailsDrawer context is stable

    const handleEditRow = useCallback((warranty) => {
        if (warranty && warranty.id) {
            navigate(`/dashboard/warranties/edit/${warranty.id}`);
        }
    }, [navigate]);

    const handleDeleteRow = useCallback(async (warrantyToDeleteInput) => {
        const warrantyToDelete = warrantyToDeleteInput || selectedWarranty;
        if (!warrantyToDelete) {
            setFeedback({ message: "No warranty selected for deletion.", type: 'warning' });
            setTimeout(() => setFeedback({ message: '', type: '' }), 4000); // 4 seconds
            return;
        }
        if (!window.confirm(`Are you sure you want to delete warranty "${warrantyToDelete.name}"?`)) return;
        if (!(isAuthenticated && userCan && userCan('warranty:delete'))) {
            setFeedback({ message: "You don't have permission to delete warranties.", type: 'error'});
            return;
        }
        try {
            await apiInstance.delete(`/warranties/${warrantyToDelete.id}`);
            setFeedback({ message: 'Warranty deleted successfully.', type: 'success' });
            setTimeout(() => setFeedback({ message: '', type: '' }), 4000); // 4 seconds
            if (selectedWarranty && selectedWarranty.id === warrantyToDelete.id) {
                setSelectedWarranty(null);
                if (detailsDrawer.isOpen) detailsDrawer.closeDrawer(); // Close global details drawer
            }
            fetchWarranties(activeFilters);
        } catch (error) {
            setFeedback({ message: error.response?.data?.message || "Failed to delete warranty.", type: 'error'});
            setTimeout(() => setFeedback({ message: '', type: '' }), 4000); // 4 seconds
        }
    }, [isAuthenticated, userCan, selectedWarranty, detailsDrawer, fetchWarranties, activeFilters]);

    useEffect(() => {
        const isAnItemSelected = !!selectedWarranty;

        const handleDeleteSelected = () => {
            if (selectedWarranty) handleDeleteRow(selectedWarranty);
            else setFeedback({ message: "No warranty selected for deletion.", type: 'warning' });
            setTimeout(() => setFeedback({ message: '', type: '' }), 4000); // 4 seconds
        };
        
        const toggleFilterDrawerState = () => {
            if (filterDrawer.isOpen) {
                filterDrawer.closeDrawer();
            } else {
                const initialCriteriaForForm = activeFilters.map(criterion => {
                    const fieldDefinition = WARRANTY_FILTERABLE_FIELDS.find(f => f.field === criterion.field);
                    return {
                        ...criterion,
                        fieldId: fieldDefinition ? fieldDefinition.id : criterion.field,
                    };
                });
                filterDrawer.openDrawer(
                    "Filter Warranties",
                    <GenericFilterForm
                        initialCriteria={initialCriteriaForForm}
                        onApply={handleApplyFiltersFromPanel}
                        filterableFields={WARRANTY_FILTERABLE_FIELDS}
                        entityName="Warranties"
                        isDrawerOpen={true} // <-- Add this line
                    />
                );
            }
        };

        const toggleDetailsDrawerState = () => {
            if (detailsDrawer.isOpen) {
                detailsDrawer.closeDrawer();
            } else {
                if (selectedWarranty) {
                    detailsDrawer.openDrawer(
                        `Details: ${selectedWarranty.name || 'Warranty'}`,
                        <WarrantyDetailsView warranty={selectedWarranty} />
                    );
                } else {
                    detailsDrawer.openDrawer(
                        "Information",
                        <Box sx={{ p: 2 }}><Typography>Select an item from the list to view its details.</Typography></Box>
                    );
                }
            }
        };

        setMenuProps({
            pageTitle: "Manage Warranties",
            showFilter: true,
            isFilterSidebarVisible: filterDrawer.isOpen,
            toggleFilterSidebar: toggleFilterDrawerState,
            
            showNewAction: true,
            newActionLabel: '+New',
            newActionIcon: <AddIcon fontSize="small" />,
            onNewActionClick: () => navigate('/dashboard/warranties/new'),
            isNewActionEnabled: isAuthenticated && userCan && userCan('warranty:create'),

            showDeleteAction: true,
            deleteActionLabel: 'Delete',
            deleteActionIcon: <DeleteIcon fontSize="small" />,
            onDeleteActionClick: handleDeleteSelected,
            isDeleteActionEnabled: isAnItemSelected && isAuthenticated && userCan && userCan('warranty:delete'),

            showSearchAction: true,
            searchPlaceholder: 'Search warranties...',
            onSearchSubmit: (searchText) => {
                const nameFieldDef = WARRANTY_FILTERABLE_FIELDS.find(f => f.label === 'Name'); // Assuming 'Name' label maps to 'name' field
                const searchFilter = { 
                    field: nameFieldDef ? nameFieldDef.field : 'name', 
                    operator: 'contains', 
                    value: searchText, 
                    id: `search-${nameFieldDef ? nameFieldDef.id : 'name_filter'}` // Unique ID for the filter item
                };
                setActiveFilters(prev => {
                    const otherFilters = prev.filter(f => !(f.field === searchFilter.field && f.operator === 'contains'));
                    return searchText ? [...otherFilters, searchFilter] : otherFilters;
                });
            },
            initialSearchText: activeFilters.find(f => f.field === (WARRANTY_FILTERABLE_FIELDS.find(fld => fld.label === 'Name')?.field || 'name') && f.operator === 'contains')?.value || '',

            showInfo: true,
            isInfoActionEnabled: true,
            onInfoClick: toggleDetailsDrawerState,
            
            breadcrumbs: [{ label: "Dashboard", path: "/dashboard" }, { label: "Warranties" }],
            actions: [] 
        });
    }, [
        setMenuProps, 
        filterDrawer.isOpen, filterDrawer.openDrawer, filterDrawer.closeDrawer,
        detailsDrawer.isOpen, detailsDrawer.openDrawer, detailsDrawer.closeDrawer,
        navigate, isAuthenticated, userCan, selectedWarranty, activeFilters, 
        handleApplyFiltersFromPanel, handleDeleteRow
    ]);
    
    useEffect(() => {
        // If the details drawer is open and selectedWarranty changes, update the drawer content
        if (detailsDrawer.isOpen && selectedWarranty) {
            detailsDrawer.openDrawer(
                `Details: ${selectedWarranty.name || 'Warranty'}`,
                <WarrantyDetailsView warranty={selectedWarranty} />
            );
        }
    }, [selectedWarranty, detailsDrawer]);
    
    if (authLoading && !isAuthenticated) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }
    if (!authLoading && !isAuthenticated) {
        navigate('/login');
        return null; 
    }
    
    const INLINE_FILTER_PANEL_WIDTH = 280;
    const INLINE_DETAILS_PANEL_WIDTH = 320;

    // The main Box for WarrantyListView. It no longer renders inline panels.
    // It provides a container for WarrantyListMainContent.
    // The global FilterDrawer and DetailsDrawer will be positioned by the main app layout.
    return (
        <Box sx={{ 
            flexGrow: 1, 
            display: 'flex',
            flexDirection: 'column',
            height: '100%', 
            overflow: 'hidden',
        }}>
            <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
                {/* Inline Filter Panel */}
                {filterDrawer.isOpen && (
                    <Paper
                        elevation={3}
                        sx={{
                            width: INLINE_FILTER_PANEL_WIDTH,
                            flexShrink: 0,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
                            zIndex: 1,
                        }}
                    >
                        <Box sx={{
                            p: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                            flexShrink: 0,
                        }}>
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'medium', ml: 1 }}>
                                {filterDrawer.title || 'Filters'}
                            </Typography>
                            <IconButton onClick={filterDrawer.closeDrawer} size="small">
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
                            {React.isValidElement(filterDrawer.content)
                                ? React.cloneElement(filterDrawer.content, { isDrawerOpen: filterDrawer.isOpen })
                                : filterDrawer.content}
                        </Box>
                    </Paper>
                )}

                {/* Main Content Area */}
                <Box sx={{
                    flexGrow: 1,
                    width: 0,
                    transition: 'margin 0.3s',
                    height: '100%',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <WarrantyListMainContent
                        authLoading={authLoading}
                        isLoading={isLoadingData}
                        pageError={dataError}
                        warranties={warranties}
                        feedback={feedback}
                        isAuthenticated={isAuthenticated}
                        userCan={userCan}
                        onViewDetails={handleRowOrViewDetailsClick}
                        onRowClick={setSelectedWarranty} // <-- Only select row, do not open drawer
                        onEditRow={handleEditRow}
                        onDeleteRow={handleDeleteRow}
                        activeFiltersFromParent={activeFilters}
                        onSelectRow={setSelectedWarranty}
                    />
                </Box>

                {/* Inline Details/Info Panel */}
                {detailsDrawer.isOpen && (
                    <Paper
                        elevation={3}
                        sx={{
                            width: INLINE_DETAILS_PANEL_WIDTH,
                            flexShrink: 0,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderLeft: (theme) => `1px solid ${theme.palette.divider}`,
                            zIndex: 1,
                        }}
                    >
                        <Box sx={{
                            p: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                            flexShrink: 0,
                        }}>
                            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 'medium', ml: 1 }}>
                                {detailsDrawer.title || 'Information'}
                            </Typography>
                            <IconButton onClick={detailsDrawer.closeDrawer} size="small">
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
                            {detailsDrawer.content}
                        </Box>
                    </Paper>
                )}
            </Box>
        </Box>
    );
};

export default WarrantyListView;