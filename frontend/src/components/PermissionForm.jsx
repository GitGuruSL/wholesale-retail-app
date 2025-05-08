import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // To get apiInstance

function PermissionForm() {
    const { permissionId } = useParams();
    const navigate = useNavigate();
    const { apiInstance } = useAuth(); // Or your direct api service

    const isEditing = Boolean(permissionId);

    const [formData, setFormData] = useState({
        name: '', // e.g., user:create
        display_name: '', // e.g., Create Users
        description: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const fetchPermission = useCallback(async (id) => {
        setLoading(true);
        try {
            const response = await apiInstance.get(`/permissions/${id}`);
            const { name, display_name, description } = response.data;
            setFormData({ name, display_name, description: description || '' });
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch permission details.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [apiInstance]);

    useEffect(() => {
        if (isEditing && permissionId) {
            fetchPermission(permissionId);
        }
    }, [isEditing, permissionId, fetchPermission]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!formData.name.trim()) {
            errors.name = 'Permission name (code) is required.';
        } else if (!/^[a-z0-9_:-]+$/.test(formData.name.trim())) {
            errors.name = 'Name can only contain lowercase letters, numbers, underscores, hyphens, and colons (e.g., user:create).';
        }
        if (!formData.display_name.trim()) {
            errors.display_name = 'Display name is required.';
        }
        // Description is optional
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const payload = {
                name: formData.name.trim(),
                display_name: formData.display_name.trim(),
                description: formData.description.trim() || null
            };

            if (isEditing) {
                await apiInstance.put(`/permissions/${permissionId}`, payload);
            } else {
                await apiInstance.post('/permissions', payload);
            }
            navigate('/dashboard/permissions', { state: { message: `Permission ${isEditing ? 'updated' : 'created'} successfully!` } });
        } catch (err) {
            const apiError = err.response?.data;
            if (apiError?.errors && Array.isArray(apiError.errors)) { // Handle validation errors from backend
                const backendErrors = apiError.errors.reduce((acc, curr) => {
                    acc[curr.path || curr.param] = curr.msg;
                    return acc;
                }, {});
                setFormErrors(prev => ({ ...prev, ...backendErrors }));
                setError("Please correct the errors in the form.");
            } else {
                setError(apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} permission.`);
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing && !formData.name) return <p>Loading permission details...</p>;

    return (
        <div>
            <h2>{isEditing ? 'Edit Permission' : 'Create New Permission'}</h2>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name">Permission Name (Code):</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., user:create, product:edit"
                        disabled={isEditing} // Typically, the machine name is not editable after creation
                    />
                    {formErrors.name && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.name}</p>}
                    {isEditing && <small>The permission name (code) cannot be changed after creation.</small>}
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label htmlFor="display_name">Display Name:</label>
                    <input
                        type="text"
                        id="display_name"
                        name="display_name"
                        value={formData.display_name}
                        onChange={handleChange}
                        placeholder="e.g., Create Users, Edit Products"
                    />
                    {formErrors.display_name && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.display_name}</p>}
                </div>
                <div style={{ marginTop: '1rem' }}>
                    <label htmlFor="description">Description (Optional):</label>
                    <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="Briefly describe what this permission allows"
                    />
                    {formErrors.description && <p style={{ color: 'red', fontSize: '0.9em' }}>{formErrors.description}</p>}
                </div>
                <div style={{ marginTop: '1.5rem' }}>
                    <button type="submit" disabled={loading}>
                        {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Permission' : 'Create Permission')}
                    </button>
                    <button type="button" onClick={() => navigate('/dashboard/permissions')} style={{ marginLeft: '1rem' }} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PermissionForm;