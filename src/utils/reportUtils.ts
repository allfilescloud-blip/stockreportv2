import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
}

export const generatePdfBlob = (report: Report, sequentialId: number): Blob => {
    const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...';

    let defaultTitle = `Relatório #${sequentialId}`;
    if (report.type === 'inventory') defaultTitle = `Inventário #${sequentialId}`;
    if (report.type === 'delivery') defaultTitle = `Entrega #${sequentialId}`;
    if (report.type === 'tested') defaultTitle = `Testados #${sequentialId}`;

    const reportTitle = report.title || defaultTitle;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text(reportTitle, 15, 20);
    doc.setFontSize(10);
    doc.text(`Data: ${dateText}`, 15, 30);
    doc.text(`Total de Itens: ${report.totalItems}`, 150, 30);

    let startYOffset = 35;

    if (report.type === 'inventory' && report.locationName) {
        doc.text(`Local: ${report.locationName}`, 15, 36);
        startYOffset = 42;
    }

    if (report.type === 'delivery' && report.notes) {
        doc.text(`Obs: ${report.notes}`, 15, startYOffset);
        doc.line(15, startYOffset + 4, 195, startYOffset + 4);
        startYOffset += 7;
    } else {
        doc.line(15, startYOffset, 195, startYOffset);
        startYOffset += 5;
    }

    const startY = startYOffset;

    const sortedItems = [...report.items].sort((a, b) =>
        a.sku.localeCompare(b.sku, undefined, { numeric: true, sensitivity: 'base' })
    );

    let headRow: string[] = [];
    let tableData: any[][] = [];

    if (report.type === 'inventory') {
        headRow = ['SKU', 'Descrição', 'Anterior', 'Atual', 'Diferença'];
        tableData = sortedItems.map(item => {
            const prev = item.previousCount || 0;
            const diff = item.currentCount - prev;
            return [
                item.sku,
                item.description,
                prev.toString(),
                item.currentCount.toString(),
                diff > 0 ? `+${diff}` : diff.toString()
            ];
        });
    } else if (report.type === 'tested') {
        headRow = ['SKU', 'Descrição', 'Quantidade Restante', 'Quantidade Testada'];
        tableData = sortedItems.map(item => [
            item.sku,
            item.description,
            (item.previousCount || 0).toString(),
            item.currentCount.toString()
        ]);
    } else if (report.type === 'delivery') {
        headRow = ['SKU', 'Descrição', 'Quantidade (Recebida)'];
        tableData = sortedItems.map(item => [
            item.sku,
            item.description,
            item.currentCount.toString()
        ]);
    }

    autoTable(doc, {
        startY: startY,
        head: [headRow],
        body: tableData,
        headStyles: { fillColor: [226, 232, 240], textColor: [51, 65, 85] },
        alternateRowStyles: { fillColor: [241, 245, 249] },
    });

    return doc.output('blob');
};

export const shareReport = async (report: Report, sequentialId: number) => {
    let defaultTitle = `Relatório #${sequentialId}`;
    if (report.type === 'inventory') defaultTitle = `Inventário #${sequentialId}`;
    if (report.type === 'delivery') defaultTitle = `Entrega #${sequentialId}`;
    if (report.type === 'tested') defaultTitle = `Testados #${sequentialId}`;

    const reportTitle = report.title || defaultTitle;
    const dateText = report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString('pt-BR') : 'Processando...';

    // Sanitize the title to be used as a filename (remove invalid characters)
    const sanitizedTitle = reportTitle.replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

    const pdfBlob = generatePdfBlob(report, sequentialId);
    const pdfFile = new File([pdfBlob], `${sanitizedTitle}.pdf`, { type: 'application/pdf' });

    const shareText = `📊 *${reportTitle}*\n📅 *Data:* ${dateText}\n📝 *Itens:* ${report.totalItems}`;

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
            await navigator.share({
                files: [pdfFile],
                title: reportTitle,
                text: shareText
            });
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                toast.error('Erro ao compartilhar relatório');
                console.error(error);
            }
        }
    } else if (navigator.share) {
        try {
            await navigator.share({
                title: reportTitle,
                text: shareText
            });
        } catch (error) {
            toast.error('Erro ao compartilhar texto');
            console.error(error);
        }
    } else {
        await navigator.clipboard.writeText(shareText);
        toast.success('Informações copiadas para a área de transferência!');
    }
};

export const printWebReport = (report: Report, sequentialId: number) => {
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
