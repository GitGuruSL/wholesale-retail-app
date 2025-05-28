import React, { createContext, useState, useContext, ReactNode } from 'react';

interface DetailsDrawerContextType {
    isOpen: boolean;
    title: string;
    content: ReactNode | null;
    openDrawer: (newTitle: string, newContent: ReactNode) => void;
    closeDrawer: () => void;
    updateDrawerContent: (newContent: ReactNode) => void;
    updateDrawerTitle: (newTitle: string) => void;
}

const DetailsDrawerContext = createContext<DetailsDrawerContextType | undefined>(undefined);

export const DetailsDrawerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState<ReactNode | null>(null);

    const openDrawer = (newTitle: string, newContent: ReactNode) => {
        setTitle(newTitle);
        setContent(newContent);
        setIsOpen(true);
    };

    const closeDrawer = () => {
        setIsOpen(false);
        // Optionally reset title and content on close
        // setTitle('');
        // setContent(null);
    };

    const updateDrawerContent = (newContent: ReactNode) => {
        if (isOpen) { // Only update if drawer is already open, or adjust logic as needed
            setContent(newContent);
        }
    };

    const updateDrawerTitle = (newTitle: string) => {
         if (isOpen) {
            setTitle(newTitle);
        }
    };

    return (
        <DetailsDrawerContext.Provider value={{ isOpen, title, content, openDrawer, closeDrawer, updateDrawerContent, updateDrawerTitle }}>
            {children}
        </DetailsDrawerContext.Provider>
    );
};

export const useDetailsDrawer = (): DetailsDrawerContextType => {
    const context = useContext(DetailsDrawerContext);
    if (context === undefined) {
        throw new Error('useDetailsDrawer must be used within a DetailsDrawerProvider');
    }
    return context;
};