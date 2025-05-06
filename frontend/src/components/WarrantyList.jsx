// filepath: d:\Development\wholesale-retail-app\frontend\src\components\WarrantyList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function WarrantyList() {
    const [warranties, setWarranties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const { api } = useAuth();

    const fetchWarranties = useCallback(async () => {
        if (!api) {
            setError("API client not available. Cannot fetch warranties.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setFeedback({ message: null, type: null });
        try {
            const response = await api.get('/warranties');
            setWarranties(response.data || []);
        } catch (err) {
            console.error("Error fetching warranties:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch warranties.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch warranties. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchWarranties();
    }, [fetchWarranties]);

    const handleDelete = async (warrantyId, warrantyName) => {
        if (!window.confirm(`Are you sure you want to delete warranty: "${warrantyName}" (ID: ${warrantyId})?\nThis might fail if it's linked to products.`)) {
            return;
        }
        setError(null);
        try {
            await api.delete(`/warranties/${warrantyId}`);
            setFeedback({ message: `Warranty "${warrantyName}" deleted successfully.`, type: 'success' });
            setWarranties(prevWarranties => prevWarranties.filter(w => w.id !== warrantyId));
        } catch (err) {
            console.error(`Error deleting warranty ${warrantyId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete warranty.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFeedback({ message: 'Unauthorized: Could not delete warranty. Please log in again.', type: 'error' });
            } else {
                setFeedback({ message: errorMsg, type: 'error' });
            }
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <div style={styles.centeredMessage}>Loading warranties...</div>;
    if (error && warranties.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Warranties</h2>

            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {error && warranties.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {error}
                 </p>
            )}

            <Link to="/warranties/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Warranty</button>
            </Link>

            {warranties.length === 0 && !loading && !error ? (
                <p>No warranties found.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>Duration (Months)</th>
                            <th style={styles.tableCell}>Description</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {warranties.map((warranty, index) => (
                            <tr key={warranty.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{warranty.id}</td>
                                <td style={styles.tableCell}>{warranty.name}</td>
                                <td style={styles.tableCell}>{warranty.duration_months ?? '-'}</td>
                                <td style={styles.tableCell}>{warranty.description || '-'}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    <button
                                        onClick={() => navigate(`/warranties/edit/${warranty.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit Warranty"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(warranty.id, warranty.name)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete Warranty"
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
    tableRowEven: { backgroundColor: '#f8f9fa' },
};

export default WarrantyList;