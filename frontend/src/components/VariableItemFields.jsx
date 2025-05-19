import React from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    CircularProgress,
    Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
// Add any other MUI components you use here

// Props this component now expects:
// - formData (for context, e.g., base SKU if needed for default variation SKUs)
// - ItemVariations (array of variation objects)
// - onGenerateVariations (function to call when "Generate Variations" is clicked)
// - onVariationChange (function to handle changes in variation fields like SKU, price)
// - onRemoveVariation (function to remove a variation)
// - loadingVariations (boolean)
// - variationGenerationError (string or null)
// - setVariationGenerationError (function to clear the error)
// - setError (general error reporting, if needed)

function VariableItemFields({
    formData,
    ItemVariations,
    onGenerateVariations,
    onVariationChange,
    onRemoveVariation,
    loadingVariations,
    variationGenerationError,
    setVariationGenerationError,
    // setError // If you need to set general form errors from here
}) {

    // REMOVE any state or logic related to:
    // - ItemAttributes (the old array of {name, values_string})
    // - newAttribute (the old state for a new attribute being typed)
    // - functions like handleAttributeNameChange, handleAttributeValuesChange, handleAddNewAttributeToList etc.

    // The UI for defining attributes (like TextFields for "Variant Attribute" and "Values")
    // should be REMOVED from this component. That logic is now in ItemForm.jsx.

    // Line 64 was likely part of the removed UI. For example, if it was trying to render
    // a TextField for an attribute name from an old `ItemAttributes` prop.

    return (
        <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography component="legend" variant="h6" sx={{ mb: 2 }}>
                Item Variations
            </Typography>

            {/* Button to generate variations based on attributes_config from ItemForm */}
            <Button
                variant="contained"
                onClick={() => {
                    if (setVariationGenerationError) setVariationGenerationError(null); // Clear previous error
                    onGenerateVariations();
                }}
                disabled={loadingVariations}
                sx={{ mb: 2 }}
            >
                {loadingVariations ? <CircularProgress size={24} /> : 'Generate Variations'}
            </Button>

            {variationGenerationError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {variationGenerationError}
                </Alert>
            )}

            {ItemVariations && ItemVariations.length > 0 && (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {ItemVariations[0] && typeof ItemVariations[0].attribute_combination === 'object' && ItemVariations[0].attribute_combination !== null ? (
                                    Object.keys(ItemVariations[0].attribute_combination).map(attrName => (
                                        <TableCell key={attrName} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{attrName}</TableCell>
                                    ))
                                ) : (
                                    // Optional: Render a placeholder or null if attribute_combination is invalid for the first item
                                    // This case should ideally not happen if data is consistent.
                                    null 
                                )}
                                <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Cost Price</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Retail Price</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Wholesale Price</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {ItemVariations.map((variation, index) => (
                                <TableRow key={variation.id || `var-${index}`}>
                                    {/* Ensure each variation also has a valid attribute_combination for rendering its cells */}
                                    {ItemVariations[0] && typeof ItemVariations[0].attribute_combination === 'object' && ItemVariations[0].attribute_combination !== null ? (
                                        Object.keys(ItemVariations[0].attribute_combination).map(attrName => (
                                            <TableCell key={`${variation.id || index}-${attrName}`}>
                                                {variation.attribute_combination && typeof variation.attribute_combination === 'object' ? variation.attribute_combination[attrName] : ''}
                                            </TableCell>
                                        ))
                                    ) : null}
                                    <TableCell>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            value={variation.sku || ''}
                                            onChange={(e) => onVariationChange(index, 'sku', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            inputProps={{ step: "0.01" }}
                                            value={variation.cost_price === null || variation.cost_price === undefined ? '' : variation.cost_price}
                                            onChange={(e) => onVariationChange(index, 'cost_price', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            inputProps={{ step: "0.01" }}
                                            value={variation.retail_price === null || variation.retail_price === undefined ? '' : variation.retail_price}
                                            onChange={(e) => onVariationChange(index, 'retail_price', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            type="number"
                                            inputProps={{ step: "0.01" }}
                                            value={variation.wholesale_price === null || variation.wholesale_price === undefined ? '' : variation.wholesale_price}
                                            onChange={(e) => onVariationChange(index, 'wholesale_price', e.target.value)}
                                        />
                                    </TableCell>
                                    <TableCell align="center">
                                        <IconButton
                                            size="small"
                                            onClick={() => onRemoveVariation(variation.id || `var-${index}`)}
                                            color="error"
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            {ItemVariations && ItemVariations.length === 0 && !variationGenerationError && !loadingVariations && (
                 <Typography sx={{mt: 2, color: 'text.secondary'}}>
                    No variations generated. Configure attributes in the section above and click "Generate Variations".
                </Typography>
            )}
        </Box>
    );
}

export default VariableItemFields;