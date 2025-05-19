import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Alert,
    CircularProgress,
    Tooltip,
    AlertColor
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import apiInstance from '../services/api';
import { useAuth } from '../context/AuthContext';

// Interfaces for type safety
interface AttributeValue {
    id?: number | string; // Optional if values are not standalone entities with their own IDs
    value: string;
}

interface Attribute {
    id: number | string;
    name: string;
    values: AttributeValue[];
}

// Expected shape of the API response for attributes
interface AttributesApiResponse {
    data: Attribute[]; // Assuming attributes are always in a 'data' property
}

// Type for feedback state
interface FeedbackState {
    message: string | null;
    type: AlertColor | null;
}

function ItemAttributeListPage(): JSX.Element {
    const [attributes, setAttributes] = useState<Attribute[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<FeedbackState>({ message: null, type: null });

    const { userCan } = useAuth();

    const fetchAttributes = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiInstance.get<AttributesApiResponse | Attribute[]>('/attributes');
            
            let fetchedData: Attribute[] = [];
            if (Array.isArray(response.data)) {
                 fetchedData = response.data as Attribute[];
            } else if (response.data && Array.isArray((response.data as AttributesApiResponse).data)) {
                fetchedData = (response.data as AttributesApiResponse).data;
            }
            setAttributes(fetchedData);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message || 'Failed to fetch attributes.';
            setError(errorMessage);
            console.error("Fetch attributes error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAttributes();
    }, [fetchAttributes]);

    const handleDelete = async (attributeId: number | string, attributeName: string) => {
        if (typeof userCan !== 'function' || !userCan('attribute:delete')) {
            setFeedback({ message: 'You do not have permission to delete attributes.', type: 'error' });
            return;
        }

        if (window.confirm(`Are you sure you want to delete the attribute "${attributeName}"? This might affect products using it.`)) {
            setLoading(true);
            try {
                await apiInstance.delete(`/attributes/${attributeId}`);
                setFeedback({ message: `Attribute "${attributeName}" deleted successfully.`, type: 'success' });
                await fetchAttributes();
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || err.message || 'Failed to delete attribute.';
                setFeedback({ message: errorMessage, type: 'error' });
                console.error("Delete attribute error:", err);
            } finally {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (feedback.message) {
            timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
        return () => clearTimeout(timer);
    }, [feedback.message]);

    if (loading && attributes.length === 0) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 120px)' }}>
                <CircularProgress />
                <Typography sx={{ml: 1}}>Loading attributes...</Typography>
            </Box>
        );
    }

    return (
        <Paper sx={{ p: { xs: 2, md: 3 }, m: { xs: 1, md: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">Item Attributes</Typography>
                {typeof userCan === 'function' && userCan('attribute:create') && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/dashboard/attributes/new"
                        aria-label="Add new item attribute"
                    >
                        Add New
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {feedback.message && feedback.type && (
                <Alert severity={feedback.type} sx={{ mb: 2 }} onClose={() => setFeedback({ message: null, type: null })}>
                    {feedback.message}
                </Alert>
            )}
            
            {loading && attributes.length > 0 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                    <CircularProgress size={24} />
                    <Typography sx={{ml: 1}} variant="body2">Refreshing data...</Typography>
                </Box>
            )}

            <TableContainer component={Paper} variant="outlined">
                <Table aria-label="product attributes table">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{width: {xs: '15%', sm: '10%'} }}>ID</TableCell>
                            <TableCell sx={{width: {xs: '30%', sm: '30%'} }}>Name</TableCell>
                            <TableCell>Values</TableCell>
                            <TableCell sx={{width: {xs: '25%', sm: '20%'}, textAlign: 'right' }}>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {!loading && attributes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                                    <Typography>No attributes found.</Typography>
                                    {typeof userCan === 'function' && userCan('attribute:create') && (
                                         <Button
                                            variant="outlined"
                                            startIcon={<AddIcon />}
                                            component={RouterLink}
                                            to="/dashboard/attributes/new"
                                            sx={{mt: 1}}
                                        >
                                            Create First Attribute
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}
                        {attributes.map((attr) => (
                            <TableRow key={attr.id} hover>
                                <TableCell>{attr.id}</TableCell>
                                <TableCell>{attr.name}</TableCell>
                                <TableCell>
                                    {attr.values && attr.values.length > 0
                                        ? attr.values.map(v => v.value).join(', ')
                                        : <Typography variant="caption" color="textSecondary">No values defined</Typography>}
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>
                                    {typeof userCan === 'function' && userCan('attribute:update') && (
                                        <Tooltip title="Edit Attribute">
                                            <IconButton
                                                component={RouterLink}
                                                to={`/dashboard/attributes/edit/${attr.id}`}
                                                color="primary"
                                                size="small"
                                                aria-label={`Edit attribute ${attr.name}`}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    {typeof userCan === 'function' && userCan('attribute:delete') && (
                                        <Tooltip title="Delete Attribute">
                                            <IconButton
                                                onClick={() => handleDelete(attr.id, attr.name)}
                                                color="error"
                                                size="small"
                                                aria-label={`Delete attribute ${attr.name}`}
                                                disabled={loading}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}

export default ItemAttributeListPage;