import React, { useState } from 'react';
import { Box, Typography, Button, Paper, IconButton, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { Add as AddIcon, Info as InfoIcon } from '@mui/icons-material';
import { useSecondaryMenu } from '../context/SecondaryMenuContext';

// Dummy data for demonstration
const purchases = [
    { id: 1, supplier: 'ABC Traders', date: '2025-05-01', status: 'Completed', amount: 1000 },
    { id: 2, supplier: 'XYZ Supplies', date: '2025-05-10', status: 'Pending', amount: 500 },
];

const FILTER_FIELDS = [
    { field: 'supplier', label: 'Supplier', type: 'text' },
    { field: 'status', label: 'Status', type: 'select', options: ['Pending', 'Completed', 'Cancelled'] },
    { field: 'date', label: 'Date', type: 'date' },
];

// Filter form to be rendered inside the global FilterDrawer
const PurchaseFilterForm = ({ onApply, initialFilters }) => {
    const [filters, setFilters] = useState(initialFilters || { supplier: '', status: '', date: '' });

    const handleChange = (field, value) => {
        setFilters(prev => ({ ...prev, [field]: value }));
    };

    const handleApply = () => {
        onApply(filters);
    };

    return (
        <Box sx={{ minWidth: 240 }}>
            <TextField
                label="Supplier"
                value={filters.supplier}
                onChange={e => handleChange('supplier', e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
            />
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select
                    label="Status"
                    value={filters.status}
                    onChange={e => handleChange('status', e.target.value)}
                >
                    <MenuItem value="">Any</MenuItem>
                    {FILTER_FIELDS.find(f => f.field === 'status').options.map(opt => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                    ))}
                </Select>
            </FormControl>
            <TextField
                label="Date"
                type="date"
                value={filters.date}
                onChange={e => handleChange('date', e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
            />
            <Button variant="contained" fullWidth sx={{ mt: 2 }} onClick={handleApply}>Apply</Button>
        </Box>
    );
};

// Details view to be rendered inside the global DetailsDrawer
const PurchaseDetailsView = ({ purchase }) => (
    <Box sx={{ minWidth: 240 }}>
        <Typography><b>Supplier:</b> {purchase.supplier}</Typography>
        <Typography><b>Date:</b> {purchase.date}</Typography>
        <Typography><b>Status:</b> {purchase.status}</Typography>
        <Typography><b>Amount:</b> {purchase.amount}</Typography>
    </Box>
);

const PurchaseList: React.FC = () => {
    const [filteredPurchases, setFilteredPurchases] = useState(purchases);
    const [activeFilters, setActiveFilters] = useState({ supplier: '', status: '', date: '' });

    const filterDrawer = useFilterDrawer();
    const detailsDrawer = useDetailsDrawer();
    const { setMenuProps } = useSecondaryMenu();

    const handleOpenFilterDrawer = () => {
        filterDrawer.openDrawer(
            'Filter Purchases',
            <PurchaseFilterForm
                initialFilters={activeFilters}
                onApply={filters => {
                    setActiveFilters(filters);
                    // Apply filters to the list
                    let filtered = purchases;
                    if (filters.supplier) filtered = filtered.filter(p => p.supplier.toLowerCase().includes(filters.supplier.toLowerCase()));
                    if (filters.status) filtered = filtered.filter(p => p.status === filters.status);
                    if (filters.date) filtered = filtered.filter(p => p.date === filters.date);
                    setFilteredPurchases(filtered);
                    filterDrawer.closeDrawer();
                }}
            />
        );
    };

    const handleOpenDetailsDrawer = (purchase) => {
        detailsDrawer.openDrawer(
            `Purchase Details`,
            <PurchaseDetailsView purchase={purchase} />
        );
    };

    React.useEffect(() => {
        setMenuProps({
            pageTitle: 'Purchases',
            showFilter: true,
            isFilterSidebarVisible: filterDrawer.isOpen,
            toggleFilterSidebar: handleOpenFilterDrawer,
            // Optionally add other menuProps as needed
        });
    }, [setMenuProps, filterDrawer.isOpen]);

    return (
        <Box sx={{ p: 3, position: 'relative', height: '100%' }}>
            <Typography variant="h4" gutterBottom>
                Purchases
            </Typography>
            <Button
                variant="outlined"
                startIcon={<AddIcon />}
                sx={{ mb: 2, mr: 2 }}
                onClick={handleOpenFilterDrawer}
            >
                Filter
            </Button>
            <Box sx={{ mt: 2 }}>
                {filteredPurchases.map(p => (
                    <Paper key={p.id} sx={{ p: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            <Typography><b>{p.supplier}</b></Typography>
                            <Typography variant="body2" color="text.secondary">{p.date} | {p.status}</Typography>
                        </Box>
                        <Button
                            variant="text"
                            startIcon={<InfoIcon />}
                            onClick={() => handleOpenDetailsDrawer(p)}
                        >
                            Details
                        </Button>
                    </Paper>
                ))}
            </Box>
        </Box>
    );
};

export default PurchaseList;