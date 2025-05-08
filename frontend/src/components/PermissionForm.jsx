import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import formStyles from '../styles/FormStyles';

function PermissionForm() {
    const { permissionId } = useParams();
    const navigate = useNavigate();
    const { apiInstance } = useAuth();
    const isEditing = Boolean(permissionId);

    const [formData, setFormData] = useState({
        name: '',
        display_name: '',
        description: '',
        permission_category_id: '',
        sub_group_key: '',
        sub_group_display_name: ''
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const fetchCategories = useCallback(async () => {
        try {
            const response = await apiInstance.get('/permissions/categories');
            setCategories(response.data || []);
        } catch (err) {
            console.error('Failed to fetch permission categories:', err);
            setError("Failed to load permission categories.");
            setCategories([]);
        }
    }, [apiInstance]);

    const fetchPermission = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiInstance.get(`/permissions/${id}`);
            const permissionData = response.data;
            let categoryIdToSet = '';
            if (permissionData.permission_category_id !== null && permissionData.permission_category_id !== undefined) {
                const parsedId = parseInt(permissionData.permission_category_id, 10);
                if (!isNaN(parsedId)) {
                    categoryIdToSet = parsedId;
                }
            }
            setFormData({
                name: permissionData.name || '',
                display_name: permissionData.display_name || '',
                description: permissionData.description || '',
                permission_category_id: categoryIdToSet,
                sub_group_key: permissionData.sub_group_key || '',
                sub_group_display_name: permissionData.sub_group_display_name || ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch permission details.');
            console.error('Error fetching permission:', err);
        } finally {
            setLoading(false);
        }
    }, [apiInstance]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await fetchCategories();
            if (isEditing && permissionId) {
                await fetchPermission(permissionId);
            } else {
                setFormData({
                    name: '',
                    display_name: '',
                    description: '',
                    permission_category_id: '',
                    sub_group_key: '',
                    sub_group_display_name: ''
                });
                setLoading(false);
            }
        };
        loadInitialData();
    }, [isEditing, permissionId, fetchCategories, fetchPermission]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;
        if (name === 'permission_category_id' && value !== '') {
            const numValue = parseInt(value, 10);
            if (!isNaN(numValue)) {
                processedValue = numValue;
            }
        }
        setFormData(prev => ({ ...prev, [name]: processedValue }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!isEditing && !formData.name.trim()) {
            errors.name = 'Permission name (code) is required.';
        } else if (!isEditing && !/^[a-z0-9_:-]+$/.test(formData.name.trim())) {
            errors.name = 'Name can only contain lowercase letters, numbers, underscores, hyphens, and colons (e.g., user:create).';
        }
        if (!formData.display_name.trim()) {
            errors.display_name = 'Display name is required.';
        }
        if (formData.permission_category_id === '' || formData.permission_category_id === undefined || formData.permission_category_id === null) {
            errors.permission_category_id = 'Permission category is required.';
        }
        if (!formData.sub_group_key.trim()) {
            errors.sub_group_key = 'Sub-group key is required (e.g., user, product_core).';
        }
        if (!formData.sub_group_display_name.trim()) {
            errors.sub_group_display_name = 'Sub-group display name is required (e.g., User Management).';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setLoading(true);
        setError(null);
        try {
            const payload = {
                display_name: formData.display_name.trim(),
                description: formData.description.trim() || null,
                permission_category_id: parseInt(formData.permission_category_id, 10),
                sub_group_key: formData.sub_group_key.trim(),
                sub_group_display_name: formData.sub_group_display_name.trim()
            };
            if (!isEditing) {
                payload.name = formData.name.trim();
            }
            if (isEditing) {
                await apiInstance.put(`/permissions/${permissionId}`, payload);
            } else {
                await apiInstance.post('/permissions', payload);
            }
            navigate('/dashboard/permissions', { state: { message: `Permission ${isEditing ? 'updated' : 'created'} successfully!` } });
        } catch (err) {
            const apiError = err.response?.data;
            if (apiError?.errors && Array.isArray(apiError.errors)) {
                const backendErrors = apiError.errors.reduce((acc, curr) => {
                    acc[curr.path || curr.param] = curr.msg;
                    return acc;
                }, {});
                setFormErrors(prev => ({ ...prev, ...backendErrors }));
                setError("Please correct the errors in the form.");
            } else {
                setError(apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} permission.`);
            }
            console.error('Error submitting permission form:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing && !formData.name) {
         return <div style={formStyles.container}><p>Loading permission details...</p></div>;
    }
    if (loading && categories.length === 0) {
        return <div style={formStyles.container}><p>Loading categories...</p></div>;
    }

    return (
        <div style={formStyles.container}>
            <h2 style={formStyles.title}>{isEditing ? 'Edit Permission' : 'Create New Permission'}</h2>
            {error && <div style={{ ...formStyles.errorBox, backgroundColor: '#f8d7da', color: '#721c24' }}>Error: {error}</div>}
            <form onSubmit={handleSubmit}>
                {/* Permission Name (Code) */}
                <div style={formStyles.formGroup}>
                    <label style={formStyles.label} htmlFor="name">Permission Name (Code):</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        style={formStyles.input}
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., user:create, product:edit"
                        disabled={isEditing}
                    />
                    {formErrors.name && <div style={{ color: 'red', fontSize: '.8em' }}>{formErrors.name}</div>}
                    {isEditing && <small style={formStyles.helpText}>The permission name (code) cannot be changed after creation.</small>}
                </div>
                {/* Display Name */}
                <div style={formStyles.formGroup}>
                    <label style={formStyles.label} htmlFor="display_name">Display Name:</label>
                    <input
                        type="text"
                        id="display_name"
                        name="display_name"
                        style={formStyles.input}
                        value={formData.display_name}
                        onChange={handleChange}
                        placeholder="e.g., Create Users, Edit Products"
                    />
                    {formErrors.display_name && <div style={{ color: 'red', fontSize: '.8em' }}>{formErrors.display_name}</div>}
                </div>
                {/* Permission Category */}
                <div style={formStyles.formGroup}>
                    <label style={formStyles.label} htmlFor="permission_category_id">Permission Category:</label>
                    <select
                        id="permission_category_id"
                        name="permission_category_id"
                        style={formStyles.select}
                        value={formData.permission_category_id}
                        onChange={handleChange}
                    >
                        <option value="">-- Select a Category --</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    {formErrors.permission_category_id && <div style={{ color: 'red', fontSize: '.8em' }}>{formErrors.permission_category_id}</div>}
                </div>
                {/* Sub-Group Key */}
                <div style={formStyles.formGroup}>
                    <label style={formStyles.label} htmlFor="sub_group_key">Sub-Group Key:</label>
                    <input
                        type="text"
                        id="sub_group_key"
                        name="sub_group_key"
                        style={formStyles.input}
                        value={formData.sub_group_key}
                        onChange={handleChange}
                        placeholder="e.g., user, product_core, tax_settings"
                    />
                    {formErrors.sub_group_key && <div style={{ color: 'red', fontSize: '.8em' }}>{formErrors.sub_group_key}</div>}
                </div>
                {/* Sub-Group Display Name */}
                <div style={formStyles.formGroup}>
                    <label style={formStyles.label} htmlFor="sub_group_display_name">Sub-Group Display Name:</label>
                    <input
                        type="text"
                        id="sub_group_display_name"
                        name="sub_group_display_name"
                        style={formStyles.input}
                        value={formData.sub_group_display_name}
                        onChange={handleChange}
                        placeholder="e.g., User Management, Product Core Setup"
                    />
                    {formErrors.sub_group_display_name && <div style={{ color: 'red', fontSize: '.8em' }}>{formErrors.sub_group_display_name}</div>}
                </div>
                {/* Description */}
                <div style={formStyles.formGroup}>
                    <label style={formStyles.label} htmlFor="description">Description (Optional):</label>
                    <textarea
                        id="description"
                        name="description"
                        style={formStyles.textarea}
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Briefly describe what this permission allows"
                    />
                    {formErrors.description && <div style={{ color: 'red', fontSize: '.8em' }}>{formErrors.description}</div>}
                </div>
                {/* Form Actions */}
                <div style={formStyles.buttonGroup}>
                    <button type="submit" style={formStyles.buttonPrimary} disabled={loading}>
                        {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Permission' : 'Create Permission')}
                    </button>
                    <button type="button" style={formStyles.buttonSecondary} onClick={() => navigate('/dashboard/permissions')} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PermissionForm;