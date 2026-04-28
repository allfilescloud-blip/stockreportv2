import { useState, useEffect, useRef, useMemo } from 'react';
import {
    collection,
    addDoc,
    query,
    updateDoc,
    doc,
    arrayUnion,
    serverTimestamp,
    deleteDoc,
    onSnapshot,
    runTransaction,
    where,
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';
import { db } from '../db/firebase';
import { Plus, Trash2, MapPin, Calculator, ClipboardList, X, AlertTriangle, Share2, Printer, Layers, Edit2, Copy, Clock, CheckCheck, Loader2 } from 'lucide-react';
import { shareReport, printWebReport } from '../utils/reportUtils';
import { ProductPicker } from '../components/operational/ProductPicker';
import { useSystemLog } from '../hooks/useSystemLog';
import toast from 'react-hot-toast';
import { useReports } from '../hooks/useReports';
import { useAuth } from '../hooks/useAuth';
import { ReportSkeleton } from '../components/ReportSkeleton';

interface ReportItem {
    productId: string;
    sku: string;
    description: string;
    currentCount: number;
    previousCount: number;
}

interface Location {
    id: string;
    name: string;
}


interface Report {
    id: string;
    type: 'inventory' | 'tested' | 'delivery';
    createdAt: any;
    updatedAt: any;
    totalItems: number;
    items: ReportItem[];
    userName?: string;
    title?: string;
    locationId?: string;
    locationName?: string;
    sequentialId?: number;
    notes?: string;
    status?: 'in_progress' | 'completed';
}

const Inventario = () => {
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [reportItems, setReportItems] = useState<ReportItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState<number | string>('');
    const [title, setTitle] = useState('');
    const [currentReport, setCurrentReport] = useState<Report | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [missingSkus, setMissingSkus] = useState<ReportItem[]>([]);
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [duplicateItemIndex, setDuplicateItemIndex] = useState<number | null>(null);
    const [filterDate, setFilterDate] = useState('');
    const [filterLocation, setFilterLocation] = useState('');
    const [summingIndex, setSummingIndex] = useState<number | null>(null);
    const [sumValue, setSumValue] = useState<number | string>('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);
    const [showReportDeleteConfirm, setShowReportDeleteConfirm] = useState(false);
    const [reportIdToDelete, setReportIdToDelete] = useState<string | null>(null);
    const [minDivergence, setMinDivergence] = useState<number | null>(null);
    const [maxDivergence, setMaxDivergence] = useState<number | null>(null);
    const [lockLocation, setLockLocation] = useState(false);
    const [showDivergenceModal, setShowDivergenceModal] = useState(false);
    const [divergenceInfo, setDivergenceInfo] = useState<{ sku: string, diff: number, min?: number, max?: number, isUpdate: boolean } | null>(null);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [conflictReport, setConflictReport] = useState<Report | null>(null);
    const [pendingLocationId, setPendingLocationId] = useState('');

    const { reports, loading } = useReports<Report>('inventory', filterDate, filterLocation);
    const { isAdmin } = useAuth();
    const { logEvent } = useSystemLog();
    const [disableDecimals, setDisableDecimals] = useState(false);
    const [defaultUnifiedLocationId, setDefaultUnifiedLocationId] = useState('');
    const [isCloning, setIsCloning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isMerging, setIsMerging] = useState(false);
    const [isCloningAction, setIsCloningAction] = useState(false);
    const [isSumming, setIsSumming] = useState(false);
    
    const filteredAndSortedItems = useMemo(() => {
        if (!searchTerm) {
            return [...reportItems].sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }));
        }
        return reportItems
            .filter(item => 
                item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true }));
    }, [reportItems, searchTerm]);

    useEffect(() => {
        const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setDisableDecimals(data.disableDecimals || false);
                setLockLocation(data.lockLocation || false);
                setMinDivergence(data.minDivergence !== undefined && data.minDivergence !== '' ? Number(data.minDivergence) : null);
                setMaxDivergence(data.maxDivergence !== undefined && data.maxDivergence !== '' ? Number(data.maxDivergence) : null);
                setDefaultUnifiedLocationId(data.defaultUnifiedLocationId || '');
            }
        });

        return () => unsubscribeSettings();
    }, []);

    const skuInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const sumInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const qLocs = query(collection(db, 'locations'));
        const unsubscribeLocs = onSnapshot(qLocs, (snapshot: any) => {
            const locs = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Location[];
            locs.sort((a, b) => a.name.localeCompare(b.name));
            setLocations(locs);
        });

        return () => {
            unsubscribeLocs();
        };
    }, []);

    useEffect(() => {
        let unsubscribe = () => {};
        if (currentReport && !currentReport.id.startsWith('unified-')) {
            const reportRef = doc(db, 'reports', currentReport.id);
            unsubscribe = onSnapshot(reportRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setReportItems(data.items || []);
                }
            });
        }
        return () => unsubscribe();
    }, [currentReport?.id]);

    const addItemToReport = async (force: boolean = false) => {
        if (!selectedProduct) return;

        const existingIndex = reportItems.findIndex(i => i.productId === selectedProduct.id);
        if (existingIndex !== -1) {
            setDuplicateItemIndex(existingIndex);
            setShowConfirmModal(true);
            return;
        }

        if (!selectedLocationId) {
            toast.error('Por favor, selecione um Local de Estoque antes de adicionar itens.');
            return;
        }

        const previousReport = reports.find(r => 
            r.locationId === selectedLocationId &&
            r.id !== currentReport?.id &&
            r.status !== 'in_progress'
        );

        let previousCount = 0;
        if (previousReport) {
            const prevItem = previousReport.items.find((i: any) => i.productId === selectedProduct.id);
            previousCount = prevItem ? prevItem.currentCount : 0;
        }

        const currentCount = Number(quantity) || 0;
        const diff = currentCount - previousCount;

        if (!force) {
            const isMinDivergent = minDivergence !== null && minDivergence !== 0 && diff < minDivergence;
            const isMaxDivergent = maxDivergence !== null && maxDivergence !== 0 && diff > maxDivergence;

            if (isMinDivergent || isMaxDivergent) {
                setDivergenceInfo({
                    sku: selectedProduct.sku,
                    diff: diff,
                    min: minDivergence || undefined,
                    max: maxDivergence || undefined,
                    isUpdate: false
                });
                setShowDivergenceModal(true);
                return;
            }
        }

        const newItem: ReportItem = {
            productId: selectedProduct.id,
            sku: selectedProduct.sku,
            description: selectedProduct.description,
            currentCount: currentCount,
            previousCount: previousCount
        };

        if (currentReport && !currentReport.id.startsWith('unified-')) {
            const docRef = doc(db, 'reports', currentReport.id);
            try {
                await runTransaction(db, async (transaction) => {
                    const sfDoc = await transaction.get(docRef);
                    if (!sfDoc.exists()) return;
                    const latestItems = sfDoc.data().items || [];
                    const updatedItems = [...latestItems, newItem];
                    transaction.update(docRef, { 
                        items: updatedItems, 
                        totalItems: updatedItems.length, 
                        updatedAt: serverTimestamp() 
                    });
                });
            } catch (err) {
                toast.error("Erro ao salvar item no banco.");
            }
        } else if (!currentReport) {
            const nextSequentialId = reports.length > 0
                ? Math.max(...reports.map(r => r.sequentialId || 0)) + 1
                : 1;
            const locationObj = locations.find(l => l.id === selectedLocationId);
            
            try {
                const tempItems = [newItem];
                const newDoc = await addDoc(collection(db, 'reports'), {
                    type: 'inventory',
                    title: title.trim(),
                    items: tempItems,
                    totalItems: 1,
                    locationId: selectedLocationId,
                    locationName: locationObj?.name || '',
                    sequentialId: nextSequentialId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    status: 'in_progress'
                });
                await logEvent('report', 'Início de Inventário', `Novo inventário iniciado no local: ${locationObj?.name || 'Não definido'}`);
                
                setCurrentReport({
                    id: newDoc.id,
                    type: 'inventory',
                    title: title.trim(),
                    items: tempItems,
                    totalItems: 1,
                    locationId: selectedLocationId,
                    locationName: locationObj?.name || '',
                    sequentialId: nextSequentialId,
                    status: 'in_progress'
                } as Report);
                setReportItems(tempItems);
            } catch (err) {
                toast.error("Erro ao iniciar inventário no banco.");
            }
        } else {
            setReportItems([...reportItems, newItem]);
        }

        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity('');
        skuInputRef.current?.focus();
    };

    const refreshPreviousCounts = async (locationId: string, items: ReportItem[]) => {
        if (!locationId || items.length === 0) return items;

        // 1. Tentar encontrar localmente primeiro (mais rápido)
        let previousReport = reports.find(r => 
            r.locationId === locationId && 
            r.status === 'completed' &&
            r.id !== currentReport?.id
        );

        // 2. Se não encontrar (pode estar filtrado), buscar no Firestore
        if (!previousReport) {
            const q = query(
                collection(db, 'reports'),
                where('type', '==', 'inventory'),
                where('locationId', '==', locationId),
                where('status', '==', 'completed'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            try {
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    previousReport = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as any;
                }
            } catch (err) {
                console.error("Erro ao buscar relatório anterior:", err);
            }
        }

        if (previousReport) {
            return items.map(item => {
                const prevItem = previousReport!.items.find((i: any) => i.productId === item.productId || i.sku === item.sku);
                return { ...item, previousCount: prevItem ? prevItem.currentCount : 0 };
            });
        }

        return items.map(item => ({ ...item, previousCount: 0 }));
    };

    const handleSum = async () => {
        if (summingIndex !== null && sumValue !== '') {
            setIsSumming(true);
            try {
                const item = reportItems[summingIndex];
                const amountToAdd = Number(sumValue);
                
                if (currentReport && !currentReport.id.startsWith('unified-')) {
                    const docRef = doc(db, 'reports', currentReport.id);
                    await runTransaction(db, async (transaction) => {
                        const sfDoc = await transaction.get(docRef);
                        if (!sfDoc.exists()) throw new Error("Documento não encontrado");
                        const latestItems = sfDoc.data().items || [];
                        const itemToUpdateIndex = latestItems.findIndex((i: any) => i.productId === item.productId);
                        if (itemToUpdateIndex !== -1) {
                             latestItems[itemToUpdateIndex].currentCount += amountToAdd;
                             transaction.update(docRef, { 
                                 items: latestItems, 
                                 updatedAt: serverTimestamp() 
                             });
                        }
                    });
                } else {
                    const updatedItems = [...reportItems];
                    updatedItems[summingIndex].currentCount += amountToAdd;
                    setReportItems(updatedItems);
                }
                
                setSummingIndex(null);
                setSumValue('');
                skuInputRef.current?.focus();
            } catch (error) {
                toast.error("Erro ao somar no banco!");
            } finally {
                setIsSumming(false);
            }
        }
    };

    const confirmUpdate = async (force: boolean = false) => {
        if (duplicateItemIndex !== null) {
            const item = reportItems[duplicateItemIndex];
            const currentCount = Number(quantity) || 0;
            const diff = currentCount - item.previousCount;

            if (!force) {
                const isMinDivergent = minDivergence !== null && minDivergence !== 0 && diff < minDivergence;
                const isMaxDivergent = maxDivergence !== null && maxDivergence !== 0 && diff > maxDivergence;

                if (isMinDivergent || isMaxDivergent) {
                    setDivergenceInfo({
                        sku: item.sku,
                        diff: diff,
                        min: minDivergence || undefined,
                        max: maxDivergence || undefined,
                        isUpdate: true
                    });
                    setShowDivergenceModal(true);
                    return;
                }
            }

            if (currentReport && !currentReport.id.startsWith('unified-')) {
                const docRef = doc(db, 'reports', currentReport.id);
                try {
                    await runTransaction(db, async (transaction) => {
                        const sfDoc = await transaction.get(docRef);
                        if (!sfDoc.exists()) throw new Error("Documento não encontrado");
                        const latestItems = sfDoc.data().items || [];
                        const itemToUpdateIndex = latestItems.findIndex((i: any) => i.productId === item.productId);
                        if (itemToUpdateIndex !== -1) {
                             latestItems[itemToUpdateIndex].currentCount = currentCount;
                             transaction.update(docRef, { 
                                 items: latestItems, 
                                 updatedAt: serverTimestamp() 
                             });
                        }
                    });
                } catch (error) { toast.error("Erro ao atualizar!"); return; }
            } else {
                const updatedItems = [...reportItems];
                updatedItems[duplicateItemIndex].currentCount = currentCount;
                setReportItems(updatedItems);
            }

            setSelectedProduct(null);
            setSearchTerm('');
            setQuantity('');
            setShowConfirmModal(false);
            setDuplicateItemIndex(null);
            skuInputRef.current?.focus();
        }
    };

    const handleDeleteItem = async () => {
        if (itemIndexToDelete !== null) {
            const index = itemIndexToDelete;
            const item = reportItems[index];

            if (currentReport && !currentReport.id.startsWith('unified-')) {
                const docRef = doc(db, 'reports', currentReport.id);
                try {
                    await runTransaction(db, async (transaction) => {
                        const sfDoc = await transaction.get(docRef);
                        if (!sfDoc.exists()) return;
                        const latestItems = sfDoc.data().items || [];
                        const filteredItems = latestItems.filter((i: any) => i.productId !== item.productId);
                        transaction.update(docRef, { 
                            items: filteredItems,
                            totalItems: filteredItems.length,
                            updatedAt: serverTimestamp() 
                        });
                    });
                    const reportId = reports.findIndex(r => r.id === currentReport.id);
                    const displayId = currentReport.sequentialId || (reports.length - reportId);
                    await logEvent('report', 'Remoção de Item', `Item ${item.sku} removido do Inventário #${displayId}`);
                } catch (error) { toast.error("Erro ao excluir item do banco!"); return; }
            } else {
                setReportItems(reportItems.filter((_, i) => i !== index));
            }
            setShowDeleteConfirm(false);
            setItemIndexToDelete(null);
        }
    };

    const checkMissingItems = async () => {
        if (currentReport?.id.startsWith('unified-')) {
            await executeFinalSave(reportItems);
            return;
        }

        const previousReport = reports.find(r => r.locationId === selectedLocationId && r.id !== currentReport?.id);

        if (!previousReport) {
            await executeFinalSave(reportItems);
            return;
        }

        const currentSkus = new Set(reportItems.map(i => i.sku));
        const missing = previousReport.items.filter(item =>
            item.currentCount > 0 && !currentSkus.has(item.sku)
        );

        if (missing.length > 0) {
            setMissingSkus(missing);
            setShowMissingModal(true);
        } else {
            await executeFinalSave(reportItems);
        }
    };

    const handleSaveWithMissing = async (addMissing: boolean) => {
        let itemsToSave = [...reportItems];
        if (addMissing) {
            const itemsWithZero = missingSkus.map(m => ({
                ...m,
                previousCount: m.currentCount,
                currentCount: 0
            }));
            itemsToSave = [...itemsToSave, ...itemsWithZero];
        }
        setShowMissingModal(false);
        await executeFinalSave(itemsToSave);
    };

    const executeFinalSave = async (itemsToSave: ReportItem[]) => {
        if (itemsToSave.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            if (currentReport?.id.startsWith('unified-') && !selectedLocationId) {
                toast.error("A seleção de um local é obrigatória para salvar relatórios unificados.");
                return;
            }

            let reportRef;
            const locationObj = locations.find(l => l.id === selectedLocationId);

            let finalLocationName = locationObj?.name || '';
            if (currentReport?.id.startsWith('unified-') && currentReport.locationName) {
                finalLocationName = finalLocationName ? `${finalLocationName} (${currentReport.locationName})` : currentReport.locationName;
            }

            if (currentReport && !currentReport.id.startsWith('unified-')) {
                reportRef = doc(db, 'reports', currentReport.id);
                await updateDoc(reportRef, {
                    title: title.trim(),
                    items: itemsToSave,
                    totalItems: itemsToSave.length,
                    locationId: selectedLocationId,
                    locationName: finalLocationName,
                    status: 'completed',
                    updatedAt: serverTimestamp()
                });
                await logEvent('report', 'Finalização de Inventário', `Inventário #${reports.length - reports.findIndex(r => r.id === currentReport.id)} finalizado com ${itemsToSave.length} itens.`);
            } else {
                const nextSequentialId = reports.length > 0
                    ? Math.max(...reports.map(r => r.sequentialId || 0)) + 1
                    : 1;

                const newDoc = await addDoc(collection(db, 'reports'), {
                    type: 'inventory',
                    title: title.trim(),
                    items: itemsToSave,
                    totalItems: itemsToSave.length,
                    locationId: selectedLocationId,
                    locationName: finalLocationName,
                    sequentialId: nextSequentialId,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    status: 'completed'
                });
                reportRef = newDoc;
                await logEvent('report', 'Criação de Inventário', `Novo inventário criado diretamente com ${itemsToSave.length} itens.`);
            }

            for (const item of itemsToSave) {
                const historyEntry = {
                    action: 'Inventário',
                    date: new Date().toISOString(),
                    details: `Contagem realizada: ${item.currentCount} (Anterior: ${item.previousCount})`,
                    reportId: currentReport ? currentReport.id : reportRef.id
                };

                await updateDoc(doc(db, 'products', item.productId), {
                    history: arrayUnion(historyEntry),
                    updatedAt: serverTimestamp()
                });
            }

            setIsModalOpen(false);
            setReportItems([]);
            setTitle('');
            setSelectedLocationId('');
            setCurrentReport(null);
            setIsCloning(false);
            toast.success("Inventário salvo com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar relatório:", error);
            toast.error("Erro ao salvar o relatório.");
        } finally {
            setIsSaving(false);
        }
    };

    const saveReport = async () => {
        await checkMissingItems();
    };

    const deleteReport = async (id: string) => {
        setReportIdToDelete(id);
        setShowReportDeleteConfirm(true);
    };

    const confirmDeleteReport = async () => {
        if (!reportIdToDelete) return;
        const reportToDelete = reports.find(r => r.id === reportIdToDelete);
        const index = reports.findIndex(r => r.id === reportIdToDelete);
        const displayId = reportToDelete?.sequentialId || (reports.length - index);

        try {
            await deleteDoc(doc(db, 'reports', reportIdToDelete));
            await logEvent('report', 'Exclusão de Inventário', `Inventário #${displayId} excluído.`);
            setShowReportDeleteConfirm(false);
            setReportIdToDelete(null);
            toast.success("Inventário excluído!");
        } catch (error) {
            toast.error('Erro ao excluir');
            console.error('Erro ao excluir:', error);
        }
    };

    const handleToggleSelectReport = (reportId: string) => {
        setSelectedReports(prev => {
            if (prev.includes(reportId)) return prev.filter(id => id !== reportId);
            if (prev.length >= 5) {
                toast.error('Você pode selecionar no máximo 5 relatórios para unificar.');
                return prev;
            }
            return [...prev, reportId];
        });
    };

    const handleMergeReports = async () => {
        if (selectedReports.length < 2) return;
        setIsMerging(true);

        try {
            const reportsToMerge = reports.filter(r => selectedReports.includes(r.id));
        const mergedItemsMap = new Map<string, ReportItem>();

        reportsToMerge.forEach(report => {
            report.items.forEach(item => {
                const existing = mergedItemsMap.get(item.sku);
                if (existing) {
                    existing.currentCount += item.currentCount;
                } else {
                    mergedItemsMap.set(item.sku, { ...item, previousCount: 0 });
                }
            });
        });

        let mergedItems = Array.from(mergedItemsMap.values());
        const uniqueLocations = Array.from(new Set(reportsToMerge.map(r => r.locationName).filter(Boolean)));

        const targetLocationId = defaultUnifiedLocationId || '';
        const targetLocation = locations.find(l => l.id === targetLocationId);
        
        // Buscar contagem anterior para o local padrão
        if (targetLocationId) {
            mergedItems = await refreshPreviousCounts(targetLocationId, mergedItems);
        }

        setReportItems(mergedItems);
        setTitle(`Inventários Unificados (${selectedReports.length})`);
        setSelectedLocationId(targetLocationId);

        const unifiedNames = reportsToMerge.map(r => {
            const index = reports.findIndex(orig => orig.id === r.id);
            const displayId = r.sequentialId || (reports.length - index);
            return r.title || `Inventário #${displayId}`;
        });

        setCurrentReport({
            id: 'unified-' + Date.now().toString(),
            type: 'inventory',
            title: `Inventários Unificados (${selectedReports.length})`,
            totalItems: mergedItems.length,
            items: mergedItems,
            createdAt: null as any,
            updatedAt: null as any,
            locationId: targetLocationId,
            locationName: targetLocation ? targetLocation.name : uniqueLocations.join(', '),
            notes: `Relatório de inventários unificados. Origens consolidadas: ${unifiedNames.join(' | ')}`
        });

        setIsModalOpen(true);
        setSelectedReports([]);
        await logEvent('report', 'Unificação de Inventários', `Unificados ${selectedReports.length} inventários.`);
        } catch (err) {
            console.error("Erro ao unificar:", err);
            toast.error("Erro ao unificar relatórios.");
        } finally {
            setIsMerging(false);
        }
    };

    const handleCloneReport = async () => {
        if (!isAdmin || selectedReports.length !== 1) return;
        setIsCloningAction(true);
        try {
            const reportId = selectedReports[0];
            const sourceReport = reports.find(r => r.id === reportId);
        if (!sourceReport) return;

        // Clonagem profunda dos itens para evitar referências compartilhadas
        const clonedItems = sourceReport.items.map(item => ({
            ...item
        }));

        // Calcular o próximo ID sequencial
        const nextSequentialId = reports.length > 0
            ? Math.max(...reports.map(r => r.sequentialId || 0)) + 1
            : 1;

        // Determinar o ID de exibição do relatório original para o título
        const index = reports.findIndex(r => r.id === sourceReport.id);
        const displayId = sourceReport.sequentialId || (reports.length - index);
        const newTitle = '';

        const newDoc = await addDoc(collection(db, 'reports'), {
                type: 'inventory',
                title: newTitle,
                items: clonedItems,
                totalItems: clonedItems.length,
                locationId: '',
                locationName: '',
                sequentialId: nextSequentialId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                status: 'in_progress'
            });

            const newReport = {
                id: newDoc.id,
                type: 'inventory',
                title: newTitle,
                items: clonedItems,
                totalItems: clonedItems.length,
                locationId: '',
                locationName: '',
                sequentialId: nextSequentialId,
                status: 'in_progress'
            } as Report;

            setReportItems(clonedItems);
            setTitle(newTitle);
            setSelectedLocationId('');
            setCurrentReport(newReport);
            setIsCloning(true);
            
            setSelectedReports([]);
            setIsModalOpen(true);
            await logEvent('report', 'Clonagem de Inventário', `Inventário #${displayId} clonado para um novo relatório.`);
            toast.success('Inventário clonado e iniciado!');
        } catch (err) {
            console.error("Erro ao clonar:", err);
            toast.error("Erro ao clonar inventário no banco.");
        } finally {
            setIsCloningAction(false);
        }
    };

    const handleShare = async (report: Report, printId: number) => {
        await shareReport(report, printId, false, false);
    };

    const handlePrintReport = (report: Report, printId: number) => {
        printWebReport(report, printId);
    };

    const handleCloseInventory = async () => {
        if (reportItems.length === 0 && currentReport && !currentReport.id.startsWith('unified-')) {
            try {
                await deleteDoc(doc(db, 'reports', currentReport.id));
                toast.error("Inventário vazio removido.");
            } catch (err) {
                console.error("Erro ao limpar inventário vazio:", err);
            }
        }
        setIsModalOpen(false);
        setReportItems([]);
        setTitle('');
        setSelectedLocationId('');
        setCurrentReport(null);
        setIsCloning(false);
    };

    const handleLocationChange = async (newLocationId: string) => {
        if (!newLocationId) {
            setSelectedLocationId('');
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingReportToday = reports.find(r => {
            if (r.locationId !== newLocationId || r.id === currentReport?.id) return false;
            const reportDate = r.createdAt?.toDate ? r.createdAt.toDate() : new Date();
            reportDate.setHours(0, 0, 0, 0);
            return reportDate.getTime() === today.getTime();
        });

        if (existingReportToday && !currentReport) {
            setConflictReport(existingReportToday);
            setPendingLocationId(newLocationId);
            setShowConflictModal(true);
            return;
        }

        setSelectedLocationId(newLocationId);

        if (!currentReport) {
            const inProgressReport = reports.find(r => r.locationId === newLocationId && r.status === 'in_progress');
            if (inProgressReport) {
                toast.success('Retomando inventário em andamento neste local...', { duration: 4000 });
                setCurrentReport(inProgressReport);
                setTitle(inProgressReport.title || '');
                return;
            }
        }

        if (reportItems.length > 0) {
            const updatedItems = await refreshPreviousCounts(newLocationId, reportItems);
            setReportItems(updatedItems);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventário</h1>
                    <p className="text-slate-500 dark:text-slate-400">Relatórios de contagem e comparação</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-6 shadow-lg">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Filtrar por Dia</label>
                    <input
                        type="date"
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Filtrar por Local</label>
                    <select
                        value={filterLocation}
                        onChange={(e) => setFilterLocation(e.target.value)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    >
                        <option value="">Todos os Locais</option>
                        {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                                {loc.name}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={() => { setFilterDate(''); setFilterLocation(''); }}
                    className="px-6 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors text-sm font-medium h-[42px]"
                >
                    Limpar
                </button>
                <div className="hidden md:block h-10 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                {isAdmin && selectedReports.length === 1 && (
                    <button
                        onClick={handleCloneReport}
                        disabled={isCloningAction}
                        className="w-full md:w-auto flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 font-bold disabled:opacity-50"
                    >
                        {isCloningAction ? <Loader2 size={20} className="animate-spin" /> : <Copy size={20} />}
                        <span>{isCloningAction ? 'Clonando...' : 'Clonar'}</span>
                    </button>
                )}
                {selectedReports.length > 1 && (
                    <button
                        onClick={handleMergeReports}
                        disabled={isMerging}
                        className="w-full md:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 font-bold disabled:opacity-50"
                    >
                        {isMerging ? <Loader2 size={20} className="animate-spin" /> : <Layers size={20} />}
                        <span>{isMerging ? 'Unificando...' : `Unificar (${selectedReports.length})`}</span>
                    </button>
                )}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/20 font-bold"
                >
                    <Plus size={20} />
                    <span>Novo Relatório</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-4 md:p-6">
                        <ReportSkeleton />
                    </div>
                ) : (
                    <>
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm">
                                        <th className="px-6 py-3 font-semibold w-12 text-center text-[10px] tracking-wider uppercase">
                                            <div className="w-4 h-4 mx-auto" />
                                        </th>
                                        <th className="px-6 py-4 font-semibold">ID</th>
                                        <th className="px-6 py-4 font-semibold">Título</th>
                                        <th className="px-6 py-4 font-semibold">Criação</th>
                                        <th className="px-6 py-4 font-semibold text-center">Itens</th>
                                        <th className="px-6 py-4 font-semibold text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {reports.map((report, index) => {
                                        const displayId = report.sequentialId || (reports.length - index);
                                        const isSelected = selectedReports.includes(report.id);
                                        const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Processando...';
                                        
                                        return (
                                            <tr key={report.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-100/30 dark:bg-slate-800/30'}`}>
                                                <td className="px-6 py-4 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectReport(report.id)}
                                                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 dark:bg-slate-800 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 font-mono text-emerald-400">#{displayId}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {report.title || <span className="text-slate-400 font-normal">Inventário #{displayId}</span>}
                                                        </div>
                                                        {report.status === 'in_progress' ? (
                                                            <span className="flex items-center gap-1 bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-500/20 whitespace-normal">
                                                                <Clock size={10} />
                                                                Rascunho
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-500/20 whitespace-normal">
                                                                <CheckCheck size={10} />
                                                                Finalizado
                                                            </span>
                                                        )}
                                                    </div>
                                                    {report.locationName && (
                                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                                            <MapPin size={12} className="text-emerald-500" />
                                                            {report.locationName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 dark:text-slate-300 text-sm">
                                                    {dateText}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold">
                                                        {report.totalItems}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 text-nowrap">
                                                        <button
                                                            onClick={() => {
                                                                setCurrentReport(report);
                                                                setReportItems(report.items);
                                                                setTitle(report.title || '');
                                                                setSelectedLocationId(report.locationId || '');
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handlePrintReport(report, displayId)}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all"
                                                            title="Imprimir"
                                                        >
                                                            <Printer size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => deleteReport(report.id)}
                                                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile View (Cards) */}
                        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                            {reports.map((report, index) => {
                                const displayId = report.sequentialId || (reports.length - index);
                                const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Processando...';
                                const isSelected = selectedReports.includes(report.id);
                                return (
                                    <div key={report.id} className={`p-4 space-y-4 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-100/20 dark:bg-slate-800/20'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelectReport(report.id)}
                                                    className="w-5 h-5 text-emerald-600 rounded border-slate-300 dark:border-slate-700 focus:ring-emerald-500 dark:bg-slate-800 cursor-pointer"
                                                />
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[250px]">
                                                        <p className="font-mono text-emerald-400 font-bold shrink-0">#{displayId}</p>
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <span className="text-slate-900 dark:text-white font-semibold text-sm truncate">
                                                                {report.title || `Inventário #${displayId}`}
                                                            </span>
                                                            {report.status === 'in_progress' ? (
                                                                <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border border-amber-500/20 shrink-0">
                                                                    Rascunho
                                                                </span>
                                                            ) : (
                                                                <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase border border-emerald-500/20 shrink-0">
                                                                    Finalizado
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-slate-500 text-[10px]">{dateText}</p>
                                                        {report.locationName && (
                                                            <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                                                                {report.locationName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-full text-[10px] font-bold">
                                                {report.totalItems}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setCurrentReport(report);
                                                        setReportItems(report.items);
                                                        setTitle(report.title || '');
                                                        setSelectedLocationId(report.locationId || '');
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700"
                                                >
                                                    <Edit2 size={14} />
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handlePrintReport(report, displayId)}
                                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-300 dark:border-slate-700"
                                                >
                                                    <Printer size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteReport(report.id)}
                                                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-red-400 rounded-lg border border-slate-300 dark:border-slate-700"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleShare(report, displayId)}
                                                className="p-2.5 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-500/20"
                                            >
                                                <Share2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between md:items-center bg-white/50 dark:bg-slate-900/50 gap-4">
                            <div className="flex-1 flex flex-col md:flex-row gap-4 items-center">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder={currentReport ? `Inventário #${reports.length - reports.findIndex(r => r.id === currentReport.id)}` : `Inventário #${reports.length + 1}`}
                                    className="w-full md:w-auto flex-1 text-xl md:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 px-2 placeholder-slate-400 dark:placeholder-slate-600 truncate"
                                />
                                <select
                                    value={selectedLocationId}
                                    onChange={(e) => handleLocationChange(e.target.value)}
                                    disabled={lockLocation && (currentReport !== null || reportItems.length > 0) && !currentReport?.id?.startsWith('unified-') && !isCloning}
                                    className={`w-full md:w-auto bg-slate-100 dark:bg-slate-800 border border-emerald-500/30 rounded-lg px-4 py-2 text-slate-700 dark:text-slate-300 font-bold focus:ring-2 focus:ring-emerald-500 outline-none ${lockLocation && (currentReport !== null || reportItems.length > 0) && !currentReport?.id?.startsWith('unified-') && !isCloning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="" disabled>Selecione um Local</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={handleCloseInventory} className="absolute md:static top-4 right-4 md:top-auto md:right-auto text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white shrink-0">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="md:col-span-2 relative">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Produto (SKU ou Descrição)</label>
                                    <ProductPicker
                                        selectedProduct={selectedProduct}
                                        onSelectProduct={(p) => {
                                            setSelectedProduct(p);
                                            if (p) {
                                                setTimeout(() => quantityInputRef.current?.focus(), 10);
                                            } else {
                                                setQuantity('');
                                            }
                                        }}
                                        searchTerm={searchTerm}
                                        onSearchChange={setSearchTerm}
                                        themeColor="emerald"
                                        inputRef={skuInputRef}
                                    />
                                </div>

                                <div className="md:w-32">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Qtd Atual</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            ref={quantityInputRef}
                                            placeholder="0"
                                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none no-spinner"
                                            value={quantity}
                                            onKeyDown={(e) => {
                                                if (disableDecimals && (e.key === '.' || e.key === ',')) {
                                                    e.preventDefault();
                                                }
                                                if (e.key === 'Enter' && selectedProduct && quantity !== '') {
                                                    addItemToReport();
                                                }
                                            }}
                                            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                        />
                                        <button
                                            onClick={() => addItemToReport()}
                                            disabled={!selectedProduct || quantity === ''}
                                            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-all"
                                        >
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                                    <ClipboardList size={16} />
                                    Itens no Relatório ({reportItems.length})
                                </h3>
                                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white dark:bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Produto</th>
                                                <th className="px-6 py-3 text-center">Anterior</th>
                                                <th className="px-6 py-3 text-center">Atual</th>
                                                <th className="px-6 py-3 text-center">Diferença</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/30 dark:bg-slate-900/30">
                                            {filteredAndSortedItems.map((item) => {
                                                const diff = item.currentCount - item.previousCount;
                                                const originalIdx = reportItems.findIndex(ri => ri.sku === item.sku);
                                                return (
                                                    <tr key={item.sku}>
                                                        <td className="px-6 py-4">
                                                            <p className="font-mono text-emerald-400">{item.sku}</p>
                                                            <p className="text-slate-500 text-xs truncate max-w-[200px]">{item.description}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center font-medium text-slate-500 dark:text-slate-400">{item.previousCount}</td>
                                                        <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{item.currentCount}</td>
                                                        <td className={`px-6 py-4 text-center font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                            {diff > 0 ? `+${diff}` : diff}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        setSummingIndex(originalIdx);
                                                                        setSumValue('');
                                                                    }}
                                                                    className="text-emerald-500 hover:text-emerald-400 p-1"
                                                                    title="Somar Quantidade"
                                                                >
                                                                    <Calculator size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setItemIndexToDelete(originalIdx);
                                                                        setShowDeleteConfirm(true);
                                                                    }}
                                                                    className="text-slate-600 hover:text-red-400 p-1"
                                                                    title="Excluir"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredAndSortedItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-600 italic">
                                                        Nenhum item adicionado ainda.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="md:hidden space-y-3">
                                    {filteredAndSortedItems.map((item) => {
                                        const diff = item.currentCount - item.previousCount;
                                        const originalIdx = reportItems.findIndex(ri => ri.sku === item.sku);
                                        return (
                                            <div key={item.sku} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm">
                                                <div className="flex-1 min-w-0 pr-4">
                                                    <p className="font-mono text-emerald-400 font-bold text-sm truncate">{item.sku}</p>
                                                    <p className="text-slate-500 text-[10px] truncate">{item.description}</p>
                                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                        <div className="text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-lg text-center">
                                                            <span className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Anterior</span>
                                                            <span className="font-bold">{item.previousCount}</span>
                                                        </div>
                                                        <div className="text-slate-900 dark:text-white bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-lg text-center">
                                                            <span className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Atual</span>
                                                            <span className="font-bold">{item.currentCount}</span>
                                                        </div>
                                                    </div>
                                                    <div className={`mt-2 text-center p-1 rounded-lg text-[10px] font-bold ${diff > 0 ? 'bg-emerald-500/10 text-emerald-400' : diff < 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                                                        Diferença: {diff > 0 ? `+${diff}` : diff}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSummingIndex(originalIdx);
                                                            setSumValue('');
                                                        }}
                                                        className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg active:scale-95 transition-all"
                                                    >
                                                        <Calculator size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setItemIndexToDelete(originalIdx);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        className="p-3 bg-red-400/10 text-red-500 rounded-lg active:scale-95 transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-end gap-3 md:gap-4">
                            <button
                                onClick={handleCloseInventory}
                                className="order-2 md:order-1 px-6 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveReport}
                                disabled={reportItems.length === 0 || isSaving}
                                className="order-1 md:order-2 px-8 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <CheckCheck size={20} />}
                                {isSaving ? 'Salvando...' : 'Finalizar Relatório'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Duplicidade */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Item Já Adicionado</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Este SKU já está na lista. Deseja atualizar a quantidade para o novo valor informado?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        setDuplicateItemIndex(null);
                                    }}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => confirmUpdate()}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Alterar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Alerta de Divergência */}
            {showDivergenceModal && divergenceInfo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 border-2 border-amber-500/50 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 text-center">
                            <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <AlertTriangle size={40} />
                            </div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">Divergência Detectada!</h2>
                            <div className="space-y-4 mb-8">
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                    O SKU <span className="font-mono font-bold text-amber-500">{divergenceInfo.sku}</span> apresenta uma diferença de <span className="font-bold text-slate-900 dark:text-white">{divergenceInfo.diff > 0 ? `+${divergenceInfo.diff}` : divergenceInfo.diff}</span> unidades.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => {
                                        setShowDivergenceModal(false);
                                        setDivergenceInfo(null);
                                    }}
                                    className="py-3.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95"
                                >
                                    Revisar
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDivergenceModal(false);
                                        if (divergenceInfo.isUpdate) {
                                            confirmUpdate(true);
                                        } else {
                                            addItemToReport(true);
                                        }
                                        setDivergenceInfo(null);
                                    }}
                                    className="py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-2xl transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Itens Ausentes */}
            {showMissingModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Itens Ausentes</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                Estes itens tinham estoque no inventário anterior mas não estão neste. Deseja zerá-los?
                            </p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {missingSkus.map(item => (
                                <div key={item.sku} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex justify-between items-center text-sm">
                                    <div>
                                        <p className="font-mono text-emerald-400 font-bold">{item.sku}</p>
                                        <p className="text-slate-500 text-xs truncate max-w-[200px]">{item.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 text-[10px]">Anterior</p>
                                        <p className="font-bold">{item.currentCount}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
                            <button
                                onClick={() => handleSaveWithMissing(true)}
                                disabled={isSaving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : null}
                                Sim, zerar itens e finalizar
                            </button>
                            <button
                                onClick={() => handleSaveWithMissing(false)}
                                disabled={isSaving}
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : null}
                                Não, apenas finalizar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Soma */}
            {summingIndex !== null && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calculator size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Somar Quantidade</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Informe o valor para somar ao item <strong>{reportItems[summingIndex].sku}</strong>.
                            </p>
                            <input
                                type="number"
                                ref={sumInputRef}
                                autoFocus
                                placeholder="Valor a somar"
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white mb-6 focus:ring-2 focus:ring-emerald-500 outline-none"
                                value={sumValue}
                                onKeyDown={(e) => e.key === 'Enter' && handleSum()}
                                onChange={(e) => setSumValue(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setSummingIndex(null); setSumValue(''); }}
                                    className="flex-1 py-3 text-slate-500 font-semibold disabled:opacity-50"
                                    disabled={isSumming}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSum}
                                    disabled={sumValue === '' || isSumming}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    {isSumming ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />}
                                    {isSumming ? 'Somando...' : 'Somar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão de Item */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Remover Item?</h2>
                            <p className="text-slate-500 mb-6 text-sm">Deseja remover este item do relatório?</p>
                            <div className="flex gap-3">
                                <button onClick={() => { setShowDeleteConfirm(false); setItemIndexToDelete(null); }} className="flex-1 py-3 text-slate-500">Cancelar</button>
                                <button onClick={handleDeleteItem} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl">Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão de Relatório */}
            {showReportDeleteConfirm && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                        <div className="p-6 text-center">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Relatório?</h2>
                            <p className="text-slate-500 mb-6 text-sm">Esta ação é permanente.</p>
                            <div className="flex gap-3">
                                <button onClick={() => { setShowReportDeleteConfirm(false); setReportIdToDelete(null); }} className="flex-1 py-3 text-slate-500">Cancelar</button>
                                <button onClick={confirmDeleteReport} className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl">Excluir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Conflito de Inventário Hoje */}
            {showConflictModal && conflictReport && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8">
                            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-3xl flex items-center justify-center mb-6">
                                <AlertTriangle size={40} />
                            </div>
                            
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Inventário já Existente hoje</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6">
                                Já existe um inventário para o local <span className="font-bold text-slate-900 dark:text-white">"{conflictReport.locationName}"</span> realizado hoje.
                                <br/><br/>
                                <span className="text-sm">
                                    Título: <span className="text-slate-700 dark:text-slate-300 font-semibold">{conflictReport.title || `Inventário #${conflictReport.sequentialId || '?'}`}</span><br/>
                                    Iniciado em: <span className="text-slate-700 dark:text-slate-300 font-semibold">{conflictReport.createdAt?.toDate ? conflictReport.createdAt.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                                </span>
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        setSelectedLocationId(pendingLocationId);
                                        setCurrentReport(conflictReport);
                                        setReportItems(conflictReport.items);
                                        setTitle(conflictReport.title || '');
                                        setShowConflictModal(false);
                                        setIsModalOpen(true);
                                        toast.success('Retomando o inventário existente...');
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <Edit2 size={20} />
                                    Retomar / Editar Existente
                                </button>
                                
                                <button
                                    onClick={() => {
                                        setSelectedLocationId(pendingLocationId);
                                        setCurrentReport(null);
                                        setReportItems([]);
                                        setTitle('');
                                        setShowConflictModal(false);
                                        setIsModalOpen(true);
                                        toast.success('Iniciando novo inventário independente.');
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold py-4 rounded-2xl transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    Criar Novo (Ignorar Aviso)
                                </button>

                                <button
                                    onClick={() => {
                                        setSelectedLocationId('');
                                        setShowConflictModal(false);
                                    }}
                                    className="w-full bg-transparent text-slate-500 font-semibold py-2 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventario;
