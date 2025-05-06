import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function ManufacturerList() {
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchManufacturers = useCallback(async () => {
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
            const response = await axios.get(`${API_BASE_URL}/manufacturers`, config);
            setManufacturers(response.data);
        } catch (err) {
            console.error("Error fetching manufacturers:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch manufacturers.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch manufacturers. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]); // Added navigate

    useEffect(() => {
        fetchManufacturers();
    }, [fetchManufacturers]);

    const handleDelete = async (manufacturerId, manufacturerName) => {
        if (!window.confirm(`Are you sure you want to delete manufacturer: "${manufacturerName}" (ID: ${manufacturerId})?\nThis might fail if they are linked to products.`)) {
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
            await axios.delete(`${API_BASE_URL}/manufacturers/${manufacturerId}`, config);
            setFeedback({ message: `Manufacturer "${manufacturerName}" deleted successfully.`, type: 'success' });
            setManufacturers(prev => prev.filter(m => m.id !== manufacturerId));
        } catch (err) {
            console.error(`Error deleting manufacturer ${manufacturerId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete manufacturer.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFeedback({ message: 'Unauthorized: Could not delete manufacturer. Please log in again.', type: 'error' });
            } else {
                setFeedback({ message: errorMsg, type: 'error' });
            }
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <div style={styles.centeredMessage}>Loading manufacturers...</div>;
    if (error && manufacturers.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Manufacturers</h2>
            {feedback.message && (
                <div style={{
                    ...styles.feedbackBox,
                    ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {error && manufacturers.length > 0 && !feedback.message && (
                <p style={{ ...styles.errorText, textAlign: 'center', marginBottom: '10px' }}>
                    Warning: An operation failed. Error: {error}
                </p>
            )}

            <Link to="/manufacturers/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Manufacturer</button>
            </Link>

            {manufacturers.length === 0 && !loading && !error ? (
                <p>No manufacturers found.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>City</th>
                            <th style={styles.tableCell}>Telephone</th>
                            <th style={styles.tableCell}>Email</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {manufacturers.map((m, index) => (
                            <tr key={m.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{m.id}</td>
                                <td style={styles.tableCell}>{m.name}</td>
                                <td style={styles.tableCell}>{m.city || '-'}</td>
                                <td style={styles.tableCell}>{m.telephone || '-'}</td>
                                <td style={styles.tableCell}>{m.email || '-'}</td>
                                <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                                    <button
                                        onClick={() => navigate(`/manufacturers/edit/${m.id}`)}
                                        style={{ ...styles.button, ...styles.buttonEdit }}
                                        title="Edit Manufacturer"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(m.id, m.name)}
                                        style={{ ...styles.button, ...styles.buttonDelete }}
                                        title="Delete Manufacturer"
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

export default ManufacturerList;