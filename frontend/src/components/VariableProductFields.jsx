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
// - productVariations (array of variation objects)
// - onGenerateVariations (function to call when "Generate Variations" is clicked)
// - onVariationChange (function to handle changes in variation fields like SKU, price)
// - onRemoveVariation (function to remove a variation)
// - loadingVariations (boolean)
// - variationGenerationError (string or null)
// - setVariationGenerationError (function to clear the error)
// - setError (general error reporting, if needed)

function VariableProductFields({
    formData,
    productVariations,
    onGenerateVariations,
    onVariationChange,
    onRemoveVariation,
    loadingVariations,
    variationGenerationError,
    setVariationGenerationError,
    // setError // If you need to set general form errors from here
}) {

    // REMOVE any state or logic related to:
    // - productAttributes (the old array of {name, values_string})
    // - newAttribute (the old state for a new attribute being typed)
    // - functions like handleAttributeNameChange, handleAttributeValuesChange, handleAddNewAttributeToList etc.

    // The UI for defining attributes (like TextFields for "Variant Attribute" and "Values")
    // should be REMOVED from this component. That logic is now in ProductForm.jsx.

    // Line 64 was likely part of the removed UI. For example, if it was trying to render
    // a TextField for an attribute name from an old `productAttributes` prop.

    return (
        <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography component="legend" variant="h6" sx={{ mb: 2 }}>
                Product Variations
            </Typography>

            {/* Button to generate variations based on attributes_config from ProductForm */}
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

            {productVariations && productVariations.length > 0 && (
                <TableContainer component={Paper} sx={{ mt: 2 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                {Object.keys(productVariations[0].attribute_combination).map(attrName => (
                                    <TableCell key={attrName} sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{attrName}</TableCell>
                                ))}
                                <TableCell sx={{ fontWeight: 'bold' }}>SKU</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Cost Price</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Retail Price</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>Wholesale Price</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {productVariations.map((variation, index) => (
                                <TableRow key={variation.id || `var-${index}`}>
                                    {Object.entries(variation.attribute_combination).map(([key, value]) => (
                                        <TableCell key={key}>{value}</TableCell>
                                    ))}
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
            {productVariations && productVariations.length === 0 && !variationGenerationError && !loadingVariations && (
                 <Typography sx={{mt: 2, color: 'text.secondary'}}>
                    No variations generated. Configure attributes in the section above and click "Generate Variations".
                </Typography>
            )}
        </Box>
    );
}

export default VariableProductFields;