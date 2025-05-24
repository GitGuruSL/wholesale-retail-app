import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // Ensure useParams is imported
import {
    Paper, Box, Typography, TextField, Button, Grid, Autocomplete,
    CircularProgress, IconButton, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Alert
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleOutlineOutlinedIcon from '@mui/icons-material/AddCircleOutlineOutlined'; // For the outlined version
// Assuming you have these API service functions:
import {
    fetchSuppliers, createPurchaseOrder, fetchPurchaseOrderById, updatePurchaseOrder,
    fetchStores,
    fetchPurchaseProductLines, // New
    fetchVariationsForProductLine // New
} from '../services/api'; // Adjust path as needed
import { useAuth } from '../context/AuthContext'; // If contexts is sibling to src

interface ProductLine {
    base_item_id: number;
    item_name: string;
    base_item_sku: string | null;
    base_cost_price: number | null;
    item_type: 'Standard' | 'Service' | 'Variable';
    is_directly_purchasable: boolean;
    item_variant_id_if_direct: number | null; // ID to use if directly purchasable
    unit_price_if_direct: number | null; // Price to use if directly purchasable
}

interface Variation {
    item_variant_id: number; // This is the actual ID for purchase_order_items
    variation_sku: string | null;
    variation_display_name: string;
    unit_price: number;
    base_item_id: number;
}

// Define your PurchaseOrderItem interface if not already defined
interface PurchaseOrderItem {
    id?: number; // For existing items when editing
    item_variant_id: number;
    item_name: string; // Display name in the table
    quantity: number;
    unit_price: number;
    subtotal?: number; // Calculated
    // Add other fields like tax, discount if applicable per item
}

// Define the overall form data structure
interface PurchaseOrderFormData {
    id?: number; // Optional: for existing POs
    supplier_id: string;
    store_id: string;
    order_date: Date | null;
    expected_delivery_date: Date | null;
    status: string;
    notes: string;
    items: PurchaseOrderItem[];
    total_amount?: number; // Optional: or initialize if always needed
}

const PurchaseOrderForm = () => {
    const navigate = useNavigate();
    const params = useParams(); // Get all params
    const purchaseOrderId = params.purchaseOrderId; // Specifically access purchaseOrderId
    const { userCan } = useAuth(); // <--- ADD THIS LINE

    // Define the initial empty state
    const initialFormData: PurchaseOrderFormData = {
        supplier_id: '',
        store_id: '',
        order_date: new Date(),
        expected_delivery_date: null,
        status: 'Pending',
        notes: '',
        items: [],
        total_amount: 0,
        // id will be set when editing
    };

    const [formData, setFormData] = useState<PurchaseOrderFormData>(initialFormData);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [stores, setStores] = useState<any[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [initialLoading, setInitialLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formErrors, setFormErrors] = useState<any>({});


    // --- New State for Two-Dropdown Item Selection ---
    const [productLines, setProductLines] = useState<ProductLine[]>([]);
    const [selectedProductLine, setSelectedProductLine] = useState<ProductLine | null>(null);
    const [variations, setVariations] = useState<Variation[]>([]);
    const [selectedVariation, setSelectedVariation] = useState<Variation | null>(null);
    const [productLinesLoading, setProductLinesLoading] = useState(false);
    const [variationsLoading, setVariationsLoading] = useState(false);

    const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
    const [newItemPrice, setNewItemPrice] = useState<number>(0); // Can be auto-filled

    const requiredPermission = purchaseOrderId ? 'purchase_order:update' : 'purchase_order:create';

    // Log formData whenever it changes to see its state
    useEffect(() => {
        console.log('[PurchaseOrderForm] formData changed (this log shows the new state):', JSON.stringify(formData, null, 2));
    }, [formData]);

    useEffect(() => {
        const loadSuppliersAsync = async () => {
            try {
                console.log('[PurchaseOrderForm] Fetching suppliers...');
                const data = await fetchSuppliers();
                setSuppliers(data || []);
                console.log('[PurchaseOrderForm] Suppliers loaded:', data);
            } catch (err) {
                setError('Failed to load suppliers.');
                console.error('[PurchaseOrderForm] Error loading suppliers:', err);
            }
        };
        const loadStoresAsync = async () => {
            try {
                console.log('[PurchaseOrderForm] Fetching stores...');
                const data = await fetchStores();
                setStores(data || []);
                console.log('[PurchaseOrderForm] Stores loaded:', data);
            } catch (err) {
                setError('Failed to load stores.');
                console.error('[PurchaseOrderForm] Error loading stores:', err);
            }
        };

        const loadPurchaseOrderDataAsync = async () => {
            console.log(`[PurchaseOrderForm] loadPurchaseOrderDataAsync called. isEditing: ${Boolean(purchaseOrderId)}, purchaseOrderId: ${purchaseOrderId}`);

            if (purchaseOrderId) {
                setInitialLoading(true);
                setError(null);
                console.log(`[PurchaseOrderForm] Attempting to edit PO ID: ${purchaseOrderId}`);
                try {
                    const fetchedPurchaseOrderData = await fetchPurchaseOrderById(purchaseOrderId);
                    // CRITICAL LOG 2: What does the API return? (This now directly holds the PO data)
                    console.log('[PurchaseOrderForm] Raw API response from fetchPurchaseOrderById (should be the PO data object):', fetchedPurchaseOrderData);

                    // Check if fetchedPurchaseOrderData is a valid object and has an 'id' property
                    if (fetchedPurchaseOrderData && typeof fetchedPurchaseOrderData.id !== 'undefined') {
                        const purchaseOrderData = fetchedPurchaseOrderData; // Use the fetched data directly
                        // CRITICAL LOG 3: Is the data extracted correctly?
                        console.log('[PurchaseOrderForm] Successfully fetched PO Data for Edit:', purchaseOrderData);

                        const newFormData = {
                            id: purchaseOrderData.id,
                            supplier_id: purchaseOrderData.supplier_id?.toString() || '',
                            store_id: purchaseOrderData.store_id?.toString() || '',
                            order_date: purchaseOrderData.order_date ? new Date(purchaseOrderData.order_date) : new Date(),
                            expected_delivery_date: purchaseOrderData.expected_delivery_date ? new Date(purchaseOrderData.expected_delivery_date) : null,
                            status: purchaseOrderData.status || 'Pending',
                            notes: purchaseOrderData.notes || '',
                            total_amount: purchaseOrderData.total_amount || 0,
                            items: (purchaseOrderData.items || []).map((item: any) => {
                                const price = parseFloat(item.unit_price);
                                const qty = parseInt(item.quantity, 10);
                                let displayName = item.base_item_name || 'Unknown Item';
                                if (item.variant_name && item.variant_name.toLowerCase() !== 'default' && item.variant_name !== item.base_item_name) {
                                    displayName = `${item.base_item_name} - ${item.variant_name}`;
                                }
                                return {
                                    id: item.id, // Keep item ID if present for updates
                                    item_variant_id: item.item_variant_id,
                                    item_name: displayName,
                                    quantity: !isNaN(qty) ? qty : 1,
                                    unit_price: !isNaN(price) ? price : 0,
                                    subtotal: parseFloat(item.subtotal) || 0,
                                };
                            }),
                        };
                        console.log('[PurchaseOrderForm] Prepared new form data for setFormData:', JSON.stringify(newFormData, null, 2));
                        setFormData(newFormData);
                    } else {
                        console.error('[PurchaseOrderForm] Failed to parse PO data or API call unsuccessful. Response from fetchPurchaseOrderById:', fetchedPurchaseOrderData);
                        setError('Failed to load purchase order details: Invalid data received.');
                        setFormData(initialFormData); // Reset
                    }
                } catch (err: any) {
                    console.error('[PurchaseOrderForm] Error in fetchPurchaseOrderById or processing:', err);
                    setError(`Failed to load purchase order details: ${err.message || 'Unknown error'}`);
                    setFormData(initialFormData); // Reset
                } finally {
                    setInitialLoading(false);
                }
            } else {
                console.log('[PurchaseOrderForm] Not in editing mode or no purchaseOrderId, resetting form to initial state.');
                setFormData(initialFormData); // Reset
                setInitialLoading(false);
            }
        };

        loadSuppliersAsync();
        loadStoresAsync();
        loadPurchaseOrderDataAsync();

    }, [purchaseOrderId]); // Dependencies are correct

    // This log will show the actual state *after* it has been updated.
    useEffect(() => {
        // CRITICAL LOG 5: What is the final formData state after all operations in the above useEffect?
        console.log('[PurchaseOrderForm] formData changed (this log shows the new state):', JSON.stringify(formData, null, 2));
    }, [formData]);

    // --- useEffect to fetch Product Lines ---
    useEffect(() => {
        console.log('useEffect for product lines triggered. formData.supplier_id:', formData.supplier_id);
        if (formData.supplier_id) {
            const currentSupplierId = formData.supplier_id;
            setProductLinesLoading(true);
            // It's good practice to clear previous results when dependencies change
            setProductLines([]);
            setSelectedProductLine(null);
            setVariations([]);
            setSelectedVariation(null);

            // If currentSupplierId is an empty string (no supplier selected), pass undefined.
            // Otherwise, pass the actual ID.
            const supplierIdParam = currentSupplierId ? currentSupplierId : undefined;

            fetchPurchaseProductLines({ supplier_id: supplierIdParam })
                .then(data => {
                    setProductLines(data || []);
                })
                .catch(err => {
                    console.error("Error fetching product lines:", err);
                    setError("Failed to load product lines."); // Use a more generic error message here
                    setProductLines([]);
                })
                .finally(() => setProductLinesLoading(false));
        } else {
            setProductLines([]); // Clear product lines if no supplier
        }
    }, [formData.supplier_id]);

    // --- useEffect to fetch Variations when a Product Line is selected ---
    useEffect(() => {
        if (selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable) {
            setVariationsLoading(true);
            setSelectedVariation(null); // Reset
            fetchVariationsForProductLine(selectedProductLine.base_item_id)
                .then(data => {
                    const parsedVariations = (data || []).map((v: any) => ({
                        ...v,
                        // Ensure unit_price is a number, default to 0 if parsing fails
                        unit_price: !isNaN(parseFloat(v.unit_price)) ? parseFloat(v.unit_price) : 0
                    }));
                    setVariations(parsedVariations);
                })
                .catch(err => {
                    console.error("Error fetching variations:", err);
                    setError(`Failed to load variations for ${selectedProductLine.item_name}.`);
                    setVariations([]);
                })
                .finally(() => setVariationsLoading(false));
        } else {
            setVariations([]); // Clear if product line is not variable or not selected
        }
    }, [selectedProductLine]);

    // --- useEffect to auto-fill price when product line or variation changes ---
    useEffect(() => {
        if (selectedVariation) {
            setNewItemPrice(selectedVariation.unit_price || 0);
        } else if (selectedProductLine && selectedProductLine.is_directly_purchasable) {
            setNewItemPrice(selectedProductLine.unit_price_if_direct || selectedProductLine.base_cost_price || 0);
        } else {
            setNewItemPrice(0);
        }
    }, [selectedProductLine, selectedVariation]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name: string) => (date: Date | null) => {
        setFormData(prev => ({ ...prev, [name]: date }));
    };

    const handleAddItem = () => {
        let itemToAdd: PurchaseOrderItem | null = null;
        let determinedPrice: number = 0;

        if (selectedProductLine) {
            if (selectedProductLine.item_type === 'Variable') {
                if (selectedVariation) {
                    // Ensure determinedPrice is a number, defaulting to 0 if parsing fails or original is not a number
                    const priceFromVariation = selectedVariation.unit_price;
                    if (typeof priceFromVariation === 'number') {
                        determinedPrice = priceFromVariation;
                    } else {
                        const parsedPrice = parseFloat(String(priceFromVariation));
                        determinedPrice = !isNaN(parsedPrice) ? parsedPrice : 0;
                    }

                    itemToAdd = {
                        item_variant_id: selectedVariation.item_variant_id,
                        item_name: `${selectedProductLine.item_name} - ${selectedVariation.variation_display_name}`,
                        quantity: newItemQuantity,
                        unit_price: determinedPrice,
                    };
                } else {
                    setError("Please select a variation for the variable product.");
                    return;
                }
            } else { // Standard or Service item
                if (selectedProductLine.is_directly_purchasable && selectedProductLine.item_variant_id_if_direct) {
                    const priceFromProductLine = selectedProductLine.unit_price_if_direct || selectedProductLine.base_cost_price;
                    if (typeof priceFromProductLine === 'number') {
                        determinedPrice = priceFromProductLine;
                    } else {
                        const parsedPrice = parseFloat(String(priceFromProductLine));
                        determinedPrice = !isNaN(parsedPrice) ? parsedPrice : 0;
                    }
                    itemToAdd = {
                        item_variant_id: selectedProductLine.item_variant_id_if_direct,
                        item_name: selectedProductLine.item_name,
                        quantity: newItemQuantity,
                        unit_price: determinedPrice,
                    };
                } else {
                     setError("This product line cannot be added directly. It might be missing pricing or configuration.");
                     return;
                }
            }
        } else {
            setError("Please select a product.");
            return;
        }

        if (itemToAdd && itemToAdd.quantity > 0 && typeof itemToAdd.unit_price === 'number' && itemToAdd.unit_price >= 0) {
            // Check if item already exists, if so, you might want to update quantity or show an error
            const existingItemIndex = formData.items.findIndex(i => i.item_variant_id === itemToAdd!.item_variant_id);
            if (existingItemIndex > -1) {
                // Option 1: Update quantity
                const updatedItems = [...formData.items];
                updatedItems[existingItemIndex].quantity += itemToAdd.quantity;
                // updatedItems[existingItemIndex].unit_price = itemToAdd.unit_price; // Optionally update price
                setFormData(prev => ({ ...prev, items: updatedItems }));

                // Option 2: Show error
                // setError("Item already added. Please update quantity or remove and re-add.");
                // return;
            } else {
                setFormData(prev => ({ ...prev, items: [...prev.items, itemToAdd!] }));
            }
            // Reset item selection fields
            setSelectedProductLine(null);
            setSelectedVariation(null);
            setNewItemQuantity(1);
            setNewItemPrice(0);
            setError(null); // Clear previous item-specific errors
        } else if (!itemToAdd) {
            setError("Please select a valid item.");
        } else if (itemToAdd.quantity <= 0) {
            setError("Quantity must be greater than 0.");
        }
    };


    const handleRemoveItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const calculateTotalAmount = () => {
        return formData.items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
    };

    const validateForm = () => {
        const errors: any = {};
        if (!formData.supplier_id) errors.supplier_id = "Supplier is required.";
        if (!formData.store_id) errors.store_id = "Store is required.";
        if (!formData.order_date) errors.order_date = "Order date is required.";
        if (formData.items.length === 0) errors.items = "At least one item must be added to the order.";
        // Add more validations as needed
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!validateForm()) {
            setError("Please correct the form errors.");
            return;
        }
        if (!userCan(requiredPermission)) { // Now userCan should be defined
            setError("You do not have permission to perform this action.");
            return;
        }

        setIsSubmitting(true);
        const submissionData = {
            ...formData,
            supplier_id: parseInt(formData.supplier_id, 10),
            store_id: parseInt(formData.store_id, 10),
            items: formData.items.map(item => ({ // formData.items should now always be an array
                item_variant_id: item.item_variant_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
            })),
            total_amount: calculateTotalAmount(),
        };
        // If creating, formData.id will be undefined, which is fine for the backend
        if (!purchaseOrderId) {
            delete submissionData.id; // Ensure id is not sent for new POs
        }


        console.log('Submitting PO:', submissionData);

        try {
            let poIdToNavigateTo = purchaseOrderId; // For editing
            if (purchaseOrderId) {
                await updatePurchaseOrder(purchaseOrderId, submissionData);
                // show success message
            } else {
                const response = await createPurchaseOrder(submissionData);
                console.log('API Create Response:', response); // Log the response
                // show success message
                if (response && response.data && response.data.id) {
                    poIdToNavigateTo = response.data.id; // Get ID from response
                }
            }
            console.log("Navigating to /dashboard/purchase-orders"); // Log before navigate
            navigate('/dashboard/purchase-orders');
        } catch (err: any) {
            console.error("Submission error:", err);
            setError(err.response?.data?.message || `Failed to ${purchaseOrderId ? 'update' : 'create'} purchase order.`);
            if (err.response?.data?.errors) {
                setFormErrors(err.response.data.errors);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (initialLoading && purchaseOrderId) {
        return <CircularProgress />;
    }
    // ... (rest of your component, including Paper, Box, form, Grid for supplier, store, dates etc.) ...
    // You will need to replace your existing item selection Autocomplete with the new two-dropdown system.

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 }, maxWidth: 1000, mx: 'auto' }}>
                <Typography variant="h5" gutterBottom component="div" sx={{ textAlign: 'center', mb: 3 }}>
                    {purchaseOrderId ? 'Edit Purchase Order' : 'Create Purchase Order'}
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Grid container spacing={3}>
                        {/* Supplier, Store, Dates - Keep your existing fields here */}
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                options={suppliers}
                                getOptionLabel={(option) => option.name || ''}
                                value={suppliers.find(s => s.id === parseInt(formData.supplier_id)) || null}
                                onChange={(event, newValue) => {
                                    const newSupplierId = newValue ? newValue.id.toString() : ''; // <-- What is newValue.id?
                                    console.log('Selected Supplier ID for formData:', newSupplierId); // Add this log
                                    setFormData(prev => ({ ...prev, supplier_id: newSupplierId }));
                                    // Reset product lines when supplier changes
                                    setProductLines([]);
                                    setSelectedProductLine(null);
                                    setVariations([]);
                                    setSelectedVariation(null);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Supplier"
                                        required
                                        error={!!formErrors.supplier_id}
                                        helperText={formErrors.supplier_id}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                             <Autocomplete
                                options={stores}
                                getOptionLabel={(option) => option.name || ''}
                                value={stores.find(s => s.id === parseInt(formData.store_id)) || null}
                                onChange={(event, newValue) => {
                                    setFormData(prev => ({ ...prev, store_id: newValue ? newValue.id.toString() : '' }));
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Store / Warehouse"
                                        required
                                        error={!!formErrors.store_id}
                                        helperText={formErrors.store_id}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Order Date"
                                value={formData.order_date}
                                onChange={handleDateChange('order_date')}
                                slotProps={{ textField: { fullWidth: true, required: true, error: !!formErrors.order_date, helperText: formErrors.order_date } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <DatePicker
                                label="Expected Delivery Date (Optional)"
                                value={formData.expected_delivery_date}
                                onChange={handleDateChange('expected_delivery_date')}
                                slotProps={{ textField: { fullWidth: true, error: !!formErrors.expected_delivery_date, helperText: formErrors.expected_delivery_date } }}
                            />
                        </Grid>
                         <Grid item xs={12}>
                            <TextField
                                name="status"
                                label="Status"
                                value={formData.status}
                                onChange={handleInputChange}
                                fullWidth
                                select
                                SelectProps={{ native: true }}
                                error={!!formErrors.status}
                                helperText={formErrors.status}
                            >
                                <option value="Pending">Pending</option>
                                <option value="Ordered">Ordered</option>
                                <option value="Partial">Partial</option>
                                <option value="Received">Received</option>
                                <option value="Cancelled">Cancelled</option>
                            </TextField>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="notes"
                                label="Notes (Optional)"
                                multiline
                                rows={3}
                                value={formData.notes}
                                onChange={handleInputChange}
                                fullWidth
                                error={!!formErrors.notes}
                                helperText={formErrors.notes}
                            />
                        </Grid>

                        {/* --- Item Selection Section --- */}
                        <Grid item xs={12}>
                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Add Items</Typography>
                        </Grid>

                        <Grid item xs={12} md={formData.supplier_id && selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable ? 4 : 6}>
                            <Autocomplete
                                options={productLines}
                                getOptionLabel={(option) => `${option.item_name}${option.base_item_sku ? ` (${option.base_item_sku})` : ''}`}
                                value={selectedProductLine}
                                onChange={(event, newValue) => {
                                    setSelectedProductLine(newValue);
                                    setSelectedVariation(null); // Reset variation when product line changes
                                    if (newValue && newValue.is_directly_purchasable) {
                                        setNewItemPrice(newValue.unit_price_if_direct || newValue.base_cost_price || 0);
                                    } else {
                                        setNewItemPrice(0);
                                    }
                                }}
                                renderInput={(params) => (
                                    <TextField {...params} label="Select Product Line" variant="outlined" />
                                )}
                                loading={productLinesLoading}
                                disabled={!formData.supplier_id || productLinesLoading}
                                fullWidth
                            />
                        </Grid>

                        {formData.supplier_id && selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable && (
                            <Grid item xs={12} md={4}>
                                <Autocomplete
                                    options={variations}
                                    getOptionLabel={(option) => `${option.variation_display_name}${option.variation_sku ? ` (${option.variation_sku})` : ''}`}
                                    value={selectedVariation}
                                    onChange={(event, newValue) => {
                                        setSelectedVariation(newValue);
                                        if (newValue) {
                                            setNewItemPrice(newValue.unit_price || 0);
                                        }
                                    }}
                                    renderInput={(params) => (
                                        <TextField {...params} label="Select Variation" variant="outlined" />
                                    )}
                                    loading={variationsLoading}
                                    disabled={variationsLoading || variations.length === 0}
                                    fullWidth
                                />
                            </Grid>
                        )}

                        <Grid item xs={6} md={2}>
                            <TextField
                                label="Quantity"
                                type="number"
                                value={newItemQuantity}
                                onChange={(e) => setNewItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                InputProps={{ inputProps: { min: 1 } }}
                                fullWidth
                                variant="outlined"
                            />
                        </Grid>
                        <Grid item xs={6} md={2}>
                            <TextField
                                label="Unit Price"
                                type="number"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(parseFloat(e.target.value) || 0)}
                                InputProps={{ inputProps: { step: "0.01", min: 0 } }}
                                fullWidth
                                variant="outlined"
                                // Potentially disable if auto-filled and not editable
                            />
                        </Grid>
                        <Grid item xs={12} md={formData.supplier_id && selectedProductLine && selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable ? 12 : 2} sx={{ display: 'flex', alignItems: 'center' }}>
                            <Button
                                variant="contained"
                                color="secondary"
                                startIcon={<AddCircleOutlineOutlinedIcon />}
                                onClick={handleAddItem}
                                disabled={!selectedProductLine || (selectedProductLine.item_type === 'Variable' && !selectedProductLine.is_directly_purchasable && !selectedVariation)} // <--- THIS IS THE KEY
                                fullWidth
                            >
                                Add Item
                            </Button>
                        </Grid>

                        {/* --- Items Table --- */}
                        {formData.items.length > 0 && (
                            <Grid item xs={12}>
                                <TableContainer component={Paper} sx={{ mt: 2,  border: '1px solid lightgray' }}>
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
                                            {formData.items.map((item, index) => {
                                                const unitPrice = typeof item.unit_price === 'number' ? item.unit_price : 0;
                                                const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
                                                const subtotal = unitPrice * quantity;

                                                return (
                                                    <TableRow key={item.item_variant_id + '-' + index}>
                                                        <TableCell component="th" scope="row">{item.item_name}</TableCell>
                                                        <TableCell align="right">{quantity}</TableCell>
                                                        <TableCell align="right">${unitPrice.toFixed(2)}</TableCell>
                                                        <TableCell align="right">${subtotal.toFixed(2)}</TableCell>
                                                        <TableCell align="center">
                                                            <IconButton onClick={() => handleRemoveItem(index)} color="error" size="small">
                                                                <DeleteIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                            <TableRow sx={{ backgroundColor: '#f9f9f9' }}>
                                                <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold' }}>Total Amount:</TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                    ${calculateTotalAmount().toFixed(2)}
                                                </TableCell>
                                                <TableCell />
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {formErrors.items && <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>{formErrors.items}</Typography>}
                            </Grid>
                        )}
                    </Grid>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', mt: 3, p:2, borderTop: '1px solid lightgray' }}>
                        <Button onClick={() => navigate('/dashboard/purchase-orders')} sx={{ mr: 1 }} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={isSubmitting || initialLoading || !userCan(requiredPermission) || !formData.store_id} // Now userCan should be defined
                        >
                            {isSubmitting ? <CircularProgress size={24} /> : (purchaseOrderId ? 'Update Purchase Order' : 'Create Purchase Order')}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </LocalizationProvider>
    );
}

export default PurchaseOrderForm;