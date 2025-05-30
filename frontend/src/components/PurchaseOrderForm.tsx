import React, { useEffect, useState, useCallback, useRef } from 'react'; // Add useRef
import { useParams, useNavigate } from 'react-router-dom';
import {
    Paper, Box, Typography, TextField, Button, Grid, Autocomplete,
    CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert, Accordion, AccordionSummary, AccordionDetails,
    Divider, Switch, FormControlLabel
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckIcon from '@mui/icons-material/Check'; // Import CheckIcon
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
    fetchSuppliers, createPurchaseOrder, fetchPurchaseOrderById, updatePurchaseOrder,
    fetchStores,
    fetchPurchaseProductLines,
    fetchVariationsForProductLine
} from '../services/api'; // Adjust path as needed
import { useAuth } from '../context/AuthContext';

// Interfaces
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

interface PurchaseOrderItemForm {
    id?: number;
    item_variant_id: number;
    item_name: string; // This will store the full display name like "Product - Variant"
    quantity: number;
    unit_price: number;
    subtotal?: number;
    // Fields from image (need backend/state changes if made functional)
    item_type_display?: string; // e.g., "Item"
    item_no_display?: string; // e.g., SKU
    location_code?: string;
    bin_code?: string;
    reserved_quantity?: number;
    unit_of_measure_code?: string;
}

interface PurchaseOrderFormValues {
    id?: number;
    supplier_id: string | null;
    store_id: string | null; // Maps to "Location Code" at header, but image also has it per line
    order_date: Date | null;
    expected_delivery_date: Date | null;
    status: string;
    notes: string;
    items: PurchaseOrderItemForm[];
    // New header fields from image (need full implementation)
    contact_person?: string; // Placeholder
    vendor_invoice_no?: string; // Placeholder
    vendor_shipment_no?: string; // Placeholder
    linked_with_edocument?: boolean; // Placeholder
    // New total fields from image (need calculation logic)
    subtotal_excl_vat?: number;
    inv_discount_amount?: number;
    invoice_discount_percent?: number;
}

// Validation Schema - Needs to be updated if new fields are made mandatory/functional
const purchaseOrderItemSchema = yup.object().shape({
    item_variant_id: yup.number().required(),
    item_name: yup.string().required("Item description is required."),
    quantity: yup.number().min(1, 'Quantity must be at least 1').required('Quantity is required.').typeError('Quantity must be a number.'),
    unit_price: yup.number().min(0, 'Unit price cannot be negative').required('Unit price is required.').typeError('Unit price must be a number.'),
    // Add validation for new item fields if they become functional
    item_type_display: yup.string().optional(),
    item_no_display: yup.string().optional(),
    location_code: yup.string().optional(),
});

