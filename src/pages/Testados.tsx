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
import { Plus, Search, X, ClipboardList, Printer, Trash2, Edit2, AlertTriangle, Share2, Calculator } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportItem {
    productId: string;
    sku: string;
    description: string;
    currentCount: number;
    previousCount: number;
}

interface Report {
    id: string;
    type: 'inventory' | 'tested' | 'delivery';
    createdAt: any;
    updatedAt: any;
    totalItems: number;
    items: ReportItem[];
    userName?: string;
}

const Testados = () => {
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
    const [summingIndex, setSummingIndex] = useState<number | null>(null);
    const [sumValue, setSumValue] = useState<number | string>('');

    const skuInputRef = useRef<HTMLInputElement>(null);
    const quantityInputRef = useRef<HTMLInputElement>(null);
    const sumInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const q = query(
            collection(db, 'reports'),
            orderBy('createdAt', 'asc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allReps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report));
            // Filtramos no cliente por tipo e data
            const filtered = allReps.filter(r => {
                const isCorrectType = r.type === 'tested';
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

    const addItemToReport = async () => {
        if (!selectedProduct) return;

        const existingIndex = reportItems.findIndex(i => i.productId === selectedProduct.id);
        if (existingIndex !== -1) {
            setDuplicateItemIndex(existingIndex);
            setShowConfirmModal(true);
            return;
        }

        let previousCount = 0;
        const lastReportQuery = query(
            collection(db, 'reports'),
            orderBy('createdAt', 'desc')
        );
        const lastSnapshot = await getDocs(lastReportQuery);
        const reportsData = lastSnapshot.docs.map(d => d.data() as Report);
        const lastReport = reportsData.find(r => r.type === 'tested');

        if (lastReport) {
            const prevItem = lastReport.items.find(i => i.productId === selectedProduct.id);
            previousCount = prevItem ? prevItem.currentCount : 0;
        }

        const newItem: ReportItem = {
            productId: selectedProduct.id,
            sku: selectedProduct.sku,
            description: selectedProduct.description,
            currentCount: Number(quantity) || 0,
            previousCount: previousCount
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
                updatedAt: serverTimestamp()
            });
        } else {
            const newDoc = await addDoc(collection(db, 'reports'), {
                type: 'tested',
                items: reportItems,
                totalItems: reportItems.length,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            reportRef = newDoc;
        }

        for (const item of reportItems) {
            const historyEntry = {
                action: 'Teste de Qualidade',
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

        // Criar PDF
        const doc = new jsPDF();

        // Cabeçalho do PDF
        doc.setFontSize(20);
        doc.text(`Relatório de Testados #${sequentialId}`, 15, 20);
        doc.setFontSize(10);
        doc.text(`Data: ${dateText}`, 15, 30);
        doc.text(`Total de Itens: ${report.totalItems}`, 150, 30);
        doc.line(15, 35, 195, 35);

        // Tabela de itens
        const tableData = [...report.items]
            .sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }))
            .map(item => {
                const diff = item.currentCount - item.previousCount;
                return [
                    item.sku,
                    item.description,
                    item.previousCount.toString(),
                    item.currentCount.toString(),
                    diff > 0 ? `+${diff}` : diff.toString()
                ];
            });

        autoTable(doc, {
            startY: 40,
            head: [['SKU', 'Descrição', 'Anterior', 'Atual', 'Diferença']],
            body: tableData,
            headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [241, 245, 249] },
        });

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `testados_${sequentialId}.pdf`, { type: 'application/pdf' });

        const shareText = `📊 *Relatório de Testados #${sequentialId}*\n📅 *Data:* ${dateText}\n📝 *Itens:* ${report.totalItems}`;

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    files: [pdfFile],
                    title: `Testados #${sequentialId}`,
                    text: shareText
                });
            } catch (error) {
                if ((error as any).name !== 'AbortError') {
                    console.error('Erro ao compartilhar:', error);
                }
            }
        } else if (navigator.share) {
            try {
                await navigator.share({
                    title: `Testados #${sequentialId}`,
                    text: shareText
                });
            } catch (error) {
                console.error('Erro ao compartilhar texto:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            alert('Informações copiadas para a área de transferência!');
        }
    };

    const handlePrintReport = (report: Report, sequentialId: number) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Relatório de Testados #${sequentialId}</title>
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background-color: #e2e8f0 !important; }
                        tbody tr:nth-child(even) { background-color: #f2f2f2 !important; }
                        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .diff-pos { color: green; font-weight: bold; }
                        .diff-neg { color: red; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <h1>Produtos Testados #${sequentialId}</h1>
                            <p>Data: ${report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}</p>
                        </div>
                        <div style="text-align: right">
                            <p>Total de Itens: ${report.totalItems}</p>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>Descrição</th>
                                <th>Anterior</th>
                                <th>Atual</th>
                                <th>Diferença</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.items.map(item => {
            const diff = item.currentCount - item.previousCount;
            return `
                                    <tr>
                                        <td><strong>${item.sku}</strong></td>
                                        <td>${item.description}</td>
                                        <td>${item.previousCount}</td>
                                        <td>${item.currentCount}</td>
                                        <td class="${diff > 0 ? 'diff-pos' : diff < 0 ? 'diff-neg' : ''}">${diff > 0 ? '+' : ''}${diff}</td>
                                    </tr>
                                `;
        }).join('')}
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
                    <h1 className="text-3xl font-bold text-white">Produtos Testados</h1>
                    <p className="text-slate-400">Contagem e comparação de itens validados</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-6 shadow-lg">
                <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Filtrar por Dia</label>
                    <input
                        type="date"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
                    className="w-full md:w-auto flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-900/20 font-bold"
                >
                    <Plus size={20} />
                    <span>Novo Relatório</span>
                </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-sm">
                                <th className="px-6 py-4 font-semibold">ID</th>
                                <th className="px-6 py-4 font-semibold">Criação</th>
                                <th className="px-6 py-4 font-semibold">Alteração</th>
                                <th className="px-6 py-4 font-semibold text-center">Itens</th>
                                <th className="px-6 py-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {reports.map((report, index) => {
                                const sequentialId = reports.length - index;
                                return (
                                    <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-mono text-blue-400">#{sequentialId}</td>
                                        <td className="px-6 py-4 text-slate-300">
                                            {report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 text-sm">
                                            {report.updatedAt?.toDate ? report.updatedAt.toDate().toLocaleString('pt-BR') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold">
                                                {report.totalItems} itens
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 text-nowrap">
                                                <button
                                                    onClick={() => {
                                                        setCurrentReport(report);
                                                        setReportItems(report.items);
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
                                        <p className="font-mono text-blue-400 font-bold">#{sequentialId}</p>
                                        <p className="text-slate-500 text-[10px]">{dateText}</p>
                                    </div>
                                    <span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full text-[10px] font-bold">
                                        {report.totalItems} ITENS
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setCurrentReport(report);
                                                setReportItems(report.items);
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
                            <h2 className="text-xl md:text-2xl font-bold text-white truncate px-2">{currentReport ? `Editando Relatório #${reports.length - reports.findIndex(r => r.id === currentReport.id)}` : 'Novo Relatório (Testados)'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setReportItems([]); setCurrentReport(null); }} className="text-slate-400 hover:text-white">
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
                                            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                            value={selectedProduct ? `${selectedProduct.sku} - ${selectedProduct.description}` : searchTerm}
                                            onChange={(e) => !selectedProduct && handleSearchProduct(e.target.value)}
                                            readOnly={!!selectedProduct}
                                            placeholder="Inserir SKU"
                                        />
                                        {(selectedProduct || searchTerm) && (
                                            <button
                                                onClick={() => {
                                                    setSelectedProduct(null);
                                                    setSearchTerm('');
                                                    setProducts([]);
                                                    skuInputRef.current?.focus();
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                            >
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
                                                    <p className="font-mono text-blue-400 text-sm">{p.sku}</p>
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
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none no-spinner"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                                        />
                                        <button onClick={addItemToReport} disabled={!selectedProduct || quantity === ''} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white p-3 rounded-lg transition-all shadow-lg active:scale-95">
                                            <Plus size={24} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-semibold text-slate-400 uppercase flex items-center gap-2">
                                    <ClipboardList size={16} />
                                    Itens no Relatório ({reportItems.length})
                                </h3>
                                <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-900 text-slate-500 uppercase text-[10px] tracking-wider">
                                            <tr>
                                                <th className="px-6 py-3">Produto</th>
                                                <th className="px-6 py-3 text-center">Anterior</th>
                                                <th className="px-6 py-3 text-center">Atual</th>
                                                <th className="px-6 py-3 text-center">Diferença</th>
                                                <th className="px-6 py-3"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                                            {reportItems
                                                .filter(i =>
                                                    i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                                    i.description.toLowerCase().includes(searchTerm.toLowerCase())
                                                )
                                                .map((item, idx) => {
                                                    const originalIndex = reportItems.findIndex(ri => ri === item);
                                                    const diff = item.currentCount - item.previousCount;
                                                    return (
                                                        <tr key={idx} className="hover:bg-slate-800/10 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <p className="font-mono text-blue-400">{item.sku}</p>
                                                                <p className="text-slate-500 text-xs truncate max-w-[150px] md:max-w-[300px]">{item.description}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-center font-medium text-slate-400">{item.previousCount}</td>
                                                            <td className="px-6 py-4 text-center font-bold text-white">{item.currentCount}</td>
                                                            <td className={`px-6 py-4 text-center font-bold ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                                                                {diff > 0 ? `+${diff}` : diff}
                                                            </td>
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
                                                                            if (window.confirm('Remover este item do teste?')) {
                                                                                setReportItems(reportItems.filter((_, i) => i !== originalIndex));
                                                                            }
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
                                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500 italic">Adicione produtos para iniciar o relatório</td>
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
                                            const diff = item.currentCount - item.previousCount;
                                            return (
                                                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex justify-between items-center shadow-sm">
                                                    <div className="flex-1 min-w-0 pr-4">
                                                        <p className="font-mono text-blue-400 font-bold text-sm truncate">{item.sku}</p>
                                                        <p className="text-slate-500 text-[10px] truncate">{item.description}</p>
                                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                            <div className="text-slate-400 bg-slate-800/50 p-2 rounded-lg text-center">
                                                                <span className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Anterior</span>
                                                                <span className="font-bold">{item.previousCount}</span>
                                                            </div>
                                                            <div className="text-white bg-slate-800/50 p-2 rounded-lg text-center">
                                                                <span className="block text-[8px] uppercase font-bold text-slate-500 mb-0.5">Atual</span>
                                                                <span className="font-bold">{item.currentCount}</span>
                                                            </div>
                                                        </div>
                                                        <div className={`mt-2 text-center p-1 rounded-lg text-[10px] font-bold ${diff > 0 ? 'bg-emerald-500/10 text-emerald-400' : diff < 0 ? 'bg-red-500/10 text-red-500' : 'bg-slate-800 text-slate-500'}`}>
                                                            Diferença: {diff > 0 ? `+${diff}` : diff}
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
                                                                if (window.confirm('Remover este item do teste?')) {
                                                                    setReportItems(reportItems.filter((_, i) => i !== originalIndex));
                                                                }
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
                                        <div className="py-8 text-center text-slate-500 italic text-sm border-2 border-dashed border-slate-800 rounded-xl">
                                            Nenhum item adicionado
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-end gap-3 md:gap-4">
                            <button onClick={() => { setIsModalOpen(false); setReportItems([]); setCurrentReport(null); }} className="order-2 md:order-1 px-6 py-2 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                            <button onClick={saveReport} disabled={reportItems.length === 0} className="order-1 md:order-2 px-8 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg active:scale-95">Finalizar</button>
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
                                Este SKU já está na lista. Deseja atualizar a quantidade para o novo valor informado?
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

            {/* Modal de Soma */}
            {summingIndex !== null && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Calculator size={32} />
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Somar Quantidade</h2>
                            <p className="text-slate-400 mb-6 text-sm">
                                Informe o valor para somar ao item <strong>{reportItems[summingIndex].sku}</strong>.
                                <br />
                                Atual: {reportItems[summingIndex].currentCount}
                            </p>
                            <input
                                type="number"
                                ref={sumInputRef}
                                autoFocus
                                placeholder="Valor a somar (ex: 10)"
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white mb-6 focus:ring-2 focus:ring-emerald-500 outline-none no-spinner"
                                value={sumValue}
                                onChange={(e) => setSumValue(e.target.value === '' ? '' : Number(e.target.value))}
                                onKeyDown={(e) => e.key === 'Enter' && handleSum()}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSummingIndex(null);
                                        setSumValue('');
                                    }}
                                    className="flex-1 py-3 text-slate-400 hover:text-white font-semibold transition-colors"
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
        </div>
    );
};

export default Testados;
