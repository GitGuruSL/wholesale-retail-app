import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom'; // Added useLocation for feedback
import { useAuth } from '../context/AuthContext'; // Import useAuth

// Using more consistent styles from other list components
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

function BarcodeSymbologyList() {
    const [symbologies, setSymbologies] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Changed from 'loading'
    const [pageError, setPageError] = useState(null); // Changed from 'error'
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const location = useLocation(); // For receiving feedback from form
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use AuthContext

    // Display feedback from form navigation
    useEffect(() => {
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            // Clear location state after displaying feedback
            navigate(location.pathname, { replace: true, state: {} });
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    }, [location, navigate]);

    const fetchSymbologies = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setPageError("User not authenticated or API client not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        // setFeedback({ message: null, type: null }); // Keep existing feedback for a bit
        try {
            const response = await apiInstance.get('/barcode-symbologies');
            setSymbologies(response.data || []);
        } catch (err) {
            console.error("[BarcodeSymbologyList] Error fetching symbologies:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch barcode symbologies.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchSymbologies();
        } else if (!authLoading && !isAuthenticated) {
            setPageError("Please log in to view barcode types.");
            setIsLoading(false);
        } else if (!authLoading && !apiInstance) {
            setPageError("API client not available. Cannot fetch barcode types.");
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchSymbologies]);

    const handleDelete = async (symbologyId, symbologyName) => {
        if (!apiInstance || !isAuthenticated) {
            setFeedback({ message: "Authentication error. Please log in again.", type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete symbology: "${symbologyName}" (ID: ${symbologyId})?`)) {
            return;
        }
        setPageError(null); // Clear previous page errors before new operation
        try {
            await apiInstance.delete(`/barcode-symbologies/${symbologyId}`);
            setFeedback({ message: `Symbology "${symbologyName}" deleted successfully.`, type: 'success' });
            setSymbologies(prev => prev.filter(s => s.id !== symbologyId));
        } catch (err) {
            console.error(`[BarcodeSymbologyList] Error deleting symbology ${symbologyId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete symbology.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (isLoading) return <div style={styles.centeredMessage}>Loading barcode symbologies...</div>;
    if (pageError && symbologies.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {pageError}</div>;

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
            {pageError && symbologies.length > 0 && !feedback.message && ( // Show general error if list is present but an op failed
                <p style={{ ...styles.errorText, textAlign: 'center', marginBottom: '10px' }}>
                    Warning: An operation failed. Error: {pageError}
                </p>
            )}

            <Link to="/dashboard/barcode-symbologies/new" style={styles.addButtonLink}> {/* Ensure path matches App.jsx */}
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Barcode Type</button>
            </Link>

            {symbologies.length === 0 && !isLoading && !pageError ? (
                <p style={styles.centeredMessage}>No barcode symbologies found. Click "Add New Barcode Type" to create one.</p>
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
                                        onClick={() => navigate(`/dashboard/barcode-symbologies/edit/${symbology.id}`)} // Ensure path matches App.jsx
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

export default BarcodeSymbologyList;