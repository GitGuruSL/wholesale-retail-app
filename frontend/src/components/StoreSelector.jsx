import React from 'react';
import { useStore } from '../context/useStore';

function StoreSelector() {
    const { stores, selectedStore, selectStore, isLoading, error } = useStore();

    if (isLoading) {
        return <select disabled style={{ width: '100%', padding: '5px' }}><option>Loading stores...</option></select>;
    }

    if (error) {
        return <select disabled style={{ width: '100%', padding: '5px' }}><option>Error loading stores</option></select>;
    }

    if (!stores || stores.length === 0) {
        return <select disabled style={{ width: '100%', padding: '5px' }}><option>No stores available</option></select>;
    }

    const handleStoreChange = (event) => {
        const storeIdString = event.target.value;
        if (storeIdString === "") {
            selectStore(null); // Allow deselecting or selecting a "null" option if you add one
        } else {
            const storeId = parseInt(storeIdString, 10);
            const storeToSelect = stores.find(s => s.id === storeId);
            if (storeToSelect) {
                selectStore(storeToSelect); // Pass the full store object
            }
        }
    };

    return (
        <select
            id="store-select"
            // Use selectedStore.id if a store is selected, otherwise an empty string
            value={selectedStore ? selectedStore.id.toString() : ''}
            onChange={handleStoreChange}
            style={{ width: '100%', padding: '5px' }}
        >
            {/* You might want a "No Store" or "All Stores" option for global_admin */}
            <option value="" disabled={!!selectedStore}>
                {selectedStore ? 'Change store...' : 'Select a store'}
            </option>
            {stores.map((store) => (
                <option key={store.id} value={store.id.toString()}>
                    {store.name} (ID: {store.id})
                </option>
            ))}
        </select>
    );
}

export default StoreSelector;