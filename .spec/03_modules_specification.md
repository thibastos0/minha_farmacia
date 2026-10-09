# 📱 Especificação 03: Especificação Detalhada dos Três Módulos Desacoplados

## 1. Módulo 1: Portal do Cidadão (`/cidadao`)

O portal do munícipe é desenhado com foco total em simplicidade, baixa carga cognitiva e máxima acessibilidade para todas as idades (inclusive idosos e pessoas com deficiência).

### 1.1 Autenticação e Perfil Cidadão ID / Gov.br
- **Sem Recadastro:** O munícipe autentica-se diretamente via conta gov.br / Cidadão ID de Indaiatuba.
- **Dados Oficiais Pré-carregados:** Nome completo, CPF, número do Cartão Nacional de Saúde (SUS), telefone e endereço de entrega residencial em Indaiatuba (ex: Rua das Acácias, 142 - Jardim Morada do Sol).
- **Área de Toque Amigável:** Todos os seletores e botões possuem altura mínima de 48px (`min-h-[48px]`).

### 1.2 Fluxo de Solicitação de Medicamentos
1. **Upload Rápido da Receita Médica:**
   - Botão grande de captura de foto / arquivo da receita (`aria-label="Tirar foto ou anexar receita médica"`).
   - Pré-visualização da imagem com suporte a formatos JPG, PNG e PDF.
2. **Seleção Opcional de Medicamentos:**
   - Munícipe pode digitar o nome dos remédios prescritos ou deixar para o farmacêutico triar integralmente via imagem da receita.
3. **Confirmação e Envio:**
   - Botão de envio destacado em verde institucional (`#059669`).
   - Feedback em leitor de tela (`aria-live="polite"`) informando o número do protocolo gerado.

### 1.3 Histórico Completo de Pedidos e Remessas
- **Organização em Duas Seções Claras:**
  1. **Pedidos em Andamento (`#client-orders-active`):** Exibe pedidos ativos com suas respectivas remessas em processo de triagem, separação, despacho ou rota de entrega, com indicador de contagem (`#active-orders-count`).
  2. **Histórico de Entregas (`#client-orders-history`):** Agrupa pedidos cujas remessas já foram totalmente entregues (`#history-orders-count`).
- **Cards Independentes por Remessa Desmembrada:**
  - Quando um pedido é desmembrado em 1:N, cada remessa (`SubOrder-A`, `SubOrder-B`) é apresentada em um card visualmente independente.
  - Cada card exibe:
    - Identificador da remessa (ex: `PED-2026-01-A`, `PED-2026-01-B`).
    - Medicamentos inclusos naquela remessa específica com dosagem e quantidade.
    - Status atualizado da remessa na esteira.
    - Card de PIN de 4 dígitos individualizado (`text-3xl font-mono tracking-widest font-black`).
    - Botão de ação institucional **"Ver Detalhes do Pedido e Remessas"** abrindo o modal informativo completo (`#modal-detalhes-ml`).

### 1.4 Alerta e Banner de Desmembramento (Transparência Ativa)
- Sempre que um pedido possuir ao menos uma remessa no status `"AGUARDANDO_REPOSICAO"`, é renderizado no topo do card do pedido um banner de alerta destacado em amarelo/âmbar com borda e ícone de aviso:
  > **⚠️ Pedido Desmembrado:** A Remessa A está a caminho. A Remessa B será entregue assim que o estoque municipal for reposto.

---

## 2. Módulo 2: Painel do Farmacêutico e Gestão Municipal (`/farmacia`)

O painel da farmácia municipal atende os profissionais da saúde pública na conferência técnica das receitas, despacho de remessas e gerenciamento dos estoques.

### 2.1 Triagem Técnica e Inspeção Sanitária (RDC 44/2009)
- **Fila de Pedidos Pendentes:** Tabela de solicitações com botão **"Validar Receita"** e atalho **"📄 Receita Médica"**, ambos acionando a função `openModalValidacao(orderId)`.
- **Modal de Validação da Receita SUS (`#modal-validacao`):**
  - Renderiza a simulação visual da receita médica oficial do SUS com timbre de Indaiatuba, identificação do médico (CRM-SP), dados do paciente e posologia.
  - Botão de transição **"Aprovar e Selecionar Medicamentos"** direciona o farmacêutico para o cálculo de desmembramento.
  - Botão **"Reprovar Pedido"** exige o preenchimento de justificativa técnica sanitária (`#modal-recusa`).

### 2.2 Desmembramento Assistido (Order Splitting)
- Se qualquer item estiver com estoque zerado ou insuficiente:
  - O motor `splitEngine` calcula a partição automática 1:N:
    - **Remessa A (Disponível):** Itens com saldo positivo ➔ Avança para `EM_SEPARACAO`.
    - **Remessa B (Aguardando Reposição):** Itens sem estoque ➔ Registrado como `AGUARDANDO_REPOSICAO` com notificação ao almoxarifado.

### 2.3 Fluxo de Despacho e Atribuição de Entregador (`#modal-despacho`)
- Na lista de pedidos em separação física (`EM_SEPARACAO`), o farmacêutico aciona o botão **"Despachar / Chamar Entregador"**.
- O modal exibe opções flexíveis:
  1. **Disponibilizar para Frota Geral:** Fica aberto para aceite de qualquer motoboy livre.
  2. **Atribuição Direta por Proximidade:** Seleção nominal de entregadores com indicação de distância e status (`Livre / Disponível` ou `Em Rota`).
- Ao confirmar, a remessa transiciona para `'AGUARDANDO_RETIRADA'`.

### 2.4 CRUD do Catálogo e Reabastecimento Reativo
- **Aba "Catálogo / Estoque" (`#func-sub-estoque`):**
  - Cadastro de novos itens da RENAME (`openModalNovoMedicamento()`).
  - Ajuste rápido de saldo (`+10`, `-10`, `+1`, `-1`).
  - Inativação lógica (soft delete).
  - Reabastecimento reativo: adicionar saldo em item zerado promove automaticamente remessas de `AGUARDANDO_REPOSICAO` para `EM_SEPARACAO`.

---

## 3. Módulo 3: Painel do Entregador Municipal (`/entregador`)

Otimizado para operação em smartphones acoplados aos veículos da frota municipal de saúde.

### 3.1 Arquitetura em Duas Abas
1. **📦 Pacotes Prontos na Central (`#entregador-tab-central`):**
   - Exibe remessas despachadas com status `"AGUARDANDO_RETIRADA"`.
   - Botão **"Aceitar Corrida e Iniciar Rota"** atribui a entrega ao motoboy e avança o status para `"SAIU_PARA_ENTREGA"`.
2. **🛵 Minhas Entregas Ativas (`#entregador-tab-ativas`):**
   - Lista as corridas sob responsabilidade do motoboy em trânsito.
   - Botão direto de contato via WhatsApp com mensagem institucional.
   - Campo para digitação e conferência do PIN de 4 dígitos.

### 3.2 Contador / Badge em Tempo Real no Header
- O badge no cabeçalho superior (`#nav-badge-entregador`) e nas abas reflete reativamente o número de pacotes prontos na central, pulsando visualmente quando houver corridas disponíveis.

### 3.3 Validação Estrita de Entrega por PIN
- **PIN Correto:** A remessa transiciona para `"ENTREGUE"`, grava a data/hora e atualiza em tempo real a visualização do cidadão e os contadores da farmácia.
- **PIN Incorreto:** Emite alerta sonoro/visual de bloqueio, impedindo a finalização indevida da corrida.
