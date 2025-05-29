import React, { useState, useMemo, useCallback } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
    AppBar, Toolbar, Button, Menu, MenuItem, Typography, Box, IconButton, Avatar
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

// --- Icon Imports (from your provided code) ---
import AbcIcon from '@mui/icons-material/Abc';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AppSettingsAltIcon from '@mui/icons-material/AppSettingsAlt';
import AppsIcon from '@mui/icons-material/Apps';
import ArticleIcon from '@mui/icons-material/Article';
import AssessmentIcon from '@mui/icons-material/Assessment';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BadgeIcon from '@mui/icons-material/Badge';
import DocumentScannerIcon from '@mui/icons-material/DocumentScanner';
import BookIcon from '@mui/icons-material/Book';
import BusinessIcon from '@mui/icons-material/Business';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CategoryIcon from '@mui/icons-material/Category';
import ChangeHistoryIcon from '@mui/icons-material/ChangeHistory';
import ChecklistIcon from '@mui/icons-material/Checklist';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CommentIcon from '@mui/icons-material/Comment';
import ConstructionIcon from '@mui/icons-material/Construction';
import CoPresentIcon from '@mui/icons-material/CoPresent';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import DashboardIcon from '@mui/icons-material/Dashboard';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DescriptionIcon from '@mui/icons-material/Description';
import EmailIcon from '@mui/icons-material/Email';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
// import EngineeringIcon from '@mui/icons-material/Engineering'; // Already have AssignmentIndIcon for Designation
import ErrorIcon from '@mui/icons-material/Error';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import GTranslateIcon from '@mui/icons-material/GTranslate';
import GroupIcon from '@mui/icons-material/Group';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import HistoryIcon from '@mui/icons-material/History';
import HolidayVillageIcon from '@mui/icons-material/HolidayVillage';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import InputIcon from '@mui/icons-material/Input';
import InventoryIcon from '@mui/icons-material/Inventory';
import LanguageIcon from '@mui/icons-material/Language';
import ListAltIcon from '@mui/icons-material/ListAlt';
import LocalMallIcon from '@mui/icons-material/LocalMall';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import LockResetIcon from '@mui/icons-material/LockReset';
import LogoutIcon from '@mui/icons-material/Logout';
import MapIcon from '@mui/icons-material/Map';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import NotificationsIcon from '@mui/icons-material/Notifications';
import OnlinePredictionIcon from '@mui/icons-material/OnlinePrediction';
import PaidIcon from '@mui/icons-material/Paid';
import PasswordIcon from '@mui/icons-material/Password';
import PaymentIcon from '@mui/icons-material/Payment';
// import PaymentsIcon from '@mui/icons-material/Payments'; // Already have PaidIcon for Payroll
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PowerIcon from '@mui/icons-material/Power';
// import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'; // Not used in menu
import PriceCheckIcon from '@mui/icons-material/PriceCheck';
import PrintIcon from '@mui/icons-material/Print';
import PublicIcon from '@mui/icons-material/Public';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import QuizIcon from '@mui/icons-material/Quiz';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ScreenLockPortraitIcon from '@mui/icons-material/ScreenLockPortrait';
import SendTimeExtensionIcon from '@mui/icons-material/SendTimeExtension';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsApplicationsIcon from '@mui/icons-material/SettingsApplications';
import SettingsSystemDaydreamIcon from '@mui/icons-material/SettingsSystemDaydream';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SmsIcon from '@mui/icons-material/Sms';
import StarIcon from '@mui/icons-material/Star';
import StoreIcon from '@mui/icons-material/Store';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StorageIcon from '@mui/icons-material/Storage';
import StraightenIcon from '@mui/icons-material/Straighten';
import StyleIcon from '@mui/icons-material/Style';
import SummarizeIcon from '@mui/icons-material/Summarize';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
import TransferWithinAStationIcon from '@mui/icons-material/TransferWithinAStation';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TuneIcon from '@mui/icons-material/Tune';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import WebAssetIcon from '@mui/icons-material/WebAsset';
// import WebIcon from '@mui/icons-material/Web'; // Not explicitly used for a menu item
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
// import SecurityIcon from '@mui/icons-material/Security'; // Not used in menu, FingerprintIcon is used for Security Settings
// SupplierIcon was an alias for LocalShippingIcon, which is already imported.

