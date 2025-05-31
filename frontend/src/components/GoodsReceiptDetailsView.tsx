import React from 'react';
import { Box, Typography, Paper, Divider } from '@mui/material';

interface GoodsReceiptListItem {
    id: number;
    purchase_order_id: number;
    store_name: string;
    received_at: string;
    supplier_name?: string;
    status?: string;
    // Add other fields you might have, like items received
}

interface GoodsReceiptDetailsViewProps {
    receipt: GoodsReceiptListItem | null;
}

const GoodsReceiptDetailsView: React.FC<GoodsReceiptDetailsViewProps> = ({ receipt }) => {
    if (!receipt) {
        return <Typography sx={{ p: 2, textAlign: 'center' }}>No goods receipt selected or details available.</Typography>;
    }

    return (
        <Paper elevation={0} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Goods Receipt #{receipt.id}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1"><strong>PO ID:</strong> {receipt.purchase_order_id}</Typography>
                <Typography variant="subtitle1"><strong>Store:</strong> {receipt.store_name}</Typography>
                <Typography variant="subtitle1"><strong>Received Date:</strong> {new Date(receipt.received_at).toLocaleDateString()}</Typography>
                {receipt.supplier_name && <Typography variant="subtitle1"><strong>Supplier:</strong> {receipt.supplier_name}</Typography>}
                {receipt.status && <Typography variant="subtitle1"><strong>Status:</strong> {receipt.status}</Typography>}
                {/* Add more details as needed, e.g., list of items */}
            </Box>
        </Paper>
    );
};

export default GoodsReceiptDetailsView;