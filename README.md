# 📦 Stock Report v2

Um sistema web progressivo (PWA) moderno e responsivo para **Gerenciamento de Inventário**, controle de entradas/saídas de **Entregas**, e painel estatístico de produtos e testes.
Desenvolvido com arquitetura **"Offline-First"** de forma a operar com fluidez mesmo sem conexão constante com a internet (ideal para uso interno em galpões e locais de armazenamento remoto).

---

## 🚀 Principais Features

- **Operação Híbrida/Offline:** Através do `Dexie.js` (IndexedDB), o inventário é lido, preenchido e processado primeiro na memória interna do celular/navegador.
- **Leitura Nativa de Códigos:** Scanner embutido utilizando a câmera do próprio dispositivo móvel (via `html5-qrcode`) para leitura ágil de QR Codes ou Códigos de Barra.
- **Relatórios PDF de Alta Performance:** Geração e formatação visual dos relatórios numéricos acompanhados de evidências (fotos capturadas na entrega) com montagem ultrarrápida convertendo em PDF cliente usando `jsPDF`.
- **Compartilhamento Eficiente:** Usa a Web Share API nativa dos sistemas operacionais móveis (iOS/Android) para mandar os logs rapidamente para o WhatsApp ou E-mail.
- **Autenticação Escalonável:** Controle das informações (Dashboard), configurações de PWA e logins em nuvem utilizando instâncias atualizadas do Firebase v12.

## 🛠️ Stack Tecnológica (Front-end)

O projeto se baseia nas fundações padrão mais ágeis do mercado:

- **Espinha Dorsal:** React 19 + TypeScript + Vite.js
- **Navegação (Rotas):** React Router v7
- **Styling UI:** Tailwind CSS v4 + Lucide React (Ícones)
- **Persistência Temporária/Local:** Dexie.js (banco no navegador)
- **Persistência Nuvem/Realtime:** Firebase Firestore & Storage
- **Exportação & Compressão:** HTML5 Canvas, HTML2PDF/jsPDF

---

## 📋 Requisitos para Instalação Local

1. Tenha instalado o [Node.js](https://nodejs.org/en) atual.
2. Clone o repositório na sua máquina via console:
```bash
git clone https://github.com/allfilescloud-blip/stockreportv2.git
cd stockreportv2
```
3. Resolva e instale todo o mapa de dependências localmente:
```bash
npm install
```
4. Se necessário para o ambiente de dev, certifique-se de preencher as suas credencias da Google/Firebase clonando o arquivo `.env.example` para `.env` e imputando as chaves ali.
5. Levante o servidor de desenvolvedor local:
```bash
npm run dev
```

## 🏗️ Ambiente de Produção & CI/CD

Esse repositório conta com um arquivo de configuração de GitHub Actions (`.github/workflows/deploy.yml`) programado para compilar (`npm run build`) o projeto em sua versão miniaturizada final e enviar ativamente essa build estática para a branch **`gh-pages`** sempre que houver um `push` na branch `main`.

A partir disso, a plataforma GitHub hospeda automaticamente do link PWA final para web e instalação.