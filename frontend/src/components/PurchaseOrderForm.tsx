import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Paper, Box, Typography, TextField, Button, Grid, Autocomplete,
    CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import { useForm, Controller, useFieldArray, Control } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    fetchSuppliers, createPurchaseOrder, fetchPurchaseOrderById, updatePurchaseOrder,
    fetchStores,
    fetchPurchaseProductLines,
    fetchVariationsForProductLine
} from '../services/api'; // Adjust path as needed
import { useAuth } from '../context/AuthContext';

// Interfaces (assuming these are mostly correct, might need minor adjustments for RHF)
interface ProductLine {
    base_item_id: number;
    item_name: string;
    base_item_sku: string | null;
    base_cost_price: number | null;
    item_type: 'Standard' | 'Service' | 'Variable';
    is_directly_purchasable: boolean;
    item_variant_id_if_direct: number | null;
    unit_price_if_direct: number | null;
}

interface Variation {
    item_variant_id: number;
    variation_sku: string | null;
    variation_display_name: string;
    unit_price: number;
    base_item_id: number;
}

interface PurchaseOrderItemForm { // For RHF array
    id?: number; // For existing items when editing
    item_variant_id: number;
    item_name: string;
    quantity: number;
    unit_price: number;
    subtotal?: number; // Calculated for display
}

interface PurchaseOrderFormValues { // For RHF
    id?: number;
    supplier_id: string | null; // Autocomplete might return null
    store_id: string | null;    // Autocomplete might return null
    order_date: Date | null;
    expected_delivery_date: Date | null;
    status: string;
    notes: string;
    items: PurchaseOrderItemForm[];
    // total_amount is calculated, not a direct form field
}

// Validation Schema
const purchaseOrderItemSchema = yup.object().shape({
    item_variant_id: yup.number().required(),
    item_name: yup.string().required(),
    quantity: yup.number().min(1, 'Quantity must be at least 1').required('Quantity is required.').typeError('Quantity must be a number.'),
    unit_price: yup.number().min(0, 'Unit price cannot be negative').required('Unit price is required.').typeError('Unit price must be a number.'),
});

const purchaseOrderSchema = yup.object().shape({
    supplier_id: yup.string().nullable().required('Supplier is required.'),
    store_id: yup.string().nullable().required('Store is required.'),
    order_date: yup.date().nullable().required('Order date is required.').typeError('Invalid date format.'),
    expected_delivery_date: yup.date().nullable().typeError('Invalid date format.'),
    status: yup.string().required('Status is required.'),
    notes: yup.string().nullable(),
    items: yup.array().of(purchaseOrderItemSchema).min(1, 'At least one item must be added to the order.').required(),
});