const purchaseOrderSchema = yup.object().shape({
    supplier_id: yup.string().nullable().required('Supplier is required.'),
    store_id: yup.string().nullable().required('Store/Warehouse is required.'), // Header level store
    order_date: yup.date().nullable().required('Order date is required.').typeError('Invalid date format.'),
    expected_delivery_date: yup.date().nullable().typeError('Invalid date format.'),
    status: yup.string().required('Status is required.'),
    notes: yup.string().nullable(),
    items: yup.array().of(purchaseOrderItemSchema).min(1, 'At least one item must be added to the order.').required(),
    // Add validation for new header fields
    contact_person: yup.string().optional(),
    vendor_invoice_no: yup.string().optional(), // Make required if needed: .required('Vendor Invoice No. is required.')
    vendor_shipment_no: yup.string().optional(),
    linked_with_edocument: yup.boolean().optional(),
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
            contact_person: '',
            vendor_invoice_no: '',
            vendor_shipment_no: '',
            linked_with_edocument: false,
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

    const [productLines, setProductLines] = useState<ProductLine[]>([]);
    const [selectedProductLine, setSelectedProductLine] = useState<ProductLine | null>(null);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
    const [productLinesLoading, setProductLinesLoading] = useState(false);
    const [variationsLoading, setVariationsLoading] = useState(false);
    const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
    const [newItemPrice, setNewItemPrice] = useState<number>(0);

    // REMOVE: const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null); 
    
    // ADD these for cell editing:
    const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: 'quantity' | 'unit_price' } | null>(null);
    const [currentEditValue, setCurrentEditValue] = useState<string | number>('');
    const editInputRef = useRef<HTMLInputElement>(null);

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
            const data = await fetchPurchaseOrderById(purchaseOrderId);
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
                    item_name: item.item_name_snapshot || item.item_display_name || item.base_item_name || 'Unknown Item',
                    quantity: parseInt(item.quantity, 10) || 1,
                    unit_price: parseFloat(item.unit_price) || 0,
                    // Map other potential fields if backend sends them
                    item_type_display: item.item_type_display || "Item",
                    item_no_display: item.item_no_display || item.variation_sku, // Fallback to SKU
                    location_code: item.location_code, // Needs to be saved/fetched
                })),
                contact_person: data.contact_person || '',
                vendor_invoice_no: data.vendor_invoice_no || '',
                vendor_shipment_no: data.vendor_shipment_no || '',
                linked_with_edocument: data.linked_with_edocument || false,
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
                        contact_person: '',
                        vendor_invoice_no: '',
                        vendor_shipment_no: '',
                        linked_with_edocument: false,
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
        let lastPart = parts[parts.length - 1];
        if (lastPart.length > 0) {
            if (lastPart.toUpperCase() === lastPart && lastPart.length >= 1 && lastPart.length <= 3) {
                return lastPart;
            }
            return lastPart.charAt(0).toUpperCase() + lastPart.slice(1).toLowerCase();
        }
        return '';
    };

    // Fetch Product Lines
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

    // Fetch Variations
    useEffect(() => {
        if (selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable) {
            setVariationsLoading(true);
            setSelectedVariation(null);
            fetchVariationsForProductLine(selectedProductLine.base_item_id)
                .then(data => {
                    const parsedVariations = (data || []).map((v: Variation) => {
                        let finalDisplayName = v.variation_display_name;
                        if ((!finalDisplayName || finalDisplayName.trim() === '') && v.variation_sku) {
                            const inferredName = extractDisplayableVariantPortion(v.variation_sku);
                            if (inferredName && inferredName.trim() !== '') {
                                finalDisplayName = inferredName;
                            }
                        }
                        if (!finalDisplayName || finalDisplayName.trim() === '') {
                            finalDisplayName = extractDisplayableVariantPortion(v.variation_sku) || v.variation_sku || 'Detail';
                        }
                        return {
                            ...v,
                            unit_price: !isNaN(parseFloat(v.unit_price as any)) ? parseFloat(v.unit_price as any) : 0,
                            variation_display_name: finalDisplayName.trim()
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

    // ADD this useEffect for focusing the edit input
    useEffect(() => {
        if (editingCell && editInputRef.current) {
            editInputRef.current.focus();
            // editInputRef.current.select(); // You can uncomment this to auto-select text
        }
    }, [editingCell]);

    const handleAddItem = () => {
        let itemToAdd: Omit<PurchaseOrderItemForm, 'id' | 'subtotal'> | null = null;
        let determinedPrice = newItemPrice;

        if (selectedProductLine) {
            let itemName = selectedProductLine.item_name;
            let itemNo = selectedProductLine.base_item_sku || selectedProductLine.item_name;
            let itemVariantIdToUse: number;

            if (selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable) {
                if (selectedVariation) {
                    itemName = `${selectedProductLine.item_name} - ${selectedVariation.variation_display_name}`;
                    itemNo = selectedVariation.variation_sku || itemNo;
                    itemVariantIdToUse = selectedVariation.item_variant_id;
                } else {
                    setPageError("Please select a variation for the variable product."); return;
                }
            } else if (selectedProductLine.is_directly_purchasable && selectedProductLine.item_variant_id_if_direct) {
                itemVariantIdToUse = selectedProductLine.item_variant_id_if_direct;
            } else {
                 setPageError("This product line cannot be added directly or is missing variant ID."); return;
            }
             itemToAdd = {
                item_variant_id: itemVariantIdToUse,
                item_name: itemName,
                quantity: newItemQuantity,
                unit_price: determinedPrice,
                item_type_display: "Item", // Defaulting to "Item"
                item_no_display: itemNo,
                // location_code: watch("store_id") || undefined // Example: use header store_id
            };

        } else {
            setPageError("Please select a product."); return;
        }

        if (itemToAdd && itemToAdd.quantity > 0 && typeof itemToAdd.unit_price === 'number' && itemToAdd.unit_price >= 0) {
            const existingItemIndex = watchedItems.findIndex(i => i.item_variant_id === itemToAdd!.item_variant_id);
            if (existingItemIndex > -1) {
                const updatedQuantity = watchedItems[existingItemIndex].quantity + itemToAdd.quantity;
                setValue(`items.${existingItemIndex}.quantity`, updatedQuantity);
            } else {
                append(itemToAdd as PurchaseOrderItemForm);
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

    const handleCellDoubleClick = (rowIndex: number, field: 'quantity' | 'unit_price', currentValue: number) => {
        if (isSubmitting || (isEditing && userCan && !userCan(requiredPermission))) return; // Prevent edit if submitting or no permission
        setEditingCell({ rowIndex, field });
        setCurrentEditValue(currentValue.toString());
    };

    const handleEditInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentEditValue(event.target.value);
    };

    const commitEdit = () => {
        if (!editingCell) return;
        const { rowIndex, field } = editingCell;
        
        let numericValue: number;
        const originalItem = watchedItems[rowIndex];

        if (field === 'quantity') {
            numericValue = parseInt(currentEditValue as string, 10);
            if (isNaN(numericValue) || numericValue < 1) {
                 // Optionally revert to original or show error
                // For now, let RHF validation handle it or revert
                numericValue = originalItem.quantity; 
            }
        } else { // unit_price
            numericValue = parseFloat(currentEditValue as string);
            if (isNaN(numericValue) || numericValue < 0) {
                // Optionally revert to original or show error
                numericValue = originalItem.unit_price;
            }
        }
        
        setValue(`items.${rowIndex}.${field}`, numericValue, { shouldValidate: true, shouldDirty: true });
        setEditingCell(null);
    };

    const handleEditInputBlur = () => {
        commitEdit();
    };

    const handleEditInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            commitEdit();
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setEditingCell(null); // Cancel edit on Escape
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
            ...data, // Includes new header fields like vendor_invoice_no
            supplier_id: data.supplier_id ? parseInt(data.supplier_id, 10) : null,
            store_id: data.store_id ? parseInt(data.store_id, 10) : null,
            items: data.items.map(item => ({
                id: item.id,
                item_variant_id: item.item_variant_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                item_name_snapshot: item.item_name, // This is the full display name
                // Send other item fields if backend supports them
                // item_type_display: item.item_type_display,
                // item_no_display: item.item_no_display,
                // location_code: item.location_code,
            })),
            total_amount: calculateTotalAmount(),
        };
        if (!isEditing) {
            delete payload.id;
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
            <Paper sx={{ p: 3, m: 2, maxWidth: 800, mx: 'auto' }}>
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
            <Paper sx={{ p: { xs: 1, sm: 2, md: 3 }, m: { xs: 1, md: 2 } }}>
                <Typography variant="h5" gutterBottom component="div" sx={{ textAlign: 'center', mb: 2 }}>
                    {isEditing ? `Edit Purchase Order (ID: ${purchaseOrderId})` : 'Create New Purchase Order'}
                </Typography>

                {pageError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setPageError(null)}>{pageError}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}

                <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
                    {/* Header Section */}
                    <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={12} md={4}>
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
                                            <TextField {...params} label="Vendor Name" required error={!!errors.supplier_id} helperText={errors.supplier_id?.message} />
                                        )}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                             <Controller
                                name="contact_person" // Placeholder for new field
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Contact" fullWidth error={!!errors.contact_person} helperText={errors.contact_person?.message} />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Controller
                                name="vendor_shipment_no" // Placeholder
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Vendor Shipment No." fullWidth error={!!errors.vendor_shipment_no} helperText={errors.vendor_shipment_no?.message} />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Controller
                                name="order_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker label="Document Date" value={field.value} onChange={(date) => field.onChange(date)} slotProps={{ textField: { fullWidth: true, required: true, error: !!errors.order_date, helperText: errors.order_date?.message } }} />
                                )}
                            />
                        </Grid>
                         <Grid item xs={12} md={4}>
                            <Controller
                                name="vendor_invoice_no" // Placeholder - make required in schema if needed
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Vendor Invoice No." fullWidth error={!!errors.vendor_invoice_no} helperText={errors.vendor_invoice_no?.message} />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Status" fullWidth select SelectProps={{ native: true }} error={!!errors.status} helperText={errors.status?.message} >
                                        <option value="Pending">Pending</option>
                                        <option value="Open">Open</option> {/* From image */}
                                        <option value="Ordered">Ordered</option>
                                        <option value="Partial">Partial</option>
                                        <option value="Received">Received</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </TextField>
                                )}
                            />
                        </Grid>
                         <Grid item xs={12} md={4}>
                            <Controller
                                name="store_id" // Represents header level "Location Code"
                                control={control}
                                render={({ field }) => (
                                    <Autocomplete
                                        options={stores}
                                        getOptionLabel={(option) => option.name || ''}
                                        value={stores.find(s => s.id?.toString() === field.value) || null}
                                        onChange={(event, newValue) => field.onChange(newValue ? newValue.id.toString() : null)}
                                        disabled={user && user.role_name !== 'global_admin' && !!user.store_id}
                                        renderInput={(params) => (
                                            <TextField {...params} label="Location Code (Warehouse)" required error={!!errors.store_id} helperText={errors.store_id?.message} />
                                        )}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                             <Controller
                                name="expected_delivery_date"
                                control={control}
                                render={({ field }) => (
                                    <DatePicker label="Expected Delivery Date" value={field.value} onChange={(date) => field.onChange(date)} slotProps={{ textField: { fullWidth: true, error: !!errors.expected_delivery_date, helperText: errors.expected_delivery_date?.message } }} />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} md={4} sx={{display: 'flex', alignItems: 'center'}}>
                            <Controller
                                name="linked_with_edocument" // Placeholder
                                control={control}
                                render={({ field }) => (
                                     <FormControlLabel control={<Switch {...field} checked={field.value || false} />} label="Linked with E-Document" />
                                )}
                            />
                        </Grid>
                    </Grid>
                    <Divider sx={{ my: 2 }} />

                    {/* Item Selection Section - More compact */}
                    <Typography variant="h6" sx={{ mb: 1 }}>Lines</Typography>
                    <Grid container spacing={2} alignItems="flex-end" sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Autocomplete
                                options={productLines}
                                getOptionLabel={(option) => `${option.item_name}${option.base_item_sku ? ` (${option.base_item_sku})` : ''}`}
                                value={selectedProductLine}
                                onChange={(event, newValue) => setSelectedProductLine(newValue)}
                                renderInput={(params) => <TextField {...params} label="Select Product Line" variant="standard" />}
                                loading={productLinesLoading}
                                disabled={!watchedSupplierId || productLinesLoading}
                            />
                        </Grid>
                        {selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable && (
                            <Grid item xs={12} sm={6} md={3}>
                                <Autocomplete
                                    options={variations}
                                    getOptionLabel={(option) => `${option.variation_display_name}${option.variation_sku ? ` (${option.variation_sku})` : ''}`}
                                    value={selectedVariation}
                                    onChange={(event, newValue) => setSelectedVariation(newValue)}
                                    renderInput={(params) => <TextField {...params} label="Select Variation" variant="standard" />}
                                    loading={variationsLoading}
                                    disabled={variationsLoading || variations.length === 0}
                                />
                            </Grid>
                        )}
                        <Grid item xs={6} sm={3} md={1}>
                            <TextField label="Qty" type="number" value={newItemQuantity} onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))} InputProps={{ inputProps: { min: 1 } }} fullWidth variant="standard"/>
                        </Grid>
                        <Grid item xs={6} sm={3} md={2}>
                            <TextField label="Unit Price" type="number" value={newItemPrice} onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)} InputProps={{ inputProps: { step: "0.01", min: 0 } }} fullWidth variant="standard"/>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Button 
                                variant="contained" 
                                color="secondary" 
                                startIcon={<AddCircleOutlineOutlinedIcon />} 
                                onClick={handleAddItem} 
                                disabled={
                                    !selectedProductLine || 
                                    (selectedProductLine?.item_type === 'Variable' && !selectedProductLine?.is_directly_purchasable && !selectedVariation) ||
                                    !!editingCell // Disable if a cell is being edited
                                } 
                                fullWidth
                            >
                                Add Item to Order
                            </Button>
                        </Grid>
                    </Grid>

                    {/* Items Table */}
                    {fields.length > 0 && (
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                            <Table size="small">
                                <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                                    <TableRow>
                                        <TableCell sx={{width: '10%'}}>Type</TableCell> {/* New from image */}
                                        <TableCell sx={{width: '15%'}}>No.</TableCell> {/* New from image (SKU) */}
                                        <TableCell sx={{width: '25%'}}>Description</TableCell>
                                        {/* <TableCell>Location Code</TableCell> New from image - per line */}
                                        {/* <TableCell>Bin Code</TableCell> New from image - per line */}
                                        <TableCell align="right" sx={{width: '10%'}}>Quantity</TableCell>
                                        {/* <TableCell align="right">Reserved Qty</TableCell> New from image */}
                                        {/* <TableCell>Unit of Measure</TableCell> New from image */}
                                        <TableCell align="right" sx={{width: '15%'}}>Unit Price</TableCell>
                                        <TableCell align="right" sx={{width: '15%'}}>Subtotal</TableCell>
                                        <TableCell align="center" sx={{width: '10%'}}>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {fields.map((field, index) => {
                                        const currentItem = watchedItems[index];
                                        const unitPrice = typeof currentItem?.unit_price === 'number' ? currentItem.unit_price : 0;
                                        const quantity = typeof currentItem?.quantity === 'number' ? currentItem.quantity : 0;
                                        const subtotal = unitPrice * quantity;
                                        // REMOVE: const isEditingRow = editingRowIndex === index;

                                        // ADD these for cell-specific editing state
                                        const isEditingQuantity = editingCell?.rowIndex === index && editingCell?.field === 'quantity';
                                        const isEditingPrice = editingCell?.rowIndex === index && editingCell?.field === 'unit_price';

                                        return (
                                            <TableRow 
                                                key={field.id} 
                                                hover 
                                                // REMOVE: onDoubleClick from TableRow related to setEditingRowIndex
                                                // sx={{ backgroundColor: isEditingRow ? (theme) => theme.palette.action.hover : 'transparent' }}
                                            >
                                                <TableCell>{currentItem?.item_type_display || "Item"}</TableCell>
                                                <TableCell>{currentItem?.item_no_display || currentItem?.item_variant_id}</TableCell>
                                                <TableCell>{currentItem?.item_name}</TableCell>
                                                
                                                <TableCell
                                                    align="right"
                                                    onDoubleClick={() => !isEditingQuantity && handleCellDoubleClick(index, 'quantity', quantity)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    {isEditingQuantity ? (
                                                        <TextField 
                                                            value={currentEditValue} 
                                                            onChange={handleEditInputChange} 
                                                            onBlur={handleEditInputBlur} 
                                                            onKeyDown={handleEditInputKeyDown} 
                                                            type="number" 
                                                            size="small" 
                                                            variant="standard" 
                                                            inputRef={editInputRef} 
                                                            InputProps={{ inputProps: { min: 1 } }} 
                                                            sx={{ width: '60px', textAlign: 'right' }} 
                                                            autoFocus 
                                                        />
                                                    ) : (
                                                        quantity
                                                    )}
                                                </TableCell>
                                                <TableCell
                                                    align="right"
                                                    onDoubleClick={() => !isEditingPrice && handleCellDoubleClick(index, 'unit_price', unitPrice)}
                                                    sx={{ cursor: 'pointer' }}
                                                >
                                                    {isEditingPrice ? (
                                                        <TextField 
                                                            value={currentEditValue} 
                                                            onChange={handleEditInputChange} 
                                                            onBlur={handleEditInputBlur} 
                                                            onKeyDown={handleEditInputKeyDown} 
                                                            type="number" 
                                                            size="small" 
                                                            variant="standard" 
                                                            inputRef={editInputRef} 
                                                            InputProps={{ inputProps: { step: "0.01", min: 0 } }} 
                                                            sx={{ width: '80px', textAlign: 'right' }} 
                                                            autoFocus 
                                                        />
                                                    ) : (
                                                        `$${unitPrice.toFixed(2)}`
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">${subtotal.toFixed(2)}</TableCell>
                                                <TableCell align="center">
                                                    {/* REMOVE CheckIcon logic for saving row edit */}
                                                    {/* {isEditingRow ? (
                                                        <IconButton onClick={() => setEditingRowIndex(null)} color="primary" size="small" aria-label="save changes">
                                                            <CheckIcon fontSize="small" />
                                                        </IconButton>
                                                    ) : null} */}
                                                    <IconButton 
                                                        onClick={() => !editingCell && remove(index)} // Prevent delete if any cell is being edited
                                                        color="error" 
                                                        size="small" 
                                                        aria-label="delete item"
                                                        disabled={!!editingCell || isSubmitting} 
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                    {errors.items && !Array.isArray(errors.items) &&
                        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>{errors.items.message}</Typography>
                    }

                    {/* Totals Section - Placeholder */}
                    <Grid container spacing={2} justifyContent="flex-end" sx={{ mb: 2, p: 2, backgroundColor: (theme) => theme.palette.grey[50], borderRadius: 1 }}>
                        {/* Placeholder for detailed totals from image */}
                        <Grid item xs={12} sm={4} md={3}> <Typography variant="body2">Subtotal Excl. VAT (LKR):</Typography> </Grid>
                        <Grid item xs={12} sm={8} md={3}> <Typography variant="body2" align="right">0.00</Typography> </Grid>
                        <Grid item xs={12} sm={4} md={3}> <Typography variant="subtitle1">Total Excl. VAT (LKR):</Typography> </Grid>
                        <Grid item xs={12} sm={8} md={3}> <Typography variant="subtitle1" align="right">${calculateTotalAmount().toFixed(2)}</Typography> </Grid>
                         {/* Add other totals here: Inv. Discount, Total VAT, Total Incl. VAT */}
                    </Grid>


                    {/* Collapsible Sections */}
                    <Accordion sx={{mb:1}}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="invoice-details-content" id="invoice-details-header">
                            <Typography>Invoice Details</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Controller
                                name="notes"
                                control={control}
                                render={({ field }) => (
                                    <TextField {...field} label="Notes / Remarks" multiline rows={3} fullWidth error={!!errors.notes} helperText={errors.notes?.message} />
                                )}
                            />
                            {/* Add other invoice-related fields here */}
                        </AccordionDetails>
                    </Accordion>
                    <Accordion sx={{mb:1}}>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />} aria-controls="shipping-payment-content" id="shipping-payment-header">
                            <Typography>Shipping and Payment</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Typography>Shipping and payment details fields would go here...</Typography>
                            {/* e.g., Shipping Address, Payment Terms */}
                        </AccordionDetails>
                    </Accordion>
                     {/* Add more accordions for Foreign Trade, Prepayment etc. */}


                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3, pt: 2, borderTop: `1px solid ${ (theme) => theme.palette.divider}` }}>
                        <Button onClick={() => navigate('/dashboard/purchase-orders')} sx={{ mr: 2 }} disabled={isSubmitting} variant="outlined" color="secondary">Cancel</Button>
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