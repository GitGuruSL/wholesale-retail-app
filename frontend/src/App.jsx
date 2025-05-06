import React from 'react';
import { Routes, Route, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext"; // Import StoreProvider
import { ROLES } from './utils/roles'; // Import ROLES from utility file

// --- Page Components ---
import LoginPage from "./pages/LoginPage";
import AccessDeniedPage from './pages/AccessDeniedPage'; // Import AccessDeniedPage

// --- Your Existing Components ---
const HomePage = () => {
    const location = useLocation();
    return (
        <div>
            <h2>Dashboard</h2>
            {location.state?.message && <p style={{color: 'blue'}}>{location.state.message}</p>}
        </div>
    );
};

import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import CategoryList from './components/CategoryList';
import CategoryForm from './components/CategoryForm';
import SubCategoryList from './components/SubCategoryList';
import SubCategoryForm from './components/SubCategoryForm';
import BrandList from './components/BrandList';
import BrandForm from './components/BrandForm';
import UnitList from './components/UnitList';
import UnitForm from './components/UnitForm';
import StoreList from './components/StoreList';
import StoreForm from './components/StoreForm';
import SupplierList from './components/SupplierList';
import SupplierForm from './components/SupplierForm';
import TaxTypeList from './components/TaxTypeList';
import TaxTypeForm from './components/TaxTypeForm';
import TaxList from './components/TaxList';
import TaxForm from './components/TaxForm';
import ManufacturerList from './components/ManufacturerList';
import ManufacturerForm from './components/ManufacturerForm';
import WarrantyList from './components/WarrantyList';
import WarrantyForm from './components/WarrantyForm';
import BarcodeSymbologyList from './components/BarcodeSymbologyList';
import BarcodeSymbologyForm from './components/BarcodeSymbologyForm';
import DiscountTypeList from './components/DiscountTypeList';
import DiscountTypeForm from './components/DiscountTypeForm';
import SpecialCategoryList from './components/SpecialCategoryList';
import SpecialCategoryForm from './components/SpecialCategoryForm';
import UserList from './components/UserList';
import UserForm from './components/UserForm';


// --- ProtectedRoute Component ---
const ProtectedRoute = ({ children, roles }) => {
    const { user, isLoading } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><h2>Loading application...</h2></div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location, message: "Please log in to continue." }} replace />;
    }

    // Robust check for user.role before using it
    if (roles && roles.length > 0) {
        if (!user.role || !roles.includes(user.role)) {
            console.warn(`User role "${user.role || 'undefined'}" not authorized for this route. Required: ${roles.join(', ')}`);
            return <Navigate to="/access-denied" state={{ from: location }} replace />;
        }
    }

    return children;
};

