# 📦 Especificação 02: Modelos de Dados e Motor de Desmembramento (Order Splitting 1:N)

## 1. Visão Geral da Regra de Negócio

No serviço público de saúde de Indaiatuba, é comum que uma receita médica contenha múltiplos medicamentos (ex: Losartana 50mg e Dipirona 500mg disponíveis no estoque imediato, mas Amoxicilina 500mg temporariamente em falta na unidade).

No modelo tradicional burocrático, o pedido todo ficaria travado ou o paciente precisaria retornar presencialmente. No **Minha Farmácia**, introduzimos o **Desmembramento Inteligente de Pedidos (Order Splitting 1:N)**:
1. O pedido original (`Order`) se ramifica em dois ou mais subpedidos (`SubOrder`).
2. Os medicamentos disponíveis no estoque da Farmácia Central são agrupados no **SubOrder-A**, que segue imediatamente para separação e entrega.
3. Os medicamentos em falta são agrupados no **SubOrder-B**, com status `"AGUARDANDO_REPOSICAO"`, gerando uma solicitação automática de reabastecimento logístico.
4. Cada `SubOrder` possui seu próprio ciclo de vida, rastreamento independente, entregador atribuído e **código PIN de validação único**.

---

## 2. Modelos de Entidades (TypeScript / Schema)

```typescript
// Status de Pedido Geral e SubPedidos
export type OrderStatus = 'PENDENTE_TRIAGEM' | 'EM_PROCESSAMENTO' | 'FINALIZADO' | 'CANCELADO' | 'RECUSADO';

export type SubOrderStatus = 
  | 'EM_SEPARACAO'          // Farmacêutico aprovou e os itens estão em separação física
  | 'AGUARDANDO_RETIRADA'   // Farmácia concluiu separação e despachou na Central, aguardando coleta
  | 'AGUARDANDO_COLETA'     // Alias/compatibilidade para aguardando retirada
  | 'SAIU_PARA_ENTREGA'     // Entregador aceitou a corrida e está em rota até a residência
  | 'AGUARDANDO_REPOSICAO'  // Medicamento em falta aguardando novo lote municipal
  | 'ENTREGUE'              // Entregue e confirmado com PIN
  | 'CANCELADO';            // Cancelado por inviabilidade técnica

// Munícipe / Cidadão
export interface Citizen {
  id: string;
  name: string;
  cpf: string;
  cartaoSus: string;
  phone: string;
  address: {
    street: string;
    number: string;
    neighborhood: string;
    city: string; // "Indaiatuba - SP"
    lat: number;
    lng: number;
  };
}

// Medicamento do Catálogo Municipal
export interface Medication {
  id: string;
  name: string;
  dosage: string;
  presentation: string; // Ex: "Comprimido", "Frasco 100ml"
  stockQuantity: number;
  minStockAlert: number;
  active: boolean;
  category: 'BASICO' | 'CONTROLADO' | 'CONTINUO' | 'ANTIBIOTICO';
}

// Item dentro do pedido
export interface OrderItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  quantityRequested: number;
  quantityApproved: number;
  isAvailable: boolean;
}

// SubPedido (Nó de Entrega / Desmembramento)
export interface SubOrder {
  id: string;
  orderId: string;
  code: string;               // Ex: "PED-2026-01-A", "PED-2026-01-B"
  label: string;              // Ex: "Remessa Imediata (Itens Prontos)" vs "Segunda Remessa"
  items: OrderItem[];
  status: SubOrderStatus;
  pinCode: string;            // Código numérico de 4 dígitos para entrega (Ex: "4921")
  courierId?: string;         // ID do motoboy responsável
  courierName?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
}

// Pedido Raiz (Solicitação do Munícipe)
export interface Order {
  id: string;
  code: string;               // Ex: "PED-2026-01"
  citizenId: string;
  citizenName: string;
  citizenCpf: string;
  citizenPhone: string;
  deliveryAddress: Citizen['address'];
  prescriptionImageUrl: string;
  status: OrderStatus;
  rejectionReason?: string;
  isSplit: boolean;           // Indica se o pedido foi desmembrado em 1:N
  splitReason?: string;
  subOrders: SubOrder[];
  createdAt: string;
  reviewedByPharmacistId?: string;
  reviewedAt?: string;
}

// Entregador Municipal
export interface Courier {
  id: string;
  name: string;
  vehicle?: 'MOTO' | 'BICICLETA_ELETRICA' | 'CARRO';
  plate?: string;
  phone?: string;
  active?: boolean;
  status?: 'DISPONIVEL' | 'EM_ROTA' | 'OFFLINE';
  currentLat?: number;
  currentLng?: number;
  currentLocation?: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
}
```

