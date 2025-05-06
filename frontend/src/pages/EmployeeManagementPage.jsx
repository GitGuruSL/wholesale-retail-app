import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

function EmployeeManagementPage() {
    // --- State Variables ---
    const [employees, setEmployees] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { api } = useAuth();

    // State for the "Add Employee" form
    const [newFirstName, setNewFirstName] = useState('');
    const [newLastName, setNewLastName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newEmployeeCode, setNewEmployeeCode] = useState('');
    const [addEmployeeError, setAddEmployeeError] = useState('');
    const [addEmployeeSuccess, setAddEmployeeSuccess] = useState('');


    // State for Editing Employee
    const [isEditing, setIsEditing] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmployeeCode, setEditEmployeeCode] = useState('');
    const [editEmployeeError, setEditEmployeeError] = useState('');
    const [editEmployeeSuccess, setEditEmployeeSuccess] = useState('');


    // --- API Call Functions ---
    const fetchEmployees = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setAddEmployeeError('');
        setAddEmployeeSuccess('');
        setEditEmployeeError('');
        setEditEmployeeSuccess('');
        try {
            const response = await api.get('/employees');
            setEmployees(response.data || []);
        } catch (err) {
            console.error("Error fetching employees:", err);
            setError(err.response?.data?.message || 'Failed to fetch employees.');
        } finally {
            setIsLoading(false);
        }
    }, [api]);

    // --- Event Handlers ---
    const handleAddEmployeeSubmit = async (event) => {
        event.preventDefault();
        setAddEmployeeError('');
        setAddEmployeeSuccess('');

        if (!newFirstName || !newLastName || !newEmail) {
            setAddEmployeeError('First Name, Last Name, and Email are required.');
            return;
        }
        // Add more specific validation as needed (e.g., email format)

        try {
            const newEmployeePayload = {
                first_name: newFirstName,
                last_name: newLastName,
                email: newEmail,
                phone: newPhone || null, // Send null if empty
                employee_code: newEmployeeCode || null, // Send null if empty
            };
            const response = await api.post('/employees', newEmployeePayload);
            
            setEmployees(prevEmployees => [...prevEmployees, response.data]);
            setAddEmployeeSuccess('Employee added successfully!');

            // Clear form
            setNewFirstName('');
            setNewLastName('');
            setNewEmail('');
            setNewPhone('');
            setNewEmployeeCode('');
            setTimeout(() => setAddEmployeeSuccess(''), 3000);

        } catch (err) {
            console.error("Error adding employee:", err);
            setAddEmployeeError(err.response?.data?.message || 'Failed to add employee.');
        }
    };

    const handleDeleteEmployee = async (employeeId) => {
        if (!window.confirm('Are you sure you want to delete this employee? This might affect associated user accounts if not handled carefully on the backend.')) {
            return;
        }
        try {
            await api.delete(`/employees/${employeeId}`);
            setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employeeId));
        } catch (err) {
            console.error(`Error deleting employee ${employeeId}:`, err);
            setError(err.response?.data?.message || `Failed to delete employee ${employeeId}.`);
        }
    };
    
    const handleOpenEditModal = (employee) => {
        setEditingEmployee(employee);
        setEditFirstName(employee.first_name);
        setEditLastName(employee.last_name);
        setEditEmail(employee.email);
        setEditPhone(employee.phone || '');
        setEditEmployeeCode(employee.employee_code || '');
        setIsEditing(true);
        setEditEmployeeError('');
        setEditEmployeeSuccess('');
    };

    const handleCloseEditModal = () => {
        setIsEditing(false);
        setEditingEmployee(null);
    };

    const handleEditEmployeeSubmit = async (event) => {
        event.preventDefault();
        setEditEmployeeError('');
        setEditEmployeeSuccess('');

        if (!editingEmployee || !editFirstName || !editLastName || !editEmail) {
            setEditEmployeeError('First Name, Last Name, and Email are required.');
            return;
        }

        try {
            const updatedEmployeePayload = {
                first_name: editFirstName,
                last_name: editLastName,
                email: editEmail,
                phone: editPhone || null,
                employee_code: editEmployeeCode || null,
            };
            const response = await api.put(`/employees/${editingEmployee.id}`, updatedEmployeePayload);
            
            setEmployees(prevEmployees =>
                prevEmployees.map(emp =>
                    emp.id === editingEmployee.id ? response.data : emp
                )
            );
            setEditEmployeeSuccess('Employee updated successfully!');
            setTimeout(() => {
                handleCloseEditModal();
                setEditEmployeeSuccess('');
            }, 1500);

        } catch (err) {
            console.error(`Error updating employee ${editingEmployee.id}:`, err);
            setEditEmployeeError(err.response?.data?.message || 'Failed to update employee.');
        }
    };


    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Basic inline styles (consider moving to a CSS file or using a styling library)
    const styles = {
        page: { padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto' },
        section: { marginBottom: '30px', padding: '20px', border: '1px solid #eee', borderRadius: '8px', backgroundColor: '#f9f9f9', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' },
        sectionTitle: { marginTop: 0, borderBottom: '1px solid #ddd', paddingBottom: '10px', marginBottom: '20px', color: '#333', fontSize: '1.4em' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px' },
        th: { border: '1px solid #ddd', padding: '10px 12px', textAlign: 'left', backgroundColor: '#f2f2f2', fontWeight: 'bold', whiteSpace: 'nowrap' },
        td: { border: '1px solid #ddd', padding: '10px 12px', verticalAlign: 'middle' },
        formGroup: { marginBottom: '15px' },
        label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' },
        input: { width: '100%', padding: '10px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', maxWidth: '400px' },
        button: { padding: '8px 15px', cursor: 'pointer', border: 'none', borderRadius: '4px', fontSize: '14px', marginRight: '8px', transition: 'background-color 0.2s ease', minWidth: '80px' },
        addButton: { backgroundColor: '#28a745', color: 'white' },
        deleteButton: { backgroundColor: '#dc3545', color: 'white' },
        editButton: { backgroundColor: '#007bff', color: 'white' },
        actionButtons: { display: 'flex', gap: '5px', flexWrap: 'wrap' },
        error: { color: '#dc3545', marginTop: '10px', fontSize: '14px', backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', padding: '8px', borderRadius: '4px' },
        success: { color: '#155724', marginTop: '10px', fontSize: '14px', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', padding: '8px', borderRadius: '4px' },
        loading: { textAlign: 'center', padding: '20px', color: '#555', fontSize: '1.1em' },
        modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
        modalContent: { backgroundColor: 'white', padding: '30px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)', minWidth: '400px', maxWidth: '90%' },
        modalActions: { marginTop: '20px', textAlign: 'right' },
    };

    return (
        <div style={styles.page}>
            <h1>Employee Management</h1>

            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Add New Employee</h2>
                <form onSubmit={handleAddEmployeeSubmit}>
                    <div style={styles.formGroup}>
                        <label htmlFor="newFirstName" style={styles.label}>First Name:</label>
                        <input type="text" id="newFirstName" value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="newLastName" style={styles.label}>Last Name:</label>
                        <input type="text" id="newLastName" value={newLastName} onChange={(e) => setNewLastName(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="newEmail" style={styles.label}>Email:</label>
                        <input type="email" id="newEmail" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={styles.input} required />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="newPhone" style={styles.label}>Phone (Optional):</label>
                        <input type="tel" id="newPhone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="newEmployeeCode" style={styles.label}>Employee Code (Optional):</label>
                        <input type="text" id="newEmployeeCode" value={newEmployeeCode} onChange={(e) => setNewEmployeeCode(e.target.value)} style={styles.input} />
                    </div>
                    {addEmployeeError && <p style={styles.error}>{addEmployeeError}</p>}
                    {addEmployeeSuccess && <p style={styles.success}>{addEmployeeSuccess}</p>}
                    <button type="submit" style={{ ...styles.button, ...styles.addButton }}>Add Employee</button>
                </form>
            </section>

            <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Existing Employees</h2>
                {isLoading && <p style={styles.loading}>Loading employees...</p>}
                {error && <p style={styles.error}>{error}</p>}
                {!isLoading && !error && (
                    <table style={styles.table}>
                        <thead>
                            <tr>
                                <th style={styles.th}>ID</th>
                                <th style={styles.th}>First Name</th>
                                <th style={styles.th}>Last Name</th>
                                <th style={styles.th}>Email</th>
                                <th style={styles.th}>Phone</th>
                                <th style={styles.th}>Emp. Code</th>
                                <th style={styles.th}>Created At</th>
                                <th style={styles.th}>Updated At</th>
                                <th style={styles.th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees.length > 0 ? (
                                employees.map((employee) => (
                                    <tr key={employee.id}>
                                        <td style={styles.td}>{employee.id}</td>
                                        <td style={styles.td}>{employee.first_name}</td>
                                        <td style={styles.td}>{employee.last_name}</td>
                                        <td style={styles.td}>{employee.email}</td>
                                        <td style={styles.td}>{employee.phone || 'N/A'}</td>
                                        <td style={styles.td}>{employee.employee_code || 'N/A'}</td>
                                        <td style={styles.td}>{new Date(employee.created_at).toLocaleString()}</td>
                                        <td style={styles.td}>{new Date(employee.updated_at).toLocaleString()}</td>
                                        <td style={styles.td}>
                                            <div style={styles.actionButtons}>
                                                <button style={{ ...styles.button, ...styles.editButton }} onClick={() => handleOpenEditModal(employee)}>Edit</button>
                                                <button style={{ ...styles.button, ...styles.deleteButton }} onClick={() => handleDeleteEmployee(employee.id)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="9" style={{ ...styles.td, textAlign: 'center' }}>No employees found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </section>

            {isEditing && editingEmployee && (
                <div style={styles.modalOverlay} onClick={handleCloseEditModal}>
                    <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h2 style={styles.sectionTitle}>Edit Employee: {editingEmployee.first_name} {editingEmployee.last_name}</h2>
                        <form onSubmit={handleEditEmployeeSubmit}>
                            <div style={styles.formGroup}>
                                <label htmlFor="editFirstName" style={styles.label}>First Name:</label>
                                <input type="text" id="editFirstName" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} style={styles.input} required />
                            </div>
                            <div style={styles.formGroup}>
                                <label htmlFor="editLastName" style={styles.label}>Last Name:</label>
                                <input type="text" id="editLastName" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} style={styles.input} required />
                            </div>
                            <div style={styles.formGroup}>
                                <label htmlFor="editEmail" style={styles.label}>Email:</label>
                                <input type="email" id="editEmail" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={styles.input} required />
                            </div>
                            <div style={styles.formGroup}>
                                <label htmlFor="editPhone" style={styles.label}>Phone (Optional):</label>
                                <input type="tel" id="editPhone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={styles.input} />
                            </div>
                            <div style={styles.formGroup}>
                                <label htmlFor="editEmployeeCode" style={styles.label}>Employee Code (Optional):</label>
                                <input type="text" id="editEmployeeCode" value={editEmployeeCode} onChange={(e) => setEditEmployeeCode(e.target.value)} style={styles.input} />
                            </div>
                            {editEmployeeError && <p style={styles.error}>{editEmployeeError}</p>}
                            {editEmployeeSuccess && <p style={styles.success}>{editEmployeeSuccess}</p>}
                            <div style={styles.modalActions}>
                                <button type="button" onClick={handleCloseEditModal} style={{ ...styles.button, backgroundColor: '#6c757d', color: 'white' }}>Cancel</button>
                                <button type="submit" style={{ ...styles.button, ...styles.addButton }}>Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmployeeManagementPage;