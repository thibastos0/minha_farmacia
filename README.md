# 💊 Minha Farmácia — Prefeitura Municipal de Indaiatuba

[![Hackathon Fatec 2026](https://img.shields.io/badge/Hackathon-Fatec%20Indaiatuba%202026-059669.svg)](https://github.com/thibastos0/minha_farmacia)
[![Padrão Visual](https://img.shields.io/badge/Padr%C3%A3o-Minha%20Indaiatuba-0284c7.svg)](https://minha.indaiatuba.sp.gov.br/)
[![Acessibilidade](https://img.shields.io/badge/Acessibilidade-WCAG%20AA%20Compliant-10b981.svg)](#acessibilidade-wcag-21-aa)
[![Arquitetura](https://img.shields.io/badge/Arquitetura-Spec--Driven%20%7C%20Superpowers-6366f1.svg)](docs/SPEC_DRIVEN_GUIDE.md)

> **Solução oficial de triagem, desmembramento e entrega domiciliar de medicamentos da rede pública municipal de Indaiatuba.**  
> Desenvolvido com foco em acessibilidade universal, integração ao ecossistema [Minha Indaiatuba](https://minha.indaiatuba.sp.gov.br/) e rastreamento transparente em tempo real.

---

## 📌 Visão Geral

O **Minha Farmácia** conecta munícipes, farmacêuticos da rede pública e entregadores municipais. O sistema resolve o problema histórico de viagens perdidas a postos de saúde quando há medicamentos em falta, implementando o pioneiro **Desmembramento de Pedidos (Order Splitting 1:N)**: os itens disponíveis são entregues imediatamente, enquanto itens em falta são encaminhados para reposição prioritária sem burocracia para o cidadão.

---

## 🏛️ Os Três Módulos Desacoplados

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MINHA FARMÁCIA (CORE)                         │
│             State Store Reativo • splitEngine • Dados Seedados          │
└───────────────┬─────────────────────────┬───────────────────────────────┘
                │                         │
      ┌─────────┴─────────┐     ┌─────────┴─────────┐     ┌───────────────┴─────────┐
      │   PORTAL CIDADÃO  │     │   PAINEL FARMÁCIA │     │    MÓDULO ENTREGADOR    │
      │      /cidadao     │     │      /farmacia    │     │       /entregador       │
      ├───────────────────┤     ├───────────────────┤     ├─────────────────────────┤
      │ • Login Cidadão ID│     │ • Triagem Receitas│     │ • Fila de Corridas      │
      │ • Upload Receita  │     │ • Split 1:N Pedido│     │ • Rota até Munícipe     │
      │ • Timeline Limpa  │     │ • CRUD Catálogo   │     │ • Validação de PIN      │
      │ • Código PIN      │     │ • Mapa da Frota   │     │ • Contato WhatsApp      │
      │ • Alertas Split   │     │ • KPIs em Tempo   │     │ • Baixa Instantânea     │
      └───────────────────┘     └───────────────────┘     └─────────────────────────┘
```

1. **📱 Portal do Cidadão (`/cidadao`):** Interface intuitiva com login unificado Cidadão ID / Gov.br, upload simples de receita, visualização de código PIN e acompanhamento independente de cada remessa do pedido.
2. **🏥 Painel da Farmácia e Gestão (`/farmacia`):** Plataforma para farmacêuticos analisarem receitas, gerenciarem o estoque de medicamentos municipal (CRUD completo), dispararem o desmembramento de pedidos (1:N) e acompanharem a frota de entregadores em mapa interativo (Leaflet.js com ciclo de vida `invalidateSize()`).
3. **🛵 Módulo do Entregador (`/entregador`):** Painel ágil para motoboys municipais visualizarem corridas atribuídas, entrarem em contato com o paciente via WhatsApp oficial e darem baixa na entrega mediante validação estrita do código PIN de segurança.

---

## ⚡ Regras de Negócio Diferenciais

### 🔄 Desmembramento Inteligente de Pedidos (Order Splitting 1:N)
Se uma receita prescrita contiver múltiplos itens e um deles estiver esgotado no almoxarifado local:
- O sistema gera automaticamente a **Remessa A (`SubOrder-A`)** com status `"EM_SEPARACAO"` para entrega imediata.
- O sistema gera a **Remessa B (`SubOrder-B`)** com status `"AGUARDANDO_REPOSICAO"`.
- O munícipe recebe **códigos PIN distintos** e notificações transparentes, garantindo que o tratamento prioritário não sofra atraso.
- O reabastecimento do item no CRUD do Farmacêutico promove automaticamente a `SubOrder-B` para despacho.

### ♿ Acessibilidade WCAG 2.1 AA
- Botões e alvos de toque com área mínima de **48px x 48px**.
- Fundo em tom `#f8fafc`, cartões brancos arredondados (`rounded-3xl`) e círculos em tons pastéis temáticos.
- Alto contraste de texto, rótulos `aria-label` descritivos e compatibilidade integral com navegação por teclado.

### 🗺️ Mapa da Frota com Leaflet.js
- Localização georreferenciada da Farmácia Central e dos entregadores em tempo real pelas vias de Indaiatuba.
- Correção de redimensionamento de abas ocultas via disparo de `invalidateSize()` no ciclo de vida de transição.

---

## 📂 Estrutura do Projeto

```
minha_farmacia/
├── .spec/                                   # Especificações do Superpowers SDD
│   ├── 01_architecture_and_design.md        # Identidade visual, tokens e WCAG AA
│   ├── 02_data_models_and_split.md          # Modelos de domínio e motor splitEngine
│   ├── 03_modules_specification.md          # Especificação detalhada dos 3 módulos
│   └── 04_leaflet_and_crud.md               # Especificação Leaflet.js e CRUD de estoque
├── detalhes.md                              # Documento de contexto do projeto
├── README.md                                # Apresentação geral e arquitetura
├── tasks.md                                 # Backlog e checklist de desenvolvimento
└── index.html                               # Aplicação interativa do Minha Farmácia
```

---

## 🛠️ Metodologia & Engenharia com IA

Este repositório foi construído seguindo rigorosamente a metodologia **Spec-Driven Development (SDD)** e boas práticas de desenvolvimento guiado por especificações e testes (TDD), utilizando o framework open-source **[Superpowers](https://github.com/obra/superpowers)** integrado ao **Antigravity CLI (`agy`)**.

Nenhuma funcionalidade é implementada antes da formalização dos seus requisitos e modelos de dados na pasta `.spec/`. Para compreender a fundo o fluxo arquitetural, a configuração do ambiente e a divisão dos módulos:

👉 **[Consulte o Guia Completo de Engenharia em docs/SPEC_DRIVEN_GUIDE.md](docs/SPEC_DRIVEN_GUIDE.md)**

---

## 🚀 Como Executar

Por ser um MVP modular e com código autocontido, você pode executá-lo diretamente:

1. **Execução Local (Navegador):**
   Abra o arquivo `index.html` em qualquer navegador web moderno.
2. **Servidor Local (Live Server / Vite / npx serve):**
   ```bash
   npx serve .
   # ou
   python3 -m http.server 3000
   ```
   Acesse: `http://localhost:3000`

---

## 👥 Equipe & Hackathon Fatec Indaiatuba 2026
- **Repositório:** [github.com/thibastos0/minha_farmacia](https://github.com/thibastos0/minha_farmacia)
- **Desafio:** 2.3) Minha Farmácia — Secretaria de Ciência, Tecnologia e Inovação / Prefeitura Municipal de Indaiatuba.

### 👨‍💻 Componentes da Equipe
- **Ana Luiza Scarparo Sena** — Curso DSM — 2º semestre
- **Henrique Correa Magalhães Prates** — Curso DSM — 2º semestre
- **Joel Gonçalves de Souz** — Curso DSM — 1º semestre
- **Luiza Vicaria Gaeta** — Curso DSM — 3º semestre
- **Thiago Lima de Carvalho Bastos Luiz** — Curso DSM — 5º semestre
- **Wesley Goulart da Silva** — Curso DSM — 1º semestre
