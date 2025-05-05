// frontend/src/components/ProductList.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

// --- Constants ---
const API_BASE_URL = 'http://localhost:5001/api';

// --- Helper Function ---
const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) { return '-'; }
    return number.toFixed(2);
};

// --- Component ---
function ProductList() {
    // --- State ---
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    // --- Data Fetching ---
    // useEffect to fetch data when the component mounts
    useEffect(() => {
        let isMounted = true; // Flag to prevent state update if component unmounts
        console.log("[ProductList Effect] Component mounted. Fetching products...");
        setLoading(true);
        setError(null);
        setFeedback({ message: null, type: null });

        const fetchProducts = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/products`);
                console.log("[ProductList Effect] API Response:", response.data);
                if (isMounted) { // Only update state if component is still mounted
                    setProducts(response.data || []); // Ensure it's an array
                }
            } catch (err) {
                console.error("[ProductList Effect] Error fetching products:", err);
                if (isMounted) {
                    const errorMsg = err.response?.data?.message || 'Failed to fetch products.';
                    setError(errorMsg);
                }
            } finally {
                console.log("[ProductList Effect] Finished fetching.");
                if (isMounted) {
                    setLoading(false); // Set loading false only if mounted
                }
            }
        };

        fetchProducts(); // Call the async function

        // Cleanup function to run when the component unmounts
        return () => {
            console.log("[ProductList Effect] Component unmounting.");
            isMounted = false; // Set flag to false on unmount
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Actions ---
    const handleDelete = async (productId, productName) => {
        console.log(`[ProductList] Attempting to delete product ID: ${productId}, Name: ${productName}`);
        if (!window.confirm(`Are you sure you want to delete product: ${productName} (ID: ${productId})?\nThis action cannot be undone and might fail if the product is referenced elsewhere.`)) {
             console.log("[ProductList] Deletion cancelled by user."); return;
        }
        setError(null); setFeedback({ message: null, type: null });
        try {
            const deleteUrl = `${API_BASE_URL}/products/${productId}`;
            console.log(`[ProductList] Sending DELETE request to: ${deleteUrl}`);
            await axios.delete(deleteUrl);
            console.log(`[ProductList] DELETE request for ID ${productId} successful.`);
            setFeedback({ message: `Product "${productName}" deleted successfully.`, type: 'success' });
            setProducts(prevProducts => { const updatedList = prevProducts.filter(p => p.id !== productId); console.log(`[ProductList] Product list state updated. New length: ${updatedList.length}`); return updatedList; });
        } catch (err) {
            console.error(`[ProductList] Error deleting product ${productId}:`, err);
            if (err.response) { console.error("[ProductList] Error response data:", err.response.data); console.error("[ProductList] Error response status:", err.response.status); }
            const errorMsg = err.response?.data?.message || 'Failed to delete product.';
            setFeedback({ message: errorMsg, type: 'error' }); setError(errorMsg);
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    // --- Render Logic ---
    console.log("[ProductList] Rendering component...", { loading, error, productsLength: products.length });

    if (loading) { return <div style={styles.centeredMessage}>Loading products...</div>; }
    if (error && products.length === 0) { return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>; }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Product List</h2>
            {feedback.message && ( <div style={{ ...styles.feedbackBox, ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError) }}> {feedback.message} </div> )}
            {error && products.length > 0 && ( <p style={styles.errorText}>Warning: Could not refresh product list. Error: {error}</p> )}

            <Link to="/products/new" style={styles.addButtonLink}> <button style={styles.button}>Add New Product</button> </Link>

            {products.length === 0 && !loading && !error ? ( <p>No products found. Add one!</p> ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        {/* Removed extra whitespace */}
                        <tr><th style={styles.tableCell}>ID</th><th style={styles.tableCell}>Name</th><th style={styles.tableCell}>SKU</th><th style={styles.tableCell}>Category</th><th style={styles.tableCell}>Base Unit</th><th style={styles.tableCell}>Cost Price</th><th style={styles.tableCell}>Retail Price</th><th style={styles.tableCell}>Wholesale Price</th><th style={styles.tableCell}>Actions</th></tr>
                    </thead>
                    <tbody>
                        {/* Removed extra whitespace */}
                        {products.map((product, index) => (
                            <tr key={product.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{product.id}</td>
                                <td style={styles.tableCell}>{product.product_name}</td>
                                <td style={styles.tableCell}>{product.sku || '-'}</td>
                                <td style={styles.tableCell}>{product.category_name || 'N/A'}</td>
                                <td style={styles.tableCell}>{product.base_unit_name || 'N/A'}</td>
                                <td style={styles.tableCell}>{formatCurrency(product.cost_price)}</td>
                                <td style={styles.tableCell}>{formatCurrency(product.retail_price)}</td>
                                <td style={styles.tableCell}>{formatCurrency(product.wholesale_price)}</td>
                                <td style={styles.tableCell}>
                                    <button onClick={() => navigate(`/products/edit/${product.id}`)} style={{...styles.button, ...styles.buttonEdit}}> Edit </button>
                                    <button onClick={() => handleDelete(product.id, product.product_name)} style={{...styles.button, ...styles.buttonDelete}}> Delete </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// --- Basic Styling ---
const styles = { /* ... styles object as before ... */ };

export default ProductList;