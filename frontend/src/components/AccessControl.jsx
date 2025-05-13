import React, { useState, useEffect, useMemo } from 'react';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Checkbox,
  Button,
  TextField, // Added for search
  CircularProgress // Added for loading state
} from '@mui/material';
import { FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiInstance from '../services/api';

function AccessControl() {
  const [allPermissions, setAllPermissions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [roles, setRoles] = useState([]);
  const [roleAssignments, setRoleAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState(''); // State for search term
  const { isAuthenticated, isLoading: authLoading, userCan } = useAuth();

  useEffect(() => {
    setLoading(true);
    setError(null);
    async function fetchData() {
      try {
        const [permsRes, catsRes, rolesRes] = await Promise.all([
          apiInstance.get('/permissions/list-all'),
          apiInstance.get('/permissions/categories'),
          apiInstance.get('/roles')
        ]);

        setAllPermissions(permsRes.data || []);
        setCategories(catsRes.data || []);
        
        const rolesData = rolesRes.data || [];
        setRoles(rolesData);

        const assignments = {};
        await Promise.all(
          rolesData.map(async (role) => {
            try {
              const roleRes = await apiInstance.get(`/roles/${role.id}`);
              let perms = roleRes.data.permissions || [];
              if (perms.length && typeof perms[0] === 'object' && perms[0] !== null) { // Check for object and not null
                perms = perms.map(p => p.id);
              }
              assignments[role.id] = perms;
            } catch (err) {
              console.error(`Error fetching permissions for role ${role.id}:`, err);
              assignments[role.id] = [];
            }
          })
        );
        setRoleAssignments(assignments);

      } catch (err) {
        console.error('Error fetching initial access control data:', err);
        setError(err.response?.data?.message || 'Failed to load access control data.');
      } finally {
        setLoading(false);
      }
    }
    if (isAuthenticated) {
        fetchData();
    } else if (!authLoading) {
        setError("User not authenticated.");
        setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const handleTogglePermissionForRole = async (roleId, permissionId, isAssigned) => {
    // No need for setLoading(true) here as individual checkbox changes are quick
    // setError(null); // Clear previous specific error
    try {
      const current = roleAssignments[roleId] || [];
      let updated;
      if (isAssigned) {
        updated = current.filter(id => id !== permissionId);
      } else {
        updated = [...current, permissionId];
      }
      await apiInstance.post(`/roles/${roleId}/permissions`, { permissionIds: updated });
      setRoleAssignments(prev => ({ ...prev, [roleId]: updated }));
    } catch (err) {
      console.error('Error updating permission for role:', err);
      setError(err.response?.data?.message || 'Failed to update permission.');
      // Optionally revert state on error, or refetch
    }
  };

  const filteredPermissions = useMemo(() => {
    if (!searchTerm) {
      return allPermissions;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allPermissions.filter(permission =>
      (permission.display_name && permission.display_name.toLowerCase().includes(lowerSearchTerm)) ||
      (permission.name && permission.name.toLowerCase().includes(lowerSearchTerm)) ||
      (permission.description && permission.description.toLowerCase().includes(lowerSearchTerm))
    );
  }, [allPermissions, searchTerm]);

  const groupedPermissions = useMemo(() => {
    return filteredPermissions.reduce((groups, permission) => {
      const categoryObj = categories.find(cat => cat.id === permission.permission_category_id) || { name: "Uncategorized", display_order: 999 };
      const categoryName = categoryObj.name;
      if (!groups[categoryName]) {
        groups[categoryName] = {
          permissions: [],
          displayOrder: categoryObj.display_order
        };
      }
      groups[categoryName].permissions.push(permission);
      return groups;
    }, {});
  }, [filteredPermissions, categories]);

  // Sort categories by displayOrder
  const sortedGroupedPermissions = useMemo(() => {
    return Object.entries(groupedPermissions)
      .sort(([, groupA], [, groupB]) => groupA.displayOrder - groupB.displayOrder)
      .map(([categoryName, groupData]) => ({
        categoryName,
        permissions: groupData.permissions.sort((a, b) => {
          const nameA = a.display_name || a.name || ''; // Fallback to name, then to empty string
          const nameB = b.display_name || b.name || ''; // Fallback to name, then to empty string
          return nameA.localeCompare(nameB);
        })
      }));
  }, [groupedPermissions]);


  if (authLoading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Permission Manager</Typography>
        {typeof userCan === 'function' && userCan('permission:create') && (
          <Button variant="contained" color="primary" component={Link} to="/dashboard/permissions/new" startIcon={<FaPlus />}>
            Create New Permission
          </Button>
        )}
      </Box>
      <Box mb={2}>
        <TextField
          fullWidth
          variant="outlined"
          label="Search Permissions (by name, code, or description)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </Box>
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>
      )}
      {error && (
        <Typography variant="body2" color="error" align="center" sx={{mb: 2}}>
          {error}
        </Typography>
      )}
      {!loading && !error && sortedGroupedPermissions.length === 0 && (
        <Typography variant="body1" align="center">
          {searchTerm ? 'No permissions match your search.' : 'No permissions available.'}
        </Typography>
      )}
      {!loading && !error && sortedGroupedPermissions.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{minWidth: 250}}>Permission</TableCell>
              {roles.map(role => (
                <TableCell key={role.id} align="center" sx={{textTransform: 'capitalize'}}>
                  {role.display_name || role.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedGroupedPermissions.map(({ categoryName, permissions }) => (
              <React.Fragment key={categoryName}>
                <TableRow>
                  <TableCell colSpan={roles.length + 1} sx={{ backgroundColor: '#f5f5f5', py: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">{categoryName}</Typography>
                  </TableCell>
                </TableRow>
                {permissions.map(permission => (
                  <TableRow key={permission.id} hover>
                    <TableCell>
                      <Typography variant="body1" fontWeight="medium">
                        {permission.display_name || permission.name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" component="div">
                        Code: {permission.name}
                      </Typography>
                      {permission.description && (
                        <Typography variant="caption" color="textSecondary" component="div">
                          Desc: {permission.description}
                        </Typography>
                      )}
                    </TableCell>
                    {roles.map(role => {
                      const assigned = (roleAssignments[role.id] || []).includes(permission.id);
                      return (
                        <TableCell key={`${role.id}-${permission.id}`} align="center">
                          <Checkbox
                            checked={assigned}
                            onChange={() => handleTogglePermissionForRole(role.id, permission.id, assigned)}
                            color="primary"
                            disabled={role.is_system_role && permission.name.startsWith('system:')} // Example: disable for system roles + system perms
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}

export default AccessControl;