---

## 3. Algoritmo do Motor de Desmembramento (`splitEngine`)

```typescript
export interface SplitResult {
  isSplit: boolean;
  subOrders: SubOrder[];
  stockDeductions: { medicationId: string; quantity: number }[];
}

export function evaluateAndSplitOrder(
  order: Order,
  triageDecisions: { medicationId: string; approvedQty: number }[],
  currentCatalog: Medication[]
): SplitResult {
  const availableItems: OrderItem[] = [];
  const awaitingRestockItems: OrderItem[] = [];
  const stockDeductions: { medicationId: string; quantity: number }[] = [];

  for (const decision of triageDecisions) {
    const med = currentCatalog.find(m => m.id === decision.medicationId);
    if (!med || decision.approvedQty <= 0) continue;

    const availableQty = Math.min(med.stockQuantity, decision.approvedQty);
    const deficitQty = decision.approvedQty - availableQty;

    if (availableQty > 0) {
      availableItems.push({
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        quantityRequested: decision.approvedQty,
        quantityApproved: availableQty,
        isAvailable: true
      });
      stockDeductions.push({ medicationId: med.id, quantity: availableQty });
    }

    if (deficitQty > 0) {
      awaitingRestockItems.push({
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        quantityRequested: decision.approvedQty,
        quantityApproved: deficitQty,
        isAvailable: false
      });
    }
  }

  const subOrders: SubOrder[] = [];
  const isSplit = availableItems.length > 0 && awaitingRestockItems.length > 0;

  // Remessa A: Itens Disponíveis Imediatamente
  if (availableItems.length > 0) {
    subOrders.push({
      id: `${order.id}-A`,
      orderId: order.id,
      code: isSplit ? `${order.code}-A` : order.code,
      label: isSplit ? 'Remessa Imediata (Itens Prontos)' : 'Entrega Padrão',
      items: availableItems,
      status: 'EM_SEPARACAO',
      pinCode: generateSecurePin(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Remessa B: Itens Aguardando Reposição na Unidade Municipal
  if (awaitingRestockItems.length > 0) {
    subOrders.push({
      id: `${order.id}-B`,
      orderId: order.id,
      code: `${order.code}-B`,
      label: 'Segunda Remessa (Aguardando Reposição no Estoque)',
      items: awaitingRestockItems,
      status: 'AGUARDANDO_REPOSICAO',
      pinCode: generateSecurePin(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notes: 'Medicamento em reabastecimento logístico junto à Farmácia Central.'
    });
  }

  return { isSplit, subOrders, stockDeductions };
}

function generateSecurePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
```

---

## 4. Máquina de Estados e Ciclo de Vida da Entrega

O fluxo de despacho e entrega é modelado através de uma máquina de estados finita (State Machine) com gatilhos reativos claros entre Farmácia, Entregador e Cidadão:

```mermaid
stateDiagram-v2
    [*] --> PENDENTE_TRIAGEM: Munícipe anexa e envia receita médica
    PENDENTE_TRIAGEM --> EM_SEPARACAO: Farmacêutico aprova remessa com estoque
    PENDENTE_TRIAGEM --> AGUARDANDO_REPOSICAO: Item com estoque insuficiente (Remessa B)
    PENDENTE_TRIAGEM --> RECUSADO: Farmacêutico reprova receita (com justificativa)

    AGUARDANDO_REPOSICAO --> EM_SEPARACAO: Reabastecimento reativo via CRUD de catálogo
    
    EM_SEPARACAO --> AGUARDANDO_RETIRADA: Farmácia despacha / chama entregador (Frota Geral ou específico)
    AGUARDANDO_RETIRADA --> SAIU_PARA_ENTREGA: Motoboy aceita corrida no painel estilo iFood
    SAIU_PARA_ENTREGA --> ENTREGUE: Motoboy digita e valida o PIN de 4 dígitos do munícipe
    
    ENTREGUE --> [*]: Pedido raiz finalizado quando todas as remessas são entregues
```

