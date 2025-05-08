import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

function AccessControl() {
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState('');
  const [rolePermissions, setRolePermissions] = useState([]); // permissions assigned to the role
  const [allPermissions, setAllPermissions] = useState([]);   // full list from API
  const [categories, setCategories] = useState([]);            // permission categories
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { apiInstance, userCan } = useAuth();
  const navigate = useNavigate();

  // Fetch full permissions list
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

  // Fetch permission categories list
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

  // Fetch roles list for the dropdown
  useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await apiInstance.get('/roles');
        const rolesData = res.data || [];
        setRoles(rolesData);
        if (rolesData.length > 0) {
          setSelectedRole(rolesData[0].id); // defaults to first role
        }
      } catch (err) {
        console.error("Error fetching roles:", err);
      }
    }
    fetchRoles();
  }, [apiInstance]);

  // Fetch permissions assigned to selected role
  useEffect(() => {
    async function fetchRolePermissions() {
      if (!selectedRole) {
        setRolePermissions([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Assuming GET /roles/:id returns a role object with a "permissions" array.
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

  const handleRoleChange = (event) => {
    setSelectedRole(event.target.value);
  };

  const handleCategoryChange = (event) => {
    setSelectedCategory(event.target.value);
  };

  const handleDelete = async (permissionId, permissionName) => {
    if (window.confirm(`Are you sure you want to delete the permission "${permissionName}"? This action cannot be undone.`)) {
      try {
        setLoading(true);
        await apiInstance.delete(`/permissions/${permissionId}`);
        // Re-fetch role permissions after deletion.
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

  // Filter permissions by selected category, if any
  const filteredPermissions = rolePermissions.filter(permission => {
    if (!selectedCategory) return true;
    return permission.permission_category_id === parseInt(selectedCategory, 10);
  });

  // Group the filtered permissions by category name
  const groupedPermissions = filteredPermissions.reduce((groups, permission) => {
    const categoryObj = categories.find(cat => cat.id === permission.permission_category_id);
    const categoryName = categoryObj ? categoryObj.name : "Uncategorized";
    if (!groups[categoryName]) groups[categoryName] = [];
    groups[categoryName].push(permission);
    return groups;
  }, {});

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Role Wise Permissions</Typography>
        {typeof userCan === 'function' && userCan('permission:create') && (
          <Button variant="contained" color="primary" component={Link} to="/dashboard/permissions/new" startIcon={<FaPlus />}>
            Create New Permission
          </Button>
        )}
      </Box>
      <Box display="flex" gap={2} mb={2}>
        <FormControl fullWidth>
          <InputLabel id="role-select-label">Select Role</InputLabel>
          <Select
            labelId="role-select-label"
            id="role-select"
            value={selectedRole}
            label="Select Role"
            onChange={handleRoleChange}
          >
            {roles.map(role => (
              <MenuItem key={role.id} value={role.id}>
                {role.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel id="category-select-label">Select Permission Category</InputLabel>
          <Select
            labelId="category-select-label"
            id="category-select"
            value={selectedCategory}
            label="Select Permission Category"
            onChange={handleCategoryChange}
          >
            <MenuItem value="">All Categories</MenuItem>
            {categories
              .sort((a, b) => a.display_order - b.display_order)
              .map(category => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>
      {loading && (
        <Typography variant="body1" align="center">
          Loading permissions...
        </Typography>
      )}
      {error && (
        <Typography variant="body2" color="error" align="center">
          {error}
        </Typography>
      )}
      {!loading && filteredPermissions.length === 0 && (
        <Typography variant="body1" align="center">
          No permissions assigned to this role in the selected category.
        </Typography>
      )}
      {Object.entries(groupedPermissions).map(([group, permissions]) => (
        <Box key={group} mb={3}>
          <Typography variant="h6" gutterBottom>
            {group}
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {permissions.map(permission => (
                <TableRow key={permission.id}>
                  <TableCell>{permission.id}</TableCell>
                  <TableCell>
                    <Typography variant="body1" fontWeight="bold">
                      {permission.display_name || permission.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Code: {permission.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {typeof userCan === 'function' && userCan('permission:update') && (
                      <Button
                        variant="outlined"
                        color="primary"
                        sx={{ mr: 1 }}
                        component={Link}
                        to={`/dashboard/permissions/edit/${permission.id}`}
                      >
                        <FaEdit />
                      </Button>
                    )}
                    {typeof userCan === 'function' && userCan('permission:delete') && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => handleDelete(permission.id, permission.display_name || permission.name)}
                      >
                        <FaTrashAlt />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      ))}
    </Paper>
  );
}

export default AccessControl;