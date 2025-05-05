// frontend/src/components/UnitList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function UnitList() {
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchUnits = useCallback(async () => {
        setLoading(true);
        setError(null);
        setFeedback({ message: null, type: null });
        try {
            // Fetch units (backend route includes base unit name)
            const response = await axios.get(`${API_BASE_URL}/units`);
            setUnits(response.data);
        } catch (err) {
            console.error("Error fetching units:", err);
            setError(err.response?.data?.message || 'Failed to fetch units.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const handleDelete = async (unitId, unitName) => {
        if (!window.confirm(`Are you sure you want to delete unit: "${unitName}" (ID: ${unitId})?\nThis might fail if it's linked to products, stock, or orders.`)) {
            return;
        }

        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/units/${unitId}`);
            setFeedback({ message: `Unit "${unitName}" deleted successfully.`, type: 'success' });
            setUnits(prev => prev.filter(u => u.id !== unitId));
        } catch (err) {
            console.error(`Error deleting unit ${unitId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete unit.';
            setFeedback({ message: errorMsg, type: 'error' });
            setError(errorMsg);
        } finally {
             setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    // Helper to display boolean values nicely
    const renderBoolean = (value) => (
        value ? <span style={{ color: 'green' }}>Yes</span> : <span style={{ color: 'grey' }}>No</span>
    );


    if (loading) return <p>Loading units...</p>;
    if (error && units.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Units</h2>

            {/* Feedback Area */}
            {feedback.message && (
                <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}>
                    {feedback.message}
                </div>
            )}
            {error && units.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}


            <Link to="/units/new">
                <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Unit</button>
            </Link>

            {units.length === 0 && !loading ? (
                <p>No units found.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}>
                            <th style={tableCellStyle}>ID</th>
                            <th style={tableCellStyle}>Unit Name</th>
                            <th style={tableCellStyle}>Base Unit</th>
                            <th style={tableCellStyle}>Factor</th>
                            <th style={tableCellStyle}>Sellable?</th>
                            <th style={tableCellStyle}>Purchaseable?</th>
                            <th style={tableCellStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {units.map((unit, index) => (
                            <tr key={unit.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{unit.id}</td>
                                <td style={tableCellStyle}>{unit.name}</td>
                                <td style={tableCellStyle}>{unit.base_unit_name ? `${unit.base_unit_name} (ID: ${unit.base_unit_id})` : '(Is Base Unit)'}</td>
                                <td style={tableCellStyle}>{unit.conversion_factor}</td>
                                <td style={tableCellStyle}>{renderBoolean(unit.is_sellable)}</td>
                                <td style={tableCellStyle}>{renderBoolean(unit.is_purchaseable)}</td>
                                <td style={tableCellStyle}>
                                    <button
                                        onClick={() => navigate(`/units/edit/${unit.id}`)}
                                        style={{ marginRight: '5px', padding: '5px 8px', cursor:'pointer' }}
                                        title="Edit Unit"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(unit.id, unit.name)}
                                        style={{ padding: '5px 8px', cursor:'pointer', backgroundColor: '#f44336', color: 'white', border:'none', borderRadius:'3px'}}
                                        title="Delete Unit"
                                    >
                                        Delete
                                    </button>
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
const tableCellStyle = {
    padding: '10px 8px',
    textAlign: 'left',
    verticalAlign: 'top',
};

export default UnitList;