const TOP_BAR_HEIGHT_FOR_HORIZONTAL_MENU = 48;

const HorizontalMenu = () => {
    const location = useLocation();
    const { user, userCan, logoutUser } = useAuth();

    const [anchorEl, setAnchorEl] = useState({});
    const [nestedAnchorEl, setNestedAnchorEl] = useState({});

    const horizontalMenuSections = useMemo(() => [
        {
            id: "mainMenu", label: "Main Menu", icon: <AppsIcon />, requiredPermission: null,
            items: [
                { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, requiredPermission: 'user:read_self' },
            ]
        },
        {
            id: "inventory", label: "Inventory", icon: <InventoryIcon />, requiredPermission: 'item:read',
            items: [
                { text: 'Items', icon: <InventoryIcon />, path: '/dashboard/items', requiredPermission: 'item:read' },
                { text: 'Create Item', icon: <AddCircleOutlineIcon />, path: '/dashboard/items/new', requiredPermission: 'item:create' },
                { text: 'Expired Items', icon: <HistoryIcon />, path: '/dashboard/inventory/expired', requiredPermission: 'inventory:read_expired' },
                { text: 'Low Stocks', icon: <TrendingDownIcon />, path: '/dashboard/inventory/low-stocks', requiredPermission: 'inventory:read_lowstock' },
                { text: 'Category', icon: <CategoryIcon />, path: '/dashboard/categories', requiredPermission: 'category:read' },
                { text: 'Sub Category', icon: <CategoryIcon />, path: '/dashboard/sub-categories', requiredPermission: 'subcategory:read' },
                { text: 'Brands', icon: <BusinessIcon />, path: '/dashboard/brands', requiredPermission: 'brand:read' },
                { text: 'Units', icon: <StraightenIcon />, path: '/dashboard/units', requiredPermission: 'unit:read' },
                { text: 'Variant Attributes', icon: <StyleIcon />, path: '/dashboard/attributes', requiredPermission: 'item_attribute:read' },
                { text: 'Warranties', icon: <VerifiedUserIcon />, path: '/dashboard/warranties', requiredPermission: 'warranty:read' },
                { text: 'Print Barcode', icon: <PrintIcon />, path: '/dashboard/inventory/print-barcode', requiredPermission: 'inventory:print_barcode' },
                { text: 'Print QR Code', icon: <QrCodeScannerIcon />, path: '/dashboard/inventory/print-qrcode', requiredPermission: 'inventory:print_qrcode' },
                { text: 'Item Barcodes', icon: <DocumentScannerIcon />, path: '/dashboard/inventory/item-barcodes', requiredPermission: 'item_barcode:manage' },
                { text: 'Barcode Symbologies', icon: <TuneIcon />, path: '/dashboard/barcode-symbologies', requiredPermission: 'barcode_symbology:read' },
                { text: 'Discount Types', icon: <LocalOfferIcon />, path: '/dashboard/discount-types', requiredPermission: 'discount_type:manage' },
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
                { text: 'Item Report', icon: <SummarizeIcon />, path: '/dashboard/reports/item', requiredPermission: 'report:read_item' },
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
                    text: 'People', icon: <PeopleIcon />, requiredPermission: 'customer:read',
                    items: [
                        { text: 'Customers', icon: <PeopleIcon />, path: '/dashboard/customers', requiredPermission: 'customer:read' },
                        { text: 'Billers', icon: <SupervisedUserCircleIcon />, path: '/dashboard/peoples/billers', requiredPermission: 'biller:read' },
                        { text: 'Suppliers', icon: <LocalShippingIcon />, path: '/dashboard/suppliers', requiredPermission: 'supplier:read' },
                        { text: 'Stores', icon: <StoreIcon />, path: '/dashboard/stores', requiredPermission: 'store:read' },
                        { text: 'Warehouses', icon: <HomeWorkIcon />, path: '/dashboard/peoples/warehouses', requiredPermission: 'warehouse:read' },
                    ]
                },
                {
                    text: 'User Management', icon: <AdminPanelSettingsIcon />, requiredPermission: 'user:read_all',
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
                    text: 'Help', icon: <HelpOutlineIcon />, requiredPermission: null,
                    items: [
                        { text: 'Documentation', icon: <ArticleIcon />, path: '/dashboard/help/documentation', requiredPermission: null },
                        { text: 'Changelog', icon: <ChangeHistoryIcon />, path: '/dashboard/help/changelog', requiredPermission: null },
                    ]
                }
            ]
        }
    ], [user, userCan]); // Removed logoutUser from dependencies as it's not used in menu structure

    const hasPermission = useCallback((requiredPermission) => {
        if (!requiredPermission) return true;
        if (userCan) return userCan(requiredPermission);
        return false;
    }, [userCan]);

    const handleMenuOpen = (event, sectionId) => {
        setAnchorEl(prev => ({ ...prev, [sectionId]: event.currentTarget }));
    };

    const handleMenuClose = (sectionId) => {
        setAnchorEl(prev => ({ ...prev, [sectionId]: null }));
    };

    const handleNestedMenuOpen = (event, parentId) => {
        event.stopPropagation();
        setNestedAnchorEl(prev => ({ ...prev, [parentId]: event.currentTarget }));
    };

    const handleNestedMenuClose = (parentId) => {
        setNestedAnchorEl(prev => ({ ...prev, [parentId]: null }));
    };

    // Combined click handler for all menu items
    const handleAnyMenuItemClick = (sectionId, parentId = null) => {
        if (parentId) {
            handleNestedMenuClose(parentId);
        }
        handleMenuClose(sectionId);
    };

    // Recursive menu rendering function
    const renderMenuItems = (items, sectionId, parentMenuKey = null) => {
        return items
            .filter(item => hasPermission(item.requiredPermission))
            .map(item => {
                const currentItemKey = (parentMenuKey ? `${parentMenuKey}-` : '') + item.text.replace(/\s+/g, '-');
                const hasSubItems = Array.isArray(item.items) && item.items.length > 0;

                if (hasSubItems) {
                    const visibleSubItems = item.items.filter(sub => hasPermission(sub.requiredPermission));
                    if (visibleSubItems.length === 0) return null;

                    return (
                        <div key={currentItemKey}>
                            <MenuItem
                                onClick={(e) => handleNestedMenuOpen(e, currentItemKey)}
                                aria-haspopup="true"
                                aria-expanded={Boolean(nestedAnchorEl[currentItemKey])}
                                sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    paddingY: 1.25,
                                    paddingX: 2,
                                    borderRadius: 1, // Softer corners for menu items
                                    marginX: 0.5,
                                    marginY: 0.25,
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    {item.icon && <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>{item.icon}</Box>}
                                    <Typography variant="body2">{item.text}</Typography>
                                </Box>
                                <ChevronRightIcon sx={{ color: 'text.disabled' }} />
                            </MenuItem>
                            <Menu
                                anchorEl={nestedAnchorEl[currentItemKey]}
                                open={Boolean(nestedAnchorEl[currentItemKey])}
                                onClose={() => handleNestedMenuClose(currentItemKey)}
                                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                PaperProps={{
                                    sx: {
                                        mt: 0.5,
                                        ml: 0.5,
                                        borderRadius: 2, 
                                        boxShadow: (theme) => theme.shadows[4], // Softer shadow for nested menus
                                        minWidth: 220,
                                        maxHeight: 'calc(100vh - 120px)',
                                        overflowY: 'auto',
                                    }
                            }}
                        >
                            {renderMenuItems(visibleSubItems, sectionId, currentItemKey)}
                        </Menu>
                    </div>
                );
            } else {
                return (
                    <MenuItem
                        key={currentItemKey}
                        component={RouterLink}
                        to={item.path}
                        onClick={() => handleAnyMenuItemClick(sectionId, parentMenuKey)}
                        selected={location.pathname === item.path || (item.path && location.pathname.startsWith(item.path + '/'))}
                        sx={{
                            paddingY: 1.25,
                            paddingX: 2,
                            borderRadius: 1,
                            marginX: 0.5,
                            marginY: 0.25,
                            '&:hover': {
                                backgroundColor: 'action.hover',
                            },
                            '&.Mui-selected': {
                                backgroundColor: 'primary.main',
                                color: 'primary.contrastText',
                                fontWeight: 'medium',
                                '& .MuiSvgIcon-root': { // Ensure icon color contrasts when selected
                                    color: 'primary.contrastText',
                                },
                                '&:hover': {
                                    backgroundColor: 'primary.dark',
                                },
                            },
                        }}
                    >
                        {item.icon && <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>{item.icon}</Box>}
                        <Typography variant="body2">{item.text}</Typography>
                    </MenuItem>
                );
            }
        });
};

