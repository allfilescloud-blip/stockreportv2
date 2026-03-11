import { useState, useRef, useEffect } from 'react';
import {
    collection,
    addDoc,
    updateDoc,
    doc,
    arrayUnion,
    arrayRemove,
    serverTimestamp,
    deleteDoc,
    getDoc,
} from 'firebase/firestore';
import { db, storage } from '../db/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { Search, Plus, Printer, Trash2, Edit2, X, AlertTriangle, Share2, ClipboardList, Eye, Calculator, Layers, ScanBarcode, StopCircle, Image as ImageIcon, ChevronLeft, ChevronRight, Upload } from 'lucide-react';
import { shareReport, printWebReport } from '../utils/reportUtils';
import { ScannerModal } from '../components/ScannerModal';
import { useProducts } from '../contexts/ProductsContext';
import { useReports } from '../hooks/useReports';
import { useAuth } from '../hooks/useAuth';
import { ReportSkeleton } from '../components/ReportSkeleton';

interface ReportItem {
    productId: string;
    sku: string;
    description: string;
    currentCount: number;
}

interface Report {
    id: string;
    type: 'delivery';
    createdAt: any;
    updatedAt: any;
    totalItems: number;
    items: ReportItem[];
    userName?: string;
    notes?: string;
    title?: string;
    sequentialId?: number;
    imageUrls?: string[];
}

