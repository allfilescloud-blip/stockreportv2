import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../db/firebase';
import { useAuth } from './useAuth';

export const useSystemLog = () => {
    const { user } = useAuth();

    const logEvent = async (type: 'report' | 'settings' | 'auth' | 'location', action: string, details: string) => {
        if (!user) return;
        try {
            await addDoc(collection(db, 'system_logs'), {
                timestamp: serverTimestamp(),
                userId: user.uid,
                userEmail: user.email,
                userName: user.displayName || user.email?.split('@')[0] || 'Usuário',
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
