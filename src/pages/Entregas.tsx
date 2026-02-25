import { useState, useEffect, useRef } from 'react';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    doc,
    arrayUnion,
    serverTimestamp,
    getDocs,
    deleteDoc
} from 'firebase/firestore';
import { db } from '../db/firebase';
import { Search, Plus, Printer, Trash2, Edit2, X, AlertTriangle, Share2, ClipboardList, Eye } from 'lucide-react';

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
}

const Entregas = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const skuInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'reports'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allReps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
            // Filtramos no cliente por tipo e data
            const filtered = allReps.filter(r => {
                const isCorrectType = r.type === 'delivery';
                if (!isCorrectType) return false;

                if (filterDate) {
                    const reportDate = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString('en-CA') : '';
                    return reportDate === filterDate;
                }

                return true;
            });
            setReports(filtered.reverse());
        });
        return () => unsubscribe();
    }, [filterDate]);

    const handleSearchProduct = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setProducts([]);
            return;
        }
        const snapshot = await getDocs(collection(db, 'products'));
        const results = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
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

    const saveReport = async () => {
        if (reportItems.length === 0) return;

        let reportRef;
        if (currentReport) {
            reportRef = doc(db, 'reports', currentReport.id);
            await updateDoc(reportRef, {
                items: reportItems,
                totalItems: reportItems.length,
                notes: notes,
                updatedAt: serverTimestamp()
            });
        } else {
            const newDoc = await addDoc(collection(db, 'reports'), {
                type: 'delivery',
                items: reportItems,
                totalItems: reportItems.length,
                notes: notes,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            reportRef = newDoc;
        }

        for (const item of reportItems) {
            const historyEntry = {
                action: 'Entrega (Recebimento)',
                date: new Date().toISOString(),
                details: `Quantidade recebida: ${item.currentCount}`,
                reportId: currentReport ? currentReport.id : reportRef.id
            };

            await updateDoc(doc(db, 'products', item.productId), {
                history: arrayUnion(historyEntry),
                updatedAt: serverTimestamp()
            });
        }

        setIsModalOpen(false);
        setReportItems([]);
        setNotes('');
        setCurrentReport(null);
    };

    const deleteReport = async (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este relatório?')) {
            await deleteDoc(doc(db, 'reports', id));
        }
    };

    const handleShare = async (report: Report) => {
        const sequentialId = reports.length - reports.findIndex(r => r.id === report.id);
        const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...';
        let text = `📊 *Registro de Entrega #${sequentialId}*\n📅 *Data:* ${dateText}\n📝 *Itens:* ${report.totalItems}\n👤 *Usuário:* ${report.userName || 'N/A'}`;

        if (report.notes) {
            text += `\n\n📝 *Observações:* ${report.notes}`;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Entrega #${sequentialId}`,
                    text: text
                });
            } catch (error) {
                console.error('Erro ao compartilhar:', error);
            }
        } else {
            navigator.clipboard.writeText(text);
            alert('Informações copiadas para a área de transferência!');
        }
    };

    const handlePrintReport = (report: Report, sequentialId: number) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Relatório de Entrega #${sequentialId}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #f8fafc !important; }
                        tbody tr:nth-child(even) { background-color: #f2f2f2 !important; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Registro de Entrega #${sequentialId}</h1>
                            <p>Data: ${report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</p>
                        </div>
                        <div style="text-align: right">
                            <p>Total de Itens: ${report.totalItems}</p>
                        </div>
                    </div>
                    ${report.notes ? `<div style="margin-top: 15px; padding: 10px; background: #f8fafc; border-left: 4px solid #333;"><p style="margin:0; font-weight: bold; font-size: 14px;">Observações:</p><p style="margin:5px 0 0 0; font-size: 14px;">${report.notes}</p></div>` : ''}
                    <table>
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Descrição</th>
                                <th>Quantidade</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.items.map(item => `
                                <tr>
                                    <td><strong>${item.sku}</strong></td>
                                    <td>${item.description}</td>
                                    <td>${item.currentCount}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Entregas</h1>
                    <p className="text-slate-400">Registro de recebimento de itens</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 shadow-lg">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Filtrar por Dia</label>
                    <input
                        type="date"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setFilterDate('')}
                    className="px-6 py-2 text-slate-400 hover:text-white transition-colors text-sm font-medium h-[42px]"
                >
                    Limpar
                </button>
                <div className="hidden md:block h-10 w-px bg-slate-800 mx-2"></div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-purple-900/20 font-bold"
                >
                    <Plus size={20} />
                    <span>Nova Entrega</span>
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-sm">
                                <th className="px-6 py-4 font-semibold">ID</th>
                                <th className="px-6 py-4 font-semibold">Criação</th>
                                <th className="px-6 py-4 font-semibold text-center">Itens</th>
                                <th className="px-6 py-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {reports.map((report, index) => {
                                const sequentialId = reports.length - index;
                                return (
                                    <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-purple-400">
                                            #{sequentialId}
                                        </td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-purple-500/10 text-purple-400 px-3 py-1 rounded-full text-xs font-bold">
                                                {report.totalItems} itens
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 text-nowrap">
                                                {report.notes && (
                                                    <div className="p-2 text-blue-400" title={report.notes}>
                                                        <Eye size={18} />
                                                    </div>
                                                )}
                                                <button
                                                    onClick={() => handleShare(report)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                                    title="Compartilhar"
                                                >
                                                    <Share2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setCurrentReport(report);
                                                        setReportItems(report.items);
                                                        setNotes(report.notes || '');
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handlePrintReport(report, sequentialId)}
                                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                                    title="Imprimir"
                                                >
                                                    <Printer size={18} />
                                                </button>
                                                <button
                                                    onClick={() => deleteReport(report.id)}
                                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
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
                <div className="md:hidden divide-y divide-slate-800">
                    {reports.map((report, index) => {
                        const sequentialId = reports.length - index;
                        const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...';
                        return (
                            <div key={report.id} className="p-4 space-y-4 hover:bg-slate-800/20 transition-colors">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1">
                                        <p className="font-mono text-purple-400 font-bold">#{sequentialId}</p>
                                        <p className="text-slate-500 text-[10px]">{dateText}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {report.notes && (
                                            <span title={report.notes}>
                                                <Eye size={14} className="text-blue-400" />
                                            </span>
                                        )}
                                        <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full text-[10px] font-bold">
                                            {report.totalItems} ITENS
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setCurrentReport(report);
                                                setReportItems(report.items);
                                                setNotes(report.notes || '');
                                                setIsModalOpen(true);
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-700"
                                        >
                                            <Edit2 size={14} />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handlePrintReport(report, sequentialId)}
                                            className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg border border-slate-700"
                                        >
                                            <Printer size={14} />
                                        </button>
                                        <button
                                            onClick={() => deleteReport(report.id)}
                                            className="px-3 py-2 bg-slate-800 text-red-400 rounded-lg border border-slate-700"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => handleShare(report)}
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
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/80 backdrop-blur-md">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-xl md:text-2xl font-bold text-white truncate px-2">{currentReport ? `Editando Entrega #${reports.length - reports.findIndex(r => r.id === currentReport.id)}` : 'Novo Registro de Entrega'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setReportItems([]); setNotes(''); setCurrentReport(null); }} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                <div className="md:col-span-2 relative">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Produto</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input
                                            type="text"
                                            ref={skuInputRef}
                                            autoFocus
                                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            value={selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.description}` : searchTerm}
                                            onChange={(e) => !selectedProduct && handleSearchProduct(e.target.value)}
                                            readOnly={!!selectedProduct}
                                            placeholder="Inserir SKU"
                                        />
                                        {selectedProduct && (
                                            <button onClick={() => setSelectedProduct(null)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                                                <X size={18} />
                                            </button>
                                        )}
                                    </div>

                                    {products.length > 0 && !selectedProduct && (
                                        <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto border-t-0 rounded-t-none">
                                            {products.map(p => (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        setSelectedProduct(p);
                                                        setProducts([]);
                                                        setTimeout(() => quantityInputRef.current?.focus(), 10);
                                                    }}
                                                    className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0"
                                                >
                                                    <p className="font-mono text-purple-400 text-sm">{p.sku}</p>
                                                    <p className="text-slate-300 text-xs truncate">{p.description}</p>
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
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-purple-500 outline-none no-spinner"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                        />
                                        <button onClick={addItemToReport} disabled={!selectedProduct || quantity === ''} className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-3 rounded-lg transition-all shadow-lg active:scale-95">
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
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
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase flex items-center gap-2">
                                    <ClipboardList size={16} />
                                    Itens na Entrega ({reportItems.length})
                                </h3>
                                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Produto</th>
                                                <th className="px-6 py-3 text-center">Quantidade</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                                            {reportItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <p className="font-mono text-purple-400">{item.sku}</p>
                                                        <p className="text-slate-500 text-xs truncate max-w-[150px] md:max-w-[300px]">{item.description}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold text-white">{item.currentCount}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => setReportItems(reportItems.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-400 p-2 transition-colors">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
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
                                    {reportItems.map((item, idx) => (
                                        <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="font-mono text-purple-400 font-bold text-sm truncate">{item.sku}</p>
                                                <p className="text-slate-500 text-[10px] truncate">{item.description}</p>
                                                <div className="mt-2 text-white font-bold text-sm">
                                                    Qtd: {item.currentCount}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setReportItems(reportItems.filter((_, i) => i !== idx))}
                                                className="p-3 bg-red-400/10 text-red-500 rounded-lg active:scale-95 transition-all"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    ))}
                                    {reportItems.length === 0 && (
                                        <div className="py-8 text-center text-slate-500 italic text-sm border-2 border-dashed border-slate-800 rounded-xl">
                                            Nenhum item adicionado
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-end gap-3 md:gap-4">
                            <button onClick={() => { setIsModalOpen(false); setReportItems([]); setNotes(''); setCurrentReport(null); }} className="order-2 md:order-1 px-6 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={saveReport} disabled={reportItems.length === 0} className="order-1 md:order-2 px-8 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">Finalizar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Duplicidade */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Item Já Adicionado</h2>
                            <p className="text-slate-400 mb-6 text-sm">
                                Este SKU já está na lista da entrega. Deseja atualizar a quantidade para o novo valor informado?
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setShowConfirmModal(false);
                                        setDuplicateItemIndex(null);
                                    }}
                                    className="flex-1 py-3 text-slate-400 hover:text-white font-semibold transition-colors"
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
        </div>
    );
};

export default Entregas;
