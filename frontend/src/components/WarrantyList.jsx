import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { useAuth } from '../context/AuthContext';

function WarrantyList() {
    const [warranties, setWarranties] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Renamed from loading
    const [pageError, setPageError] = useState(null);   // Renamed from error
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation(); // For receiving feedback from form
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use apiInstance

    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear state after showing
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    }, [location, navigate]);

    const fetchWarranties = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setPageError("User not authenticated or API client not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        // setFeedback({ message: null, type: null }); // Keep existing feedback
        try {
            const response = await apiInstance.get('/warranties');
            setWarranties(response.data || []);
        } catch (err) {
            console.error("Error fetching warranties:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch warranties.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance, isAuthenticated]);

    useEffect(() => {
        if (authLoading) return; // Wait for auth context

        if (!isAuthenticated) {
            setPageError("Please log in to view warranties.");
            setIsLoading(false);
            return;
        }
        if (apiInstance) { // Check if apiInstance is available
            fetchWarranties();
        } else if (!authLoading) { // Only set error if auth is done and apiInstance is still null
             setPageError("API client not available. Cannot fetch warranties.");
             setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchWarranties]);

    const handleDelete = async (warrantyId, warrantyName) => {
        if (!apiInstance || !isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete warranty: "${warrantyName}" (ID: ${warrantyId})?\nThis might fail if it's linked to products.`)) {
            return;
        }
        setPageError(null); // Clear previous page errors
        try {
            await apiInstance.delete(`/warranties/${warrantyId}`);
            setFeedback({ message: `Warranty "${warrantyName}" deleted successfully.`, type: 'success' });
            setWarranties(prevWarranties => prevWarranties.filter(w => w.id !== warrantyId));
        } catch (err) {
            console.error(`Error deleting warranty ${warrantyId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete warranty. It might be in use.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (isLoading) return <div style={styles.centeredMessage}>Loading warranties...</div>;
    if (pageError && warranties.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {pageError}</div>;

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
            {pageError && warranties.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {pageError}
                 </p>
            )}
            {/* Ensure path matches App.jsx, e.g., /dashboard/warranties/new */}
            <Link to="/dashboard/warranties/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Warranty</button>
            </Link>

            {warranties.length === 0 && !isLoading && !pageError ? (
                <p style={styles.centeredMessage}>No warranties found. Click "Add New Warranty" to create one.</p>
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
                                    {/* Ensure path matches App.jsx, e.g., /dashboard/warranties/edit/:id */}
                                    <button
                                        onClick={() => navigate(`/dashboard/warranties/edit/${warranty.id}`)}
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
    container: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1000px', margin: '0 auto' }, // Added maxWidth
    title: { marginBottom: '20px', color: '#333', textAlign: 'center' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none', display: 'block', textAlign: 'right', marginBottom: '15px' }, // Changed to block
    button: { padding: '8px 12px', margin: '0 5px 0 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' },
    buttonAdd: { backgroundColor: '#28a745', color: 'white'},
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' },
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' },
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6' }, // Changed verticalAlign
    actionsCell: { whiteSpace: 'nowrap', textAlign: 'center' }, // Added textAlign center
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' },
};

export default WarrantyList;