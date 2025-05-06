import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function UnitForm() {
    const { unitId } = useParams();
    const navigate = useNavigate();
    const { api } = useAuth();
    const isEditing = Boolean(unitId);

    const [name, setName] = useState('');
    const [abbreviation, setAbbreviation] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchUnitData = useCallback(async () => {
        if (!isEditing) return;
        setLoading(true);
        setError(null);
        try {
            const response = await api.get(`/units/${unitId}`);
            setName(response.data.name);
            setAbbreviation(response.data.abbreviation || '');
        } catch (err) {
            console.error("Error fetching unit details:", err);
            const errorMsg = err.response?.data?.message || 'Failed to load unit data.';
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not fetch unit. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    }, [unitId, isEditing, api]);

    useEffect(() => {
        if (isEditing) {
            fetchUnitData();
        } else {
            // Reset form for new entry
            setName('');
            setAbbreviation('');
            setError(null);
        }
    }, [isEditing, fetchUnitData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const unitData = {
            name: name.trim(),
            abbreviation: abbreviation.trim() === '' ? null : abbreviation.trim(),
        };

        if (!unitData.name) {
            setError("Unit name cannot be empty.");
            setLoading(false);
            return;
        }

        try {
            if (isEditing) {
                await api.put(`/units/${unitId}`, unitData);
            } else {
                await api.post('/units', unitData);
            }
            navigate('/units');
        } catch (err) {
            console.error("Error saving unit:", err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} unit.`;
            if (err.response?.status === 401 || err.response?.status === 403) {
                setError('Unauthorized: Could not save unit. Please log in again.');
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing && !name) return <p style={styles.centeredMessage}>Loading unit details...</p>;

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Unit' : 'Add New Unit'}</h2>
            {error && <p style={styles.errorBox}>Error: {error}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="unitName" style={styles.label}>Unit Name: *</label>
                    <input
                        type="text"
                        id="unitName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        style={styles.input}
                        disabled={loading}
                        placeholder="e.g., Piece, Box, Kilogram"
                    />
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="abbreviation" style={styles.label}>Abbreviation (Optional):</label>
                    <input
                        type="text"
                        id="abbreviation"
                        value={abbreviation}
                        onChange={(e) => setAbbreviation(e.target.value)}
                        style={styles.input}
                        disabled={loading}
                        placeholder="e.g., pc, box, kg"
                    />
                    <small style={styles.helpText}>A short code for the unit, like 'kg' for Kilogram.</small>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={loading} style={styles.buttonPrimary}>
                        {loading ? 'Saving...' : (isEditing ? 'Update Unit' : 'Create Unit')}
                    </button>
                    <button type="button" onClick={() => navigate('/units')} style={styles.buttonSecondary} disabled={loading}>
                        Cancel
                    </button>
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
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    helpText: { fontSize: '0.85em', color: '#666', display: 'block', marginTop: '5px' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default UnitForm;