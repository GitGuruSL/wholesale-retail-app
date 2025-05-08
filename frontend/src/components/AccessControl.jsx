import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// Helper function to group permissions by their specific functional area (sub-group)
const getPermissionGroupName = (permissionName) => {
    const prefix = permissionName.split(':')[0];
    switch (prefix) {
        case 'user': return 'User Management';
        case 'role': return 'Role Management';
        case 'permission': return 'Permission Management';
        case 'store': return 'Store Core';
        case 'product': return 'Product Core';
        case 'category': return 'Product Categories';
        case 'subcategory': return 'Product Sub-Categories';
        case 'brand': return 'Product Brands';
        case 'specialcategory': return 'Product Special Categories';
        case 'product_attribute': return 'Product Attributes';
        case 'tax_type': return 'Tax Types';
        case 'tax': return 'Taxes';
        case 'unit': return 'Product Units';
        case 'manufacturer': return 'Product Manufacturers';
        case 'warranty': return 'Product Warranties';
        case 'barcode_symbology': return 'Product Barcode Symbologies';
        case 'discount_type': return 'Product Discount Types';
        case 'inventory': return 'Inventory Management';
        case 'sale': return 'Sales Management';
        case 'supplier': return 'Supplier Management';
        case 'report': return 'Reporting';
        case 'system': return 'System Settings';
        case 'store_settings': return 'Store Settings';
        default: return `Other Permissions (${prefix})`;
    }
};

// Define top-level categories and map permission sub-groups to them
// IMPORTANT: Adjust this structure to match your application's needs and the groups from getPermissionGroupName
const permissionStructure = {
    "User, Role & Permission Mgmt": ["User Management", "Role Management", "Permission Management"],
    "Store & Product Catalog": ["Store Core", "Product Core", "Product Categories", "Product Sub-Categories", "Product Brands", "Product Special Categories"],
    "Product Configuration": ["Product Attributes", "Tax Types", "Taxes", "Product Units", "Product Manufacturers", "Product Warranties", "Product Barcode Symbologies", "Product Discount Types"],
    "Operations": ["Inventory Management", "Sales Management", "Supplier Management"],
    "System & Reports": ["Reporting", "System Settings", "Store Settings"],
    "Other": [] // Catch-all for any groups not explicitly mapped, or you can map "Other Permissions" here
};

// Helper to add any unmapped groups to "Other"
const getFinalPermissionStructure = (allGroupedPermissionKeys) => {
    const finalStructure = JSON.parse(JSON.stringify(permissionStructure)); // Deep copy
    const allMappedGroups = new Set(Object.values(finalStructure).flat());
    
    allGroupedPermissionKeys.forEach(key => {
        if (!allMappedGroups.has(key)) {
            if (!finalStructure["Other"]) {
                finalStructure["Other"] = [];
            }
            if (!finalStructure["Other"].includes(key)) {
                finalStructure["Other"].push(key);
            }
        }
    });
    // Remove "Other" if it's empty
    if (finalStructure["Other"] && finalStructure["Other"].length === 0) {
        delete finalStructure["Other"];
    }
    return finalStructure;
};


