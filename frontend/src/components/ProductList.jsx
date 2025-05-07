import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
// import apiInstance from '../services/api'; // REMOVE THIS LINE
import { useAuth } from '../context/AuthContext'; // Ensure this is correctly pathed

// --- Helper Function ---
const formatCurrency = (value) => {
    const number = parseFloat(value);
    if (isNaN(number)) { return '-'; }
    return number.toFixed(2);
};

// --- Basic Styling (ensure these are reasonable) ---
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' },
    title: { textAlign: 'center', marginBottom: '20px', color: '#333' },
    centeredMessage: { textAlign: 'center', padding: '20px', fontSize: '1.2em' },
    errorText: { color: 'red', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', margin: '15px 0', borderRadius: '4px', textAlign: 'center', border: '1px solid transparent' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { display: 'block', textAlign: 'right', marginBottom: '15px' },
    button: { padding: '8px 15px', margin: '0 5px', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', backgroundColor: '#f8f9fa' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white', borderColor: '#28a745'},
    buttonEdit: { borderColor: '#ffc107', color: '#212529' },
    buttonDelete: { borderColor: '#dc3545', color: 'white', backgroundColor: '#dc3545' },
    buttonActivePage: { fontWeight: 'bold', backgroundColor: '#007bff', color: 'white', borderColor: '#007bff' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '10px 8px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' },
    paginationNav: { marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' },
    paginationUl: { display: 'flex', listStyle: 'none', padding: 0 },
    pageItem: { margin: '0 2px' },
    pageLink: { padding: '6px 12px', border: '1px solid #dee2e6', color: '#007bff', textDecoration: 'none', borderRadius: '4px' },
    pageLinkDisabled: { color: '#6c757d', pointerEvents: 'none', backgroundColor: '#e9ecef' },
    pageLinkActive: { zIndex: 3, color: '#fff', backgroundColor: '#007bff', borderColor: '#007bff' },
};


// --- Component ---
function ProductList() {
    // --- State ---
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation(); // For feedback from form
    // Get apiInstance from useAuth
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [limit, setLimit] = useState(10); // Products per page

    // Display feedback from form navigation
    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear location state
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    }, [location, navigate]);

    // --- Data Fetching ---
    const fetchProducts = useCallback(async (page = 1, pageSize = 10) => {
        // Ensure apiInstance is available
        if (!isAuthenticated || !apiInstance) {
            console.log("[ProductList] Not authenticated or API client not available. Skipping product fetch.");
            setProducts([]);
            setLoading(false);
            setError("User not authenticated or API client not available. Please log in.");
            return;
        }

        console.log(`[ProductList] Fetching products for page: ${page}, limit: ${pageSize}...`);
        setLoading(true);
        setError(null);
        // setFeedback({ message: null, type: null }); // Clear feedback on new fetch

        try {
            const response = await apiInstance.get(`/products?page=${page}&limit=${pageSize}`); // Use apiInstance from useAuth
            console.log("[ProductList] API Response:", response.data);

            if (response.data && Array.isArray(response.data.data)) {
                setProducts(response.data.data);
                if (response.data.pagination) {
                    setCurrentPage(response.data.pagination.page);
                    setTotalPages(response.data.pagination.totalPages);
                    setTotalProducts(response.data.pagination.total);
                    setLimit(response.data.pagination.limit);
                } else {
                    setTotalPages(1);
                    setTotalProducts(response.data.data.length);
                }
            } else {
                console.warn("[ProductList] API response.data.data is not an array or is missing:", response.data);
                setProducts([]);
                setError("Received invalid data format for products.");
            }
        } catch (err) {
            console.error("[ProductList] Error fetching products:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch products.';
            setError(errorMsg);
            if (err.response?.status === 401) {
                setFeedback({ message: "Your session may have expired. Please try logging in again.", type: 'error'});
            }
        } finally {
            console.log("[ProductList] Finished fetching.");
            setLoading(false);
        }
    }, [isAuthenticated, apiInstance]); // Add apiInstance to dependencies

    useEffect(() => {
        // Check for apiInstance along with isAuthenticated
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchProducts(currentPage, limit);
        } else if (!authLoading && !isAuthenticated) {
            setError("Please log in to view products.");
            setLoading(false);
        } else if (!authLoading && !apiInstance && isAuthenticated) {
            setError("API client not available. Please try again later.");
            setLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, currentPage, limit, fetchProducts]); // Add apiInstance


    // --- Actions ---
    const handleDelete = async (productId, productName) => {
        if (!isAuthenticated || !apiInstance) { // Check apiInstance
            setFeedback({ message: "Not authenticated or API client not available.", type: 'error' });
            return;
        }
        console.log(`[ProductList] Attempting to delete product ID: ${productId}, Name: ${productName}`);
        if (!window.confirm(`Are you sure you want to delete product: ${productName} (ID: ${productId})?\nThis action cannot be undone and might fail if the product is referenced elsewhere.`)) {
            console.log("[ProductList] Deletion cancelled by user."); return;
        }
        setError(null); setFeedback({ message: null, type: null });
        try {
            await apiInstance.delete(`/products/${productId}`); // Use apiInstance from useAuth
            console.log(`[ProductList] DELETE request for ID ${productId} successful.`);
            setFeedback({ message: `Product "${productName}" deleted successfully.`, type: 'success' });
            // If on last page and it becomes empty, go to previous page
            if (products.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            } else {
                fetchProducts(currentPage, limit);
            }
        } catch (err) {
            console.error(`[ProductList] Error deleting product ${productId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete product.';
            setFeedback({ message: errorMsg, type: 'error' });
            setError(errorMsg);
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage) {
            setCurrentPage(newPage);
        }
    };

    // --- Render Logic ---
    console.log("[ProductList] Rendering component...", { loading, authLoading, error, productsLength: products.length });

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (loading && !products.length) return <div style={styles.centeredMessage}>Loading products...</div>; // Show loading only if no products yet
    
    if (error && products.length === 0) { 
        return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>; 
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Product List</h2>
            {feedback.message && ( <div style={{ ...styles.feedbackBox, ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError) }}> {feedback.message} </div> )}
            {error && products.length > 0 && !feedback.message && ( <p style={{...styles.errorText, textAlign:'center'}}>Warning: {error}</p> )}

            {/* Ensure navigation path is correct, e.g., /dashboard/products/new */}
            <Link to="/dashboard/products/new" style={styles.addButtonLink}> <button style={{...styles.button, ...styles.buttonAdd}}>Add New Product</button> </Link>

            {products.length === 0 && !loading ? ( <p style={styles.centeredMessage}>No products found. Click "Add New Product" to create one.</p> ) : (
                <>
                <div style={{ overflowX: 'auto' }}> {/* For table responsiveness */}
                    <table style={styles.table}>
                        <thead style={styles.tableHeader}>
                            <tr>
                                <th style={styles.tableCell}>ID</th>
                                <th style={styles.tableCell}>Name</th>
                                <th style={styles.tableCell}>SKU</th>
                                <th style={styles.tableCell}>Category</th>
                                <th style={styles.tableCell}>Base Unit</th>
                                <th style={styles.tableCell}>Cost</th>
                                <th style={styles.tableCell}>Retail</th>
                                <th style={styles.tableCell}>Wholesale</th>
                                <th style={styles.tableCell}>Store</th>
                                <th style={styles.tableCell}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                                <tr key={product.id || `product-${index}`} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                    <td style={styles.tableCell}>{product.id}</td>
                                    <td style={styles.tableCell}>{product.product_name || product.name}</td>
                                    <td style={styles.tableCell}>{product.sku || '-'}</td>
                                    <td style={styles.tableCell}>{product.category_name || 'N/A'}</td>
                                    <td style={styles.tableCell}>{product.base_unit_name || 'N/A'}</td>
                                    <td style={styles.tableCell}>{formatCurrency(product.cost_price)}</td>
                                    <td style={styles.tableCell}>{formatCurrency(product.retail_price)}</td>
                                    <td style={styles.tableCell}>{formatCurrency(product.wholesale_price)}</td>
                                    <td style={styles.tableCell}>{product.store_name || (product.store_id ? `ID: ${product.store_id}` : 'N/A')}</td>
                                    <td style={{...styles.tableCell, whiteSpace: 'nowrap'}}>
                                        {/* Ensure navigation path is correct, e.g., /dashboard/products/edit/:id */}
                                        <button onClick={() => navigate(`/dashboard/products/edit/${product.id}`)} style={{...styles.button, ...styles.buttonEdit}}> Edit </button>
                                        <button onClick={() => handleDelete(product.id, product.product_name || product.name)} style={{...styles.button, ...styles.buttonDelete}}> Delete </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <nav style={styles.paginationNav}>
                        <ul style={styles.paginationUl}>
                            <li style={styles.pageItem}>
                                <button 
                                    onClick={() => handlePageChange(currentPage - 1)} 
                                    disabled={currentPage === 1}
                                    style={{...styles.pageLink, ...(currentPage === 1 && styles.pageLinkDisabled)}}
                                >
                                    Previous
                                </button>
                            </li>
                            {[...Array(totalPages).keys()].map(num => (
                                <li key={num + 1} style={styles.pageItem}>
                                    <button 
                                        onClick={() => handlePageChange(num + 1)}
                                        style={{...styles.pageLink, ...(currentPage === num + 1 && styles.pageLinkActive)}}
                                    >
                                        {num + 1}
                                    </button>
                                </li>
                            ))}
                            <li style={styles.pageItem}>
                                <button 
                                    onClick={() => handlePageChange(currentPage + 1)} 
                                    disabled={currentPage === totalPages}
                                    style={{...styles.pageLink, ...(currentPage === totalPages && styles.pageLinkDisabled)}}
                                >
                                    Next
                                </button>
                            </li>
                        </ul>
                    </nav>
                )}
                <p style={{textAlign: 'center', marginTop: '10px', fontSize: '0.9em', color: '#555'}}>
                    Page {currentPage} of {totalPages} (Total Products: {totalProducts})
                </p>
                </>
            )}
        </div>
    );
}

export default ProductList;