---

## 5. Regras do Fluxo de Despacho (Farmácia ➔ Entregador ➔ Cidadão)

### 5.1 Despacho pela Farmácia (`EM_SEPARACAO` ➔ `AGUARDANDO_RETIRADA`)
1. Ao concluir a separação física dos medicamentos no almoxarifado, o farmacêutico aciona o botão **"Despachar / Chamar Entregador"** na linha da remessa correspondente.
2. É exibida a modal **"Atribuir Entregador & Despachar Remessa"** contendo o código da remessa, munícipe e endereço de entrega.
3. O farmacêutico seleciona a estratégia de despacho:
   - **Disponibilizar para Frota Geral (Recomendado):** O pacote fica aberto para aceite imediato de qualquer entregador municipal disponível.
   - **Atribuição Direta por Proximidade:** Seleção direta de um motoboy específico da frota municipal (ex: *Marcos Vinicius - Moto 01*, *Carlos Silva - Moto 02* ou *Roberto Almeida - Moto 03*).
4. Ao confirmar o despacho:
   - O status da `SubOrder` passa para `'AGUARDANDO_RETIRADA'`.
   - Se atribuído a um motoboy específico, os campos `courierId` e `courierName` são associados.
   - O evento dispara notificação reativa no `StateStore`, atualizando instantaneamente os contadores globais e o badge numérico no cabeçalho do módulo do entregador.

### 5.2 Aceite da Corrida pelo Entregador (`AGUARDANDO_RETIRADA` ➔ `SAIU_PARA_ENTREGA`)
1. O motoboy acessa o módulo `/entregador` na aba **"📦 Pacotes Prontos na Central"**.
2. Cada remessa em `AGUARDANDO_RETIRADA` exibe os itens da embalagem, endereço do munícipe e o botão **"Aceitar Corrida e Iniciar Rota"**.
3. Ao clicar:
   - O status da remessa muda para `'SAIU_PARA_ENTREGA'`.
   - O entregador logado é registrado como responsável pela corrida e seu status passa para `'EM_ROTA'`.
   - A remessa é transferida automaticamente para a aba **"🛵 Minhas Entregas Ativas"**.
   - O motoboy conta com atalho direto de WhatsApp para avisar o morador sobre o deslocamento.

### 5.3 Transparência e Timeline no Portal do Cidadão
A linha do tempo do munícipe reflete a transição transparente das 4 etapas:
1. **Em Separação:** Remessa aprovada pelo farmacêutico em preparação física.
2. **Aguardando Coleta pelo Entregador [Nome do Entregador ou Frota Geral]:** Pacote selado aguardando retirada no pátio da farmácia.
3. **Saiu para Entrega:** Motoboy em deslocamento com o pacote.
4. **Entregue:** Concluído mediante conferência física do código PIN de 4 dígitos.

### 5.4 Conclusão Segura com PIN de 4 Dígitos
1. Cada `SubOrder` possui um código PIN aleatório e único de 4 dígitos (ex: `4921`).
2. O PIN é exibido com exclusividade na tela do munícipe. O entregador **não tem acesso prévio ao PIN**.
3. Na entrega presencial, o munícipe informa o PIN ao entregador, que o digita no aplicativo.
4. Validação estrita:
   - PIN correto ➔ transição para `'ENTREGUE'` e persistência em `localStorage`.
   - PIN incorreto ➔ mensagem de erro acessível e remessa permanece em aberto.
5. Quando todas as remessas do pedido estiverem `'ENTREGUE'`, o status do pedido principal é consolidado como `'FINALIZADO'`.