function AccessControl() {
    const { apiInstance } = useAuth();

    const [entityType, setEntityType] = useState('role');
    const [selectedEntityId, setSelectedEntityId] = useState('');

    const [allRoles, setAllRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    
    const [currentEntityPermissions, setCurrentEntityPermissions] = useState(new Set());

    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    const [selectedTopCategory, setSelectedTopCategory] = useState('');
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            setIsFetchingData(true);
            setError(null);
            setSuccessMessage(''); 
            try {
                const [rolesRes, permissionsRes] = await Promise.all([
                    apiInstance.get('/roles'),
                    apiInstance.get('/permissions')
                ]);
                setAllRoles(rolesRes.data || []);
                setAllPermissions(permissionsRes.data || []);
            } catch (err) {
                console.error("Error fetching initial data for Access Control:", err);
                setError(err.response?.data?.message || 'Failed to load necessary data. Please try again.');
            } finally {
                setIsFetchingData(false);
            }
        };
        fetchData();
    }, [apiInstance]);

    useEffect(() => {
        if (!selectedEntityId || !entityType) {
            setCurrentEntityPermissions(new Set());
            setExpandedGroups({});
            setSelectedTopCategory('');
            return;
        }

        const fetchEntityPermissions = async () => {
            setIsLoading(true); 
            setError(null); 
            try {
                if (entityType === 'role') {
                    const response = await apiInstance.get(`/roles/${selectedEntityId}`);
                    setCurrentEntityPermissions(new Set(response.data.permissions || []));
                    // Set default top category if available, otherwise clear
                    const availableTopCategories = Object.keys(getFinalPermissionStructure(Object.keys(groupedPermissions)));
                    setSelectedTopCategory(availableTopCategories.length > 0 ? availableTopCategories[0] : '');
                    setExpandedGroups({}); 
                } 
            } catch (err) {
                console.error(`Error fetching permissions for ${entityType} ID ${selectedEntityId}:`, err);
                setError(err.response?.data?.message || `Failed to load permissions for the selected ${entityType}.`);
                setCurrentEntityPermissions(new Set());
            } finally {
                setIsLoading(false);
            }
        };

        fetchEntityPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEntityId, entityType, apiInstance]); // groupedPermissions is not added here to avoid re-triggering when it recalculates


    const groupedPermissions = useMemo(() => {
        if (!allPermissions.length) return {};
        const groups = allPermissions.reduce((acc, permission) => {
            const groupName = getPermissionGroupName(permission.name);
            if (!acc[groupName]) {
                acc[groupName] = [];
            }
            acc[groupName].push(permission);
            return acc;
        }, {});
        return Object.keys(groups).sort().reduce((obj, key) => {
            obj[key] = groups[key].sort((a, b) => a.display_name.localeCompare(b.display_name));
            return obj;
        }, {});
    }, [allPermissions]);

    const finalPermissionStructure = useMemo(() => getFinalPermissionStructure(Object.keys(groupedPermissions)), [groupedPermissions]);

    const filteredSubGroups = useMemo(() => {
        if (!selectedTopCategory || !finalPermissionStructure[selectedTopCategory]) {
            return {};
        }
        const subGroupNames = finalPermissionStructure[selectedTopCategory];
        const result = {};
        subGroupNames.forEach(groupName => {
            if (groupedPermissions[groupName]) {
                result[groupName] = groupedPermissions[groupName];
            }
        });
        return result;
    }, [selectedTopCategory, groupedPermissions, finalPermissionStructure]);

    const handleEntityTypeChange = (e) => {
        setEntityType(e.target.value);
        setSelectedEntityId(''); 
        setCurrentEntityPermissions(new Set());
        setSelectedTopCategory('');
        setExpandedGroups({});
    };

    const handleEntityChange = (e) => {
        setSelectedEntityId(e.target.value);
    };
    
    const handleTopCategoryChange = (e) => {
        setSelectedTopCategory(e.target.value);
        setExpandedGroups({}); 
    };

    const handlePermissionToggle = (permissionId) => {
        setCurrentEntityPermissions(prev => {
            const newPermissions = new Set(prev);
            if (newPermissions.has(permissionId)) {
                newPermissions.delete(permissionId);
            } else {
                newPermissions.add(permissionId);
            }
            return newPermissions;
        });
    };

    const handleSaveChanges = async () => {
        if (!selectedEntityId || !entityType) {
            setError(`Please select a ${entityType} to update permissions.`);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccessMessage('');

        try {
            const payload = { permissionIds: Array.from(currentEntityPermissions).map(id => Number(id)) };
            if (entityType === 'role') {
                await apiInstance.post(`/roles/${selectedEntityId}/permissions`, payload);
                setSuccessMessage(`Permissions for role updated successfully!`);
            } 
        } catch (err) {
            console.error(`Error saving permissions for ${entityType} ID ${selectedEntityId}:`, err);
            setError(err.response?.data?.message || `Failed to save permissions.`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleGroup = (groupName) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };
    
    const toggleAllSubGroupsInCategory = (expand) => {
        const newExpandedState = { ...expandedGroups };
        Object.keys(filteredSubGroups).forEach(groupName => {
            newExpandedState[groupName] = expand;
        });
        setExpandedGroups(newExpandedState);
    };

    if (isFetchingData) {
        return <p>Loading access control data...</p>;
    }

    return (
        <div className="access-control-container" style={{ padding: '20px' }}>
            <h2>Access Control Management</h2>

            {error && <p style={{ color: 'red', border: '1px solid red', padding: '10px', backgroundColor: '#ffe6e6' }}>{error}</p>}
            {successMessage && <p style={{ color: 'green', border: '1px solid green', padding: '10px', backgroundColor: '#e6ffe6' }}>{successMessage}</p>}

            <div className="entity-selection" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <label htmlFor="entityType">Manage Permissions For: </label>
                <select id="entityType" value={entityType} onChange={handleEntityTypeChange} disabled={isLoading} style={{ marginRight: '10px', padding: '5px' }}>
                    <option value="role">Role</option>
                </select>

                {entityType === 'role' && allRoles.length > 0 && (
                    <>
                        <label htmlFor="roleSelect">Select Role: </label>
                        <select id="roleSelect" value={selectedEntityId} onChange={handleEntityChange} disabled={isLoading || !allRoles.length} style={{ padding: '5px' }}>
                            <option value="">-- Select a Role --</option>
                            {allRoles.map(role => (
                                <option key={role.id} value={role.id}>{role.display_name} ({role.name})</option>
                            ))}
                        </select>
                    </>
                )}
                 {entityType === 'role' && !allRoles.length && !isFetchingData && <p>No roles found.</p>}
            </div>

            {selectedEntityId && (
                <div className="permissions-assignment" style={{ marginTop: '20px' }}>
                    <h3>Assign Permissions for {entityType === 'role' ? allRoles.find(r => r.id === parseInt(selectedEntityId))?.display_name || `Role ID ${selectedEntityId}` : 'Selected User'}:</h3>
                    
                    {Object.keys(finalPermissionStructure).length > 0 && (
                        <div style={{ margin: '20px 0', padding: '15px', border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                            <label htmlFor="topCategorySelect" style={{ marginRight: '10px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Select Permission Category:</label>
                            <select
                                id="topCategorySelect"
                                value={selectedTopCategory}
                                onChange={handleTopCategoryChange}
                                disabled={isLoading}
                                style={{ padding: '8px', minWidth: '300px', width:'100%', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
                            >
                                <option value="">-- Choose a Category --</option>
                                {Object.keys(finalPermissionStructure).map(categoryName => (
                                    <option key={categoryName} value={categoryName}>{categoryName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {isLoading && selectedTopCategory && !Object.keys(filteredSubGroups).length && <p>Loading permissions for selected category...</p>}
                    
                    {selectedTopCategory && Object.keys(filteredSubGroups).length > 0 && (
                        <div style={{ marginBottom: '10px' }}>
                            <button onClick={() => toggleAllSubGroupsInCategory(true)} style={{ marginRight: '5px', padding: '5px 10px' }} disabled={isLoading}>Expand All in Category</button>
                            <button onClick={() => toggleAllSubGroupsInCategory(false)} style={{ padding: '5px 10px' }} disabled={isLoading}>Collapse All in Category</button>
                        </div>
                    )}

                    {selectedTopCategory && Object.keys(filteredSubGroups).map(groupName => (
                        <div key={groupName} className="permission-group-container" style={{ marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                            <button
                                onClick={() => handleToggleGroup(groupName)}
                                style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '10px 15px',
                                    backgroundColor: '#f0f0f0',
                                    border: 'none',
                                    borderBottom: expandedGroups[groupName] ? '1px solid #ccc' : 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '1.1em',
                                    fontWeight: 'bold'
                                }}
                                aria-expanded={!!expandedGroups[groupName]}
                                aria-controls={`permissions-list-${groupName.replace(/\s+/g, '-')}`}
                            >
                                {groupName}
                                <span style={{ fontSize: '0.8em' }}>{expandedGroups[groupName] ? '▲ Collapse' : '▼ Expand'}</span>
                            </button>
                            {expandedGroups[groupName] && (
                                <div 
                                    id={`permissions-list-${groupName.replace(/\s+/g, '-')}`}
                                    className="permission-items-list" 
                                    style={{ padding: '15px' }}
                                >
                                    {filteredSubGroups[groupName].map(permission => (
                                        <div key={permission.id} className="permission-item" style={{ marginBottom: '8px', paddingLeft: '10px' }}>
                                            <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    value={permission.id}
                                                    checked={currentEntityPermissions.has(permission.id)}
                                                    onChange={() => handlePermissionToggle(permission.id)}
                                                    disabled={isLoading}
                                                    style={{ marginRight: '10px', marginTop: '3px', transform: 'scale(1.1)' }}
                                                />
                                                <div>
                                                    <span style={{ fontWeight: '500' }}>{permission.display_name}</span> (<code style={{ fontSize: '0.9em', color: '#555' }}>{permission.name}</code>)
                                                    {permission.description && <small style={{ display: 'block', color: '#666', marginLeft: '2px', marginTop: '2px' }}>{permission.description}</small>}
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    
                    {Object.keys(groupedPermissions).length > 0 && ( // Show save button if there are any permissions to manage
                        <button onClick={handleSaveChanges} disabled={isLoading || !selectedEntityId} style={{ marginTop: '20px', padding: '10px 20px', fontSize: '1.1em' }}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                </div>
            )}
            {!selectedEntityId && entityType && <p style={{marginTop: '20px'}}>Please select a {entityType} to manage its permissions.</p>}
        </div>
    );
}

export default AccessControl;