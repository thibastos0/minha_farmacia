# 📱 Especificação 03: Especificação Detalhada dos Três Módulos Desacoplados

## 1. Módulo 1: Portal do Cidadão (`/cidadao`)

O portal do munícipe é desenhado com foco total em simplicidade, baixa carga cognitiva e máxima acessibilidade para todas as idades (inclusive idosos e pessoas com deficiência).

### 1.1 Autenticação e Perfil Cidadão ID / Gov.br
- **Sem Recadastro:** O munícipe autentica-se diretamente via conta gov.br / Cidadão ID de Indaiatuba.
- **Dados Oficiais Pré-carregados:** Nome completo, CPF, número do Cartão Nacional de Saúde (SUS), telefone e endereço de entrega residencial em Indaiatuba (ex: Rua das Prímulas, 450 - Jardim Morada do Sol).
- **Área de Toque Amigável:** Todos os seletores e botões possuem altura mínima de 48px (`min-h-[48px]`).

### 1.2 Fluxo de Solicitação de Medicamentos
1. **Upload Rápido da Receita Médica:**
   - Botão grande de captura de foto / arquivo da receita (`aria-label="Tirar foto ou anexar receita médica"`).
   - Pré-visualização da imagem ou nome do arquivo com suporte a formatos JPG, PNG e PDF.
2. **Seleção Opcional de Medicamentos:**
   - Munícipe pode digitar o nome dos remédios prescritos ou deixar para o farmacêutico triar integralmente via imagem da receita.
3. **Confirmação e Envio:**
   - Botão de envio destacado em verde institucional (`#059669`).
   - Feedback em leitor de tela (`aria-live="polite"`) informando o número do protocolo gerado.

### 1.3 Histórico Completo de Pedidos e Remessas
- **Substituição de Tela Única por Lista de Histórico:**
  - O portal não restringe o munícipe à visualização de apenas um pedido. O cidadão pode consultar todo o seu histórico organizado em duas seções claras:
    1. **Pedidos em Andamento (`#client-orders-active`):** Exibe pedidos ativos com suas respectivas remessas em processo de triagem, separação, despacho ou rota de entrega, com indicador de contagem (`#active-orders-count`).
    2. **Histórico de Entregas (`#client-orders-history`):** Agrupa pedidos cujas remessas já foram totalmente entregues (`#history-orders-count`).
- **Cards Independentes por Remessa Desmembrada:**
  - Quando um pedido é desmembrado em 1:N, cada remessa (`SubOrder-A`, `SubOrder-B`) é apresentada em um card visualmente independente.
  - Cada card exibe:
    - Identificador da remessa (ex: `SUB-101-A`, `SUB-101-B`).
    - Medicamentos inclusos naquela remessa específica com dosagem e quantidade.
    - Status atualizado da remessa na esteira.
    - Card de PIN de 4 dígitos individualizado (`text-3xl font-mono tracking-widest font-black`).
    - Orientação acessível: *"Informe este código ao entregador apenas no momento em que receber seus remédios."*

### 1.4 Alerta e Banner de Desmembramento (Transparência Ativa)
- Sempre que um pedido possuir ao menos uma remessa no status `"AGUARDANDO_REPOSICAO"`, é renderizado no topo do card do pedido um banner de alerta destacado em amarelo/âmbar com borda e ícone de aviso:
  > **⚠️ Pedido Desmembrado:** A Remessa A está a caminho. A Remessa B será entregue assim que o estoque municipal for reposto.
- Essa abordagem elimina a ansiedade do munícipe, esclarecendo que o tratamento emergencial não foi interrompido e que a prefeitura se responsabiliza pela entrega complementar sem custos adicionais.

### 1.5 Linha do Tempo Transparente de 4 Etapas
A timeline do munícipe reflete com exatidão a evolução do pacote:
1. `Receita Recebida`: Pedido registrado e aguardando conferência do farmacêutico.
2. `Em Separação`: Receita aprovada e medicamentos sendo conferidos e embalados na Farmácia Central.
3. `Aguardando Coleta`: Pacote pronto no pátio da farmácia aguardando retirada pelo motoboy atribuído (exibe o nome do entregador).
4. `Saiu para Entrega`: Entregador iniciou o deslocamento em direção ao endereço cadastrado.
5. `Entregue`: Código PIN validado com sucesso e medicamentos dispensados ao munícipe.

---

## 2. Módulo 2: Painel do Farmacêutico e Gestão Municipal (`/farmacia`)

O painel da farmácia municipal atende os profissionais da saúde pública na conferência técnica das receitas, despacho de remessas e gerenciamento dos estoques.

### 2.1 Triagem Técnica Inteligente de Receitas
- **Fila de Pedidos Pendentes:** Listagem de solicitações ordenadas por data/urgência.
- **Visualizador de Receita Médica:** Painel lateral com imagem em alta resolução da prescrição enviada pelo cidadão.
- **Sugestão Automática RENAME:**
  - O modal de triagem pré-seleciona medicamentos sugeridos com base nos itens prescritos e no catálogo municipal.
  - Exibe o saldo de estoque atual de cada item em tempo real.
  - Alerta visual imediato caso a quantidade solicitada exceda o estoque disponível no almoxarifado.

### 2.2 Desmembramento Assistido (Order Splitting)
- Se qualquer item estiver com estoque zerado ou insuficiente:
  - O motor `splitEngine` calcula a partição automática 1:N:
    - **Remessa A (Disponível):** Itens com saldo positivo ➔ Avança para `EM_SEPARACAO`.
    - **Remessa B (Aguardando Reposição):** Itens sem estoque ➔ Registrado como `AGUARDANDO_REPOSICAO` com notificação ao almoxarifado.
  - O farmacêutico visualiza a prévia do desmembramento e confirma através do botão: `Aprovar com Desmembramento de Remessas`.

