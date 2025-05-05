// frontend/src/components/SpecialCategoryList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

// Configuration
const API_BASE_URL = 'http://localhost:5001/api'; // Use environment variables for production

// Component to display and manage Special Categories
function SpecialCategoryList() {
    // State variables
    const [specialCategories, setSpecialCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null }); // For user feedback (e.g., after delete)
    const navigate = useNavigate(); // Hook for programmatic navigation

    // Function to fetch special categories from the API
    const fetchSpecialCategories = useCallback(async () => {
        setLoading(true); // Start loading indicator
        setError(null); // Clear previous errors
        setFeedback({ message: null, type: null }); // Clear previous feedback
        try {
            const response = await axios.get(`${API_BASE_URL}/special-categories`);
            setSpecialCategories(response.data || []); // Ensure it's an array
        } catch (err) {
            console.error("Error fetching special categories:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch special categories. Please check API connection.';
            setError(errorMsg); // Set error message state
        } finally {
            setLoading(false); // Stop loading indicator
        }
    }, []); // Empty dependency array means this function reference is stable

    // useEffect hook to call fetchSpecialCategories when the component mounts
    useEffect(() => {
        fetchSpecialCategories();
    }, [fetchSpecialCategories]); // Dependency array includes fetchSpecialCategories

    // Function to handle deleting a special category
    const handleDelete = async (categoryId, categoryName) => {
        // Confirmation dialog
        if (!window.confirm(`Are you sure you want to delete special category: "${categoryName}" (ID: ${categoryId})?\nThis might fail if it's linked to products.`)) {
            return; // Stop if user cancels
        }
        setError(null); // Clear previous errors
        try {
            await axios.delete(`${API_BASE_URL}/special-categories/${categoryId}`);
            setFeedback({ message: `Special category "${categoryName}" deleted successfully.`, type: 'success' });
            // Refresh list by removing the item locally
            setSpecialCategories(prev => prev.filter(sc => sc.id !== categoryId));
        } catch (err) {
            console.error(`Error deleting special category ${categoryId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete special category.';
            setFeedback({ message: errorMsg, type: 'error' });
            setError(errorMsg); // Also set general error state
        } finally {
            // Clear feedback message after a delay
             setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    // --- Render Logic ---

    if (loading) return <div style={styles.centeredMessage}>Loading special categories...</div>;
    if (error && specialCategories.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Special Categories</h2>

            {/* Feedback Area */}
            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
            {/* Display General Error if fetch failed but list might have old data */}
            {error && specialCategories.length > 0 && (
                 <p style={styles.errorText}>Warning: Could not refresh list. Error: {error}</p>
            )}

            {/* Add New Button */}
            <Link to="/special-categories/new" style={styles.addButtonLink}>
                <button style={styles.button}>Add New Special Category</button>
            </Link>

            {/* Table or No Data Message */}
            {specialCategories.length === 0 && !loading ? (
                <p>No special categories found.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>Description</th>
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {specialCategories.map((category, index) => (
                            <tr key={category.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{category.id}</td>
                                <td style={styles.tableCell}>{category.name}</td>
                                <td style={styles.tableCell}>{category.description || '-'}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    <button
                                        onClick={() => navigate(`/special-categories/edit/${category.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit Special Category"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category.id, category.name)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete Special Category"
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

// --- Basic Inline Styles ---
const styles = {
    container: { padding: '20px', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorText: { color: '#D8000C', fontWeight: 'bold' },
    feedbackBox: { padding: '10px 15px', marginBottom: '15px', borderRadius: '4px', textAlign: 'center', border: '1px solid' },
    feedbackSuccess: { borderColor: 'green', color: 'green', backgroundColor: '#e6ffed' },
    feedbackError: { borderColor: 'red', color: 'red', backgroundColor: '#ffe6e6' },
    addButtonLink: { textDecoration: 'none', marginBottom: '15px', display: 'inline-block' },
    button: { padding: '8px 12px', margin: '0 5px 5px 0', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', backgroundColor: '#007bff', color:'white' },
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' }, // Yellow
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' }, // Red
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' },
    tableCell: { padding: '10px 8px', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #dee2e6', borderRight: '1px solid #eee' },
    actionsCell: { whiteSpace: 'nowrap' },
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' }
};

export default SpecialCategoryList;
