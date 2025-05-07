import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function WarrantyForm() {
    const { warrantyId } = useParams();
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Use apiInstance
    const isEditing = Boolean(warrantyId);

    const [name, setName] = useState('');
    const [durationMonths, setDurationMonths] = useState('');
    const [description, setDescription] = useState('');

    const [isLoading, setIsLoading] = useState(false); // Renamed from loading
    const [pageError, setPageError] = useState(null);   // For general page load errors
    const [formError, setFormError] = useState(null);   // For form submission/validation errors

    const fetchWarrantyData = useCallback(async () => {
        if (!isEditing || !apiInstance || !isAuthenticated) return;
        setIsLoading(true);
        setPageError(null);
        setFormError(null);
        try {
            const response = await apiInstance.get(`/warranties/${warrantyId}`);
            const data = response.data;
            setName(data.name);
            setDurationMonths(data.duration_months?.toString() ?? '');
            setDescription(data.description || '');
        } catch (err) {
            console.error("Error fetching warranty details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load warranty data.';
            setPageError(errorMsg); // Use pageError for loading issues
        } finally {
            setIsLoading(false);
        }
    }, [warrantyId, isEditing, apiInstance, isAuthenticated]);

    useEffect(() => {
        if (authLoading) return; // Wait for auth context

        if (!isAuthenticated) {
            setPageError("Authentication required. Please log in.");
            setIsLoading(false);
            return;
        }

        if (isEditing) {
            fetchWarrantyData();
        } else {
            // Reset form for new warranty
            setName('');
            setDurationMonths('');
            setDescription('');
            setPageError(null);
            setFormError(null);
            setIsLoading(false);
        }
    }, [isEditing, fetchWarrantyData, authLoading, isAuthenticated]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setFormError("Authentication error. Please log in again.");
            return;
        }
        setIsLoading(true);
        setPageError(null);
        setFormError(null);

        let parsedDuration = null;
        if (durationMonths.trim() !== '') {
            parsedDuration = parseInt(durationMonths, 10);
            if (isNaN(parsedDuration) || parsedDuration < 0) {
                setFormError("Duration (Months) must be a valid non-negative number or empty.");
                setIsLoading(false);
                return;
            }
        }

        const warrantyData = {
            name: name.trim(),
            duration_months: parsedDuration,
            description: description.trim() === '' ? null : description.trim(),
        };

        if (!warrantyData.name) {
            setFormError("Warranty name cannot be empty.");
            setIsLoading(false);
            return;
        }

        try {
            if (isEditing) {
                await apiInstance.put(`/warranties/${warrantyId}`, warrantyData);
            } else {
                await apiInstance.post('/warranties', warrantyData);
            }
            // Ensure path matches App.jsx, e.g., /dashboard/warranties
            navigate('/dashboard/warranties', {
                state: {
                    message: `Warranty "${warrantyData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("Error saving warranty:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} warranty.`;
            setFormError(errorMsg); // Use formError for submission issues
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (isLoading && isEditing && !name && !pageError) return <p style={styles.centeredMessage}>Loading warranty details...</p>;
    if (isLoading && !isEditing && !pageError) return <p style={styles.centeredMessage}>Loading form...</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Warranty' : 'Add New Warranty'}</h2>
            {pageError && <p style={styles.errorBox}>Error: {pageError}</p>}
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>Error: {formError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="warrantyName" style={styles.label}>Warranty Name: *</label>
                    <input type="text" id="warrantyName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={isLoading} placeholder="e.g., 1 Year Limited, 6 Month RTB"/>
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="durationMonths" style={styles.label}>Duration (Months):</label>
                    <input type="number" id="durationMonths" value={durationMonths} onChange={(e) => setDurationMonths(e.target.value)} style={styles.input} disabled={isLoading} min="0" step="1" placeholder="e.g., 12 (Leave blank if not applicable)"/>
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="warrantyDescription" style={styles.label}>Description:</label>
                    <textarea id="warrantyDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows="3" style={styles.textarea} disabled={isLoading} placeholder="Details about the warranty terms and conditions..."/>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}> {isLoading ? 'Saving...' : (isEditing ? 'Update Warranty' : 'Create Warranty')} </button>
                    {/* Ensure path matches App.jsx, e.g., /dashboard/warranties */}
                    <button type="button" onClick={() => navigate('/dashboard/warranties')} style={styles.buttonSecondary} disabled={isLoading}> Cancel </button>
                </div>
            </form>
        </div>
    );
}

// Consistent Form Styles
const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' }, // Added textAlign
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default WarrantyForm;