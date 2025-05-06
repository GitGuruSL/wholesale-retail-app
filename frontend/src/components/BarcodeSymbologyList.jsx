import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function BarcodeSymbologyList() {
    const [symbologies, setSymbologies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchSymbologies = useCallback(async () => {
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
            const response = await axios.get(`${API_BASE_URL}/barcode-symbologies`, config); // Added config
            setSymbologies(response.data);
        } catch (err) {
            console.error("Error fetching symbologies:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch barcode symbologies.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch symbologies. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]); // Added navigate to dependency array

    useEffect(() => {
        fetchSymbologies();
    }, [fetchSymbologies]);

    const handleDelete = async (symbologyId, symbologyName) => {
        if (!window.confirm(`Are you sure you want to delete symbology: "${symbologyName}" (ID: ${symbologyId})?\nThis might fail if it's linked to products.`)) {
            return;
        }
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setFeedback({ message: 'Authentication token not found. Please log in.', type: 'error' });
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            await axios.delete(`${API_BASE_URL}/barcode-symbologies/${symbologyId}`, config); // Added config
            setFeedback({ message: `Symbology "${symbologyName}" deleted successfully.`, type: 'success' });
            setSymbologies(prev => prev.filter(s => s.id !== symbologyId));
        } catch (err) {
            console.error(`Error deleting symbology ${symbologyId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete symbology.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFeedback({ message: 'Unauthorized: Could not delete symbology. Please log in again.', type: 'error' });
            } else {
                setFeedback({ message: errorMsg, type: 'error' });
            }
            // setError(errorMsg); // Optionally set general error too
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <div style={styles.centeredMessage}>Loading barcode symbologies...</div>;
    if (error && symbologies.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Barcode Types</h2>
            {feedback.message && (
                <div style={{
                    ...styles.feedbackBox,
                    ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {error && symbologies.length > 0 && !feedback.message && (
                <p style={{ ...styles.errorText, textAlign: 'center', marginBottom: '10px' }}>
                    Warning: Could not complete an operation. Error: {error}
                </p>
            )}

            <Link to="/barcode-symbologies/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Barcode Type</button>
            </Link>

            {symbologies.length === 0 && !loading && !error ? (
                <p>No barcode symbologies found.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {symbologies.map((symbology, index) => (
                            <tr key={symbology.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{symbology.id}</td>
                                <td style={styles.tableCell}>{symbology.name}</td>
                                <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                                    <button
                                        onClick={() => navigate(`/barcode-symbologies/edit/${symbology.id}`)}
                                        style={{ ...styles.button, ...styles.buttonEdit }}
                                        title="Edit Symbology"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(symbology.id, symbology.name)}
                                        style={{ ...styles.button, ...styles.buttonDelete }}
                                        title="Delete Symbology"
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

// Using more consistent styles from other list components
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333' },
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
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }, // Adjusted marginTop
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default BarcodeSymbologyList;