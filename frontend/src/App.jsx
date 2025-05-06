import React from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { ROLES } from './utils/roles';

// --- Layout and Route Components ---
import ProtectedRoute from './components/ProtectedRoute'; // Import separated ProtectedRoute
import MainLayout from './components/MainLayout'; // Import separated MainLayout

// --- Page Components ---
import LoginPage from "./pages/LoginPage";
import AccessDeniedPage from './pages/AccessDeniedPage';
import ProductPage from './pages/ProductPage'; // Import your new ProductPage
import UserPage from './pages/UserPage';       // Import your new UserPage

// --- CRUD Components (keep these if ProductPage/UserPage don't handle forms yet) ---
// Product Management Forms
import ProductForm from './components/ProductForm';
import CategoryList from './components/CategoryList';
import CategoryForm from './components/CategoryForm';
import SubCategoryList from './components/SubCategoryList';
import SubCategoryForm from './components/SubCategoryForm';
import BrandList from './components/BrandList';
import BrandForm from './components/BrandForm';
import UnitList from './components/UnitList';
import UnitForm from './components/UnitForm';
import SpecialCategoryList from './components/SpecialCategoryList';
import SpecialCategoryForm from './components/SpecialCategoryForm';

// Supply Chain Forms
import SupplierList from './components/SupplierList';
import SupplierForm from './components/SupplierForm';
import ManufacturerList from './components/ManufacturerList';
import ManufacturerForm from './components/ManufacturerForm';

// Configuration Forms
import TaxTypeList from './components/TaxTypeList';
import TaxTypeForm from './components/TaxTypeForm';
import TaxList from './components/TaxList';
import TaxForm from './components/TaxForm';
import WarrantyList from './components/WarrantyList';
import WarrantyForm from './components/WarrantyForm';
import BarcodeSymbologyList from './components/BarcodeSymbologyList';
import BarcodeSymbologyForm from './components/BarcodeSymbologyForm';
import DiscountTypeList from './components/DiscountTypeList';
import DiscountTypeForm from './components/DiscountTypeForm';

// Administration Forms
import UserForm from './components/UserForm'; // For new/edit user
import StoreList from './components/StoreList';
import StoreForm from './components/StoreForm';


// --- HomePage (Dashboard) Component ---
const HomePage = () => {
    const location = useLocation();
    return (
        <div>
            <h2>Dashboard</h2>
            {location.state?.message && <p style={{color: 'blue'}}>{location.state.message}</p>}
            {/* Add dashboard content here */}
        </div>
    );
};

