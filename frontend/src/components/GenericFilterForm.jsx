import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    IconButton,
    Typography,
    Menu,
    MenuItem,
    Paper,
    Button,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

const FilterCriterionRow = ({ criterion, index, onUpdate, onRemove, filterableFields }) => {
    const fieldDefinition = filterableFields.find(f => f.id === criterion.fieldId);

    const handleValueChange = (event) => {
        onUpdate(index, { ...criterion, value: event.target.value });
    };

    return (
        <Paper elevation={0} variant="outlined" sx={{ p: 1.5, mb: 1.5, position: 'relative' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 'medium', color: 'text.secondary' }}>
                    {fieldDefinition?.label || criterion.fieldId.replace(/_/g, ' ')}
                </Typography>
                <IconButton
                    onClick={() => onRemove(index)}
                    size="small"
                    color="inherit"
                    aria-label="remove filter criterion"
                    sx={{ p: 0.25 }}
                >
                    <RemoveCircleOutlineIcon fontSize="small" />
                </IconButton>
            </Box>
            <TextField
                variant="outlined"
                size="small"
                fullWidth
                type={fieldDefinition?.type || 'text'}
                value={criterion.value}
                onChange={handleValueChange}
                placeholder={`Filter by ${fieldDefinition?.label || criterion.fieldId}`}
            />
        </Paper>
    );
};

const GenericFilterForm = ({
    initialCriteria = [],
    onApply,
    filterableFields,
    entityName,
    isDrawerOpen
}) => {
    const [criteria, setCriteria] = useState(initialCriteria);
    const [anchorEl, setAnchorEl] = useState(null);

    // Reset criteria when drawer is opened or initialCriteria changes
    useEffect(() => {
        setCriteria(initialCriteria);
    }, [isDrawerOpen, initialCriteria]);

    // Real-time apply on criteria change
    useEffect(() => {
        const criteriaToApply = criteria.filter(c => String(c.value).trim() !== '');
        onApply(criteriaToApply);
    }, [criteria, onApply]);

    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    const handleAddField = (fieldId) => {
        setCriteria(prev => [
            ...prev,
            {
                id: `criterion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                fieldId: fieldId,
                value: '',
            }
        ]);
        handleMenuClose();
    };

    const updateCriterion = (index, updatedCriterionItem) => {
        setCriteria(prev =>
            prev.map((c, i) => (i === index ? updatedCriterionItem : c))
        );
    };

    const removeCriterion = (index) => {
        setCriteria(prev => prev.filter((_, i) => i !== index));
    };

    if (!filterableFields || filterableFields.length === 0) {
        return (
            <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography color="error">Filter configuration is missing or empty.</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>Please provide 'filterableFields' prop.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Typography variant="overline" display="block" gutterBottom sx={{ color: 'text.secondary' }}>
                Filter {entityName} by:
            </Typography>

            {criteria.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mt: 2, mb: 2 }}>
                    No filters added. Click "+ Filter..." to begin.
                </Typography>
            )}

            {criteria.map((criterion, index) => (
                <FilterCriterionRow
                    key={criterion.id}
                    criterion={criterion}
                    index={index}
                    onUpdate={updateCriterion}
                    onRemove={removeCriterion}
                    filterableFields={filterableFields}
                />
            ))}

            <Button
                id="add-filter-button"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleMenuOpen}
                aria-controls="add-filter-menu"
                aria-haspopup="true"
                sx={{ mt: criteria.length > 0 ? 1.5 : 0.5, textTransform: 'none', justifyContent: 'flex-start' }}
                fullWidth
                variant="text"
            >
                + Filter...
            </Button>
            <Menu
                id="add-filter-menu"
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                MenuListProps={{ 'aria-labelledby': 'add-filter-button' }}
                PaperProps={{ style: { maxHeight: 300 } }}
            >
                {filterableFields.map((field) => (
                    <MenuItem key={field.id} onClick={() => handleAddField(field.id)}>
                        {field.label}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
};

export default GenericFilterForm;