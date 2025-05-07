import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Consistent styling (can be shared or component-specific)
const styles = {
    formContainer: { padding: '20px', maxWidth: '600px', margin: '20px auto', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { textAlign: 'center', color: '#333', marginBottom: '25px'},
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box', fontSize: '1em' },
    buttonContainer: { marginTop: '25px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    button: { padding: '10px 20px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em', fontWeight: 'bold' },
    buttonSave: { backgroundColor: '#28a745', color: 'white' },
    buttonCancel: { backgroundColor: '#6c757d', color: 'white' },
    errorText: { color: 'red', marginBottom: '15px', textAlign: 'center' },
    formSpecificErrorText: { color: 'red', fontSize: '0.9em', marginTop: '5px'},
    centeredMessage: { textAlign: 'center', padding: '30px', fontSize: '1.1em', color: '#666' }
};

const UnitForm = () => {
    const { unitId } = useParams(); // For edit mode
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth(); // Using api.js via AuthContext

    const [name, setUnitName] = useState('');
    // const [abbreviation, setAbbreviation] = useState(''); // If you have an abbreviation field

    const [isLoading, setIsLoading] = useState(false); // For form submission and data fetching
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState('');

    const isEditMode = Boolean(unitId);

    const fetchUnitDetails = useCallback(async () => {
        if (!isEditMode || !apiInstance || !isAuthenticated) return;

        console.log(`[UnitForm] Fetching unit details for ID: ${unitId}`);
        setIsLoading(true);
        setPageError(null);
        try {
            const response = await apiInstance.get(`/units/${unitId}`);
            setUnitName(response.data.name);
            // setAbbreviation(response.data.abbreviation || '');
            console.log("[UnitForm] Unit data fetched:", response.data);
        } catch (err) {
            console.error("[UnitForm] Failed to fetch unit:", err);
            setPageError(err.response?.data?.message || "Failed to load unit data. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [unitId, apiInstance, isAuthenticated, isEditMode]);

    useEffect(() => {
        if (isEditMode && !authLoading && isAuthenticated && apiInstance) {
            fetchUnitDetails();
        }
    }, [isEditMode, fetchUnitDetails, authLoading, isAuthenticated, apiInstance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!apiInstance || !isAuthenticated) {
            setPageError("Authentication error. Please log in again.");
            return;
        }
        if (!name.trim()) {
            setFormError("Unit name cannot be empty.");
            return;
        }
        setFormError('');
        setIsLoading(true);
        setPageError(null);

        const unitData = { name /*, abbreviation */ };
        console.log("[UnitForm] Submitting data:", unitData);

        try {
            if (isEditMode) {
                await apiInstance.put(`/units/${unitId}`, unitData);
                console.log("[UnitForm] Unit updated successfully.");
            } else {
                await apiInstance.post('/units', unitData);
                console.log("[UnitForm] Unit created successfully.");
            }
            navigate('/dashboard/units', { state: { message: `Unit "${name}" ${isEditMode ? 'updated' : 'created'} successfully.`, type: 'success' } });
        } catch (err) {
            console.error("[UnitForm] Failed to save unit:", err);
            const errMsg = err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} unit.`;
            setPageError(errMsg);
             if (err.response?.data?.errors) {
                setFormError(Object.values(err.response.data.errors).join(', '));
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    if (!isAuthenticated) return <p style={styles.centeredMessage}>Please log in to manage units.</p>;
    if (isLoading && isEditMode && !name) return <p style={styles.centeredMessage}>Loading unit data...</p>;

    return (
        <div style={styles.formContainer}>
            <h2 style={styles.title}>{isEditMode ? 'Edit Unit' : 'Add New Unit'}</h2>
            {pageError && <p style={styles.errorText}>{pageError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="unitName" style={styles.label}>Unit Name:</label>
                    <input
                        type="text"
                        id="unitName"
                        style={styles.input}
                        value={name}
                        onChange={(e) => setUnitName(e.target.value)}
                        placeholder="e.g., Kilogram, Piece, Liter"
                    />
                    {formError && <p style={styles.formSpecificErrorText}>{formError}</p>}
                </div>

                {/* Example for abbreviation:
                <div style={styles.formGroup}>
                    <label htmlFor="abbreviation" style={styles.label}>Abbreviation (Optional):</label>
                    <input
                        type="text"
                        id="abbreviation"
                        style={styles.input}
                        value={abbreviation}
                        onChange={(e) => setAbbreviation(e.target.value)}
                        placeholder="e.g., kg, pc, L"
                    />
                </div>
                */}

                <div style={styles.buttonContainer}>
                     <button type="button" onClick={() => navigate('/dashboard/units')} style={{...styles.button, ...styles.buttonCancel}} disabled={isLoading}>
                        Cancel
                    </button>
                    <button type="submit" style={{...styles.button, ...styles.buttonSave}} disabled={isLoading}>
                        {isLoading ? 'Saving...' : (isEditMode ? 'Update Unit' : 'Create Unit')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UnitForm;