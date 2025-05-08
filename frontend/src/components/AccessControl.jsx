import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const getPermissionGroupName = (permissionName) => {
  if (!permissionName || typeof permissionName !== 'string') return 'Other';
  const parts = permissionName.split(':');
  const prefix = parts.length > 1 ? parts[0] : permissionName;
  switch (prefix) {
    case 'user': return 'User Management';
    case 'role': return 'Role Management';
    case 'permission': return 'Permission Management';
    case 'store': return 'Store & Product Catalog';
    case 'product': return 'Store & Product Catalog';
    case 'category': return 'Store & Product Catalog';
    case 'subcategory': return 'Store & Product Catalog';
    case 'brand': return 'Store & Product Catalog';
    case 'specialcategory': return 'Store & Product Catalog';
    case 'product_attribute': return 'Product Configuration';
    case 'tax_type': return 'Product Configuration';
    case 'tax': return 'Product Configuration';
    case 'unit': return 'Product Configuration';
    case 'manufacturer': return 'Product Configuration';
    case 'warranty': return 'Product Configuration';
    case 'barcode_symbology': return 'Product Configuration';
    case 'discount_type': return 'Product Configuration';
    case 'inventory': return 'Operations';
    case 'sale': return 'Operations';
    case 'supplier': return 'Operations';
    case 'report': return 'System & Reports';
    case 'system': return 'System & Reports';
    case 'store_settings': return 'System & Reports';
    default: return 'Other';
  }
};

function AccessControl() {
  const { apiInstance } = useAuth();

  const [permissionCategories, setPermissionCategories] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [roles, setRoles] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [error, setError] = useState(null);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const [selectedTopCategory, setSelectedTopCategory] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch permissions and categories
  useEffect(() => {
    const fetchData = async () => {
      setIsFetchingData(true);
      setError(null);
      try {
        const [permissionsRes, categoriesRes] = await Promise.all([
          apiInstance.get('/permissions'),
          apiInstance.get('/permission-categories')
        ]);
        setAllPermissions(permissionsRes.data || []);
        setPermissionCategories(categoriesRes.data || []);
        if (categoriesRes.data && categoriesRes.data.length) {
          setSelectedTopCategory(
            categoriesRes.data.sort((a, b) => a.display_order - b.display_order)[0].name
          );
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load permissions data.');
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchData();
  }, [apiInstance]);

  // Fetch roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const rolesRes = await apiInstance.get('/roles');
        setRoles(rolesRes.data || []);
        if (rolesRes.data && rolesRes.data.length) {
          setSelectedRole(rolesRes.data[0].id);
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    };
    fetchRoles();
  }, [apiInstance]);

  // Fetch role permissions using endpoint /roles/:id/permissions.
  // If your API uses a different endpoint (e.g. /role-permissions?roleId=...), adjust accordingly.
  useEffect(() => {
    const fetchRolePermissions = async () => {
      if (!selectedRole) {
        setRolePermissions([]);
        return;
      }
      try {
        const res = await apiInstance.get(`/roles/${selectedRole}/permissions`);
        setRolePermissions(res.data.map(permission => permission.id));
      } catch (err) {
        console.error("Error fetching role permissions:", err);
        setRolePermissions([]); // fallback to empty array if not found
      }
    };
    fetchRolePermissions();
  }, [selectedRole, apiInstance]);

  // Group and sort permissions and filter by search term
  const groupedPermissions = useMemo(() => {
    if (!allPermissions.length) return {};
    const groups = allPermissions.reduce((acc, permission) => {
      const groupName = getPermissionGroupName(permission.name);
      if (
        !searchTerm ||
        (permission.display_name &&
          permission.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        permission.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        if (!acc[groupName]) {
          acc[groupName] = [];
        }
        acc[groupName].push(permission);
      }
      return acc;
    }, {});
    return Object.keys(groups)
      .sort()
      .reduce((obj, key) => {
        obj[key] = groups[key].sort((a, b) =>
          (a.display_name || '').localeCompare(b.display_name || '')
        );
        return obj;
      }, {});
  }, [allPermissions, searchTerm]);

  // Build final permission structure using the categories from the DB.
  const finalPermissionStructure = useMemo(() => {
    const structure = {};
    permissionCategories.forEach(cat => {
      structure[cat.name] = [];
    });
    Object.keys(groupedPermissions).forEach(group => {
      const exists = Object.keys(structure).find(key => key === group);
      if (!exists) {
        if (!structure['Other']) structure['Other'] = [];
        if (!structure['Other'].includes(group)) {
          structure['Other'].push(group);
        }
      }
    });
    return structure;
  }, [permissionCategories, groupedPermissions]);

  return (
    <div className="access-control-container" style={{ padding: '20px' }}>
      <h2>Access Control Management</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {isFetchingData && <p>Loading access control data...</p>}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search permissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', width: '300px', marginRight: '10px' }}
        />
      </div>
      {roles.length > 0 && (
        <div style={{ margin: '20px 0' }}>
          <label htmlFor="roleSelect" style={{ marginRight: '10px' }}>
            Select Role:
          </label>
          <select
            id="roleSelect"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ padding: '8px', minWidth: '300px' }}
          >
            {roles.map(role => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {permissionCategories.length > 0 && (
        <div style={{ margin: '20px 0' }}>
          <label htmlFor="topCategorySelect" style={{ marginRight: '10px' }}>
            Select Permission Category:
          </label>
          <select
            id="topCategorySelect"
            value={selectedTopCategory}
            onChange={(e) => setSelectedTopCategory(e.target.value)}
            style={{ padding: '8px', minWidth: '300px' }}
          >
            <option value="">-- Choose a Category --</option>
            {permissionCategories
              .sort((a, b) => a.display_order - b.display_order)
              .map(cat => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
          </select>
        </div>
      )}
      {selectedTopCategory && groupedPermissions && (
        <div>
          <h3>{selectedTopCategory}</h3>
          {Object.keys(groupedPermissions)
            .filter(groupName =>
              selectedTopCategory === groupName ||
              ((finalPermissionStructure[selectedTopCategory] || []).includes(groupName))
            )
            .map(groupName => (
              <div key={groupName}>
                <h4>{groupName}</h4>
                <ul>
                  {groupedPermissions[groupName]?.map(permission => (
                    <li key={permission.id}>
                      <label style={{ cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={rolePermissions.includes(permission.id)}
                          readOnly
                          style={{ marginRight: '8px' }}
                        />
                        {permission.display_name} (<code>{permission.name}</code>)
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

export default AccessControl;