import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

export interface ViewSelectorOption {
    value: string;
    label: string;
    icon?: React.ReactElement;
}

export interface ViewSelectorProps {
    options: ViewSelectorOption[];
    currentView: string; // Changed from currentValue to currentView for consistency
    onChange: (newView: string) => void;
    label?: string; // Optional label for the view selector trigger
}

export interface Breadcrumb {
    label: string;
    path?: string;
}

// This MenuAction is for the generic `actions` array for additional custom buttons
export interface MenuAction {
    type: 'button' | 'iconButton' | 'menuButton' | 'divider' | 'custom';
    id: string;
    label?: string; // Required for button, menuButton, optional for iconButton (tooltip then)
    icon?: React.ReactElement;
    onClick?: (event?: React.MouseEvent<HTMLElement>) => void; // Make event optional
    variant?: 'text' | 'outlined' | 'contained';
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    disabled?: boolean;
    tooltip?: string;
    menuItems?: Array<{ // For type 'menuButton'
        id: string;
        label: string;
        icon?: React.ReactElement;
        onClick: () => void;
        disabled?: boolean;
    }>;
    endIcon?: React.ReactElement; // For type 'menuButton'
    component?: React.ReactNode; // For type 'custom'
}

export interface MenuProps {
    pageTitle?: string;
    breadcrumbs?: Breadcrumb[];
    viewSelector?: ViewSelectorProps;
    actions?: MenuAction[]; // For additional custom actions

    // Standard Actions
    showNewAction?: boolean;
    onNewActionClick?: () => void;
    isNewActionEnabled?: boolean;
    newActionLabel?: string;
    newActionIcon?: React.ReactElement;

    showDeleteAction?: boolean;
    onDeleteActionClick?: () => void;
    isDeleteActionEnabled?: boolean;
    deleteActionLabel?: string;
    deleteActionIcon?: React.ReactElement;

    showSearchAction?: boolean;
    onSearchSubmit?: (searchText: string) => void;
    searchPlaceholder?: string;
    initialSearchText?: string;


    // Sidebar Toggles & Standard Right Icons
    isFilterSidebarVisible?: boolean;
    toggleFilterSidebar?: () => void;
    isDetailsSidebarVisible?: boolean;
    toggleDetailsSidebar?: () => void;
    showFilter?: boolean;
    showShare?: boolean;
    showViewToggle?: boolean; // This might be redundant if viewSelector is used
    showInfo?: boolean;
    isInfoActionEnabled?: boolean;
    onInfoClick?: () => void;
    showFullscreen?: boolean;
    showBookmark?: boolean;
    hideStandardRightIcons?: boolean;
}

interface SecondaryMenuContextType {
    menuProps: MenuProps;
    setMenuProps: (newProps: Partial<MenuProps>) => void;
}

// Define initial state with defaults for all properties
const initialState: MenuProps = {
    pageTitle: 'Page',
    breadcrumbs: [],
    viewSelector: undefined,
    actions: [],

    showNewAction: false,
    onNewActionClick: undefined,
    isNewActionEnabled: true,
    newActionLabel: 'New',
    newActionIcon: undefined, // Default to undefined, specific icon can be passed

    showDeleteAction: false,
    onDeleteActionClick: undefined,
    isDeleteActionEnabled: false,
    deleteActionLabel: 'Delete',
    deleteActionIcon: undefined,

    showSearchAction: false,
    onSearchSubmit: undefined,
    searchPlaceholder: 'Search...',
    initialSearchText: '',

    isFilterSidebarVisible: false,
    toggleFilterSidebar: undefined,
    isDetailsSidebarVisible: false,
    toggleDetailsSidebar: undefined,
    showFilter: true,
    showShare: true,
    showViewToggle: true,
    showInfo: false,
    isInfoActionEnabled: false,
    onInfoClick: undefined,
    showFullscreen: true,
    showBookmark: true,
    hideStandardRightIcons: false,
};

const SecondaryMenuContext = createContext<SecondaryMenuContextType | undefined>(undefined);

export const SecondaryMenuProvider = ({ children }: { children: ReactNode }) => {
    const [menuPropsState, setMenuPropsState] = useState<MenuProps>(initialState);

    // Memoize setMenuProps with useCallback
    // initialState is a module-level constant, so it's stable.
    // setMenuPropsState from useState is also stable.
    // Thus, the dependency array for useCallback can be empty.
    const setMenuProps = useCallback((newProps: Partial<MenuProps>) => {
        if (Object.keys(newProps).length === 0) {
            setMenuPropsState(initialState); // Reset to initial state
        } else {
            // Merge new props with previous state, ensuring defaults from initialState are base
            setMenuPropsState(prevProps => ({
                ...initialState, // Apply defaults first
                ...prevProps,   // Keep existing unrelated props from current state
                ...newProps     // Apply new specific props
            }));
        }
    }, []); // Empty dependency array because initialState is constant and setMenuPropsState is stable

    return (
        <SecondaryMenuContext.Provider value={{ menuProps: menuPropsState, setMenuProps }}>
            {children}
        </SecondaryMenuContext.Provider>
    );
};

export const useSecondaryMenu = () => {
    const context = useContext(SecondaryMenuContext);
    if (context === undefined) {
        throw new Error('useSecondaryMenu must be used within a SecondaryMenuProvider');
    }
    return context;
};