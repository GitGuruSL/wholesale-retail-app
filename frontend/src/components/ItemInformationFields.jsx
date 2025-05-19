import React from 'react';
import {
    Box,
    Typography,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Button,
    FormGroup,
    FormControlLabel,
    Checkbox
} from '@mui/material';

function ItemInformationFields({
    formData,
    onFormChange,
    onItemTypeChange,
    stores,
    categories,
    // subCategories, // Now using filteredSubCategories passed from parent
    specialCategories,
    brands,
    units,
    manufacturers,
    filteredSubCategories, // Use this for the sub-category dropdown
    commonFormControlSx
}) {
    return (
        <Box component="fieldset" sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 1 }}>
            <Typography component="legend" variant="h6" sx={{ mb: 2 }}>Item Information</Typography>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField 
                        id="item_name" 
                        label="Item Name *" 
                        name="item_name" 
                        value={formData.item_name || ''} 
                        onChange={onFormChange} 
                        fullWidth 
                        required 
                        sx={commonFormControlSx}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <TextField 
                        id="slug" 
                        label="Slug (auto-generated if blank)" 
                        name="slug" 
                        value={formData.slug} 
                        onChange={onFormChange} 
                        fullWidth 
                        sx={commonFormControlSx}
                    />
                </Grid>
                 <Grid item xs={12} sm={6} md={4}>
                    <TextField 
                        id="sku" 
                        label={formData.item_type === 'Variable' ? "Parent SKU (Optional)" : "SKU"} // CHANGED from Item_type
                        name="sku" 
                        value={formData.sku} 
                        onChange={onFormChange} 
                        fullWidth 
                        sx={commonFormControlSx}
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="selling-type-label">Selling Type</InputLabel>
                        <Select 
                            labelId="selling-type-label" 
                            id="selling_type" 
                            name="selling_type" 
                            value={formData.selling_type} 
                            label="Selling Type" 
                            onChange={onFormChange}
                        >
                            <MenuItem value="Wholesale">Wholesale</MenuItem>
                            <MenuItem value="Retail">Retail</MenuItem>
                            <MenuItem value="Both">Both</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth required sx={commonFormControlSx}>
                        <InputLabel id="category-label">Category *</InputLabel>
                        <Select 
                            labelId="category-label" 
                            id="category_id" 
                            name="category_id" 
                            value={formData.category_id} 
                            label="Category *" 
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- Select Category --</em></MenuItem>
                            {categories.map(o => <MenuItem key={`cat-${o.id}`} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl 
                        variant="outlined" 
                        fullWidth 
                        disabled={!formData.category_id || filteredSubCategories.length === 0} 
                        sx={commonFormControlSx}
                    >
                        <InputLabel id="sub-category-label">Sub Category</InputLabel>
                        <Select 
                            labelId="sub-category-label" 
                            id="sub_category_id" 
                            name="sub_category_id" 
                            value={formData.sub_category_id} 
                            label="Sub Category" 
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- Select Sub Category --</em></MenuItem>
                            {filteredSubCategories.map(o => <MenuItem key={`subcat-${o.id}`} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="special-category-label">Special Category</InputLabel>
                        <Select 
                            labelId="special-category-label" 
                            id="special_category_id" 
                            name="special_category_id" 
                            value={formData.special_category_id} 
                            label="Special Category" 
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- Select Special Category --</em></MenuItem>
                            {specialCategories.map(o => <MenuItem key={`spcat-${o.id}`} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="inventory-type-label">Inventory / Service</InputLabel>
                        <Select 
                            labelId="inventory-type-label" 
                            id="inventory_type" 
                            name="inventory_type" 
                            value={formData.inventory_type} 
                            label="Inventory / Service" 
                            onChange={onFormChange}
                        >
                            <MenuItem value="Inventory">Inventory</MenuItem>
                            <MenuItem value="Service">Service</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="brand-label">Brand</InputLabel>
                        <Select 
                            labelId="brand-label" 
                            id="brand_id" 
                            name="brand_id" 
                            value={formData.brand_id} 
                            label="Brand" 
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- Select Brand --</em></MenuItem>
                            {brands.map(o => <MenuItem key={`brand-${o.id}`} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth required sx={commonFormControlSx}>
                        <InputLabel id="base-unit-label">Base Unit *</InputLabel>
                        <Select 
                            labelId="base-unit-label" 
                            id="base_unit_id" 
                            name="base_unit_id" 
                            value={formData.base_unit_id} 
                            label="Base Unit *" 
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- Select Base Unit --</em></MenuItem>
                            {units.map(o => <MenuItem key={`baseunit-${o.id}`} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="manufacturer-label">Manufacturer</InputLabel>
                        <Select 
                            labelId="manufacturer-label" 
                            id="manufacturer_id" 
                            name="manufacturer_id" 
                            value={formData.manufacturer_id} 
                            label="Manufacturer" 
                            onChange={onFormChange}
                        >
                            <MenuItem value=""><em>-- Select Manufacturer --</em></MenuItem>
                            {manufacturers.map(o => <MenuItem key={`mfg-${o.id}`} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                     <FormControl variant="outlined" fullWidth sx={commonFormControlSx}>
                        <InputLabel id="store-label">Store (Optional)</InputLabel>
                        <Select labelId="store-label" id="store_id" name="store_id" value={formData.store_id} label="Store (Optional)" onChange={onFormChange}>
                            <MenuItem value=""><em>-- Global Item --</em></MenuItem>
                            {stores.map(o => <MenuItem key={o.id} value={o.id.toString()}>{o.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={12} md={8}>
                    <TextField 
                        id="item_barcode" 
                        label="Item Barcode" 
                        name="item_barcode" 
                        value={formData.item_barcode} 
                        onChange={onFormChange} 
                        fullWidth 
                        sx={commonFormControlSx}
                    />
                </Grid>
                <Grid item xs={12}>
                    <TextField 
                        id="description" 
                        label="Description" 
                        name="description" 
                        value={formData.description} 
                        onChange={onFormChange} 
                        fullWidth 
                        multiline 
                        rows={3} 
                        sx={commonFormControlSx}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl component="fieldset" fullWidth sx={commonFormControlSx}>
                        <Typography variant="subtitle2" gutterBottom>Item Type *</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button 
                                variant={formData.item_type === 'Standard' ? 'contained' : 'outlined'} // CHANGED from Item_type
                                onClick={() => onItemTypeChange('Standard')} 
                                fullWidth
                            >
                                Standard
                            </Button>
                            <Button
                                variant={formData.item_type === 'Variable' ? 'contained' : 'outlined'} // CHANGED from Item_type
                                onClick={() => onItemTypeChange('Variable')}
                                fullWidth
                            >
                                Variable
                            </Button>
                        </Box>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormGroup sx={{ ...commonFormControlSx, mt: 2, justifyContent: 'center' }}>
                        <FormControlLabel
                            control={<Checkbox checked={formData.is_serialized} onChange={onFormChange} name="is_serialized" />}
                            label="Is Serialized?"
                        />
                    </FormGroup>
                </Grid>
            </Grid>
        </Box>
    );
}

export default ItemInformationFields;