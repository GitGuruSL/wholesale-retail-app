import React, { useState, useEffect, useCallback } from 'react';
// import axios from 'axios'; // REMOVE THIS
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { useAuth } from '../context/AuthContext'; // Import useAuth

// const API_BASE_URL = 'http://localhost:5001/api'; // REMOVE THIS

function TaxTypeList() {
    const [taxTypes, setTaxTypes] = useState([]);
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

    const fetchTaxTypes = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setPageError("User not authenticated or API client not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        // setFeedback({ message: null, type: null }); // Keep existing feedback
        try {
            const response = await apiInstance.get('/tax-types');
            setTaxTypes(response.data || []);
        } catch (err) {
            console.error("[TaxTypeList] Error fetching tax types:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch tax types.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchTaxTypes();
        } else if (!authLoading && !isAuthenticated) {
            setPageError("Please log in to view tax types.");
            setIsLoading(false);
        } else if (!authLoading && !apiInstance) {
            setPageError("API client not available. Cannot fetch tax types.");
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchTaxTypes]);

    const handleDelete = async (typeId, typeName) => {
        if (!apiInstance || !isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete tax type: "${typeName}" (ID: ${typeId})?\nThis might fail if it's linked to taxes.`)) {
            return;
        }
        setPageError(null);
        try {
            await apiInstance.delete(`/tax-types/${typeId}`);
            setFeedback({ message: `Tax type "${typeName}" deleted successfully.`, type: 'success' });
            setTaxTypes(prev => prev.filter(t => t.id !== typeId));
        } catch (err) {
            console.error(`[TaxTypeList] Error deleting tax type ${typeId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete tax type. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (isLoading) return <div style={styles.centeredMessage}>Loading tax types...</div>;
    if (pageError && taxTypes.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {pageError}</div>;

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
            {pageError && taxTypes.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {pageError}
                 </p>
            )}
            {/* Ensure path matches App.jsx, e.g., /dashboard/tax-types/new */}
            <Link to="/dashboard/tax-types/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Tax Type</button>
            </Link>

            {taxTypes.length === 0 && !isLoading && !pageError ? (
                <p style={styles.centeredMessage}>No tax types found. Click "Add New Tax Type" to create one.</p>
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
                                    {/* Ensure path matches App.jsx, e.g., /dashboard/tax-types/edit/:id */}
                                    <button
                                        onClick={() => navigate(`/dashboard/tax-types/edit/${type.id}`)}
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
    container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '800px', margin: '0 auto' }, // Adjusted maxWidth
    title: { marginBottom: '20px', color: '#333', textAlign: 'center' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none', display: 'block', textAlign: 'right', marginBottom: '15px' }, // Changed to block for better layout
    button: { padding: '8px 12px', margin: '0 5px 0 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white'},
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }, // Changed verticalAlign to middle
    actionsCell: { whiteSpace: 'nowrap', textAlign: 'center' }, // Added textAlign center for actions
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' },
};

export default TaxTypeList;