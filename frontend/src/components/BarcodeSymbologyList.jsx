// frontend/src/components/BarcodeSymbologyList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function BarcodeSymbologyList() {
    const [symbologies, setSymbologies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchSymbologies = useCallback(async () => {
        setLoading(true); setError(null); setFeedback({ message: null, type: null });
        try {
            const response = await axios.get(`${API_BASE_URL}/barcode-symbologies`);
            setSymbologies(response.data);
        } catch (err) { console.error("Error fetching symbologies:", err); setError(err.response?.data?.message || 'Failed to fetch barcode symbologies.'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchSymbologies(); }, [fetchSymbologies]);

    const handleDelete = async (symbologyId, symbologyName) => {
        if (!window.confirm(`Are you sure you want to delete symbology: "${symbologyName}" (ID: ${symbologyId})?\nThis might fail if it's linked to products.`)) return;
        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/barcode-symbologies/${symbologyId}`);
            setFeedback({ message: `Symbology "${symbologyName}" deleted successfully.`, type: 'success' });
            setSymbologies(prev => prev.filter(s => s.id !== symbologyId));
        } catch (err) { console.error(`Error deleting symbology ${symbologyId}:`, err); const errorMsg = err.response?.data?.message || 'Failed to delete symbology.'; setFeedback({ message: errorMsg, type: 'error' }); setError(errorMsg); }
        finally { setTimeout(() => setFeedback({ message: null, type: null }), 5000); }
    };

    if (loading) return <p>Loading barcode symbologies...</p>;
    if (error && symbologies.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Barcode Types</h2>
            {feedback.message && ( <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}> {feedback.message} </div> )}
            {error && symbologies.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}

            <Link to="/barcode-symbologies/new"> <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Barcode Type</button> </Link>

            {symbologies.length === 0 && !loading ? ( <p>No barcode symbologies found.</p> ) : (
                <table style={{ width: '100%', maxWidth:'600px', borderCollapse: 'collapse' }}>
                    <thead> <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}> <th style={tableCellStyle}>ID</th> <th style={tableCellStyle}>Name</th> <th style={tableCellStyle}>Actions</th> </tr> </thead>
                    <tbody>
                        {symbologies.map((symbology, index) => (
                            <tr key={symbology.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{symbology.id}</td>
                                <td style={tableCellStyle}>{symbology.name}</td>
                                <td style={tableCellStyle}>
                                    <button onClick={() => navigate(`/barcode-symbologies/edit/${symbology.id}`)} style={actionButtonStyle} title="Edit Symbology"> Edit </button>
                                    <button onClick={() => handleDelete(symbology.id, symbology.name)} style={{...actionButtonStyle, backgroundColor: '#dc3545', color: 'white'}} title="Delete Symbology"> Delete </button>
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

export default BarcodeSymbologyList;
