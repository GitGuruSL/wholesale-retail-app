// filepath: d:/Development/wholesale-retail-app/frontend/src/components/StandardItemPricingFields.jsx
import React from 'react';
import {
    Box,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid
} from '@mui/material';

function StandardItemPricingFields({
    formData,
    onFormChange,
    taxes,
    discountTypes,
    commonFormControlSx
}) {
    return (
        <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1, mt: 2 }}>
            <Typography component="legend" variant="h6" sx={{ mb: 2 }}>Standard Item Pricing & Tax</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        id="cost_price"
                        label="Cost Price *"
                        name="cost_price"
                        type="number"
                        value={formData.cost_price}
                        onChange={onFormChange}
                        fullWidth
                        required={formData.Item_type === 'Standard'}
                        InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                        sx={commonFormControlSx}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        id="retail_price"
                        label="Retail Price *"
                        name="retail_price"
                        type="number"
                        value={formData.retail_price}
                        onChange={onFormChange}
                        fullWidth
                        required={formData.Item_type === 'Standard'}
                        InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                        sx={commonFormControlSx}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        id="wholesale_price"
                        label="Wholesale Price"
                        name="wholesale_price"
                        type="number"
                        value={formData.wholesale_price}
                        onChange={onFormChange}
                        fullWidth
                        InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                        sx={commonFormControlSx}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="tax-label">Tax</InputLabel>
                        <Select
                            labelId="tax-label"
                            id="tax_id"
                            name="tax_id"
                            value={formData.tax_id}
                            label="Tax"
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- No Tax --</em></MenuItem>
                            {taxes.map(o => <MenuItem key={`tax-${o.id}`} value={o.id.toString()}>{o.name} ({o.rate}%)</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="discount-type-label">Discount Type</InputLabel>
                        <Select
                            labelId="discount-type-label"
                            id="discount_type_id"
                            name="discount_type_id"
                            value={formData.discount_type_id}
                            label="Discount Type"
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- No Discount --</em></MenuItem>
                            {discountTypes.map(o => <MenuItem key={`dt-${o.id}`} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        id="discount_value"
                        label="Discount Value"
                        name="discount_value"
                        type="number"
                        value={formData.discount_value}
                        onChange={onFormChange}
                        fullWidth
                        disabled={!formData.discount_type_id}
                        InputProps={{ inputProps: { min: 0, step: "0.01" } }}
                        sx={commonFormControlSx}
                        helperText={!formData.discount_type_id ? "Select a discount type to enable" : ""}
                    />
                </Grid>
            </Grid>
        </Box>
    );
}

export default StandardItemPricingFields;