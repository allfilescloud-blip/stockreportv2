import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

export interface ReportItem {
    productId: string;
    sku: string;
    description: string;
    currentCount: number;
    previousCount?: number;
}

export interface Report {
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
    notes?: string;
    sequentialId?: number;
    imageUrls?: string[];
}

const getBase64FromUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const generatePdfBlob = async (report: Report, sequentialId: number, includeImages: boolean = true): Promise<Blob> => {
    const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');

    let defaultTitle = `Relatório #${sequentialId}`;
    if (report.type === 'inventory') defaultTitle = `Inventário #${sequentialId}`;
    if (report.type === 'delivery') defaultTitle = `Entrega #${sequentialId}`;
    if (report.type === 'tested') defaultTitle = `Testados #${sequentialId}`;

    const reportTitle = report.title || defaultTitle;

    let tableHeaders = '';
    if (report.type === 'inventory') {
        tableHeaders = `<th>SKU</th><th>Descrição</th><th>Anterior</th><th>Atual</th><th>Diferença</th>`;
    } else if (report.type === 'tested') {
        tableHeaders = `<th>SKU</th><th>Descrição</th><th>Quantidade Restante</th><th>Quantidade Testada</th>`;
    } else if (report.type === 'delivery') {
        tableHeaders = `<th>SKU</th><th>Descrição</th><th>Quantidade (Recebida)</th>`;
    }

    const sortedItems = [...report.items].sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));

    let tableBody = '';
    sortedItems.forEach(item => {
        if (report.type === 'inventory') {
            const prev = item.previousCount || 0;
            const diff = item.currentCount - prev;
            const diffClass = diff > 0 ? 'diff-pos' : diff < 0 ? 'diff-neg' : '';
            tableBody += `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.description}</td>
                    <td>${prev}</td>
                    <td>${item.currentCount}</td>
                    <td class="${diffClass}">${diff > 0 ? '+' : ''}${diff}</td>
                </tr>
            `;
        } else if (report.type === 'tested') {
            const prev = item.previousCount || 0;
            tableBody += `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.description}</td>
                    <td>${prev}</td>
                    <td>${item.currentCount}</td>
                </tr>
            `;
        } else if (report.type === 'delivery') {
            tableBody += `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.description}</td>
                    <td>${item.currentCount}</td>
                </tr>
            `;
        }
    });

    const notesHtml = (report.type === 'delivery' && report.notes)
        ? `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dotted #ccc;">
               <strong>Observações:</strong> ${report.notes}
           </div>`
        : '';

    const locationHtml = (report.type === 'inventory' && report.locationName)
        ? `<p style="margin: 5px 0 0 0; color: #555;"><strong>Local:</strong> ${report.locationName}</p>`
        : '';

    let imagesHtml = '';
    if (includeImages && report.type === 'delivery' && report.imageUrls && report.imageUrls.length > 0) {
        imagesHtml = `<div style="margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; page-break-before: always;">
               <h3 style="margin-bottom: 15px;">Imagens Anexadas</h3>
               <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">`;

        for (const url of report.imageUrls) {
            try {
                const base64 = await getBase64FromUrl(url);
                imagesHtml += `<img src="${base64}" style="width: 100%; height: 250px; object-fit: contain; border-radius: 8px; border: 1px solid #ddd;" />`;
            } catch (e) {
                console.error('Erro ao converter imagem:', e);
            }
        }
        imagesHtml += `</div></div>`;
    }

    const htmlString = `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 800px; margin: 0 auto;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px;">
                <div>
                    <h1 style="margin-bottom: 5px;">${reportTitle}</h1>
                    ${locationHtml}
                    <p style="margin-top: 5px;">Data: ${dateText}</p>
                </div>
                <div style="text-align: right">
                    <p>Total de Itens: ${report.totalItems}</p>
                </div>
            </div>
            ${notesHtml}
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr>${tableHeaders.replace(/<th>/g, '<th style="background-color: #e2e8f0; border: 1px solid #ddd; padding: 12px; text-align: left;">')}</tr>
                </thead>
                <tbody>
                    ${tableBody.replace(/<td>/g, '<td style="border: 1px solid #ddd; padding: 12px; text-align: left;">').replace(/<td class="diff-pos">/g, '<td style="border: 1px solid #ddd; padding: 12px; text-align: left; color: green; font-weight: bold;">').replace(/<td class="diff-neg">/g, '<td style="border: 1px solid #ddd; padding: 12px; text-align: left; color: red; font-weight: bold;">')}
                </tbody>
            </table>
            ${imagesHtml}
        </div>
    `;

    const element = document.createElement('div');
    element.innerHTML = htmlString;
    document.body.appendChild(element); // Necessário para imagens renderizarem temporariamente no html2pdf

    const opt = {
        margin:       10,
        filename:     `${reportTitle}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    try {
        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        document.body.removeChild(element);
        return pdfBlob;
    } catch (e) {
        document.body.removeChild(element);
        throw e;
    }
};

export const shareReport = async (report: Report, sequentialId: number, includeImages: boolean = true) => {
    const loadingToast = toast.loading('Gerando PDF para compartilhar...');
    
    try {
        let defaultTitle = `Relatório #${sequentialId}`;
        if (report.type === 'inventory') defaultTitle = `Inventário #${sequentialId}`;
        if (report.type === 'delivery') defaultTitle = `Entrega #${sequentialId}`;
        if (report.type === 'tested') defaultTitle = `Testados #${sequentialId}`;

        const reportTitle = report.title || defaultTitle;
        const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...';

        // Sanitize the title to be used as a filename (remove invalid characters)
        const sanitizedTitle = reportTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

        const pdfBlob = await generatePdfBlob(report, sequentialId, includeImages);
        const pdfFile = new File([pdfBlob], `${sanitizedTitle}.pdf`, { type: 'application/pdf' });

        const shareText = `📊 *${reportTitle}*\n📅 *Data:* ${dateText}\n📝 *Itens:* ${report.totalItems}`;

        toast.dismiss(loadingToast);

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                await navigator.share({
                    files: [pdfFile],
                    title: reportTitle,
                    text: shareText
                });
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error("Erro na API de Web Share (Native):", error);
                    toast.error(
                        includeImages 
                            ? 'O arquivo gerado ficou muito grande para este aparelho compartilhar. Tente enviar selecionando "Sem imagens"!' 
                            : 'Erro ao compartilhar com a aplicação escolhida. Tente copiar o link ou enviar novamente.',
                        { duration: 6000 }
                    );
                }
            }
        } else if (navigator.share) {
            try {
                await navigator.share({
                    title: reportTitle,
                    text: shareText
                });
            } catch (error: any) {
                if (error.name !== 'AbortError') {
                    console.error("Erro no Share de Texto:", error);
                    toast.error('Erro ao compartilhar texto. O dispositivo pode não suportar ou restringiu o app.');
                }
            }
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareText);
            toast.success('Informações copiadas para a área de transferência!');
        } else {
            // Em conexões não-HTTPS (como acesso via IP local), navigator.clipboard pode ser undefined.
            // Usamos a técnica de fallback com textarea.
            const textArea = document.createElement("textarea");
            textArea.value = shareText;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    toast.success('Informações copiadas para a área de transferência!');
                } else {
                    toast.error('Seu navegador bloqueou a cópia do texto.');
                }
            } catch (err) {
                toast.error('Erro ao copiar texto no seu navegador.');
            }
            document.body.removeChild(textArea);
        }
    } catch (error) {
        toast.dismiss(loadingToast);
        toast.error('O arquivo gerado ficou complexo demais e não pôde ser gerado. Tente remover algumas imagens ou enviar "Sem imagens".', { duration: 6000 });
        console.error("Erro Crítico ao gerar/compartilhar o relatório:", error);
    }
};


