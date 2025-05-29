import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

interface PurchaseOrderDetailsViewProps {
    purchaseOrder: {
        id: string | number;
        supplier_name: string;
        store_name?: string;
        order_date: string;
        expected_delivery_date?: string;
        status: string;
        total_amount?: number;
    };
}

const PurchaseOrderDetailsView: React.FC<PurchaseOrderDetailsViewProps> = ({ purchaseOrder }) => (
    <Box sx={{ p: 2, minWidth: 300 }}>
        <Typography variant="h6" gutterBottom>
            Purchase Order #{purchaseOrder.id}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography><strong>Supplier:</strong> {purchaseOrder.supplier_name}</Typography>
        <Typography><strong>Store:</strong> {purchaseOrder.store_name || '-'}</Typography>
        <Typography><strong>Order Date:</strong> {purchaseOrder.order_date}</Typography>
        <Typography><strong>Expected Delivery:</strong> {purchaseOrder.expected_delivery_date || '-'}</Typography>
        <Typography><strong>Status:</strong> {purchaseOrder.status}</Typography>
        <Typography><strong>Total Amount:</strong> {purchaseOrder.total_amount != null ? Number(purchaseOrder.total_amount).toFixed(2) : '-'}</Typography>
    </Box>
);

export default PurchaseOrderDetailsView;