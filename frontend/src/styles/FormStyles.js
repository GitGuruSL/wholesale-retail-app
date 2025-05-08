const styles = {
    container: { maxWidth: '600px', margin: '20px auto', padding: '20px', boxShadow: '0 0 10px rgba(0,0,0,0.1)', borderRadius: '8px' },
    title: { textAlign: 'center', marginBottom: '20px', color: '#333' },
    formGroup: { marginBottom: '15px' },
    label: { display: 'block', marginBottom: '5px', fontWeight: 'bold', color: '#555' },
    input: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    textarea: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box', minHeight: '80px' },
    select: { width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' },
    buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' },
    buttonPrimary: { padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    buttonSecondary: { padding: '10px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' },
    errorBox: { padding: '10px', marginBottom: '15px', border: '1px solid transparent', borderRadius: '4px', textAlign: 'center' },
    successBox: { padding: '10px', marginBottom: '15px', border: '1px solid transparent', borderRadius: '4px', textAlign: 'center' },
    helpText: { fontSize: '0.8em', color: '#666', marginTop: '4px' },
};
export default styles;