import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ManufacturerForm() {
    const { manufacturerId } = useParams(); // This is already correct
    const navigate = useNavigate();
    const { apiInstance, isAuthenticated, isLoading: authLoading } = useAuth();
    const isEditing = Boolean(manufacturerId);

    console.log(`[ManufacturerForm] Initializing. Is Editing: ${isEditing}, Manufacturer ID: ${manufacturerId}`);

    const [name, setName] = useState('');
    const [contactInfo, setContactInfo] = useState('');
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [telephone, setTelephone] = useState('');
    const [fax, setFax] = useState('');
    const [email, setEmail] = useState('');
    const [relationshipStartDate, setRelationshipStartDate] = useState('');
    const [taxDetails, setTaxDetails] = useState('');
    const [notes, setNotes] = useState('');

    const [isLoading, setIsLoading] = useState(false); // Form-specific loading
    const [pageError, setPageError] = useState(null);
    const [formError, setFormError] = useState(null);

    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (e) {
            console.error("[ManufacturerForm] Error formatting date:", dateString, e);
            return '';
        }
    };

    const fetchManufacturerData = useCallback(async () => {
        console.log(`[ManufacturerForm fetchManufacturerData] Called. isEditing: ${isEditing}, manufacturerId: ${manufacturerId}, apiInstance: ${!!apiInstance}, isAuthenticated: ${isAuthenticated}`);
        if (!isEditing || !manufacturerId || !apiInstance || !isAuthenticated) {
            console.warn("[ManufacturerForm fetchManufacturerData] Pre-conditions not met for fetching.");
            if (!isEditing) console.warn(" - Not in edit mode.");
            if (!manufacturerId) console.warn(" - No manufacturerId.");
            if (!apiInstance) console.warn(" - apiInstance not available.");
            if (!isAuthenticated) console.warn(" - Not authenticated.");
            setIsLoading(false); // Ensure loading is stopped if we bail early
            return;
        }
        console.log(`[ManufacturerForm fetchManufacturerData] Attempting to fetch details for ID: ${manufacturerId}`);
        setIsLoading(true);
        setPageError(null);
        setFormError(null);
        try {
            const response = await apiInstance.get(`/manufacturers/${manufacturerId}`);
            const data = response.data;
            console.log("[ManufacturerForm fetchManufacturerData] Raw data received:", data);

            setName(data.name || '');
            setContactInfo(data.contact_info || '');
            setAddress(data.address || '');
            setCity(data.city || '');
            setContactPerson(data.contact_person || '');
            setTelephone(data.telephone || '');
            setFax(data.fax || '');
            setEmail(data.email || '');
            setRelationshipStartDate(formatDateForInput(data.relationship_start_date));
            setTaxDetails(data.tax_details || '');
            setNotes(data.notes || '');
            console.log("[ManufacturerForm fetchManufacturerData] State updated with fetched data.");
        } catch (err) {
            console.error("[ManufacturerForm fetchManufacturerData] Error fetching manufacturer details:", err.response || err.message || err);
            const errorMsg = err.response?.data?.message || 'Failed to load manufacturer data.';
            setPageError(errorMsg);
        } finally {
            setIsLoading(false);
            console.log("[ManufacturerForm fetchManufacturerData] Fetch attempt finished.");
        }
    }, [manufacturerId, isEditing, apiInstance, isAuthenticated]); // Dependencies for useCallback

    useEffect(() => {
        console.log(`[ManufacturerForm useEffect] Running. AuthLoading: ${authLoading}, IsAuthenticated: ${isAuthenticated}, IsEditing: ${isEditing}, ManufacturerID: ${manufacturerId}, apiInstance: ${!!apiInstance}`);
        if (authLoading) {
            console.log("[ManufacturerForm useEffect] Auth is loading, returning.");
            return;
        }
        if (!isAuthenticated) {
            console.log("[ManufacturerForm useEffect] Not authenticated. Setting page error.");
            setPageError("Authentication required. Please log in.");
            setIsLoading(false); // Ensure loading is stopped
            return;
        }

        if (isEditing) {
            console.log("[ManufacturerForm useEffect] Edit mode. Checking if apiInstance exists.");
            if (apiInstance && manufacturerId) { // Ensure manufacturerId is also present
                console.log("[ManufacturerForm useEffect] apiInstance exists and manufacturerId present. Calling fetchManufacturerData.");
                fetchManufacturerData();
            } else if (!apiInstance) {
                console.warn("[ManufacturerForm useEffect] apiInstance not available in edit mode (after auth check).");
                setPageError("API client not available. Cannot fetch data.");
                setIsLoading(false);
            } else if (!manufacturerId) {
                console.warn("[ManufacturerForm useEffect] manufacturerId not available in edit mode (after auth check).");
                setPageError("Manufacturer ID missing. Cannot fetch data.");
                setIsLoading(false);
            }
        } else { // Create mode
            console.log("[ManufacturerForm useEffect] Create mode. Resetting form fields.");
            setName('');
            setContactInfo('');
            setAddress('');
            setCity('');
            setContactPerson('');
            setTelephone('');
            setFax('');
            setEmail('');
            setRelationshipStartDate('');
            setTaxDetails('');
            setNotes('');
            setPageError(null);
            setFormError(null);
            setIsLoading(false); // Ensure loading is false for create mode
        }
    }, [isEditing, manufacturerId, authLoading, isAuthenticated, apiInstance, fetchManufacturerData]); // Added fetchManufacturerData

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("[ManufacturerForm handleSubmit] Form submitted.");
        if (!apiInstance || !isAuthenticated) {
            setFormError("Authentication error or API not available. Please log in again.");
            return;
        }
        if (!name.trim()) {
            setFormError("Manufacturer name cannot be empty.");
            return; // Don't set isLoading(false) here, let finally block handle it
        }
        if (email.trim() && !/\S+@\S+\.\S+/.test(email.trim())) {
            setFormError("Please enter a valid email address or leave it blank.");
            return;
        }

        setIsLoading(true);
        setPageError(null);
        setFormError(null);

        const manufacturerData = {
            name: name.trim(),
            contact_info: contactInfo.trim() === '' ? null : contactInfo.trim(),
            address: address.trim() === '' ? null : address.trim(),
            city: city.trim() === '' ? null : city.trim(),
            contact_person: contactPerson.trim() === '' ? null : contactPerson.trim(),
            telephone: telephone.trim() === '' ? null : telephone.trim(),
            fax: fax.trim() === '' ? null : fax.trim(),
            email: email.trim() === '' ? null : email.trim(),
            relationship_start_date: relationshipStartDate.trim() === '' ? null : relationshipStartDate,
            tax_details: taxDetails.trim() === '' ? null : taxDetails.trim(),
            // notes: notes.trim() === '' ? null : notes.trim(), // REMOVE THIS LINE
        };
        console.log("[ManufacturerForm handleSubmit] Data to be sent:", manufacturerData);

        try {
            if (isEditing) {
                console.log(`[ManufacturerForm handleSubmit] Updating manufacturer ID: ${manufacturerId}`);
                await apiInstance.put(`/manufacturers/${manufacturerId}`, manufacturerData);
            } else {
                console.log("[ManufacturerForm handleSubmit] Creating new manufacturer.");
                await apiInstance.post('/manufacturers', manufacturerData);
            }
            navigate('/dashboard/manufacturers', {
                state: {
                    message: `Manufacturer "${manufacturerData.name}" ${isEditing ? 'updated' : 'created'} successfully.`,
                    type: 'success'
                }
            });
        } catch (err) {
            console.error("[ManufacturerForm handleSubmit] Error saving manufacturer:", err.response || err.message || err);
            const errorMsg = err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} manufacturer.`;
            setFormError(errorMsg);
        } finally {
            setIsLoading(false);
            console.log("[ManufacturerForm handleSubmit] Submit attempt finished.");
        }
    };

    if (authLoading) return <p style={styles.centeredMessage}>Authenticating...</p>;
    // Adjusted loading message conditions
    if (isLoading && isEditing && !name && !pageError) return <p style={styles.centeredMessage}>Loading manufacturer details...</p>;
    if (isLoading && !isEditing && !pageError) return <p style={styles.centeredMessage}>Preparing form...</p>;


    return (
        <div style={styles.container}>
            <h2 style={styles.title}>{isEditing ? `Edit Manufacturer (ID: ${manufacturerId})` : 'Add New Manufacturer'}</h2>
            {pageError && <p style={styles.errorBox}>Page Error: {pageError}</p>}
            {formError && <p style={{...styles.errorBox, backgroundColor: '#ffe6e6', borderColor: 'red', color: 'red'}}>Form Error: {formError}</p>}
            <form onSubmit={handleSubmit}>
                <div style={styles.formGroup}>
                    <label htmlFor="manufacturerName" style={styles.label}>Manufacturer Name: *</label>
                    <input type="text" id="manufacturerName" value={name} onChange={(e) => setName(e.target.value)} required style={styles.input} disabled={isLoading} placeholder="e.g., Sony, Samsung, Generic Corp"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="contactPerson" style={styles.label}>Contact Person:</label>
                    <input type="text" id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} style={styles.input} disabled={isLoading} placeholder="e.g., John Doe"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="email" style={styles.label}>Email:</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} disabled={isLoading} placeholder="e.g., contact@example.com"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="telephone" style={styles.label}>Telephone:</label>
                    <input type="tel" id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} style={styles.input} disabled={isLoading} placeholder="e.g., +1-555-123-4567"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="fax" style={styles.label}>Fax:</label>
                    <input type="tel" id="fax" value={fax} onChange={(e) => setFax(e.target.value)} style={styles.input} disabled={isLoading} placeholder="e.g., +1-555-765-4321"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="address" style={styles.label}>Address:</label>
                    <textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} rows="3" style={styles.textarea} disabled={isLoading} placeholder="e.g., 123 Main St"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="city" style={styles.label}>City:</label>
                    <input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} style={styles.input} disabled={isLoading} placeholder="e.g., Anytown"/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="relationshipStartDate" style={styles.label}>Relationship Start Date:</label>
                    <input type="date" id="relationshipStartDate" value={relationshipStartDate} onChange={(e) => setRelationshipStartDate(e.target.value)} style={styles.input} disabled={isLoading}/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="taxDetails" style={styles.label}>Tax Details:</label>
                    <input type="text" id="taxDetails" value={taxDetails} onChange={(e) => setTaxDetails(e.target.value)} style={styles.input} disabled={isLoading} placeholder="e.g., VAT ID, Tax Reg No."/>
                </div>
                <div style={styles.formGroup}>
                    <label htmlFor="contactInfo" style={styles.label}>General Contact Info/Internal Notes:</label>
                    <textarea id="contactInfo" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} rows="3" style={styles.textarea} disabled={isLoading} placeholder="Additional contact details or internal notes..."/>
                </div>
                 <div style={styles.formGroup}>
                    <label htmlFor="notes" style={styles.label}>Specific Notes (if different from above):</label>
                    <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3" style={styles.textarea} disabled={isLoading} placeholder="Specific remarks or details..."/>
                </div>
                <div style={styles.buttonGroup}>
                    <button type="submit" disabled={isLoading} style={styles.buttonPrimary}> {isLoading ? 'Saving...' : (isEditing ? 'Update Manufacturer' : 'Create Manufacturer')} </button>
                    <button type="button" onClick={() => navigate('/dashboard/manufacturers')} style={styles.buttonSecondary} disabled={isLoading}> Cancel </button>
                </div>
            </form>
        </div>
    );
}

const styles = {
    container: { padding: '20px', maxWidth: '700px', margin: '40px auto', fontFamily: 'Arial, sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', borderRadius: '8px', backgroundColor: '#fff' },
    title: { marginBottom: '25px', color: '#333', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '15px' },
    centeredMessage: { textAlign: 'center', padding: '40px', fontSize: '1.1em', color: '#666' },
    errorBox: { color: '#D8000C', border: '1px solid #FFBABA', padding: '10px 15px', marginBottom: '20px', borderRadius: '4px', backgroundColor: '#FFD2D2', textAlign: 'center' },
    formGroup: { marginBottom: '20px' },
    label: { display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1em' },
    textarea: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontSize: '1em' },
    buttonGroup: { marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' },
    buttonPrimary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
    buttonSecondary: { padding: '10px 20px', cursor: 'pointer', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1em' },
};

export default ManufacturerForm;