import { useState, type FormEvent } from 'react';
import {
    collection,
    addDoc,
    query,
    updateDoc,
    doc,
    serverTimestamp,
    arrayUnion,
    getDocs,
    where
} from 'firebase/firestore';
import { db } from '../db/firebase';
import { Plus, Search, Edit2, History, X, Printer, Filter, ScanBarcode, ChevronUp, ChevronDown, ChevronsUpDown, Share2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useProducts } from '../contexts/ProductsContext';
import { ScannerModal } from '../components/ScannerModal';

interface Product {
    id: string;
    sku: string;
    ean: string;
    description: string;
    model?: string;
    status: 'active' | 'inactive';
    history: any[];
}

const Produtos = () => {
    const { products } = useProducts() as any;
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

    const [sku, setSku] = useState('');
    const [ean, setEan] = useState('');
    const [description, setDescription] = useState('');
    const [model, setModel] = useState('');
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [error, setError] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<'sku' | 'description'>('sku');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Scanner states
    const [activeScanner, setActiveScanner] = useState<'ean' | 'model' | null>(null);
    const handleCopy = (text: string, type: string) => {
        if (!text || text === '-') return;
        navigator.clipboard.writeText(text);
        toast.success(`${type} copiado com sucesso!`, { icon: '📋' });
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Check for duplicate SKU
        const skuQuery = query(collection(db, 'products'), where('sku', '==', sku));
        const skuSnapshot = await getDocs(skuQuery);
        const isSkuDuplicate = skuSnapshot.docs.some(doc => currentProduct ? doc.id !== currentProduct.id : true);

        if (isSkuDuplicate) {
            setError('Este SKU já está cadastrado em outro produto.');
            return;
        }

        // Check for duplicate EAN (only if EAN is provided)
        if (ean && ean.trim() !== '') {
            const eanQuery = query(collection(db, 'products'), where('ean', '==', ean.trim()));
            const eanSnapshot = await getDocs(eanQuery);
            const isEanDuplicate = eanSnapshot.docs.some(doc => currentProduct ? doc.id !== currentProduct.id : true);

            if (isEanDuplicate) {
                setError('Este EAN já está cadastrado em outro produto.');
                return;
            }
        }

        // Check for duplicate Model (only if Model is provided)
        if (model && model.trim() !== '') {
            const modelQuery = query(collection(db, 'products'), where('model', '==', model.trim()));
            const modelSnapshot = await getDocs(modelQuery);
            const isModelDuplicate = modelSnapshot.docs.some(doc => currentProduct ? doc.id !== currentProduct.id : true);

            if (isModelDuplicate) {
                setError('Este Modelo já está cadastrado em outro produto.');
                return;
            }
        }

        const historyEntry = {
            action: currentProduct ? 'Update' : 'Creation',
            date: new Date().toISOString(),
            details: `Produto ${currentProduct ? 'alterado' : 'criado'} com SKU: ${sku}`
        };

        if (currentProduct) {
            await updateDoc(doc(db, 'products', currentProduct.id), {
                sku,
                ean,
                description,
                model,
                status,
                updatedAt: serverTimestamp(),
                history: arrayUnion(historyEntry)
            });
        } else {
            await addDoc(collection(db, 'products'), {
                sku,
                ean,
                description,
                model,
                status,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                history: [historyEntry]
            });
        }
        resetForm();
    };

    const handleScan = (decodedText: string) => {
        if (activeScanner === 'ean') {
            setEan(decodedText);
        } else if (activeScanner === 'model') {
            setModel(decodedText);
        }
        setActiveScanner(null);
    };

    const handleSort = (column: 'sku' | 'description') => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (column: 'sku' | 'description') => {
        if (sortColumn !== column) return <ChevronsUpDown size={14} className="text-slate-500" />;
        return sortDirection === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />;
    };

    const resetForm = () => {
        setActiveScanner(null);
        setSku('');
        setEan('');
        setDescription('');
        setModel('');
        setStatus('active');
        setError(null);
        setCurrentProduct(null);
        setIsModalOpen(false);
    };


    const filteredProducts = products.filter((p: Product) => {
        const matchesSearch = p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.ean?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.model?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

        return matchesSearch && matchesStatus;
    }).sort((a: Product, b: Product) => {
        const valA = (a as any)[sortColumn] || '';
        const valB = (b as any)[sortColumn] || '';

        return sortDirection === 'asc'
            ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    });

    const handleShare = async () => {
        const dateText = new Date().toLocaleString('pt-BR');

        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text(`Catálogo de Produtos`, 15, 20);
        doc.setFontSize(10);
        doc.text(`Data: ${dateText}`, 15, 30);
        doc.text(`Filtro: ${statusFilter === 'all' ? 'Todos' : statusFilter === 'active' ? 'Ativos' : 'Inativos'}`, 15, 35);
        doc.text(`Total: ${filteredProducts.length}`, 150, 30);
        doc.line(15, 38, 195, 38);

        const tableData = [...filteredProducts].map(p => [
            p.sku,
            p.description,
            p.model || '-',
            p.ean || '-',
            p.status === 'active' ? 'Ativo' : 'Inativo'
        ]);

        autoTable(doc, {
            startY: 43,
            head: [['SKU', 'Descrição', 'Modelo', 'EAN', 'Status']],
            body: tableData,
            headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [241, 245, 249] },
        });

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `produtos_${new Date().getTime()}.pdf`, { type: 'application/pdf' });

        const shareText = `📊 *Catálogo de Produtos*\n📅 *Data:* ${dateText}\n📝 *Itens:* ${filteredProducts.length}`;

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    files: [pdfFile],
                    title: `Catálogo de Produtos`,
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
                    title: `Catálogo de Produtos`,
                    text: shareText
                });
            } catch (error) {
                console.error('Erro ao compartilhar texto:', error);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            alert('Resumo copiado para a área de transferência!');
        }
    };

    const handlePrintLabel = (product: Product) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Etiqueta - ${product.sku}</title>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                    <style>
                        @page { 
                            size: 150mm 100mm; 
                            margin: 0; 
                        }
                        body { 
                            font-family: Arial, sans-serif; 
                            margin: 0; 
                            padding: 10mm;
                            width: 150mm;
                            height: 100mm;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            box-sizing: border-box;
                            position: relative;
                        }
                        .top-section {
                            display: flex;
                            align-items: baseline;
                            width: 100%;
                            position: relative;
                            margin-top: 15mm;
                        }
                        .sku-container {
                            width: 55%;
                            display: flex;
                            align-items: baseline;
                        }
                        .sku {
                            font-weight: 900;
                            line-height: 0.75;
                            letter-spacing: -0.03em;
                            color: #000;
                            white-space: nowrap;
                            transform-origin: left bottom;
                        }
                        .line-container {
                            width: 45%;
                            padding-left: 15px;
                            box-sizing: border-box;
                        }
                        .line {
                            width: 100%;
                            border-bottom: 5px solid black;
                        }
                        .description {
                            font-weight: 900;
                            text-align: left;
                            line-height: 1.1;
                            width: 100%;
                            white-space: nowrap;
                            overflow: hidden;
                            color: #000;
                            margin-top: 25px;
                        }
                        .qrcode-container {
                            position: absolute;
                            top: 5mm;
                            right: 5mm;
                        }
                        @media print {
                            * {
                                -webkit-print-color-adjust: exact !important;
                                print-color-adjust: exact !important;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="qrcode-container" id="qrcode"></div>
                    <div class="top-section">
                        <div class="sku-container" id="sku-container">
                            <span class="sku" id="sku">${product.sku}</span>
                        </div>
                        <div class="line-container">
                            <div class="line"></div>
                        </div>
                    </div>
                    <div class="description" id="desc">${product.description}</div>
                    <script>
                        // Generate QR Code
                        new QRCode(document.getElementById('qrcode'), {
                            text: "${product.sku}",
                            width: 90,
                            height: 90,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.M
                        });

                        // Auto-scale SKU to fit 55% container exactly
                        const sku = document.getElementById('sku');
                        const skuContainer = document.getElementById('sku-container');
                        let skuSize = 10;
                        sku.style.fontSize = skuSize + 'px';
                        while(sku.offsetWidth < skuContainer.clientWidth && skuSize < 800) {
                            skuSize += 2;
                            sku.style.fontSize = skuSize + 'px';
                        }
                        sku.style.fontSize = (skuSize - 2) + 'px';

                        // Auto-scale description to fit 100% width
                        const desc = document.getElementById('desc');
                        let descSize = 45;
                        desc.style.fontSize = descSize + 'px';
                        while(desc.scrollWidth > desc.clientWidth && descSize > 10) {
                            descSize--;
                            desc.style.fontSize = descSize + 'px';
                        }
                        
                        // Wait slightly longer for QR code to render before printing
                        setTimeout(() => window.print(), 500);
                    </script>
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
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Produtos</h1>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie seu catálogo de itens</p>
                    <div className="flex gap-4 mt-2 text-sm font-bold uppercase tracking-wider">
                        <span className="text-slate-500">Total: <span className="text-slate-700 dark:text-slate-300">{products.length}</span></span>
                        <span className="text-slate-500">Ativos: <span className="text-emerald-500">{products.filter((p: Product) => p.status === 'active').length}</span></span>
                        <span className="text-slate-500">Inativos: <span className="text-red-500">{products.filter((p: Product) => p.status === 'inactive').length}</span></span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 font-bold"
                    >
                        <Plus size={20} />
                        <span>Novo Produto</span>
                    </button>
                    {/* Botão de Impressão (Desktop) */}
                    <button
                        onClick={() => {
                            const printWindow = window.open('', '_blank');
                            if (!printWindow) return;
                            const html = `
                                <html>
                                    <head>
                                        <title>Relatório de Produtos</title>
                                        <style>
                                            body { font-family: sans-serif; padding: 20px; }
                                            table { width: 100%; border-collapse: collapse; margin-top: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                            th { background-color: #e2e8f0 !important; }
                                            tbody tr:nth-child(even) { background-color: #f2f2f2 !important; }
                                            h1 { color: #333; }
                                            .status { font-size: 0.8em; font-weight: bold; padding: 4px 8px; border-radius: 4px; }
                                            .active { background-color: #dcfce7; color: #166534; }
                                            .inactive { background-color: #fee2e2; color: #991b1b; }
                                        </style>
                                    </head>
                                    <body>
                                        <h1>Relatório de Produtos - ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</h1>
                                        <p>Data: ${new Date().toLocaleString('pt-BR')}</p>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>SKU</th>
                                                    <th>Descrição</th>
                                                    <th>Modelo</th>
                                                    <th>EAN</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${filteredProducts.map((p: Product) => `
                                                    <tr>
                                                        <td>${p.sku}</td>
                                                        <td>${p.description}</td>
                                                        <td>${p.model || '-'}</td>
                                                        <td>${p.ean || '-'}</td>
                                                        <td>
                                                            <span class="status ${p.status}">
                                                                ${p.status === 'active' ? 'Ativo' : 'Inativo'}
                                                            </span>
                                                        </td>
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
                        }}
                        className="hidden md:flex p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl transition-all border border-slate-300 dark:border-slate-700 shadow-lg"
                        title="Imprimir"
                    >
                        <Printer size={20} />
                    </button>
                    {/* Botão de Compartilhamento (Mobile) */}
                    <button
                        onClick={handleShare}
                        className="md:hidden p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 active:scale-95 transition-all"
                        title="Compartilhar PDF"
                    >
                        <Share2 size={20} />
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por SKU, EAN ou descrição..."
                            className="w-full pl-10 pr-10 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-white transition-colors p-1"
                                title="Limpar busca"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 w-full md:w-auto">
                        <Filter size={16} className="ml-2 text-slate-500" />
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-white'}`}
                        >
                            Ativos
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'inactive' ? 'bg-red-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-white'}`}
                        >
                            Inativos
                        </button>
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:text-white'}`}
                        >
                            Todos
                        </button>
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm">
                                <th
                                    className="px-6 py-4 font-semibold text-nowrap cursor-pointer transition-colors group"
                                    onClick={() => handleSort('sku')}
                                >
                                    <div className="flex items-center gap-2">
                                        SKU
                                        {getSortIcon('sku')}
                                    </div>
                                </th>
                                <th
                                    className="px-6 py-4 font-semibold w-full cursor-pointer transition-colors group"
                                    onClick={() => handleSort('description')}
                                >
                                    <div className="flex items-center gap-2">
                                        Descrição
                                        {getSortIcon('description')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-nowrap">Modelo</th>
                                <th className="px-6 py-4 font-semibold text-nowrap">EAN</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {filteredProducts.map((product: Product) => (
                                <tr key={product.id} className="hover:bg-slate-100/30 dark:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-blue-400 text-nowrap text-sm md:text-base">{product.sku}</td>
                                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 min-w-[150px] text-sm md:text-base">{product.description}</td>
                                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 text-nowrap text-xs">
                                        <div className="flex items-center gap-2">
                                            <span>{product.model || '-'}</span>
                                            {product.model && (
                                                <button onClick={() => handleCopy(product.model!, 'Modelo')} className="text-slate-400 hover:text-blue-500 transition-colors" title="Copiar Modelo">
                                                    <Copy size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400 text-nowrap text-xs">
                                        <div className="flex items-center gap-2">
                                            <span>{product.ean || '-'}</span>
                                            {product.ean && (
                                                <button onClick={() => handleCopy(product.ean!, 'EAN')} className="text-slate-400 hover:text-blue-500 transition-colors" title="Copiar EAN">
                                                    <Copy size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 text-nowrap">
                                            <button
                                                onClick={() => handlePrintLabel(product)}
                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all"
                                                title="Imprimir Etiqueta Zebra"
                                            >
                                                <Printer size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCurrentProduct(product);
                                                    setSku(product.sku);
                                                    setEan(product.ean || '');
                                                    setDescription(product.description);
                                                    setModel(product.model || '');
                                                    setStatus(product.status);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCurrentProduct(product);
                                                    setIsHistoryOpen(true);
                                                }}
                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all"
                                            >
                                                <History size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Layout Mobile (Cards) */}
                <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredProducts.map((product: Product) => (
                        <div key={product.id} className="p-4 space-y-4 hover:bg-slate-100/20 dark:bg-slate-800/20 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-mono text-blue-400 font-bold">{product.sku}</p>
                                    <div className="flex flex-col gap-1">
                                        {product.model && (
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                                                <span>Mod: {product.model}</span>
                                                <button onClick={() => handleCopy(product.model!, 'Modelo')} className="text-slate-400 hover:text-blue-500"><Copy size={12} /></button>
                                            </div>
                                        )}
                                        {product.ean && (
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-mono">
                                                <span>EAN: {product.ean}</span>
                                                <button onClick={() => handleCopy(product.ean!, 'EAN')} className="text-slate-400 hover:text-blue-500"><Copy size={12} /></button>
                                            </div>
                                        )}
                                        {!product.model && !product.ean && (
                                            <p className="text-slate-500 text-xs font-mono">Sem Modelo nem EAN</p>
                                        )}
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${product.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>

                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">{product.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handlePrintLabel(product)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all text-nowrap"
                                        title="Imprimir Etiqueta Zebra"
                                    >
                                        <Printer size={14} />
                                        Etiqueta
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentProduct(product);
                                            setSku(product.sku);
                                            setEan(product.ean || '');
                                            setDescription(product.description);
                                            setModel(product.model || '');
                                            setStatus(product.status);
                                            setIsModalOpen(true);
                                        }}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all text-nowrap"
                                    >
                                        <Edit2 size={14} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentProduct(product);
                                            setIsHistoryOpen(true);
                                        }}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all text-nowrap"
                                    >
                                        <History size={14} />
                                        Histórico
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProducts.length === 0 && (
                        <div className="p-12 text-center text-slate-500 italic text-sm">
                            Nenhum produto encontrado.
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{currentProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={resetForm} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm font-medium">
                                    {error}
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">SKU</label>
                                <input
                                    required
                                    autoFocus
                                    value={sku}
                                    onChange={(e) => setSku(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ex: PROD-123"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">EAN (Código de Barras)</label>
                                <div className="relative">
                                    <input
                                        value={ean}
                                        onChange={(e) => setEan(e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Ex: 7891234567890"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setActiveScanner('ean')}
                                            className="text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm"
                                            title="Escanear EAN"
                                        >
                                            <ScanBarcode size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Descrição</label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 transition-all"
                                    placeholder="Descrição detalhada do produto..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Modelo</label>
                                <div className="relative">
                                    <input
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Ex: iPhone 13 Pro"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                                        <button
                                            type="button"
                                            onClick={() => setActiveScanner('model')}
                                            className="text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm"
                                            title="Escanear Modelo"
                                        >
                                            <ScanBarcode size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Inativo</option>
                                </select>
                            </div>
                            <div className="pt-4 flex flex-col md:flex-row gap-3">
                                <button type="button" onClick={resetForm} className="order-2 md:order-1 flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="order-1 md:order-2 flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95">
                                    {currentProduct ? 'Salvar Alterações' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div >
                </div >
            )}

            <ScannerModal
                isOpen={!!activeScanner}
                onClose={() => setActiveScanner(null)}
                onScan={handleScan}
            />

            {/* Modal Histórico */}
            {
                isHistoryOpen && currentProduct && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-100/50 dark:bg-slate-800/50">
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Histórico: {currentProduct.sku}</h2>
                                <button onClick={() => setIsHistoryOpen(false)} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                                {currentProduct.history?.slice().reverse().map((entry, idx) => (
                                    <div key={idx} className="border-l-2 border-blue-500 pl-4 py-1">
                                        <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleString('pt-BR')}</p>
                                        <p className="text-slate-900 dark:text-white font-medium">{entry.action}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{entry.details}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default Produtos;
