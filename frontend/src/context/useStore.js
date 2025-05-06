// filepath: d:\Development\wholesale-retail-app\frontend\src\context\useStore.js
import { useContext } from 'react';
import { StoreContext } from './StoreContext';

export const useStore = () => {
    const context = useContext(StoreContext);
    if (context === undefined || context === null) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};