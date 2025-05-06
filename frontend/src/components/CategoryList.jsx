// frontend/src/components/CategoryList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

// Configuration
const API_BASE_URL = 'http://localhost:5001/api'; // Use environment variables for production

// Component to display and manage categories
function CategoryList() {
    // State variables
    const [categories, setCategories] = useState([]); // Holds the list of categories
    const [loading, setLoading] = useState(true); // Tracks loading state
    const [error, setError] = useState(null); // Stores any error message during fetch/delete
    const [feedback, setFeedback] = useState({ message: null, type: null }); // For user feedback after actions (delete)

    const navigate = useNavigate(); // Hook for programmatic navigation

    // Function to fetch categories from the API
    const fetchCategories = useCallback(async () => {
        setLoading(true); // Start loading indicator
        setError(null); // Clear previous errors
        setFeedback({ message: null, type: null }); // Clear previous feedback
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
            const response = await axios.get(`${API_BASE_URL}/categories`, config); // Added config
            setCategories(response.data); // Update state with fetched data
        } catch (err) {
            console.error("Error fetching categories:", err);
            const errorMsg = err.response?.data?.message || 'Failed to fetch categories. Please check the API connection.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch categories. Please log in again.');
            } else {
                setError(errorMsg); // Set error message state
            }
        } finally {
            setLoading(false); // Stop loading indicator regardless of success/failure
        }
    }, [navigate]); // Added navigate to dependency array

    // useEffect hook to call fetchCategories when the component mounts
    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]); // Dependency array includes fetchCategories

    // Function to handle category deletion
    const handleDelete = async (categoryId, categoryName) => {
        // Show confirmation dialog to the user
        if (!window.confirm(`Are you sure you want to delete category: "${categoryName}" (ID: ${categoryId})?\nThis might fail if it's linked to products or sub-categories.`)) {
            return; // Abort if user cancels
        }

        setError(null); // Clear previous general errors before attempting delete
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setFeedback({ message: 'Authentication token not found. Please log in.', type: 'error' });
                return;
            }
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            // Send DELETE request to the backend API
            await axios.delete(`${API_BASE_URL}/categories/${categoryId}`, config); // Added config
            setFeedback({ message: `Category "${categoryName}" deleted successfully.`, type: 'success' }); // Set success feedback
            // Update the local state to remove the deleted category immediately from the UI
            setCategories(prevCategories => prevCategories.filter(cat => cat.id !== categoryId));
        } catch (err) {
            console.error(`Error deleting category ${categoryId}:`, err);
            // Extract error message from backend response or provide a default
            const errorMsg = err.response?.data?.message || 'Failed to delete category. It might be in use.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setFeedback({ message: 'Unauthorized: Could not delete category. Please log in again.', type: 'error' });
            } else {
                setFeedback({ message: errorMsg, type: 'error' }); // Set error feedback
            }
            // setError(errorMsg); // Optionally set the general error state as well
        } finally {
            // Clear the feedback message after 5 seconds
             setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    // --- Render Logic ---

    // Display loading message
    if (loading) return <div style={styles.centeredMessage}>Loading categories...</div>;

    // Display error message if loading failed and no categories are loaded
    if (error && categories.length === 0) {
        return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;
    }

    // Render the main component UI
    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Categories</h2>

            {/* Feedback Area for delete success/error */}
            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}

            {/* Display general error if an operation failed but list might have old data */}
            {error && categories.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {error}
                 </p>
            )}

            {/* Button to navigate to the 'Add New Category' form */}
            <Link to="/categories/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Category</button>
            </Link>

            {/* Display table or 'No categories' message */}
            {categories.length === 0 && !loading && !error ? (
                <p>No categories found.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            <th style={styles.tableCell}>Description</th>
                            {/* <th style={styles.tableCell}>Parent ID</th> */} {/* Uncomment if showing parent category */}
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category, index) => (
                            // Alternate row background colors for readability
                            <tr key={category.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{category.id}</td>
                                <td style={styles.tableCell}>{category.name}</td>
                                <td style={styles.tableCell}>{category.description || '-'}</td> {/* Show dash if description is null/empty */}
                                {/* <td style={styles.tableCell}>{category.parent_category_id || '-'}</td> */} {/* Uncomment if showing parent category */}
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    {/* Edit Button */}
                                    <button
                                        onClick={() => navigate(`/categories/edit/${category.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit Category"
                                    >
                                        Edit
                                    </button>
                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(category.id, category.name)}
                                        style={{...styles.button, ...styles.buttonDelete}}
                                        title="Delete Category"
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
// Consider moving to a separate CSS file or using a UI library for larger applications
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
    buttonEdit: { backgroundColor: '#ffc107', color: '#000' }, // Yellow
    buttonDelete: { backgroundColor: '#dc3545', color: 'white' }, // Red
    table: { width: '100%', borderCollapse: 'collapse', marginTop: '0px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
    tableHeader: { backgroundColor: '#e9ecef' }, // Lighter grey header
    tableCell: { padding: '12px 10px', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #dee2e6' },
    actionsCell: { whiteSpace: 'nowrap' }, // Prevent action buttons from wrapping
    tableRowOdd: { backgroundColor: '#fff' },
    tableRowEven: { backgroundColor: '#f8f9fa' } // Slight grey for even rows
};

export default CategoryList;