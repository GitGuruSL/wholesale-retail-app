import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/useStore';

function ProductList() {
    const [products, setProducts] = useState([]);
    // Initialize isLoading to true to cover initial setup and data fetching
    const [isLoading, setIsLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const { api, user, ROLES, isLoading: isAuthLoading } = useAuth(); // Assuming AuthContext provides isLoading
    const { selectedStore, isLoading: isStoreLoading, error: storeError } = useStore();

    const fetchProducts = useCallback(async (currentApi, currentUser, currentSelectedStore, currentROLES) => {
        // Pass dependencies directly to ensure useCallback uses the latest values if needed for a manual call
        // Though for useEffect, it will use the ones from its own closure
        if (!currentUser || !currentApi || !currentROLES) {
            setProducts([]);
            setIsLoading(false); // Ensure loading is false if prerequisites aren't met
            return;
        }
        if (currentUser.role !== currentROLES.GLOBAL_ADMIN && !currentSelectedStore) {
            setProducts([]);
            setIsLoading(false); // Ensure loading is false
            return;
        }

        setIsLoading(true); // Set loading true specifically for product fetching
        setError(null);
        setFeedback({ message: null, type: null });

        const params = {};
        if (currentUser.role === currentROLES.GLOBAL_ADMIN) {
            if (currentSelectedStore) params.store_id = currentSelectedStore.id;
        } else if (currentSelectedStore) { // This implies store_admin or sales_person
            params.store_id = currentSelectedStore.id;
        } else {
            // This case should ideally be caught by the check above
            setProducts([]);
            setIsLoading(false);
            return;
        }

        try {
            const response = await currentApi.get('/products', { params });
            setProducts(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error("Failed to fetch products:", err);
            setError(err.response?.data?.message || 'Failed to fetch products.');
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, []); // Removed dependencies as they will be passed or come from useEffect's closure

    useEffect(() => {
        // Wait for auth and store context to be ready
        if (isAuthLoading || isStoreLoading) {
            setIsLoading(true); // Keep overall loading true
            setProducts([]); // Clear products while contexts are loading
            return;
        }

        // If contexts are loaded, but essential data is missing (e.g., user logged out, ROLES not loaded)
        if (!user || !api || !ROLES) {
            setError("User data or API configuration is not available.");
            setProducts([]);
            setIsLoading(false);
            return;
        }
        
        // If store context has an error
        if (storeError) {
            setError(`Store Error: ${storeError}`); // Combine errors or prioritize
            setProducts([]);
            setIsLoading(false);
            return;
        }

        // Conditions for fetching products
        if (user.role === ROLES.GLOBAL_ADMIN) {
            fetchProducts(api, user, selectedStore, ROLES); // Pass current values
        } else if (selectedStore) { // For STORE_ADMIN or SALES_PERSON, selectedStore is required
            fetchProducts(api, user, selectedStore, ROLES); // Pass current values
        } else {
            // For non-global admin, if no store is selected, don't fetch, show message.
            // The rendering logic below will handle the "Please select a store" message.
            setProducts([]);
            setIsLoading(false); 
        }
    // Add isAuthLoading to dependencies
    }, [api, user, selectedStore, ROLES, fetchProducts, isAuthLoading, isStoreLoading, storeError]);


    const handleDelete = async (productId, productName) => {
        // ... (handleDelete logic remains the same)
        if (!api) {
            setFeedback({ message: 'API not available. Cannot delete.', type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete product: "${productName}" (ID: ${productId})?`)) {
            return;
        }
        setFeedback({ message: null, type: null });
        try {
            await api.delete(`/products/${productId}`);
            setFeedback({ message: `Product "${productName}" deleted successfully.`, type: 'success' });
            // Refetch with current context values
            if (user && api && ROLES) { // Ensure context is still valid
                 if (user.role === ROLES.GLOBAL_ADMIN) fetchProducts(api, user, selectedStore, ROLES);
                 else if (selectedStore) fetchProducts(api, user, selectedStore, ROLES);
            }
        } catch (err) {
            setFeedback({ message: err.response?.data?.message || 'Failed to delete product.', type: 'error' });
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    // Determine these after initial loading checks
    const canManageProducts = !isAuthLoading && !isStoreLoading && user && ROLES && (user.role === ROLES.GLOBAL_ADMIN || (user.role === ROLES.STORE_ADMIN && selectedStore));
    const canAddNewProduct = !isAuthLoading && !isStoreLoading && user && ROLES && ((user.role === ROLES.GLOBAL_ADMIN && selectedStore) || (user.role === ROLES.STORE_ADMIN && selectedStore));

    // Combined initial loading states
    if (isAuthLoading) return <p style={styles.centeredMessage}>Loading user data...</p>;
    if (isStoreLoading) return <p style={styles.centeredMessage}>Loading store information...</p>;
    
    // If contexts are loaded but there was an issue (e.g. user is null after auth check)
    if (!user || !ROLES) {
         // This case might indicate an issue with AuthContext not setting user/ROLES correctly
        return <p style={styles.centeredMessage}>User information is unavailable. Please try logging in again.</p>;
    }
    if (storeError) return <p style={{ ...styles.centeredMessage, ...styles.errorText }}>Store Error: {storeError}</p>;


    // Specific condition for non-global admins needing a store selection
    if (user.role !== ROLES.GLOBAL_ADMIN && !selectedStore) {
        return (
            <div style={styles.container}>
                <h2 style={styles.title}>Products</h2>
                <p style={styles.centeredMessage}>Please select a store to view products.</p>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>
                Products
                {user.role === ROLES.GLOBAL_ADMIN ?
                    (selectedStore ? ` (Store: ${selectedStore.name})` : ' (All Stores)') :
                    (selectedStore ? ` (Store: ${selectedStore.name})` : '') // Should always have selectedStore here due to check above
                }
            </h2>

            {feedback.message && (
                <div style={{ ...styles.feedbackBox, ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError) }}>
                    {feedback.message}
                </div>
            )}
            {/* Display general fetch error if no specific feedback and not currently loading products */}
            {error && !feedback.message && !isLoading && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>Error: {error}</p>
            )}


            {canAddNewProduct && (
                <div style={styles.actionButtonsTop}>
                    <Link to="/products/new">
                        <button style={{...styles.button, ...styles.buttonAdd}}>Add New Product</button>
                    </Link>
                </div>
            )}

            {/* This isLoading is specific to fetching products, after initial context loading */}
            {isLoading && <p style={styles.centeredMessage}>Loading products...</p>} 
            
            {!isLoading && !error && ( // Only show table/no products message if not loading and no error
                products.length > 0 ? (
                    <table style={styles.table}>
                        {/* ... table content ... */}
                        <thead style={styles.tableHeader}>
                            <tr>
                                <th style={styles.tableCell}>ID</th>
                                <th style={styles.tableCell}>Name</th>
                                <th style={styles.tableCell}>SKU</th>
                                <th style={styles.tableCell}>Category</th>
                                <th style={styles.tableCell}>Brand</th>
                                <th style={styles.tableCell}>Base Unit</th>
                                <th style={styles.tableCell}>Retail Price</th>
                                {canManageProducts && <th style={styles.tableCell}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, index) => (
                                <tr key={product.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                    <td style={styles.tableCell}>{product.id}</td>
                                    <td style={styles.tableCell}><Link to={`/products/view/${product.id}`} style={styles.link}>{product.name}</Link></td>
                                    <td style={styles.tableCell}>{product.sku || '-'}</td>
                                    <td style={styles.tableCell}>{product.category_name || '-'}</td>
                                    <td style={styles.tableCell}>{product.brand_name || '-'}</td>
                                    <td style={styles.tableCell}>{product.base_unit_name || '-'}</td>
                                    <td style={styles.tableCell}>{product.sale_price !== undefined ? `$${Number(product.sale_price).toFixed(2)}` : '-'}</td>
                                    {canManageProducts && (
                                        <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                            <Link to={`/products/edit/${product.id}`}>
                                                <button style={{...styles.button, ...styles.buttonEdit}} disabled={!canManageProducts}>Edit</button>
                                            </Link>
                                            <button onClick={() => handleDelete(product.id, product.name)} style={{...styles.button, ...styles.buttonDelete}} disabled={!canManageProducts}>
                                                Delete
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                     <p style={styles.centeredMessage}>
                        {/* Message when no products are found after successful load & no error */}
                        No products found for the current selection.
                    </p>
                )
            )}
        </div>
    );
}

// ... styles object remains the same ...
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333', textAlign: 'center' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    actionButtonsTop: { marginBottom: '20px', textAlign: 'left' },
    button: { padding: '8px 12px', margin: '0 5px 0 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white'},
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' },
    link: { color: '#007bff', textDecoration: 'none' },
};

export default ProductList;