// --- MainLayout Component ---
const MainLayout = () => {
    const { user, logoutUser } = useAuth();

    const handleLogout = () => {
        if (logoutUser) logoutUser();
    };

    const styles = {
        appContainer: { display: 'flex', minHeight: '100vh', fontFamily: 'Arial, sans-serif' },
        sidebar: { width: '250px', borderRight: '1px solid #ccc', padding: '20px', backgroundColor: '#f8f9fa', overflowY: 'auto', flexShrink: 0 },
        sidebarTitle: { marginBottom: '15px', fontSize: '1.2em', color: '#343a40' },
        userInfo: { marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #ddd' },
        username: { fontWeight: 'bold', margin: '0 0 5px 0', wordBreak: 'break-word' },
        role: { fontSize: '0.9em', color: '#555', marginBottom: '10px', textTransform: 'capitalize' },
        navList: { listStyle: 'none', padding: 0, margin: 0 },
        navItem: { marginBottom: '8px' },
        navLink: { textDecoration: 'none', color: '#495057', padding: '8px 12px', display: 'block', borderRadius: '4px', transition: 'background-color 0.2s ease, color 0.2s ease' },
        navLinkActive: { backgroundColor: '#0d6efd', color: 'white', fontWeight: 'bold' },
        mainContent: { flexGrow: 1, padding: '20px 30px', backgroundColor: '#ffffff', overflowY: 'auto' },
        logoutButton: { width: '100%', padding: '10px', marginTop: '30px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1em' },
        sectionTitle: { marginTop: '20px', marginBottom: '10px', fontSize: '0.9em', fontWeight: 'bold', color: '#555', borderBottom: '1px solid #eee', paddingBottom: '5px' }
    };
    
    const StyledNavLink = ({ to, children }) => {
        const location = useLocation();
        const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to + "/"));
        return (
            <NavLink to={to} style={{ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) }}>
                {children}
            </NavLink>
        );
    };

    // Updated hasAnyRole to be more robust
    const hasAnyRole = (allowedRoles) => {
        if (!user || !user.role) { // Check if user and user.role exist
            return false;
        }
        return allowedRoles.some(role => role === user.role);
    };

    return (
        <div style={styles.appContainer}>
            <nav style={styles.sidebar}>
                <h3 style={styles.sidebarTitle}>Menu</h3>
                {user && (
                    <div style={styles.userInfo}>
                        {/* Robust display for username */}
                        <p style={styles.username}>User: {user.username || 'N/A'}</p>
                        {/* Robust display for role */}
                        <p style={styles.role}>
                            Role: {user.role && typeof user.role === 'string' ? user.role.replace('_', ' ') : (user.role || 'N/A')}
                        </p>
                    </div>
                )}
                <ul style={styles.navList}>
                    <li style={styles.navItem}><StyledNavLink to="/">Dashboard</StyledNavLink></li>
                    {hasAnyRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]) && (
                        <>
                            <h4 style={styles.sectionTitle}>Product Management</h4>
                            <li style={styles.navItem}><StyledNavLink to="/products">Products</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/categories">Categories</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/sub-categories">Sub-Categories</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/brands">Brands</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/units">Units</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/special-categories">Special Categories</StyledNavLink></li>
                        </>
                    )}
                    {hasAnyRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]) && (
                        <>
                            <h4 style={styles.sectionTitle}>Supply Chain</h4>
                            <li style={styles.navItem}><StyledNavLink to="/suppliers">Suppliers</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/manufacturers">Manufacturers</StyledNavLink></li>
                        </>
                    )}
                    {hasAnyRole([ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN]) && (
                        <>
                            <h4 style={styles.sectionTitle}>Configuration</h4>
                            <li style={styles.navItem}><StyledNavLink to="/tax-types">Tax Types</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/taxes">Taxes</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/warranties">Warranties</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/barcode-symbologies">Barcode Types</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/discount-types">Discount Types</StyledNavLink></li>
                        </>
                    )}
                    {hasAnyRole([ROLES.GLOBAL_ADMIN]) && (
                        <>
                            <h4 style={styles.sectionTitle}>Administration</h4>
                            <li style={styles.navItem}><StyledNavLink to="/users">Users</StyledNavLink></li>
                            <li style={styles.navItem}><StyledNavLink to="/stores">Stores</StyledNavLink></li>
                        </>
                    )}
                </ul>
                {user && <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>}
            </nav>
            <main style={styles.mainContent}>
                <Outlet />
            </main>
        </div>
    );
};

// --- Main App Component ---
function App() {
    const adminRoles = [ROLES.GLOBAL_ADMIN];
    const storeAdminAndGlobalAdminRoles = [ROLES.GLOBAL_ADMIN, ROLES.STORE_ADMIN];

    return (
        <AuthProvider>
            <StoreProvider> {/* StoreProvider wraps routes that need its context */}
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/access-denied" element={<AccessDeniedPage />} />
                    
                    <Route 
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<HomePage />} />

                        {/* Product Management */}
                        <Route path="products" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><ProductList /></ProtectedRoute>} />
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
                        <Route path="users" element={<ProtectedRoute roles={adminRoles}><UserList /></ProtectedRoute>} />
                        <Route path="users/new" element={<ProtectedRoute roles={adminRoles}><UserForm /></ProtectedRoute>} />
                        <Route path="users/edit/:userId" element={<ProtectedRoute roles={adminRoles}><UserForm /></ProtectedRoute>} />

                        <Route path="stores" element={<ProtectedRoute roles={adminRoles}><StoreList /></ProtectedRoute>} />
                        <Route path="stores/new" element={<ProtectedRoute roles={adminRoles}><StoreForm /></ProtectedRoute>} />
                        {/* Adjusted roles for store edit based on common practice, verify if this is your intent */}
                        <Route path="stores/edit/:storeId" element={<ProtectedRoute roles={storeAdminAndGlobalAdminRoles}><StoreForm /></ProtectedRoute>} /> 
                        
                        <Route path="*" element={<div style={{ padding: '20px' }}><h2>Page Not Found</h2><p>This page does not exist within the application.</p></div>} />
                    </Route>
                </Routes>
            </StoreProvider>
        </AuthProvider>
    );
}

export default App;