import { createContext, useContext, useEffect, useState, type ReactNode, type FC } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../db/firebase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isApproved: boolean;
    allowRegistration: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    isApproved: false,
    allowRegistration: true
});

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isApproved, setIsApproved] = useState(false);
    const [allowRegistration, setAllowRegistration] = useState(true);

    useEffect(() => {
        // Listener real-time para configuração global de registro
        const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'auth'), (snapshot) => {
            if (snapshot.exists()) {
                setAllowRegistration(snapshot.data().allowRegistration !== false);
            }
        }, (error) => {
            console.error('Erro ao ouvir configurações:', error);
        });

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setIsAdmin(data.role === 'admin');
                    setIsApproved(data.approved === true || data.role === 'admin');
                } else {
                    setIsAdmin(false);
                    setIsApproved(false);
                }
            } else {
                setIsAdmin(false);
                setIsApproved(false);
            }
            setLoading(false);
        });

        return () => {
            unsubscribeSettings();
            unsubscribeAuth();
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, isApproved, allowRegistration }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
