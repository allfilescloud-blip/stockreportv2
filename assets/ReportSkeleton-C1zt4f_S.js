import{c as D,z as w,h as L,r as S,j as o,X as U,q as P,l as E,o as F,w as z,i as _,f as B,k as I}from"./index-DGJb89Hr.js";import{E as M,d as O,a as W,b as H,c as K}from"./ScannerModal-8fEdy44m.js";const Q=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],ee=D("calculator",Q);const Y=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["rect",{x:"9",y:"9",width:"6",height:"6",rx:"1",key:"1ssd4o"}]],G=D("circle-stop",Y);const X=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],te=D("triangle-alert",X),J=async e=>{const h=await(await fetch(e)).blob();return new Promise((g,d)=>{const i=new FileReader;i.onloadend=()=>g(i.result),i.onerror=d,i.readAsDataURL(h)})},V=async(e,r,h=!0)=>{const g=e.createdAt?.toDate?e.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR");let d=`Relatório #${r}`;e.type==="inventory"&&(d=`Inventário #${r}`),e.type==="delivery"&&(d=`Entrega #${r}`),e.type==="tested"&&(d=`Testados #${r}`);const i=e.title||d,f=[...e.items].sort((t,m)=>t.sku.localeCompare(m.sku,void 0,{numeric:!0,sensitivity:"base"})),a=new M;a.setFontSize(18),a.text(i,14,20),a.setFontSize(11),a.setTextColor(100);let c=28;e.type==="inventory"&&e.locationName&&(a.text(`Local: ${e.locationName}`,14,c),c+=6),a.text(`Data: ${g}`,14,c),a.text(`Total de Itens: ${e.totalItems}`,140,c),c+=10,e.notes&&(a.text(`Observações: ${e.notes}`,14,c),c+=10);let u=[[]],s=[];if(e.type==="inventory"?(u[0]=["SKU","Descrição","Anterior","Atual","Diferença"],s=f.map(t=>{const m=t.previousCount||0,p=t.currentCount-m;return[t.sku,t.description,m.toString(),t.currentCount.toString(),p>0?`+${p}`:p.toString()]})):e.type==="tested"?(u[0]=["SKU","Descrição","Qtd Restante","Qtd Testada"],s=f.map(t=>[t.sku,t.description,(t.previousCount||0).toString(),t.currentCount.toString()])):e.type==="delivery"&&(u[0]=["SKU","Descrição","Qtd (Recebida)"],s=f.map(t=>[t.sku,t.description,t.currentCount.toString()])),O(a,{startY:c,head:u,body:s,theme:"grid",headStyles:{fillColor:[226,232,240],textColor:[51,51,51],fontStyle:"bold"},didParseCell:function(t){if(e.type==="inventory"&&t.section==="body"&&t.column.index===4){const m=t.cell.raw;m.startsWith("+")?(t.cell.styles.textColor=[0,128,0],t.cell.styles.fontStyle="bold"):m.startsWith("-")&&(t.cell.styles.textColor=[255,0,0],t.cell.styles.fontStyle="bold")}}}),h&&e.imageUrls&&e.imageUrls.length>0){let t=a.lastAutoTable.finalY+15;const m=a.internal.pageSize.width,p=a.internal.pageSize.height;t>p-20&&(a.addPage(),t=20),a.setFontSize(14),a.setTextColor(51,51,51),a.text("Imagens Anexadas",14,t),t+=10;const n=14,b=(m-n*3)/2,x=85;let y=0;for(const N of e.imageUrls)try{const C=await J(N),k=new Image;k.src=C,await new Promise((v,A)=>{k.onload=v,k.onerror=A});const T=k.width/k.height;let j=b,$=j/T;$>x&&($=x,j=$*T),t+$>p-15&&(a.addPage(),t=20,y=0);const R=(y===0?n:n*2+b)+(b-j)/2;a.addImage(C,"JPEG",R,t,j,$),y++,y>1&&(y=0,t+=$+10)}catch(C){console.error("Erro ao processar imagem para o PDF nativo:",C)}}return a.output("blob")},ae=async(e,r,h=!0,g=!1)=>{const d=w.loading("Gerando PDF para compartilhar...");try{let i=`Relatório #${r}`;e.type==="inventory"&&(i=`Inventário #${r}`),e.type==="delivery"&&(i=`Entrega #${r}`),e.type==="tested"&&(i=`Testados #${r}`);const f=e.title||i,a=f.replace(/[^a-z0-9]/gi,"_").replace(/_+/g,"_").replace(/^_|_$/g,""),c=await V(e,r,h),u=new File([c],`${a}.pdf`,{type:"application/pdf",lastModified:new Date().getTime()});if(w.dismiss(d),!g&&navigator.share&&navigator.canShare&&navigator.canShare({files:[u]}))try{await navigator.share({files:[u]})}catch(s){s.name!=="AbortError"&&(console.error("Erro na API de Web Share (Native):",s),w.error(h?'O arquivo gerado ficou muito grande para compartilhar. Tente selecionar "Sem imagens"!':"Erro ao compartilhar com a aplicação escolhida.",{duration:6e3}))}else{try{if("showSaveFilePicker"in window){const t=await(await window.showSaveFilePicker({suggestedName:`${a}.pdf`,types:[{description:"Documento PDF",accept:{"application/pdf":[".pdf"]}}]})).createWritable();await t.write(c),await t.close(),w.success("PDF salvo com sucesso na pasta selecionada!")}else{w.success("Abrindo PDF...",{icon:"📄"});const s=URL.createObjectURL(c);window.open(s,"_blank"),setTimeout(()=>URL.revokeObjectURL(s),6e4)}}catch(s){if(s.name!=="AbortError"){console.error("Erro ao salvar arquivo:",s),w.success("Abrindo PDF...",{icon:"📄"});const t=URL.createObjectURL(c);window.open(t,"_blank"),setTimeout(()=>URL.revokeObjectURL(t),6e4)}}try{const s=e.createdAt?.toDate?e.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR"),t=`📊 *${f}*
📅 *Data:* ${s}
📝 *Itens:* ${e.totalItems}`;navigator.clipboard&&(await navigator.clipboard.writeText(t),w.success("Resumo copiado! Se desejar, cole-o no corpo da mensagem ao enviar."))}catch{}}}catch(i){w.dismiss(d),w.error('O arquivo gerado ficou complexo demais e não pôde ser gerado. Tente remover algumas imagens ou enviar "Sem imagens".',{duration:6e3}),console.error("Erro Crítico ao gerar/compartilhar o relatório:",i)}},se=(e,r,h=!0)=>{const g=window.open("","_blank");if(!g)return;let d=`Relatório #${r}`;e.type==="inventory"&&(d=`Inventário #${r}`),e.type==="delivery"&&(d=`Entrega #${r}`),e.type==="tested"&&(d=`Testados #${r}`);const i=e.title||d,f=e.createdAt?.toDate?e.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR");let a="";e.type==="inventory"?a="<th>SKU</th><th>Descrição</th><th>Anterior</th><th>Atual</th><th>Diferença</th>":e.type==="tested"?a="<th>SKU</th><th>Descrição</th><th>Quantidade Restante</th><th>Quantidade Testada</th>":e.type==="delivery"&&(a="<th>SKU</th><th>Descrição</th><th>Quantidade (Recebida)</th>");const c=[...e.items].sort((n,b)=>n.sku.localeCompare(b.sku,void 0,{numeric:!0,sensitivity:"base"}));let u="";c.forEach(n=>{if(e.type==="inventory"){const b=n.previousCount||0,x=n.currentCount-b,y=x>0?"diff-pos":x<0?"diff-neg":"";u+=`
                <tr>
                    <td>${n.sku}</td>
                    <td>${n.description}</td>
                    <td>${b}</td>
                    <td>${n.currentCount}</td>
                    <td class="${y}">${x>0?"+":""}${x}</td>
                </tr>
            `}else if(e.type==="tested"){const b=n.previousCount||0;u+=`
                <tr>
                    <td>${n.sku}</td>
                    <td>${n.description}</td>
                    <td>${b}</td>
                    <td>${n.currentCount}</td>
                </tr>
            `}else e.type==="delivery"&&(u+=`
                <tr>
                    <td>${n.sku}</td>
                    <td>${n.description}</td>
                    <td>${n.currentCount}</td>
                </tr>
            `)});const s=e.type==="delivery"&&e.notes?`<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dotted #ccc;">
               <strong>Observações:</strong> ${e.notes}
           </div>`:"",t=e.type==="inventory"&&e.locationName?`<p style="margin: 5px 0 0 0; color: #555;"><strong>Local:</strong> ${e.locationName}</p>`:"",m=h&&e.type==="delivery"&&e.imageUrls&&e.imageUrls.length>0?`<div style="margin-top: 30px; border-top: 2px solid #333; padding-top: 20px;">
               <h3 style="margin-bottom: 15px;">Imagens Anexadas</h3>
               <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                   ${e.imageUrls.map(n=>`<img src="${n}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />`).join("")}
               </div>
           </div>`:"",p=`
        <html>
            <head>
                <title>${i}</title>
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
                        <h1>${i}</h1>
                        ${t}
                        <p style="margin-top: 5px;">Data: ${f}</p>
                    </div>
                    <div style="text-align: right">
                        <p>Total de Itens: ${e.totalItems}</p>
                    </div>
                </div>
                ${s}
                <table>
                    <thead>
                        <tr>${a}</tr>
                    </thead>
                    <tbody>
                        ${u}
                    </tbody>
                </table>
                ${m}
            </body>
        </html>
    `;g.document.write(p),g.document.close(),g.focus(),setTimeout(()=>{g.print()},250)},oe=({selectedProduct:e,onSelectProduct:r,themeColor:h="emerald",inputRef:g,searchTerm:d,onSearchChange:i})=>{const{products:f}=L(),[a,c]=S.useState(""),[u,s]=S.useState([]),[t,m]=S.useState(!1),p=S.useRef(null),n=g||p,b=d!==void 0?d:a,x=l=>{i?i(l):c(l)},y={emerald:"focus:ring-emerald-500",purple:"focus:ring-purple-500",blue:"focus:ring-blue-500"}[h],N={emerald:"text-emerald-400",purple:"text-purple-400",blue:"text-blue-400"}[h],C={emerald:"hover:text-emerald-500 dark:hover:text-emerald-400",purple:"hover:text-purple-500 dark:hover:text-purple-400",blue:"hover:text-blue-500 dark:hover:text-blue-400"}[h],k=l=>{if(x(l),l.length<1){s([]);return}const R=f.filter(v=>v.status!=="inactive"&&(v.sku.toLowerCase().includes(l.toLowerCase())||v.description.toLowerCase().includes(l.toLowerCase()))).slice(0,10);s(R)},T=l=>{const R=f.find(v=>v.sku.toLowerCase()===l.toLowerCase()||v.ean&&v.ean.toLowerCase()===l.toLowerCase());R?(r(R),x(""),s([])):k(l)},j=()=>{r(null),x(""),s([]),n.current?.focus()},$=l=>{r(l),s([])};return o.jsxs("div",{className:"relative w-full",children:[o.jsxs("div",{className:"relative",children:[o.jsx(W,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-500",size:18}),o.jsx("input",{type:"text",ref:n,autoFocus:!0,placeholder:"Inserir SKU ou Descrição",className:`w-full pl-10 pr-20 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 ${y} outline-none transition-all`,value:e?`${e.sku} - ${e.description}`:b,onChange:l=>!e&&k(l.target.value),readOnly:!!e}),o.jsxs("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1",children:[(e||b)&&o.jsx("button",{onClick:j,className:"text-slate-500 hover:text-slate-900 dark:text-white p-1",type:"button",children:o.jsx(U,{size:18})}),o.jsx("button",{onClick:()=>m(!t),className:`text-slate-500 p-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm ml-1 ${C}`,title:t?"Parar Scanner":"Ler Código",type:"button",children:t?o.jsx(G,{size:20}):o.jsx(H,{size:20})})]})]}),o.jsx(K,{isOpen:t,onClose:()=>m(!1),onScan:T}),u.length>0&&!e&&o.jsx("div",{className:"absolute z-10 w-full mt-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto border-t-0 rounded-t-none",children:u.map(l=>o.jsxs("div",{onClick:()=>$(l),className:"p-3 hover:bg-slate-200 dark:bg-slate-700 cursor-pointer border-b border-slate-300 dark:border-slate-700 last:border-0",children:[o.jsx("p",{className:`font-mono text-sm ${N}`,children:l.sku}),o.jsx("p",{className:"text-slate-700 dark:text-slate-300 text-xs truncate",children:l.description})]},l.id))})]})},re=(e,r,h,g=50)=>{const[d,i]=S.useState([]),[f,a]=S.useState(!0);return S.useEffect(()=>{a(!0);const c=P(_(B,"reports"),z("type","==",e),F("createdAt","desc"),E(g)),u=I(c,s=>{const m=s.docs.map(p=>({id:p.id,...p.data()})).filter(p=>!(r&&(p.createdAt?.toDate?p.createdAt.toDate().toLocaleDateString("en-CA"):"")!==r||h&&p.locationId!==h));i(m),a(!1)},s=>{console.error("Erro na query de reports:",s),a(!1)});return()=>u()},[e,r,h,g]),{reports:d,loading:f}},ne=()=>o.jsx("div",{className:"space-y-4 animate-in fade-in duration-300",children:[...Array(5)].map((e,r)=>o.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4",children:[o.jsxs("div",{className:"flex items-center gap-4",children:[o.jsx("div",{className:"w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"}),o.jsxs("div",{className:"space-y-2",children:[o.jsx("div",{className:"h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"}),o.jsx("div",{className:"h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"})]})]}),o.jsxs("div",{className:"flex items-center gap-6",children:[o.jsxs("div",{className:"text-right space-y-2 hidden md:block",children:[o.jsx("div",{className:"h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"}),o.jsx("div",{className:"h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"})]}),o.jsxs("div",{className:"flex items-center gap-2",children:[o.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"}),o.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"})]})]})]},r))});export{ee as C,oe as P,ne as R,te as T,se as p,ae as s,re as u};
