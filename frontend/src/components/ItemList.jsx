import React, { useState, useEffect, Fragment, useMemo } from 'react'; // Added useMemo
import { fetchItems, fetchItemVariations, deleteItemById as deleteItemAPI } from '../services/api'; // Changed 'deleteItem' to 'deleteItemById'
import { useNavigate } from 'react-router-dom';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField'; // Added TextField for search
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import Collapse from '@mui/material/Collapse';

function ItemList() {
  const [allItems, setAllItems] = useState([]); // Store all fetched items
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [expandedItemId, setExpandedItemId] = useState(null);
  const [itemVariations, setItemVariations] = useState([]);
  const [variationsLoading, setVariationsLoading] = useState(false);
  const [variationsError, setVariationsError] = useState(null);

  const [searchTerm, setSearchTerm] = useState(''); // State for search term

  useEffect(() => {
    const getItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchItems();
        // Sort by ID (ascending) by default after fetching
        const sortedData = (data || []).sort((a, b) => a.id - b.id);
        setAllItems(sortedData);
      } catch (err) {
        setError(err.message || 'Failed to fetch items.');
        setAllItems([]);
      } finally {
        setLoading(false);
      }
    };
    getItems();
  }, []);

  // Memoize filtered items to avoid re-filtering on every render
  const filteredItems = useMemo(() => {
    if (!searchTerm) {
      return allItems;
    }
    return allItems.filter(item =>
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.category_name && item.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.brand_name && item.brand_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.id.toString().includes(searchTerm)
    );
  }, [allItems, searchTerm]);

  const handleExpandClick = async (itemId) => {
    if (expandedItemId === itemId) {
      setExpandedItemId(null);
      setItemVariations([]);
    } else {
      setExpandedItemId(itemId);
      setVariationsLoading(true);
      setVariationsError(null);
      setItemVariations([]);
      try {
        const variationsData = await fetchItemVariations(itemId);
        setItemVariations(variationsData || []);
      } catch (err) {
        setVariationsError(err.message || 'Failed to load variations.');
        setItemVariations([]);
      } finally {
        setVariationsLoading(false);
      }
    }
  };

  const handleAddItem = () => navigate('/dashboard/items/new'); // MODIFIED PATH
  const handleEditItem = (id) => navigate(`/dashboard/items/edit/${id}`); // Also ensure this path is correct for your setup

  const handleDeleteItem = async (id) => {
    if (window.confirm(`Are you sure you want to delete item ${id}?`)) {
      try {
        await deleteItemAPI(id); // If you created a specific function in api.js
        setAllItems((prevItems) => prevItems.filter((item) => item.id !== id)); // Update local state
        console.log(`Item ${id} deleted successfully.`);
      } catch (error) {
        console.error(`Failed to delete item ${id}:`, error);
        // Display error to user
      }
    }
  };

  if (loading) return <Container sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Container>;
  if (error) return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h1" sx={{ color: 'primary.main' }}>
          Item List
        </Typography>
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddItem}>
          Add New Item
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          label="Search Items (Name, SKU, Category, Brand, ID)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
        />
      </Box>

      {!filteredItems || filteredItems.length === 0 ? (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography>{searchTerm ? 'No items match your search.' : 'No items found.'}</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table sx={{ minWidth: 850 }} aria-label="item list table">
            <TableHead sx={{ backgroundColor: 'primary.main' }}>
              <TableRow>
                <TableCell sx={{ width: '60px', color: 'background.paper', fontWeight: 'bold' }} />
                <TableCell sx={{ color: 'background.paper', fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ color: 'background.paper', fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ color: 'background.paper', fontWeight: 'bold' }}>SKU</TableCell>
                <TableCell align="right" sx={{ color: 'background.paper', fontWeight: 'bold' }}>Retail Price</TableCell>
                <TableCell align="right" sx={{ color: 'background.paper', fontWeight: 'bold' }}>Cost Price</TableCell>
                <TableCell sx={{ color: 'background.paper', fontWeight: 'bold' }}>Category</TableCell>
                <TableCell sx={{ color: 'background.paper', fontWeight: 'bold' }}>Brand</TableCell>
                <TableCell sx={{ color: 'background.paper', fontWeight: 'bold', textAlign: 'center' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((item) => (
                <Fragment key={item.id}>
                  <TableRow sx={{ '&:nth-of-type(odd)': { backgroundColor: 'action.hover' } }}>
                    <TableCell padding="checkbox">
                      {item.item_type === 'Variable' && (
                        <IconButton
                          aria-label="expand row"
                          size="small"
                          onClick={() => handleExpandClick(item.id)}
                        >
                          {expandedItemId === item.id ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      )}
                    </TableCell>
                    <TableCell component="th" scope="row">{item.id}</TableCell>
                    <TableCell>{item.item_name}</TableCell>
                    <TableCell>{item.sku || 'N/A'}</TableCell>
                    <TableCell align="right">{parseFloat(item.retail_price || 0).toFixed(2)}</TableCell>
                    <TableCell align="right">{parseFloat(item.cost_price || 0).toFixed(2)}</TableCell>
                    <TableCell>{item.category_name || 'N/A'}</TableCell>
                    <TableCell>{item.brand_name || 'N/A'}</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" size="small" onClick={() => handleEditItem(item.id)} sx={{ mr: 0.5 }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton color="error" size="small" onClick={() => handleDeleteItem(item.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                  {item.item_type === 'Variable' && (
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                        <Collapse in={expandedItemId === item.id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 1, padding: 2, backgroundColor: 'rgba(0, 0, 0, 0.03)', borderRadius: 1 }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '1rem', color: 'text.secondary' }}>
                              Variations for: {item.item_name}
                            </Typography>
                            {variationsLoading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>}
                            {variationsError && <Alert severity="error" sx={{ my: 1 }}>{variationsError}</Alert>}
                            {!variationsLoading && !variationsError && itemVariations.length === 0 && expandedItemId === item.id && (
                              <Typography sx={{ py: 1, fontStyle: 'italic' }}>No variations found or loaded.</Typography>
                            )}
                            {!variationsLoading && !variationsError && itemVariations.length > 0 && expandedItemId === item.id && (
                              <Table size="small" aria-label="item variations">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Var. ID</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Var. SKU</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Attributes</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Retail Price</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Cost Price</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {itemVariations.map((variation) => (
                                    <TableRow key={variation.id}>
                                      <TableCell>{variation.id}</TableCell>
                                      <TableCell>{variation.sku || 'N/A'}</TableCell>
                                      <TableCell>{variation.attribute_combination_display || 'N/A'}</TableCell>
                                      <TableCell align="right">{parseFloat(variation.retail_price || 0).toFixed(2)}</TableCell>
                                      <TableCell align="right">{parseFloat(variation.cost_price || 0).toFixed(2)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}

export default ItemList;