export const printWebReport = (report: Report, sequentialId: number, includeImages: boolean = true) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let defaultTitle = `Relatório #${sequentialId}`;
    if (report.type === 'inventory') defaultTitle = `Inventário #${sequentialId}`;
    if (report.type === 'delivery') defaultTitle = `Entrega #${sequentialId}`;
    if (report.type === 'tested') defaultTitle = `Testados #${sequentialId}`;

    const reportTitle = report.title || defaultTitle;
    const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR');

    let tableHeaders = '';
    if (report.type === 'inventory') {
        tableHeaders = `<th>SKU</th><th>Descrição</th><th>Anterior</th><th>Atual</th><th>Diferença</th>`;
    } else if (report.type === 'tested') {
        tableHeaders = `<th>SKU</th><th>Descrição</th><th>Quantidade Restante</th><th>Quantidade Testada</th>`;
    } else if (report.type === 'delivery') {
        tableHeaders = `<th>SKU</th><th>Descrição</th><th>Quantidade (Recebida)</th>`;
    }

    const sortedItems = [...report.items].sort((a, b) => a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' }));

    let tableBody = '';
    sortedItems.forEach(item => {
        if (report.type === 'inventory') {
            const prev = item.previousCount || 0;
            const diff = item.currentCount - prev;
            const diffClass = diff > 0 ? 'diff-pos' : diff < 0 ? 'diff-neg' : '';
            tableBody += `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.description}</td>
                    <td>${prev}</td>
                    <td>${item.currentCount}</td>
                    <td class="${diffClass}">${diff > 0 ? '+' : ''}${diff}</td>
                </tr>
            `;
        } else if (report.type === 'tested') {
            const prev = item.previousCount || 0;
            tableBody += `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.description}</td>
                    <td>${prev}</td>
                    <td>${item.currentCount}</td>
                </tr>
            `;
        } else if (report.type === 'delivery') {
            tableBody += `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.description}</td>
                    <td>${item.currentCount}</td>
                </tr>
            `;
        }
    });

    const notesHtml = (report.type === 'delivery' && report.notes)
        ? `<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dotted #ccc;">
               <strong>Observações:</strong> ${report.notes}
           </div>`
        : '';

    const locationHtml = (report.type === 'inventory' && report.locationName)
        ? `<p style="margin: 5px 0 0 0; color: #555;"><strong>Local:</strong> ${report.locationName}</p>`
        : '';

    const imagesHtml = (includeImages && report.type === 'delivery' && report.imageUrls && report.imageUrls.length > 0)
        ? `<div style="margin-top: 30px; border-top: 2px solid #333; padding-top: 20px;">
               <h3 style="margin-bottom: 15px;">Imagens Anexadas</h3>
               <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                   ${report.imageUrls.map(url => `<img src="${url}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />`).join('')}
               </div>
           </div>`
        : '';

    const html = `
        <html>
            <head>
                <title>${reportTitle}</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; color: #333; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                    th { background-color: #e2e8f0 !important; }
                    tbody tr:nth-child(even) { background-color: #f2f2f2 !important; }
                    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    .diff-pos { color: green; font-weight: bold; }
                    .diff-neg { color: red; font-weight: bold; }
                    h1 { margin-bottom: 5px; }
                    @media print {
                        img { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${reportTitle}</h1>
                        ${locationHtml}
                        <p style="margin-top: 5px;">Data: ${dateText}</p>
                    </div>
                    <div style="text-align: right">
                        <p>Total de Itens: ${report.totalItems}</p>
                    </div>
                </div>
                ${notesHtml}
                <table>
                    <thead>
                        <tr>${tableHeaders}</tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                </table>
                ${imagesHtml}
            </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
    }, 250);
};
