import React from 'react';
// Remove BrowserRouter as Router from this import line
import { Routes, Route, Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from "./context/AuthContext"; // AuthProvider can be removed if only used in main.jsx
import { StoreProvider } from "./context/StoreContext"; // StoreProvider can be removed if only used in main.jsx
import { ROLES } from './utils/roles';

import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';

import LoginPage from "./pages/LoginPage";
import AccessDeniedPage from './pages/AccessDeniedPage';

import CustomersList from './components/CustomersList';
import CustomerForm from './components/CustomerForm';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import ProductAttributeListPage from './components/ProductAttributeList.tsx';
import ProductAttributeFormPage from './components/ProductAttributeForm';
import CategoryList from './components/CategoryList';
import CategoryForm from './components/CategoryForm';
import SubCategoryList from './components/SubCategoryList';
import SubCategoryForm from './components/SubCategoryForm';
import BrandList from './components/BrandList';
import BrandForm from './components/BrandForm';
import SpecialCategoryList from './components/SpecialCategoryList';
import SpecialCategoryForm from './components/SpecialCategoryForm';
import TaxTypeList from './components/TaxTypeList';
import TaxTypeForm from './components/TaxTypeForm';
import TaxList from './components/TaxList';
import TaxForm from './components/TaxForm';
import UnitList from './components/UnitList';
import UnitForm from './components/UnitForm';
import ManufacturerList from './components/ManufacturerList';
import ManufacturerForm from './components/ManufacturerForm';
import WarrantyList from './components/WarrantyList';
import WarrantyForm from './components/WarrantyForm';
import BarcodeSymbologyList from './components/BarcodeSymbologyList';
import BarcodeSymbologyForm from './components/BarcodeSymbologyForm';
import DiscountTypeList from './components/DiscountTypeList';
import DiscountTypeForm from './components/DiscountTypeForm';
import SupplierList from './components/SupplierList';
import SupplierForm from './components/SupplierForm';
import UserList from './components/UserList';
import UserForm from './components/UserForm';
import StoreList from './components/StoreList';
import StoreForm from './components/StoreForm';
import RolesList from './components/RolesList';
import RoleForm from './components/RoleForm';
import PermissionList from './components/PermissionList';
import PermissionForm from './components/PermissionForm';
import PermissionCategoryList from './components/PermissionCategoryList';
import PermissionCategoryForm from './components/PermissionCategoryForm';
import AccessControl from './components/AccessControl';
import StoreSettings from './components/StoreSettings';
import InventoryList from './components/InventoryList';


const HomePage = () => {
    const location = useLocation();
    return (
        <div>
            <h2>Dashboard</h2>
            {location.state?.message && <p style={{ color: 'blue' }}>{location.state.message}</p>}
            <p>Welcome to the dashboard!</p>
        </div>
    );
};

const PlaceholderComponent = ({ title }) => (
    <div style={{ padding: '20px' }}>
        <h2>{title || 'Page Under Construction'}</h2>
        <p>This section is not yet fully implemented. Check back soon!</p>
    </div>
);

const GlobalNotFoundPage = () => (
    <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2>404 - Page Not Found</h2>
        <p>Sorry, the page you are looking for does not exist.</p>
        <Link to="/" style={{ color: '#007bff', textDecoration: 'none' }}>Go to Homepage</Link>
    </div>
);

const AppRoutes = () => {
    const { user, isLoading } = useAuth();
    const globalAdminOnly = [ROLES.GLOBAL_ADMIN];
    const storeAdminAndGlobalAdminRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN];
    const allAuthenticatedUsers = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN, ROLES.SALES_PERSON];

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <h2>Loading Application...</h2>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route element={<ProtectedRoute roles={allAuthenticatedUsers}><MainLayout /></ProtectedRoute>}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Outlet />}>
                    <Route index element={<HomePage />} />

                    {/* Stores Management */}
                    <Route path="stores" element={<ProtectedRoute roles={globalAdminOnly} permissions={['store:read']}><StoreList /></ProtectedRoute>} />
                    <Route path="stores/new" element={<ProtectedRoute roles={globalAdminOnly} permissions={['store:create']}><StoreForm /></ProtectedRoute>} />
                    <Route path="stores/edit/:storeId" element={<ProtectedRoute roles={globalAdminOnly} permissions={['store:update']}><StoreForm /></ProtectedRoute>} />

                    {/* Product Management */}
                    <Route path="products" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['product:read']}><ProductList /></ProtectedRoute>} />
                    <Route path="products/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['product:create']}><ProductForm /></ProtectedRoute>} />
                    <Route path="products/edit/:productId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['product:update']}><ProductForm /></ProtectedRoute>} />

                    {/* Customer Management */}
                    <Route path="customers" element={<ProtectedRoute roles={globalAdminOnly}><CustomersList /></ProtectedRoute>} />
                    <Route path="customers/new" element={<ProtectedRoute roles={globalAdminOnly}><CustomerForm /></ProtectedRoute>} />
                    <Route path="customers/edit/:customerId" element={<ProtectedRoute roles={globalAdminOnly}><CustomerForm /></ProtectedRoute>} />

                    {/* Suppliers Management */}
                    <Route path="suppliers" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['supplier:read']}><SupplierList /></ProtectedRoute>} />
                    <Route path="suppliers/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['supplier:create']}><SupplierForm /></ProtectedRoute>} />
                    <Route path="suppliers/edit/:supplierId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['supplier:update']}><SupplierForm /></ProtectedRoute>} />

                    {/* Product Catalog Section */}
                    <Route path="categories" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['category:read']}><CategoryList /></ProtectedRoute>} />
                    <Route path="categories/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['category:create']}><CategoryForm /></ProtectedRoute>} />
                    <Route path="categories/edit/:categoryId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['category:update']}><CategoryForm /></ProtectedRoute>} />
                    <Route path="sub-categories" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['subcategory:read']}><SubCategoryList /></ProtectedRoute>} />
                    <Route path="sub-categories/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['subcategory:create']}><SubCategoryForm /></ProtectedRoute>} />
                    <Route path="sub-categories/edit/:subCategoryId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['subcategory:update']}><SubCategoryForm /></ProtectedRoute>} />
                    <Route path="brands" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['brand:read']}><BrandList /></ProtectedRoute>} />
                    <Route path="brands/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['brand:create']}><BrandForm /></ProtectedRoute>} />
                    <Route path="brands/edit/:brandId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['brand:update']}><BrandForm /></ProtectedRoute>} />
                    <Route path="special-categories" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['specialcategory:read']}><SpecialCategoryList /></ProtectedRoute>} />
                    <Route path="special-categories/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['specialcategory:create']}><SpecialCategoryForm /></ProtectedRoute>} />
                    <Route path="special-categories/edit/:specialCategoryId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['specialcategory:update']}><SpecialCategoryForm /></ProtectedRoute>} />

                    {/* Product Attributes Section - UPDATED */}
                    <Route path="attributes" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['product_attribute:read']}><ProductAttributeListPage /></ProtectedRoute>} />
                    <Route path="attributes/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['product_attribute:create']}><ProductAttributeFormPage /></ProtectedRoute>} />
                    {/* Ensure this :attributeId matches what ProductAttributeFormPage expects from useParams */}
                    <Route path="attributes/edit/:attributeId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['product_attribute:update']}><ProductAttributeFormPage /></ProtectedRoute>} />
                    
                    {/* Tax Management */}
                    <Route path="tax-types" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['tax_type:read']}><TaxTypeList /></ProtectedRoute>} />
                    <Route path="tax-types/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['tax_type:create']}><TaxTypeForm /></ProtectedRoute>} />
                    <Route path="tax-types/edit/:taxTypeId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['tax_type:update']}><TaxTypeForm /></ProtectedRoute>} />
                    <Route path="taxes" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['tax:read']}><TaxList /></ProtectedRoute>} />
                    <Route path="taxes/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['tax:create']}><TaxForm /></ProtectedRoute>} />
                    <Route path="taxes/edit/:taxId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['tax:update']}><TaxForm /></ProtectedRoute>} />

                    {/* Product Settings Section */}
                    <Route path="units" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['unit:read']}><UnitList /></ProtectedRoute>} />
                    <Route path="units/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['unit:create']}><UnitForm /></ProtectedRoute>} />
                    <Route path="units/edit/:unitId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['unit:update']}><UnitForm /></ProtectedRoute>} />
                    <Route path="manufacturers" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['manufacturer:read']}><ManufacturerList /></ProtectedRoute>} />
                    <Route path="manufacturers/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['manufacturer:create']}><ManufacturerForm /></ProtectedRoute>} />
                    <Route path="manufacturers/edit/:manufacturerId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['manufacturer:update']}><ManufacturerForm /></ProtectedRoute>} />
                    <Route path="warranties" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['warranty:read']}><WarrantyList /></ProtectedRoute>} />
                    <Route path="warranties/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['warranty:create']}><WarrantyForm /></ProtectedRoute>} />
                    <Route path="warranties/edit/:warrantyId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['warranty:update']}><WarrantyForm /></ProtectedRoute>} />
                    <Route path="barcode-symbologies" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['barcode_symbology:read']}><BarcodeSymbologyList /></ProtectedRoute>} />
                    <Route path="barcode-symbologies/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['barcode_symbology:create']}><BarcodeSymbologyForm /></ProtectedRoute>} />
                    <Route path="barcode-symbologies/edit/:barcodeSymbologyId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['barcode_symbology:update']}><BarcodeSymbologyForm /></ProtectedRoute>} />
                    <Route path="discount-types" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['discount_type:read']}><DiscountTypeList /></ProtectedRoute>} />
                    <Route path="discount-types/new" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['discount_type:create']}><DiscountTypeForm /></ProtectedRoute>} />
                    <Route path="discount-types/edit/:discountTypeId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['discount_type:update']}><DiscountTypeForm /></ProtectedRoute>} />

                    {/* Inventory Management */}
                    <Route path="inventory" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['inventory:read']}><InventoryList /></ProtectedRoute>} />

                    {/* Sales Management */}
                    <Route path="sales/pos" element={<ProtectedRoute roles={allAuthenticatedUsers} permissions={['sale:create']}><PlaceholderComponent title="Point of Sale (POS)" /></ProtectedRoute>} />
                    <Route path="sales/history" element={<ProtectedRoute roles={allAuthenticatedUsers} permissions={['sale:read']}><PlaceholderComponent title="Sales History" /></ProtectedRoute>} />

                    {/* User Management */}
                    <Route path="users" element={<ProtectedRoute roles={globalAdminOnly} permissions={['user:read_all']}><UserList /></ProtectedRoute>} />
                    <Route path="users/new" element={<ProtectedRoute roles={globalAdminOnly} permissions={['user:create']}><UserForm /></ProtectedRoute>} />
                    <Route path="users/edit/:userId" element={<ProtectedRoute roles={globalAdminOnly} permissions={['user:update_all']}><UserForm /></ProtectedRoute>} />

                    {/* Roles Management */}
                    <Route path="roles" element={<ProtectedRoute roles={globalAdminOnly} permissions={['role:read']}><RolesList /></ProtectedRoute>} />
                    <Route path="roles/add" element={<ProtectedRoute roles={globalAdminOnly} permissions={['role:create']}><RoleForm /></ProtectedRoute>} />
                    <Route path="roles/edit/:roleId" element={<ProtectedRoute roles={globalAdminOnly} permissions={['role:update']}><RoleForm /></ProtectedRoute>} />

                    {/* Permission Management */}
                    <Route path="permissions" element={<ProtectedRoute permissions={['permission:read']}><PermissionList /></ProtectedRoute>} />
                    <Route path="permissions/new" element={<ProtectedRoute permissions={['permission:create']}><PermissionForm /></ProtectedRoute>} />
                    <Route path="permissions/edit/:permissionId" element={<ProtectedRoute permissions={['permission:update']}><PermissionForm /></ProtectedRoute>} />

                    {/* Permission Categories Management */}
                    <Route path="permission-categories" element={<ProtectedRoute permissions={['system:manage_permission_categories']}><PermissionCategoryList /></ProtectedRoute>} />
                    <Route path="permission-categories/new" element={<ProtectedRoute permissions={['system:manage_permission_categories']}><PermissionCategoryForm /></ProtectedRoute>} />
                    <Route path="permission-categories/edit/:categoryId" element={<ProtectedRoute permissions={['system:manage_permission_categories']}><PermissionCategoryForm /></ProtectedRoute>} />

                    {/* Access Control */}
                    <Route path="access-control" element={<ProtectedRoute roles={globalAdminOnly} permissions={['role:assign_permissions']}><AccessControl /></ProtectedRoute>} />

                    {/* Reports Section */}
                    <Route path="reports" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['report:read']}><PlaceholderComponent title="Reports Dashboard" /></ProtectedRoute>} />
                    <Route path="reports/sales" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['report:read_sales']}><PlaceholderComponent title="Sales Reports" /></ProtectedRoute>} />
                    <Route path="reports/inventory" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['report:read_inventory']}><PlaceholderComponent title="Inventory Reports" /></ProtectedRoute>} />
                    <Route path="reports/user-activity" element={<ProtectedRoute roles={globalAdminOnly} permissions={['report:read_user_activity']}><PlaceholderComponent title="User Activity Reports" /></ProtectedRoute>} />
                    
                    {/* Settings Section */}
                    <Route path="settings/company" element={<ProtectedRoute roles={globalAdminOnly} permissions={['system:manage_settings']}><PlaceholderComponent title="Company Settings" /></ProtectedRoute>} />
                    <Route path="settings/store" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles} permissions={['store_settings:read', 'store_settings:update']}><StoreSettings /></ProtectedRoute>} />
                    <Route path="*" element={<PlaceholderComponent title="Page Not Found in Dashboard" />} />
                </Route>
            </Route>
            <Route path="*" element={<GlobalNotFoundPage />} />
        </Routes>
    );
};

function App() {
    // No Router wrapper here anymore
    // AuthProvider and StoreProvider are also removed as they are in main.jsx
    return (
        <AppRoutes />
    );
}

export default App;