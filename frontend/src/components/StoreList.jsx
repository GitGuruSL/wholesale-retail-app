import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function StoreList() {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchStores = useCallback(async () => {
        setLoading(true);
        setError(null);
        setFeedback({ message: null, type: null });
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('Authentication token not found. Please log in.');
                setLoading(false);
                // navigate('/login'); // Optionally redirect
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const response = await axios.get(`${API_BASE_URL}/stores`, config);
            setStores(response.data || []);
        } catch (err) {
            console.error("Error fetching stores:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch stores.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch stores. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, []); // Removed unnecessary dependency

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    const handleDelete = async (storeId, storeName) => {
        if (!window.confirm(`Are you sure you want to delete store: "${storeName}" (ID: ${storeId})?\nThis might fail if it's linked to products, stock, or orders.`)) {
            return;
        }
        setError(null); // Clear general error before attempting delete
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setFeedback({ message: 'Authentication token not found. Please log in.', type: 'error' });
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            await axios.delete(`${API_BASE_URL}/stores/${storeId}`, config);
            setFeedback({ message: `Store "${storeName}" deleted successfully.`, type: 'success' });
            setStores(prev => prev.filter(s => s.id !== storeId));
        } catch (err) {
            console.error(`Error deleting store ${storeId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete store.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFeedback({ message: 'Unauthorized: Could not delete store. Please log in again.', type: 'error' });
            } else {
                setFeedback({ message: errorMsg, type: 'error' });
            }
            // setError(errorMsg); // Optionally set general error if feedback is not enough
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <div style={styles.centeredMessage}>Loading stores...</div>;
    if (error && stores.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

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
            {error && stores.length > 0 && !feedback.message && ( // Show general error if list is present but an op failed
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {error}
                 </p>
            )}

            <Link to="/stores/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Store</button>
            </Link>

            {stores.length === 0 && !loading && !error ? (
                <p>No stores found.</p>
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
                                    <button
                                        onClick={() => navigate(`/stores/edit/${store.id}`)}
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
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333', textAlign: 'center' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none', display: 'inline-block', marginBottom: '15px' },
    button: { padding: '8px 12px', margin: '0 5px 0 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white'},
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default StoreList;