import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../db/firebase';
import { useAuth } from './useAuth';

export const useSystemLog = () => {
    const { user } = useAuth();

    const logEvent = async (type: 'report' | 'settings' | 'auth' | 'location' | 'user', action: string, details: string, overrideUser?: any) => {
        const currentUser = overrideUser || user;
        if (!currentUser) return;
        try {
            await addDoc(collection(db, 'system_logs'), {
                timestamp: serverTimestamp(),
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: currentUser.displayName || currentUser.email?.split('@')[0] || currentUser.email || 'Usuário',
                type,
                action,
                details
            });
        } catch (error) {
            console.error('Error logging system event:', error);
        }
    };

    return { logEvent };
};
