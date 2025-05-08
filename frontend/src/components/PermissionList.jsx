import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

function PermissionList() {
    const [permissions, setPermissions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(''); // '' for all or unselected
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { apiInstance, userCan } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [successMessage, setSuccessMessage] = useState(location.state?.message || '');

    const fetchPermissionsAndCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [permissionsResponse, categoriesResponse] = await Promise.all([
                apiInstance.get('/permissions/list-all'),
                apiInstance.get('/permissions/categories')
            ]);
            setPermissions(permissionsResponse.data || []);
            setCategories(categoriesResponse.data || []);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError(err.response?.data?.message || 'Failed to load permissions or categories.');
        } finally {
            setLoading(false);
        }
    }, [apiInstance]);

    useEffect(() => {
        fetchPermissionsAndCategories();
    }, [fetchPermissionsAndCategories]);

    useEffect(() => {
        if (location.state?.message) {
            setSuccessMessage(location.state.message);
            navigate(location.pathname, { replace: true, state: {} });
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [location.state, navigate, location.pathname]);

    const handleDelete = async (permissionId, permissionName) => {
        if (window.confirm(`Are you sure you want to delete the permission "${permissionName}"? This action cannot be undone.`)) {
            try {
                setLoading(true); // Indicate loading state for delete operation
                await apiInstance.delete(`/permissions/${permissionId}`);
                setSuccessMessage(`Permission "${permissionName}" deleted successfully.`);
                // Refetch permissions to update the list, which will also set loading to false in its finally block
                fetchPermissionsAndCategories();
            } catch (err) {
                console.error('Error deleting permission:', err);
                setError(err.response?.data?.message || 'Failed to delete permission.');
                setLoading(false); // Ensure loading is false on error if fetch doesn't run or also errors
            }
        }
    };

    const handleCategoryChange = (e) => {
        setSelectedCategoryId(e.target.value);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value.toLowerCase());
    };

    const filteredPermissions = permissions
        .filter(permission => {
            // Category filter
            if (selectedCategoryId && permission.permission_category_id !== parseInt(selectedCategoryId)) {
                return false;
            }
            // Search term filter (searches name, display_name)
            // Description search can be added back if desired: (permission.description && permission.description.toLowerCase().includes(searchTerm))
            if (searchTerm) {
                return (
                    permission.name.toLowerCase().includes(searchTerm) ||
                    permission.display_name.toLowerCase().includes(searchTerm)
                );
            }
            return true;
        })
        .sort((a, b) => { // Sort by category display_order, then by sub_group_display_name, then by display_name
            const categoryA = categories.find(c => c.id === a.permission_category_id);
            const categoryB = categories.find(c => c.id === b.permission_category_id);

            const displayOrderA = categoryA ? categoryA.display_order : Infinity;
            const displayOrderB = categoryB ? categoryB.display_order : Infinity;

            if (displayOrderA !== displayOrderB) {
                return displayOrderA - displayOrderB;
            }
            if (a.sub_group_display_name < b.sub_group_display_name) return -1;
            if (a.sub_group_display_name > b.sub_group_display_name) return 1;
            if (a.display_name < b.display_name) return -1;
            if (a.display_name > b.display_name) return 1;
            return 0;
        });

    // Group permissions by category and then by sub-group for display
    const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
        const category = categories.find(c => c.id === permission.permission_category_id);
        const categoryName = category ? category.name : 'Uncategorized';
        const subGroupName = permission.sub_group_display_name || 'General';

        if (!acc[categoryName]) {
            acc[categoryName] = {};
        }
        if (!acc[categoryName][subGroupName]) {
            acc[categoryName][subGroupName] = [];
        }
        acc[categoryName][subGroupName].push(permission);
        return acc;
    }, {});


    if (loading && permissions.length === 0 && categories.length === 0) { // Initial full load
        return <div className="page-container"><p>Loading permissions and categories...</p></div>;
    }
    if (error) {
        return <div className="page-container alert alert-danger">Error: {error}</div>;
    }

    return (
        <div className="page-container">
            <div className="page-header d-flex justify-content-between align-items-center">
                <h2>Manage Permissions</h2>
                {typeof userCan === 'function' && userCan('permission:create') && (
                    <Link to="/dashboard/permissions/new" className="btn btn-primary">
                        <FaPlus /> Create New Permission
                    </Link>
                )}
            </div>

            {successMessage && <div className="alert alert-success mt-3">{successMessage}</div>}

            <div className="row mb-3 mt-3">
                <div className="col-md-6">
                    <label htmlFor="categoryFilter" className="form-label">Filter by Category:</label>
                    <select
                        id="categoryFilter"
                        className="form-select"
                        value={selectedCategoryId}
                        onChange={handleCategoryChange}
                    >
                        <option value="">All Categories</option>
                        {categories.sort((a,b) => a.display_order - b.display_order).map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="col-md-6">
                    <label htmlFor="searchFilter" className="form-label">Search Permissions:</label>
                    <input
                        type="text"
                        id="searchFilter"
                        className="form-control"
                        placeholder="Search by name, display name..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>
            
            {loading && permissions.length > 0 && <p className="text-center my-3">Updating list...</p>}

            {Object.keys(groupedPermissions).length === 0 && !loading && (
                <div className="alert alert-info mt-3">No permissions found matching your criteria.</div>
            )}

            {Object.entries(groupedPermissions).map(([categoryName, subGroups]) => (
                <div key={categoryName} className="mb-4 permission-category-group">
                    {(!selectedCategoryId || Object.keys(groupedPermissions).length > 1) && (
                        <h3 className="category-title h4 border-bottom pb-2 mb-3">{categoryName}</h3>
                    )}
                    {Object.entries(subGroups).map(([subGroupName, perms]) => (
                         <div key={subGroupName} className="mb-3 permission-sub-group">
                            <h4 className="sub-group-title h5 text-muted">{subGroupName}</h4>
                            <ul className="list-group">
                                {perms.map(permission => (
                                    <li key={permission.id} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div className="form-check">
                                            <input 
                                                className="form-check-input" 
                                                type="checkbox" 
                                                id={`perm-checkbox-${permission.id}`} 
                                                disabled 
                                                style={{ marginTop: '0.2rem' }}
                                            />
                                            <label className="form-check-label" htmlFor={`perm-checkbox-${permission.id}`}>
                                                {permission.display_name}
                                                <small className="d-block text-muted">Code: {permission.name}</small>
                                            </label>
                                        </div>
                                        <div className="permission-actions ms-2">
                                            {typeof userCan === 'function' && userCan('permission:update') && (
                                                <Link 
                                                    to={`/dashboard/permissions/edit/${permission.id}`} 
                                                    className="btn btn-sm btn-outline-secondary me-1"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </Link>
                                            )}
                                            {typeof userCan === 'function' && userCan('permission:delete') && (
                                                <button
                                                    onClick={() => handleDelete(permission.id, permission.display_name)}
                                                    className="btn btn-sm btn-outline-danger"
                                                    title="Delete"
                                                    disabled={loading}
                                                >
                                                    <FaTrashAlt />
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export default PermissionList;