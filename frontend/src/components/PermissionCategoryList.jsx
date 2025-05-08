import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import listStyles from '../styles/ListStyles'; // Import the styles

function PermissionCategoryList() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const { apiInstance, userCan } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiInstance.get('/permission-categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error('Error fetching permission categories:', err);
            setError(err.response?.data?.message || 'Failed to load permission categories.');
        } finally {
            setLoading(false);
        }
    }, [apiInstance]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [location.state, navigate, location.pathname]);

    const handleDelete = async (categoryId, categoryName) => {
        if (window.confirm(`Are you sure you want to delete the category "${categoryName}"? This action cannot be undone.`)) {
            try {
                setLoading(true);
                await apiInstance.delete(`/permission-categories/${categoryId}`);
                setSuccessMessage(`Category "${categoryName}" deleted successfully.`);
                fetchCategories(); // Refetch
            } catch (err) {
                console.error('Error deleting category:', err);
                setError(err.response?.data?.message || 'Failed to delete category.');
                setLoading(false);
            }
        }
    };

    if (loading && categories.length === 0) {
        return <div style={listStyles.container}><p style={listStyles.centeredMessage}>Loading permission categories...</p></div>;
    }
    // Error display will now use the errorBox style
    // Success message display will use a similar style (assuming successBox is in ListStyles or adapt errorBox)

    return (
        <div style={listStyles.container}>
            <div style={listStyles.titleContainer}>
                <h2 style={listStyles.title}>Manage Permission Categories</h2>
                {typeof userCan === 'function' && userCan('system:manage_permission_categories') && (
                    <Link to="/dashboard/permission-categories/new" style={listStyles.addButton}>
                        <FaPlus style={{ marginRight: '5px' }} /> Create New Category
                    </Link>
                )}
            </div>

            {successMessage && (
                <div style={{ ...listStyles.errorBox, backgroundColor: '#d4edda', borderColor: '#c3e6cb', color: '#155724' }}> 
                    {successMessage}
                </div>
            )}
            {error && !successMessage && <div style={listStyles.errorBox}>{error}</div>}


            {categories.length === 0 && !loading && (
                <div style={{ ...listStyles.centeredMessage, backgroundColor: '#e2e3e5', padding: '10px', borderRadius: '4px' }}>
                    No permission categories found.
                </div>
            )}

            {categories.length > 0 && (
                <table style={listStyles.table}>
                    <thead>
                        <tr>
                            <th style={listStyles.th}>ID</th>
                            <th style={listStyles.th}>Name</th>
                            <th style={listStyles.th}>Display Order</th>
                            <th style={listStyles.th}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(category => (
                            <tr key={category.id}>
                                <td style={listStyles.td}>{category.id}</td>
                                <td style={listStyles.td}>{category.name}</td>
                                <td style={listStyles.td}>{category.display_order}</td>
                                <td style={listStyles.td}>
                                    {typeof userCan === 'function' && userCan('system:manage_permission_categories') && (
                                        <>
                                            <Link 
                                                to={`/dashboard/permission-categories/edit/${category.id}`} 
                                                style={{ ...listStyles.actionButton, ...listStyles.editButton }}
                                                title="Edit"
                                            >
                                                <FaEdit />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(category.id, category.name)}
                                                style={{ ...listStyles.actionButton, ...listStyles.deleteButton }}
                                                title="Delete"
                                                disabled={loading}
                                            >
                                                <FaTrashAlt />
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}

export default PermissionCategoryList;