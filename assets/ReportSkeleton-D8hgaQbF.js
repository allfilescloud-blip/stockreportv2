import{c as $,z as b,r as v,q as w,l as S,o as j,i as D,f as R,k as T,j as p}from"./index-BW0QVrCT.js";import{E as C,d as N}from"./ScannerModal-CuSJQS4t.js";const A=[["rect",{width:"16",height:"20",x:"4",y:"2",rx:"2",key:"1nb95v"}],["line",{x1:"8",x2:"16",y1:"6",y2:"6",key:"x4nwl0"}],["line",{x1:"16",x2:"16",y1:"14",y2:"18",key:"wjye3r"}],["path",{d:"M16 10h.01",key:"1m94wz"}],["path",{d:"M12 10h.01",key:"1nrarc"}],["path",{d:"M8 10h.01",key:"19clt8"}],["path",{d:"M12 14h.01",key:"1etili"}],["path",{d:"M8 14h.01",key:"6423bh"}],["path",{d:"M12 18h.01",key:"mhygvu"}],["path",{d:"M8 18h.01",key:"lrp35t"}]],B=$("calculator",A);const E=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["rect",{x:"9",y:"9",width:"6",height:"6",rx:"1",key:"1ssd4o"}]],I=$("circle-stop",E);const U=[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",key:"wmoenq"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]],P=$("triangle-alert",U),_=(t,o,h=!0)=>{const r=t.createdAt?.toDate?t.createdAt.toDate().toLocaleString("pt-BR"):"Processando...";let d=`Relatório #${o}`;t.type==="inventory"&&(d=`Inventário #${o}`),t.type==="delivery"&&(d=`Entrega #${o}`),t.type==="tested"&&(d=`Testados #${o}`);const y=t.title||d,s=new C;s.setFontSize(20),s.text(y,15,20),s.setFontSize(10),s.text(`Data: ${r}`,15,30),s.text(`Total de Itens: ${t.totalItems}`,150,30);let i=35;t.type==="inventory"&&t.locationName&&(s.text(`Local: ${t.locationName}`,15,36),i=42),t.type==="delivery"&&t.notes?(s.text(`Obs: ${t.notes}`,15,i),s.line(15,i+4,195,i+4),i+=7):(s.line(15,i,195,i),i+=5);const u=i,c=[...t.items].sort((e,n)=>e.sku.localeCompare(n.sku,void 0,{numeric:!0,sensitivity:"base"}));let l=[],f=[];if(t.type==="inventory"?(l=["SKU","Descrição","Anterior","Atual","Diferença"],f=c.map(e=>{const n=e.previousCount||0,a=e.currentCount-n;return[e.sku,e.description,n.toString(),e.currentCount.toString(),a>0?`+${a}`:a.toString()]})):t.type==="tested"?(l=["SKU","Descrição","Quantidade Restante","Quantidade Testada"],f=c.map(e=>[e.sku,e.description,(e.previousCount||0).toString(),e.currentCount.toString()])):t.type==="delivery"&&(l=["SKU","Descrição","Quantidade (Recebida)"],f=c.map(e=>[e.sku,e.description,e.currentCount.toString()])),N(s,{startY:u,head:[l],body:f,headStyles:{fillColor:[226,232,240],textColor:[51,65,85]},alternateRowStyles:{fillColor:[241,245,249]}}),h&&t.type==="delivery"&&t.imageUrls&&t.imageUrls.length>0){s.addPage(),s.setFontSize(16),s.text("Imagens Anexadas",15,20),s.line(15,22,195,22);let e=15,n=30;const a=58,g=5;t.imageUrls.forEach((m,x)=>{try{s.addImage(m,"JPEG",e,n,a,a)}catch(k){console.error("Erro ao adicionar imagem ao PDF:",k)}e+=a+g,e>150&&(e=15,n+=a+g),n>240&&x<t.imageUrls.length-1&&(s.addPage(),n=20,e=15)})}return s.output("blob")},F=async(t,o,h=!0)=>{let r=`Relatório #${o}`;t.type==="inventory"&&(r=`Inventário #${o}`),t.type==="delivery"&&(r=`Entrega #${o}`),t.type==="tested"&&(r=`Testados #${o}`);const d=t.title||r,y=t.createdAt?.toDate?t.createdAt.toDate().toLocaleString("pt-BR"):"Processando...",s=d.replace(/[^a-z0-9]/gi,"_").replace(/_+/g,"_").replace(/^_|_$/g,""),i=_(t,o,h),u=new File([i],`${s}.pdf`,{type:"application/pdf"}),c=`📊 *${d}*
📅 *Data:* ${y}
📝 *Itens:* ${t.totalItems}`;if(navigator.share&&navigator.canShare&&navigator.canShare({files:[u]}))try{await navigator.share({files:[u],title:d,text:c})}catch(l){l.name!=="AbortError"&&(b.error("Erro ao compartilhar relatório"),console.error(l))}else if(navigator.share)try{await navigator.share({title:d,text:c})}catch(l){b.error("Erro ao compartilhar texto"),console.error(l)}else await navigator.clipboard.writeText(c),b.success("Informações copiadas para a área de transferência!")},K=(t,o,h=!0)=>{const r=window.open("","_blank");if(!r)return;let d=`Relatório #${o}`;t.type==="inventory"&&(d=`Inventário #${o}`),t.type==="delivery"&&(d=`Entrega #${o}`),t.type==="tested"&&(d=`Testados #${o}`);const y=t.title||d,s=t.createdAt?.toDate?t.createdAt.toDate().toLocaleString("pt-BR"):new Date().toLocaleString("pt-BR");let i="";t.type==="inventory"?i="<th>SKU</th><th>Descrição</th><th>Anterior</th><th>Atual</th><th>Diferença</th>":t.type==="tested"?i="<th>SKU</th><th>Descrição</th><th>Quantidade Restante</th><th>Quantidade Testada</th>":t.type==="delivery"&&(i="<th>SKU</th><th>Descrição</th><th>Quantidade (Recebida)</th>");const u=[...t.items].sort((a,g)=>a.sku.localeCompare(g.sku,void 0,{numeric:!0,sensitivity:"base"}));let c="";u.forEach(a=>{if(t.type==="inventory"){const g=a.previousCount||0,m=a.currentCount-g,x=m>0?"diff-pos":m<0?"diff-neg":"";c+=`
                <tr>
                    <td>${a.sku}</td>
                    <td>${a.description}</td>
                    <td>${g}</td>
                    <td>${a.currentCount}</td>
                    <td class="${x}">${m>0?"+":""}${m}</td>
                </tr>
            `}else if(t.type==="tested"){const g=a.previousCount||0;c+=`
                <tr>
                    <td>${a.sku}</td>
                    <td>${a.description}</td>
                    <td>${g}</td>
                    <td>${a.currentCount}</td>
                </tr>
            `}else t.type==="delivery"&&(c+=`
                <tr>
                    <td>${a.sku}</td>
                    <td>${a.description}</td>
                    <td>${a.currentCount}</td>
                </tr>
            `)});const l=t.type==="delivery"&&t.notes?`<div style="margin-top: 15px; padding-top: 10px; border-top: 1px dotted #ccc;">
               <strong>Observações:</strong> ${t.notes}
           </div>`:"",f=t.type==="inventory"&&t.locationName?`<p style="margin: 5px 0 0 0; color: #555;"><strong>Local:</strong> ${t.locationName}</p>`:"",e=h&&t.type==="delivery"&&t.imageUrls&&t.imageUrls.length>0?`<div style="margin-top: 30px; border-top: 2px solid #333; padding-top: 20px;">
               <h3 style="margin-bottom: 15px;">Imagens Anexadas</h3>
               <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                   ${t.imageUrls.map(a=>`<img src="${a}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; border: 1px solid #ddd;" />`).join("")}
               </div>
           </div>`:"",n=`
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
                    @media print {
                        img { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>${y}</h1>
                        ${f}
                        <p style="margin-top: 5px;">Data: ${s}</p>
                    </div>
                    <div style="text-align: right">
                        <p>Total de Itens: ${t.totalItems}</p>
                    </div>
                </div>
                ${l}
                <table>
                    <thead>
                        <tr>${i}</tr>
                    </thead>
                    <tbody>
                        ${c}
                    </tbody>
                </table>
                ${e}
            </body>
        </html>
    `;r.document.write(n),r.document.close(),r.focus(),setTimeout(()=>{r.print()},250)},L=(t,o,h,r=200)=>{const[d,y]=v.useState([]),[s,i]=v.useState(!0);return v.useEffect(()=>{i(!0);const u=w(D(R,"reports"),j("createdAt","desc"),S(r)),c=T(u,l=>{const e=l.docs.map(n=>({id:n.id,...n.data()})).filter(n=>!(n.type!==t||o&&(n.createdAt?.toDate?n.createdAt.toDate().toLocaleDateString("en-CA"):"")!==o||h&&n.locationId!==h));y(e),i(!1)},l=>{console.error("Erro na query de reports:",l),i(!1)});return()=>c()},[t,o,h,r]),{reports:d,loading:s}},Q=()=>p.jsx("div",{className:"space-y-4 animate-in fade-in duration-300",children:[...Array(5)].map((t,o)=>p.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4",children:[p.jsxs("div",{className:"flex items-center gap-4",children:[p.jsx("div",{className:"w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse"}),p.jsxs("div",{className:"space-y-2",children:[p.jsx("div",{className:"h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"}),p.jsx("div",{className:"h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse"})]})]}),p.jsxs("div",{className:"flex items-center gap-6",children:[p.jsxs("div",{className:"text-right space-y-2 hidden md:block",children:[p.jsx("div",{className:"h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"}),p.jsx("div",{className:"h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto"})]}),p.jsxs("div",{className:"flex items-center gap-2",children:[p.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"}),p.jsx("div",{className:"w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"})]})]})]},o))});export{I as C,Q as R,P as T,B as a,K as p,F as s,L as u};
