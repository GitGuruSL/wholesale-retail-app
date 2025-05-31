import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Button, TextField, MenuItem, CircularProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Store {
  id: number;
  name: string;
}

interface PurchaseOrderItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  [key: string]: any;
}

interface ReceivedItem {
  item_id: number;
  quantity_received: number;
  unit_cost: number;
  free_quantity_received: number;
}

interface PurchaseOrder {
  id: number;
  supplier_name: string;
  status: string;
  order_date: string;
  store_id: number; // <<<< CRUCIAL: Ensure your API returns this for each PO
  total_amount?: number;
  items?: PurchaseOrderItem[];
  [key: string]: any;
}

const GoodsReceiptForm: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<number | ''>('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [loadingStores, setLoadingStores] = useState(true); // Specific loading for stores
  const [loadingPOs, setLoadingPOs] = useState(false); // Specific loading for POs
  const [notes, setNotes] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | ''>('');
  const [selectedPOData, setSelectedPOData] = useState<PurchaseOrder | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const navigate = useNavigate();

  // Fetch Stores
  useEffect(() => {
    setLoadingStores(true);
    api.get('/stores').then(res => {
      const fetchedStores = res.data?.data || res.data || [];
      setStores(fetchedStores);
      // Optionally, auto-select the first store, or leave it for the user to select
      // if (fetchedStores.length > 0) setSelectedStoreId(fetchedStores[0].id);
    }).catch(err => {
      console.error("Failed to fetch stores", err);
      setStores([]);
    }).finally(() => {
      setLoadingStores(false);
    });
  }, []);

  // Fetch Purchase Orders when a store is selected
  useEffect(() => {
    if (selectedStoreId) {
      setLoadingPOs(true);
      setSelectedPO(''); // Reset selected PO when store changes
      setPoItems([]);
      setReceivedItems([]);
      setSelectedPOData(null);
      api.get(`/purchase-orders?status=Ordered&store_id=${selectedStoreId}`)
        .then(res => {
          setPurchaseOrders(res.data.data || res.data || []);
        })
        .catch(err => {
          console.error("Failed to fetch POs for store", selectedStoreId, err);
          setPurchaseOrders([]);
        })
        .finally(() => {
          setLoadingPOs(false);
        });
    } else {
      setPurchaseOrders([]); // Clear POs if no store is selected
    }
  }, [selectedStoreId]); // This effect depends on selectedStoreId

  const handlePOChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const poId = Number(e.target.value);
    setSelectedPO(poId);
    const poRes = await api.get(`/purchase-orders/${poId}`);
    const poData = poRes.data?.data || poRes.data;
    setSelectedPOData(poData);
    const items = poData.items || [];
    console.log('Raw PO items from API:', JSON.stringify(items, null, 2));
    const itemsWithDetails = items.map(apiItem => {
      // What is apiItem.item_id or apiItem.product_id here?
      // It MUST be the ID that exists in your main 'items' or 'products' table.
      let actualItemId = apiItem.item_id || apiItem.product_id || apiItem.id;
      if (typeof actualItemId === 'object' && actualItemId !== null && 'id' in actualItemId) {
        actualItemId = actualItemId.id;
      }
      console.log(`Mapping API item: ${apiItem.name}, original ID from API: ${JSON.stringify(apiItem.item_id || apiItem.product_id || apiItem.id)}, resolved to: ${actualItemId}`);
      return {
        ...apiItem,
        item_id: actualItemId, // This is the critical part
        name: apiItem.name || apiItem.product_name,
        quantity: apiItem.quantity_ordered || apiItem.quantity,
        unit_cost: apiItem.unit_cost,
      };
    });
    setPoItems(itemsWithDetails);
    setReceivedItems(itemsWithDetails.map((item: PurchaseOrderItem) => ({
      item_id: typeof item.id === 'object' ? item.id.id : item.id,
      quantity_received: item.quantity || 0,
      unit_cost: item.unit_price || 0,
      free_quantity_received: 0
    })));
    console.log('receivedItems', receivedItems);
    console.log('poItems', poItems);
  };

  const handleQtyChange = (idx: number, value: number) => {
    setReceivedItems(items =>
      items.map((item, i) => i === idx ? { ...item, quantity_received: value } : item)
    );
  };

  const handleUnitCostChange = (idx: number, value: number) => {
    setReceivedItems(items =>
      items.map((item, i) => i === idx ? { ...item, unit_cost: value } : item)
    );
  };

  const handleFreeQtyChange = (idx: number, value: number) => {
    setReceivedItems(items =>
      items.map((item, i) => i === idx ? { ...item, free_quantity_received: value } : item)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivedItems.length || !poItems.length) {
      alert('Please select a purchase order and ensure it has items before submitting.');
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setConfirmOpen(false);
    try {
      const payloadItems = receivedItems.map((item, idx) => {
        let itemIdToSubmit = item.item_id; // Start with what's in receivedItems

        // If item_id is an object like { id: 23 }, extract the id
        if (typeof itemIdToSubmit === 'object' && itemIdToSubmit !== null && 'id' in itemIdToSubmit) {
          itemIdToSubmit = itemIdToSubmit.id;
        }

        // Fallback or further check if it's still not a number
        // This might happen if receivedItems[].item_id was not set correctly from poItems
        if (typeof itemIdToSubmit !== 'number') {
          const originalPoItem = poItems[idx]; // Get the original PO item for reference
          if (originalPoItem) {
            // Try to get the ID from the original PO item's structure
            // Common patterns: originalPoItem.item_id, originalPoItem.product_id, originalPoItem.id
            // Adjust based on your actual poItems structure
            let potentialId = originalPoItem.item_id || originalPoItem.product_id || originalPoItem.id;
            if (typeof potentialId === 'object' && potentialId !== null && 'id' in potentialId) {
              itemIdToSubmit = potentialId.id;
            } else {
              itemIdToSubmit = potentialId;
            }
          }
        }

        return {
          item_id: Number(itemIdToSubmit), // Ensure it's a number
          quantity_received: Number(item.quantity_received) || 0,
          unit_cost: Number(item.unit_cost) || 0,
          free_quantity_received: Number(item.free_quantity_received) || 0,
        };
      });

      console.log('Submitting payloadItems:', JSON.stringify(payloadItems, null, 2)); // <-- ADD THIS LOG

      await api.post('/goods-receipts', {
        purchase_order_id: selectedPO,
        store_id: selectedStoreId,
        received_by: 1, // Replace with actual logged-in user ID
        items: payloadItems,
        notes,
      });
      navigate('/dashboard/goods-receipts'); // <-- This should run after success
    } catch (err) {
      // Optionally show an error message
      alert('Failed to save goods receipt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingStores) return <CircularProgress />; // Or a more specific "Loading stores..."

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Typography variant="h6" mb={2}>New Goods Receipt</Typography>

      {/* Store selection FIRST */}
      <TextField
        select
        label="Store"
        value={selectedStoreId}
        onChange={e => setSelectedStoreId(Number(e.target.value))}
        fullWidth
        required
        sx={{ mb: 2 }}
        disabled={loadingStores}
      >
        {stores.map(store => (
          <MenuItem key={store.id} value={store.id}>
            {store.name}
          </MenuItem>
        ))}
        {stores.length === 0 && !loadingStores && <MenuItem value="" disabled>No stores available</MenuItem>}
      </TextField>

      {/* Purchase Order selection SECOND */}
      <TextField
        select
        label="Purchase Order"
        value={selectedPO}
        onChange={handlePOChange}
        fullWidth
        required
        sx={{ mb: 2 }}
        disabled={!selectedStoreId || loadingPOs || purchaseOrders.length === 0} // Disable if no store, loading POs, or no POs
      >
        {loadingPOs && <MenuItem value="" disabled>Loading POs...</MenuItem>}
        {!loadingPOs && purchaseOrders.length === 0 && selectedStoreId && <MenuItem value="" disabled>No 'Ordered' POs for this store</MenuItem>}
        {purchaseOrders.map(po => ( // No client-side filter needed here if API returns filtered POs
          <MenuItem key={po.id} value={po.id}>
            {po.id} - {po.supplier_name}
          </MenuItem>
        ))}
      </TextField>

      {selectedPOData && (
        <Box sx={{ mb: 2, p: 2, border: '1px solid #eee', borderRadius: 2, background: '#fafafa' }}>
          <Typography variant="subtitle1">Purchase Order Details</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            <div><strong>PO Number:</strong> {selectedPOData.id}</div>
            <div><strong>Status:</strong> {selectedPOData.status}</div>
            <div><strong>Order Date:</strong> {selectedPOData.order_date}</div>
            <div><strong>Supplier:</strong> {selectedPOData.supplier_name}</div>
            <div><strong>Total Amount:</strong> {selectedPOData.total_amount?.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}</div>
          </Box>
        </Box>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Variant</TableCell>
            <TableCell>Ordered Qty</TableCell>
            <TableCell>Received Qty</TableCell>
            <TableCell>Old Unit Price</TableCell>
            <TableCell>New Unit Price</TableCell>
            <TableCell>PO Amount</TableCell>
            <TableCell>Received Amount</TableCell>
            <TableCell>Qty Diff</TableCell>
            <TableCell>Amount Diff</TableCell>
            <TableCell>Free/Bonus Qty</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {poItems.map((item, idx) => {
            const orderedQty = Number(item.quantity) || 0;
            const receivedQty = Number(receivedItems[idx]?.quantity_received) || 0;
            const oldUnitPrice = Number(item.unit_price) || 0;
            const newUnitPrice = Number(receivedItems[idx]?.unit_cost ?? oldUnitPrice);
            const poAmount = orderedQty * oldUnitPrice;
            const receivedAmount = receivedQty * newUnitPrice;
            const qtyDiff = receivedQty - orderedQty;
            const amountDiff = receivedAmount - poAmount;
            return (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{orderedQty}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={receivedQty}
                    onChange={e => handleQtyChange(idx, Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                </TableCell>
                <TableCell>{oldUnitPrice.toFixed(2)}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={newUnitPrice}
                    onChange={e => handleUnitCostChange(idx, Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 0, step: "0.01" }}
                  />
                </TableCell>
                <TableCell>{poAmount.toFixed(2)}</TableCell>
                <TableCell>{receivedAmount.toFixed(2)}</TableCell>
                <TableCell>{qtyDiff}</TableCell>
                <TableCell>{amountDiff.toFixed(2)}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={receivedItems[idx]?.free_quantity_received || 0}
                    onChange={e => handleFreeQtyChange(idx, Number(e.target.value))}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <TextField
        label="Notes"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        fullWidth
        multiline
        rows={3}
        sx={{ mt: 2 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
        <Button onClick={() => navigate('/dashboard/goods-receipts')} color="secondary" variant="outlined">
          Cancel
        </Button>
        <Button type="submit" variant="contained" color="primary" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit'}
        </Button>
      </Box>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent>Are you sure you want to submit this goods receipt?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>No</Button>
          <Button onClick={handleConfirmSubmit} variant="contained" color="primary">Yes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GoodsReceiptForm;