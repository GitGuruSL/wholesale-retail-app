// frontend/src/components/ManufacturerList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function ManufacturerList() {
    const [manufacturers, setManufacturers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchManufacturers = useCallback(async () => { /* ... same as before ... */
        setLoading(true); setError(null); setFeedback({ message: null, type: null });
        try { const response = await axios.get(`${API_BASE_URL}/manufacturers`); setManufacturers(response.data); }
        catch (err) { console.error("Error fetching manufacturers:", err); setError(err.response?.data?.message || 'Failed to fetch manufacturers.'); }
        finally { setLoading(false); }
     }, []);

    useEffect(() => { fetchManufacturers(); }, [fetchManufacturers]);

    const handleDelete = async (manufacturerId, manufacturerName) => { /* ... same as before ... */
        if (!window.confirm(`Are you sure you want to delete manufacturer: "${manufacturerName}" (ID: ${manufacturerId})?\nThis might fail if they are linked to products.`)) return;
        setError(null);
        try { await axios.delete(`${API_BASE_URL}/manufacturers/${manufacturerId}`); setFeedback({ message: `Manufacturer "${manufacturerName}" deleted successfully.`, type: 'success' }); setManufacturers(prev => prev.filter(m => m.id !== manufacturerId)); }
        catch (err) { console.error(`Error deleting manufacturer ${manufacturerId}:`, err); const errorMsg = err.response?.data?.message || 'Failed to delete manufacturer.'; setFeedback({ message: errorMsg, type: 'error' }); setError(errorMsg); }
        finally { setTimeout(() => setFeedback({ message: null, type: null }), 5000); }
     };

    if (loading) return <p>Loading manufacturers...</p>;
    if (error && manufacturers.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Manufacturers</h2>
            {feedback.message && ( <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}> {feedback.message} </div> )}
            {error && manufacturers.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}

            <Link to="/manufacturers/new"> <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Manufacturer</button> </Link>

            {manufacturers.length === 0 && !loading ? ( <p>No manufacturers found.</p> ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9em' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}>
                            <th style={tableCellStyle}>ID</th>
                            <th style={tableCellStyle}>Name</th>
                            <th style={tableCellStyle}>City</th>
                            <th style={tableCellStyle}>Telephone</th>
                            <th style={tableCellStyle}>Email</th>
                            {/* <th style={tableCellStyle}>Contact Person</th> */}
                            <th style={tableCellStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {manufacturers.map((m, index) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{m.id}</td>
                                <td style={tableCellStyle}>{m.name}</td>
                                <td style={tableCellStyle}>{m.city || '-'}</td>
                                <td style={tableCellStyle}>{m.telephone || '-'}</td>
                                <td style={tableCellStyle}>{m.email || '-'}</td>
                                {/* <td style={tableCellStyle}>{m.contact_person || '-'}</td> */}
                                <td style={tableCellStyle}>
                                    <button onClick={() => navigate(`/manufacturers/edit/${m.id}`)} style={actionButtonStyle} title="Edit Manufacturer"> Edit </button>
                                    <button onClick={() => handleDelete(m.id, m.name)} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete Manufacturer"> Delete </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
// Basic styles
const tableCellStyle = { padding: '8px 6px', textAlign: 'left', verticalAlign: 'top', borderRight: '1px solid #eee' };
const actionButtonStyle = { marginRight: '5px', padding: '4px 8px', fontSize: '0.85em', cursor:'pointer', border:'1px solid #ccc', borderRadius:'3px', backgroundColor:'#eee' };

export default ManufacturerList;