### 2.3 Fluxo de Despacho e Atribuição de Entregador (`#modal-despacho`)
- Na lista de pedidos em separação física (`EM_SEPARACAO`), o farmacêutico visualiza o botão de ação rápida:
  `"Despachar / Chamar Entregador"`.
- Ao clicar, abre o modal de despacho exibindo:
  - Código da remessa, endereço de entrega no município e nome do munícipe.
  - Opções de despacho flexíveis:
    1. **Disponibilizar para Frota Geral:** Qualquer entregador livre no pátio pode aceitar a corrida.
    2. **Atribuição Direta por Proximidade:** Lista dos motoboys municipais cadastrados ordenados por proximidade (ex: Marcos Vinicius - 1.2 km, Carlos Silva - 2.8 km, Roberto Almeida - 4.1 km), com exibição de placa do veículo e status em tempo real (`Livre / Disponível` ou `Em Rota`).
- Ao confirmar o despacho, a remessa avança para o status `"AGUARDANDO_RETIRADA"`, vincula o motoboy selecionado (se houver) e dispara notificação reativa para o módulo dos entregadores.

### 2.4 CRUD Completo do Catálogo e Reabastecimento Reativo
- **Aba "Catálogo / Estoque" (`#func-sub-estoque`):**
  - **Cadastro de Novos Medicamentos:** Modal acessível (`openModalNovoMedicamento()`) para cadastrar princípio ativo, dosagem, apresentação, categoria (Básico, Controlado, Contínuo, Antibiótico), estoque inicial e limite mínimo de alerta.
  - **Ajuste Rápido de Saldo:** Botões de incremento e decremento rápido (`+10`, `-10`, `+1`, `-1`) diretamente no card de cada medicamento.
  - **Inativação Lógica (Soft Delete):** Botão para inativar/reativar medicamentos mantendo o histórico de dispensações intacto.
  - **Gatilho de Reabastecimento Reativo:** Toda operação que adiciona estoque (`adjustStock`) aciona automaticamente a rotina `checkAndPromoteAwaitingOrders()`, promovendo remessas de `AGUARDANDO_REPOSICAO` para `EM_SEPARACAO` e atualizando o painel do munícipe em tempo real.

### 2.5 Dashboard e Monitoramento da Frota (Leaflet.js)
- Cards de indicadores com métricas em tempo real: Total de pedidos no dia, em trânsito, aguardando reposição e estoque crítico.
- Aba de mapa interativo com Leaflet.js integrando `invalidateSize()` no evento de exibição de aba, mostrando posições dos motoboys, farmácia central e munícipes.

---

## 3. Módulo 3: Painel do Entregador Municipal (`/entregador`)

Projetado no formato "estilo delivery / iFood", otimizado para operação em smartphones acoplados a motocicletas da frota municipal.

### 3.1 Arquitetura em Duas Abas do Módulo do Entregador
A tela do motoboy é organizada em duas visões complementares:
1. **📦 Pacotes Prontos na Central (`#entregador-tab-central`):**
   - Exibe remessas despachadas pela farmácia com status `"AGUARDANDO_RETIRADA"`.
   - Exibe endereço de entrega, bairro em Indaiatuba e distância até o munícipe.
   - **Botão de Ação Rápida:** `"Aceitar Corrida e Iniciar Rota"`.
   - Ao clicar, o motoboy assume a responsabilidade da entrega, vincula seu ID/nome e transiciona o status imediatamente para `"SAIU_PARA_ENTREGA"`.
2. **🛵 Minhas Entregas Ativas (`#entregador-tab-ativas`):**
   - Lista as corridas sob responsabilidade do motoboy em trânsito (`SAIU_PARA_ENTREGA`).
   - Apresenta detalhes do munícipe, itens inclusos no pacote lacrado e botões de interação direta (WhatsApp e Validação de PIN).

### 3.2 Contador / Badge em Tempo Real no Header
- No menu de navegação superior (`header`), o botão de acesso ao Entregador possui um badge numérico (`#nav-badge-entregador`).
- O badge é atualizado reativamente via `store.subscribe()` e reflete em tempo real o número de pacotes prontos na central aguardando coleta.
- Se houver pacotes prontos (> 0), o badge pulsa em amarelo/âmbar (`animate-pulse`) chamando a atenção do operador.

### 3.3 Botão de Contato Rápido via WhatsApp
- Botão verde destacado com o ícone oficial (`bg-emerald-600 text-white min-h-[48px]`).
- Gera link direto com a API oficial do WhatsApp (`https://wa.me/55...`):
  ```
  https://wa.me/5519999999999?text=Olá!%20Sou%20o%20entregador%20da%20Prefeitura%20de%20Indaiatuba%20(Minha%20Farmácia).%20Estou%20a%20caminho%20com%20sua%20remessa%20de%20medicamentos!
  ```

### 3.4 Validação Estrita de Entrega por PIN e Baixa no Sistema
- **Campo de Digitação do PIN de 4 Dígitos:**
  - Campo numérico acessível com foco otimizado para dispositivos móveis.
  - Validação estrita contra o `SubOrder.pinCode` registrado na remessa.
- **Regras de Validação:**
  - **PIN Correto:**
    - Status da `SubOrder` avança imediatamente para `"ENTREGUE"`.
    - Data/hora de entrega registrada (`deliveredAt`).
    - Remessa removida da lista de ativas e arquivada no histórico de entregas.
    - Notificação visual/sonora de sucesso.
  - **PIN Incorreto:**
    - Alerta de erro de alta visibilidade: *"PIN incorreto. Solicite ao morador o código de 4 dígitos exibido no aplicativo Minha Farmácia."*
    - Bloqueio de baixa no sistema até a digitação do código correto.
