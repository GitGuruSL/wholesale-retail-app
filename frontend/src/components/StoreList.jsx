// frontend/src/components/StoreList.jsx
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
            const response = await axios.get(`${API_BASE_URL}/stores`);
            setStores(response.data);
        } catch (err) {
            console.error("Error fetching stores:", err);
            setError(err.response?.data?.message || 'Failed to fetch stores.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStores();
    }, [fetchStores]);

    const handleDelete = async (storeId, storeName) => {
        if (!window.confirm(`Are you sure you want to delete store: "${storeName}" (ID: ${storeId})?\nThis might fail if it's linked to products, stock, or orders.`)) {
            return;
        }

        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/stores/${storeId}`);
            setFeedback({ message: `Store "${storeName}" deleted successfully.`, type: 'success' });
            setStores(prev => prev.filter(s => s.id !== storeId));
        } catch (err) {
            console.error(`Error deleting store ${storeId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete store.';
            setFeedback({ message: errorMsg, type: 'error' });
            setError(errorMsg);
        } finally {
             setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <p>Loading stores...</p>;
    if (error && stores.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Stores</h2>

            {/* Feedback Area */}
            {feedback.message && (
                <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}>
                    {feedback.message}
                </div>
            )}
            {error && stores.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}


            <Link to="/stores/new">
                <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Store</button>
            </Link>

            {stores.length === 0 && !loading ? (
                <p>No stores found.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}>
                            <th style={tableCellStyle}>ID</th>
                            <th style={tableCellStyle}>Name</th>
                            <th style={tableCellStyle}>Address</th>
                            <th style={tableCellStyle}>Contact Info</th>
                            <th style={tableCellStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stores.map((store, index) => (
                            <tr key={store.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{store.id}</td>
                                <td style={tableCellStyle}>{store.name}</td>
                                <td style={tableCellStyle}>{store.address || '-'}</td>
                                <td style={tableCellStyle}>{store.contact_info || '-'}</td>
                                <td style={tableCellStyle}>
                                    <button
                                        onClick={() => navigate(`/stores/edit/${store.id}`)}
                                        style={{ marginRight: '5px', padding: '5px 8px', cursor:'pointer' }}
                                        title="Edit Store"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(store.id, store.name)}
                                        style={{ padding: '5px 8px', cursor:'pointer', backgroundColor: '#f44336', color: 'white', border:'none', borderRadius:'3px'}}
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

// Basic styles
const tableCellStyle = {
    padding: '10px 8px',
    textAlign: 'left',
    verticalAlign: 'top',
};

export default StoreList;