// --- Main App Component ---
function App() {
    const adminRoles = [ROLES.GLOBAL_ADMIN];
    const storeAdminAndGlobalAdminRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN];
    const allStoreUsersRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.STORE_STAFF]; // For viewing products

    return (
        <AuthProvider>
            <StoreProvider>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/access-denied" element={<AccessDeniedPage />} />
                    
                    <Route 
                        path="/*" // Using "/*" to catch all routes to be handled by MainLayout
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        {/* Default route within MainLayout */}
                        <Route index element={<Navigate to="/dashboard" replace />} /> 
                        <Route path="dashboard" element={<HomePage />} />

                        {/* Product Management */}
                        {/* Use ProductPage for the main product listing */}
                        <Route path="products" element={<ProtectedRoute roles={allStoreUsersRoles}><ProductPage /></ProtectedRoute>} />
                        <Route path="products/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><ProductForm /></ProtectedRoute>} />
                        <Route path="products/edit/:productId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><ProductForm /></ProtectedRoute>} />
                        
                        <Route path="categories" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><CategoryList /></ProtectedRoute>} />
                        <Route path="categories/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><CategoryForm /></ProtectedRoute>} />
                        <Route path="categories/edit/:categoryId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><CategoryForm /></ProtectedRoute>} />
                        
                        <Route path="sub-categories" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SubCategoryList /></ProtectedRoute>} />
                        <Route path="sub-categories/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SubCategoryForm /></ProtectedRoute>} />
                        <Route path="sub-categories/edit/:subCategoryId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SubCategoryForm /></ProtectedRoute>} />
                        
                        <Route path="brands" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><BrandList /></ProtectedRoute>} />
                        <Route path="brands/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><BrandForm /></ProtectedRoute>} />
                        <Route path="brands/edit/:brandId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><BrandForm /></ProtectedRoute>} />
                        
                        <Route path="units" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><UnitList /></ProtectedRoute>} />
                        <Route path="units/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><UnitForm /></ProtectedRoute>} />
                        <Route path="units/edit/:unitId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><UnitForm /></ProtectedRoute>} />

                        <Route path="special-categories" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SpecialCategoryList /></ProtectedRoute>} />
                        <Route path="special-categories/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SpecialCategoryForm /></ProtectedRoute>} />
                        <Route path="special-categories/edit/:categoryId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SpecialCategoryForm /></ProtectedRoute>} />

                        {/* Supply Chain */}
                        <Route path="suppliers" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SupplierList /></ProtectedRoute>} />
                        <Route path="suppliers/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SupplierForm /></ProtectedRoute>} />
                        <Route path="suppliers/edit/:supplierId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><SupplierForm /></ProtectedRoute>} />

                        <Route path="manufacturers" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><ManufacturerList /></ProtectedRoute>} />
                        <Route path="manufacturers/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><ManufacturerForm /></ProtectedRoute>} />
                        <Route path="manufacturers/edit/:manufacturerId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><ManufacturerForm /></ProtectedRoute>} />

                        {/* Configuration */}
                        <Route path="tax-types" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><TaxTypeList /></ProtectedRoute>} />
                        <Route path="tax-types/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><TaxTypeForm /></ProtectedRoute>} />
                        <Route path="tax-types/edit/:typeId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><TaxTypeForm /></ProtectedRoute>} />
                        
                        <Route path="taxes" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><TaxList /></ProtectedRoute>} />
                        <Route path="taxes/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><TaxForm /></ProtectedRoute>} />
                        <Route path="taxes/edit/:taxId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><TaxForm /></ProtectedRoute>} />

                        <Route path="warranties" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><WarrantyList /></ProtectedRoute>} />
                        <Route path="warranties/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><WarrantyForm /></ProtectedRoute>} />
                        <Route path="warranties/edit/:warrantyId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><WarrantyForm /></ProtectedRoute>} />

                        <Route path="barcode-symbologies" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><BarcodeSymbologyList /></ProtectedRoute>} />
                        <Route path="barcode-symbologies/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><BarcodeSymbologyForm /></ProtectedRoute>} />
                        <Route path="barcode-symbologies/edit/:symbologyId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><BarcodeSymbologyForm /></ProtectedRoute>} />

                        <Route path="discount-types" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><DiscountTypeList /></ProtectedRoute>} />
                        <Route path="discount-types/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><DiscountTypeForm /></ProtectedRoute>} />
                        <Route path="discount-types/edit/:typeId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><DiscountTypeForm /></ProtectedRoute>} />
                        
                        {/* Administration */}
                        {/* Use UserPage for the main user listing */}
                        <Route path="users" element={<ProtectedRoute roles={adminRoles}><UserPage /></ProtectedRoute>} />
                        <Route path="users/new" element={<ProtectedRoute roles={adminRoles}><UserForm /></ProtectedRoute>} />
                        <Route path="users/edit/:userId" element={<ProtectedRoute roles={adminRoles}><UserForm /></ProtectedRoute>} />

                        <Route path="stores" element={<ProtectedRoute roles={adminRoles}><StoreList /></ProtectedRoute>} />
                        <Route path="stores/new" element={<ProtectedRoute roles={adminRoles}><StoreForm /></ProtectedRoute>} />
                        <Route path="stores/edit/:storeId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><StoreForm /></ProtectedRoute>} /> 
                        
                        {/* Fallback for unmatched routes within MainLayout */}
                        <Route path="*" element={<div style={{ padding: '20px' }}><h2>Page Not Found</h2><p>The page you are looking for does not exist.</p></div>} />
                    </Route>
                </Routes>
            </StoreProvider>
        </AuthProvider>
    );
}

export default App;