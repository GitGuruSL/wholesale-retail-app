import React, { useState, useEffect } from 'react';
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
  Button
} from '@mui/material';
import { FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AccessControl() {
  const [allPermissions, setAllPermissions] = useState([]); // All available permissions
  const [categories, setCategories] = useState([]);           // Permission categories
  const [roles, setRoles] = useState([]);                     // All roles
  // Mapping: { roleId: [permissionId, ...] }
  const [roleAssignments, setRoleAssignments] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiInstance, userCan } = useAuth();

  // Fetch all permissions
  useEffect(() => {
    async function fetchAllPermissions() {
      try {
        const res = await apiInstance.get('/permissions/list-all');
        setAllPermissions(res.data || []);
      } catch (err) {
        console.error('Error fetching all permissions:', err);
      }
    }
    fetchAllPermissions();
  }, [apiInstance]);

  // Fetch all permission categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await apiInstance.get('/permissions/categories');
        setCategories(res.data || []);
      } catch (err) {
        console.error('Error fetching permission categories:', err);
      }
    }
    fetchCategories();
  }, [apiInstance]);

  // Fetch roles and their permissions
  useEffect(() => {
    async function fetchRolesAndAssignments() {
      try {
        const res = await apiInstance.get('/roles');
        const rolesData = res.data || [];
        setRoles(rolesData);
        const assignments = {};
        // Fetch each role's assigned permissions in parallel
        await Promise.all(
          rolesData.map(async (role) => {
            try {
              const roleRes = await apiInstance.get(`/roles/${role.id}`);
              let perms = roleRes.data.permissions || [];
              // If permissions are returned as objects, map to IDs
              if (perms.length && typeof perms[0] === 'object') {
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
        console.error('Error fetching roles:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchRolesAndAssignments();
  }, [apiInstance]);

  // Handle toggling a permission for a given role
  const handleTogglePermissionForRole = async (roleId, permissionId, isAssigned) => {
    try {
      setLoading(true);
      const current = roleAssignments[roleId] || [];
      let updated;
      if (isAssigned) {
        updated = current.filter(id => id !== permissionId);
      } else {
        updated = [...current, permissionId];
      }
      // Update the role's permissions by sending the complete updated array
      await apiInstance.post(`/roles/${roleId}/permissions`, { permissionIds: updated });
      // Update our mapping in state
      setRoleAssignments(prev => ({ ...prev, [roleId]: updated }));
    } catch (err) {
      console.error('Error updating permission for role:', err);
      setError(err.response?.data?.message || 'Failed to update permission.');
    } finally {
      setLoading(false);
    }
  };

  // Group permissions by category (optional, for display order)
  const groupedPermissions = allPermissions.reduce((groups, permission) => {
    // If no category found, fall back to "Other"
    const categoryObj = categories.find(cat => cat.id === permission.permission_category_id) || { name: "Other" };
    const categoryName = categoryObj.name;
    if (!groups[categoryName]) groups[categoryName] = [];
    groups[categoryName].push(permission);
    return groups;
  }, {});

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
      {loading && (
        <Typography variant="body1" align="center">
          Loading data...
        </Typography>
      )}
      {error && (
        <Typography variant="body2" color="error" align="center">
          {error}
        </Typography>
      )}
      {!loading && allPermissions.length === 0 && (
        <Typography variant="body1" align="center">
          No permissions available.
        </Typography>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Permission</TableCell>
            {roles.map(role => (
              <TableCell key={role.id} align="center">{role.name}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(groupedPermissions).map(([group, permissions]) => (
            <React.Fragment key={group}>
              <TableRow>
                <TableCell colSpan={roles.length + 1} sx={{ backgroundColor: '#f5f5f5' }}>
                  <Typography variant="h6">{group}</Typography>
                </TableCell>
              </TableRow>
              {permissions.map(permission => (
                <TableRow key={permission.id}>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {permission.display_name || permission.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Code: {permission.name}
                    </Typography>
                  </TableCell>
                  {roles.map(role => {
                    const assigned = (roleAssignments[role.id] || []).includes(permission.id);
                    return (
                      <TableCell key={`${role.id}-${permission.id}`} align="center">
                        <Checkbox
                          checked={assigned}
                          onChange={() => handleTogglePermissionForRole(role.id, permission.id, assigned)}
                          color="primary"
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
    </Paper>
  );
}

export default AccessControl;