return (
    <AppBar
        position="fixed"
        elevation={0} // Flat app bar
        sx={{
            top: TOP_BAR_HEIGHT_FOR_HORIZONTAL_MENU,
            zIndex: (theme) => theme.zIndex.drawer + 2,
            backgroundColor: 'background.paper', // Use theme's paper color for a clean look
            color: 'text.primary',
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`, // Subtle separator
        }}
    >
        <Toolbar sx={{ justifyContent: 'space-between', minHeight: '60px', px: { xs: 1, sm: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', py: 0.5 }}>
                {horizontalMenuSections.map((section) => {
                    if (!hasPermission(section.requiredPermission)) return null;

                    const visibleItems = section.items.filter(item => hasPermission(item.requiredPermission));
                    if (visibleItems.length === 0) return null; // Completed if statement

                    if (section.id === "mainMenu" && visibleItems.length > 0 && visibleItems[0].path) {
                        return (
                            <Button
                                key={section.id}
                                component={RouterLink}
                                to={visibleItems[0].path}
                                onClick={() => handleAnyMenuItemClick(section.id)}
                                sx={{
                                    minWidth: 120,
                                    borderRadius: 1,
                                    marginX: 0.5,
                                    marginY: 0.25,
                                    paddingY: 1.25,
                                    paddingX: 2,
                                    color: 'text.primary',
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                    '&.Mui-selected': {
                                        backgroundColor: 'primary.main',
                                        color: 'primary.contrastText',
                                        fontWeight: 'medium',
                                        '& .MuiSvgIcon-root': {
                                            color: 'primary.contrastText',
                                        },
                                    },
                                }}
                            >
                                {section.icon && <Box component="span" sx={{ mr: 1.5, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>{section.icon}</Box>}
                                <Typography variant="body2">{section.label}</Typography>
                            </Button>
                        );
                    }

                    return (
                        <div key={section.id}>
                            <IconButton
                                onClick={(e) => handleMenuOpen(e, section.id)}
                                size="large"
                                sx={{
                                    borderRadius: 1,
                                    marginX: 0.5,
                                    marginY: 0.25,
                                    padding: 1.5,
                                    color: 'text.primary',
                                    backgroundColor: 'transparent',
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                }}
                            >
                                {section.icon}
                            </IconButton>
                            <Menu
                                anchorEl={anchorEl[section.id]}
                                open={Boolean(anchorEl[section.id])}
                                onClose={() => handleMenuClose(section.id)}
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                                PaperProps={{
                                    sx: {
                                        borderRadius: 2,
                                        boxShadow: (theme) => theme.shadows[4],
                                        minWidth: 220,
                                        maxHeight: 'calc(100vh - 120px)',
                                        overflowY: 'auto',
                                    }
                                }}
                            >
                                {renderMenuItems(visibleItems, section.id)}
                            </Menu>
                        </div>
                    );
                })}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                    component={RouterLink}
                    to="/dashboard/profile"
                    sx={{
                        borderRadius: 1,
                        marginX: 0.5,
                        padding: 1.5,
                        color: 'text.primary',
                        backgroundColor: 'transparent',
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                >
                    <Avatar sx={{ width: 32, height: 32 }} src={user?.profilePicture} alt={user?.name} />
                </IconButton>
                <Typography variant="body2" sx={{ color: 'text.primary', mr: 2 }}>{user?.name}</Typography>
                <IconButton
                    onClick={logoutUser}
                    sx={{
                        borderRadius: 1,
                        marginX: 0.5,
                        padding: 1.5,
                        color: 'text.primary',
                        backgroundColor: 'transparent',
                        '&:hover': {
                            backgroundColor: 'action.hover',
                        },
                    }}
                >
                    <LogoutIcon />
                </IconButton>
            </Box>
        </Toolbar>
    </AppBar>
);
};

export default HorizontalMenu;