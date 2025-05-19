import React from 'react';
import {
    Box, Typography, Button, TextField, FormControl, InputLabel,
    Select, MenuItem, Grid, Paper, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, IconButton, Checkbox,
    FormControlLabel, Alert, CircularProgress
} from '@mui/material';
import { FaTrashAlt, FaPlus } from 'react-icons/fa';

function ItemUnitConfigurationFields({
    // ItemId, // Not directly used in this component's rendering logic, but passed to handlers
    ItemUnits = [],
    newUnitConfig,
    onNewUnitConfigChange,
    onAddUnitConfig, // This will be handleAddLocalUnitConfig (new) or handleAddUnitConfigAPI (edit)
    onDeleteUnitConfig, // This will be handleDeleteLocalUnitConfig (new) or handleDeleteUnitConfigAPI (edit)
    units = [],
    baseUnitId,
    loadingUnitConfig,
    unitConfigError,
    setUnitConfigError,
    unitConfigFeedback,
    setUnitConfigFeedback,
    commonFormControlSx,
    isAuthenticated // To ensure component doesn't render if not auth
}) {

    if (!isAuthenticated) {
        return null; // Don't render if not authenticated
    }

    const baseUnitName = units.find(u => u.id?.toString() === baseUnitId?.toString())?.name || 'Base Unit';

    const handleAddClick = (e) => {
        // This wrapper ensures event is passed if onAddUnitConfig expects it (like handleAddLocalUnitConfig)
        // For API calls that don't need event, it's harmless.
        onAddUnitConfig(e);
    };
    
    return (
        <Paper sx={{ p: 2, mt: 2, mb:2, border: '1px solid', borderColor: 'divider', borderRadius:1 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Item Unit Configurations</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Define alternative units (e.g., Box, Case) and their conversion factor relative to the <strong>{baseUnitName}</strong>.
                The base unit itself must be added here with a factor of 1.
            </Typography>

            {unitConfigError && <Alert severity="error" onClose={() => setUnitConfigError(null)} sx={{ mb: 2 }}>{unitConfigError}</Alert>}
            {unitConfigFeedback && <Alert severity="success" onClose={() => setUnitConfigFeedback('')} sx={{ mb: 2 }}>{unitConfigFeedback}</Alert>}

            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth variant="outlined" sx={commonFormControlSx} required size="small">
                            <InputLabel id="new-unit-id-label">Unit</InputLabel>
                            <Select
                                labelId="new-unit-id-label"
                                id="new_unit_id"
                                name="unit_id"
                                value={newUnitConfig.unit_id}
                                onChange={onNewUnitConfigChange}
                                label="Unit"
                            >
                                <MenuItem value=""><em>-- Select Unit --</em></MenuItem>
                                {units.map(unit => (
                                    <MenuItem key={`unit-opt-${unit.id}`} value={unit.id.toString()}>
                                        {unit.name} ({unit.short_name})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            label={`Factor (to ${baseUnitName})`}
                            name="conversion_factor"
                            type="number"
                            value={newUnitConfig.conversion_factor}
                            onChange={onNewUnitConfigChange}
                            fullWidth
                            required
                            InputProps={{ inputProps: { min: 0.000001, step: "any" } }}
                            sx={commonFormControlSx}
                            size="small"
                            helperText="e.g., if 1 Case = 12 Pieces, enter 12"
                        />
                    </Grid>
                    <Grid item xs={6} sm={3} md={1.5} sx={{ display: 'flex', alignItems: 'center', justifyContent:'center' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newUnitConfig.is_purchase_unit}
                                    onChange={onNewUnitConfigChange}
                                    name="is_purchase_unit"
                                    size="small"
                                />
                            }
                            label="Purchase?"
                        />
                    </Grid>
                    <Grid item xs={6} sm={3} md={1.5} sx={{ display: 'flex', alignItems: 'center', justifyContent:'center' }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newUnitConfig.is_sales_unit}
                                    onChange={onNewUnitConfigChange}
                                    name="is_sales_unit"
                                    size="small"
                                />
                            }
                            label="Sales?"
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            type="button"
                            onClick={handleAddClick}
                            variant="contained"
                            color="primary"
                            startIcon={loadingUnitConfig ? <CircularProgress size={20} color="inherit" /> : <FaPlus />}
                            disabled={loadingUnitConfig || !newUnitConfig.unit_id || !newUnitConfig.conversion_factor}
                            fullWidth
                            sx={{ height: '40px' }} // Match small TextField height
                        >
                            Add Unit
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            {ItemUnits.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{mt:1}}>
                    <Table size="small" aria-label="configured units table">
                        <TableHead sx={{backgroundColor: 'grey.100'}}>
                            <TableRow>
                                <TableCell>Configured Unit</TableCell>
                                <TableCell align="right">Factor (to {baseUnitName})</TableCell>
                                <TableCell align="center">Purchase</TableCell>
                                <TableCell align="center">Sales</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ItemUnits.map((pu) => (
                                <TableRow key={pu.id} hover>
                                    <TableCell component="th" scope="row">
                                        {pu.unit_name || units.find(u => u.id?.toString() === pu.unit_id?.toString())?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell align="right">{pu.conversion_factor}</TableCell>
                                    <TableCell align="center">{pu.is_purchase_unit ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="center">{pu.is_sales_unit ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => onDeleteUnitConfig(pu.id, pu.unit_name || 'this unit')}
                                            color="error"
                                            size="small"
                                            disabled={loadingUnitConfig}
                                            aria-label={`Delete unit ${pu.unit_name}`}
                                        >
                                            <FaTrashAlt />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            {ItemUnits.length === 0 && !loadingUnitConfig && (
                <Typography sx={{textAlign: 'center', p:2, color: 'text.secondary', fontStyle: 'italic'}}>
                    No alternative unit configurations defined yet.
                </Typography>
            )}
        </Paper>
    );
}

export default ItemUnitConfigurationFields;