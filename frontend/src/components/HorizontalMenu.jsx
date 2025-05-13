import React, { useState, useMemo, useCallback } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Button, Menu, MenuItem, Typography, Box, IconButton
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import SecurityIcon from '@mui/icons-material/Security';

// --- Icon Imports (Consolidated & Alphabetized where practical) ---
import AbcIcon from '@mui/icons-material/Abc'; // Prefix
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; // Balance Sheet, Bank Account Settings
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'; // Money Transfer
import AccountCircleIcon from '@mui/icons-material/AccountCircle'; // Profile, Profile Settings
import AccessTimeIcon from '@mui/icons-material/AccessTime'; // Shifts
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // Create Product
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'; // Roles & Permissions, Admin Leaves/Attendance
import AppSettingsAltIcon from '@mui/icons-material/AppSettingsAlt'; // App Settings
import AppsIcon from '@mui/icons-material/Apps'; // Main Menu
import ArticleIcon from '@mui/icons-material/Article'; // Account Statement, Documentation
import AssessmentIcon from '@mui/icons-material/Assessment'; // Reports
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd'; // Designation
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'; // Sales Return, Purchase Return
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'; // Pricing, Currencies
import BadgeIcon from '@mui/icons-material/Badge'; // Employees, HRM
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner'; // Product Barcodes (replaces BarcodeIcon)
import BookIcon from '@mui/icons-material/Book'; // Blog
import BusinessIcon from '@mui/icons-material/Business'; // Brands, Company Profile, Company Settings
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'; // Gift Cards
import CategoryIcon from '@mui/icons-material/Category'; // Product Category, Sub Category, Expense Category, Income Category, Blog Categories
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory'; // Changelog
import ChecklistIcon from '@mui/icons-material/Checklist'; // Preference
import ChevronRightIcon from '@mui/icons-material/ChevronRight'; // For nested menu indicator
import CommentIcon from '@mui/icons-material/Comment'; // Blog Comments
import ConstructionIcon from '@mui/icons-material/Construction'; // Under Maintenance
import CoPresentIcon from '@mui/icons-material/CoPresent'; // Attendance
import CorporateFareIcon from '@mui/icons-material/CorporateFare'; // Departments
import DashboardIcon from '@mui/icons-material/Dashboard'; // Dashboard
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'; // Delete Account Request
import DescriptionIcon from '@mui/icons-material/Description'; // Pages (CMS), Blog (main), Error Pages, Blank Page, Invoice Template, Email Templates, SMS Templates
import EmailIcon from '@mui/icons-material/Email'; // Email Settings
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption'; // 2 Step Verification
import EngineeringIcon from '@mui/icons-material/Engineering'; // Designation (original)
import ErrorIcon from '@mui/icons-material/Error'; // Error Pages (general)
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // 404/500 Error
import EventAvailableIcon from '@mui/icons-material/EventAvailable'; // Employee Attendance
import EventBusyIcon from '@mui/icons-material/EventBusy'; // Leaves, Employee Leaves
import EventNoteIcon from '@mui/icons-material/EventNote'; // Annual Report
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'; // Dropdown arrow
import FingerprintIcon from '@mui/icons-material/Fingerprint'; // Security Settings
import GTranslateIcon from '@mui/icons-material/GTranslate'; // Localization, Languages
import GroupIcon from '@mui/icons-material/Group'; // Supplier Report, Customer Report
import HelpOutlineIcon from '@mui/icons-material/HelpOutline'; // FAQ, Forgot Password
import HistoryIcon from '@mui/icons-material/History'; // Expired Products
import HolidayVillageIcon from '@mui/icons-material/HolidayVillage'; // Holidays
import HomeWorkIcon from '@mui/icons-material/HomeWork'; // Warehouses
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'; // Trial Balance
import InputIcon from '@mui/icons-material/Input'; // Custom Field
import InventoryIcon from '@mui/icons-material/Inventory'; // Inventory, Products
import LanguageIcon from '@mui/icons-material/Language'; // Website Settings
import ListAltIcon from '@mui/icons-material/ListAlt'; // Leave Types
import LocalMallIcon from '@mui/icons-material/LocalMall'; // Purchase Order
import LocalOfferIcon from '@mui/icons-material/LocalOffer'; // Coupons, Discount Types, Blog Tags, Discounts
import LocalShippingIcon from '@mui/icons-material/LocalShipping'; // Suppliers
import LocationCityIcon from '@mui/icons-material/LocationCity'; // Location (CMS), Cities (CMS)
import LockOpenIcon from '@mui/icons-material/LockOpen'; // Login
import LockResetIcon from '@mui/icons-material/LockReset'; // Reset Password
import LogoutIcon from '@mui/icons-material/Logout';
import MapIcon from '@mui/icons-material/Map'; // Maps (UI), States (CMS)
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'; // Email Verification
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'; // Invoice Report, Tax Report, Income, Tax Types, Taxes, Tax Rates
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'; // More, Other Settings
import NotificationsIcon from '@mui/icons-material/Notifications'; // Notification Settings
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction'; // Online Orders
import PaidIcon from '@mui/icons-material/Paid'; // Profit & Loss, Financial Settings, Employee Salary, Payslips
import PasswordIcon from '@mui/icons-material/Password'; // OTP Settings
import PaymentIcon from '@mui/icons-material/Payment'; // Payment Gateway
import PaymentsIcon from '@mui/icons-material/Payments'; // Payroll, Bank Accounts (general)
import PeopleIcon from '@mui/icons-material/People'; // UI Interface, Customers, Users
import PersonAddIcon from '@mui/icons-material/PersonAdd'; // Register
import PointOfSaleIcon from '@mui/icons-material/PointOfSale'; // Sales & Purchase, POS, POS Settings
import PowerIcon from '@mui/icons-material/Power'; // Connected Apps
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'; // Manufacturers
import PriceCheckIcon from '@mui/icons-material/PriceCheck'; // Discount Plan
import PrintIcon from '@mui/icons-material/Print'; // Print Barcode, Printer Settings
import PublicIcon from '@mui/icons-material/Public'; // Countries (CMS)
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'; // Print QR Code, Barcode Symbologies
import QuizIcon from '@mui/icons-material/Quiz'; // FAQ
import ReceiptIcon from '@mui/icons-material/Receipt'; // Sales List, Invoices (general)
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'; // Invoices (detailed), Payslips
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver'; // Testimonials
import RequestQuoteIcon from '@mui/icons-material/RequestQuote'; // Quotation
import ScreenLockPortraitIcon from '@mui/icons-material/ScreenLockPortrait'; // Lock Screen
import SendTimeExtensionIcon from '@mui/icons-material/SendTimeExtension'; // Coming Soon
import SettingsIcon from '@mui/icons-material/Settings'; // Settings (main), Invoice Settings
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications'; // Site Configuration
import SettingsSystemDaydreamIcon from '@mui/icons-material/SettingsSystemDaydream'; // System Settings (main)
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket'; // Stock Management
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Purchases
import ShowChartIcon from '@mui/icons-material/ShowChart'; // Sales Report, Purchase Report, Inventory Report
import SmsIcon from '@mui/icons-material/Sms'; // SMS Settings
import StarIcon from '@mui/icons-material/Star'; // Testimonials (original), Special Categories
import StoreIcon from '@mui/icons-material/Store'; // Store Settings, Stores
import StorefrontIcon from '@mui/icons-material/Storefront'; // POS Orders
import StorageIcon from '@mui/icons-material/Storage'; // Storage Settings
import StraightenIcon from '@mui/icons-material/Straighten'; // Units
import StyleIcon from '@mui/icons-material/Style'; // Variant Attributes
import SummarizeIcon from '@mui/icons-material/Summarize'; // Product Report, Expense Report
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle'; // Billers
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation'; // Stock Transfer
import TrendingDownIcon from '@mui/icons-material/TrendingDown'; // Low Stocks, Expenses
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // Cash Flow
import TuneIcon from '@mui/icons-material/Tune'; // General Settings, Stock Adjustment
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser'; // Warranties, Authentication Pages
import VpnKeyIcon from '@mui/icons-material/VpnKey'; // Social Authentication
import WebAssetIcon from '@mui/icons-material/WebAsset'; // CMS Pages
import WebIcon from '@mui/icons-material/Web'; // Forms, Tables (as part of UI)
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import SupplierIcon from '@mui/icons-material/LocalShipping'; // Corrected 'inport' to 'import' and assumed an icon


