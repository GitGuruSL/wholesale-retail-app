// frontend/src/components/UnitForm.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api'; // Use environment variables for production

// Component for Adding or Editing a simple Unit definition (name only)
function UnitForm() {
    // Hooks
    const { unitId } = useParams(); // Get unitId from URL parameters if present
    const navigate = useNavigate(); // Hook for programmatic navigation
    const isEditing = Boolean(unitId); // Determine if we are editing or creating

    // State variables
    const [name, setName] = useState(''); // Unit name input
    // Removed states related to base_unit_id, conversion_factor, flags as they are not managed here anymore
    // const [baseUnitId, setBaseUnitId] = useState('');
    // const [conversionFactor, setConversionFactor] = useState('1');
    // const [isSellable, setIsSellable] = useState(true);
    // const [isPurchaseable, setIsPurchaseable] = useState(true);
    // const [baseUnitOptions, setBaseUnitOptions] = useState([]);

    const [loading, setLoading] = useState(false); // Tracks loading state (for API calls)
    const [error, setError] = useState(null); // Stores error messages

    // *** REMOVED useEffect hook that fetched /api/units/base-units ***
    // This form now only deals with the unit name.

    // useEffect hook to fetch unit data when editing
    useEffect(() => {
        if (isEditing) {
            setLoading(true); // Start loading indicator
            setError(null); // Clear previous errors
            axios.get(`${API_BASE_URL}/units/${unitId}`) // Fetch the simple unit data (id, name)
                .then(response => {
                    setName(response.data.name); // Populate form field with fetched name
                    setLoading(false); // Stop loading indicator
                })
                .catch(err => {
                    console.error("Error fetching unit details:", err);
                    setError('Failed to load unit data. It might not exist or the API is down.');
                    setLoading(false); // Stop loading indicator even on error
                });
        } else {
            // If creating a new unit, ensure form is reset
            setName('');
            setError(null);
        }
    }, [unitId, isEditing]); // Dependency array: re-run effect if unitId or isEditing changes

    // Handler for form submission
    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevent default browser form submission
        setLoading(true); // Start loading indicator
        setError(null); // Clear previous errors

        // Prepare data payload for the API (only name)
        const unitData = {
            name: name.trim(), // Trim whitespace from name
        };

        // Basic validation
        if (!unitData.name) {
             setError("Unit name cannot be empty.");
             setLoading(false);
             return;
        }

        try {
            // Choose API endpoint and method based on whether we are editing or creating
            if (isEditing) {
                await axios.put(`${API_BASE_URL}/units/${unitId}`, unitData);
            } else {
                await axios.post(`${API_BASE_URL}/units`, unitData);
            }
            navigate('/units'); // Navigate back to the unit list on success
        } catch (err) {
            console.error("Error saving unit:", err);
            // Set error message based on backend response or provide a default
            setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} unit.`);
        } finally {
            setLoading(false); // Stop loading indicator regardless of success/failure
        }
    };

    // --- Render Logic ---

    // Display loading message while fetching data for editing
    if (loading && isEditing) return <p>Loading unit details...</p>;

    // Render the form
    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? 'Edit Unit' : 'Add New Unit'}</h2>

            {/* Display error message if any */}
            {error && <p style={styles.errorBox}>Error: {error}</p>}

            <form onSubmit={handleSubmit}>
                {/* Unit Name Input */}
                <div style={styles.formGroup}>
                    <label htmlFor="unitName" style={styles.label}>Unit Name: *</label>
                    <input
                        type="text"
                        id="unitName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required // HTML5 validation for required field
                        style={styles.input}
                        disabled={loading} // Disable input while loading
                        placeholder="e.g., Piece, Box, Kg, Pack of 6" // Add placeholder
                    />
                     <small style={styles.helpText}>Enter the name of the unit definition (e.g., Piece, Box, Kg, Pack of 6). Conversion factors are set per product.</small>
                </div>

                {/* Removed fields for base unit, conversion factor, flags */}

                {/* Action Buttons */}
                <div style={styles.buttonGroup}>
                    <button
                        type="submit"
                        disabled={loading} // Disable button while loading
                        style={styles.buttonPrimary}
                    >
                        {loading ? 'Saving...' : (isEditing ? 'Update Unit' : 'Create Unit')}
                    </button>
                    {/* Cancel button navigates back to the list */}
                    <button
                        type="button"
                        onClick={() => navigate('/units')}
                        style={styles.buttonSecondary}
                        disabled={loading} // Disable cancel button while loading
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

// --- Basic Inline Styles ---
const styles = {
    container: { padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif' },
    title: { marginBottom: '20px', color: '#333' },
    errorBox: { color: 'red', border: '1px solid red', padding: '10px', marginBottom: '15px', borderRadius: '4px', backgroundColor: '#ffe6e6' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' },
    helpText: { fontSize: '0.85em', color: '#666', display: 'block', marginTop: '5px' },
    buttonGroup: { marginTop: '25px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px', opacity: 1 },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' },
};


export default UnitForm;
