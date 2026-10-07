# 📱 Especificação 03: Especificação Detalhada dos Três Módulos Desacoplados

## 1. Módulo 1: Portal do Cidadão (`/cidadao`)

O portal do munícipe é desenhado com foco total em simplicidade, baixa carga cognitiva e máxima acessibilidade para todas as idades (inclusive idosos e pessoas com deficiência).

### 1.1 Autenticação e Perfil Cidadão ID / Gov.br
- **Sem Recadastro:** O munícipe autentica-se diretamente via conta gov.br / Cidadão ID de Indaiatuba.
- **Dados Oficiais Pré-carregados:** Nome completo, CPF, número do Cartão Nacional de Saúde (SUS), telefone e endereço de entrega residencial em Indaiatuba (ex: Rua das Acácias, Jardim Morada do Sol).
- **Área de Toque Amigável:** Todos os seletores e botões possuem altura mínima de 48px (`min-h-[48px]`).

### 1.2 Fluxo de Solicitação de Medicamentos
1. **Upload Rápido da Receita Médica:**
   - Botão grande de captura de foto / arquivo da receita (`aria-label="Tirar foto ou anexar receita médica"`).
   - Pré-visualização da imagem com opção de zoom ou exclusão.
2. **Seleção Opcional de Medicamentos:**
   - Munícipe pode digitar o nome dos remédios prescritos ou deixar para o farmacêutico triar integralmente via imagem da receita.
3. **Confirmação e Envio:**
   - Botão de envio destacado em verde institucional (`#059669`).
   - Feedback em leitor de tela (`aria-live="polite"`) informando o número do protocolo gerado.

### 1.3 Acompanhamento de Pedido, Notificação de Desmembramento e PIN
- **Timeline Limpa:**
  - Etapas visuais claras: `Receita Recebida` ➔ `Em Separação` ➔ `Saiu para Entrega` ➔ `Entregue`.
- **Notificação de Desmembramento (Transparência Ativa):**
  - Se o pedido for dividido em 1:N por falta de algum item no estoque local, o app exibe um card destacado em amarelo pastel:
    > *"Atenção: Para você não ficar sem seu tratamento, seu pedido foi dividido em 2 remessas. Os remédios disponíveis já estão a caminho! O item em falta será entregue assim que o lote chegar."*
- **Exibição do Código PIN de Entrega:**
  - Card centralizado com destaque visual (`bg-slate-900 text-white` ou `bg-emerald-900 text-emerald-200`) mostrando o PIN de 4 dígitos em tipografia grande (`text-3xl font-mono tracking-widest`).
  - Instrução acessível: *"Informe este código ao entregador apenas no momento em que receber seus remédios."*
  - Se houver `SubOrder-A` e `SubOrder-B`, cada remessa exibe seu respectivo PIN de forma independente e explicativa.

---

## 2. Módulo 2: Painel do Farmacêutico e Gestão Municipal (`/farmacia`)

O painel da farmácia municipal atende os profissionais da saúde pública na conferência técnica das receitas e gerenciamento dos estoques.

### 2.1 Triagem Técnica de Receitas
- **Fila de Pedidos Pendentes:** Listagem de solicitações ordenadas por urgência e horário de chegada.
- **Visualizador de Receita Médica:** Painel lateral com imagem em alta resolução da prescrição.
- **Conferência de Itens e Estoque em Tempo Real:**
  - O farmacêutico seleciona os medicamentos prescritos no catálogo municipal.
  - O sistema exibe o saldo de estoque atual de cada item.
  - Indicador visual automático caso a quantidade solicitada exceda o estoque disponível.

### 2.2 Desmembramento Assistido (Order Splitting)
- Se um dos itens estiver com estoque insuficiente:
  - O sistema sugere automaticamente a divisão do pedido:
    - `Remessa 1 (Imediata)`: Itens com estoque positivo ➔ Segue para separação física e motoboy.
    - `Remessa 2 (Aguardando Reposição)`: Itens esgotados ➔ Fica em espera no painel com alerta para o almoxarifado.
  - Botão de ação explícito: `Aprovar com Desmembramento de Remessas`.

### 2.3 Dashboard Gerencial de Indicadores
- **Cards de Métricas:**
  - Total de pedidos no dia.
  - Pedidos em trânsito com a frota de entregadores.
  - Subpedidos aguardando reposição de estoque.
  - Medicamentos em alerta de estoque crítico (< quantidade mínima de segurança).

---

## 3. Módulo 3: Painel do Entregador Municipal (`/entregador`)

Projetado para operação rápida em smartphones ou dispositivos acoplados à motocicleta do entregador da prefeitura.

### 3.1 Painel de Corridas e Roteirização
- **Fila de Corridas Atribuídas:**
  - Exibe cartões de remessa com nome do munícipe, bairro de Indaiatuba, distância estimada e lista de pacotes lacrados.
- **Status da Corrida:**
  - Botão de ação rápida: `Iniciar Rota até o Munícipe`.
  - Atualização automática do status da `SubOrder` para `"SAIU_PARA_ENTREGA"`.

### 3.2 Botão de Contato Rápido via WhatsApp
- Botão destacado com o ícone do WhatsApp (`bg-green-600 text-white min-h-[48px]`).
- Gera link direto com a API oficial do WhatsApp (`https://wa.me/55...`):
  ```
  https://wa.me/5519999999999?text=Olá!%20Sou%20o%20entregador%20da%20Prefeitura%20de%20Indaiatuba%20(Minha%20Farmácia).%20Estou%20a%20caminho%20com%20sua%20remessa%20de%20medicamentos!
  ```

### 3.3 Validação de Entrega por PIN e Baixa no Sistema
- **Modal / Campo de Validação de PIN:**
  - Campo numérico de 4 dígitos com teclado virtual / numérico acessível.
  - Validação instantânea contra o `SubOrder.pinCode`.
- **Regra de Segurança:**
  - Se o PIN estiver correto: O status da `SubOrder` avança para `"ENTREGUE"`, exibe mensagem de sucesso com confirmação sonora/visual e remove a corrida da fila ativa.
  - Se o PIN estiver incorreto: Exibe alerta visual acessível com texto em alto contraste: *"PIN incorreto. Solicite ao morador o código de 4 dígitos exibido no aplicativo Minha Farmácia."*
