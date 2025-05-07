import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Re-using styles from UnitList for consistency, or define new ones
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

function CategoryList() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();

    const fetchCategories = useCallback(async () => {
        if (!isAuthenticated || !apiInstance) {
            setError("User not authenticated or API client not available.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        setFeedback({ message: null, type: null });
        try {
            const response = await apiInstance.get('/categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error("Error fetching categories:", err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch categories.';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [apiInstance, isAuthenticated]);

    useEffect(() => {
        if (!authLoading && isAuthenticated && apiInstance) {
            fetchCategories();
        } else if (!authLoading && !isAuthenticated) {
            setError("Please log in to view categories.");
            setLoading(false);
        } else if (!authLoading && !apiInstance) {
            setError("API client not available. Cannot fetch categories.");
            setLoading(false);
        }
    }, [authLoading, isAuthenticated, apiInstance, fetchCategories]);

    const handleDelete = async (categoryId, categoryName) => {
        if (!apiInstance) {
            setFeedback({ message: "API client not available.", type: 'error' });
            return;
        }
        if (!window.confirm(`Are you sure you want to delete category: "${categoryName}" (ID: ${categoryId})?\nThis might fail if it's linked to products.`)) {
            return;
        }
        setError(null);
        try {
            await apiInstance.delete(`/categories/${categoryId}`);
            setFeedback({ message: `Category "${categoryName}" deleted successfully.`, type: 'success' });
            setCategories(prevCategories => prevCategories.filter(category => category.id !== categoryId));
        } catch (err) {
            console.error(`Error deleting category ${categoryId}:`, err);
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete category.';
            setFeedback({ message: errorMsg, type: 'error' });
        } finally {
            setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (authLoading) return <div style={styles.centeredMessage}>Authenticating...</div>;
    if (loading) return <div style={styles.centeredMessage}>Loading categories...</div>;
    if (error && categories.length === 0) return <div style={{ ...styles.centeredMessage, ...styles.errorText }}>Error: {error}</div>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>Manage Categories</h2>

            {feedback.message && (
                <div style={{
                   ...styles.feedbackBox,
                   ...(feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError)
                }}>
                    {feedback.message}
                </div>
            )}
             {error && categories.length > 0 && !feedback.message && (
                 <p style={{...styles.errorText, textAlign: 'center', marginBottom: '10px'}}>
                    Warning: An operation failed. Error: {error}
                 </p>
            )}

            <Link to="/dashboard/categories/new" style={styles.addButtonLink}>
                <button style={{...styles.button, ...styles.buttonAdd}}>Add New Category</button>
            </Link>

            {categories.length === 0 && !loading && !error ? (
                <p style={styles.centeredMessage}>No categories found. Click "Add New Category" to create one.</p>
            ) : (
                <table style={styles.table}>
                    <thead style={styles.tableHeader}>
                        <tr>
                            <th style={styles.tableCell}>ID</th>
                            <th style={styles.tableCell}>Name</th>
                            {/* Add other columns like 'Description' if your backend provides it */}
                            <th style={styles.tableCell}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((category, index) => (
                            <tr key={category.id} style={index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd}>
                                <td style={styles.tableCell}>{category.id}</td>
                                <td style={styles.tableCell}>{category.name}</td>
                                <td style={{...styles.tableCell, ...styles.actionsCell}}>
                                    <button
                                        onClick={() => navigate(`/dashboard/categories/edit/${category.id}`)}
                                        style={{...styles.button, ...styles.buttonEdit}}
                                        title="Edit Category"
                                    >
                                        Edit
                                    </button>
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

export default CategoryList;