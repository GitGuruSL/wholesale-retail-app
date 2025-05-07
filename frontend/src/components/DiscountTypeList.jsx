import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Assuming apiInstance comes from here

function DiscountTypeList() {
    const [discountTypes, setDiscountTypes] = useState([]);
    const [isLoading, setIsLoading] = useState(true); // Page level loading
    const [pageError, setPageError] = useState(null); // Page level errors
    const [feedback, setFeedback] = useState({ message: null, type: null }); // User feedback messages

    const navigate = useNavigate();
    const location = useLocation();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    useEffect(() => {
        let timerId; // Declare timerId here
        if (location.state?.message) {
            setFeedback({ message: location.state.message, type: location.state.type || 'success' });
            navigate(location.pathname, { replace: true, state: {} }); // Clear location state
            // Store the timeout ID
            timerId = setTimeout(() => {
                setFeedback({ message: null, type: null });
            }, 5000);
        }
        // Cleanup function
        return () => {
            if (timerId) { // Check if timerId was set before clearing
                clearTimeout(timerId);
            }
        };
    }, [location, navigate]);

    const fetchDiscountTypes = useCallback(async () => {
        if (!apiInstance) { // Check if apiInstance is ready
            setPageError("API service not available.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get('/discount-types');
            setDiscountTypes(response.data || []);
        } catch (err) {
            console.error("Error fetching discount types:", err.response || err.message || err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch discount types.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
        }
    }, [apiInstance]); // apiInstance is a dependency

    useEffect(() => {
        if (authLoading) return; // Wait for auth to complete
        if (!isAuthenticated) {
            setPageError("Authentication required. Please log in.");
            setIsLoading(false);
            return;
        }
        if (apiInstance) { // Ensure apiInstance is available
            fetchDiscountTypes();
        } else if (!authLoading) { // If auth not loading but apiInstance still not there
            setPageError("API client not available. Cannot fetch discount types.");
            setIsLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchDiscountTypes]);

    const handleDelete = async (typeId, typeName) => {
        if (!apiInstance || !isAuthenticated) {
            setFeedback({ message: "Authentication error or API not available.", type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete discount type: "${typeName}" (ID: ${typeId})?\nThis might fail if it's linked to discounts.`)) {
            return;
        }
        setPageError(null); // Clear page error before new operation
        // Optionally, set a specific loading state for delete if it's slow
        try {
            await apiInstance.delete(`/discount-types/${typeId}`);
            setFeedback({ message: `Discount type "${typeName}" deleted successfully.`, type: 'success' });
            setDiscountTypes(prev => prev.filter(t => t.id !== typeId));
        } catch (err) {
            console.error(`Error deleting discount type ${typeId}:`, err.response || err.message || err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete discount type.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            // Clear feedback after a delay, handled by the main feedback useEffect if preferred
            const timer = setTimeout(() => setFeedback({ message: null, type: null }), 5000);
            // return () => clearTimeout(timer); // Not strictly needed here unless managing complex state
        }
    };

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (isLoading) return <div style={styles.centeredMessage}>Loading discount types...</div>;
    
    // If there's a page error and no data could be loaded
    if (pageError && discountTypes.length === 0) {
        return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {pageError}</div>;
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Discount Types</h2>
            {feedback.message && (
                <div style={{
                    ...styles.feedbackBox,
                    ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {/* Display pageError if it's a warning or occurred after some data was loaded */}
            {pageError && !feedback.message && ( // Avoid showing pageError if feedback is already showing an error
                <p style={{ ...styles.errorText, textAlign: 'center', marginBottom: '10px' }}>
                    Page Error: {pageError}
                </p>
            )}

            <Link to="/dashboard/discount-types/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Discount Type</button>
            </Link>

            {discountTypes.length === 0 && !isLoading && !pageError ? (
                <p style={styles.centeredMessage}>No discount types found. Click "Add New Discount Type" to create one.</p>
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
                        {discountTypes.map((type, index) => (
                            <tr key={type.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{type.id}</td>
                                <td style={styles.tableCell}>{type.name}</td>
                                <td style={{ ...styles.tableCell, ...styles.actionsCell }}>
                                    <button
                                        onClick={() => navigate(`/dashboard/discount-types/edit/${type.id}`)} // THIS LINE IS IMPORTANT
                                        style={{ ...styles.button, ...styles.buttonEdit }}
                                        title="Edit Discount Type"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(type.id, type.name)}
                                        style={{ ...styles.button, ...styles.buttonDelete }}
                                        title="Delete Discount Type"
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

// ... (styles object from your DiscountTypeList.jsx, ensure it's complete)
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
    tableCell: { padding: '10px 8px', textAlign: 'left', verticalAlign: 'middle', borderBottom: '1px solid #dee2e6', wordBreak: 'break-word', fontSize: '0.9em' },
    actionsCell: { whiteSpace: 'nowrap', textAlign: 'center' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default DiscountTypeList;