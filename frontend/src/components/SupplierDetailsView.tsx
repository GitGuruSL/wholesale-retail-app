import React, { useState, useEffect, useCallback } from 'react';
import { Grid, CircularProgress, Typography, Box } from '@mui/material';
import PurchaseOrderList from '../components/PurchaseOrderList'; // Your existing list
import GenericDetailsSidebar from '../components/GenericDetailsSidebar';
// Assume fetchPurchaseOrders API and types are defined as in previous examples
// For this example, let's define a simple Supplier type and a PurchaseOrder type
// You'd import these from appropriate files.

interface Supplier {
    id: string | number;
    name: string;
    vendor_no?: string;
    phone_no?: string;
    email?: string;
    // ... other supplier fields
}

interface PurchaseOrder {
    id: string | number;
    document_no: string; // Example field
    supplier: Supplier; // Assuming supplier data is nested or fetched
    document_date: string;
    status: string;
    total_amount: number;
    // ... other purchase order fields
}

// Dummy API call for illustration
const fetchPurchaseOrdersAPI = async (): Promise<PurchaseOrder[]> => {
    // Replace with your actual API call
    return new Promise(resolve => setTimeout(() => resolve([
        { id: '106003', document_no: 'PO-001', supplier: { id: 'S001', name: 'Softlogic Computers (Pvt) Ltd', vendor_no: 'V00040', email: 'sales@softlogic.com' }, document_date: '2025-02-02', status: 'Open', total_amount: 100940.00 },
        { id: '106004', document_no: 'PO-002', supplier: { id: 'S002', name: 'Sense Micro Distributions', vendor_no: 'V00020', email: 'info@sense.lk' }, document_date: '2025-03-27', status: 'Open', total_amount: 74400.00 },
    ]), 1000));
};


// A simple component to display supplier details (this would be its own file ideally)
const SupplierDetailsView: React.FC<{ supplier: Supplier }> = ({ supplier }) => (
    <Box>
        <Typography variant="body1"><strong>Vendor No:</strong> {supplier.vendor_no || 'N/A'}</Typography>
        <Typography variant="body1"><strong>Name:</strong> {supplier.name || 'N/A'}</Typography>
        <Typography variant="body1"><strong>Email:</strong> {supplier.email || 'N/A'}</Typography>
        <Typography variant="body1"><strong>Phone:</strong> {supplier.phone_no || 'N/A'}</Typography>
        {/* Add more supplier fields as needed */}
    </Box>
);


const PurchaseOrdersDisplayPage: React.FC = () => {
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<PurchaseOrder | null>(null);
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            setIsLoadingList(true);
            try {
                const data = await fetchPurchaseOrdersAPI(); // Use your actual API
                setPurchaseOrders(data);
            } catch (err) {
                setError('Failed to load purchase orders.');
                console.error(err);
            } finally {
                setIsLoadingList(false);
            }
        };
        loadData();
    }, []);

    const handleSelectPurchaseOrder = useCallback((po: PurchaseOrder | null) => {
        setSelectedPurchaseOrder(po);
    }, []);

    let sidebarContent = null;
    if (selectedPurchaseOrder && selectedPurchaseOrder.supplier) {
        sidebarContent = <SupplierDetailsView supplier={selectedPurchaseOrder.supplier} />;
    }

    return (
        <Grid container spacing={2} sx={{ p: 2, height: 'calc(100vh - 64px)', overflow: 'hidden' /* Adjust 64px based on your AppBar height */ }}>
            <Grid item xs={12} md={8} sx={{ height: '100%', overflowY: 'auto' }}>
                {isLoadingList ? <CircularProgress /> : error ? <Typography color="error">{error}</Typography> : (
                    <PurchaseOrderList
                        purchaseOrders={purchaseOrders}
                        onSelectPurchaseOrder={handleSelectPurchaseOrder}
                        selectedPurchaseOrderId={selectedPurchaseOrder?.id}
                    />
                )}
            </Grid>
            <Grid item xs={12} md={4} sx={{ height: '100%'}}>
                <GenericDetailsSidebar
                    title={selectedPurchaseOrder ? `Vendor Details (PO: ${selectedPurchaseOrder.document_no})` : "Details"}
                    placeholder="Select a Purchase Order to view supplier details."
                >
                    {sidebarContent}
                </GenericDetailsSidebar>
            </Grid>
        </Grid>
    );
};

export default PurchaseOrdersDisplayPage;