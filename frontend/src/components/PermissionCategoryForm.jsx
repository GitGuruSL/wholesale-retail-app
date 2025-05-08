import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import formStyles from '../styles/FormStyles'; // Import the styles

function PermissionCategoryForm() {
    const { categoryId } = useParams();
    const navigate = useNavigate();
    const { apiInstance } = useAuth();

    const isEditing = Boolean(categoryId);

    const [formData, setFormData] = useState({
        name: '',
        display_order: '' 
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formErrors, setFormErrors] = useState({});

    const fetchCategory = useCallback(async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await apiInstance.get(`/permission-categories/${id}`);
            const categoryData = response.data;
            setFormData({
                name: categoryData.name || '',
                display_order: categoryData.display_order !== null && categoryData.display_order !== undefined 
                                ? String(categoryData.display_order) 
                                : ''
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch category details.');
            console.error('Error fetching category:', err);
        } finally {
            setLoading(false);
        }
    }, [apiInstance]);

    useEffect(() => {
        if (isEditing && categoryId) {
            fetchCategory(categoryId);
        } else {
            setFormData({ name: '', display_order: '' }); 
        }
    }, [isEditing, categoryId, fetchCategory]);

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
            errors.name = 'Category name is required.';
        }
        if (formData.display_order.trim() === '') {
            errors.display_order = 'Display order is required.';
        } else if (isNaN(parseInt(formData.display_order, 10))) {
            errors.display_order = 'Display order must be a number.';
        }
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
                display_order: parseInt(formData.display_order, 10)
            };

            if (isEditing) {
                await apiInstance.put(`/permission-categories/${categoryId}`, payload);
            } else {
                await apiInstance.post('/permission-categories', payload);
            }
            navigate('/dashboard/permission-categories', { state: { message: `Category ${isEditing ? 'updated' : 'created'} successfully!` } });
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
                setError(apiError?.message || `Failed to ${isEditing ? 'update' : 'create'} category.`);
            }
            console.error('Error submitting category form:', err);
        } finally {
            setLoading(false);
        }
    };
    
    if (loading && isEditing && !formData.name) {
         return <div style={formStyles.container}><p style={{textAlign: 'center'}}>Loading category details...</p></div>;
    }

    return (
        <div style={formStyles.container}>
            <h2 style={formStyles.title}>{isEditing ? 'Edit Permission Category' : 'Create New Permission Category'}</h2>
            
            {error && (
                <div style={{ ...formStyles.errorBox, backgroundColor: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24' }}>
                    Error: {error}
                </div>
            )}
            
            <form onSubmit={handleSubmit}>
                <div style={formStyles.formGroup}>
                    <label htmlFor="name" style={formStyles.label}>Category Name:</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        style={{...formStyles.input, ...(formErrors.name && {borderColor: 'red'})}}
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., User Management, Product Settings"
                    />
                    {formErrors.name && <div style={{ color: 'red', fontSize: '0.8em', marginTop: '4px' }}>{formErrors.name}</div>}
                </div>

                <div style={formStyles.formGroup}>
                    <label htmlFor="display_order" style={formStyles.label}>Display Order:</label>
                    <input
                        type="number"
                        id="display_order"
                        name="display_order"
                        style={{...formStyles.input, ...(formErrors.display_order && {borderColor: 'red'})}}
                        value={formData.display_order}
                        onChange={handleChange}
                        placeholder="e.g., 10, 20 (lower numbers appear first)"
                    />
                    {formErrors.display_order && <div style={{ color: 'red', fontSize: '0.8em', marginTop: '4px' }}>{formErrors.display_order}</div>}
                </div>
                
                <div style={formStyles.buttonGroup}>
                    <button type="submit" style={formStyles.buttonPrimary} disabled={loading}>
                        {loading ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Category' : 'Create Category')}
                    </button>
                    <button type="button" style={formStyles.buttonSecondary} onClick={() => navigate('/dashboard/permission-categories')} disabled={loading}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PermissionCategoryForm;