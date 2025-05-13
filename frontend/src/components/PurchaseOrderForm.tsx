import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation as useReactRouterLocation } from 'react-router-dom'; // Renamed useLocation
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';
import {
    Paper, Typography, TextField, Button, Box, Alert, CircularProgress, Grid,
    IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Autocomplete, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { AddCircleOutline, DeleteOutline } from '@mui/icons-material'; // Removed Edit, not used here
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';

// ... (interfaces Product, Supplier, Store, PurchaseOrderItemData remain the same) ...
interface Product {
    id: string | number;
    product_name: string;
    sku: string;
    cost_price?: number;
}

interface Supplier {
    id: string | number;
    name: string;
}

interface Store {
    id: string | number;
    name: string;
}

interface PurchaseOrderItemData {
    id?: string | number;
    product_id: string | number | null;
    product_name?: string;
    quantity: string;
    unit_price: string;
    subtotal?: number;
}

const initialItemData: PurchaseOrderItemData = {
    product_id: null,
    quantity: '1',
    unit_price: '0.00',
};

interface PurchaseOrderFormData {
    supplier_id: string | number | null;
    store_id: string | number | null; // Crucial field
    order_date: Date | null;
    expected_delivery_date: Date | null;
    status: string;
    notes: string;
    items: PurchaseOrderItemData[];
}

const PO_STATUSES = ['Pending', 'Ordered', 'Shipped', 'Partial', 'Received', 'Cancelled'];


function PurchaseOrderForm() {
    const { purchaseOrderId } = useParams();
    const isEditing = Boolean(purchaseOrderId);
    const navigate = useNavigate();
    const reactRouterLocation = useReactRouterLocation(); // For query params
    const { user, isAuthenticated, isLoading: authLoading, userCan } = useAuth();

    const [formData, setFormData] = useState<PurchaseOrderFormData>({
        supplier_id: null,
        store_id: null, // Initialize as null
        order_date: new Date(),
        expected_delivery_date: null,
        status: 'Pending',
        notes: '',
        items: [initialItemData]
    });

    const [products, setProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stores, setStores] = useState<Store[]>([]); // For global admin store dropdown

    const [initialLoading, setInitialLoading] = useState(true); // Start true for all modes
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pageError, setPageError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<Record<string, any>>({});

    const requiredPermission = isEditing ? 'purchase_order:update' : 'purchase_order:create';

    // Fetch stores for global admin's dropdown
    const fetchStoresForAdmin = useCallback(async () => {
        if (user?.role_name === 'global_admin') {
            try {
                const storesRes = await apiInstance.get('/stores');
                setStores(storesRes.data.data || storesRes.data || []);
            } catch (err) {
                console.error("Error fetching stores for admin:", err);
                setPageError("Failed to load stores for selection.");
            }
        }
    }, [user]);

    const fetchDropdownData = useCallback(async () => { // Products and Suppliers
        console.log("[PurchaseOrderForm] fetchDropdownData called. isAuthenticated:", isAuthenticated);
        if (!isAuthenticated) {
            console.log("[PurchaseOrderForm] fetchDropdownData: Not authenticated, returning.");
            return;
        }
        try {
            console.log("[PurchaseOrderForm] fetchDropdownData: Attempting to fetch products and suppliers.");
            const [productsRes, suppliersRes] = await Promise.all([
                apiInstance.get('/products?limit=1000'),
                apiInstance.get('/suppliers'),
            ]);

            console.log("[PurchaseOrderForm] fetchDropdownData: Raw productsRes.data:", JSON.stringify(productsRes.data, null, 2));
            // console.log("[PurchaseOrderForm] fetchDropdownData: Raw suppliersRes.data:", JSON.stringify(suppliersRes.data, null, 2)); // Optional

            const productsData = productsRes.data?.data;
            if (Array.isArray(productsData)) {
                console.log("[PurchaseOrderForm] fetchDropdownData: Setting products from productsRes.data.data:", productsData.length, "items");
                setProducts(productsData);
            } else if (Array.isArray(productsRes.data)) {
                console.log("[PurchaseOrderForm] fetchDropdownData: Setting products from productsRes.data:", productsRes.data.length, "items");
                setProducts(productsRes.data);
            } else {
                console.warn("[PurchaseOrderForm] Products API response was not an array. Response:", productsRes.data);
                setProducts([]);
            }

            // Suppliers handling (remains the same)
            const suppliersData = suppliersRes.data?.data;
            if (Array.isArray(suppliersData)) {
                setSuppliers(suppliersData);
            } else if (Array.isArray(suppliersRes.data)) {
                setSuppliers(suppliersRes.data);
            } else {
                console.warn("[PurchaseOrderForm] Suppliers API response was not an array. Response:", suppliersRes.data);
                setSuppliers([]);
            }

        } catch (err) {
            console.error("[PurchaseOrderForm] Error fetching products/suppliers:", err);
            setPageError("Failed to load required product/supplier data.");
            setProducts([]);
            setSuppliers([]);
        }
    }, [isAuthenticated]); // setProducts, setSuppliers, setPageError are stable from useState


    const fetchPurchaseOrderDetails = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !purchaseOrderId) return;
        setInitialLoading(true);
        setPageError(null);
        setFormErrors({});
        try {
            const response = await apiInstance.get(`/purchase-orders/${purchaseOrderId}`);
            const poData = response.data.data;

            // Security check for non-global admin
            if (user && user.role_name !== 'global_admin' && poData.store_id !== user.store_id) {
                setPageError("Forbidden: You do not have permission to edit this purchase order for the specified store.");
                setInitialLoading(false);
                return;
            }

            setFormData({
                supplier_id: poData.supplier_id || null,
                store_id: poData.store_id || null, // This is important
                order_date: poData.order_date ? parseISO(poData.order_date) : new Date(),
                expected_delivery_date: poData.expected_delivery_date ? parseISO(poData.expected_delivery_date) : null,
                status: poData.status || 'Pending',
                notes: poData.notes || '',
                items: poData.items?.map((item: any) => ({
                    id: item.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: String(item.quantity || '1'),
                    unit_price: String(item.unit_price || '0.00'),
                    subtotal: item.subtotal
                })) || [initialItemData]
            });
        } catch (err: any) {
            setPageError(err.response?.data?.message || `Failed to fetch details for PO ID ${purchaseOrderId}.`);
            console.error("Error fetching PO details:", err);
        } finally {
            setInitialLoading(false);
        }
    }, [purchaseOrderId, isAuthenticated, isEditing, user]);

    useEffect(() => {
        if (authLoading || !user) {
            setInitialLoading(true); // Keep this initial guard
            return;
        }

        // This flag helps manage if we are past the initial auth/permission checks
        let canProceed = true;
        let newPageError: string | null = null;

        if (!isAuthenticated) {
            newPageError = "Please log in to manage purchase orders.";
            canProceed = false;
        } else if (userCan && !userCan(requiredPermission)) {
            newPageError = `You do not have permission to ${isEditing ? 'edit' : 'create'} purchase orders.`;
            canProceed = false;
        }

        if (!canProceed) {
            setPageError(newPageError);
            setInitialLoading(false);
            return;
        }

        // If we reach here, user is authenticated and has basic permission
        // Set initialLoading true only if we are about to fetch major data
        // or re-initialize the form significantly.
        // For subsequent runs due to minor data changes (like stores list),
        // we might not want to flash the main loader.

        // Fetch general dropdowns if products are not loaded and user is authenticated
        // fetchDropdownData handles fetching both products and suppliers.
        if (products.length === 0 && isAuthenticated) {
            console.log("[PurchaseOrderForm] useEffect: products are empty and authenticated, calling fetchDropdownData");
            fetchDropdownData();
        }

        if (user.role_name === 'global_admin' && stores.length === 0 && isAuthenticated) {
            console.log("[PurchaseOrderForm] useEffect: global admin, stores empty, authenticated, calling fetchStoresForAdmin");
            fetchStoresForAdmin();
        }

        if (isEditing) {
            fetchPurchaseOrderDetails();
        } else { // Create mode
            setInitialLoading(true); // Explicitly for create mode setup
            const queryParams = new URLSearchParams(reactRouterLocation.search);
            const storeIdFromQuery = queryParams.get('store_id');
            let determinedStoreId: string | number | null = formData.store_id; // Start with current form data

            if (user.role_name === 'global_admin') {
                if (storeIdFromQuery) {
                    determinedStoreId = Number(storeIdFromQuery);
                } else if (!determinedStoreId && stores.length > 0) { 
                    // Optionally default or leave null for selection
                    // newPageError = "Global admin: Please select a store."; // Only if strictly required before interaction
                } else if (!determinedStoreId && !stores.length) {
                    // Stores not loaded yet, might show error or wait
                }
            } else { // Non-global admin
                if (user.store_id) {
                    determinedStoreId = user.store_id;
                } else {
                    newPageError = "You do not have an assigned store. Cannot create a purchase order.";
                }
            }
            
            setFormData(prev => ({
                ...prev,
                store_id: determinedStoreId, // Update based on determination
                order_date: prev.order_date || new Date(), // Keep if user already interacted
                items: prev.items.length > 0 && prev.items[0].product_id ? prev.items : [initialItemData] // More robust reset
            }));
            
            if (newPageError) {
                setPageError(newPageError);
            } else {
                 // Clear error only if conditions are met, avoid clearing unrelated errors
                if (pageError === "You do not have an assigned store. Cannot create a purchase order." || 
                    pageError?.startsWith("Global admin: Please select a store")) {
                    setPageError(null);
                }
            }
            setFormErrors({}); // Reset form errors on mode switch/initial load
            setInitialLoading(false);
        }
    }, [
        isEditing, authLoading, isAuthenticated, userCan, requiredPermission, user,
        fetchPurchaseOrderDetails, fetchDropdownData, fetchStoresForAdmin,
        reactRouterLocation.search, 
        // Consider if 'stores', 'products', 'suppliers' are truly needed here
        // if their fetching is guarded and form updates are handled carefully.
        // For now, keeping 'stores' as it influences store_id logic.
        stores,
        products.length // Add products.length to re-evaluate if it changes (e.g. after fetch)
    ]);


    const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleSelectChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };
    
    const handleDateChange = (name: string, date: Date | null) => {
        setFormData(prev => ({ ...prev, [name]: date }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleItemChange = (index: number, field: keyof PurchaseOrderItemData, value: any) => {
        const newItems = [...formData.items];
        const currentItem = { ...newItems[index] };
        (currentItem as any)[field] = value;

        if (field === 'product_id' && value) {
            const selectedProduct = products.find(p => p.id === value);
            if (selectedProduct) {
                currentItem.product_name = selectedProduct.product_name;
                currentItem.unit_price = String(selectedProduct.cost_price || '0.00');
            }
        }
        
        newItems[index] = currentItem;
        setFormData(prev => ({ ...prev, items: newItems }));

        const itemErrorKey = `items[${index}].${field}`;
        if (formErrors[itemErrorKey]) {
            setFormErrors(prev => ({ ...prev, [itemErrorKey]: null }));
        }
    };

    const addItem = () => {
        setFormData(prev => ({ ...prev, items: [...prev.items, { ...initialItemData }] }));
    };

    const removeItem = (index: number) => {
        if (formData.items.length <= 1) {
            setFormErrors(prev => ({ ...prev, items_general: "At least one item is required."}));
            return;
        }
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const calculateTotalAmount = () => {
        return formData.items.reduce((total, item) => {
            const quantity = parseFloat(item.quantity);
            const unitPrice = parseFloat(item.unit_price);
            if (!isNaN(quantity) && !isNaN(unitPrice)) {
                return total + (quantity * unitPrice);
            }
            return total;
        }, 0);
    };


    const validateForm = () => {
        const errors: Record<string, any> = {};
        if (!formData.supplier_id) errors.supplier_id = "Supplier is required.";
        if (!formData.store_id) errors.store_id = "Store is required."; // Add store_id validation
        if (!formData.order_date) errors.order_date = "Order Date is required.";
        if (!formData.status) errors.status = "Status is required.";

        formData.items.forEach((item, index) => {
            if (!item.product_id) errors[`items[${index}].product_id`] = "Product is required.";
            if (isNaN(parseFloat(item.quantity)) || parseFloat(item.quantity) <= 0) {
                errors[`items[${index}].quantity`] = "Quantity must be a positive number.";
            }
            if (isNaN(parseFloat(item.unit_price)) || parseFloat(item.unit_price) < 0) {
                errors[`items[${index}].unit_price`] = "Unit Price must be a non-negative number.";
            }
        });
        if (formData.items.length === 0) errors.items_general = "At least one item is required.";

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || (userCan && !userCan(requiredPermission))) {
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this purchase order.`);
            return;
        }
        if (!validateForm()) return;

        setIsSubmitting(true);
        setPageError(null);

        const payload = {
            ...formData, // store_id is already in formData
            order_date: formData.order_date ? format(formData.order_date, 'yyyy-MM-dd') : null,
            expected_delivery_date: formData.expected_delivery_date ? format(formData.expected_delivery_date, 'yyyy-MM-dd') : null,
            items: formData.items.map(item => ({
                id: item.id,
                product_id: item.product_id,
                quantity: parseFloat(item.quantity),
                unit_price: parseFloat(item.unit_price),
            })),
        };

        try {
            let responseMessage = '';
            if (isEditing) {
                const response = await apiInstance.put(`/purchase-orders/${purchaseOrderId}`, payload);
                responseMessage = `Purchase Order #${response.data.data.id} updated successfully!`;
            } else {
                const response = await apiInstance.post('/purchase-orders', payload);
                responseMessage = `Purchase Order #${response.data.data.id} created successfully!`;
            }
            navigate('/dashboard/purchase-orders', { state: { message: responseMessage, type: 'success' } });
        } catch (err: any) {
            const apiError = err.response?.data;
            if (apiError?.errors && Array.isArray(apiError.errors)) {
                const backendErrors = apiError.errors.reduce((acc: any, curr: any) => {
                    acc[curr.path || curr.param || 'general'] = curr.msg;
                    return acc;
                }, {});
                setFormErrors(prev => ({ ...prev, ...backendErrors }));
                setPageError("Please correct the errors in the form.");
            } else {
                setPageError(apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} purchase order.`);
            }
            console.error(`Error ${isEditing ? 'updating' : 'creating'} PO:`, err);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading || initialLoading ) { // Simplified loading check
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    }

    // More specific condition for showing permission error page
    const hasFatalError = (!isAuthenticated || (userCan && !userCan(requiredPermission)) || (pageError && !Object.keys(formErrors).length && !isSubmitting));

    if (hasFatalError && pageError) { // Only show this full page error if it's a permission/auth issue or critical load issue
         return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 900, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}
                </Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/purchase-orders')}>
                    Back to List
                </Button>
            </Paper>
        );
    }
    
    const storeForDisplay = stores.find(s => s.id === formData.store_id) || 
                           (user && user.role_name !== 'global_admin' && user.store_id === formData.store_id ? {id: user.store_id, name: user.store_name || `Store ID: ${user.store_id}`} : null);


    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Paper sx={{ p: {xs: 2, md: 3}, m: {xs: 1, md: 2}, maxWidth: 1000, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>
                    {isEditing ? `Edit Purchase Order (ID: ${purchaseOrderId})` : 'Create New Purchase Order'}
                </Typography>
                {pageError && !Object.keys(formErrors).some(k => k.startsWith('items[')) && !formErrors.items_general &&
                    <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>
                }
                {formErrors.items_general && <Alert severity="error" sx={{ mb: 2 }}>{formErrors.items_general}</Alert>}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Grid container spacing={3}>
                        {/* Store Selector/Display */}
                        <Grid item xs={12} sm={6}>
                            {user?.role_name === 'global_admin' ? (
                                <Autocomplete
                                    options={stores}
                                    getOptionLabel={(option) => option.name}
                                    value={stores.find(s => s.id === formData.store_id) || null}
                                    onChange={(_, newValue) => handleSelectChange('store_id', newValue ? newValue.id : null)}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Store"
                                            required
                                            error={Boolean(formErrors.store_id)}
                                            helperText={formErrors.store_id}
                                        />
                                    )}
                                    disabled={isSubmitting || initialLoading || isEditing} // Disable if editing for admin too
                                />
                            ) : (
                                <TextField
                                    label="Store"
                                    value={storeForDisplay?.name || 'N/A'}
                                    fullWidth
                                    disabled
                                    error={Boolean(formErrors.store_id)}
                                    helperText={formErrors.store_id || (user && !user.store_id ? "No store assigned" : "")}
                                />
                            )}
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={suppliers}
                                getOptionLabel={(option) => option.name}
                                value={suppliers.find(s => s.id === formData.supplier_id) || null}
                                onChange={(_, newValue) => handleSelectChange('supplier_id', newValue ? newValue.id : null)}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Supplier"
                                        required
                                        error={Boolean(formErrors.supplier_id)}
                                        helperText={formErrors.supplier_id}
                                    />
                                )}
                                disabled={isSubmitting || initialLoading}
                            />
                        </Grid>
                        {/* ... other fields (Order Date, Expected Delivery, Status, Notes) remain the same ... */}
                         <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Order Date"
                                value={formData.order_date}
                                onChange={(date) => handleDateChange('order_date', date)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        required: true,
                                        error: Boolean(formErrors.order_date),
                                        helperText: formErrors.order_date,
                                    }
                                }}
                                disabled={isSubmitting || initialLoading}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Expected Delivery Date (Optional)"
                                value={formData.expected_delivery_date}
                                onChange={(date) => handleDateChange('expected_delivery_date', date)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        error: Boolean(formErrors.expected_delivery_date),
                                        helperText: formErrors.expected_delivery_date,
                                    }
                                }}
                                disabled={isSubmitting || initialLoading}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth error={Boolean(formErrors.status)}>
                                <InputLabel id="status-label">Status</InputLabel>
                                <Select
                                    labelId="status-label"
                                    name="status"
                                    value={formData.status}
                                    label="Status"
                                    onChange={(e) => handleSelectChange('status', e.target.value)}
                                    disabled={isSubmitting || initialLoading}
                                >
                                    {PO_STATUSES.map(status => (
                                        <MenuItem key={status} value={status}>{status}</MenuItem>
                                    ))}
                                </Select>
                                {formErrors.status && <Typography color="error" variant="caption">{formErrors.status}</Typography>}
                            </FormControl>
                        </Grid>
                         <Grid item xs={12}>
                            <TextField
                                label="Notes (Optional)"
                                name="notes"
                                value={formData.notes}
                                onChange={handleHeaderChange}
                                fullWidth
                                multiline
                                rows={3}
                                disabled={isSubmitting || initialLoading}
                                error={Boolean(formErrors.notes)}
                                helperText={formErrors.notes}
                            />
                        </Grid>
                    </Grid>

                    <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>Items</Typography>
                    {/* ... Items Table remains the same ... */}
                    <TableContainer component={Paper} elevation={2} sx={{ mb: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{width: '40%'}}>Product</TableCell>
                                    <TableCell sx={{width: '15%'}}>Quantity</TableCell>
                                    <TableCell sx={{width: '20%'}}>Unit Price</TableCell>
                                    <TableCell sx={{width: '20%'}}>Subtotal</TableCell>
                                    <TableCell sx={{width: '5%'}} align="right">Action</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {formData.items.map((item, index) => {
                                    const quantity = parseFloat(item.quantity);
                                    const unitPrice = parseFloat(item.unit_price);
                                    const subtotal = !isNaN(quantity) && !isNaN(unitPrice) ? quantity * unitPrice : 0;
                                    return (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Autocomplete
                                                    options={products}
                                                    getOptionLabel={(option) => `${option.product_name} (${option.sku || 'N/A'})`}
                                                    value={products.find(p => p.id === item.product_id) || null}
                                                    onChange={(_, newValue) => handleItemChange(index, 'product_id', newValue ? newValue.id : null)}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            placeholder="Select Product"
                                                            error={Boolean(formErrors[`items[${index}].product_id`])}
                                                            helperText={formErrors[`items[${index}].product_id`]}
                                                            size="small"
                                                        />
                                                    )}
                                                    disabled={isSubmitting || initialLoading}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    inputProps={{ min: "0.01", step: "0.01" }}
                                                    error={Boolean(formErrors[`items[${index}].quantity`])}
                                                    helperText={formErrors[`items[${index}].quantity`]}
                                                    disabled={isSubmitting || initialLoading}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <TextField
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                    fullWidth
                                                    size="small"
                                                    inputProps={{ min: "0.00", step: "0.01" }}
                                                    error={Boolean(formErrors[`items[${index}].unit_price`])}
                                                    helperText={formErrors[`items[${index}].unit_price`]}
                                                    disabled={isSubmitting || initialLoading}
                                                />
                                            </TableCell>
                                            <TableCell>${subtotal.toFixed(2)}</TableCell>
                                            <TableCell align="right">
                                                <IconButton onClick={() => removeItem(index)} color="error" disabled={isSubmitting || initialLoading || formData.items.length <= 1}>
                                                    <DeleteOutline />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Button
                        startIcon={<AddCircleOutline />}
                        onClick={addItem}
                        variant="outlined"
                        disabled={isSubmitting || initialLoading}
                        sx={{ mb: 2 }}
                    >
                        Add Item
                    </Button>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3, p:2, borderTop: '1px solid lightgray' }}>
                        <Typography variant="h6">
                            Total Amount: ${calculateTotalAmount().toFixed(2)}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="outlined" color="secondary" onClick={() => navigate('/dashboard/purchase-orders')} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                disabled={isSubmitting || initialLoading || (userCan && !userCan(requiredPermission)) || !formData.store_id}
                            >
                                {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Purchase Order' : 'Create Purchase Order')}
                            </Button>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </LocalizationProvider>
    );
}

export default PurchaseOrderForm;