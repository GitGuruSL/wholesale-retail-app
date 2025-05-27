// filepath: d:\Development\wholesale-retail-app\frontend\src\context\SecondaryMenuContext.tsx
import React, { createContext, useState, useContext, ReactNode, Dispatch, SetStateAction } from 'react';

// Define PageContextualMenuProps here
export interface PageContextualMenuProps {
    pageTitle?: string;
    isFilterSidebarVisible?: boolean;
    toggleFilterSidebar?: () => void;
    isDetailsSidebarVisible?: boolean;
    toggleDetailsSidebar?: () => void;
    selectedItemForDetails?: any | null; // Adjust 'any' to a more specific type if possible
    canCreateNew?: boolean;
    createNewLink?: string;
    createNewText?: string;
    contextualActions?: Array<{
        label: string;
        icon?: React.ReactElement;
        onClick: () => void;
        disabled?: boolean;
        color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    }>;
}

// Define a default empty set of props
const defaultMenuProps: PageContextualMenuProps = {
    pageTitle: '',
    isFilterSidebarVisible: false,
    toggleFilterSidebar: undefined,
    isDetailsSidebarVisible: false,
    toggleDetailsSidebar: undefined,
    selectedItemForDetails: null,
    canCreateNew: false,
    createNewLink: undefined,
    createNewText: undefined,
    contextualActions: [],
};

interface SecondaryMenuContextType {
    menuProps: PageContextualMenuProps;
    setMenuProps: Dispatch<SetStateAction<PageContextualMenuProps>>;
}

const SecondaryMenuContext = createContext<SecondaryMenuContextType | undefined>(undefined);

export const SecondaryMenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [menuProps, setMenuProps] = useState<PageContextualMenuProps>(defaultMenuProps);

    return (
        <SecondaryMenuContext.Provider value={{ menuProps, setMenuProps }}>
            {children}
        </SecondaryMenuContext.Provider>
    );
};

export const useSecondaryMenu = (): SecondaryMenuContextType => {
    const context = useContext(SecondaryMenuContext);
    if (context === undefined) {
        throw new Error('useSecondaryMenu must be used within a SecondaryMenuProvider');
    }
    return context;
};