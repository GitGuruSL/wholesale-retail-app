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

// ... (interfaces Item, Supplier, Store, PurchaseOrderItemData remain the same) ...
interface Item {
    id: string | number;
    Item_name: string;
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
    Item_id: string | number | null;
    Item_name?: string;
    quantity: string;
    unit_price: string;
    subtotal?: number;
}

const initialItemData: PurchaseOrderItemData = {
    Item_id: null,
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

    const [Items, setItems] = useState<Item[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stores, setStores] = useState<Store[]>([]);

    // Keep track of the supplier ID used for the current Item list
    const [ItemFilterSupplierId, setItemFilterSupplierId] = useState<string | number | null>(null);

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

    // Modified to accept supplierId for filtering Items
    const fetchDropdownData = useCallback(async (filterBySupplierId: string | number | null) => {
        console.log(`[PurchaseOrderForm] fetchDropdownData called. isAuthenticated: ${isAuthenticated}, filterBySupplierId: ${filterBySupplierId}`);
        if (!isAuthenticated) {
            console.log("[PurchaseOrderForm] fetchDropdownData: Not authenticated, returning.");
            return;
        }
        try {
            console.log("[PurchaseOrderForm] fetchDropdownData: Attempting to fetch Items and suppliers.");
            
            let ItemApiUrl = '/Items?limit=1000&include=category,subCategory,store,brand,baseUnit'; // Added include back
            if (filterBySupplierId) {
                ItemApiUrl += `&supplier_id=${filterBySupplierId}`;
            }
            
            // Fetch suppliers only if they are not already loaded or if explicitly needed
            const suppliersPromise = suppliers.length === 0 
                ? apiInstance.get('/suppliers') 
                : Promise.resolve({ data: { data: suppliers } }); // Simulate API response if already loaded

            const [ItemsRes, suppliersRes] = await Promise.all([
                apiInstance.get(ItemApiUrl),
                suppliersPromise,
            ]);

            console.log(`[PurchaseOrderForm] fetchDropdownData: Items API URL: ${ItemApiUrl}`);
            console.log("[PurchaseOrderForm] fetchDropdownData: Raw ItemsRes.data:", JSON.stringify(ItemsRes.data, null, 2));

            const ItemsData = ItemsRes.data?.Items || ItemsRes.data?.data; // Adjusted to match Item list structure
            if (Array.isArray(ItemsData)) {
                console.log(`[PurchaseOrderForm] fetchDropdownData: Setting Items (filtered by supplier: ${filterBySupplierId || 'All'}):`, ItemsData.length, "items");
                setItems(ItemsData);
                setItemFilterSupplierId(filterBySupplierId); // Track current filter

                // After updating Items, validate existing items
                setFormData(prevFormData => {
                    const newItems = prevFormData.items.map(item => {
                        if (item.Item_id && !ItemsData.some(p => p.id === item.Item_id)) {
                            // Item is no longer in the filtered list, reset it
                            return {
                                ...item,
                                Item_id: null,
                                Item_name: '',
                                unit_price: '0.00', // Or keep if user manually entered
                            };
                        }
                        return item;
                    });
                    return { ...prevFormData, items: newItems };
                });

            } else {
                console.warn("[PurchaseOrderForm] Items API response was not an array. Response:", ItemsRes.data);
                setItems([]);
                setItemFilterSupplierId(null);
            }

            if (suppliersRes.data) { // Check if suppliersRes.data exists (it will from Promise.resolve)
                const suppliersDataArray = suppliersRes.data?.data;
                if (Array.isArray(suppliersDataArray)) {
                    if (suppliers.length === 0) { // Only set if initially empty
                         setSuppliers(suppliersDataArray);
                    }
                } else {
                     if (suppliers.length === 0) {
                        console.warn("[PurchaseOrderForm] Suppliers API response was not an array. Response:", suppliersRes.data);
                        setSuppliers([]);
                     }
                }
            }

        } catch (err) {
            console.error("[PurchaseOrderForm] Error fetching Items/suppliers:", err);
            setPageError("Failed to load required Item/supplier data.");
            setItems([]);
            if (suppliers.length === 0) setSuppliers([]); // Only reset if initially fetching
            setItemFilterSupplierId(null);
        }
    }, [isAuthenticated, suppliers]); // Removed Items from dependencies here to avoid loop, manage via ItemFilterSupplierId


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
                    Item_id: item.Item_id,
                    Item_name: item.Item_name,
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

        // Fetch Items based on current formData.supplier_id
        // This will run if supplier_id changes or if Items haven't been fetched for the current supplier
        if (isAuthenticated && (ItemFilterSupplierId !== formData.supplier_id || Items.length === 0 && !ItemFilterSupplierId)) {
             console.log(`[PurchaseOrderForm] useEffect: Supplier changed or Items not loaded. Current form supplier: ${formData.supplier_id}, Item filter supplier: ${ItemFilterSupplierId}`);
             fetchDropdownData(formData.supplier_id);
        } else if (isAuthenticated && suppliers.length === 0) {
            // If only suppliers are missing, fetch them (Items might be loaded with no filter)
            fetchDropdownData(null);
        }

        if (user.role_name === 'global_admin' && stores.length === 0 && isAuthenticated) {
            console.log("[PurchaseOrderForm] useEffect: global admin, stores empty, authenticated, calling fetchStoresForAdmin");
            fetchStoresForAdmin();
        }

        if (isEditing) {
            // Fetch PO details only if not already fetched or if purchaseOrderId changes
            // This check might need refinement if PO details depend on Items/suppliers being loaded first
            if (!formData.items.some(item => item.id) && purchaseOrderId) { // Simple check if items have IDs (from fetched PO)
                 fetchPurchaseOrderDetails();
            }
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
                items: prev.items.length > 0 && prev.items[0].Item_id ? prev.items : [initialItemData] // More robust reset
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
        // Consider if 'stores', 'Items', 'suppliers' are truly needed here
        // if their fetching is guarded and form updates are handled carefully.
        // For now, keeping 'stores' as it influences store_id logic.
        stores,
        formData.supplier_id, // Key dependency for re-fetching Items
        ItemFilterSupplierId, // To compare against formData.supplier_id
        Items.length, // Re-evaluate if Items list itself changes
        purchaseOrderId, // Added purchaseOrderId
        suppliers.length // Added suppliers.length
    ]);


    const handleHeaderChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: null }));
    };

    const handleSelectChange = (name: string, value: any) => {
        const newFormData = { ...formData, [name]: value };
        setFormData(newFormData);

        if (name === 'supplier_id') {
            // Items will be refetched by the useEffect due to formData.supplier_id changing
            // No need to call fetchDropdownData directly here if useEffect handles it.
            console.log(`[PurchaseOrderForm] Supplier changed to: ${value}. Item list will update.`);
        }
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

        if (field === 'Item_id' && value) {
            const selectedItem = Items.find(p => p.id === value);
            if (selectedItem) {
                currentItem.Item_name = selectedItem.Item_name;
                currentItem.unit_price = String(selectedItem.cost_price || '0.00');
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
        if (formData.items.length <= 1) return; // Prevent removing the last item
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const calculateTotalAmount = () => {
        return formData.items.reduce((total, item) => {
            const quantity = parseFloat(item.quantity);
            const unitPrice = parseFloat(item.unit_price);
            const subtotal = !isNaN(quantity) && !isNaN(unitPrice) ? quantity * unitPrice : 0;
            return total + subtotal;
        }, 0);
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => { // Added async here
        event.preventDefault();
        console.log("[PurchaseOrderForm] handleSubmit triggered.");
        console.log("[PurchaseOrderForm] Current formData on submit:", JSON.stringify(formData, null, 2));

        if (!isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        if (userCan && !userCan(requiredPermission)) {
            setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} purchase orders.`);
            return;
        }

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length > 0) {
            setFormErrors(validationErrors);
            console.log("[PurchaseOrderForm] Validation errors:", validationErrors);
            setFeedback({ message: "Please correct the errors in the form.", type: 'error' });
            return;
        }
        setFormErrors({});
        setIsSubmitting(true);
        setFeedback(null);
        setPageError(null);

        const payload = {
            ...formData,
            order_date: formData.order_date ? formatDateForAPI(formData.order_date) : null,
            expected_delivery_date: formData.expected_delivery_date ? formatDateForAPI(formData.expected_delivery_date) : null,
            items: formData.items.map(item => ({
                ...item,
                Item_id: item.Item_id ? parseInt(String(item.Item_id), 10) : null,
                quantity: parseFloat(String(item.quantity)) || 0,
                unit_price: parseFloat(String(item.unit_price)) || 0,
                tax_rate: parseFloat(String(item.tax_rate)) || 0,
                discount_amount: parseFloat(String(item.discount_amount)) || 0,
            })).filter(item => item.Item_id && item.quantity > 0) // Ensure only valid items are sent
        };
        console.log("[PurchaseOrderForm] Payload to be sent:", JSON.stringify(payload, null, 2));


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
                                    <TableCell sx={{width: '40%'}}>Item</TableCell>
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
                                                    options={Items}
                                                    getOptionLabel={(option) => `${option.Item_name} (${option.sku || 'N/A'})`}
                                                    value={Items.find(p => p.id === item.Item_id) || null}
                                                    onChange={(_, newValue) => handleItemChange(index, 'Item_id', newValue ? newValue.id : null)}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            placeholder="Select Item"
                                                            error={Boolean(formErrors[`items[${index}].Item_id`])}
                                                            helperText={formErrors[`items[${index}].Item_id`]}
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