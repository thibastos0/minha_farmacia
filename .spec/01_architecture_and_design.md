# 🏛️ Especificação 01: Arquitetura do Sistema e Design System

## 1. Contexto e Missão
O projeto **Minha Farmácia** é o ecossistema oficial da Prefeitura Municipal de Indaiatuba (Hackathon Fatec 2026) voltado à triagem, dispensa e entrega domiciliar de medicamentos da rede pública municipal de saúde. 

A solução integra-se conceitual e visualmente à plataforma unificada **[Minha Indaiatuba](https://minha.indaiatuba.sp.gov.br/)**, garantindo facilidade de uso para o cidadão sem burocracias de recadastro, controle rigoroso para a equipe farmacêutica municipal e agilidade logística para a frota de entregadores.

---

## 2. Padrão Visual Municipal ("Minha Indaiatuba")

### 2.1 Paleta de Cores e Tokens de Estilo
- **Fundo Global do App:** `#f8fafc` (Slate 50) — tom suave que reduz a fadiga visual e destaca os cartões de conteúdo.
- **Cartões e Superfícies:** Fundo branco puro (`#ffffff`), cantos arredondados generosos (`rounded-3xl` / `24px`), bordas discretas (`border border-slate-200/80`) e sombras suaves (`shadow-sm`).
- **Verde Institucional Saúde (Indaiatuba Verde):**
  - Primário: `#059669` (Emerald 600) / Hover: `#047857` (Emerald 700)
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

## 3. Acessibilidade Digital (WCAG 2.1 Nível AA)

O sistema segue diretrizes estritas de acessibilidade universal:
1. **Área de Toque Mínima (Touch Target Size):**
   - Todos os botões, links de ação e elementos interativos possuem dimensões mínimas de **48px x 48px** (`min-h-[48px]`, `min-w-[48px]`), com espaçamento adequado para evitar toques acidentais por pessoas idosas ou com dificuldades motoras.
2. **Contraste de Cores:**
   - Taxa de contraste mínima de 4.5:1 para texto normal e 3:1 para texto grande e componentes gráficos essenciais (em conformidade com WCAG AA).
3. **Semântica e Leitores de Tela:**
   - Todos os elementos acionáveis possuem rótulos descritivos (`aria-label`), estados explícitos (`aria-expanded`, `aria-busy`, `aria-disabled`) e regiões dinâmicas (`aria-live="polite"` para notificações e atualizações de status).
4. **Navegação Completa por Teclado:**
   - Ordem lógica de foco visual (`tabindex`), anéis de foco bem definidos (`focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2`).

---

## 4. Arquitetura Desacoplada e Estrutura de Módulos

A solução adota uma arquitetura em camadas desacoplada e independente de framework monolítico, facilitando portabilidade para React Web (Vite/Tailwind) e React Native (Expo):

```
minha_farmacia/
├── .spec/                          # Especificações e Modelos SDD
│   ├── 01_architecture_and_design.md
│   ├── 02_data_models_and_split.md
│   ├── 03_modules_specification.md
│   └── 04_leaflet_and_crud.md
├── src/                            # Núcleo modular da aplicação
│   ├── core/                       # Lógica de negócio pura (agnóstica de UI)
│   │   ├── types.ts                # Modelos de dados e enums
│   │   ├── store.ts                # Estado reativo e persistência local (LocalStorage/Storage)
│   │   └── splitEngine.ts          # Motor de desmembramento 1:N de pedidos
│   ├── modules/                    # Módulos desacoplados
│   │   ├── cidadao/                # Portal Munícipe (Login mock, upload, tracking, PIN)
│   │   ├── farmacia/               # Triagem farmacêutica, CRUD estoque, Leaflet
│   │   └── entregador/             # Painel de corridas, validação de PIN, WhatsApp
│   └── shared/                     # Componentes e utilitários reutilizáveis
│       ├── components/             # Botões acessíveis, badges, cards, timeline
│       └── utils/                  # Formatadores de data, telefone, PIN, validadores
├── index.html                      # Ponto de entrada da aplicação integrada
├── detalhes.md                     # Documento de especificações e contexto do projeto
├── README.md                       # Apresentação executiva e instruções de execução
└── tasks.md                        # Backlog e checklist de execução orientada a testes
```

---

## 5. Estratégia de Estado Compartilhado e Reatividade
- **Store Centralizado (`StateStore`):** Mecanismo Pub/Sub de eventos reativos (`listeners`) que reflete imediatamente ações entre os 3 módulos (ex: farmacêutico aprova -> munícipe vê nova timeline -> entregador vê nova corrida disponível).
- **Persistência Local Automatizada:** Sincronização em `localStorage` com seed inicial de dados realistas de Indaiatuba (postos de saúde, farmácia central municipal, medicamentos reais da RENAME, motoristas e pedidos demonstrativos).
