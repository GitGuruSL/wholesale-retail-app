import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiInstance from '../services/api';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    CircularProgress,
    Alert,
    IconButton,
    List,
    ListItem,
    // ListItemText, // ListItemText was not used in your provided snippet
    Paper
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';

function ProductAttributeFormPage() {
    // Correctly get 'attributeId' from useParams and you can alias it to 'id' if you prefer
    // or just use 'attributeId' throughout the component.
    // Let's alias it to 'id' to minimize other changes in your existing code.
    const { attributeId: id } = useParams(); 
    const navigate = useNavigate();
    
    console.log('Attribute Form - ID from useParams (should be attributeId):', id); 

    const [attributeName, setAttributeName] = useState('');
    const [attributeValues, setAttributeValues] = useState(['']); 
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    
    // 'isEditing' should now correctly reflect if an 'id' (from attributeId) is present
    const isEditing = Boolean(id); 

    const fetchAttribute = useCallback(async () => {
        // This condition should now work correctly
        if (isEditing && id) { 
            setIsLoading(true);
            setError(null);
            try {
                // The API call will use the correct 'id'
                const response = await apiInstance.get(`/attributes/${id}`);
                const attribute = response.data;
                console.log('Fetched attribute from API:', JSON.stringify(attribute, null, 2));
                setAttributeName(attribute.name || '');
                
                let processedFetchedValues;
                if (Array.isArray(attribute.values) && attribute.values.length > 0) {
                    // Map the array of objects to an array of their 'value' strings
                    processedFetchedValues = attribute.values.map(valObj => valObj.value || ''); 
                } else {
                    processedFetchedValues = ['']; // Default to one empty string if no values
                }
                console.log('Values to be set in state (strings):', JSON.stringify(processedFetchedValues, null, 2));
                setAttributeValues(processedFetchedValues);
            } catch (err) {
                console.error("Failed to fetch attribute:", err);
                setError(err.response?.data?.message || "Failed to load attribute data.");
            } finally {
                setIsLoading(false);
            }
        } else if (!id && isEditing) {
            // This case might happen if isEditing was true from a previous render but id became undefined
            console.warn("fetchAttribute called in editing mode but ID is undefined.");
            setError("Attribute ID is missing. Cannot load data.");
        }
    }, [id, isEditing]); // 'id' is now correctly derived from 'attributeId'

    useEffect(() => {
        // If you are in editing mode and have an id, fetch the attribute
        if (isEditing && id) {
            fetchAttribute();
        } else if (isEditing && !id) {
            // Handle case where component thinks it's editing but has no ID
            console.error("In editing mode but no ID found. Check routing and params.");
            setError("Cannot load attribute: ID is missing in URL.");
        } else {
            // Reset form for 'new' attribute mode if needed, or ensure it's initially clean
            setAttributeName('');
            setAttributeValues(['']);
            setError(null);
            setSuccessMessage(null);
        }
    }, [id, isEditing, fetchAttribute]); // Add fetchAttribute to dependency array

    // ... rest of your component (handleSubmit, handleNameChange, handleValueChange, etc.)
    // Ensure all other logic that relies on 'id' or 'isEditing' functions as expected.

    const handleNameChange = (event) => {
        setAttributeName(event.target.value);
    };

    const handleValueChange = (index, event) => {
        const newValues = [...attributeValues];
        newValues[index] = event.target.value;
        setAttributeValues(newValues);
    };

    const handleAddValueField = () => {
        setAttributeValues([...attributeValues, '']);
    };

    const handleRemoveValueField = (index) => {
        if (attributeValues.length > 1) {
            const newValues = attributeValues.filter((_, i) => i !== index);
            setAttributeValues(newValues);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        console.log('handleSubmit - Initial attributeValues:', JSON.stringify(attributeValues, null, 2)); // <<< ADD THIS
        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (!attributeName.trim()) {
            setError("Attribute name cannot be empty.");
            setIsLoading(false);
            return;
        }

        const processedValues = attributeValues.map(v => v.trim()).filter(v => v !== '');

        if (processedValues.length === 0 && isEditing) { // Allow empty values if not strictly required by backend for updates
             // Or enforce it:
            // setError("At least one attribute value must be provided and be non-empty.");
            // setIsLoading(false);
            // return;
        } else if (processedValues.length === 0 && !isEditing) {
             setError("At least one attribute value must be provided and be non-empty for new attributes.");
             setIsLoading(false);
             return;
        }


        const attributeData = {
            name: attributeName.trim(),
            values: processedValues.length > 0 ? processedValues : (isEditing ? [] : null), // Adjust based on backend: send [] or expect error
        };
        
        // Ensure backend handles empty array for values if that's intended for updates
        // If backend requires non-empty strings always, the above filter is good.
        // If backend allows empty array for values on update, then processedValues is fine.

        console.log("Submitting attributeData:", JSON.stringify(attributeData, null, 2));

        try {
            let response;
            if (isEditing) {
                response = await apiInstance.put(`/attributes/${id}`, attributeData);
            } else {
                response = await apiInstance.post('/attributes', attributeData);
            }
            console.log('Attribute saved:', response.data);
            setSuccessMessage(isEditing ? "Attribute updated successfully!" : "Attribute created successfully!");
            
            setTimeout(() => {
                setSuccessMessage(null); // Clear the success message after a delay
                if (isEditing) {
                    navigate('/dashboard/attributes'); // Navigate back to the list after update
                } else {
                    // For create, clear the form to allow adding another attribute
                    // setAttributeName(''); // No longer needed if navigating away
                    // setAttributeValues(['']); // No longer needed if navigating away
                    // Optionally, you could also navigate for 'create' if desired:
                    navigate('/dashboard/attributes'); // <<< ADD THIS LINE TO REDIRECT AFTER CREATE
                }
            }, 1500); // Delay to allow user to see the success message

        } catch (err) {
            console.error('Error saving attribute:', err);
            const backendErrorMessage = err.response?.data?.message || 'Failed to save attribute. Please check your input.';
            // const detailedError = err.response?.data?.errorDetails || (err.isAxiosError ? err.toJSON() : err);
            // console.error('Detailed error object:', detailedError);
            setError(`${backendErrorMessage}${err.response?.data?.errorDetails ? ` (Details: ${err.response.data.errorDetails.split('\n')[0]})` : ''}`);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    {isEditing ? 'Edit Product Attribute' : 'Create New Product Attribute'}
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

                <form onSubmit={handleSubmit}>
                    <Box mb={3}>
                        <TextField
                            fullWidth
                            label="Attribute Name"
                            variant="outlined"
                            value={attributeName}
                            onChange={handleNameChange}
                            required
                            disabled={isLoading}
                        />
                    </Box>

                    <Typography variant="h6" gutterBottom>Values</Typography>
                    <List>
                        {attributeValues.map((value, index) => (
                            <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                                <TextField
                                    fullWidth
                                    label={`Value ${index + 1}`}
                                    variant="outlined"
                                    value={value}
                                    onChange={(e) => handleValueChange(index, e)}
                                    disabled={isLoading}
                                    sx={{ mr: 1 }}
                                />
                                {attributeValues.length > 1 && (
                                    <IconButton
                                        onClick={() => handleRemoveValueField(index)}
                                        color="error"
                                        disabled={isLoading}
                                        aria-label="remove value"
                                    >
                                        <RemoveCircleOutlineIcon />
                                    </IconButton>
                                )}
                            </ListItem>
                        ))}
                    </List>

                    <Button
                        type="button"
                        variant="outlined"
                        onClick={handleAddValueField}
                        startIcon={<AddCircleOutlineIcon />}
                        disabled={isLoading}
                        sx={{ mb: 3, mt:1 }}
                    >
                        Add Value
                    </Button>

                    <Box mt={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            type="button"
                            variant="outlined"
                            onClick={() => navigate(-1)} // Go back
                            disabled={isLoading}
                            sx={{ mr: 2 }}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={isLoading}
                        >
                            {isLoading ? <CircularProgress size={24} /> : (isEditing ? 'Update Attribute' : 'Create Attribute')}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
}

export default ProductAttributeFormPage;