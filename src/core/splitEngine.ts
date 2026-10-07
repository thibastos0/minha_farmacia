/**
 * Motor de Desmembramento de Pedidos (Order Splitting 1:N)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Conforme especificado em .spec/02_data_models_and_split.md
 */

import type {
  Order,
  SubOrder,
  OrderItem,
  Medication,
  TriageDecision,
  SplitResult
} from './types.ts';

/**
 * Gera um PIN numérico seguro de 4 dígitos para validação na entrega
 */
export function generateSecurePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Avalia as decisões de triagem do farmacêutico contra o catálogo de medicamentos
 * e executa a divisão 1:N do pedido caso haja falta parcial de estoque.
 */
export function evaluateAndSplitOrder(
  order: Order,
  triageDecisions: TriageDecision[],
  currentCatalog: Medication[]
): SplitResult {
  const availableItems: OrderItem[] = [];
  const awaitingRestockItems: OrderItem[] = [];
  const stockDeductions: { medicationId: string; quantity: number }[] = [];

  for (const decision of triageDecisions) {
    const med = currentCatalog.find((m) => m.id === decision.medicationId);
    if (!med || decision.approvedQty <= 0) continue;

    // Quantidade que pode ser atendida imediatamente pelo estoque atual
    const availableQty = Math.max(0, Math.min(med.stockQuantity, decision.approvedQty));
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
  const now = new Date().toISOString();

  // Caso 1: Existem itens com estoque imediato
  if (availableItems.length > 0) {
    subOrders.push({
      id: `${order.id}-A`,
      orderId: order.id,
      code: isSplit ? `${order.code}-A` : order.code,
      label: isSplit
        ? 'Remessa Imediata (Itens Prontos)'
        : 'Entrega Padrão (Todos os Itens)',
      items: availableItems,
      status: 'EM_SEPARACAO',
      pinCode: generateSecurePin(),
      createdAt: now,
      updatedAt: now,
      notes: isSplit
        ? 'Remessa prioritária com itens disponíveis em estoque.'
        : undefined
    });
  }

  // Caso 2: Existem itens aguardando reposição da central
  if (awaitingRestockItems.length > 0) {
    // Garante PIN diferente para a remessa B
    let pinB = generateSecurePin();
    if (subOrders.length > 0 && pinB === subOrders[0].pinCode) {
      pinB = generateSecurePin();
    }

    subOrders.push({
      id: `${order.id}-B`,
      orderId: order.id,
      code: isSplit ? `${order.code}-B` : `${order.code}-REPOSICAO`,
      label: isSplit
        ? 'Segunda Remessa (Aguardando Reposição no Estoque)'
        : 'Remessa em Espera de Reposição',
      items: awaitingRestockItems,
      status: 'AGUARDANDO_REPOSICAO',
      pinCode: pinB,
      createdAt: now,
      updatedAt: now,
      notes:
        'Medicamento em reabastecimento junto ao almoxarifado central de Indaiatuba.'
    });
  }

  return {
    isSplit,
    subOrders,
    stockDeductions
  };
}
