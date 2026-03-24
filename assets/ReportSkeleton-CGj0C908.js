import{c as D,z as $,h as L,r as S,j as s,X as U,q as P,l as F,o as z,w as E,i as _,f as B,k as I}from"./index-BUxR_9g4.js";import{E as M,d as O,a as W,b as H,c as K}from"./ScannerModal-DMhd0st8.js";const Q=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],ee=D("calculator",Q);const Y=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["rect",{x:"9",y:"9",width:"6",height:"6",rx:"1",key:"1ssd4o"}]],G=D("circle-stop",Y);const X=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],te=D("triangle-alert",X),J=async e=>{const g=await(await fetch(e)).blob();return new Promise((f,c)=>{const l=new FileReader;l.onloadend=()=>f(l.result),l.onerror=c,l.readAsDataURL(g)})},V=async(e,o,g=!0)=>{const f=e.createdAt?.toDate?e.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR");let c=`Relatório #${o}`;e.type==="inventory"&&(c=`Inventário #${o}`),e.type==="delivery"&&(c=`Entrega #${o}`),e.type==="tested"&&(c=`Testados #${o}`);const l=e.title||c,m=[...e.items].sort((t,r)=>t.sku.localeCompare(r.sku,void 0,{numeric:!0,sensitivity:"base"})),a=new M;a.setFontSize(18),a.text(l,14,20),a.setFontSize(11),a.setTextColor(100);let u=28;e.type==="inventory"&&e.locationName&&(a.text(`Local: ${e.locationName}`,14,u),u+=6),a.text(`Data: ${f}`,14,u),a.text(`Total de Itens: ${e.totalItems}`,140,u),u+=10,e.notes&&(a.text(`Observações: ${e.notes}`,14,u),u+=10);let h=[[]],d=[];if(e.type==="inventory"?(h[0]=["SKU","Descrição","Anterior","Atual","Diferença"],d=m.map(t=>{const r=t.previousCount||0,p=t.currentCount-r;return[t.sku,t.description,r.toString(),t.currentCount.toString(),p>0?`+${p}`:p.toString()]})):e.type==="tested"?(h[0]=["SKU","Descrição","Qtd Restante","Qtd Testada"],d=m.map(t=>[t.sku,t.description,(t.previousCount||0).toString(),t.currentCount.toString()])):e.type==="delivery"&&(h[0]=["SKU","Descrição","Qtd (Recebida)"],d=m.map(t=>[t.sku,t.description,t.currentCount.toString()])),O(a,{startY:u,head:h,body:d,theme:"grid",headStyles:{fillColor:[226,232,240],textColor:[51,51,51],fontStyle:"bold"},didParseCell:function(t){if(e.type==="inventory"&&t.section==="body"&&t.column.index===4){const r=t.cell.raw;r.startsWith("+")?(t.cell.styles.textColor=[0,128,0],t.cell.styles.fontStyle="bold"):r.startsWith("-")&&(t.cell.styles.textColor=[255,0,0],t.cell.styles.fontStyle="bold")}}}),g&&e.imageUrls&&e.imageUrls.length>0){let t=a.lastAutoTable.finalY+15;const r=a.internal.pageSize.width,p=a.internal.pageSize.height;t>p-20&&(a.addPage(),t=20),a.setFontSize(14),a.setTextColor(51,51,51),a.text("Imagens Anexadas",14,t),t+=10;const n=14,b=(r-n*3)/2,x=85;let y=0;for(const N of e.imageUrls)try{const C=await J(N),w=new Image;w.src=C,await new Promise((v,A)=>{w.onload=v,w.onerror=A});const T=w.width/w.height;let j=b,k=j/T;k>x&&(k=x,j=k*T),t+k>p-15&&(a.addPage(),t=20,y=0);const R=(y===0?n:n*2+b)+(b-j)/2;a.addImage(C,"JPEG",R,t,j,k),y++,y>1&&(y=0,t+=k+10)}catch(C){console.error("Erro ao processar imagem para o PDF nativo:",C)}}return a.output("blob")},ae=async(e,o,g=!0,f=!1)=>{const c=$.loading("Gerando PDF para compartilhar...");try{let l=`Relatório #${o}`;e.type==="inventory"&&(l=`Inventário #${o}`),e.type==="delivery"&&(l=`Entrega #${o}`),e.type==="tested"&&(l=`Testados #${o}`);const m=e.title||l,a=m.replace(/[^a-z0-9]/gi,"_").replace(/_+/g,"_").replace(/^_|_$/g,""),u=await V(e,o,g),h=new File([u],`${a}.pdf`,{type:"application/pdf",lastModified:new Date().getTime()});$.dismiss(c);let d=!1;if(!f&&navigator.share)try{await navigator.share({files:[h]}),d=!0}catch(t){t.name!=="AbortError"?console.error("Erro na API de Web Share (Native):",t):d=!0}if(!d){try{if("showSaveFilePicker"in window){const r=await(await window.showSaveFilePicker({suggestedName:`${a}.pdf`,types:[{description:"Documento PDF",accept:{"application/pdf":[".pdf"]}}]})).createWritable();await r.write(u),await r.close(),$.success("PDF salvo com sucesso na pasta selecionada!")}else{$.success("Abrindo PDF...",{icon:"📄"});const t=URL.createObjectURL(u);window.open(t,"_blank"),setTimeout(()=>URL.revokeObjectURL(t),6e4)}}catch(t){if(t.name!=="AbortError"){console.error("Erro ao salvar arquivo:",t),$.success("Abrindo PDF...",{icon:"📄"});const r=URL.createObjectURL(u);window.open(r,"_blank"),setTimeout(()=>URL.revokeObjectURL(r),6e4)}}try{const t=e.createdAt?.toDate?e.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR"),r=`📊 *${m}*
📅 *Data:* ${t}
📝 *Itens:* ${e.totalItems}`;navigator.clipboard&&(await navigator.clipboard.writeText(r),$.success("Resumo copiado! Se desejar, cole-o no corpo da mensagem ao enviar."))}catch{}}}catch(l){$.dismiss(c),$.error('O arquivo gerado ficou complexo demais e não pôde ser gerado. Tente remover algumas imagens ou enviar "Sem imagens".',{duration:6e3}),console.error("Erro Crítico ao gerar/compartilhar o relatório:",l)}},se=(e,o,g=!0)=>{const f=window.open("","_blank");if(!f)return;let c=`Relatório #${o}`;e.type==="inventory"&&(c=`Inventário #${o}`),e.type==="delivery"&&(c=`Entrega #${o}`),e.type==="tested"&&(c=`Testados #${o}`);const l=e.title||c,m=e.createdAt?.toDate?e.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR");let a="";e.type==="inventory"?a="<th>SKU</th><th>Descrição</th><th>Anterior</th><th>Atual</th><th>Diferença</th>":e.type==="tested"?a="<th>SKU</th><th>Descrição</th><th>Quantidade Restante</th><th>Quantidade Testada</th>":e.type==="delivery"&&(a="<th>SKU</th><th>Descrição</th><th>Quantidade (Recebida)</th>");const u=[...e.items].sort((n,b)=>n.sku.localeCompare(b.sku,void 0,{numeric:!0,sensitivity:"base"}));let h="";u.forEach(n=>{if(e.type==="inventory"){const b=n.previousCount||0,x=n.currentCount-b,y=x>0?"diff-pos":x<0?"diff-neg":"";h+=`
                <tr>
                    <td>${n.sku}</td>
                    <td>${n.description}</td>
                    <td>${b}</td>
                    <td>${n.currentCount}</td>
                    <td class="${y}">${x>0?"+":""}${x}</td>
                </tr>
            `}else if(e.type==="tested"){const b=n.previousCount||0;h+=`
                <tr>
                    <td>${n.sku}</td>
                    <td>${n.description}</td>
                    <td>${b}</td>
                    <td>${n.currentCount}</td>
                </tr>
            `}else e.type==="delivery"&&(h+=`
                <tr>
                    <td>${n.sku}</td>
                    <td>${n.description}</td>
                    <td>${n.currentCount}</td>
                </tr>
            `)});const d=e.type==="delivery"&&e.notes?`<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dotted #ccc;">
               <strong>Observações:</strong> ${e.notes}
           </div>`:"",t=e.type==="inventory"&&e.locationName?`<p style="margin: 5px 0 0 0; color: #555;"><strong>Local:</strong> ${e.locationName}</p>`:"",r=g&&e.type==="delivery"&&e.imageUrls&&e.imageUrls.length>0?`<div style="margin-top: 30px; border-top: 2px solid #333; padding-top: 20px;">
               <h3 style="margin-bottom: 15px;">Imagens Anexadas</h3>
               <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                   ${e.imageUrls.map(n=>`<img src="${n}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />`).join("")}
               </div>
           </div>`:"",p=`
        <html>
            <head>
                <title>${l}</title>
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
                        <h1>${l}</h1>
                        ${t}
                        <p style="margin-top: 5px;">Data: ${m}</p>
                    </div>
                    <div style="text-align: right">
                        <p>Total de Itens: ${e.totalItems}</p>
                    </div>
                </div>
                ${d}
                <table>
                    <thead>
                        <tr>${a}</tr>
                    </thead>
                    <tbody>
                        ${h}
                    </tbody>
                </table>
                ${r}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 250);
                    };
                <\/script>
            </body>
        </html>
    `;f.document.write(p),f.document.close(),f.focus()},oe=({selectedProduct:e,onSelectProduct:o,themeColor:g="emerald",inputRef:f,searchTerm:c,onSearchChange:l})=>{const{products:m}=L(),[a,u]=S.useState(""),[h,d]=S.useState([]),[t,r]=S.useState(!1),p=S.useRef(null),n=f||p,b=c!==void 0?c:a,x=i=>{l?l(i):u(i)},y={emerald:"focus:ring-emerald-500",purple:"focus:ring-purple-500",blue:"focus:ring-blue-500"}[g],N={emerald:"text-emerald-400",purple:"text-purple-400",blue:"text-blue-400"}[g],C={emerald:"hover:text-emerald-500 dark:hover:text-emerald-400",purple:"hover:text-purple-500 dark:hover:text-purple-400",blue:"hover:text-blue-500 dark:hover:text-blue-400"}[g],w=i=>{if(x(i),i.length<1){d([]);return}const R=m.filter(v=>v.status!=="inactive"&&(v.sku.toLowerCase().includes(i.toLowerCase())||v.description.toLowerCase().includes(i.toLowerCase()))).slice(0,10);d(R)},T=i=>{const R=m.find(v=>v.sku.toLowerCase()===i.toLowerCase()||v.ean&&v.ean.toLowerCase()===i.toLowerCase());R?(o(R),x(""),d([])):w(i)},j=()=>{o(null),x(""),d([]),n.current?.focus()},k=i=>{o(i),d([])};return s.jsxs("div",{className:"relative w-full",children:[s.jsxs("div",{className:"relative",children:[s.jsx(W,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-500",size:18}),s.jsx("input",{type:"text",ref:n,autoFocus:!0,placeholder:"Inserir SKU ou Descrição",className:`w-full pl-10 pr-20 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 ${y} outline-none transition-all`,value:e?`${e.sku} - ${e.description}`:b,onChange:i=>!e&&w(i.target.value),readOnly:!!e}),s.jsxs("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1",children:[(e||b)&&s.jsx("button",{onClick:j,className:"text-slate-500 hover:text-slate-900 dark:text-white p-1",type:"button",children:s.jsx(U,{size:18})}),s.jsx("button",{onClick:()=>r(!t),className:`text-slate-500 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm ml-1 ${C}`,title:t?"Parar Scanner":"Ler Código",type:"button",children:t?s.jsx(G,{size:20}):s.jsx(H,{size:20})})]})]}),s.jsx(K,{isOpen:t,onClose:()=>r(!1),onScan:T}),h.length>0&&!e&&s.jsx("div",{className:"absolute z-10 w-full mt-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto border-t-0 rounded-t-none",children:h.map(i=>s.jsxs("div",{onClick:()=>k(i),className:"p-3 hover:bg-slate-200 dark:bg-slate-700 cursor-pointer border-b border-slate-300 dark:border-slate-700 last:border-0",children:[s.jsx("p",{className:`font-mono text-sm ${N}`,children:i.sku}),s.jsx("p",{className:"text-slate-700 dark:text-slate-300 text-xs truncate",children:i.description})]},i.id))})]})},re=(e,o,g,f=50)=>{const[c,l]=S.useState([]),[m,a]=S.useState(!0);return S.useEffect(()=>{a(!0);const u=P(_(B,"reports"),E("type","==",e),z("createdAt","desc"),F(f)),h=I(u,d=>{const r=d.docs.map(p=>({id:p.id,...p.data()})).filter(p=>!(o&&(p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString("en-CA"):"")!==o||g&&p.locationId!==g));l(r),a(!1)},d=>{console.error("Erro na query de reports:",d),a(!1)});return()=>h()},[e,o,g,f]),{reports:c,loading:m}},ne=()=>s.jsx("div",{className:"space-y-4 animate-in fade-in duration-300",children:[...Array(5)].map((e,o)=>s.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4",children:[s.jsxs("div",{className:"flex items-center gap-4",children:[s.jsx("div",{className:"w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"}),s.jsxs("div",{className:"space-y-2",children:[s.jsx("div",{className:"h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"}),s.jsx("div",{className:"h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"})]})]}),s.jsxs("div",{className:"flex items-center gap-6",children:[s.jsxs("div",{className:"text-right space-y-2 hidden md:block",children:[s.jsx("div",{className:"h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"}),s.jsx("div",{className:"h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"})]}),s.jsxs("div",{className:"flex items-center gap-2",children:[s.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"}),s.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"})]})]})]},o))});export{ee as C,oe as P,ne as R,te as T,se as p,ae as s,re as u};
