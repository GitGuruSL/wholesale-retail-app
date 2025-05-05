// frontend/src/App.jsx
import React from 'react';
import { Routes, Route, Link, NavLink } from 'react-router-dom';

// Import Components
const HomePage = () => <h2>Dashboard</h2>;
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
import SpecialCategoryList from './components/SpecialCategoryList'; // Create this next
import SpecialCategoryForm from './components/SpecialCategoryForm'; // Create this next
// Import other list/form components

// Basic CSS (or use your existing styles)
const styles = { /* ... styles object as before ... */
  appContainer: { display: 'flex', minHeight: '100vh' },
  sidebar: { minWidth: '200px', width: '200px', borderRight: '1px solid #ccc', padding: '20px', backgroundColor: '#f8f9fa' },
  sidebarTitle: { marginBottom: '20px', color: '#343a40' },
  navList: { listStyle: 'none', padding: 0, margin: 0 },
  navItem: { marginBottom: '10px' },
  navLink: { textDecoration: 'none', color: '#495057', padding: '8px 12px', display: 'block', borderRadius: '4px', transition: 'background-color 0.2s ease' },
  navLinkActive: { backgroundColor: '#0d6efd', color: 'white', fontWeight: 'bold' },
  mainContent: { flexGrow: 1, padding: '30px', backgroundColor: '#ffffff' },
};


function App() {

  return (
    <div style={styles.appContainer}>
      {/* --- Navigation Sidebar --- */}
      <nav style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>Menu</h3>
        <ul style={styles.navList}>
          {/* Existing Links */}
          <li style={styles.navItem}><NavLink to="/" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Dashboard</NavLink></li>
          <li style={styles.navItem}><NavLink to="/products" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Products</NavLink></li>
          <li style={styles.navItem}><NavLink to="/categories" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Categories</NavLink></li>
          <li style={styles.navItem}><NavLink to="/sub-categories" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Sub-Categories</NavLink></li>
          <li style={styles.navItem}><NavLink to="/brands" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Brands</NavLink></li>
          <li style={styles.navItem}><NavLink to="/units" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Units</NavLink></li>
          <li style={styles.navItem}><NavLink to="/stores" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Stores</NavLink></li>
          <li style={styles.navItem}><NavLink to="/suppliers" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Suppliers</NavLink></li>
          <li style={styles.navItem}><NavLink to="/tax-types" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Tax Types</NavLink></li>
          <li style={styles.navItem}><NavLink to="/taxes" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Taxes</NavLink></li>
          <li style={styles.navItem}><NavLink to="/manufacturers" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Manufacturers</NavLink></li>
          <li style={styles.navItem}><NavLink to="/warranties" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Warranties</NavLink></li>
          <li style={styles.navItem}><NavLink to="/barcode-symbologies" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Barcode Types</NavLink></li>
          <li style={styles.navItem}><NavLink to="/discount-types" style={({ isActive }) => ({ ...styles.navLink, ...(isActive ? styles.navLinkActive : {}) })}>Discount Types</NavLink></li>
           {/* New Link for Special Categories */}
           <li style={styles.navItem}>
            <NavLink
              to="/special-categories" // <-- Link
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              Special Categories
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* --- Main Content Area --- */}
      <main style={styles.mainContent}>
        <Routes>
          {/* Existing Routes */}
          <Route path="/" element={ <HomePage /> } />
          <Route path="/products" element={ <ProductList /> } />
          <Route path="/products/new" element={ <ProductForm /> } />
          <Route path="/products/edit/:productId" element={ <ProductForm /> } />
          <Route path="/categories" element={ <CategoryList /> } />
          <Route path="/categories/new" element={ <CategoryForm /> } />
          <Route path="/categories/edit/:categoryId" element={ <CategoryForm /> } />
          <Route path="/sub-categories" element={ <SubCategoryList /> } />
          <Route path="/sub-categories/new" element={ <SubCategoryForm /> } />
          <Route path="/sub-categories/edit/:subCategoryId" element={ <SubCategoryForm /> } />
          <Route path="/brands" element={ <BrandList /> } />
          <Route path="/brands/new" element={ <BrandForm /> } />
          <Route path="/brands/edit/:brandId" element={ <BrandForm /> } />
          <Route path="/units" element={ <UnitList /> } />
          <Route path="/units/new" element={ <UnitForm /> } />
          <Route path="/units/edit/:unitId" element={ <UnitForm /> } />
          <Route path="/stores" element={ <StoreList /> } />
          <Route path="/stores/new" element={ <StoreForm /> } />
          <Route path="/stores/edit/:storeId" element={ <StoreForm /> } />
          <Route path="/suppliers" element={ <SupplierList /> } />
          <Route path="/suppliers/new" element={ <SupplierForm /> } />
          <Route path="/suppliers/edit/:supplierId" element={ <SupplierForm /> } />
          <Route path="/tax-types" element={ <TaxTypeList /> } />
          <Route path="/tax-types/new" element={ <TaxTypeForm /> } />
          <Route path="/tax-types/edit/:typeId" element={ <TaxTypeForm /> } />
          <Route path="/taxes" element={ <TaxList /> } />
          <Route path="/taxes/new" element={ <TaxForm /> } />
          <Route path="/taxes/edit/:taxId" element={ <TaxForm /> } />
          <Route path="/manufacturers" element={ <ManufacturerList /> } />
          <Route path="/manufacturers/new" element={ <ManufacturerForm /> } />
          <Route path="/manufacturers/edit/:manufacturerId" element={ <ManufacturerForm /> } />
          <Route path="/warranties" element={ <WarrantyList /> } />
          <Route path="/warranties/new" element={ <WarrantyForm /> } />
          <Route path="/warranties/edit/:warrantyId" element={ <WarrantyForm /> } />
          <Route path="/barcode-symbologies" element={ <BarcodeSymbologyList /> } />
          <Route path="/barcode-symbologies/new" element={ <BarcodeSymbologyForm /> } />
          <Route path="/barcode-symbologies/edit/:symbologyId" element={ <BarcodeSymbologyForm /> } />
          <Route path="/discount-types" element={ <DiscountTypeList /> } />
          <Route path="/discount-types/new" element={ <DiscountTypeForm /> } />
          <Route path="/discount-types/edit/:typeId" element={ <DiscountTypeForm /> } />

          {/* New Routes for Special Categories */}
          <Route path="/special-categories" element={ <SpecialCategoryList /> } /> {/* <-- Route */}
          <Route path="/special-categories/new" element={ <SpecialCategoryForm /> } /> {/* <-- Route */}
          <Route path="/special-categories/edit/:categoryId" element={ <SpecialCategoryForm /> } /> {/* <-- Route */}

          {/* Fallback route */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
