import React, { useState } from 'react';
import { Box, Button, Menu, MenuItem, TextField, Select, FormControl, InputLabel, IconButton, Typography, Paper } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

import { FilterFieldDefinition, ActiveFilter } from './EntityFilterPanel';

interface Props {
    activeFilters: ActiveFilter[];
    onActiveFiltersChange: (filters: ActiveFilter[]) => void;
    availableFilterFields: FilterFieldDefinition[];
    onApplyFilters: () => void;
}

const getOperatorsForType = (type: FilterFieldDefinition['type']) => {
    switch (type) {
        case 'text':
            return [{ value: 'contains', label: 'Contains' }, { value: 'equals', label: 'Equals' }];
        case 'number':
            return [{ value: 'equals', label: '=' }, { value: 'gt', label: '>' }, { value: 'lt', label: '<' }];
        case 'select':
            return [{ value: 'equals', label: 'Is' }, { value: 'notEquals', label: 'Is not' }];
        default:
            return [{ value: 'equals', label: 'Equals' }];
    }
};

const EntityFilterPanel: React.FC<Props> = ({
    activeFilters,
    onActiveFiltersChange,
    availableFilterFields,
}) => {
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Only show fields not already filtered
    const availableFieldsForAdd = availableFilterFields.filter(
        f => !activeFilters.some(af => af.field === f.value)
    );

    const handleAddFilterClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleFieldSelect = (fieldValue: string) => {
        const fieldDef = availableFilterFields.find(f => f.value === fieldValue);
        if (!fieldDef) return;
        const operator = getOperatorsForType(fieldDef.type)[0].value;
        onActiveFiltersChange([
            ...activeFilters,
            {
                id: Date.now().toString(),
                field: fieldDef.value,
                operator,
                value: '',
            },
        ]);
        setAnchorEl(null);
    };

    const handleRemoveFilter = (id: string) => {
        onActiveFiltersChange(activeFilters.filter(f => f.id !== id));
    };

    const handleFilterChange = (id: string, part: 'operator' | 'value', value: any) => {
        onActiveFiltersChange(
            activeFilters.map(f =>
                f.id === id ? { ...f, [part]: value } : f
            )
        );
    };

    return (
        <Box sx={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            p: 1,
            height: '100%',
            minHeight: 0,
            overflow: 'auto'
        }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Filter list by:</Typography>
            {activeFilters.map((filter) => {
                const fieldDef = availableFilterFields.find(f => f.value === filter.field);
                if (!fieldDef) return null;
                const operators = getOperatorsForType(fieldDef.type);

                return (
                    <Paper key={filter.id} sx={{
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        boxShadow: 0,
                        border: '1px solid',
                        borderColor: 'divider',
                        background: 'background.paper',
                        position: 'relative'
                    }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{fieldDef.label}</Typography>
                            <IconButton size="small" onClick={() => handleRemoveFilter(filter.id)}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {fieldDef.type === 'select' && fieldDef.options ? (
                                <FormControl size="small" sx={{ minWidth: 120, flex: 1 }}>
                                    <InputLabel>Value</InputLabel>
                                    <Select
                                        label="Value"
                                        value={filter.value}
                                        onChange={e => handleFilterChange(filter.id, 'value', e.target.value)}
                                    >
                                        {fieldDef.options.map(opt =>
                                            typeof opt === 'string'
                                                ? <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                                : <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                        )}
                                    </Select>
                                </FormControl>
                            ) : (
                                <TextField
                                    size="small"
                                    label="Value"
                                    value={filter.value}
                                    onChange={e => handleFilterChange(filter.id, 'value', e.target.value)}
                                    sx={{ flex: 1 }}
                                />
                            )}
                        </Box>
                    </Paper>
                );
            })}

            {/* Add Filter Button and Menu */}
            <Box>
                {availableFieldsForAdd.length > 0 && (
                    <>
                        <Button
                            startIcon={<AddIcon />}
                            onClick={handleAddFilterClick}
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1 }}
                        >
                            Filter...
                        </Button>
                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                        >
                            {availableFieldsForAdd.map(field => (
                                <MenuItem key={field.value} onClick={() => handleFieldSelect(field.value)}>
                                    {field.label}
                                </MenuItem>
                            ))}
                        </Menu>
                    </>
                )}
            </Box>
        </Box>
    );
};

export default EntityFilterPanel;