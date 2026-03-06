import{c as b,z as g,r as x,q as v,l as $,o as k,i as w,f as S,k as R,j as c}from"./index-DbS2aRFw.js";import{E as T,d as j}from"./ScannerModal-Dwepj9Xh.js";const C=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],M=b("calculator",C);const D=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["rect",{x:"9",y:"9",width:"6",height:"6",rx:"1",key:"1ssd4o"}]],z=b("circle-stop",D);const N=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],B=b("triangle-alert",N),A=(t,e)=>{const d=t.createdAt?.toDate?t.createdAt.toDate().toLocaleString("pt-BR"):"Processando...";let r=`Relatório #${e}`;t.type==="inventory"&&(r=`Inventário #${e}`),t.type==="delivery"&&(r=`Entrega #${e}`),t.type==="tested"&&(r=`Testados #${e}`);const y=t.title||r,i=new T;i.setFontSize(20),i.text(y,15,20),i.setFontSize(10),i.text(`Data: ${d}`,15,30),i.text(`Total de Itens: ${t.totalItems}`,150,30);let o=35;t.type==="inventory"&&t.locationName&&(i.text(`Local: ${t.locationName}`,15,36),o=42),t.type==="delivery"&&t.notes?(i.text(`Obs: ${t.notes}`,15,o),i.line(15,o+4,195,o+4),o+=7):(i.line(15,o,195,o),o+=5);const h=o,l=[...t.items].sort((s,a)=>s.sku.localeCompare(a.sku,void 0,{numeric:!0,sensitivity:"base"}));let p=[],u=[];return t.type==="inventory"?(p=["SKU","Descrição","Anterior","Atual","Diferença"],u=l.map(s=>{const a=s.previousCount||0,n=s.currentCount-a;return[s.sku,s.description,a.toString(),s.currentCount.toString(),n>0?`+${n}`:n.toString()]})):t.type==="tested"?(p=["SKU","Descrição","Quantidade Restante","Quantidade Testada"],u=l.map(s=>[s.sku,s.description,(s.previousCount||0).toString(),s.currentCount.toString()])):t.type==="delivery"&&(p=["SKU","Descrição","Quantidade (Recebida)"],u=l.map(s=>[s.sku,s.description,s.currentCount.toString()])),j(i,{startY:h,head:[p],body:u,headStyles:{fillColor:[226,232,240],textColor:[51,65,85]},alternateRowStyles:{fillColor:[241,245,249]}}),i.output("blob")},K=async(t,e)=>{let d=`Relatório #${e}`;t.type==="inventory"&&(d=`Inventário #${e}`),t.type==="delivery"&&(d=`Entrega #${e}`),t.type==="tested"&&(d=`Testados #${e}`);const r=t.title||d,y=t.createdAt?.toDate?t.createdAt.toDate().toLocaleString("pt-BR"):"Processando...",i=r.replace(/[^a-z0-9]/gi,"_").replace(/_+/g,"_").replace(/^_|_$/g,""),o=A(t,e),h=new File([o],`${i}.pdf`,{type:"application/pdf"}),l=`📊 *${r}*
📅 *Data:* ${y}
📝 *Itens:* ${t.totalItems}`;if(navigator.share&&navigator.canShare&&navigator.canShare({files:[h]}))try{await navigator.share({files:[h],title:r,text:l})}catch(p){p.name!=="AbortError"&&(g.error("Erro ao compartilhar relatório"),console.error(p))}else if(navigator.share)try{await navigator.share({title:r,text:l})}catch(p){g.error("Erro ao compartilhar texto"),console.error(p)}else await navigator.clipboard.writeText(l),g.success("Informações copiadas para a área de transferência!")},L=(t,e)=>{const d=window.open("","_blank");if(!d)return;let r=`Relatório #${e}`;t.type==="inventory"&&(r=`Inventário #${e}`),t.type==="delivery"&&(r=`Entrega #${e}`),t.type==="tested"&&(r=`Testados #${e}`);const y=t.title||r,i=t.createdAt?.toDate?t.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR");let o="";t.type==="inventory"?o="<th>SKU</th><th>Descrição</th><th>Anterior</th><th>Atual</th><th>Diferença</th>":t.type==="tested"?o="<th>SKU</th><th>Descrição</th><th>Quantidade Restante</th><th>Quantidade Testada</th>":t.type==="delivery"&&(o="<th>SKU</th><th>Descrição</th><th>Quantidade (Recebida)</th>");const h=[...t.items].sort((a,n)=>a.sku.localeCompare(n.sku,void 0,{numeric:!0,sensitivity:"base"}));let l="";h.forEach(a=>{if(t.type==="inventory"){const n=a.previousCount||0,f=a.currentCount-n,m=f>0?"diff-pos":f<0?"diff-neg":"";l+=`
                <tr>
                    <td>${a.sku}</td>
                    <td>${a.description}</td>
                    <td>${n}</td>
                    <td>${a.currentCount}</td>
                    <td class="${m}">${f>0?"+":""}${f}</td>
                </tr>
            `}else if(t.type==="tested"){const n=a.previousCount||0;l+=`
                <tr>
                    <td>${a.sku}</td>
                    <td>${a.description}</td>
                    <td>${n}</td>
                    <td>${a.currentCount}</td>
                </tr>
            `}else t.type==="delivery"&&(l+=`
                <tr>
                    <td>${a.sku}</td>
                    <td>${a.description}</td>
                    <td>${a.currentCount}</td>
                </tr>
            `)});const p=t.type==="delivery"&&t.notes?`<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dotted #ccc;">
               <strong>Observações:</strong> ${t.notes}
           </div>`:"",u=t.type==="inventory"&&t.locationName?`<p style="margin: 5px 0 0 0; color: #555;"><strong>Local:</strong> ${t.locationName}</p>`:"",s=`
        <html>
            <head>
                <title>${y}</title>
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
                        <h1>${y}</h1>
                        ${u}
                        <p style="margin-top: 5px;">Data: ${i}</p>
                    </div>
                    <div style="text-align: right">
                        <p>Total de Itens: ${t.totalItems}</p>
                    </div>
                </div>
                ${p}
                <table>
                    <thead>
                        <tr>${o}</tr>
                    </thead>
                    <tbody>
                        ${l}
                    </tbody>
                </table>
            </body>
        </html>
    `;d.document.write(s),d.document.close(),d.focus(),setTimeout(()=>{d.print()},250)},Q=(t,e,d,r=200)=>{const[y,i]=x.useState([]),[o,h]=x.useState(!0);return x.useEffect(()=>{h(!0);const l=v(w(S,"reports"),k("createdAt","desc"),$(r)),p=R(l,u=>{const a=u.docs.map(n=>({id:n.id,...n.data()})).filter(n=>!(n.type!==t||e&&(n.createdAt?.toDate?n.createdAt.toDate().toLocaleDateString("en-CA"):"")!==e||d&&n.locationId!==d));i(a),h(!1)},u=>{console.error("Erro na query de reports:",u),h(!1)});return()=>p()},[t,e,d,r]),{reports:y,loading:o}},U=()=>c.jsx("div",{className:"space-y-4 animate-in fade-in duration-300",children:[...Array(5)].map((t,e)=>c.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4",children:[c.jsxs("div",{className:"flex items-center gap-4",children:[c.jsx("div",{className:"w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"}),c.jsxs("div",{className:"space-y-2",children:[c.jsx("div",{className:"h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"}),c.jsx("div",{className:"h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"})]})]}),c.jsxs("div",{className:"flex items-center gap-6",children:[c.jsxs("div",{className:"text-right space-y-2 hidden md:block",children:[c.jsx("div",{className:"h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"}),c.jsx("div",{className:"h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"})]}),c.jsxs("div",{className:"flex items-center gap-2",children:[c.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"}),c.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"})]})]})]},e))});export{z as C,U as R,B as T,M as a,L as p,K as s,Q as u};
