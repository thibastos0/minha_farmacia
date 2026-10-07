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
export type OrderStatus = 'PENDENTE_TRIAGEM' | 'EM_PROCESSAMENTO' | 'FINALIZADO' | 'CANCELADO';

export type SubOrderStatus = 
  | 'EM_SEPARACAO'          // Farmacêutico separou os itens disponíveis
  | 'AGUARDANDO_COLETA'     // Aguardando motoboy retirar na farmácia
  | 'SAIU_PARA_ENTREGA'     // A caminho da residência do munícipe
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
  label: string;              // Ex: "Remessa Imediata (Estoque Disponível)" vs "Remessa Reposição"
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
  vehicle: 'MOTO' | 'BICICLETA_ELETRICA' | 'CARRO';
  plate: string;
  phone: string;
  active: boolean;
  currentLocation: {
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

## 4. Transição de Estados e Reabastecimento Posterior

1. Quando o estoque de um medicamento é reabastecido pelo Farmacêutico no CRUD de Catálogo (`adicionar estoque`), o sistema verifica subpedidos no status `"AGUARDANDO_REPOSICAO"`.
2. Se o novo estoque cobrir a quantidade necessária, a remessa `SubOrder-B` é automaticamente promovida para `"EM_SEPARACAO"`, notificando o munícipe e disponibilizando a corrida para a frota de entregadores.
3. Ao finalizar a entrega de cada `SubOrder`, o entregador digita o respectivo PIN no painel `/entregador`. O sistema marca o subpedido como `"ENTREGUE"`.
4. Quando todos os subpedidos de um `Order` estiverem `"ENTREGUE"`, o pedido raiz é marcado como `"FINALIZADO"`.