const PurchaseOrderForm = () => {
    const navigate = useNavigate();
    const params = useParams();
    const purchaseOrderId = params.purchaseOrderId;
    const { user, userCan, isAuthenticated, isLoading: authLoading } = useAuth();
    const isEditing = Boolean(purchaseOrderId);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isLoading: formLoading },
        setError: setFormError,
        watch,
        setValue
    } = useForm<PurchaseOrderFormValues>({
        resolver: yupResolver(purchaseOrderSchema),
        defaultValues: {
            supplier_id: null,
            store_id: null,
            order_date: new Date(),
            expected_delivery_date: null,
            status: 'Pending',
            notes: '',
            items: [],
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const watchedItems = watch("items");
    const watchedSupplierId = watch("supplier_id");

    const [pageError, setPageError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);

    // State for item selection UI (remains separate from RHF main form values until item is added)
    const [productLines, setProductLines] = useState<ProductLine[]>([]);
    const [selectedProductLine, setSelectedProductLine] = useState<ProductLine | null>(null);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
    const [productLinesLoading, setProductLinesLoading] = useState(false);
    const [variationsLoading, setVariationsLoading] = useState(false);
    const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
    const [newItemPrice, setNewItemPrice] = useState<number>(0);

    const requiredPermission = isEditing ? 'purchase_order:update' : 'purchase_order:create';

    // Fetch Suppliers and Stores
    useEffect(() => {
        const loadDropdownData = async () => {
            try {
                const [suppliersData, storesData] = await Promise.all([
                    fetchSuppliers(),
                    fetchStores()
                ]);
                setSuppliers(suppliersData || []);
                setStores(storesData || []);
            } catch (err) {
                console.error("Error loading suppliers/stores", err);
                setPageError("Failed to load suppliers or stores.");
            }
        };
        loadDropdownData();
    }, []);

    // Fetch Purchase Order Data for Editing
    const fetchPurchaseOrderData = useCallback(async () => {
        if (!isEditing || !isAuthenticated || !purchaseOrderId) return null;
        try {
            const data = await fetchPurchaseOrderById(purchaseOrderId); // Assume this API now returns item_name_snapshot
            return {
                id: data.id,
                supplier_id: data.supplier_id?.toString() || null,
                store_id: data.store_id?.toString() || null,
                order_date: data.order_date ? new Date(data.order_date) : new Date(),
                expected_delivery_date: data.expected_delivery_date ? new Date(data.expected_delivery_date) : null,
                status: data.status || 'Pending',
                notes: data.notes || '',
                items: (data.items || []).map((item: any) => ({
                    id: item.id,
                    item_variant_id: item.item_variant_id,
                    // Prioritize the snapshot, fallback to old logic if snapshot isn't there (for older orders or if backend hasn't sent it)
                    item_name: item.item_name_snapshot || item.item_display_name || item.base_item_name || 'Unknown Item',
                    quantity: parseInt(item.quantity, 10) || 1,
                    unit_price: parseFloat(item.unit_price) || 0,
                })),
            };
        } catch (err: any) {
            console.error("[PurchaseOrderForm] Error fetching PO details:", err);
            setPageError(err.response?.data?.message || 'Failed to load purchase order data.');
            return null;
        }
    }, [purchaseOrderId, isEditing, isAuthenticated]);

    // Form Initialization Effect
    useEffect(() => {
        const initializeForm = async () => {
            if (!authLoading) {
                if (!isAuthenticated) {
                    setPageError("Please log in to manage purchase orders.");
                    return;
                }
                if (userCan && !userCan(requiredPermission)) {
                    setPageError(`You do not have permission to ${isEditing ? 'edit' : 'create'} purchase orders.`);
                    return;
                }

                if (isEditing) {
                    const data = await fetchPurchaseOrderData();
                    if (data) {
                        reset(data);
                    }
                } else {
                    // Set default store_id if user has one and not global admin
                    const defaultStoreId = (user && user.role_name !== 'global_admin' && user.store_id)
                        ? user.store_id.toString()
                        : null;
                    reset({
                        supplier_id: null,
                        store_id: defaultStoreId,
                        order_date: new Date(),
                        expected_delivery_date: null,
                        status: 'Pending',
                        notes: '',
                        items: [],
                    });
                    setPageError(null);
                }
            }
        };
        initializeForm();
    }, [isEditing, authLoading, isAuthenticated, userCan, requiredPermission, fetchPurchaseOrderData, reset, user]);


    const extractDisplayableVariantPortion = (variationSku: string | null): string => {
        if (!variationSku) return '';
        const parts = variationSku.split('-');
        if (parts.length === 0) return '';

        // Take the last part. This is a heuristic.
        // E.g., "SKU-PART-VARIANTNAME" -> "VARIANTNAME"
        let lastPart = parts[parts.length - 1];

        // Simple capitalization: "BLACK" -> "Black", "S" -> "S", "blue" -> "Blue"
        if (lastPart.length > 0) {
            // Handle all-caps short codes like S, M, L, XL
            if (lastPart.toUpperCase() === lastPart && lastPart.length >= 1 && lastPart.length <= 3) {
                return lastPart; // Keep as is (e.g., "S", "M", "XL")
            }
            // General case: capitalize first letter, lowercase rest
            return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
        }
        return '';
    };

    // Fetch Product Lines based on selected supplier
    useEffect(() => {
        if (watchedSupplierId) {
            setProductLinesLoading(true);
            setProductLines([]); setSelectedProductLine(null);
            setVariations([]); setSelectedVariation(null);
            fetchPurchaseProductLines({ supplier_id: watchedSupplierId })
                .then(data => setProductLines(data || []))
                .catch(err => {
                    console.error("Error fetching product lines:", err);
                    setPageError("Failed to load product lines for the selected supplier.");
                })
                .finally(() => setProductLinesLoading(false));
        } else {
            setProductLines([]);
        }
    }, [watchedSupplierId]);

    // Fetch Variations based on selected product line
    useEffect(() => {
        if (selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable) {
            setVariationsLoading(true);
            setSelectedVariation(null);
            fetchVariationsForProductLine(selectedProductLine.base_item_id)
                .then(data => {
                    const parsedVariations = (data || []).map((v: Variation) => {
                        let finalDisplayName = v.variation_display_name; // Name from API

                        // If API's display name is missing or just whitespace, try to infer from SKU
                        if ((!finalDisplayName || finalDisplayName.trim() === '') && v.variation_sku) {
                            const inferredName = extractDisplayableVariantPortion(v.variation_sku);
                            if (inferredName && inferredName.trim() !== '') {
                                finalDisplayName = inferredName;
                            }
                        }

                        // If still no valid display name (either from API or inference),
                        // consider using the SKU itself as a fallback before a generic placeholder.
                        if (!finalDisplayName || finalDisplayName.trim() === '') {
                            if (v.variation_sku && v.variation_sku.trim() !== '') {
                                // As a last resort for a name, use the SKU if inference didn't yield anything.
                                // Or, if you prefer 'Detail' even if SKU exists, revert to: finalDisplayName = 'Detail';
                                finalDisplayName = extractDisplayableVariantPortion(v.variation_sku) || v.variation_sku; // Try to format SKU's last part, or use raw SKU
                            } else {
                                finalDisplayName = 'Detail'; // Absolute fallback
                            }
                        }

                        return {
                            ...v,
                            unit_price: !isNaN(parseFloat(v.unit_price as any)) ? parseFloat(v.unit_price as any) : 0,
                            variation_display_name: finalDisplayName.trim() // Ensure no leading/trailing whitespace
                        };
                    });
                    setVariations(parsedVariations);
                })
                .catch(err => {
                    console.error("Error fetching variations:", err);
                    setPageError(`Failed to load variations for ${selectedProductLine.item_name}.`);
                })
                .finally(() => setVariationsLoading(false));
        } else {
            setVariations([]);
        }
    }, [selectedProductLine]);

    // Auto-fill price for new item
    useEffect(() => {
        if (selectedVariation) {
            setNewItemPrice(selectedVariation.unit_price || 0);
        } else if (selectedProductLine && selectedProductLine.is_directly_purchasable) {
            setNewItemPrice(selectedProductLine.unit_price_if_direct || selectedProductLine.base_cost_price || 0);
        } else {
            setNewItemPrice(0);
        }
    }, [selectedProductLine, selectedVariation]);

    const handleAddItem = () => {
        let itemToAdd: Omit<PurchaseOrderItemForm, 'id' | 'subtotal'> | null = null; // Omit fields not set at this stage
        let determinedPrice = newItemPrice; // Use state newItemPrice which is auto-filled

        if (selectedProductLine) {
            if (selectedProductLine.item_type === 'Variable') {
                if (selectedVariation) {
                    itemToAdd = {
                        item_variant_id: selectedVariation.item_variant_id,
                        item_name: `${selectedProductLine.item_name} - ${selectedVariation.variation_display_name}`,
                        quantity: newItemQuantity,
                        unit_price: determinedPrice,
                    };
                } else {
                    setPageError("Please select a variation for the variable product."); return;
                }
            } else { // Standard or Service
                if (selectedProductLine.is_directly_purchasable && selectedProductLine.item_variant_id_if_direct) {
                    itemToAdd = {
                        item_variant_id: selectedProductLine.item_variant_id_if_direct,
                        item_name: selectedProductLine.item_name,
                        quantity: newItemQuantity,
                        unit_price: determinedPrice,
                    };
                } else {
                    setPageError("This product line cannot be added directly."); return;
                }
            }
        } else {
            setPageError("Please select a product."); return;
        }

        if (itemToAdd && itemToAdd.quantity > 0 && typeof itemToAdd.unit_price === 'number' && itemToAdd.unit_price >= 0) {
            const existingItemIndex = watchedItems.findIndex(i => i.item_variant_id === itemToAdd!.item_variant_id);
            if (existingItemIndex > -1) {
                const updatedQuantity = watchedItems[existingItemIndex].quantity + itemToAdd.quantity;
                setValue(`items.${existingItemIndex}.quantity`, updatedQuantity);
                // Optionally update price: setValue(`items.${existingItemIndex}.unit_price`, itemToAdd.unit_price);
            } else {
                append(itemToAdd as PurchaseOrderItemForm); // Cast as RHF expects full form
            }
            setSelectedProductLine(null); setSelectedVariation(null);
            setNewItemQuantity(1); setNewItemPrice(0);
            setPageError(null);
        } else if (!itemToAdd) {
            setPageError("Please select a valid item.");
        } else if (itemToAdd.quantity <= 0) {
            setPageError("Quantity must be greater than 0.");
        }
    };

    const calculateTotalAmount = useCallback(() => {
        return watchedItems.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
    }, [watchedItems]);

    const onSubmit = async (data: PurchaseOrderFormValues) => {
        if (!isAuthenticated || (userCan && !userCan(requiredPermission))) {
            setPageError(`You do not have permission to ${isEditing ? 'update' : 'create'} this purchase order.`);
            return;
        }
        setPageError(null); setSuccessMessage(null);

        const payload = {
            ...data,
            supplier_id: data.supplier_id ? parseInt(data.supplier_id, 10) : null,
            store_id: data.store_id ? parseInt(data.store_id, 10) : null,
            items: data.items.map(item => ({
                id: item.id, // Include id if present (for updates, backend should handle this)
                item_variant_id: item.item_variant_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                item_name_snapshot: item.item_name, // Send the constructed item_name
            })),
            total_amount: calculateTotalAmount(),
        };
        if (!isEditing) {
            delete payload.id; // Ensure id is not sent for new POs
        }


        try {
            let responseData;
            if (isEditing && purchaseOrderId) {
                responseData = await updatePurchaseOrder(purchaseOrderId, payload);
            } else {
                responseData = await createPurchaseOrder(payload);
            }
            setSuccessMessage(`Purchase order ${isEditing ? 'updated' : 'created'} successfully!`);
            setTimeout(() => {
                navigate('/dashboard/purchase-orders', { state: { message: `Purchase Order ${isEditing ? 'updated' : 'created'} successfully.`, type: 'success' } });
            }, 1500);
        } catch (err: any) {
            console.error("Submission error:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} purchase order.`;
            setPageError(errMsg);
            if (err.response?.data?.errors) {
                Object.entries(err.response.data.errors).forEach(([field, message]: [string, any]) => {
                    // RHF expects field names like 'items.0.quantity' for array errors
                    // Backend might return errors in a different format, adjust mapping if needed
                    setFormError(field as any, { type: 'server', message });
                });
            }
        }
    };

    const isPageLoading = authLoading || formLoading;

    if (isPageLoading) {
        return <Paper sx={{ p: 3, m: 2, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Paper>;
    }
    if ((!isAuthenticated || (userCan && !userCan(requiredPermission))) && pageError) {
         return (
            <Paper sx={{ p: 3, m: 2, maxWidth: 600, mx: 'auto' }}>
                <Typography variant="h5" align="center" gutterBottom>Access Denied</Typography>
                <Alert severity="error">{pageError}</Alert>
                <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/dashboard/purchase-orders')}>
                    Back to List
                </Button>
            </Paper>
        );
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 }, maxWidth: 1000, mx: 'auto' }}>
                <Typography variant="h5" gutterBottom component="div" sx={{ textAlign: 'center', mb: 3 }}>
                    {isEditing ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </Typography>

                {pageError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>{pageError}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="supplier_id"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={suppliers}
                                        getOptionLabel={(option) => option.name || ''}
                                        value={suppliers.find(s => s.id?.toString() === field.value) || null}
                                        onChange={(event, newValue) => field.onChange(newValue ? newValue.id.toString() : null)}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Supplier"
                                                required
                                                error={!!errors.supplier_id}
                                                helperText={errors.supplier_id?.message}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="store_id"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={stores}
                                        getOptionLabel={(option) => option.name || ''}
                                        value={stores.find(s => s.id?.toString() === field.value) || null}
                                        onChange={(event, newValue) => field.onChange(newValue ? newValue.id.toString() : null)}
                                        disabled={user && user.role_name !== 'global_admin' && !!user.store_id}
                                        renderInput={(params) => (
                                            <TextField
                                                {...params}
                                                label="Store / Warehouse"
                                                required
                                                error={!!errors.store_id}
                                                helperText={errors.store_id?.message}
                                            />
                                        )}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="order_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label="Order Date"
                                        value={field.value}
                                        onChange={(date) => field.onChange(date)}
                                        slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.order_date, helperText: errors.order_date?.message } }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Controller
                                name="expected_delivery_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker
                                        label="Expected Delivery Date (Optional)"
                                        value={field.value}
                                        onChange={(date) => field.onChange(date)}
                                        slotProps={{ textField: { fullWidth: true, error: !!errors.expected_delivery_date, helperText: errors.expected_delivery_date?.message } }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Status"
                                        fullWidth
                                        select
                                        SelectProps={{ native: true }}
                                        error={!!errors.status}
                                        helperText={errors.status?.message}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="Ordered">Ordered</option>
                                        <option value="Partial">Partial</option>
                                        <option value="Received">Received</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </TextField>
                                )}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Controller
                                name="notes"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        label="Notes (Optional)"
                                        multiline
                                        rows={3}
                                        fullWidth
                                        error={!!errors.notes}
                                        helperText={errors.notes?.message}
                                    />
                                )}
                            />
                        </Grid>

                        {/* Item Selection Section */}
                        <Grid item xs={12}><Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Add Items</Typography></Grid>
                        <Grid item xs={12} md={selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable ? 4 : 6}>
                            <Autocomplete
                                options={productLines}
                                getOptionLabel={(option) => `${option.item_name}${option.base_item_sku ? ` (${option.base_item_sku})` : ''}`}
                                value={selectedProductLine}
                                onChange={(event, newValue) => setSelectedProductLine(newValue)}
                                renderInput={(params) => <TextField {...params} label="Select Product Line" />}
                                loading={productLinesLoading}
                                disabled={!watchedSupplierId || productLinesLoading}
                                fullWidth
                            />
                        </Grid>
                        {selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable && (
                            <Grid item xs={12} md={4}>
                                <Autocomplete
                                    options={variations}
                                    getOptionLabel={(option) => `${option.variation_display_name}${option.variation_sku ? ` (${option.variation_sku})` : ''}`}
                                    value={selectedVariation}
                                    onChange={(event, newValue) => setSelectedVariation(newValue)}
                                    renderInput={(params) => <TextField {...params} label="Select Variation" />}
                                    loading={variationsLoading}
                                    disabled={variationsLoading || variations.length === 0}
                                    fullWidth
                                />
                            </Grid>
                        )}
                        <Grid item xs={6} md={2}>
                            <TextField label="Quantity" type="number" value={newItemQuantity} onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} InputProps={{ inputProps: { min: 1 } }} fullWidth />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField label="Unit Price" type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)} InputProps={{ inputProps: { step: "0.01", min: 0 } }} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable ? 12 : 2} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Button variant="contained" color="secondary" startIcon={<AddCircleOutlineOutlinedIcon />} onClick={handleAddItem} disabled={!selectedProductLine || (selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable && !selectedVariation)} fullWidth>Add Item</Button>
                        </Grid>

                        {/* Items Table */}
                        {fields.length > 0 && (
                            <Grid item xs={12}>
                                <TableContainer component={Paper} sx={{ mt: 2, border: '1px solid lightgray' }}>
                                    <Table size="small">
                                        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableRow>
                                                <TableCell>Item Name</TableCell>
                                                <TableCell align="right">Quantity</TableCell>
                                                <TableCell align="right">Unit Price</TableCell>
                                                <TableCell align="right">Subtotal</TableCell>
                                                <TableCell align="center">Actions</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {fields.map((item, index) => {
                                                const currentItem = watchedItems[index]; // Get current values from watched state
                                                const unitPrice = typeof currentItem?.unit_price === 'number' ? currentItem.unit_price : 0;
                                                const quantity = typeof currentItem?.quantity === 'number' ? currentItem.quantity : 0;
                                                const subtotal = unitPrice * quantity;
                                                return (
                                                    <TableRow key={item.id}> {/* item.id is from useFieldArray */}
                                                        <TableCell>{currentItem?.item_name}</TableCell>
                                                        <TableCell align="right">{quantity}</TableCell>
                                                        <TableCell align="right">${unitPrice.toFixed(2)}</TableCell>
                                                        <TableCell align="right">${subtotal.toFixed(2)}</TableCell>
                                                        <TableCell align="center">
                                                            <IconButton onClick={() => remove(index)} color="error" size="small">
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            <TableRow sx={{ backgroundColor: '#f9f9f9' }}>
                                                <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Total Amount:</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>${calculateTotalAmount().toFixed(2)}</TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {errors.items && !Array.isArray(errors.items) && /* For root array errors */
                                    <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>{errors.items.message}</Typography>
                                }
                            </Grid>
                        )}
                    </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3, p: 2, borderTop: '1px solid lightgray' }}>
                        <Button onClick={() => navigate('/dashboard/purchase-orders')} sx={{ mr: 1 }} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" variant="contained" color="primary" disabled={isSubmitting || isPageLoading || (userCan && !userCan(requiredPermission))}>
                            {isSubmitting ? <CircularProgress size={24} /> : (isEditing ? 'Update Purchase Order' : 'Create Purchase Order')}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </LocalizationProvider>
    );
}

export default PurchaseOrderForm;