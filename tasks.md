# 📋 Backlog de Tarefas — Minha Farmácia (Spec-Driven Development)

Este documento define a sequência rigorosa de implementação incremental para o projeto **Minha Farmácia** (Prefeitura de Indaiatuba / Hackathon Fatec 2026).
Seguindo as diretrizes do framework **Superpowers**, cada tarefa deve ser desenvolvida de forma modular, com validação explícita de critérios de aceitação e confirmação antes do início da próxima etapa.

---

## 🎯 Quadro de Progresso

- [x] **Task 1: Core Domain, State Store Reativo e Motor de Desmembramento (`splitEngine`)**
- [ ] **Task 2: Design System "Minha Indaiatuba" e Shell Acessível (WCAG AA)**
- [ ] **Task 3: Módulo do Cidadão (`/cidadao`) — Upload, Timeline e PIN Independente**
- [ ] **Task 4: Módulo da Farmácia (`/farmacia`) — Triagem e Desmembramento 1:N**
- [ ] **Task 5: Módulo da Farmácia (`/farmacia`) — CRUD de Catálogo e Reabastecimento Reativo**
- [ ] **Task 6: Módulo da Farmácia (`/farmacia`) — Mapa da Frota Leaflet.js com `invalidateSize()`**
- [ ] **Task 7: Módulo do Entregador (`/entregador`) — Fila, Contato WhatsApp e Baixa por PIN**
- [ ] **Task 8: Integração Global End-to-End, Auditoria WCAG e Validação Final**

---

## 📝 Detalhamento das Tarefas

### 🔹 Task 1: Core Domain, State Store Reativo e Motor de Desmembramento (`splitEngine`)
- **Objetivo:** Estabelecer a camada de regras de negócio pura, tipos de dados e store desacoplado com pub/sub para sincronização entre os módulos.
- **Entregáveis:**
  - Tipos e enums (`Order`, `SubOrder`, `Citizen`, `Medication`, `Courier`).
  - Motor `splitEngine.evaluateAndSplitOrder()` que divide 1 pedido em `SubOrder-A` (estoque disponível) e `SubOrder-B` (aguardando reposição), gerando PINs numéricos de 4 dígitos independentes.
  - Store reativo com persistência em `localStorage` e dados iniciais realistas de Indaiatuba (Hospital Augusto de Oliveira Camargo, Farmácia Central, Unidades de Saúde do Jd. Morada do Sol, Parque Ecológico).
- **Critérios de Aceitação:**
  - [x] Teste unitário/verificação do `splitEngine` com pedido contendo 1 item com estoque e 1 item sem estoque.
  - [x] Verificação da geração de PINs únicos e independentes para cada SubOrder.
  - [x] Estado compartilhado sincroniza e emite notificações via listeners.

---

### 🔹 Task 2: Design System "Minha Indaiatuba" e Shell Acessível (WCAG AA)
- **Objetivo:** Implementar os tokens visuais oficiais da Prefeitura de Indaiatuba, seletor de módulos desacoplados e base de acessibilidade WCAG 2.1 AA.
- **Entregáveis:**
  - Layout global com fundo `#f8fafc`, cartões brancos com cantos `rounded-3xl` e sombras suaves.
  - Paleta institucional (Verde Saúde `#059669`, Azul Prefeitura `#0284c7`, círculos de ícones em tons pastéis).
  - Componentes com área de toque mínima de **48px x 48px** e contraste AAA/AA.
  - Header acessível com seletor de perfil e tags ARIA (`aria-label`, `aria-selected`).
- **Critérios de Aceitação:**
  - [ ] Elementos clicáveis com no mínimo 48px de área de toque.
  - [ ] Navegação funcional por teclado (`Tab`, `Enter`, `Space`) com anéis de foco visíveis.
  - [ ] Transição fluida entre os 3 módulos (/cidadao, /farmacia, /entregador).

---

### 🔹 Task 3: Módulo do Cidadão (`/cidadao`) — Upload, Timeline e PIN Independente
- **Objetivo:** Desenvolver o portal do munícipe com autenticação Gov.br / Cidadão ID, fluxo de receita médica, visualização de código PIN e transparência no desmembramento.
- **Entregáveis:**
  - Card de identificação do munícipe com dados oficiais pré-carregados (sem recadastro).
  - Componente acessível de envio/upload de receita médica com preview.
  - Timeline de status por SubOrder com exibição em alto contraste do código PIN de 4 dígitos.
  - Banner explicativo de desmembramento (notificando divisão em Remessa A imediata e Remessa B posterior).
- **Critérios de Aceitação:**
  - [ ] Upload da receita médica gera novo pedido no status `PENDENTE_TRIAGEM`.
  - [ ] Pedidos desmembrados exibem visualmente duas remessas separadas com seus respectivos PINs e status.
  - [ ] Avisos acessíveis via `aria-live` para leitores de tela.

---

