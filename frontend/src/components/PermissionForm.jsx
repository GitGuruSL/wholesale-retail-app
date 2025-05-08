import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function PermissionForm() {
    const { permissionId } = useParams();
    const navigate = useNavigate();
    const { apiInstance } = useAuth();

    const isEditing = Boolean(permissionId);

    const [formData, setFormData] = useState({
        name: '',
        display_name: '',
        description: '',
        permission_category_id: '', // Keep as empty string for initial "Select" state
        sub_group_key: '',
        sub_group_display_name: ''
    });
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false); // Combined loading state
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    // Fetch permission categories
    const fetchCategories = useCallback(async () => {
        console.log("Fetching categories...");
        try {
            const response = await apiInstance.get('/permissions/categories');
            setCategories(response.data || []);
            console.log("Categories fetched:", response.data);
        } catch (err) {
            console.error('Failed to fetch permission categories:', err);
            setError(prev => `${prev ? prev + ' ' : ''}Failed to load permission categories.`);
            setCategories([]);
        }
    }, [apiInstance]);

    // Fetch a single permission for editing
    const fetchPermission = useCallback(async (id) => {
        console.log(`Fetching permission with ID: ${id}`);
        setLoading(true); // Set loading true when starting to fetch permission
        setError(null);
        try {
            const response = await apiInstance.get(`/permissions/${id}`);
            const permissionData = response.data;
            console.log('Fetched Permission Data for Edit:', permissionData);

            let categoryIdToSet = ''; // Default for the select if no category ID
            if (permissionData.permission_category_id !== null && permissionData.permission_category_id !== undefined) {
                // Ensure it's a number to match option values if category.id is a number
                // If category.id in <option> is a string, convert to string here.
                // Assuming category.id is a number from your API.
                const parsedId = parseInt(permissionData.permission_category_id, 10);
                if (!isNaN(parsedId)) {
                    categoryIdToSet = parsedId;
                }
            }
            console.log('Setting permission_category_id in formData to:', categoryIdToSet, typeof categoryIdToSet);
            
            setFormData({
                name: permissionData.name || '',
                display_name: permissionData.display_name || '',
                description: permissionData.description || '',
                permission_category_id: categoryIdToSet, // This should be a number or ''
                sub_group_key: permissionData.sub_group_key || '',
                sub_group_display_name: permissionData.sub_group_display_name || ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch permission details.');
            console.error('Error fetching permission:', err);
        } finally {
            setLoading(false); // Set loading false after fetch attempt
        }
    }, [apiInstance]);

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true); // Overall loading for initial data
            await fetchCategories(); // Fetch categories first
            if (isEditing && permissionId) {
                await fetchPermission(permissionId); // Then fetch permission if editing
            } else {
                // Reset form for new permission entry
                setFormData({
                    name: '',
                    display_name: '',
                    description: '',
                    permission_category_id: '',
                    sub_group_key: '',
                    sub_group_display_name: ''
                });
                setLoading(false); // Not fetching permission, so stop loading
            }
            // If not editing, fetchPermission sets loading to false.
            // If editing, fetchPermission sets loading to false.
        };
        loadInitialData();
    }, [isEditing, permissionId, fetchCategories, fetchPermission]); // fetchCategories & fetchPermission are stable due to useCallback

    const handleChange = (e) => {
        const { name, value } = e.target;
        let processedValue = value;
        // If changing the category, ensure it's stored as a number if it's numeric
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
        // ... (validation logic remains the same)
        const errors = {};
        if (!isEditing && !formData.name.trim()) { // Name required only on create
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
        // ... (submit logic remains largely the same, ensure permission_category_id is int)
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
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

    // More granular loading state for the form content
    if (loading && isEditing && !formData.name) {
         return <div className="page-container"><p>Loading permission details...</p></div>;
    }
    if (loading && categories.length === 0) { // Still loading categories
        return <div className="page-container"><p>Loading categories...</p></div>;
    }


    return (
        <div className="page-container">
            <div className="page-header">
                <h2>{isEditing ? 'Edit Permission' : 'Create New Permission'}</h2>
            </div>
            {error && <div className="error-message alert alert-danger" style={{ marginBottom: '1rem' }}>Error: {error}</div>}
            
            <form onSubmit={handleSubmit} className="form-card">
                {/* Permission Name (Code) */}
                <div className="form-group">
                    <label htmlFor="name" className="form-label">Permission Name (Code):</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        className={`form-control ${formErrors.name ? 'is-invalid' : ''}`}
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., user:create, product:edit"
                        disabled={isEditing}
                    />
                    {formErrors.name && <div className="invalid-feedback">{formErrors.name}</div>}
                    {isEditing && <small className="form-text text-muted">The permission name (code) cannot be changed after creation.</small>}
                </div>

                {/* Display Name */}
                <div className="form-group">
                    <label htmlFor="display_name" className="form-label">Display Name:</label>
                    <input
                        type="text"
                        id="display_name"
                        name="display_name"
                        className={`form-control ${formErrors.display_name ? 'is-invalid' : ''}`}
                        value={formData.display_name}
                        onChange={handleChange}
                        placeholder="e.g., Create Users, Edit Products"
                    />
                    {formErrors.display_name && <div className="invalid-feedback">{formErrors.display_name}</div>}
                </div>
                
                {/* Permission Category */}
                <div className="form-group">
                    <label htmlFor="permission_category_id" className="form-label">Permission Category:</label>
                    {/* Log values right before rendering the select */}
                    {console.log("Render Select - Value:", formData.permission_category_id, "Type:", typeof formData.permission_category_id)}
                    {console.log("Render Select - Options:", categories.map(c => ({id: c.id, type: typeof c.id, name: c.name})))}
                    <select
                        id="permission_category_id"
                        name="permission_category_id"
                        className={`form-control form-select ${formErrors.permission_category_id ? 'is-invalid' : ''}`}
                        value={formData.permission_category_id} // Should be a number or ''
                        onChange={handleChange}
                    >
                        <option value="">-- Select a Category --</option>
                        {categories.map(category => (
                            // Assuming category.id is a number
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                    {formErrors.permission_category_id && <div className="invalid-feedback">{formErrors.permission_category_id}</div>}
                </div>

                {/* Sub-Group Key */}
                <div className="form-group">
                    <label htmlFor="sub_group_key" className="form-label">Sub-Group Key:</label>
                    <input
                        type="text"
                        id="sub_group_key"
                        name="sub_group_key"
                        className={`form-control ${formErrors.sub_group_key ? 'is-invalid' : ''}`}
                        value={formData.sub_group_key}
                        onChange={handleChange}
                        placeholder="e.g., user, product_core, tax_settings"
                    />
                    {formErrors.sub_group_key && <div className="invalid-feedback">{formErrors.sub_group_key}</div>}
                </div>

                {/* Sub-Group Display Name */}
                <div className="form-group">
                    <label htmlFor="sub_group_display_name" className="form-label">Sub-Group Display Name:</label>
                    {/* ... existing code ... */}
                    <input
                        type="text"
                        id="sub_group_display_name"
                        name="sub_group_display_name"
                        className={`form-control ${formErrors.sub_group_display_name ? 'is-invalid' : ''}`}
                        value={formData.sub_group_display_name}
                        onChange={handleChange}
                        placeholder="e.g., User Management, Product Core Setup"
                    />
                    {formErrors.sub_group_display_name && <div className="invalid-feedback">{formErrors.sub_group_display_name}</div>}
                </div>

                <div className="form-group">
                    <label htmlFor="description" className="form-label">Description (Optional):</label>
                    <textarea
                        id="description"
                        name="description"
                        className="form-control"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Briefly describe what this permission allows"
                    />
                    {formErrors.description && <div className="invalid-feedback">{formErrors.description}</div>}
                </div>

                <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Permission' : 'Create Permission')}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard/permissions')} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PermissionForm;