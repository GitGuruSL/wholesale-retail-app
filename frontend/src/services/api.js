// filepath: d:\Development\wholesale-retail-app\frontend\src\services\api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'; // Ensure this matches your backend URL

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error); // Added console log for debugging
    return Promise.reject(error);
  }
);

// Optional: Add a response interceptor for global error handling (like 401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message || error);
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized (401) response detected. Logging out.');
      // Example: Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user'); // If you store user info
      // Dispatch an event or use a state management solution to notify other parts of the app
      window.dispatchEvent(new CustomEvent('auth-error-401')); 
      if (window.location.pathname !== '/login') { // Avoid redirect loop if already on login
          window.location.href = '/login'; 
      }
    }
    return Promise.reject(error);
  }
);


export const fetchItems = async () => {
  try {
    console.log('Fetching items from API...');
    const response = await apiClient.get('/items');
    console.log('Items API response:', response.data);
    return response.data.items || response.data; 
  } catch (error) {
    console.error('Error fetching items:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export const fetchItemById = async (id) => {
  try {
    console.log(`Fetching item by ID: ${id} from API...`);
    const response = await apiClient.get(`/items/${id}`);
    console.log(`Item ID ${id} API response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error fetching item by ID ${id}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

export const fetchItemVariations = async (itemId) => {
  try {
    console.log(`Fetching variations for item ID: ${itemId}`);
    const response = await apiClient.get(`/items/${itemId}/variations`);
    return response.data; // Expected to be an array of variations
  } catch (error) {
    console.error(`Error fetching variations for item ${itemId}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

export const addItem = async (itemData) => {
  try {
    console.log('Adding new item via API:', itemData);
    const response = await apiClient.post('/items', itemData);
    console.log('Add item API response:', response.data);
    return response.data; // Should return the newly created item
  } catch (error) {
    console.error('Error adding item:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Helper function to fetch generic resources - UPDATED
export const fetchResource = async (resourceName, params = {}) => {
  try {
    console.log(`Fetching ${resourceName} from API with params:`, params);
    const response = await apiClient.get(`/${resourceName}`, { params });
    console.log(`${resourceName} API response:`, response.data);

    let dataArray = [];
    if (response.data && Array.isArray(response.data[resourceName])) {
      dataArray = response.data[resourceName];
    } else if (response.data && Array.isArray(response.data.data)) {
      dataArray = response.data.data;
    } else if (Array.isArray(response.data)) {
      dataArray = response.data;
    } else {
      // If the response.data is an object but not one of the expected array structures,
      // and it's a 2xx response, it might be an unexpected successful response.
      // Log a warning and return an empty array to prevent crashes.
      console.warn(`Fetched ${resourceName}, but the response data was not in an expected array format:`, response.data);
      // dataArray remains [], which is a safe default
    }
    return dataArray;
  } catch (error) {
    console.error(`Error fetching ${resourceName}:`, error.response ? error.response.data : error.message);
    throw error; // Let axios's error handling (or Promise.all's catch) deal with non-2xx
  }
};

export const fetchCategories = async (params) => fetchResource('categories', params);
export const fetchBrands = async (params) => fetchResource('brands', params);
export const fetchUnits = async (params) => fetchResource('units', params);
export const fetchSuppliers = async (params) => fetchResource('suppliers', params);
export const fetchManufacturers = async (params) => fetchResource('manufacturers', params);
export const fetchStores = async (params) => fetchResource('stores', params);
export const fetchTaxes = async (params) => fetchResource('taxes', params);
export const fetchSubCategories = async (params) => fetchResource('sub-categories', params);
export const fetchAttributes = async (params) => fetchResource('attributes', params);
export const fetchSpecialCategories = async (params) => fetchResource('special-categories', params); // <-- ADD THIS LINE

// NEW FUNCTION for fetching item variants suitable for purchase
export const fetchItemVariantsForPurchase = async (params = {}) => {
  try {
    console.log('Fetching item variants for purchase from API with params:', params);
    // Assuming your endpoint is /item-variants and it can be filtered,
    // or a specific endpoint like /item-variants/for-purchase
    const response = await apiClient.get('/item-variants/for-purchase', { params }); 
    console.log('Item variants for purchase API response:', response.data);
    // Adjust based on your actual API response structure
    return response.data?.data || response.data || []; 
  } catch (error) {
    console.error('Error fetching item variants for purchase:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// API functions for Item Unit Configurations
export const fetchItemUnitConfigs = async (itemId) => { // Removed unused 'params' argument for now
  if (!itemId) {
    console.warn("fetchItemUnitConfigs called without itemId");
    return []; // Or throw an error
  }
  try {
    const response = await apiClient.get('/item-units', { params: { itemId } });
    return response.data;
  } catch (error) {
    console.error(`Error fetching unit configs for item ${itemId}:`, error.response ? error.response.data : error.message);
    throw error; // Re-throw to be caught by the caller
  }
};

export const addItemUnitConfig = async (data) => {
    console.log('Adding new item unit config via API to /item-units:', data);
    try {
        // Change path to /item-units
        const response = await apiClient.post('/item-units', data); 
        console.log('API response for add item unit config:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error adding item unit config (raw error object):", error);
        const errorResponse = error.response;
        console.error("Error adding item unit config (error.response):", errorResponse);
        console.error("Error adding item unit config (error.response.data):", errorResponse ? errorResponse.data : 'No response data');
        throw errorResponse ? errorResponse.data : new Error("Network error or server unreachable when adding unit config.");
    }
};

export const deleteItemUnitConfig = async (configIdToDelete) => {
    console.log(`Deleting item unit config with ID: ${configIdToDelete} via API from /item-units`);
    try {
        // Change path to /item-units
        const response = await apiClient.delete(`/item-units/${configIdToDelete}`);
        console.log('API response for delete item unit config:', response.data);
        return response.data;
    } catch (error) {
        console.error("Error deleting item unit config (raw error object):", error);
        const errorResponse = error.response;
        console.error("Error deleting item unit config (error.response):", errorResponse);
        console.error("Error deleting item unit config (error.response.data):", errorResponse ? errorResponse.data : 'No response data');
        throw errorResponse ? errorResponse.data : new Error("Network error or server unreachable when deleting unit config.");
    }
};

// Function to update an item
export const updateItem = async (itemId, itemData) => {
  try {
    console.log(`Updating item ID ${itemId} via API:`, itemData);
    // Using POST with _method=PUT for compatibility if backend expects it for FormData
    // If your backend directly supports PUT with FormData, you can use apiClient.put
    const response = await apiClient.post(`/items/${itemId}`, { ...itemData, _method: 'PUT' });
    // If using true PUT: const response = await apiClient.put(`/items/${itemId}`, itemData);
    console.log('Update item API response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`Error updating item ${itemId}:`, error.response ? error.response.data : error.message);
    throw error;
  }
};

export const fetchPurchaseProductLines = async (params) => {
    try {
        const response = await apiClient.get('/items/purchase-product-lines', { params }); // { params } will send { supplier_id: '...' } as query string
        console.log('API Response for fetchPurchaseProductLines:', response.data);
        if (response.data && response.data.success) {
            return response.data.data;
        }
        console.warn('fetchPurchaseProductLines did not return expected data structure or success was false:', response.data);
        return [];
    } catch (error) {
        console.error("Error fetching purchase product lines (in api.js):", error.response?.data || error.message, error);
        throw error; // This throw causes the .catch() in PurchaseOrderForm.tsx to trigger
    }
};

export const fetchVariationsForProductLine = async (baseItemId) => {
    try {
        // Path assumes apiInstance.defaults.baseURL is 'http://localhost:5001/api'
        const response = await apiClient.get(`/items/purchase-product-lines/${baseItemId}/variations`);
        console.log(`API Response for fetchVariationsForProductLine (base_item_id: ${baseItemId}):`, response.data);
        if (response.data && response.data.success) {
            return response.data.data;
        }
        console.warn(`fetchVariationsForProductLine (base_item_id: ${baseItemId}) did not return expected data structure:`, response.data);
        return [];
    } catch (error) {
        console.error(`Error fetching variations for product line ${baseItemId}:`, error.response?.data || error.message, error);
        throw error;
    }
};

export const createPurchaseOrder = async (purchaseOrderData) => {
    try {
        console.log('Creating purchase order with data:', purchaseOrderData);
        const response = await apiClient.post('/purchase-orders', purchaseOrderData);
        console.log('Create purchase order API response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating purchase order:', error.response?.data || error.message, error);
        throw error;
    }
};

export const fetchPurchaseOrderById = async (id) => {
    try {
        console.log(`Fetching purchase order by ID: ${id}`);
        const response = await apiClient.get(`/purchase-orders/${id}`);
        console.log(`Purchase order ID ${id} API response:`, response.data);
        return response.data.data || response.data; // Adjust if your backend wraps in 'data'
    } catch (error) {
        console.error(`Error fetching purchase order by ID ${id}:`, error.response?.data || error.message, error);
        throw error;
    }
};

export const updatePurchaseOrder = async (id, purchaseOrderData) => {
    try {
        console.log(`Updating purchase order ID ${id} with data:`, purchaseOrderData);
        const response = await apiClient.put(`/purchase-orders/${id}`, purchaseOrderData);
        console.log('Update purchase order API response:', response.data);
        return response.data;
    } catch (error) {
        console.error(`Error updating purchase order ${id}:`, error.response?.data || error.message, error);
        throw error;
    }
};

export const deleteItemVariation = async (variationId) => {
    try {
        const response = await apiClient.delete(`/items/variations/${variationId}`); // Adjust endpoint as needed
        return response.data;
    } catch (error) {
        console.error(`Error deleting item variation ${variationId}:`, error.response || error);
        throw error;
    }
};

// If it's named deleteItem:
export const deleteItem = async (id) => {
    try {
        const response = await apiClient.delete(`/items/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting item ${id}:`, error.response || error);
        throw error;
    }
};

export const deleteItemById = async (id) => {
    try {
        // Your console.log or any other pre-request logic can go here
        console.log(`Attempting to delete item with ID: ${id} via API.`);
        const response = await apiClient.delete(`/items/${id}`); // Ensure this endpoint is correct
        console.log(`Successfully deleted item ${id}. API response:`, response.data);
        return response.data; // Or handle success/failure based on response
    } catch (error) {
        // Log the detailed error object
        console.error(`Error in deleteItemById for ID ${id}:`, error.response || error.request || error.message, error);
        // Re-throw the error so the calling function can catch it and handle UI updates (e.g., show an error message)
        throw error;
    }
};

// Make sure this is the VERY LAST line if you have a default export
// If you only have named exports (like above), you might not need a default export of apiClient
// or you might have it already. Just ensure it doesn't conflict.
// The error is about named exports, so the default export isn't the immediate issue.

export default apiClient;