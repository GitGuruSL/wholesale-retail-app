import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function TaxTypeList() {
    const [taxTypes, setTaxTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchTaxTypes = useCallback(async () => {
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
            const response = await axios.get(`${API_BASE_URL}/tax-types`, config);
            setTaxTypes(response.data || []);
        } catch (err) {
            console.error("Error fetching tax types:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch tax types.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch tax types. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]); // Added navigate

    useEffect(() => {
        fetchTaxTypes();
    }, [fetchTaxTypes]);

    const handleDelete = async (typeId, typeName) => {
        if (!window.confirm(`Are you sure you want to delete tax type: "${typeName}" (ID: ${typeId})?\nThis might fail if it's linked to taxes.`)) {
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
            await axios.delete(`${API_BASE_URL}/tax-types/${typeId}`, config);
            setFeedback({ message: `Tax type "${typeName}" deleted successfully.`, type: 'success' });
            setTaxTypes(prev => prev.filter(t => t.id !== typeId));
        } catch (err) {
            console.error(`Error deleting tax type ${typeId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete tax type.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFeedback({ message: 'Unauthorized: Could not delete tax type. Please log in again.', type: 'error' });
            } else {
                setFeedback({ message: errorMsg, type: 'error' });
            }
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <div style={styles.centeredMessage}>Loading tax types...</div>;
    if (error && taxTypes.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Tax Types</h2>

            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {error && taxTypes.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {error}
                 </p>
            )}

            <Link to="/tax-types/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Tax Type</button>
            </Link>

            {taxTypes.length === 0 && !loading && !error ? (
                <p>No tax types found.</p>
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
                        {taxTypes.map((type, index) => (
                            <tr key={type.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{type.id}</td>
                                <td style={styles.tableCell}>{type.name}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    <button
                                        onClick={() => navigate(`/tax-types/edit/${type.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit Tax Type"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(type.id, type.name)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete Tax Type"
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
    // Form specific styles (already in TaxTypeForm, but for completeness if merging)
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' }, // from TaxTypeForm
    formGroup: { marginBottom: '20px' }, // from TaxTypeForm
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' }, // from TaxTypeForm
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' }, // from TaxTypeForm
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }, // from TaxTypeForm
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' }, // from TaxTypeForm
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' }, // from TaxTypeForm
};

export default TaxTypeList;