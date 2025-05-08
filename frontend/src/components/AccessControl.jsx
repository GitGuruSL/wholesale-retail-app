import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import listStyles from '../styles/ListStyles';

function PermissionList() {
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState('');
    const [rolePermissions, setRolePermissions] = useState([]); // full permission objects assigned to the role
    const [allPermissions, setAllPermissions] = useState([]);   // full list from /permissions/list-all
    const [categories, setCategories] = useState([]);            // permission categories
    const [selectedCategory, setSelectedCategory] = useState('');  // selected category id (as string)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { apiInstance, userCan } = useAuth();

    // Fetch all permissions (full list) once at mount.
    useEffect(() => {
        async function fetchAllPermissions() {
            try {
                const res = await apiInstance.get('/permissions/list-all');
                setAllPermissions(res.data || []);
            } catch (err) {
                console.error("Error fetching all permissions:", err);
            }
        }
        fetchAllPermissions();
    }, [apiInstance]);

    // Fetch permission categories
    useEffect(() => {
        async function fetchCategories() {
            try {
                const res = await apiInstance.get('/permissions/categories');
                setCategories(res.data || []);
            } catch (err) {
                console.error("Error fetching permission categories:", err);
            }
        }
        fetchCategories();
    }, [apiInstance]);

    // Fetch roles for the dropdown
    useEffect(() => {
        async function fetchRoles() {
            try {
                const res = await apiInstance.get('/roles');
                const rolesData = res.data || [];
                setRoles(rolesData);
                if (rolesData.length > 0) {
                    setSelectedRole(rolesData[0].id); // set default role to first
                }
            } catch (err) {
                console.error("Error fetching roles:", err);
            }
        }
        fetchRoles();
    }, [apiInstance]);

    // Fetch role details (including assigned permissions) when selectedRole or allPermissions changes
    useEffect(() => {
        async function fetchRolePermissions() {
            if (!selectedRole) {
                setRolePermissions([]);
                return;
            }
            setLoading(true);
            setError(null);
            try {
                // GET /roles/:id should return a role object with a "permissions" array.
                const res = await apiInstance.get(`/roles/${selectedRole}`);
                const rp = res.data.permissions || [];
                let perms = [];
                if (rp.length > 0 && typeof rp[0] === "object") {
                    perms = rp;
                } else {
                    perms = allPermissions.filter(p => rp.includes(p.id));
                }
                setRolePermissions(perms);
            } catch (err) {
                console.error("Error fetching role permissions:", err);
                setError(err.response?.data?.message || 'Failed to load role permissions.');
                setRolePermissions([]);
            } finally {
                setLoading(false);
            }
        }
        fetchRolePermissions();
    }, [selectedRole, apiInstance, allPermissions]);

    const handleRoleChange = (e) => {
        setSelectedRole(e.target.value);
    };

    const handleCategoryChange = (e) => {
        setSelectedCategory(e.target.value);
    };

    const handleDelete = async (permissionId, permissionName) => {
        if (window.confirm(`Are you sure you want to delete the permission "${permissionName}"? This action cannot be undone.`)) {
            try {
                setLoading(true);
                await apiInstance.delete(`/permissions/${permissionId}`);
                // Re-fetch role data to update permissions after deletion.
                const res = await apiInstance.get(`/roles/${selectedRole}`);
                const rp = res.data.permissions || [];
                let perms = [];
                if (rp.length > 0 && typeof rp[0] === "object") {
                    perms = rp;
                } else {
                    perms = allPermissions.filter(p => rp.includes(p.id));
                }
                setRolePermissions(perms);
            } catch (err) {
                console.error("Error deleting permission:", err);
                setError(err.response?.data?.message || 'Failed to delete permission.');
            } finally {
                setLoading(false);
            }
        }
    };

    // First filter by selectedCategory (if any); if not selected, keep all:
    const filteredPermissions = rolePermissions.filter(permission => {
        if (!selectedCategory) return true;
        return permission.permission_category_id === parseInt(selectedCategory, 10);
    });

    // Group the filtered permissions by category name.
    const groupedPermissions = filteredPermissions.reduce((groups, permission) => {
        const categoryObj = categories.find(cat => cat.id === permission.permission_category_id);
        const categoryName = categoryObj ? categoryObj.name : "Uncategorized";
        if (!groups[categoryName]) {
            groups[categoryName] = [];
        }
        groups[categoryName].push(permission);
        return groups;
    }, {});

    return (
        <div style={listStyles.container}>
            <div style={listStyles.titleContainer}>
                <h2 style={listStyles.title}>Role Wise Permissions</h2>
                {typeof userCan === 'function' && userCan('permission:create') && (
                    <Link to="/dashboard/permissions/new" style={listStyles.addButton}>
                        <FaPlus /> Create New Permission
                    </Link>
                )}
            </div>

            {/* Dropdowns for role and permission category */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: '1' }}>
                    <label style={listStyles.label} htmlFor="roleFilter">Select Role:</label>
                    <select
                        id="roleFilter"
                        style={listStyles.select}
                        value={selectedRole}
                        onChange={handleRoleChange}
                    >
                        {roles.map(role => (
                            <option key={role.id} value={role.id}>{role.name}</option>
                        ))}
                    </select>
                </div>
                <div style={{ flex: '1' }}>
                    <label style={listStyles.label} htmlFor="categoryFilter">Select Permission Category:</label>
                    <select
                        id="categoryFilter"
                        style={listStyles.select}
                        value={selectedCategory}
                        onChange={handleCategoryChange}
                    >
                        <option value="">All Categories</option>
                        {categories
                            .sort((a, b) => a.display_order - b.display_order)
                            .map(category => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading && <p style={listStyles.centeredMessage}>Loading permissions...</p>}
            {error && <p style={{ ...listStyles.errorBox, color: 'red' }}>{error}</p>}
            {(!loading && filteredPermissions.length === 0) && (
                <p style={listStyles.centeredMessage}>No permissions assigned to this role in the selected category.</p>
            )}

            {/* Render grouped permission lists */}
            {Object.entries(groupedPermissions).map(([group, permissions]) => (
                <div key={group} style={{ marginBottom: '1.5rem' }}>
                    <h3 style={{ ...listStyles.title, borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                        {group}
                    </h3>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {permissions.map(permission => (
                            <li key={permission.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #eee' }}>
                                <div>
                                    <input 
                                        type="checkbox" 
                                        disabled 
                                        style={{ marginRight: '0.5rem' }} 
                                        checked
                                    />
                                    <span style={{ fontWeight: 'bold' }}>
                                        {permission.display_name || permission.name}
                                    </span>
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
                                            onClick={() => handleDelete(permission.id, permission.display_name || permission.name)}
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
    );
}

export default PermissionList;