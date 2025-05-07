import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export const StoreContext = createContext(null);

export const useStore = () => {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};

export const StoreProvider = ({ children }) => {
    const { user, api: authApi, isAuthenticated, isLoading: authIsLoading } = useAuth();

    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState(null);
    const [isLoading, setIsLoading] = useState(false); // Loading state for fetching stores
    const [error, setError] = useState(null);

    const fetchStoresForUser = useCallback(async () => {
        if (!isAuthenticated || !user || !authApi) {
            console.log("[StoreContext] fetchStores: Conditions not met (not authenticated, no user, or no API). Clearing stores.");
            setStores([]);
            // setSelectedStore(null); // Moved to the effect that depends on stores
            return;
        }
        
        console.log(`[StoreContext] fetchStoresForUser triggered. User Role: ${user.role_name}, User ID: ${user.id}`);
        setIsLoading(true);
        setError(null);
        try {
            let response;
            if (user.role_name === ROLES.GLOBAL_ADMIN) {
                console.log("[StoreContext] User is global_admin, fetching all stores for selector.");
                response = await authApi.get('/stores?type=selector'); // Assuming a 'selector' type gives a lean list
                setStores(response.data || []);
            } else if (user.associated_store_ids && user.associated_store_ids.length > 0) {
                // For users with specific store associations
                // This part might need adjustment based on how your API handles fetching multiple specific stores
                // For simplicity, if only one associated store, fetch it directly.
                // If multiple, you might need a batch endpoint or fetch all accessible and filter.
                if (user.associated_store_ids.length === 1) {
                    const storeId = user.associated_store_ids[0];
                    console.log(`[StoreContext] User associated with single store_id: ${storeId}, fetching that store.`);
                    response = await authApi.get(`/stores/${storeId}`);
                    setStores(response.data ? [response.data] : []); // Ensure it's an array
                } else {
                    console.log(`[StoreContext] User associated with multiple stores: [${user.associated_store_ids.join(',')}]. Fetching all accessible stores and filtering.`);
                    // Example: Fetch all stores the user might have access to and then filter
                    // This depends on your '/stores' endpoint capabilities
                    response = await authApi.get('/stores'); 
                    const userStores = (response.data || []).filter(store => user.associated_store_ids.includes(store.id));
                    setStores(userStores);
                }
            } else {
                console.warn("[StoreContext] User is not global_admin and has no associated store_ids. No stores to fetch for selection.");
                setStores([]);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || err.message || "Failed to fetch stores.";
            console.error("[StoreContext] Error fetching stores:", errorMessage, err);
            setError(errorMessage);
            setStores([]);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAuthenticated, authApi]); // Removed ROLES.GLOBAL_ADMIN as it's a constant

    useEffect(() => {
        if (isAuthenticated && user && !authIsLoading) {
            fetchStoresForUser();
        } else if (!isAuthenticated && !authIsLoading) {
            console.log("[StoreContext] User logged out or session ended. Clearing stores and selected store.");
            setStores([]);
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
        }
    }, [isAuthenticated, user, authIsLoading, fetchStoresForUser]);

    const selectStore = useCallback((storeToSelect) => {
        if (storeToSelect && storeToSelect.id) {
            console.log("[StoreContext] selectStore called. Selecting store:", storeToSelect);
            setSelectedStore(storeToSelect);
            localStorage.setItem('selectedStoreId', storeToSelect.id.toString());
        } else if (storeToSelect === null) { // Explicitly allow setting to null
            console.log("[StoreContext] selectStore called with null. Clearing selected store.");
            setSelectedStore(null);
            localStorage.removeItem('selectedStoreId');
        } else {
            console.warn("[StoreContext] selectStore called with invalid store object:", storeToSelect);
        }
    }, []);


    // Effect to initialize selectedStore from localStorage or based on available stores
    useEffect(() => {
        console.log(`[StoreContext-SelectEffect] Running. AuthLoading: ${authIsLoading}, StoresLoading: ${isLoading}. Stores count: ${stores.length}. Current selectedStore ID: ${selectedStore?.id}`);

        if (authIsLoading || isLoading) {
            console.log("[StoreContext-SelectEffect] Bailing: Auth or Stores still loading.");
            return; 
        }

        // If stores are loaded and available
        if (stores.length > 0) {
            const storedStoreIdString = localStorage.getItem('selectedStoreId');
            console.log(`[StoreContext-SelectEffect] Stores available. localStorage selectedStoreId: '${storedStoreIdString}'`);

            let newSelectedStore = null;

            if (storedStoreIdString) {
                const storedStoreId = parseInt(storedStoreIdString, 10);
                const storeFromLocalStorage = stores.find(s => s.id === storedStoreId);

                if (storeFromLocalStorage) {
                    console.log("[StoreContext-SelectEffect] Valid store found in localStorage and current stores list:", storeFromLocalStorage);
                    newSelectedStore = storeFromLocalStorage;
                } else {
                    console.warn("[StoreContext-SelectEffect] Stored storeId not in current stores list. Clearing invalid ID from localStorage.");
                    localStorage.removeItem('selectedStoreId');
                    // Fallback if stored ID was invalid: if only one store now, select it.
                    if (stores.length === 1) {
                        console.log("[StoreContext-SelectEffect] Invalid localStorage ID, but only 1 store available. Auto-selecting it:", stores[0]);
                        newSelectedStore = stores[0];
                    } else {
                         console.log("[StoreContext-SelectEffect] Invalid localStorage ID, multiple stores available. User needs to pick.");
                         // newSelectedStore remains null
                    }
                }
            } else if (stores.length === 1) {
                // No stored selection, and only one store available, auto-select it
                console.log("[StoreContext-SelectEffect] No localStorage ID, only 1 store available. Auto-selecting it:", stores[0]);
                newSelectedStore = stores[0];
            } else {
                // Multiple stores, no localStorage ID. User needs to pick.
                // Or, if a store was previously selected but is no longer in the 'stores' list (e.g. access removed)
                console.log("[StoreContext-SelectEffect] No localStorage ID and multiple stores, or selectedStore became invalid. User needs to pick or current selection is cleared.");
                if (selectedStore && !stores.find(s => s.id === selectedStore.id)) {
                    console.log("[StoreContext-SelectEffect] Previously selected store is no longer valid. Clearing selection.");
                    newSelectedStore = null; // current selectedStore is invalid
                } else if (selectedStore) {
                    newSelectedStore = selectedStore; // Keep current valid selection
                } else {
                    newSelectedStore = null; // No selection yet, multiple options
                }
            }
            
            // Only update if the newSelectedStore is different from the current selectedStore
            if (selectedStore?.id !== newSelectedStore?.id) {
                 console.log(`[StoreContext-SelectEffect] Updating selectedStore. Old: ${selectedStore?.id}, New: ${newSelectedStore?.id}`, newSelectedStore);
                 setSelectedStore(newSelectedStore); // This will trigger re-render for consumers
                 if (newSelectedStore && newSelectedStore.id) {
                     localStorage.setItem('selectedStoreId', newSelectedStore.id.toString());
                 } else if (!newSelectedStore) { // If newSelectedStore is null
                     localStorage.removeItem('selectedStoreId');
                 }
            } else {
                console.log(`[StoreContext-SelectEffect] No change needed for selectedStore. Current: ${selectedStore?.id}`);
            }

        } else { // No stores available (stores.length === 0) and not loading
            console.log("[StoreContext-SelectEffect] No stores available. Clearing selectedStore and localStorage if necessary.");
            if (selectedStore !== null) {
                setSelectedStore(null);
            }
            if (localStorage.getItem('selectedStoreId')) {
                localStorage.removeItem('selectedStoreId');
            }
        }
    }, [stores, isLoading, authIsLoading, selectedStore, setSelectedStore]); // Added setSelectedStore

    const contextValue = {
        stores,
        selectedStore,
        isLoading, // isLoading for store fetching
        error,
        fetchStoresForUser,
        selectStore,
    };

    return (
        <StoreContext.Provider value={contextValue}>
            {children}
        </StoreContext.Provider>
    );
};

// Define ROLES constant if not imported from elsewhere, or ensure it's available
const ROLES = {
    GLOBAL_ADMIN: 'global_admin',
    STORE_ADMIN: 'store_admin',
    STORE_MANAGER: 'store_manager',
    SALES_PERSON: 'sales_person',
};