/**
 * Serviço do Módulo do Cidadão (/cidadao)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 *
 * Responsável pela lógica de negócio do portal do munícipe:
 * - Submissão de receita médica via upload
 * - Visualização de pedidos e subOrders (remessas) com PINs
 * - Informações do banner de desmembramento transparente
 */

import { store } from '../../core/store.ts';
import type { SubOrder } from '../../core/types.ts';

// ======================================================================
// TIPOS PÚBLICOS DA CAMADA DE VIEW (para o componente de UI)
// ======================================================================

export interface SubOrderView {
  id: string;
  code: string;
  label: string;
  status: SubOrder['status'];
  pinCode: string;
  items: SubOrder['items'];
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface CitizenOrderView {
  id: string;
  code: string;
  status: string;
  isSplit: boolean;
  splitReason?: string;
  prescriptionImageUrl: string;
  createdAt: string;
  subOrders: SubOrderView[];
}

export interface SplitBannerInfo {
  showBanner: boolean;
  message: string;
}

export interface CreatePrescriptionParams {
  prescriptionImageUrl: string;
  notes?: string;
}

export interface CreatePrescriptionResult {
  success: boolean;
  order?: ReturnType<typeof store.getOrderById>;
  error?: string;
}

// ======================================================================
// FUNÇÕES DE SERVIÇO
// ======================================================================

/**
 * Cria um novo pedido de medicamentos a partir do upload de uma receita médica.
 * O pedido é vinculado automaticamente ao munícipe logado via Cidadão ID / Gov.br.
 * Retorna erro de validação se a imagem não for fornecida.
 *
 * Critério de Aceitação: Upload da receita gera pedido no status PENDENTE_TRIAGEM.
 */
export function createCitizenPrescriptionOrder(
  params: CreatePrescriptionParams
): CreatePrescriptionResult {
  if (!params.prescriptionImageUrl || params.prescriptionImageUrl.trim() === '') {
    return {
      success: false,
      error: 'Por favor, anexar a imagem da receita médica antes de enviar o pedido.'
    };
  }

  const currentCitizen = store.getCurrentCitizen();

  const newOrder = store.createOrder({
    citizenId: currentCitizen.id,
    prescriptionImageUrl: params.prescriptionImageUrl.trim(),
    notes: params.notes
  });

  return {
    success: true,
    order: store.getOrderById(newOrder.id)
  };
}

/**
 * Formata a visualização de pedidos de um munícipe específico para o portal do cidadão.
 * Retorna uma lista de CitizenOrderView com subOrders mapeadas para exibição.
 *
 * Critério de Aceitação: Pedidos desmembrados exibem duas remessas com PINs e status.
 */
export function formatCitizenOrdersView(citizenId: string): CitizenOrderView[] {
  const allOrders = store.getOrders();
  const citizenOrders = allOrders.filter((o) => o.citizenId === citizenId);

  return citizenOrders.map((order) => {
    const subOrderViews: SubOrderView[] = order.subOrders.map((sub) => ({
      id: sub.id,
      code: sub.code,
      label: sub.label,
      status: sub.status,
      pinCode: sub.pinCode,
      items: sub.items,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
      estimatedDelivery: sub.estimatedDelivery,
      deliveredAt: sub.deliveredAt,
      notes: sub.notes
    }));

    return {
      id: order.id,
      code: order.code,
      status: order.status,
      isSplit: order.isSplit,
      splitReason: order.splitReason,
      prescriptionImageUrl: order.prescriptionImageUrl,
      createdAt: order.createdAt,
      subOrders: subOrderViews
    };
  });
}

/**
 * Retorna as informações do banner de desmembramento transparente.
 * O banner só é exibido quando o pedido foi desmembrado em mais de uma remessa.
 *
 * Critério de Aceitação: Banner com aria-live para leitores de tela notifica divisão
 * em Remessa A imediata e Remessa B posterior.
 */
export function getCitizenSplitBannerInfo(orderView: CitizenOrderView): SplitBannerInfo {
  if (!orderView.isSplit || orderView.subOrders.length < 2) {
    return {
      showBanner: false,
      message: ''
    };
  }

  const remessaA = orderView.subOrders[0];
  const remessaB = orderView.subOrders[1];

  const message =
    `Seu pedido foi dividido em duas remessas para não atrasar seus medicamentos. ` +
    `A ${remessaA.label} (${remessaA.code}) será enviada imediatamente com os itens disponíveis. ` +
    `A ${remessaB.label} (${remessaB.code}) será enviada assim que o estoque for reposto pela Farmácia Central de Indaiatuba.`;

  return {
    showBanner: true,
    message
  };
}
