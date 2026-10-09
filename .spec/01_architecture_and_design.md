# 🏛️ Especificação 01: Arquitetura do Sistema e Design System

## 1. Contexto e Missão
O projeto **Minha Farmácia** é o ecossistema oficial da Prefeitura Municipal de Indaiatuba (Hackathon Fatec 2026) voltado à triagem, dispensa e entrega domiciliar de medicamentos da rede pública municipal de saúde. 

A solução integra-se conceitual e visualmente à plataforma unificada **[Minha Indaiatuba](https://minha.indaiatuba.sp.gov.br/)**, garantindo facilidade de uso para o cidadão sem burocracias de recadastro, controle sanitário rigoroso para a equipe farmacêutica municipal (RDC 44/2009 ANVISA) e agilidade logística para a frota de entregadores.

---

## 2. Padrão Visual Municipal ("Minha Indaiatuba")

### 2.1 Paleta de Cores e Tokens de Estilo
- **Fundo Global do App:** `#f8fafc` (Slate 50) — tom suave que reduz a fadiga visual e destaca os cartões de conteúdo.
- **Cartões e Superfícies:** Fundo branco puro (`#ffffff`), cantos arredondados generosos (`rounded-3xl` / `24px`), bordas discretas (`border border-slate-200/80`) e sombras suaves (`shadow-sm`).
- **Verde Institucional Saúde (Indaiatuba Verde):**
  - Primário: `#059669` (Emerald 600) / Hover: `#047857` (Emerald 700) / Profundo: `#064e3b` (Emerald 900)
  - Fundo Suave / Badge: `#ecfdf5` (Emerald 50) com texto `#065f46` (Emerald 800)
- **Azul Institucional Prefeitura (Indaiatuba Azul):**
  - Acentos e Informações Oficiais: `#0284c7` (Sky 600) / `#0369a1` (Sky 700)
  - Superfícies de Contraste / Header: `#0f172a` (Slate 900) ou `#064e3b` (Emerald 900)
- **Círculos de Ícones em Tons Pastel:**
  - Status e Categorias: círculos `w-12 h-12 rounded-2xl flex items-center justify-center` com cores pastéis temáticas:
    - Saúde/Aprovação: `bg-emerald-100 text-emerald-700`
    - Logística/Em trânsito: `bg-sky-100 text-sky-700`
    - Alerta/Reposição: `bg-amber-100 text-amber-700`
    - Urgência/Inativo: `bg-rose-100 text-rose-700`

---

## 3. Acessibilidade Digital (WCAG 2.1 Nível AA) & Responsividade Mobile

O sistema segue diretrizes estritas de acessibilidade universal e ergonomia móvel:
1. **Área de Toque Mínima (Touch Target Size):**
   - Todos os botões, links de ação e elementos interativos possuem dimensões mínimas de **48px x 48px** (`min-h-[48px]`, `min-w-[48px]`), com espaçamento adequado para evitar toques acidentais por pessoas idosas ou com dificuldades motoras.
2. **Contraste de Cores:**
   - Taxa de contraste mínima de 4.5:1 para texto normal e 3:1 para texto grande e componentes gráficos essenciais (em conformidade com WCAG AA).
3. **Semântica e Leitores de Tela:**
   - Todos os elementos acionáveis possuem rótulos descritivos (`aria-label`), estados explícitos (`aria-expanded`, `aria-busy`, `aria-disabled`), papéis modais (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) e regiões dinâmicas (`#a11y-announcer` com `aria-live="polite"`).
4. **Navegação Completa por Teclado e Dismissal de Diálogos:**
   - Ordem lógica de foco visual (`tabindex`), anéis de foco bem definidos (`focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`).
   - Suporte ao encerramento acessível de todos os modais via tecla `Escape`.
5. **Responsividade Mobile e Bottom Navigation Bar:**
   - Para telas pequenas (< 640px), o cabeçalho se compacta e é ativada a **Barra de Navegação Inferior Móvel** fixa (`fixed bottom-0 left-0 right-0 z-40 bg-[#064e3b]/95 backdrop-blur-md`), mantendo os 3 módulos (Cidadão, Farmácia e Entregador) acessíveis com o polegar.
   - Prevenção de quebra de layout horizontal através de `overflow-x-hidden` no `body` e `main`.

---

## 4. Tela de Autenticação Unificada (Cidadão ID / Acesso Municipal)

O sistema possui um componente central de controle de acesso (`#modal-login`) que simula a federação de identidades municipais:
- **Perfis de Acesso Rápido:**
  1. **Munícipe de Indaiatuba:** Seleciona cidadãos cadastrados na base (ex: Dona Maria de Lourdes Silva, Carlos Eduardo dos Santos) e carrega automaticamente seus dados de CNS, CPF e endereço residencial.
  2. **Farmacêutico Responsável Técnico (RT):** Login profissional com credenciais sanitárias (Dra. Camila S. Rocha — CRF-SP 45.892). Redireciona imediatamente para o módulo `/farmacia`.
  3. **Entregador Municipal (Frota Saúde):** Login dos motoboys oficiais da frota (Marcos Vinicius — Moto 01, Carlos Silva — Moto 02). Redireciona diretamente para o módulo `/entregador`.
- **Cadastro de Novo Munícipe (`#modal-cadastro`):** Permite adicionar novos cidadãos com nome, CPF, Cartão SUS, telefone e endereço completo em Indaiatuba, persistindo em tempo real no `StateStore`.

---

## 5. Modal de Inspeção e Validação de Receita Médica do SUS (RDC 44/2009)

Em estrita conformidade com as Boas Práticas Farmacêuticas estabelecidas pela **RDC nº 44/2009 da ANVISA**, o farmacêutico realiza a conferência sanitária através de uma visualização fidedigna da Prescrição Médica Oficial (`#modal-validacao`):
- **Cabeçalho Institucional:** Timbre oficial da **Prefeitura Municipal de Indaiatuba • Secretaria Municipal de Saúde • Sistema Único de Saúde (SUS)**.
- **Identificação do Prescritor:** Dados do médico solicitante: *Dr. Eduardo Lima — Médico Generalista • CRM-SP 142.890 • UBS Morada do Sol / Polo de Saúde Central*.
- **Identificação Completa do Paciente:** Nome completo, CPF, número do Cartão Nacional de Saúde (CNS/SUS), endereço residencial e data da emissão.
- **Corpo da Prescrição (Posologia e Medicamentos):**
  1. *Amoxicilina + Clavulanato 500mg/125mg* — Tomar 1 comprimido de 8 em 8 horas por 7 dias (2 caixas).
  2. *Losartana Potássica 50mg* — Tomar 1 comprimido ao dia de uso contínuo pela manhã (1 caixa).
  3. *Dipirona Monoidratada 500mg* — Tomar 1 comprimido a cada 6 horas se houver dor ou febre (1 caixa).
- **Rodapé de Autenticidade Digital:** Carimbo e assinatura digital com certificado ICP-Brasil, identificador hash da prescrição e QR Code de autenticação SUS.
- **Ações de Transição Sanitária:**
  - **Aprovar e Selecionar Medicamentos:** Transiciona para o modal de triagem e cálculo de desmembramento logístico (`#modal-triagem`).
  - **Reprovar Solicitação:** Abre formulário de justificativa técnica sanitária obrigatória (`#modal-recusa`).

---

## 6. Arquitetura Desacoplada e Estrutura de Módulos

A solução adota uma arquitetura em camadas desacoplada e modular em TypeScript:

```
minha_farmacia/
├── .spec/                          # Especificações e Modelos SDD
│   ├── 01_architecture_and_design.md
│   ├── 02_data_models_and_split.md
│   ├── 03_modules_specification.md
│   └── 04_leaflet_and_crud.md
├── src/                            # Núcleo modular da aplicação
│   ├── core/                       # Lógica de negócio pura (agnóstica de UI)
│   │   ├── types.ts                # Modelos de dados, enums e UBSs
│   │   ├── store.ts                # Estado reativo e persistência local (LocalStorage)
│   │   ├── splitEngine.ts          # Motor de desmembramento 1:N de pedidos
│   │   ├── navigation.ts           # NavigationManager e controle de abas/perfis
│   │   └── seedData.ts             # Dados demonstrativos realistas de Indaiatuba
│   ├── modules/                    # Módulos desacoplados
│   │   ├── cidadao/                # Portal Munícipe (Upload, histórico, tracking, PIN)
│   │   ├── farmacia/               # Triagem farmacêutica, CRUD estoque, Leaflet, Dashboard
│   │   └── entregador/             # Painel de corridas, despacho, PIN, WhatsApp
│   └── shared/                     # Componentes e utilitários reutilizáveis
│       ├── components/             # Botões acessíveis, badges, cards, timeline
│       └── utils/                  # Formatadores de data, telefone, PIN, validadores
├── index.html                      # Ponto de entrada da aplicação integrada
├── detalhes.md                     # Documento de especificações e contexto do projeto
├── README.md                       # Apresentação executiva e instruções de execução
└── tasks.md                        # Backlog e checklist de execução orientada a testes
```

---

## 7. Estratégia de Estado Compartilhado e Reatividade
- **Store Centralizado (`StateStore`):** Mecanismo Pub/Sub de eventos reativos (`listeners`) que reflete imediatamente ações entre os 3 módulos (ex: farmacêutico aprova -> munícipe vê nova timeline -> entregador vê nova corrida disponível).
- **Persistência Local Automatizada:** Sincronização em `localStorage` com seed inicial de dados realistas de Indaiatuba (postos de saúde, farmácia central municipal, medicamentos reais da RENAME, motoristas e pedidos demonstrativos).