const HorizontalMenu = () => {
    const location = useLocation();
    const { user, userCan, logoutUser } = useAuth();

    // State for main section menus
    const [anchorEl, setAnchorEl] = useState({});
    // State for nested submenus (one level deep)
    const [nestedAnchorEl, setNestedAnchorEl] = useState({});

    const horizontalMenuSections = useMemo(() => [
        {
            id: "mainMenu", label: "Main Menu", icon: <AppsIcon />, requiredPermission: null,
            items: [
                { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, requiredPermission: 'user:read_self' },
            ]
        },
        {
            id: "inventory", label: "Inventory", icon: <InventoryIcon />, requiredPermission: 'product:read',
            items: [
                { text: 'Products', icon: <InventoryIcon />, path: '/dashboard/products', requiredPermission: 'product:read' },
                { text: 'Create Product', icon: <AddCircleOutlineIcon />, path: '/dashboard/products/new', requiredPermission: 'product:create' },
                { text: 'Expired Products', icon: <HistoryIcon />, path: '/dashboard/inventory/expired', requiredPermission: 'inventory:read_expired' },
                { text: 'Low Stocks', icon: <TrendingDownIcon />, path: '/dashboard/inventory/low-stocks', requiredPermission: 'inventory:read_lowstock' },
                { text: 'Category', icon: <CategoryIcon />, path: '/dashboard/categories', requiredPermission: 'category:read' },
                { text: 'Sub Category', icon: <CategoryIcon />, path: '/dashboard/sub-categories', requiredPermission: 'subcategory:read' },
                { text: 'Brands', icon: <BusinessIcon />, path: '/dashboard/brands', requiredPermission: 'brand:read' },
                { text: 'Units', icon: <StraightenIcon />, path: '/dashboard/units', requiredPermission: 'unit:read' },
                { text: 'Variant Attributes', icon: <StyleIcon />, path: '/dashboard/attributes', requiredPermission: 'product_attribute:read' },
                { text: 'Warranties', icon: <VerifiedUserIcon />, path: '/dashboard/warranties', requiredPermission: 'warranty:read' },
                { text: 'Print Barcode', icon: <PrintIcon />, path: '/dashboard/inventory/print-barcode', requiredPermission: 'inventory:print_barcode' },
                { text: 'Print QR Code', icon: <QrCodeScannerIcon />, path: '/dashboard/inventory/print-qrcode', requiredPermission: 'inventory:print_qrcode' },
                { text: 'Product Barcodes', icon: <DocumentScannerIcon />, path: '/dashboard/inventory/product-barcodes', requiredPermission: 'product_barcode:manage' },
                { text: 'Barcode Symbologies', icon: <TuneIcon />, path: '/dashboard/barcode-symbologies', requiredPermission: 'barcode_symbology:read' }, // MODIFIED PATH
                { text: 'Discount Types', icon: <LocalOfferIcon />, path: '/dashboard/discount-types', requiredPermission: 'discount_type:manage' }, // MODIFIED PATH
                { text: 'Special Categories', icon: <StarIcon />, path: '/dashboard/special-categories', requiredPermission: 'specialcategory:read' },
            ]
        },
        {
            id: "salesPurchase", label: "Sales & Purchase", icon: <PointOfSaleIcon />, requiredPermission: 'sale:read',
            items: [
                {
                    text: 'Stock', icon: <ShoppingBasketIcon />, requiredPermission: 'stock:manage',
                    items: [
                        { text: 'Manage Stock', icon: <ShoppingBasketIcon />, path: '/dashboard/stock/manage', requiredPermission: 'stock:manage' },
                        { text: 'Stock Transfer', icon: <TransferWithinAStationIcon />, path: '/dashboard/stock/transfer', requiredPermission: 'stock_transfer:manage' },
                        { text: 'Stock Adjustment', icon: <TuneIcon />, path: '/dashboard/stock/adjustment', requiredPermission: 'stock_adjustment:manage' },
                    ]
                },
                {
                    text: 'Sales', icon: <ReceiptIcon />, requiredPermission: 'sale:read',
                    items: [
                        { text: 'All Sales Orders', icon: <ReceiptIcon />, requiredPermission: 'sale:read', path: '/dashboard/sales' },
                        { text: 'Online Orders', icon: <OnlinePredictionIcon />, path: '/dashboard/sales/online-orders', requiredPermission: 'sale:read_online' },
                        { text: 'POS Orders', icon: <StorefrontIcon />, path: '/dashboard/sales/pos-orders', requiredPermission: 'sale:read_pos' },
                        { text: 'Invoices', icon: <ReceiptLongIcon />, path: '/dashboard/invoices', requiredPermission: 'invoice:read' },
                        { text: 'Sales Return', icon: <AssignmentReturnIcon />, path: '/dashboard/sales-returns', requiredPermission: 'sales_return:read' },
                        { text: 'Quotation', icon: <RequestQuoteIcon />, path: '/dashboard/quotations', requiredPermission: 'quotation:read' },
                        { text: 'POS', icon: <PointOfSaleIcon />, path: '/dashboard/pos', requiredPermission: 'pos:use' },
                    ]
                },
                {
                    text: 'Promo', icon: <LocalOfferIcon />, requiredPermission: 'coupon:manage',
                    items: [
                        { text: 'Coupons', icon: <LocalOfferIcon />, path: '/dashboard/promo/coupons', requiredPermission: 'coupon:manage' },
                        { text: 'Gift Cards', icon: <CardGiftcardIcon />, path: '/dashboard/promo/giftcards', requiredPermission: 'giftcard:manage' },
                        {
                            text: 'Discounts Admin', icon: <LocalOfferIcon />, requiredPermission: 'discount_plan:manage',
                            items: [
                                { text: 'Discount Plans', icon: <PriceCheckIcon />, path: '/dashboard/promo/discount-plans', requiredPermission: 'discount_plan:manage' },
                                { text: 'Discounts Rules', icon: <LocalOfferIcon />, path: '/dashboard/promo/discounts', requiredPermission: 'discount_rule:manage' },
                            ]
                        },
                    ]
                },
                {
                    text: 'Purchase', icon: <ShoppingCartIcon />, requiredPermission: 'purchase:read',
                    items: [
                        { text: 'Purchases', icon: <ShoppingCartIcon />, path: '/dashboard/purchases', requiredPermission: 'purchase:read' },
                        { text: 'Purchase Order', icon: <LocalMallIcon />, path: '/dashboard/purchase-orders', requiredPermission: 'purchase_order:read' },
                        { text: 'Purchase Return', icon: <AssignmentReturnIcon />, path: '/dashboard/purchase-returns', requiredPermission: 'purchase_return:read' },
                    ]
                },
                {
                    text: 'Expenses Management', icon: <TrendingDownIcon />, requiredPermission: 'expense:read',
                    items: [
                        { text: 'Expenses', icon: <TrendingDownIcon />, path: '/dashboard/finance/expenses', requiredPermission: 'expense:read' },
                        { text: 'Expense Categories', icon: <CategoryIcon />, path: '/dashboard/finance/expense-categories', requiredPermission: 'expense_category:manage' },
                    ]
                },
                {
                    text: 'Income Management', icon: <MonetizationOnIcon />, requiredPermission: 'income:read',
                    items: [
                        { text: 'Income', icon: <MonetizationOnIcon />, path: '/dashboard/finance/income', requiredPermission: 'income:read' },
                        { text: 'Income Categories', icon: <CategoryIcon />, path: '/dashboard/finance/income-categories', requiredPermission: 'income_category:manage' },
                    ]
                },
                { text: 'Bank Accounts', icon: <AccountBalanceIcon />, path: '/dashboard/finance/bank-accounts', requiredPermission: 'bank_account:read' },
                { text: 'Money Transfer', icon: <AccountBalanceWalletIcon />, path: '/dashboard/finance/money-transfer', requiredPermission: 'money_transfer:read' },
                { text: 'Balance Sheet', icon: <AccountBalanceIcon />, path: '/dashboard/finance/balance-sheet', requiredPermission: 'financial_report:read_balance_sheet' },
                { text: 'Trial Balance', icon: <HourglassEmptyIcon />, path: '/dashboard/finance/trial-balance', requiredPermission: 'financial_report:read_trial_balance' },
                { text: 'Cash Flow', icon: <TrendingUpIcon />, path: '/dashboard/finance/cash-flow', requiredPermission: 'financial_report:read_cash_flow' },
                { text: 'Account Statement', icon: <ArticleIcon />, path: '/dashboard/finance/account-statement', requiredPermission: 'financial_report:read_account_statement' },
            ]
        },
        {
            id: "pages", label: "Pages", icon: <DescriptionIcon />, requiredPermission: null,
            items: [
                { text: 'Profile', icon: <AccountCircleIcon />, path: '/dashboard/profile', requiredPermission: 'user:read_self' },
                {
                    text: 'Authentication (Views)', icon: <VerifiedUserIcon />, requiredPermission: null,
                    items: [
                        { text: 'Login Page', icon: <LockOpenIcon />, path: '/auth/login', requiredPermission: null },
                        { text: 'Register Page', icon: <PersonAddIcon />, path: '/auth/register', requiredPermission: null },
                        { text: 'Forgot Password Page', icon: <HelpOutlineIcon />, path: '/auth/forgot-password', requiredPermission: null },
                        { text: 'Reset Password Page', icon: <LockResetIcon />, path: '/auth/reset-password', requiredPermission: null },
                        { text: 'Email Verification Page', icon: <MarkEmailReadIcon />, path: '/auth/verify-email', requiredPermission: null },
                        { text: '2-Step Verification Page', icon: <EnhancedEncryptionIcon />, path: '/auth/two-step-verification', requiredPermission: null },
                        { text: 'Lock Screen Page', icon: <ScreenLockPortraitIcon />, path: '/lock-screen', requiredPermission: null },
                    ]
                },
                {
                    text: 'Error Pages (Views)', icon: <ErrorOutlineIcon />, requiredPermission: null,
                    items: [
                        { text: '404 Error Page', icon: <ErrorOutlineIcon />, path: '/404', requiredPermission: null },
                        { text: '500 Error Page', icon: <ErrorOutlineIcon />, path: '/500', requiredPermission: null },
                    ]
                },
                { text: 'Blank Page', icon: <DescriptionIcon />, path: '/dashboard/pages/blank', requiredPermission: null },
                { text: 'Pricing Page (View)', icon: <AttachMoneyIcon />, path: '/pricing', requiredPermission: null },
                { text: 'Coming Soon (View)', icon: <SendTimeExtensionIcon />, path: '/coming-soon', requiredPermission: null },
                { text: 'Under Maintenance (View)', icon: <ConstructionIcon />, path: '/maintenance', requiredPermission: null },
                {
                    text: 'Content (CMS)', icon: <WebAssetIcon />, requiredPermission: 'cms_page:manage',
                    items: [
                        { text: 'CMS Pages', icon: <WebAssetIcon />, path: '/dashboard/cms/pages', requiredPermission: 'cms_page:manage' },
                        {
                            text: 'Blog', icon: <BookIcon />, requiredPermission: 'cms_blog:read',
                            items: [
                                { text: 'All Blogs', icon: <BookIcon />, path: '/dashboard/cms/blog/all', requiredPermission: 'cms_blog:read' },
                                { text: 'Blog Tags', icon: <LocalOfferIcon />, path: '/dashboard/cms/blog/tags', requiredPermission: 'cms_blog_tag:manage' },
                                { text: 'Blog Categories', icon: <CategoryIcon />, path: '/dashboard/cms/blog/categories', requiredPermission: 'cms_blog_category:manage' },
                                { text: 'Blog Comments', icon: <CommentIcon />, path: '/dashboard/cms/blog/comments', requiredPermission: 'cms_blog_comment:manage' },
                            ]
                        },
                        {
                            text: 'Locations (CMS)', icon: <LocationCityIcon />, requiredPermission: 'cms_location_country:manage',
                            items: [
                                { text: 'Countries', icon: <PublicIcon />, path: '/dashboard/cms/locations/countries', requiredPermission: 'cms_location_country:manage' },
                                { text: 'States', icon: <MapIcon />, path: '/dashboard/cms/locations/states', requiredPermission: 'cms_location_state:manage' },
                                { text: 'Cities', icon: <LocationCityIcon />, path: '/dashboard/cms/locations/cities', requiredPermission: 'cms_location_city:manage' },
                            ]
                        },
                        { text: 'Testimonials', icon: <RecordVoiceOverIcon />, path: '/dashboard/cms/testimonials', requiredPermission: 'cms_testimonial:manage' },
                        { text: 'FAQ', icon: <QuizIcon />, path: '/dashboard/cms/faq', requiredPermission: 'cms_faq:manage' },
                    ]
                },
                {
                    text: 'HRM', icon: <BadgeIcon />, requiredPermission: 'employee:read',
                    items: [
                        { text: 'Employees', icon: <BadgeIcon />, path: '/dashboard/hrm/employees', requiredPermission: 'employee:read' },
                        { text: 'Departments', icon: <CorporateFareIcon />, path: '/dashboard/hrm/departments', requiredPermission: 'department:read' },
                        { text: 'Designations', icon: <AssignmentIndIcon />, path: '/dashboard/hrm/designations', requiredPermission: 'designation:read' },
                        { text: 'Shifts', icon: <WorkHistoryIcon />, path: '/dashboard/hrm/shifts', requiredPermission: 'shift:read' },
                        {
                            text: 'Attendance', icon: <EventAvailableIcon />, requiredPermission: 'attendance:read_employee',
                            items: [
                                { text: 'Employee Attendance', icon: <EventAvailableIcon />, path: '/dashboard/hrm/attendance/employee', requiredPermission: 'attendance:read_employee' },
                                { text: 'Admin Attendance View', icon: <AdminPanelSettingsIcon />, path: '/dashboard/hrm/attendance/admin', requiredPermission: 'attendance:read_all' },
                            ]
                        },
                        {
                            text: 'Leaves & Holidays', icon: <EventBusyIcon />, requiredPermission: 'leave_request:read_own',
                            items: [
                                { text: 'Admin Leaves', icon: <AdminPanelSettingsIcon />, path: '/dashboard/hrm/leaves/admin', requiredPermission: 'leave_request:manage_all' },
                                { text: 'Employee Leaves', icon: <EventBusyIcon />, path: '/dashboard/hrm/leaves/employee', requiredPermission: 'leave_request:read_own' },
                                { text: 'Leave Types', icon: <ListAltIcon />, path: '/dashboard/hrm/leave-types', requiredPermission: 'leave_type:manage' },
                                { text: 'Holidays', icon: <HolidayVillageIcon />, path: '/dashboard/hrm/holidays', requiredPermission: 'holiday:manage' },
                            ]
                        },
                        {
                            text: 'Payroll', icon: <PaidIcon />, requiredPermission: 'payroll:manage_salary',
                            items: [
                                { text: 'Employee Salary', icon: <PaidIcon />, path: '/dashboard/hrm/payroll/salaries', requiredPermission: 'payroll:manage_salary' },
                                { text: 'Payslips', icon: <ReceiptLongIcon />, path: '/dashboard/hrm/payroll/payslips', requiredPermission: 'payroll:generate_payslip' },
                            ]
                        }
                    ]
                }
            ]
        },
        {
            id: "reports", label: "Reports", icon: <AssessmentIcon />, requiredPermission: 'report:read',
            items: [
                { text: 'Sales Report', icon: <ShowChartIcon />, path: '/dashboard/reports/sales', requiredPermission: 'report:read_sales' },
                { text: 'Purchase Report', icon: <ShowChartIcon />, path: '/dashboard/reports/purchase', requiredPermission: 'report:read_purchase' },
                { text: 'Inventory Report', icon: <ShowChartIcon />, path: '/dashboard/reports/inventory', requiredPermission: 'report:read_inventory' },
                { text: 'Invoice Report', icon: <MonetizationOnIcon />, path: '/dashboard/reports/invoice', requiredPermission: 'report:read_invoice' },
                { text: 'Supplier Report', icon: <GroupIcon />, path: '/dashboard/reports/supplier', requiredPermission: 'report:read_supplier' },
                { text: 'Customer Report', icon: <GroupIcon />, path: '/dashboard/reports/customer', requiredPermission: 'report:read_customer' },
                { text: 'Product Report', icon: <SummarizeIcon />, path: '/dashboard/reports/product', requiredPermission: 'report:read_product' },
                { text: 'Expense Report', icon: <SummarizeIcon />, path: '/dashboard/reports/expense', requiredPermission: 'report:read_expense' },
                { text: 'Income Report', icon: <MonetizationOnIcon />, path: '/dashboard/reports/income', requiredPermission: 'report:read_income' },
                { text: 'Tax Report', icon: <MonetizationOnIcon />, path: '/dashboard/reports/tax', requiredPermission: 'report:read_tax' },
                { text: 'Profit & Loss', icon: <PaidIcon />, path: '/dashboard/reports/profit-loss', requiredPermission: 'report:read_financial' },
                { text: 'Annual Report', icon: <EventNoteIcon />, path: '/dashboard/reports/annual', requiredPermission: 'report:read_annual' },
            ]
        },
        {
            id: "settings", label: "Settings", icon: <SettingsIcon />, requiredPermission: 'system:manage_settings',
            items: [
                {
                    text: 'General Settings', icon: <TuneIcon />, requiredPermission: 'settings:manage_profile',
                    items: [
                        { text: 'Profile Settings', icon: <AccountCircleIcon />, path: '/dashboard/settings/general/profile', requiredPermission: 'settings:manage_profile' },
                        { text: 'Security Settings', icon: <FingerprintIcon />, path: '/dashboard/settings/general/security', requiredPermission: 'settings:manage_security' },
                        { text: 'Notification Settings', icon: <NotificationsIcon />, path: '/dashboard/settings/general/notification', requiredPermission: 'settings:manage_notification' },
                        { text: 'Connected Apps', icon: <PowerIcon />, path: '/dashboard/settings/general/connected-apps', requiredPermission: 'settings:manage_connected_apps' },
                    ]
                },
                {
                    text: 'Website Settings', icon: <LanguageIcon />, requiredPermission: 'settings:manage_website_config',
                    items: [
                        { text: 'Site Configuration', icon: <SettingsApplicationsIcon />, path: '/dashboard/settings/website/site-config', requiredPermission: 'settings:manage_website_config' },
                        { text: 'Company Settings', icon: <BusinessIcon />, path: '/dashboard/settings/website/company', requiredPermission: 'settings:manage_company' },
                        { text: 'Localization', icon: <GTranslateIcon />, path: '/dashboard/settings/website/localization', requiredPermission: 'settings:manage_localization' },
                        { text: 'Prefixes', icon: <AbcIcon />, path: '/dashboard/settings/website/prefixes', requiredPermission: 'settings:manage_prefixes' },
                        { text: 'Preferences', icon: <ChecklistIcon />, path: '/dashboard/settings/website/preferences', requiredPermission: 'settings:manage_preferences' },
                        { text: 'Social Authentication', icon: <VpnKeyIcon />, path: '/dashboard/settings/website/social-auth', requiredPermission: 'settings:manage_social_auth' },
                        { text: 'Languages', icon: <GTranslateIcon />, path: '/dashboard/settings/website/languages', requiredPermission: 'settings:manage_languages' },
                    ]
                },
                {
                    text: 'App Settings', icon: <AppSettingsAltIcon />, requiredPermission: 'settings:manage_invoice_settings',
                    items: [
                        {
                            text: 'Invoice', icon: <ReceiptLongIcon />, requiredPermission: 'settings:manage_invoice_settings',
                            items: [
                                { text: 'Invoice Settings', icon: <SettingsIcon />, path: '/dashboard/settings/app/invoice', requiredPermission: 'settings:manage_invoice_settings' },
                                { text: 'Invoice Templates', icon: <DescriptionIcon />, path: '/dashboard/settings/app/invoice-templates', requiredPermission: 'settings:manage_invoice_templates' },
                            ]
                        },
                        { text: 'Printer Settings', icon: <PrintIcon />, path: '/dashboard/settings/app/printer', requiredPermission: 'settings:manage_printer' },
                        { text: 'POS Settings', icon: <PointOfSaleIcon />, path: '/dashboard/settings/app/pos', requiredPermission: 'settings:manage_pos' },
                        { text: 'Custom Fields', icon: <InputIcon />, path: '/dashboard/settings/app/custom-fields', requiredPermission: 'settings:manage_custom_fields' },
                    ]
                },
                {
                    text: 'System Settings (Core)', icon: <SettingsSystemDaydreamIcon />, requiredPermission: 'settings:manage_email',
                    items: [
                        {
                            text: 'Email', icon: <EmailIcon />, requiredPermission: 'settings:manage_email',
                            items: [
                                { text: 'Email Settings', icon: <EmailIcon />, path: '/dashboard/settings/system/email', requiredPermission: 'settings:manage_email' },
                                { text: 'Email Templates', icon: <DescriptionIcon />, path: '/dashboard/settings/system/email-templates', requiredPermission: 'settings:manage_email_templates' },
                            ]
                        },
                        {
                            text: 'SMS', icon: <SmsIcon />, requiredPermission: 'settings:manage_sms',
                            items: [
                                { text: 'SMS Settings', icon: <SmsIcon />, path: '/dashboard/settings/system/sms', requiredPermission: 'settings:manage_sms' },
                                { text: 'SMS Templates', icon: <DescriptionIcon />, path: '/dashboard/settings/system/sms-templates', requiredPermission: 'settings:manage_sms_templates' },
                            ]
                        },
                        { text: 'OTP Settings', icon: <PasswordIcon />, path: '/dashboard/settings/system/otp', requiredPermission: 'settings:manage_otp' },
                    ]
                },
                {
                    text: 'Financial Settings (Config)', icon: <PaidIcon />, requiredPermission: 'settings:manage_payment_gateways',
                    items: [
                        { text: 'Payment Gateways', icon: <PaymentIcon />, path: '/dashboard/settings/financial/payment-gateways', requiredPermission: 'settings:manage_payment_gateways' },
                        { text: 'Bank Account Settings', icon: <AccountBalanceIcon />, path: '/dashboard/settings/financial/bank-accounts', requiredPermission: 'settings:manage_financial_bank_accounts' },
                        { text: 'Tax Rates', icon: <MonetizationOnIcon />, path: '/dashboard/settings/financial/tax-rates', requiredPermission: 'settings:manage_tax_rates' },
                        { text: 'Currencies', icon: <AttachMoneyIcon />, path: '/dashboard/settings/financial/currencies', requiredPermission: 'settings:manage_currencies' },
                    ]
                },
                {
                    text: 'Other Settings', icon: <MoreHorizIcon />, requiredPermission: 'settings:manage_storage',
                    items: [
                        { text: 'Storage Settings', icon: <StorageIcon />, path: '/dashboard/settings/other/storage', requiredPermission: 'settings:manage_storage' },
                    ]
                }
            ]
        },
        {
            id: "more", label: "More", icon: <MoreHorizIcon />, requiredPermission: null,
            items: [
                {
                    text: 'People', icon: <PeopleIcon />, requiredPermission: 'customer:read', // Grouping
                    items: [
                        { text: 'Customers', icon: <PeopleIcon />, path: '/dashboard/customers', requiredPermission: 'customer:read' }, // MODIFIED PATH
                        { text: 'Billers', icon: <SupervisedUserCircleIcon />, path: '/dashboard/peoples/billers', requiredPermission: 'biller:read' }, // Check if '/dashboard/billers' exists in App.jsx or adjust
                        { text: 'Suppliers', icon: <LocalShippingIcon />, path: '/dashboard/suppliers', requiredPermission: 'supplier:read' }, // MODIFIED PATH
                        { text: 'Stores', icon: <StoreIcon />, path: '/dashboard/stores', requiredPermission: 'store:read' }, // MODIFIED PATH (matches App.jsx)
                        { text: 'Warehouses', icon: <HomeWorkIcon />, path: '/dashboard/peoples/warehouses', requiredPermission: 'warehouse:read' }, // Check if '/dashboard/warehouses' exists or adjust
                    ]
                },
                {
                    text: 'User Management', icon: <AdminPanelSettingsIcon />, requiredPermission: 'user:read_all', // Grouping
                    items: [
                        { text: 'Users', icon: <PeopleIcon />, path: '/dashboard/users', requiredPermission: 'user:read_all' },
                        { text: 'Roles', icon: <AdminPanelSettingsIcon />, path: '/dashboard/roles', requiredPermission: 'role:manage' },
                        { text: 'Permissions', icon: <VpnKeyIcon />, path: '/dashboard/permissions', requiredPermission: 'permission:read' },
                        { text: 'Permission Categories', icon: <CategoryIcon />, path: '/dashboard/permission-categories', requiredPermission: 'permission_category:manage' },
                        { text: 'Access Control', icon: <AdminPanelSettingsIcon />, path: '/dashboard/access-control', requiredPermission: 'role:assign_permissions' },
                        { text: 'Delete Account Requests', icon: <DeleteSweepIcon />, path: '/dashboard/delete-requests', requiredPermission: 'user:delete_request_manage' },
                    ]
                },
                {
                    text: 'Help', icon: <HelpOutlineIcon />, requiredPermission: null, // Grouping
                    items: [
                        { text: 'Documentation', icon: <ArticleIcon />, path: '/dashboard/help/documentation', requiredPermission: null },
                        { text: 'Changelog', icon: <ChangeHistoryIcon />, path: '/dashboard/help/changelog', requiredPermission: null },
                    ]
                }
            ]
        }
    ], [user, userCan, logoutUser]); // Added user, userCan, logoutUser as dependencies

    const hasPermission = useCallback((requiredPermission) => {
        // console.log('[HorizontalMenu hasPermission] Checking item with requiredPermission:', requiredPermission);
        if (!requiredPermission) {
            // console.log('[HorizontalMenu hasPermission] Result: true (no specific permission required)');
            return true;
        }
        if (userCan) {
            const can = userCan(requiredPermission);
            // console.log('[HorizontalMenu hasPermission] userCan returned:', can, 'for', requiredPermission);
            return can;
        }
        // console.warn('[HorizontalMenu hasPermission] userCan function not available from useAuth(). Defaulting to false.');
        return false;
    }, [userCan]);

    const handleMenuOpen = (event, sectionId) => {
        setAnchorEl(prev => ({ ...prev, [sectionId]: event.currentTarget }));
    };

    const handleMenuClose = (sectionId) => {
        setAnchorEl(prev => ({ ...prev, [sectionId]: null }));
    };

    // Handlers for nested menus
    const handleNestedMenuOpen = (event, parentItemId) => {
        event.stopPropagation(); 
        setNestedAnchorEl(prev => ({ ...prev, [parentItemId]: event.currentTarget }));
    };

    const handleNestedMenuClose = (parentItemId) => {
        setNestedAnchorEl(prev => ({ ...prev, [parentItemId]: null }));
    };

    const handleSubMenuItemClick = (parentItemId, sectionId) => {
        handleNestedMenuClose(parentItemId); 
        handleMenuClose(sectionId); 
    };

    return (
        <AppBar
            position="fixed"
            sx={{
                top: 0,
                zIndex: (theme) => theme.zIndex.drawer + 1,
                backgroundColor: 'background.paper',
                color: 'text.primary',
                boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
            }}
        >
            <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', py: 1 }}>
                    {horizontalMenuSections.map((section) => {
                        if (!hasPermission(section.requiredPermission)) {
                            if (section.id === 'inventory') {
                                console.log(`[HorizontalMenu Debug] Inventory section itself filtered out. Main permission '${section.requiredPermission}' evaluated to false.`);
                            }
                            return null;
                        }

                        const filteredSubItems = section.items.filter(subItem => {
                            const canAccessSubItem = hasPermission(subItem.requiredPermission);
                            if (section.id === 'inventory') {
                                console.log(`[HorizontalMenu Debug] Filtering inventory item: "${subItem.text}", perm: "${subItem.requiredPermission}", access: ${canAccessSubItem}`);
                            }
                            if (section.id === 'more') {
                                console.log(`[HorizontalMenu Debug] Filtering "More" section item: "${subItem.text}", perm: "${subItem.requiredPermission}", access: ${canAccessSubItem}`);
                            }
                            return canAccessSubItem;
                        });
                        
                        if (section.id === 'inventory') {
                            console.log(`[HorizontalMenu Debug] Inventory section: main permission '${section.requiredPermission}' access: ${hasPermission(section.requiredPermission)}`);
                            console.log(`[HorizontalMenu Debug] Inventory filteredSubItems count: ${filteredSubItems.length}`, JSON.parse(JSON.stringify(filteredSubItems.map(item => ({text: item.text, perm: item.requiredPermission})))));
                        }

                        if (section.id === 'more') {
                            console.log(`[HorizontalMenu Debug] "More" section: main permission '${section.requiredPermission}' access: ${hasPermission(section.requiredPermission)}`);
                            console.log(`[HorizontalMenu Debug] "More" section - original items count: ${section.items.length}`);
                            console.log(`[HorizontalMenu Debug] "More" section - filteredSubItems count: ${filteredSubItems.length}`);
                            console.log(`[HorizontalMenu Debug] "More" section - filteredSubItems content:`, JSON.parse(JSON.stringify(filteredSubItems.map(item => ({text: item.text, perm: item.requiredPermission, hasSubItems: !!item.items})))));

                            const peopleItemOriginal = section.items.find(it => it.text === 'People');
                            if (peopleItemOriginal) {
                                console.log(`[HorizontalMenu Debug] "More" section - "People" group original permission: '${peopleItemOriginal.requiredPermission}', access via hasPermission: ${hasPermission(peopleItemOriginal.requiredPermission)}`);
                            }
                            const userManagementItemOriginal = section.items.find(it => it.text === 'User Management');
                            if (userManagementItemOriginal) {
                                console.log(`[HorizontalMenu Debug] "More" section - "User Management" group original permission: '${userManagementItemOriginal.requiredPermission}', access via hasPermission: ${hasPermission(userManagementItemOriginal.requiredPermission)}`);
                            }
                        }
                        
                        if (section.id === "mainMenu" && filteredSubItems.length > 0 && filteredSubItems[0].path) {
                             const mainDashboardItem = filteredSubItems[0];
                             return (
                                 <Button
                                     key={mainDashboardItem.text}
                                     color="inherit"
                                     component={RouterLink}
                                     to={mainDashboardItem.path}
                                     startIcon={section.icon}
                                     sx={{ textTransform: 'none', mx: 0.5, whiteSpace: 'nowrap', flexShrink: 0 }}
                                 >
                                     {section.label}
                                 </Button>
                             );
                        }
                        
                        if (filteredSubItems.length > 0) {
                            if (section.id === 'inventory') {
                                console.log(`[HorizontalMenu Debug] Inventory section will be rendered because filteredSubItems.length is ${filteredSubItems.length}.`);
                            }
                            return (
                                <Box key={section.id} sx={{ mx: 0.5, flexShrink: 0 }}>
                                    <Button
                                        id={`${section.id}-button`}
                                        color="inherit"
                                        onClick={(e) => handleMenuOpen(e, section.id)}
                                        aria-controls={anchorEl[section.id] ? `${section.id}-menu` : undefined}
                                        aria-haspopup="true"
                                        aria-expanded={Boolean(anchorEl[section.id])}
                                        startIcon={section.icon}
                                        endIcon={<ExpandMoreIcon />}
                                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                    >
                                        {section.label}
                                    </Button>
                                    <Menu
                                        id={`${section.id}-menu`}
                                        anchorEl={anchorEl[section.id]}
                                        open={Boolean(anchorEl[section.id])}
                                        onClose={() => handleMenuClose(section.id)}
                                        MenuListProps={{ 'aria-labelledby': `${section.id}-button` }}
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                        PaperProps={{
                                            style: {
                                              maxHeight: 'calc(100vh - 100px)', 
                                              overflowY: 'auto',
                                            },
                                          }}
                                    >
                                        {filteredSubItems.map((item) => {
                                            const parentItemId = item.text; 

                                            if (item.items && item.items.length > 0) {
                                                const filteredNestedItems = item.items.filter(sub => hasPermission(sub.requiredPermission));
                                                
                                                if (filteredNestedItems.length === 0) {
                                                    return null; 
                                                }

                                                return (
                                                    <div key={parentItemId}>
                                                        <MenuItem
                                                            onClick={(e) => handleNestedMenuOpen(e, parentItemId)}
                                                            aria-haspopup="true"
                                                            aria-expanded={Boolean(nestedAnchorEl[parentItemId])}
                                                        >
                                                            {item.icon && <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>}
                                                            {item.text}
                                                            <ChevronRightIcon sx={{ ml: 'auto' }} />
                                                        </MenuItem>
                                                        <Menu
                                                            id={`${parentItemId}-submenu`}
                                                            anchorEl={nestedAnchorEl[parentItemId]}
                                                            open={Boolean(nestedAnchorEl[parentItemId])}
                                                            onClose={() => handleNestedMenuClose(parentItemId)}
                                                            MenuListProps={{ 'aria-labelledby': `${parentItemId}-button` }} 
                                                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                                            transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                                            PaperProps={{
                                                                style: {
                                                                  maxHeight: 'calc(100vh - 100px)',
                                                                  overflowY: 'auto',
                                                                },
                                                              }}
                                                        >
                                                            {filteredNestedItems.map(subItem => (
                                                                <MenuItem
                                                                    key={subItem.text + (subItem.path || '')}
                                                                    component={RouterLink}
                                                                    to={subItem.path}
                                                                    onClick={() => handleSubMenuItemClick(parentItemId, section.id)}
                                                                    selected={location.pathname === subItem.path || (subItem.path && location.pathname.startsWith(subItem.path + '/'))}
                                                                >
                                                                    {subItem.icon && <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>{subItem.icon}</Box>}
                                                                    {subItem.text}
                                                                </MenuItem>
                                                            ))}
                                                        </Menu>
                                                    </div>
                                                );
                                            } else {
                                                return (
                                                    <MenuItem
                                                        key={item.text + (item.path || '')}
                                                        component={RouterLink}
                                                        to={item.path}
                                                        onClick={() => handleMenuClose(section.id)}
                                                        selected={location.pathname === item.path || (item.path && location.pathname.startsWith(item.path + '/'))}
                                                    >
                                                        {item.icon && <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>{item.icon}</Box>}
                                                        {item.text}
                                                    </MenuItem>
                                                );
                                            }
                                        })}
                                    </Menu>
                                </Box>
                            );
                        } else {
                            if (section.id === 'inventory') {
                                console.log(`[HorizontalMenu Debug] Inventory section will NOT be rendered because filteredSubItems.length is 0.`);
                            }
                        }
                        return null;
                    })}
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, flexShrink: 0 }}>
                    <IconButton
                        color="inherit"
                        onClick={() => {
                            console.log('Logout button clicked. Attempting to call logout function...');
                            if (typeof logoutUser === 'function') {
                                logoutUser();
                            } else {
                                console.error('The logout function provided by AuthContext is not available or is not a function. Please check your AuthContext implementation.');
                            }
                        }}
                        title="Logout"
                    >
                        <LogoutIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default HorizontalMenu;