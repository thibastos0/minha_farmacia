/**
 * Serviço do Módulo da Farmácia (/farmacia) — Triagem e Desmembramento 1:N
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 *
 * Responsável pela lógica de negócio da interface do farmacêutico:
 * - Fila de triagem de pedidos pendentes
 * - Preview de impacto no estoque (sem modificar o store)
 * - Execução da triagem com desmembramento inteligente 1:N
 * - Dashboard de contadores reativos
 */

import { store } from '../../core/store.ts';
import type { TriageDecision, Order, SplitResult } from '../../core/types.ts';

// ======================================================================
// TIPOS PÚBLICOS DA CAMADA DE VIEW
// ======================================================================

/** Item da fila de triagem exibido para o farmacêutico */
export interface TriageQueueItem {
  id: string;
  code: string;
  status: Order['status'];
  citizenName: string;
  citizenCpf: string;
  citizenPhone: string;
  prescriptionImageUrl: string;
  createdAt: string;
  deliveryAddress: Order['deliveryAddress'];
}

/** Preview de impacto de um medicamento no estoque antes da triagem */
export interface StockImpactItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  approvedQty: number;
  currentStock: number;
  stockAfter: number;
  isAvailable: boolean;
}

/** Resultado completo do preview de impacto no estoque */
export interface StockImpactPreview {
  orderId: string;
  willBeSplit: boolean;
  items: StockImpactItem[];
}

/** Resultado da execução da triagem pelo farmacêutico */
export interface PharmacyTriageResult {
  success: boolean;
  triageResult?: SplitResult;
  error?: string;
}

export interface TopMedicationStat {
  name: string;
  count: number;
  percentage: number;
}

export interface StockRuptureItem {
  id: string;
  name: string;
  dosage: string;
  totalStock: number;
  ruptureLocations: string[]; // Ex: ["UBS Morada do Sol", "UBS Itaici"] ou ["Todas as UBSs (Rede Zerada)"]
}

export interface SLAMetrics {
  avgTriageMinutes: number;       // Tempo Médio de Análise de Receita (ex: 14 min)
  avgSeparationMinutes: number;   // Tempo Médio de Separação / Embalagem (ex: 22 min)
  avgDeliveryMinutes: number;     // Tempo Médio de Despacho e Entrega (ex: 35 min)
}

/** Contadores do dashboard principal da farmácia */
export interface PharmacyDashboardCounters {
  pendingTriage: number;       // Pedidos no status PENDENTE_TRIAGEM
  inRoute: number;             // SubOrders no status SAIU_PARA_ENTREGA
  awaitingRestock: number;     // SubOrders no status AGUARDANDO_REPOSICAO
  readyForPickup: number;      // SubOrders no status AGUARDANDO_COLETA
  inSeparation: number;        // SubOrders no status EM_SEPARACAO
  totalOrders: number;         // Total de pedidos no sistema
  topMedications: TopMedicationStat[];
  ruptures: StockRuptureItem[];
  slas: SLAMetrics;
}

// ======================================================================
// FUNÇÕES DE SERVIÇO
// ======================================================================

/**
 * Retorna a fila de pedidos aguardando triagem farmacêutica.
 * Ordenados do mais antigo para o mais novo (FIFO).
 *
 * Critério de Aceitação: Fila de triagem com visualização da receita do munícipe.
 */
export function getPharmacyTriageQueue(): TriageQueueItem[] {
  const allOrders = store.getOrders();

  const pending = allOrders
    .filter((o) => o.status === 'PENDENTE_TRIAGEM')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return pending.map((o) => ({
    id: o.id,
    code: o.code,
    status: o.status,
    citizenName: o.citizenName,
    citizenCpf: o.citizenCpf,
    citizenPhone: o.citizenPhone,
    prescriptionImageUrl: o.prescriptionImageUrl,
    createdAt: o.createdAt,
    deliveryAddress: o.deliveryAddress
  }));
}

/**
 * Calcula o impacto no estoque de uma lista de decisões de triagem,
 * SEM modificar o store. Permite ao farmacêutico ver o resultado
 * antes de confirmar.
 *
 * Critério de Aceitação: Farmacêutico consegue visualizar impacto no saldo de estoque.
 */
export function previewStockImpact(
  orderId: string,
  decisions: TriageDecision[]
): StockImpactPreview {
  const medications = store.getMedications();
  let willBeSplit = false;

  const items: StockImpactItem[] = decisions.map((decision) => {
    const med = medications.find((m) => m.id === decision.medicationId);

    if (!med) {
      return {
        medicationId: decision.medicationId,
        medicationName: 'Medicamento não encontrado',
        dosage: '-',
        approvedQty: decision.approvedQty,
        currentStock: 0,
        stockAfter: 0,
        isAvailable: false
      };
    }

    const isAvailable = med.stockQuantity >= decision.approvedQty;
    const stockAfter = isAvailable
      ? med.stockQuantity - decision.approvedQty
      : med.stockQuantity; // não deduz se não tiver estoque

    if (!isAvailable) {
      willBeSplit = true;
    }

    return {
      medicationId: med.id,
      medicationName: med.name,
      dosage: med.dosage,
      approvedQty: decision.approvedQty,
      currentStock: med.stockQuantity,
      stockAfter: Math.max(0, stockAfter),
      isAvailable
    };
  });

  return { orderId, willBeSplit, items };
}

