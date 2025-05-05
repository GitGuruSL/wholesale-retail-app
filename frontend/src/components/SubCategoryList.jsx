// frontend/src/components/SubCategoryList.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:5001/api';

function SubCategoryList() {
    const [subCategories, setSubCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedback, setFeedback] = useState({ message: null, type: null });
    const navigate = useNavigate();

    const fetchSubCategories = useCallback(async () => {
        setLoading(true);
        setError(null);
        setFeedback({ message: null, type: null });
        try {
            // Fetch sub-categories (backend route includes parent category name)
            const response = await axios.get(`${API_BASE_URL}/sub-categories`);
            setSubCategories(response.data);
        } catch (err) {
            console.error("Error fetching sub-categories:", err);
            setError(err.response?.data?.message || 'Failed to fetch sub-categories.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubCategories();
    }, [fetchSubCategories]);

    const handleDelete = async (subCategoryId, subCategoryName) => {
        if (!window.confirm(`Are you sure you want to delete sub-category: "${subCategoryName}" (ID: ${subCategoryId})?\nThis might fail if it's linked to products.`)) {
            return;
        }

        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/sub-categories/${subCategoryId}`);
            setFeedback({ message: `Sub-category "${subCategoryName}" deleted successfully.`, type: 'success' });
            setSubCategories(prev => prev.filter(sc => sc.id !== subCategoryId));
        } catch (err) {
            console.error(`Error deleting sub-category ${subCategoryId}:`, err);
            const errorMsg = err.response?.data?.message || 'Failed to delete sub-category.';
            setFeedback({ message: errorMsg, type: 'error' });
            setError(errorMsg);
        } finally {
             setTimeout(() => setFeedback({ message: null, type: null }), 5000);
        }
    };

    if (loading) return <p>Loading sub-categories...</p>;
    if (error && subCategories.length === 0) return <p style={{ color: 'red' }}>Error: {error}</p>;

    return (
        <div>
            <h2>Manage Sub-Categories</h2>

            {/* Feedback Area */}
            {feedback.message && (
                <div style={{ padding: '10px', marginBottom: '15px', border: '1px solid', borderRadius: '4px', borderColor: feedback.type === 'success' ? 'green' : 'red', color: feedback.type === 'success' ? 'green' : 'red', backgroundColor: feedback.type === 'success' ? '#e6ffed' : '#ffe6e6' }}>
                    {feedback.message}
                </div>
            )}
            {error && subCategories.length > 0 && (<p style={{ color: 'red' }}>Warning: Could not refresh list. Error: {error}</p>)}


            <Link to="/sub-categories/new">
                <button style={{ marginBottom: '15px', padding: '8px 12px' }}>Add New Sub-Category</button>
            </Link>

            {subCategories.length === 0 && !loading ? (
                <p>No sub-categories found.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #ccc', backgroundColor: '#f8f8f8' }}>
                            <th style={tableCellStyle}>ID</th>
                            <th style={tableCellStyle}>Sub-Category Name</th>
                            <th style={tableCellStyle}>Parent Category</th> {/* Added Parent Column */}
                            <th style={tableCellStyle}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subCategories.map((sc, index) => (
                            <tr key={sc.id} style={{ borderBottom: '1px solid #eee', backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                <td style={tableCellStyle}>{sc.id}</td>
                                <td style={tableCellStyle}>{sc.name}</td>
                                <td style={tableCellStyle}>{sc.category_name} (ID: {sc.category_id})</td> {/* Display Parent Name */}
                                <td style={tableCellStyle}>
                                    <button
                                        onClick={() => navigate(`/sub-categories/edit/${sc.id}`)}
                                        style={{ marginRight: '5px', padding: '5px 8px', cursor:'pointer' }}
                                        title="Edit Sub-Category"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(sc.id, sc.name)}
                                        style={{ padding: '5px 8px', cursor:'pointer', backgroundColor: '#f44336', color: 'white', border:'none', borderRadius:'3px'}}
                                        title="Delete Sub-Category"
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

export default SubCategoryList;
