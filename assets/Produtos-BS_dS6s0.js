import{c as D,h as ie,r,j as e,X as U,q as B,w as T,i as E,f as j,n as F,p as ne,t as de,e as ce,v as xe,x as _}from"./index-CvPIJ-XD.js";import{P as K,S as ue,a as me,b as X,c as he,E as be,d as pe}from"./ScannerModal-BWaIaqx8.js";import{P as fe,a as Y}from"./plus-njgAZ9S2.js";import{I as J,H as V}from"./info-lQS1XUGv.js";const ge=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],ve=D("chevron-down",ge);const ke=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],je=D("chevron-up",ke);const we=[["path",{d:"m7 15 5 5 5-5",key:"1hf1tw"}],["path",{d:"m7 9 5-5 5 5",key:"sgt6xg"}]],Ne=D("chevrons-up-down",we);const ye=[["path",{d:"M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z",key:"sc7q7i"}]],Se=D("funnel",ye),Ae=()=>{const{products:w}=ie(),[c,H]=r.useState(""),[i,A]=r.useState("all"),[ee,N]=r.useState(!1),[te,$]=r.useState(!1),[l,m]=r.useState(null),[h,y]=r.useState(""),[x,b]=r.useState(""),[P,S]=r.useState(""),[u,p]=r.useState(""),[I,C]=r.useState("active"),[O,f]=r.useState(null),[z,se]=r.useState("sku"),[L,Q]=r.useState("asc"),[q,g]=r.useState(null),ae=async t=>{t.preventDefault(),f(null);const s=B(E(j,"products"),T("sku","==",h));if((await F(s)).docs.some(n=>l?n.id!==l.id:!0)){f("Este SKU já está cadastrado em outro produto.");return}if(x&&x.trim()!==""){const n=B(E(j,"products"),T("ean","==",x.trim()));if((await F(n)).docs.some(R=>l?R.id!==l.id:!0)){f("Este EAN já está cadastrado em outro produto.");return}}if(u&&u.trim()!==""){const n=B(E(j,"products"),T("model","==",u.trim()));if((await F(n)).docs.some(R=>l?R.id!==l.id:!0)){f("Este Modelo já está cadastrado em outro produto.");return}}const k={action:l?"Update":"Creation",date:new Date().toISOString(),details:`Produto ${l?"alterado":"criado"} com SKU: ${h}`};l?await ne(ce(j,"products",l.id),{sku:h,ean:x,description:P,model:u,status:I,updatedAt:_(),history:de(k)}):await xe(E(j,"products"),{sku:h,ean:x,description:P,model:u,status:I,createdAt:_(),updatedAt:_(),history:[k]}),M()},le=t=>{q==="ean"?b(t):q==="model"&&p(t),g(null)},W=t=>{z===t?Q(L==="asc"?"desc":"asc"):(se(t),Q("asc"))},G=t=>z!==t?e.jsx(Ne,{size:14,className:"text-slate-500"}):L==="asc"?e.jsx(je,{size:14,className:"text-blue-500"}):e.jsx(ve,{size:14,className:"text-blue-500"}),M=()=>{g(null),y(""),b(""),S(""),p(""),C("active"),f(null),m(null),N(!1)},d=w.filter(t=>{const s=t.sku.toLowerCase().includes(c.toLowerCase())||t.ean?.toLowerCase().includes(c.toLowerCase())||t.description.toLowerCase().includes(c.toLowerCase())||t.model?.toLowerCase().includes(c.toLowerCase()),a=i==="all"||t.status===i;return s&&a}).sort((t,s)=>{const a=t[z]||"",v=s[z]||"";return L==="asc"?a.localeCompare(v,void 0,{numeric:!0,sensitivity:"base"}):v.localeCompare(a,void 0,{numeric:!0,sensitivity:"base"})}),re=async()=>{const t=new Date().toLocaleString("pt-BR"),s=new be;s.setFontSize(20),s.text("Catálogo de Produtos",15,20),s.setFontSize(10),s.text(`Data: ${t}`,15,30),s.text(`Filtro: ${i==="all"?"Todos":i==="active"?"Ativos":"Inativos"}`,15,35),s.text(`Total: ${d.length}`,150,30),s.line(15,38,195,38);const a=[...d].map(o=>[o.sku,o.description,o.model||"-",o.ean||"-",o.status==="active"?"Ativo":"Inativo"]);pe(s,{startY:43,head:[["SKU","Descrição","Modelo","EAN","Status"]],body:a,headStyles:{fillColor:[226,232,240],textColor:[51,65,85]},alternateRowStyles:{fillColor:[241,245,249]}});const v=s.output("blob"),k=new File([v],`produtos_${new Date().getTime()}.pdf`,{type:"application/pdf"}),n=`📊 *Catálogo de Produtos*
📅 *Data:* ${t}
📝 *Itens:* ${d.length}`;if(navigator.share&&navigator.canShare&&navigator.canShare({files:[k]}))try{await navigator.share({files:[k],title:"Catálogo de Produtos",text:n})}catch(o){o.name!=="AbortError"&&console.error("Erro ao compartilhar:",o)}else if(navigator.share)try{await navigator.share({title:"Catálogo de Produtos",text:n})}catch(o){console.error("Erro ao compartilhar texto:",o)}else navigator.clipboard.writeText(n),alert("Resumo copiado para a área de transferência!")},Z=t=>{const s=window.open("","_blank");if(!s)return;const a=`
            <html>
                <head>
                    <title>Etiqueta - ${t.sku}</title>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
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
                            <span class="sku" id="sku">${t.sku}</span>
                        </div>
                        <div class="line-container">
                            <div class="line"></div>
                        </div>
                    </div>
                    <div class="description" id="desc">${t.description}</div>
                    <script>
                        // Generate QR Code
                        new QRCode(document.getElementById('qrcode'), {
                            text: "${t.sku}",
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
                    <\/script>
                </body>
            </html>
        `;s.document.write(a),s.document.close()};return e.jsxs("div",{className:"p-4 md:p-8 max-w-full mx-auto",children:[e.jsxs("div",{className:"flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-3xl font-bold text-slate-900 dark:text-white",children:"Produtos"}),e.jsx("p",{className:"text-slate-500 dark:text-slate-400",children:"Gerencie seu catálogo de itens"}),e.jsxs("div",{className:"flex gap-4 mt-2 text-sm font-bold uppercase tracking-wider",children:[e.jsxs("span",{className:"text-slate-500",children:["Total: ",e.jsx("span",{className:"text-slate-700 dark:text-slate-300",children:w.length})]}),e.jsxs("span",{className:"text-slate-500",children:["Ativos: ",e.jsx("span",{className:"text-emerald-500",children:w.filter(t=>t.status==="active").length})]}),e.jsxs("span",{className:"text-slate-500",children:["Inativos: ",e.jsx("span",{className:"text-red-500",children:w.filter(t=>t.status==="inactive").length})]})]})]}),e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsxs("button",{onClick:()=>N(!0),className:"flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-900/20 font-bold",children:[e.jsx(fe,{size:20}),e.jsx("span",{children:"Novo Produto"})]}),e.jsx("button",{onClick:()=>{const t=window.open("","_blank");if(!t)return;const s=`
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
                                        <h1>Relatório de Produtos - ${i.charAt(0).toUpperCase()+i.slice(1)}</h1>
                                        <p>Data: ${new Date().toLocaleString("pt-BR")}</p>
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
                                                ${d.map(a=>`
                                                    <tr>
                                                        <td>${a.sku}</td>
                                                        <td>${a.description}</td>
                                                        <td>${a.model||"-"}</td>
                                                        <td>${a.ean||"-"}</td>
                                                        <td>
                                                            <span class="status ${a.status}">
                                                                ${a.status==="active"?"Ativo":"Inativo"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                `).join("")}
                                            </tbody>
                                        </table>
                                        <script>window.print();<\/script>
                                    </body>
                                </html>
                            `;t.document.write(s),t.document.close()},className:"hidden md:flex p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white rounded-xl transition-all border border-slate-300 dark:border-slate-700 shadow-lg",title:"Imprimir",children:e.jsx(K,{size:20})}),e.jsx("button",{onClick:re,className:"md:hidden p-3 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 active:scale-95 transition-all",title:"Compartilhar PDF",children:e.jsx(ue,{size:20})})]})]}),e.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xl",children:[e.jsxs("div",{className:"p-4 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 flex flex-col md:flex-row gap-4 items-center",children:[e.jsxs("div",{className:"relative flex-1 w-full group",children:[e.jsx(me,{className:"absolute left-3 top-1/2 -translate-y-1/2 text-slate-500",size:20}),e.jsx("input",{type:"text",placeholder:"Buscar por SKU, EAN ou descrição...",className:"w-full pl-10 pr-10 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all",value:c,onChange:t=>H(t.target.value)}),c&&e.jsx("button",{onClick:()=>H(""),className:"absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 dark:text-white transition-colors p-1",title:"Limpar busca",children:e.jsx(U,{size:16})})]}),e.jsxs("div",{className:"flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 w-full md:w-auto",children:[e.jsx(Se,{size:16,className:"ml-2 text-slate-500"}),e.jsx("button",{onClick:()=>A("all"),className:`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${i==="all"?"bg-blue-600 text-white":"text-slate-500 dark:text-slate-400 hover:text-white"}`,children:"Todos"}),e.jsx("button",{onClick:()=>A("active"),className:`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${i==="active"?"bg-emerald-600 text-white":"text-slate-500 dark:text-slate-400 hover:text-white"}`,children:"Ativos"}),e.jsx("button",{onClick:()=>A("inactive"),className:`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${i==="inactive"?"bg-red-600 text-white":"text-slate-500 dark:text-slate-400 hover:text-white"}`,children:"Inativos"})]})]}),e.jsx("div",{className:"hidden md:block overflow-x-auto",children:e.jsxs("table",{className:"w-full text-left",children:[e.jsx("thead",{children:e.jsxs("tr",{className:"bg-slate-200/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm",children:[e.jsx("th",{className:"px-6 py-4 font-semibold text-nowrap cursor-pointer transition-colors group",onClick:()=>W("sku"),children:e.jsxs("div",{className:"flex items-center gap-2",children:["SKU",G("sku")]})}),e.jsx("th",{className:"px-6 py-4 font-semibold text-nowrap",children:"EAN"}),e.jsx("th",{className:"px-6 py-4 font-semibold w-full cursor-pointer transition-colors group",onClick:()=>W("description"),children:e.jsxs("div",{className:"flex items-center gap-2",children:["Descrição",G("description")]})}),e.jsx("th",{className:"px-6 py-4 font-semibold",children:"Status"}),e.jsx("th",{className:"px-6 py-4 font-semibold text-right",children:"Ações"})]})}),e.jsx("tbody",{className:"divide-y divide-slate-200 dark:divide-slate-800",children:d.map(t=>e.jsxs("tr",{className:"hover:bg-slate-100/30 dark:bg-slate-800/30 transition-colors",children:[e.jsx("td",{className:"px-6 py-4 font-mono text-blue-400 text-nowrap text-sm",children:t.sku}),e.jsx("td",{className:"px-6 py-4 font-mono text-slate-500 dark:text-slate-400 text-nowrap text-xs",children:t.ean||"-"}),e.jsx("td",{className:"px-6 py-4 text-slate-700 dark:text-slate-300 min-w-[150px] text-sm md:text-base",children:t.description}),e.jsx("td",{className:"px-6 py-4",children:e.jsx("span",{className:`px-3 py-1 rounded-full text-xs font-medium ${t.status==="active"?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`,children:t.status==="active"?"Ativo":"Inativo"})}),e.jsx("td",{className:"px-6 py-4 text-right",children:e.jsxs("div",{className:"flex justify-end gap-2 text-nowrap",children:[t.model&&e.jsx("div",{className:"p-2 text-blue-400",title:`Modelo: ${t.model}`,children:e.jsx(J,{size:18})}),e.jsx("button",{onClick:()=>Z(t),className:"p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all",title:"Imprimir Etiqueta Zebra",children:e.jsx(K,{size:18})}),e.jsx("button",{onClick:()=>{m(t),y(t.sku),b(t.ean||""),S(t.description),p(t.model||""),C(t.status),N(!0)},className:"p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all",title:"Editar",children:e.jsx(Y,{size:18})}),e.jsx("button",{onClick:()=>{m(t),$(!0)},className:"p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:bg-slate-200 dark:bg-slate-700 rounded-lg transition-all",children:e.jsx(V,{size:18})})]})})]},t.id))})]})}),e.jsxs("div",{className:"md:hidden divide-y divide-slate-200 dark:divide-slate-800",children:[d.map(t=>e.jsxs("div",{className:"p-4 space-y-4 hover:bg-slate-100/20 dark:bg-slate-800/20 transition-colors",children:[e.jsxs("div",{className:"flex justify-between items-start",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("p",{className:"font-mono text-blue-400 font-bold",children:t.sku}),e.jsx("p",{className:"text-slate-500 text-xs font-mono",children:t.ean||"Sem EAN"})]}),e.jsx("span",{className:`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${t.status==="active"?"bg-emerald-500/10 text-emerald-400":"bg-red-500/10 text-red-400"}`,children:t.status==="active"?"Ativo":"Inativo"})]}),e.jsx("p",{className:"text-slate-700 dark:text-slate-300 text-sm leading-relaxed",children:t.description}),e.jsxs("div",{className:"flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50",children:[e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:()=>Z(t),className:"flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all text-nowrap",title:"Imprimir Etiqueta Zebra",children:[e.jsx(K,{size:14}),"Etiqueta"]}),e.jsxs("button",{onClick:()=>{m(t),y(t.sku),b(t.ean||""),S(t.description),p(t.model||""),C(t.status),N(!0)},className:"flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all text-nowrap",children:[e.jsx(Y,{size:14}),"Editar"]}),e.jsxs("button",{onClick:()=>{m(t),$(!0)},className:"flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 active:scale-95 transition-all text-nowrap",children:[e.jsx(V,{size:14}),"Histórico"]})]}),t.model&&e.jsx("div",{className:"p-2 text-blue-400",title:`Modelo: ${t.model}`,children:e.jsx(J,{size:18})})]})]},t.id)),d.length===0&&e.jsx("div",{className:"p-12 text-center text-slate-500 italic text-sm",children:"Nenhum produto encontrado."})]})]}),ee&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm",children:e.jsxs("div",{className:"bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl",children:[e.jsxs("div",{className:"p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50",children:[e.jsx("h2",{className:"text-xl font-bold text-slate-900 dark:text-white",children:l?"Editar Produto":"Novo Produto"}),e.jsx("button",{onClick:M,className:"text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white",children:e.jsx(U,{size:24})})]}),e.jsxs("form",{onSubmit:ae,className:"p-4 md:p-6 space-y-4 max-h-[85vh] overflow-y-auto",children:[O&&e.jsx("div",{className:"bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-lg text-sm font-medium",children:O}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1",children:"SKU"}),e.jsx("input",{required:!0,autoFocus:!0,value:h,onChange:t=>y(t.target.value),className:"w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all",placeholder:"Ex: PROD-123"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1",children:"EAN (Código de Barras)"}),e.jsxs("div",{className:"relative",children:[e.jsx("input",{value:x,onChange:t=>b(t.target.value),className:"w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all",placeholder:"Ex: 7891234567890"}),e.jsx("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 flex items-center",children:e.jsx("button",{type:"button",onClick:()=>g("ean"),className:"text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm",title:"Escanear EAN",children:e.jsx(X,{size:20})})})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1",children:"Descrição"}),e.jsx("textarea",{required:!0,value:P,onChange:t=>S(t.target.value),className:"w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none h-24 transition-all",placeholder:"Descrição detalhada do produto..."})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1",children:"Modelo"}),e.jsxs("div",{className:"relative",children:[e.jsx("input",{value:u,onChange:t=>p(t.target.value),className:"w-full pl-4 pr-12 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all",placeholder:"Ex: iPhone 13 Pro"}),e.jsx("div",{className:"absolute right-2 top-1/2 -translate-y-1/2 flex items-center",children:e.jsx("button",{type:"button",onClick:()=>g("model"),className:"text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm",title:"Escanear Modelo",children:e.jsx(X,{size:20})})})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-xs font-semibold text-slate-500 uppercase mb-2 ml-1",children:"Status"}),e.jsxs("select",{value:I,onChange:t=>C(t.target.value),className:"w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all",children:[e.jsx("option",{value:"active",children:"Ativo"}),e.jsx("option",{value:"inactive",children:"Inativo"})]})]}),e.jsxs("div",{className:"pt-4 flex flex-col md:flex-row gap-3",children:[e.jsx("button",{type:"button",onClick:M,className:"order-2 md:order-1 flex-1 py-3 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white transition-colors",children:"Cancelar"}),e.jsx("button",{type:"submit",className:"order-1 md:order-2 flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg active:scale-95",children:l?"Salvar Alterações":"Cadastrar"})]})]})]})}),e.jsx(he,{isOpen:!!q,onClose:()=>g(null),onScan:le}),te&&l&&e.jsx("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",children:e.jsxs("div",{className:"bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl",children:[e.jsxs("div",{className:"p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-100/50 dark:bg-slate-800/50",children:[e.jsxs("h2",{className:"text-xl font-bold text-slate-900 dark:text-white",children:["Histórico: ",l.sku]}),e.jsx("button",{onClick:()=>$(!1),className:"text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white",children:e.jsx(U,{size:24})})]}),e.jsx("div",{className:"p-6 max-h-[60vh] overflow-y-auto space-y-4",children:l.history?.slice().reverse().map((t,s)=>e.jsxs("div",{className:"border-l-2 border-blue-500 pl-4 py-1",children:[e.jsx("p",{className:"text-xs text-slate-500",children:new Date(t.date).toLocaleString("pt-BR")}),e.jsx("p",{className:"text-slate-900 dark:text-white font-medium",children:t.action}),e.jsx("p",{className:"text-sm text-slate-500 dark:text-slate-400",children:t.details})]},s))})]})})]})};export{Ae as default};
