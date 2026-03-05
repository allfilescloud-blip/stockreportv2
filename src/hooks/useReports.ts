import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../db/firebase';

interface UseReportsResult<T> {
    reports: T[];
    loading: boolean;
}

export const useReports = <T extends { id: string; type: string; createdAt: any; locationId?: string; }>(
    type: string,
    filterDate: string,
    filterLocation?: string,
    queryLimit: number = 200
): UseReportsResult<T> => {
    const [reports, setReports] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Removemos o 'where' temporariamente para evitar o erro de índice composto
        // No futuro, após criar o índice, podemos voltar a filtrar no servidor por performance
        const q = query(
            collection(db, 'reports'),
            orderBy('createdAt', 'desc'),
            limit(queryLimit)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allReps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as unknown as T));

            // Filtramos no cliente por tipo e data (e location se existir)
            const filteredReports = allReps.filter(r => {
                if (r.type !== type) return false;

                if (filterDate) {
                    const reportDate = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-CA') : '';
                    if (reportDate !== filterDate) return false;
                }

                if (filterLocation && r.locationId !== filterLocation) {
                    return false;
                }

                return true;
            });

            setReports(filteredReports);
            setLoading(false);
        }, (error) => {
            console.error('Erro na query de reports:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [type, filterDate, filterLocation, queryLimit]);

    return { reports, loading };
};
