import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import listStyles from '../styles/ListStyles';

function PermissionList() {
    const [permissions, setPermissions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
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
                setLoading(true);
                await apiInstance.delete(`/permissions/${permissionId}`);
                setSuccessMessage(`Permission "${permissionName}" deleted successfully.`);
                fetchPermissionsAndCategories();
            } catch (err) {
                console.error('Error deleting permission:', err);
                setError(err.response?.data?.message || 'Failed to delete permission.');
                setLoading(false);
            }
        }
    };

    const handleCategoryChange = (e) => {
        setSelectedCategoryId(e.target.value);
    };

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value.toLowerCase());
    };

    const filteredPermissions = permissions.filter(permission => {
            if (selectedCategoryId && permission.permission_category_id !== parseInt(selectedCategoryId)) {
                return false;
            }
            if (searchTerm) {
                return (
                    permission.name.toLowerCase().includes(searchTerm) ||
                    permission.display_name.toLowerCase().includes(searchTerm)
                );
            }
            return true;
        })
        .sort((a, b) => {
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

    if (loading && permissions.length === 0 && categories.length === 0) {
        return <div style={listStyles.container}><p style={listStyles.centeredMessage}>Loading permissions and categories...</p></div>;
    }
    if (error) {
        return <div style={listStyles.container}><p style={{ ...listStyles.errorBox }}>{error}</p></div>;
    }

    return (
        <div style={listStyles.container}>
            <div style={listStyles.titleContainer}>
                <h2 style={listStyles.title}>Manage Permissions</h2>
                {typeof userCan === 'function' && userCan('permission:create') && (
                    <Link to="/dashboard/permissions/new" style={listStyles.addButton}>
                        <FaPlus /> Create New Permission
                    </Link>
                )}
            </div>

            {successMessage && <div style={{ ...listStyles.errorBox, backgroundColor: '#d4edda', color: '#155724' }}>{successMessage}</div>}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: '1' }}>
                    <label style={listStyles.label} htmlFor="categoryFilter">Filter by Category:</label>
                    <select
                        id="categoryFilter"
                        style={listStyles.select}
                        value={selectedCategoryId}
                        onChange={handleCategoryChange}
                    >
                        <option value="">All Categories</option>
                        {categories.sort((a, b) => a.display_order - b.display_order).map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: '1' }}>
                    <label style={listStyles.label} htmlFor="searchFilter">Search Permissions:</label>
                    <input
                        type="text"
                        id="searchFilter"
                        style={listStyles.input || { padding: '10px', width: '100%' }}
                        placeholder="Search by name, display name..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
            </div>
            
            {loading && permissions.length > 0 && <p style={listStyles.centeredMessage}>Updating list...</p>}

            {Object.keys(groupedPermissions).length === 0 && !loading && (
                <div style={{ ...listStyles.errorBox, backgroundColor: '#cce5ff', color: '#004085' }}>No permissions found matching your criteria.</div>
            )}

            {Object.entries(groupedPermissions).map(([categoryName, subGroups]) => (
                <div key={categoryName} style={{ marginBottom: '1.5rem' }}>
                    {(!selectedCategoryId || Object.keys(groupedPermissions).length > 1) && (
                        <h3 style={{ ...listStyles.title, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>{categoryName}</h3>
                    )}
                    {Object.entries(subGroups).map(([subGroupName, perms]) => (
                        <div key={subGroupName} style={{ marginBottom: '1rem' }}>
                            <h4 style={{ color: '#6c757d', marginBottom: '0.5rem' }}>{subGroupName}</h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {perms.map(permission => (
                                    <li key={permission.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                                        <div>
                                            <input 
                                                type="checkbox" 
                                                disabled 
                                                style={{ marginRight: '0.5rem' }} 
                                            />
                                            <span style={{ fontWeight: 'bold' }}>{permission.display_name}</span>
                                            <small style={{ display: 'block', color: '#6c757d' }}>Code: {permission.name}</small>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            {typeof userCan === 'function' && userCan('permission:update') && (
                                                <Link 
                                                    to={`/dashboard/permissions/edit/${permission.id}`} 
                                                    style={{ ...listStyles.actionButton, ...listStyles.editButton }}
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </Link>
                                            )}
                                            {typeof userCan === 'function' && userCan('permission:delete') && (
                                                <button
                                                    onClick={() => handleDelete(permission.id, permission.display_name)}
                                                    style={{ ...listStyles.actionButton, ...listStyles.deleteButton }}
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