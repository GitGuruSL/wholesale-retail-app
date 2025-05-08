import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // To get apiInstance
// import './PermissionList.css'; // Optional: Create and import a CSS file for specific styles

// Helper function to get a display-friendly group name (remains the same)
const getGroupName = (permissionName) => {
    const prefix = permissionName.split(':')[0];
    switch (prefix) {
        case 'user': return 'User Management';
        case 'role': return 'Role Management';
        case 'permission': return 'Permission System';
        case 'store': return 'Store Management';
        case 'product': return 'Product Core';
        case 'category': return 'Categories';
        case 'subcategory': return 'Sub-Categories';
        case 'brand': return 'Brands';
        case 'specialcategory': return 'Special Categories';
        case 'product_attribute': return 'Product Attributes (General)';
        case 'tax_type': return 'Tax Types';
        case 'tax': return 'Taxes';
        case 'product_settings': return 'Product Settings (General)';
        case 'unit': return 'Units';
        case 'manufacturer': return 'Manufacturers';
        case 'warranty': return 'Warranties';
        case 'barcode_symbology': return 'Barcode Symbologies';
        case 'discount_type': return 'Discount Types';
        case 'inventory': return 'Inventory Management';
        case 'sale': return 'Sales Management';
        case 'supplier': return 'Supplier Management';
        case 'report': return 'Reports';
        case 'system': return 'System Settings';
        case 'store_settings': return 'Store Settings';
        default: return 'Other';
    }
};

function PermissionList() {
    const [allPermissions, setAllPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeGroup, setActiveGroup] = useState('');
    const { apiInstance } = useAuth();
    const location = useLocation();

    useEffect(() => {
        const fetchPermissions = async () => {
            setLoading(true);
            try {
                const response = await apiInstance.get('/permissions');
                setAllPermissions(response.data || []);
                setError(null);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to fetch permissions.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPermissions();
    }, [apiInstance]);

    const groupedPermissions = useMemo(() => {
        if (!allPermissions.length) return {};
        const groups = allPermissions.reduce((acc, permission) => {
            const groupName = getGroupName(permission.name);
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(permission);
            return acc;
        }, {});
        return Object.keys(groups).sort().reduce((obj, key) => {
            obj[key] = groups[key];
            return obj;
        }, {});
    }, [allPermissions]);

    useEffect(() => {
        const groupKeys = Object.keys(groupedPermissions);
        if (activeGroup === '' && groupKeys.length > 0) {
            setActiveGroup(groupKeys[0]);
        } else if (activeGroup && !groupKeys.includes(activeGroup) && groupKeys.length > 0) {
            setActiveGroup(groupKeys[0]);
        } else if (groupKeys.length === 0) {
            setActiveGroup('');
        }
    }, [groupedPermissions, activeGroup]);

    const handleDelete = async (permissionId) => {
        if (window.confirm('Are you sure you want to delete this permission? This might affect roles using it.')) {
            try {
                await apiInstance.delete(`/permissions/${permissionId}`);
                setAllPermissions(prevPermissions => prevPermissions.filter(p => p.id !== permissionId));
            } catch (err) {
                alert(err.response?.data?.message || 'Failed to delete permission.');
                console.error(err);
            }
        }
    };

    if (loading) return <div className="loading-message">Loading permissions...</div>;
    if (error) return <div className="error-message">Error: {error}</div>;

    const permissionGroups = Object.keys(groupedPermissions);

    return (
        <div className="permission-list-container page-container"> {/* Added class for overall container */}
            <div className="page-header">
                <h1>Manage Permissions</h1>
                <Link to="/dashboard/permissions/new" className="btn btn-primary"> {/* Standard button class */}
                    Add New Permission
                </Link>
            </div>

            {location.state?.message && <div className="success-message">{location.state.message}</div>}

            {permissionGroups.length === 0 && !loading ? (
                <p className="empty-state-message">No permissions defined yet.</p>
            ) : (
                <div className="content-card"> {/* Card-like container for controls and table */}
                    <div className="form-group filter-controls"> {/* Class for filter section */}
                        <label htmlFor="permission-group-select" className="form-label">Select Category:</label>
                        <select
                            id="permission-group-select"
                            value={activeGroup}
                            onChange={(e) => setActiveGroup(e.target.value)}
                            className="form-control form-select" // Standard form control classes
                        >
                            {permissionGroups.map(groupName => (
                                <option key={groupName} value={groupName}>
                                    {groupName} ({groupedPermissions[groupName]?.length || 0})
                                </option>
                            ))}
                        </select>
                    </div>

                    {activeGroup && groupedPermissions[activeGroup] && groupedPermissions[activeGroup].length > 0 ? (
                        <div className="table-responsive"> {/* Wrapper for responsive table */}
                            <table className="table table-striped table-hover"> {/* Standard table classes */}
                                <thead>
                                    <tr>
                                        <th>Name (Code)</th>
                                        <th>Display Name</th>
                                        <th>Description</th>
                                        <th className="text-center">Actions</th> {/* Centering actions header */}
                                    </tr>
                                </thead>
                                <tbody>
                                    {groupedPermissions[activeGroup].map(permission => (
                                        <tr key={permission.id}>
                                            <td>{permission.name}</td>
                                            <td>{permission.display_name}</td>
                                            <td>{permission.description || '-'}</td> {/* Show dash if no description */}
                                            <td className="actions-cell text-center"> {/* Class for actions cell */}
                                                <Link to={`/dashboard/permissions/edit/${permission.id}`} className="btn btn-sm btn-outline-secondary">Edit</Link>
                                                <button onClick={() => handleDelete(permission.id)} className="btn btn-sm btn-outline-danger ms-2">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        activeGroup && <p className="info-message">No permissions in the selected category: {activeGroup}.</p>
                    )}
                </div>
            )}
        </div>
    );
}

export default PermissionList;