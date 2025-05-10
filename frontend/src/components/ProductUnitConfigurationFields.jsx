import React from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Checkbox,
    FormControlLabel,
    Alert,
    CircularProgress
} from '@mui/material';
import { FaTrashAlt, FaPlus } from 'react-icons/fa'; // Or use MUI icons

// This component will receive props from ProductForm.jsx, such as:
// productId, productUnits, newUnitConfig, onNewUnitConfigChange,
// onAddUnitConfig, onDeleteUnitConfig, units, baseUnitId,
// loadingUnitConfig, unitConfigError, setUnitConfigError,
// unitConfigFeedback, setUnitConfigFeedback, commonFormControlSx, isAuthenticated

function ProductUnitConfigurationFields({
    productId,
    productUnits = [],
    newUnitConfig,
    onNewUnitConfigChange,
    onAddUnitConfig,
    onDeleteUnitConfig,
    units = [],
    baseUnitId,
    loadingUnitConfig,
    unitConfigError,
    setUnitConfigError, // Function to set error
    unitConfigFeedback,
    setUnitConfigFeedback, // Function to set feedback
    commonFormControlSx,
    isAuthenticated
}) {

    if (!isAuthenticated || !productId) { // Only show if editing an existing product
        return null;
    }

    const baseUnitName = units.find(u => u.id?.toString() === baseUnitId?.toString())?.name || 'Base Unit';

    return (
        <Paper sx={{ p: 2, mt: 3, border: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Product Unit Configurations (e.g., Box, Case)</Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
                Define alternative units of measure for this product and their conversion factor relative to the <strong>{baseUnitName}</strong>.
            </Typography>

            {unitConfigError && <Alert severity="error" onClose={() => setUnitConfigError(null)} sx={{ mb: 2 }}>{unitConfigError}</Alert>}
            {unitConfigFeedback && <Alert severity="success" onClose={() => setUnitConfigFeedback('')} sx={{ mb: 2 }}>{unitConfigFeedback}</Alert>}

            <Box component="form" onSubmit={onAddUnitConfig} sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="flex-end">
                    <Grid item xs={12} sm={4} md={3}>
                        <FormControl fullWidth variant="outlined" sx={commonFormControlSx} required>
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
                                {units
                                    .filter(u => u.id?.toString() !== baseUnitId?.toString()) // Exclude base unit
                                    .map(unit => (
                                    <MenuItem key={`unit-opt-${unit.id}`} value={unit.id.toString()}>{unit.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                        <TextField
                            label={`Conversion Factor (to ${baseUnitName})`}
                            name="conversion_factor"
                            type="number"
                            value={newUnitConfig.conversion_factor}
                            onChange={onNewUnitConfigChange}
                            fullWidth
                            required
                            InputProps={{ inputProps: { min: 0.000001, step: "any" } }}
                            sx={commonFormControlSx}
                            helperText={`e.g., if 1 Box = 12 ${baseUnitName}, enter 12`}
                        />
                    </Grid>
                    <Grid item xs={6} sm={2} md={1.5}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newUnitConfig.is_purchase_unit}
                                    onChange={onNewUnitConfigChange}
                                    name="is_purchase_unit"
                                />
                            }
                            label="Purchase?"
                            sx={{ ...commonFormControlSx, justifyContent: 'center' }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={2} md={1.5}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={newUnitConfig.is_sales_unit}
                                    onChange={onNewUnitConfigChange}
                                    name="is_sales_unit"
                                />
                            }
                            label="Sales?"
                            sx={{ ...commonFormControlSx, justifyContent: 'center' }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={loadingUnitConfig ? <CircularProgress size={20} color="inherit" /> : <FaPlus />}
                            disabled={loadingUnitConfig || !newUnitConfig.unit_id || !newUnitConfig.conversion_factor}
                            fullWidth
                            sx={{ height: '56px' }} // Match TextField height
                        >
                            Add Unit Config
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            {productUnits.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Configured Unit</TableCell>
                                <TableCell align="right">Factor (to {baseUnitName})</TableCell>
                                <TableCell align="center">Purchase Unit</TableCell>
                                <TableCell align="center">Sales Unit</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {productUnits.map((pu) => (
                                <TableRow key={pu.id}>
                                    <TableCell>{pu.unit_name || units.find(u => u.id?.toString() === pu.unit_id?.toString())?.name || 'N/A'}</TableCell>
                                    <TableCell align="right">{pu.conversion_factor}</TableCell>
                                    <TableCell align="center">{pu.is_purchase_unit ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="center">{pu.is_sales_unit ? 'Yes' : 'No'}</TableCell>
                                    <TableCell align="right">
                                        <IconButton
                                            onClick={() => onDeleteUnitConfig(pu.id, pu.unit_name || 'this unit')}
                                            color="error"
                                            size="small"
                                            disabled={loadingUnitConfig}
                                            aria-label={`Delete unit configuration for ${pu.unit_name}`}
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
             {productUnits.length === 0 && !loadingUnitConfig && (
                <Typography sx={{textAlign: 'center', p:2, color: 'text.secondary'}}>No alternative unit configurations defined yet.</Typography>
            )}
        </Paper>
    );
}

export default ProductUnitConfigurationFields;