### 🔹 Task 4: Módulo da Farmácia (`/farmacia`) — Triagem e Desmembramento 1:N
- **Objetivo:** Construir a interface de conferência do farmacêutico para avaliar prescrições e acionar a divisão do pedido quando houver ruptura de estoque.
- **Entregáveis:**
  - Fila de triagem com visualização da receita do munícipe.
  - Conferência de estoque com indicadores visuais de disponibilidade.
  - Ação de "Aprovar com Desmembramento (1:N)" gerando remessa imediata e remessa em espera.
  - Dashboard inicial de contadores (pedidos pendentes, em rota, aguardando reposição).
- **Critérios de Aceitação:**
  - [ ] Farmacêutico consegue selecionar itens e visualizar impacto no saldo de estoque.
  - [ ] Acionamento do botão de desmembramento separa o pedido em 2 SubOrders no store reativo.
  - [ ] Pedidos aprovados refletem imediatamente no portal do cidadão e no painel do entregador.

---

### 🔹 Task 5: Módulo da Farmácia (`/farmacia`) — CRUD de Catálogo e Reabastecimento Reativo
- **Objetivo:** Desenvolver o gerenciamento completo do catálogo municipal de medicamentos com atualização de estoque que reativa pedidos pendentes.
- **Entregáveis:**
  - Tabela acessível com lista de medicamentos da RENAME de Indaiatuba.
  - Modal de cadastro de novo medicamento com validação de campos.
  - Modal de edição e botões de ajuste rápido de quantidade (`+10`, `+50`, `-10`).
  - Inativação lógica (soft delete) com preservação de histórico.
  - Gatilho reativo: reabastecer estoque de item em falta promove automaticamente SubOrders de `AGUARDANDO_REPOSICAO` para `EM_SEPARACAO`.
- **Critérios de Aceitação:**
  - [ ] CRUD funcional: criar, buscar por texto/categoria, editar e inativar medicamentos.
  - [ ] Ao adicionar estoque de um item em falta, pedidos aguardando reposição são promovidos para separação.
  - [ ] Badges visuais de estoque crítico (< minStockAlert).

---

### 🔹 Task 6: Módulo da Farmácia (`/farmacia`) — Mapa da Frota Leaflet.js com `invalidateSize()`
- **Objetivo:** Integrar mapa interativo da frota em Indaiatuba com resolução técnica definitiva para problemas de renderização em abas ocultas.
- **Entregáveis:**
  - Mapa Leaflet centrado em Indaiatuba (`-23.0903, -47.2181`).
  - Marcador da Farmácia Central e marcadores da frota de motoboys em rota.
  - Hook de redimensionamento que invoca `map.invalidateSize()` após ativação da aba do mapa, corrigindo o problema de tiles cinzas.
- **Critérios de Aceitação:**
  - [ ] O mapa carrega centralizado e sem tiles quebrados ou cinzas ao alternar de aba.
  - [ ] Marcadores clicáveis com popups informativos de entregador, veículo e corrida ativa.

---

### 🔹 Task 7: Módulo do Entregador (`/entregador`) — Fila, Contato WhatsApp e Baixa por PIN
- **Objetivo:** Implementar a interface do motoboy para aceitar entregas, contactar munícipes e finalizar corridas com validação de PIN de segurança.
- **Entregáveis:**
  - Cards de corridas disponíveis e em andamento com dados de destino e paciente.
  - Botão de contato rápido via WhatsApp oficial (`wa.me`) com mensagem institucional pré-configurada.
  - Modal de validação de PIN com teclado numérico acessível.
  - Finalização da entrega com baixa imediata no status da SubOrder para `ENTREGUE`.
- **Critérios de Aceitação:**
  - [ ] Entregador só consegue finalizar a entrega se digitar o PIN exato daquela SubOrder.
  - [ ] Tentativa com PIN errado exibe alerta de erro claro e mantém a entrega aberta.
  - [ ] Conclusão da entrega atualiza a timeline do munícipe em tempo real.

---

### 🔹 Task 8: Integração Global End-to-End, Auditoria WCAG e Validação Final
- **Objetivo:** Realizar a checagem cruzada dos três módulos, testes de fluxo completo (Munícipe pede ➔ Farmácia divide ➔ Motoboy entrega Remessa A ➔ Farmácia repõe ➔ Motoboy entrega Remessa B) e auditoria de acessibilidade.
- **Entregáveis:**
  - Teste de fluxo ponta a ponta sem recarregar a página.
  - Auditoria de acessibilidade (tamanhos de clique de 48px, contraste de cores, tags ARIA).
  - Documentação final atualizada e commits sincronizados.
- **Critérios de Aceitação:**
  - [ ] Fluxo 1:N completo validado com sucesso.
  - [ ] Todos os módulos operam com reatividade compartilhada e persistência.
  - [ ] Conformidade com a identidade visual "Minha Indaiatuba".
