import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Typography,
    Paper,
    Grid,
    Box,
    CircularProgress,
    Alert,
    Button,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Divider,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import apiInstance from '../services/api'; // Adjust path as needed
import { format } from 'date-fns'; // For date formatting

// Interfaces for the data structure from your CURRENT backend
interface GoodsReceiptItemData {
    id: number;
    goods_receipt_id: number;
    item_id: number;
    quantity_received: number;
    unit_cost?: number | null; // Assuming unit_cost can be null
    free_quantity_received?: number | null;
    // Add other columns from goods_receipt_items table if needed
}

interface GoodsReceiptData {
    id: number;
    purchase_order_id: number;
    store_id: number;
    received_by?: number | null;
    received_at: string;
    notes?: string | null; // Assuming notes is directly on goods_receipts
    created_at: string;
    updated_at: string;
    items: GoodsReceiptItemData[];
    // Add other columns from goods_receipts table if needed
}

const GoodsReceiptView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [receipt, setReceipt] = useState<GoodsReceiptData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchReceiptDetails = async () => {
            if (!id) {
                setError("Goods Receipt ID is missing.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                const response = await apiInstance.get<GoodsReceiptData>(`/goods-receipts/${id}`);
                setReceipt(response.data);
            } catch (err: any) {
                console.error('Error fetching goods receipt details:', err);
                setError(err.response?.data?.message || err.message || 'Failed to fetch goods receipt details.');
            } finally {
                setLoading(false);
            }
        };

        fetchReceiptDetails();
    }, [id]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="error">{error}</Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(-1)}
                    sx={{ mt: 2 }}
                >
                    Go Back
                </Button>
            </Container>
        );
    }

    if (!receipt) {
        return (
            <Container sx={{ mt: 4 }}>
                <Alert severity="warning">Goods receipt not found.</Alert>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(-1)}
                    sx={{ mt: 2 }}
                >
                    Go Back
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <IconButton onClick={() => navigate(-1)} sx={{ mr: 1 }} aria-label="go back">
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h4" component="h1">
                    Goods Receipt Details (GRN #{receipt.id})
                </Typography>
            </Box>
            <Paper elevation={3} sx={{ p: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1"><strong>GRN ID:</strong> {receipt.id}</Typography>
                        <Typography variant="subtitle1"><strong>Purchase Order ID:</strong> {receipt.purchase_order_id}</Typography>
                        <Typography variant="subtitle1"><strong>Store ID:</strong> {receipt.store_id}</Typography>
                        {receipt.notes && <Typography variant="subtitle1"><strong>Notes:</strong> {receipt.notes}</Typography>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle1"><strong>Received At:</strong> {format(new Date(receipt.received_at), 'PPpp')}</Typography>
                        {receipt.received_by && <Typography variant="subtitle1"><strong>Received By User ID:</strong> {receipt.received_by}</Typography>}
                        <Typography variant="subtitle1"><strong>Created At:</strong> {format(new Date(receipt.created_at), 'PPpp')}</Typography>
                        <Typography variant="subtitle1"><strong>Last Updated:</strong> {format(new Date(receipt.updated_at), 'PPpp')}</Typography>
                    </Grid>
                </Grid>
            </Paper>

            <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }}>
                Received Items
            </Typography>
            {receipt.items && receipt.items.length > 0 ? (
                <Paper elevation={3} sx={{ p: 2 }}>
                    <List>
                        {receipt.items.map((item, index) => (
                            <React.Fragment key={item.id}>
                                <ListItem>
                                    <ListItemText
                                        primary={`Item ID: ${item.item_id}`}
                                        secondary={
                                            <>
                                                Quantity Received: {item.quantity_received}
                                                {item.unit_cost !== undefined && item.unit_cost !== null && ` | Unit Cost: ${Number(item.unit_cost).toFixed(2)}`}
                                                {item.free_quantity_received !== undefined && item.free_quantity_received !== null && item.free_quantity_received > 0 && ` | Free Quantity: ${item.free_quantity_received}`}
                                            </>
                                        }
                                    />
                                </ListItem>
                                {index < receipt.items.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            ) : (
                <Typography>No items found for this goods receipt.</Typography>
            )}
             <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate(-1)}
                >
                    Back to List
                </Button>
            </Box>
        </Container>
    );
};

export default GoodsReceiptView;