const Entregas = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { products: allProducts } = useProducts();
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [reportItems, setReportItems] = useState<ReportItem[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quantity, setQuantity] = useState<number | string>('');
    const [currentReport, setCurrentReport] = useState<Report | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [duplicateItemIndex, setDuplicateItemIndex] = useState<number | null>(null);
    const [filterDate, setFilterDate] = useState('');
    const [notes, setNotes] = useState('');
    const [title, setTitle] = useState('');
    const [summingIndex, setSummingIndex] = useState<number | null>(null);
    const [sumValue, setSumValue] = useState<number | string>('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [itemIndexToDelete, setItemIndexToDelete] = useState<number | null>(null);
    const [showReportDeleteConfirm, setShowReportDeleteConfirm] = useState(false);
    const [reportIdToDelete, setReportIdToDelete] = useState<string | null>(null);
    const [selectedReports, setSelectedReports] = useState<string[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [tempImages, setTempImages] = useState<File[]>([]);
    const [isCarouselOpen, setIsCarouselOpen] = useState(false);
    const [carouselImages, setCarouselImages] = useState<string[]>([]);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [currentCarouselReportId, setCurrentCarouselReportId] = useState<string | null>(null);
    const [showImageDeleteConfirm, setShowImageDeleteConfirm] = useState(false);
    const [imageToDeleteUrl, setImageToDeleteUrl] = useState<string | null>(null);
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);
    const [reportToPrint, setReportToPrint] = useState<Report | null>(null);
    const [printIdToPrint, setPrintIdToPrint] = useState<number>(0);
    const [showShareConfirm, setShowShareConfirm] = useState(false);
    const [reportToShare, setReportToShare] = useState<Report | null>(null);
    const [printIdToShare, setPrintIdToShare] = useState<number>(0);

    const { reports, loading } = useReports<Report>('delivery', filterDate);
    const { user } = useAuth();
    const [disableDecimals, setDisableDecimals] = useState(false);

    useEffect(() => {
        if (user) {
            const loadOptions = async () => {
                const optionsDoc = await getDoc(doc(db, 'users', user.uid, 'settings', 'general'));
                if (optionsDoc.exists()) {
                    setDisableDecimals(optionsDoc.data().disableDecimals || false);
                }
            };
            loadOptions();
        }
    }, [user]);

    const skuInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const sumInputRef = useRef<HTMLInputElement>(null);

    const startScanner = () => setIsScanning(true);

    const handleScan = (decodedText: string) => {
        const found = allProducts.find(p => p.sku.toLowerCase() === decodedText.toLowerCase() || (p.ean && p.ean.toLowerCase() === decodedText.toLowerCase()));
        if (found) {
            setSelectedProduct(found);
            setSearchTerm('');
            setProducts([]);
            setTimeout(() => quantityInputRef.current?.focus(), 10);
        } else {
            handleSearchProduct(decodedText);
        }
    };

    const handleSearchProduct = (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setProducts([]);
            return;
        }
        const results = allProducts
            .filter((p: any) =>
                p.status === 'active' &&
                (p.sku.toLowerCase().includes(term.toLowerCase()) ||
                    p.description.toLowerCase().includes(term.toLowerCase()))
            )
            .slice(0, 10);
        setProducts(results);
    };

    const addItemToReport = () => {
        if (!selectedProduct) return;

        const existingIndex = reportItems.findIndex(i => i.productId === selectedProduct.id);
        if (existingIndex !== -1) {
            setDuplicateItemIndex(existingIndex);
            setShowConfirmModal(true);
            return;
        }

        const newItem: ReportItem = {
            productId: selectedProduct.id,
            sku: selectedProduct.sku,
            description: selectedProduct.description,
            currentCount: Number(quantity) || 0,
        };

        setReportItems([...reportItems, newItem]);
        setSelectedProduct(null);
        setSearchTerm('');
        setQuantity('');
        setProducts([]);
        skuInputRef.current?.focus();
    };

    const handleSum = () => {
        if (summingIndex !== null && sumValue !== '') {
            const updatedItems = [...reportItems];
            updatedItems[summingIndex].currentCount += Number(sumValue);
            setReportItems(updatedItems);
            setSummingIndex(null);
            setSumValue('');
        }
    };

    const handleDeleteImage = async () => {
        if (!currentCarouselReportId || !imageToDeleteUrl) return;

        try {
            // 1. Delete from Firebase Storage
            const imageRef = ref(storage, imageToDeleteUrl);
            await deleteObject(imageRef);

            // 2. Update Firestore document (remove from array)
            const reportRef = doc(db, 'reports', currentCarouselReportId);
            await updateDoc(reportRef, {
                imageUrls: arrayRemove(imageToDeleteUrl)
            });

            // 3. Update local state
            setCarouselImages(prev => prev.filter(url => url !== imageToDeleteUrl));

            // Adjust carousel index if needed
            if (carouselIndex >= carouselImages.length - 1 && carouselIndex > 0) {
                setCarouselIndex(carouselIndex - 1);
            }

            setShowImageDeleteConfirm(false);
            setImageToDeleteUrl(null);

            // If it was the last image, the carousel will close due to carouselImages.length check in JSX
            // but we might want to close it explicitly if empty
            if (carouselImages.length === 1) {
                setIsCarouselOpen(false);
            }
        } catch (error) {
            console.error("Erro ao excluir imagem:", error);
            alert("Erro ao excluir imagem. Tente novamente.");
        }
    };

    const confirmUpdate = () => {
        if (duplicateItemIndex !== null) {
            const updatedItems = [...reportItems];
            updatedItems[duplicateItemIndex].currentCount = Number(quantity) || 0;
            setReportItems(updatedItems);
            setSelectedProduct(null);
            setSearchTerm('');
            setQuantity('');
            setProducts([]);
            setShowConfirmModal(false);
            setDuplicateItemIndex(null);
            skuInputRef.current?.focus();
        }
    };

    const uploadImages = async (reportId: string): Promise<string[]> => {
        if (tempImages.length === 0) return currentReport?.imageUrls || [];

        setIsUploading(true);
        const uploadedUrls: string[] = [...(currentReport?.imageUrls || [])];

        for (const file of tempImages) {
            const imageRef = ref(storage, `delivery_images/${user?.uid}/${reportId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(imageRef, file);
            const url = await getDownloadURL(snapshot.ref);
            uploadedUrls.push(url);
        }

        setIsUploading(false);
        return uploadedUrls;
    };

    const saveReport = async () => {
        if (reportItems.length === 0) return;

        let reportId = currentReport?.id;
        let finalImageUrls: string[] = currentReport?.imageUrls || [];

        // If it's a new report, we need its ID first or we create one
        // Firestore addDoc returns a ref with an ID.
        // We might want to upload images AFTER creating the doc if it's new, 
        // but for existing ones we can do it during update.

        if (currentReport) {
            finalImageUrls = await uploadImages(currentReport.id);
            const reportRef = doc(db, 'reports', currentReport.id);
            await updateDoc(reportRef, {
                title: title.trim(),
                items: reportItems,
                totalItems: reportItems.length,
                notes: notes,
                imageUrls: finalImageUrls,
                updatedAt: serverTimestamp()
            });
        } else {
            const nextSequentialId = reports.length > 0
                ? Math.max(reports.length, ...reports.map(r => r.sequentialId || 0)) + 1
                : 1;

            const newDoc = await addDoc(collection(db, 'reports'), {
                type: 'delivery',
                title: title.trim(),
                items: reportItems,
                totalItems: reportItems.length,
                notes: notes,
                sequentialId: nextSequentialId,
                imageUrls: [], // Placeholder
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            reportId = newDoc.id;
            finalImageUrls = await uploadImages(newDoc.id);
            await updateDoc(doc(db, 'reports', newDoc.id), {
                imageUrls: finalImageUrls
            });
        }

        for (const item of reportItems) {
            const historyEntry = {
                action: 'Entrega (Recebimento)',
                date: new Date().toISOString(),
                details: `Quantidade recebida: ${item.currentCount}`,
                reportId: reportId
            };

            await updateDoc(doc(db, 'products', item.productId), {
                history: arrayUnion(historyEntry),
                updatedAt: serverTimestamp()
            });
        }

        setIsModalOpen(false);
        setReportItems([]);
        setNotes('');
        setTitle('');
        setTempImages([]);
        setCurrentReport(null);
    };

    const deleteReport = async (id: string) => {
        setReportIdToDelete(id);
        setShowReportDeleteConfirm(true);
    };

    const confirmDeleteReport = async () => {
        if (!reportIdToDelete) return;
        try {
            await deleteDoc(doc(db, 'reports', reportIdToDelete));
            setShowReportDeleteConfirm(false);
            setReportIdToDelete(null);
        } catch (error) {
            console.error('Erro ao excluir:', error);
        }
    };

    const handleShare = async (report: Report, printId: number) => {
        if (report.imageUrls && report.imageUrls.length > 0) {
            setReportToShare(report);
            setPrintIdToShare(printId);
            setShowShareConfirm(true);
        } else {
            await shareReport(report, printId, false);
        }
    };

    const handlePrintReport = (report: Report, printId: number) => {
        if (report.type === 'delivery' && report.imageUrls && report.imageUrls.length > 0) {
            setReportToPrint(report);
            setPrintIdToPrint(printId);
            setShowPrintConfirm(true);
        } else {
            printWebReport(report, printId, false);
        }
    };

    const handleToggleSelectReport = (reportId: string) => {
        setSelectedReports(prev => {
            if (prev.includes(reportId)) {
                return prev.filter(id => id !== reportId);
            }
            if (prev.length >= 5) {
                alert('Você pode selecionar no máximo 5 relatórios para unificar.');
                return prev;
            }
            return [...prev, reportId];
        });
    };

    const handleMergeAndPrint = () => {
        if (selectedReports.length < 2) return;

        const reportsToMerge = reports.filter(r => selectedReports.includes(r.id));
        const mergedItemsMap = new Map<string, ReportItem>();

        reportsToMerge.forEach(report => {
            report.items.forEach(item => {
                const existing = mergedItemsMap.get(item.sku);
                if (existing) {
                    existing.currentCount += item.currentCount;
                } else {
                    mergedItemsMap.set(item.sku, { ...item });
                }
            });
        });

        const mergedItems = Array.from(mergedItemsMap.values());

        const mergedReport: Report = {
            id: 'unified-' + Date.now().toString(),
            type: 'delivery',
            title: `Entregas Unificadas (${selectedReports.length})`,
            totalItems: mergedItems.length,
            items: mergedItems,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            notes: 'Este é um relatório unificado de múltiplas entregas selecionadas no painel. Contém a soma dos SKUs de cada entrega.',
        };

        handlePrintReport(mergedReport, 0); // O sequentialId 0 vai forçar o uso de report.title
    };

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Entregas</h1>
                    <p className="text-slate-500 dark:text-slate-400">Registro de recebimento de itens</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl mb-6 shadow-lg">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Filtrar por Dia</label>
                    <input
                        type="date"
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setFilterDate('')}
                    className="px-6 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors text-sm font-medium h-[42px]"
                >
                    Limpar
                </button>
                <div className="hidden md:block h-10 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>
                {selectedReports.length > 1 && (
                    <button
                        onClick={handleMergeAndPrint}
                        className="w-full md:w-auto flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-900/20 font-bold"
                    >
                        <Layers size={20} />
                        <span>Unificar ({selectedReports.length})</span>
                    </button>
                )}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 font-bold"
                >
                    <Plus size={20} />
                    <span>Nova Entrega</span>
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
                                        <th className="px-6 py-4 font-semibold w-12">
                                            <div className="w-4 h-4" /> {/* Spacer for alignment */}
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
                                        return (
                                            <tr key={report.id} className={`transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-100/30 dark:bg-slate-800/30'}`}>
                                                <td className="px-6 py-4">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleToggleSelectReport(report.id)}
                                                        className="w-4 h-4 text-purple-600 rounded border-slate-300 dark:border-slate-700 focus:ring-purple-500 dark:bg-slate-800 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 font-mono text-purple-400">
                                                    #{displayId}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                                                    {report.title || <span className="text-slate-400 font-normal">Entrega #{displayId}</span>}
                                                </td>
                                                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                                                    {report.createdAt?.toDate ? (
                                                        <div className="flex flex-col">
                                                            <span>{report.createdAt.toDate().toLocaleDateString('pt-BR')}</span>
                                                            <span className="text-xs text-slate-500 font-normal mt-0.5">{report.createdAt.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    ) : 'Processando...'}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold">
                                                        {report.totalItems}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2 text-nowrap">
                                                        {report.imageUrls && report.imageUrls.length > 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    setCarouselImages(report.imageUrls || []);
                                                                    setCarouselIndex(0);
                                                                    setCurrentCarouselReportId(report.id);
                                                                    setIsCarouselOpen(true);
                                                                }}
                                                                className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all relative flex items-center gap-1"
                                                                title="Ver Imagens"
                                                            >
                                                                <ImageIcon size={18} />
                                                                <span className="text-[10px] font-bold">{report.imageUrls.length}</span>
                                                            </button>
                                                        )}
                                                        {report.notes && (
                                                            <div className="p-2 text-blue-400" title={report.notes}>
                                                                <Eye size={18} />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                setCurrentReport(report);
                                                                setReportItems(report.items);
                                                                setNotes(report.notes || '');
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
                                const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...';
                                const isSelected = selectedReports.includes(report.id);
                                return (
                                    <div key={report.id} className={`p-4 space-y-4 transition-colors ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'hover:bg-slate-100/20 dark:bg-slate-800/20'}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleToggleSelectReport(report.id)}
                                                    className="w-5 h-5 text-purple-600 rounded border-slate-300 dark:border-slate-700 focus:ring-purple-500 dark:bg-slate-800 cursor-pointer"
                                                />
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 max-w-[200px] sm:max-w-[250px]">
                                                        <p className="font-mono text-purple-400 font-bold shrink-0">#{displayId}</p>
                                                        <span className="text-slate-900 dark:text-white font-semibold text-sm truncate">
                                                            {report.title || `Entrega #${displayId}`}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-500 text-[10px]">{dateText}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {report.notes && (
                                                    <span title={report.notes}>
                                                        <Eye size={14} className="text-blue-400" />
                                                    </span>
                                                )}
                                                <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full text-[10px] font-bold">
                                                    {report.totalItems}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                                            <div className="flex gap-2">
                                                {report.imageUrls && report.imageUrls.length > 0 && (
                                                    <button
                                                        onClick={() => {
                                                            setCarouselImages(report.imageUrls || []);
                                                            setCarouselIndex(0);
                                                            setCurrentCarouselReportId(report.id);
                                                            setIsCarouselOpen(true);
                                                        }}
                                                        className="px-3 py-2 bg-blue-600/10 text-blue-400 rounded-lg border border-blue-500/20 flex items-center gap-1"
                                                    >
                                                        <ImageIcon size={14} />
                                                        <span className="text-[10px] font-bold">{report.imageUrls.length}</span>
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setCurrentReport(report);
                                                        setReportItems(report.items);
                                                        setNotes(report.notes || '');
                                                        setTitle(report.title || '');
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
                            {reports.length === 0 && (
                                <div className="p-12 text-center text-slate-500 italic text-sm">
                                    Nenhum relatório cadastrado.
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-md">
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 gap-4">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder={currentReport ? `Entrega #${reports.length - reports.findIndex(r => r.id === currentReport.id)}` : `Entrega #${reports.length + 1}`}
                                className="flex-1 text-xl md:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-none outline-none focus:ring-0 px-2 placeholder-slate-400 dark:placeholder-slate-600 truncate"
                            />
                            <button onClick={() => { setIsModalOpen(false); setReportItems([]); setNotes(''); setTitle(''); setCurrentReport(null); }} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white shrink-0">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div className="md:col-span-2 relative">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Produto</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="text"
                                            ref={skuInputRef}
                                            autoFocus
                                            className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            value={selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.description}` : searchTerm}
                                            onChange={(e) => !selectedProduct && handleSearchProduct(e.target.value)}
                                            readOnly={!!selectedProduct}
                                            placeholder="Inserir SKU"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            {(selectedProduct || searchTerm) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedProduct(null);
                                                        setSearchTerm('');
                                                        setProducts([]);
                                                        skuInputRef.current?.focus();
                                                    }}
                                                    className="text-slate-500 hover:text-slate-900 dark:text-white p-1"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={isScanning ? () => setIsScanning(false) : startScanner}
                                                className="text-slate-500 hover:text-purple-500 dark:hover:text-purple-400 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm ml-1"
                                            >
                                                {isScanning ? <StopCircle size={20} /> : <ScanBarcode size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <ScannerModal
                                        isOpen={isScanning}
                                        onClose={() => setIsScanning(false)}
                                        onScan={handleScan}
                                    />

                                    {products.length > 0 && !selectedProduct && (
                                        <div className="absolute z-10 w-full mt-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto border-t-0 rounded-t-none">
                                            {products.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedProduct(p);
                                                        setProducts([]);
                                                        setTimeout(() => quantityInputRef.current?.focus(), 10);
                                                    }}
                                                    className="p-3 hover:bg-slate-200 dark:bg-slate-700 cursor-pointer border-b border-slate-300 dark:border-slate-700 last:border-0"
                                                >
                                                    <p className="font-mono text-purple-400 text-sm">{p.sku}</p>
                                                    <p className="text-slate-700 dark:text-slate-300 text-xs truncate">{p.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="md:w-32">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Qtd</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            ref={quantityInputRef}
                                            placeholder="0"
                                            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none no-spinner"
                                            value={quantity}
                                            onKeyDown={(e) => {
                                                if (disableDecimals && (e.key === '.' || e.key === ',')) {
                                                    e.preventDefault();
                                                }
                                            }}
                                            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                        />
                                        <button onClick={addItemToReport} disabled={!selectedProduct || quantity === ''} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-3 rounded-lg transition-all shadow-lg active:scale-95">
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1.5 ml-1">
                                        <label className="block text-[10px] font-bold text-slate-500 uppercase">Observações (Opcional)</label>
                                        <span className={`text-[10px] font-bold ${notes.length >= 45 ? 'text-amber-500' : 'text-slate-600'}`}>
                                            {notes.length}/50
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value.slice(0, 50))}
                                        maxLength={50}
                                        placeholder="Ex: NF #1234, entregador Fulano..."
                                        className="w-full bg-slate-100/50 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="shrink-0 flex flex-col items-center">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5 text-center">Imagens</label>
                                    <div className="flex items-center gap-2">
                                        {(currentReport?.imageUrls?.length || 0) + tempImages.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allImages = [...(currentReport?.imageUrls || []), ...tempImages.map(f => URL.createObjectURL(f))];
                                                    setCarouselImages(allImages);
                                                    setCarouselIndex(0);
                                                    setIsCarouselOpen(true);
                                                }}
                                                className="p-2 bg-blue-500/10 text-blue-500 rounded-lg border border-blue-500/20 flex items-center gap-2"
                                            >
                                                <ImageIcon size={20} />
                                                <span className="font-bold text-sm">{(currentReport?.imageUrls?.length || 0) + tempImages.length}</span>
                                            </button>
                                        )}
                                        <label className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-purple-500 dark:hover:text-purple-400 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer transition-all shadow-sm">
                                            <Upload size={20} />
                                            <input
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    if (e.target.files) {
                                                        setTempImages([...tempImages, ...Array.from(e.target.files)]);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-2">
                                        <ClipboardList size={16} />
                                        Itens na Entrega ({reportItems.length})
                                    </h3>
                                    {isUploading && (
                                        <div className="flex items-center gap-2 text-blue-500 animate-pulse">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                            <span className="text-xs font-bold uppercase">Subindo imagens...</span>
                                        </div>
                                    )}
                                </div>
                                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white dark:bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Produto</th>
                                                <th className="px-6 py-3 text-center">Quantidade</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white/30 dark:bg-slate-900/30">
                                            {reportItems
                                                .filter(i =>
                                                    i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    i.description.toLowerCase().includes(searchTerm.toLowerCase())
                                                )
                                                .map((item, idx) => {
                                                    const originalIndex = reportItems.findIndex(ri => ri === item);
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-100/10 dark:bg-slate-800/10 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-mono text-purple-400">{item.sku}</p>
                                                                <p className="text-slate-500 text-xs truncate max-w-[150px] md:max-w-[300px]">{item.description}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-bold text-slate-900 dark:text-white">{item.currentCount}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSummingIndex(originalIndex);
                                                                            setSumValue('');
                                                                        }}
                                                                        className="text-emerald-500 hover:text-emerald-400 p-2 transition-colors"
                                                                        title="Somar Quantidade"
                                                                    >
                                                                        <Calculator size={18} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setItemIndexToDelete(originalIndex);
                                                                            setShowDeleteConfirm(true);
                                                                        }}
                                                                        className="text-slate-600 hover:text-red-400 p-2 transition-colors"
                                                                        title="Excluir"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            {reportItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="px-6 py-8 text-center text-slate-500 italic">Adicione produtos para iniciar o registro</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile View dos itens no modal */}
                                <div className="md:hidden space-y-3">
                                    {reportItems
                                        .filter(i =>
                                            i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            i.description.toLowerCase().includes(searchTerm.toLowerCase())
                                        )
                                        .map((item, idx) => {
                                            const originalIndex = reportItems.findIndex(ri => ri === item);
                                            return (
                                                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <p className="font-mono text-purple-400 font-bold text-sm truncate">{item.sku}</p>
                                                        <p className="text-slate-500 text-[10px] truncate">{item.description}</p>
                                                        <div className="mt-2 text-slate-900 dark:text-white font-bold text-sm">
                                                            Qtd: {item.currentCount}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <button
                                                            onClick={() => {
                                                                setSummingIndex(originalIndex);
                                                                setSumValue('');
                                                            }}
                                                            className="p-3 bg-emerald-500/10 text-emerald-500 rounded-lg active:scale-95 transition-all"
                                                        >
                                                            <Calculator size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setItemIndexToDelete(originalIndex);
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
                                    {reportItems.length === 0 && (
                                        <div className="py-8 text-center text-slate-500 italic text-sm border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                                            Nenhum item adicionado
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-end gap-3 md:gap-4">
                            <button onClick={() => { setIsModalOpen(false); setReportItems([]); setNotes(''); setTitle(''); setCurrentReport(null); }} className="order-2 md:order-1 px-6 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">Cancelar</button>
                            <button onClick={saveReport} disabled={reportItems.length === 0} className="order-1 md:order-2 px-8 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">Finalizar</button>
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
                                Este SKU já está na lista da entrega. Deseja atualizar a quantidade para o novo valor informado?
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
                                    onClick={confirmUpdate}
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Alterar
                                </button>
                            </div>
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
                                <br />
                                Atual: {reportItems[summingIndex].currentCount}
                            </p>
                            <input
                                type="number"
                                ref={sumInputRef}
                                autoFocus
                                placeholder="Valor a somar (ex: 10)"
                                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white mb-6 focus:ring-2 focus:ring-emerald-500 outline-none no-spinner"
                                value={sumValue}
                                onKeyDown={(e) => {
                                    if (disableDecimals && (e.key === '.' || e.key === ',')) {
                                        e.preventDefault();
                                    }
                                    if (e.key === 'Enter') handleSum();
                                }}
                                onChange={(e) => setSumValue(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSummingIndex(null);
                                        setSumValue('');
                                    }}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSum}
                                    disabled={sumValue === ''}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Somar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão de Item */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Remover Item?</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Tem certeza que deseja remover este item da entrega? Esta ação não pode ser desfeita.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setItemIndexToDelete(null);
                                    }}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (itemIndexToDelete !== null) {
                                            setReportItems(reportItems.filter((_, i) => i !== itemIndexToDelete));
                                        }
                                        setShowDeleteConfirm(false);
                                        setItemIndexToDelete(null);
                                    }}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão de Relatório */}
            {showReportDeleteConfirm && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Relatório?</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Tem certeza que deseja apagar este relatório de entrega permanentemente?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowReportDeleteConfirm(false);
                                        setReportIdToDelete(null);
                                    }}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmDeleteReport}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Carrossel de Imagens */}
            {isCarouselOpen && carouselImages.length > 0 && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl transition-all animate-in fade-in duration-300">
                    <div className="absolute top-6 right-6 z-[110] flex gap-3">
                        <button
                            onClick={() => {
                                setImageToDeleteUrl(carouselImages[carouselIndex]);
                                setShowImageDeleteConfirm(true);
                            }}
                            className="p-3 text-red-400 hover:text-red-500 bg-white/10 hover:bg-white/20 rounded-full transition-all"
                            title="Excluir Imagem"
                        >
                            <Trash2 size={24} />
                        </button>
                        <button
                            onClick={() => setIsCarouselOpen(false)}
                            className="p-3 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
                            title="Fechar"
                        >
                            <X size={28} />
                        </button>
                    </div>

                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        {carouselImages.length > 1 && (
                            <>
                                <button
                                    onClick={() => setCarouselIndex((prev) => (prev === 0 ? carouselImages.length - 1 : prev - 1))}
                                    className="absolute left-4 z-[110] p-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-95"
                                >
                                    <ChevronLeft size={32} />
                                </button>
                                <button
                                    onClick={() => setCarouselIndex((prev) => (prev === carouselImages.length - 1 ? 0 : prev + 1))}
                                    className="absolute right-4 z-[110] p-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all active:scale-95"
                                >
                                    <ChevronRight size={32} />
                                </button>
                            </>
                        )}

                        <div className="relative max-w-5xl max-h-[85vh] w-full flex items-center justify-center">
                            <img
                                src={carouselImages[carouselIndex]}
                                alt={`Anexo ${carouselIndex + 1}`}
                                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl transition-all duration-300 animate-in zoom-in-95"
                            />

                            <div className="absolute -bottom-12 left-0 right-0 flex justify-center items-center gap-3">
                                <span className="text-white/70 text-sm font-bold bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
                                    {carouselIndex + 1} / {carouselImages.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão de Imagem no Carrossel */}
            {showImageDeleteConfirm && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Excluir Imagem?</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Tem certeza que deseja remover esta imagem da entrega? O arquivo será apagado permanentemente.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowImageDeleteConfirm(false);
                                        setImageToDeleteUrl(null);
                                    }}
                                    className="flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleDeleteImage}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Impressão Condicional */}
            {showPrintConfirm && reportToPrint && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Printer size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Imprimir com Imagens?</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Este relatório contém imagens anexadas. Deseja incluí-las na impressão?
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        printWebReport(reportToPrint, printIdToPrint, true);
                                        setShowPrintConfirm(false);
                                        setReportToPrint(null);
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <ImageIcon size={18} /> Sim, incluir imagens
                                </button>
                                <button
                                    onClick={() => {
                                        printWebReport(reportToPrint, printIdToPrint, false);
                                        setShowPrintConfirm(false);
                                        setReportToPrint(null);
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
                                >
                                    Não, apenas o relatório
                                </button>
                                <button
                                    onClick={() => {
                                        setShowPrintConfirm(false);
                                        setReportToPrint(null);
                                    }}
                                    className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-semibold transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Compartilhamento Condicional */}
            {showShareConfirm && reportToShare && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Share2 size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Compartilhar Imagens?</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Este relatório contém imagens anexadas. Incluí-las pode gerar um arquivo grande, o que em alguns celulares pode falhar ao compartilhar. Deseja enviá-las junto com o PDF?
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        shareReport(reportToShare, printIdToShare, true);
                                        setShowShareConfirm(false);
                                        setReportToShare(null);
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <ImageIcon size={18} /> Sim, incluir imagens
                                </button>
                                <button
                                    onClick={() => {
                                        shareReport(reportToShare, printIdToShare, false);
                                        setShowShareConfirm(false);
                                        setReportToShare(null);
                                    }}
                                    className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-3 rounded-xl transition-all hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95"
                                >
                                    Não, compartilhar apenas texto do relatório
                                </button>
                                <button
                                    onClick={() => {
                                        setShowShareConfirm(false);
                                        setReportToShare(null);
                                    }}
                                    className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white font-semibold transition-colors"
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

export default Entregas;
