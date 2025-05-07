import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // REMOVE THIS
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { useAuth } from '../context/AuthContext'; // Import useAuth

// const API_BASE_URL = 'http://localhost:5001/api'; // REMOVE THIS

function StoreList() {
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Renamed from 'loading'
    const [pageError, setPageError] = useState(null);   // Renamed from 'error'
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation(); // For receiving feedback from form
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use AuthContext

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear state after showing
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    }, [location, navigate]);

    const fetchStores = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setPageError("User not authenticated or API client not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        // setFeedback({ message: null, type: null }); // Keep existing feedback
        try {
            const response = await apiInstance.get('/stores');
            setStores(response.data || []);
        } catch (err) {
            console.error("[StoreList] Error fetching stores:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch stores.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchStores();
        } else if (!authLoading && !isAuthenticated) {
            setPageError("Please log in to view stores.");
            setIsLoading(false);
        } else if (!authLoading && !apiInstance) {
            setPageError("API client not available. Cannot fetch stores.");
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchStores]);

    const handleDelete = async (storeId, storeName) => {
        if (!apiInstance || !isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete store: "${storeName}" (ID: ${storeId})?\nThis might fail if it's linked to products, stock, or orders.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/stores/${storeId}`);
            setFeedback({ message: `Store "${storeName}" deleted successfully.`, type: 'success' });
            setStores(prev => prev.filter(s => s.id !== storeId));
        } catch (err) {
            console.error(`[StoreList] Error deleting store ${storeId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete store. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (isLoading) return <div style={styles.centeredMessage}>Loading stores...</div>;
    if (pageError && stores.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {pageError}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Stores</h2>

            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {pageError && stores.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {pageError}
                 </p>
            )}
            {/* Ensure path matches App.jsx, e.g., /dashboard/stores/new */}
            <Link to="/dashboard/stores/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Store</button>
            </Link>

            {stores.length === 0 && !isLoading && !pageError ? (
                <p style={styles.centeredMessage}>No stores found. Click "Add New Store" to create one.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>Address</th>
                            <th style={styles.tableCell}>Contact Info</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stores.map((store, index) => (
                            <tr key={store.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{store.id}</td>
                                <td style={styles.tableCell}>{store.name}</td>
                                <td style={styles.tableCell}>{store.address || '-'}</td>
                                <td style={styles.tableCell}>{store.contact_info || '-'}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    {/* Ensure path matches App.jsx, e.g., /dashboard/stores/edit/:id */}
                                    <button
                                        onClick={() => navigate(`/dashboard/stores/edit/${store.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit Store"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(store.id, store.name)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete Store"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

// Consistent List Styles
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' },
    title: { marginBottom: '20px', color: '#333', textAlign: 'center' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none', display: 'block', textAlign: 'right', marginBottom: '15px' },
    button: { padding: '8px 12px', margin: '0 5px 0 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white'},
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default StoreList;