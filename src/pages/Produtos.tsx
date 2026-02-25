import { useState, useEffect, type FormEvent } from 'react';
import {
    collection,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    updateDoc,
    doc,
    serverTimestamp,
    arrayUnion,
    getDocs,
    where
} from 'firebase/firestore';
import { db } from '../db/firebase';
import { Plus, Search, Edit2, History, X, Printer, Filter, Info, ScanBarcode, StopCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useRef } from 'react';

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
    const [products, setProducts] = useState<Product[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
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
    const [isScannerActive, setIsScannerActive] = useState(false);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'products'), orderBy('sku', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
            setProducts(prods);
        });
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError(null);

        // Check for duplicate SKU
        const skuQuery = query(collection(db, 'products'), where('sku', '==', sku));
        const skuSnapshot = await getDocs(skuQuery);

        const isDuplicate = skuSnapshot.docs.some(doc => {
            if (currentProduct) {
                return doc.id !== currentProduct.id;
            }
            return true;
        });

        if (isDuplicate) {
            setError('Este SKU já está cadastrado em outro produto.');
            return;
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

    const playSound = (type: 'success' | 'error') => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        }
    };

    const startScanner = async () => {
        if (isScannerActive) return;

        // Activate scanner state FIRST so the element is rendered in DOM
        setIsScannerActive(true);

        setTimeout(async () => {
            try {
                const elementId = "product-model-reader";
                const element = document.getElementById(elementId);

                if (!element) {
                    console.error("Elemento do scanner não encontrado no DOM");
                    setIsScannerActive(false);
                    return;
                }

                const html5QrCode = new Html5Qrcode(elementId);
                html5QrCodeRef.current = html5QrCode;

                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    let cameraId = devices[0].id;
                    const backCamera = devices.find(d =>
                        d.label.toLowerCase().includes('back') ||
                        d.label.toLowerCase().includes('traseira')
                    );
                    if (backCamera) cameraId = backCamera.id;

                    await html5QrCode.start(
                        cameraId,
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 150 },
                        },
                        (decodedText) => {
                            setModel(decodedText);
                            playSound('success');
                            stopScanner();
                        },
                        () => { }
                    );
                } else {
                    console.error("Nenhuma câmera encontrada");
                    setIsScannerActive(false);
                }
            } catch (err) {
                console.error("Erro ao iniciar scanner:", err);
                setIsScannerActive(false);
            }
        }, 150); // Small delay to ensure React finish rendering the element
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop();
                html5QrCodeRef.current.clear();
            } catch (err) {
                console.warn("Erro ao parar scanner:", err);
            } finally {
                html5QrCodeRef.current = null;
                setIsScannerActive(false);
            }
        }
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
        stopScanner();
        setSku('');
        setEan('');
        setDescription('');
        setModel('');
        setStatus('active');
        setError(null);
        setCurrentProduct(null);
        setIsModalOpen(false);
    };


    const filteredProducts = products.filter(p => {
        const matchesSearch = p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.ean?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.model?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;

        return matchesSearch && matchesStatus;
    }).sort((a, b) => {
        const valA = a[sortColumn] || '';
        const valB = b[sortColumn] || '';

        return sortDirection === 'asc'
            ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
            : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
    });

    const handlePrint = () => {
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
                                <th>EAN</th>
                                <th>Descrição</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${filteredProducts.map(p => `
                                <tr>
                                    <td>${p.sku}</td>
                                    <td>${p.ean || '-'}</td>
                                    <td>${p.description}</td>
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
    };

    return (
        <div className="p-4 md:p-8 max-w-full mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Produtos</h1>
                    <p className="text-slate-400">Gerencie seu catálogo de itens</p>
                    <div className="flex gap-4 mt-2 text-[10px] font-bold uppercase tracking-wider">
                        <span className="text-slate-500">Total: <span className="text-slate-300">{products.length}</span></span>
                        <span className="text-slate-500">Ativos: <span className="text-emerald-500">{products.filter(p => p.status === 'active').length}</span></span>
                        <span className="text-slate-500">Inativos: <span className="text-red-500">{products.filter(p => p.status === 'inactive').length}</span></span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={handlePrint}
                        className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl transition-all border border-slate-700"
                    >
                        <Printer size={20} />
                        <span>Imprimir</span>
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Plus size={20} />
                        <span>Novo Produto</span>
                    </button>
                </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por SKU, EAN ou descrição..."
                            className="w-full pl-10 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors p-1"
                                title="Limpar busca"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-lg border border-slate-700 w-full md:w-auto">
                        <Filter size={16} className="ml-2 text-slate-500" />
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setStatusFilter('active')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'active' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Ativos
                        </button>
                        <button
                            onClick={() => setStatusFilter('inactive')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${statusFilter === 'inactive' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            Inativos
                        </button>
                    </div>
                </div>

                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-800/50 text-slate-400 text-sm">
                                <th
                                    className="px-6 py-4 font-semibold text-nowrap cursor-pointer hover:bg-slate-700/50 transition-colors group"
                                    onClick={() => handleSort('sku')}
                                >
                                    <div className="flex items-center gap-2">
                                        SKU
                                        {getSortIcon('sku')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-nowrap">EAN</th>
                                <th
                                    className="px-6 py-4 font-semibold w-full cursor-pointer hover:bg-slate-700/50 transition-colors group"
                                    onClick={() => handleSort('description')}
                                >
                                    <div className="flex items-center gap-2">
                                        Descrição
                                        {getSortIcon('description')}
                                    </div>
                                </th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredProducts.map(product => (
                                <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="px-6 py-4 font-mono text-blue-400 text-nowrap text-sm">{product.sku}</td>
                                    <td className="px-6 py-4 font-mono text-slate-400 text-nowrap text-xs">{product.ean || '-'}</td>
                                    <td className="px-6 py-4 text-slate-300 min-w-[150px] text-sm md:text-base">{product.description}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${product.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2 text-nowrap">
                                            {product.model && (
                                                <div className="p-2 text-blue-400" title={`Modelo: ${product.model}`}>
                                                    <Info size={18} />
                                                </div>
                                            )}
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
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setCurrentProduct(product);
                                                    setIsHistoryOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
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
                <div className="md:hidden divide-y divide-slate-800">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="p-4 space-y-4 hover:bg-slate-800/20 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <p className="font-mono text-blue-400 font-bold">{product.sku}</p>
                                    <p className="text-slate-500 text-xs font-mono">{product.ean || 'Sem EAN'}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${product.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                                </span>
                            </div>

                            <p className="text-slate-300 text-sm leading-relaxed">{product.description}</p>

                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/50">
                                <div className="flex gap-2">
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
                                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 active:scale-95 transition-all"
                                    >
                                        <Edit2 size={14} />
                                        Editar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCurrentProduct(product);
                                            setIsHistoryOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 active:scale-95 transition-all"
                                    >
                                        <History size={14} />
                                        Histórico
                                    </button>
                                </div>
                                {product.model && (
                                    <div className="p-2 text-blue-400" title={`Modelo: ${product.model}`}>
                                        <Info size={18} />
                                    </div>
                                )}
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
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                            <h2 className="text-xl font-bold text-white">{currentProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                            <button onClick={resetForm} className="text-slate-400 hover:text-white">
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
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ex: PROD-123"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">EAN (Código de Barras)</label>
                                <input
                                    value={ean}
                                    onChange={(e) => setEan(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ex: 7891234567890"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Descrição</label>
                                <textarea
                                    required
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 transition-all"
                                    placeholder="Descrição detalhada do produto..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Modelo</label>
                                <div className="flex gap-2">
                                    <input
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        placeholder="Ex: iPhone 13 Pro"
                                    />
                                    <button
                                        type="button"
                                        onClick={isScannerActive ? stopScanner : startScanner}
                                        className={`p-3 rounded-lg border transition-all active:scale-95 ${isScannerActive
                                            ? 'bg-red-500/10 border-red-500 text-red-500 animate-pulse'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700'
                                            }`}
                                        title={isScannerActive ? "Parar Leitura" : "Escanear Modelo"}
                                    >
                                        {isScannerActive ? <StopCircle size={24} /> : <ScanBarcode size={24} />}
                                    </button>
                                </div>

                                {isScannerActive && (
                                    <div className="mt-4 overflow-hidden rounded-xl bg-black border border-blue-500/30">
                                        <div id="product-model-reader" className="w-full"></div>
                                        <div className="bg-slate-900/80 py-2 text-center text-[10px] text-blue-400 font-bold uppercase tracking-widest">
                                            Aponte para o código
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="active">Ativo</option>
                                    <option value="inactive">Inativo</option>
                                </select>
                            </div>
                            <div className="pt-4 flex flex-col md:flex-row gap-3">
                                <button type="button" onClick={resetForm} className="order-2 md:order-1 flex-1 py-3 text-slate-400 hover:text-white transition-colors">Cancelar</button>
                                <button type="submit" className="order-1 md:order-2 flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95">
                                    {currentProduct ? 'Salvar Alterações' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Histórico */}
            {isHistoryOpen && currentProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                            <h2 className="text-xl font-bold text-white">Histórico: {currentProduct.sku}</h2>
                            <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                            {currentProduct.history?.slice().reverse().map((entry, idx) => (
                                <div key={idx} className="border-l-2 border-blue-500 pl-4 py-1">
                                    <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleString('pt-BR')}</p>
                                    <p className="text-white font-medium">{entry.action}</p>
                                    <p className="text-sm text-slate-400">{entry.details}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Produtos;