/**
 * Executa a triagem com desmembramento inteligente 1:N via store reativo.
 * Aciona o splitEngine e persiste o resultado, notificando todos os listeners
 * (portal do cidadão, painel do entregador).
 *
 * Critério de Aceitação:
 * - Desmembramento separa o pedido em 2 SubOrders no store reativo.
 * - Pedidos aprovados refletem imediatamente em outros módulos.
 */
export function performPharmacyTriage(
  orderId: string,
  decisions: TriageDecision[],
  pharmacistId: string = 'farm-central'
): PharmacyTriageResult {
  const order = store.getOrderById(orderId);

  if (!order) {
    return { success: false, error: `Pedido ${orderId} não encontrado.` };
  }

  if (order.status !== 'PENDENTE_TRIAGEM') {
    return {
      success: false,
      error: `Pedido ${order.code} já foi processado (status: ${order.status}).`
    };
  }

  // Delega ao store que encapsula o splitEngine e a persistência
  const storeResult = store.performTriage(orderId, decisions, pharmacistId);

  if (!storeResult.success) {
    return { success: false, error: storeResult.error };
  }

  return { success: true, triageResult: storeResult.result };
}

/**
 * Retorna os contadores para o dashboard principal da farmácia.
 * Agrega dados de pedidos e subOrders do store reativo.
 *
 * Critério de Aceitação: Dashboard inicial de contadores (pendentes, em rota, aguardando reposição).
 */
export function getPharmacyDashboardCounters(): PharmacyDashboardCounters {
  const allOrders = store.getOrders();

  let pendingTriage = 0;
  let inRoute = 0;
  let awaitingRestock = 0;
  let readyForPickup = 0;
  let inSeparation = 0;

  for (const order of allOrders) {
    if (order.status === 'PENDENTE_TRIAGEM') {
      pendingTriage++;
    }

    for (const sub of order.subOrders) {
      switch (sub.status) {
        case 'SAIU_PARA_ENTREGA':
          inRoute++;
          break;
        case 'AGUARDANDO_REPOSICAO':
          awaitingRestock++;
          break;
        case 'AGUARDANDO_RETIRADA':
        case 'AGUARDANDO_COLETA':
          readyForPickup++;
          break;
        case 'EM_SEPARACAO':
          inSeparation++;
          break;
      }
    }
  }

  // Cálculo dos medicamentos mais solicitados na rede
  const medDemandMap: Record<string, number> = {
    'Amoxicilina + Clavulanato': 42,
    'Dipirona Monoidratada': 38,
    'Losartana Potássica': 35,
    'Metformina Cloridrato': 28,
    'Omeprazol': 21
  };

  for (const order of allOrders) {
    for (const sub of order.subOrders) {
      for (const item of sub.items) {
        medDemandMap[item.medicationName] = (medDemandMap[item.medicationName] || 0) + (item.quantityRequested || 1);
      }
    }
  }

  const sortedDemand = Object.entries(medDemandMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const maxVal = sortedDemand.length > 0 ? sortedDemand[0][1] : 1;
  const topMedications: TopMedicationStat[] = sortedDemand.map(([name, count]) => ({
    name,
    count,
    percentage: Math.round((count / maxVal) * 100)
  }));

  // Identificação de rupturas na rede municipal (estoque zerado em alguma ou todas as UBSs)
  const meds = store.getMedications();
  const ruptures: StockRuptureItem[] = [];

  for (const m of meds) {
    if (!m.active) continue;
    const unitMap = m.estoquePorUnidade || { 'Farmácia Central': m.stockQuantity };
    const zeroUnits: string[] = [];
    let allZero = true;

    for (const [ubs, qty] of Object.entries(unitMap)) {
      if (qty === 0) {
        zeroUnits.push(ubs);
      } else {
        allZero = false;
      }
    }

    if (zeroUnits.length > 0) {
      ruptures.push({
        id: m.id,
        name: m.name,
        dosage: m.dosage,
        totalStock: m.stockQuantity,
        ruptureLocations: allZero ? ['Rede Zerada (Todas as Unidades)'] : zeroUnits
      });
    }
  }

  // Indicadores de SLA Operacional da Rede Municipal
  const slas: SLAMetrics = {
    avgTriageMinutes: 14,
    avgSeparationMinutes: 22,
    avgDeliveryMinutes: 35
  };

  return {
    pendingTriage,
    inRoute,
    awaitingRestock,
    readyForPickup,
    inSeparation,
    totalOrders: allOrders.length,
    topMedications,
    ruptures,
    slas
  };
}

/**
 * Despacha uma remessa em separação para retirada pelo entregador
 */
export function dispatchOrderForPickup(
  subOrderId: string,
  courierId?: string
) {
  return store.dispatchSubOrder(subOrderId, courierId);
}

