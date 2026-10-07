/**
 * Serviço do Módulo do Entregador (/entregador)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 *
 * Responsável pela lógica de negócio do portal do motoboy:
 * - Fila de entregas e corridas atribuídas/disponíveis
 * - Link direto do WhatsApp (wa.me) com mensagem institucional pré-configurada
 * - Baixa de entrega com validação do código PIN de 4 dígitos
 */

import { store } from '../../core/store.ts';
import type { SubOrder, OrderItem, SubOrderStatus } from '../../core/types.ts';

// ======================================================================
// TIPOS PÚBLICOS DA CAMADA DE VIEW DO ENTREGADOR
// ======================================================================

export interface DeliveryCardView {
  subOrderId: string;
  orderId: string;
  orderCode: string;
  subOrderCode: string;
  subOrderLabel: string;
  citizenName: string;
  citizenPhone: string;
  citizenAddress: string;
  items: OrderItem[];
  status: SubOrderStatus;
  pinCode: string;
  courierId?: string;
  courierName?: string;
  createdAt: string;
  updatedAt: string;
  deliveredAt?: string;
}

export interface DeliveryCompletionResult {
  success: boolean;
  message: string;
  subOrder?: SubOrder;
}

// ======================================================================
// FUNÇÕES DE SERVIÇO
// ======================================================================

/**
 * Normaliza o número de telefone removendo caracteres não numéricos e adicionando o código do país (55)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }
  return digits;
}

/**
 * Gera o link direto de contato via WhatsApp com mensagem institucional pré-configurada
 *
 * Critério de Aceitação: Botão de contato rápido via WhatsApp oficial (wa.me)
 */
export function getWhatsAppLink(phone: string, subOrderCode: string, citizenName?: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  const nameGreeting = citizenName ? ` ${citizenName}` : '';
  const message = `Olá${nameGreeting}! Sou da equipe de entregas da Farmácia Municipal de Indaiatuba. Estou referente ao seu pedido de medicamentos (${subOrderCode}). Por favor, tenha em mãos o seu código PIN de 4 dígitos para a validação do recebimento.`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Retorna as entregas em andamento ou disponíveis para a fila do entregador
 *
 * Critério de Aceitação: Cards de corridas disponíveis e em andamento com dados de destino e paciente.
 */
export function getCourierDeliveries(courierId?: string): DeliveryCardView[] {
  const allOrders = store.getOrders();
  const deliveries: DeliveryCardView[] = [];

  for (const order of allOrders) {
    for (const sub of order.subOrders) {
      // Inclui remessas prontas para transporte, em rota ou recém-criadas
      if (
        sub.status === 'SAIU_PARA_ENTREGA' ||
        sub.status === 'AGUARDANDO_COLETA' ||
        sub.status === 'EM_SEPARACAO' ||
        sub.status === 'ENTREGUE'
      ) {
        // Se courierId for especificado, filtra por ele ou inclui remessas sem courier atribuído
        if (
          !courierId ||
          !sub.courierId ||
          sub.courierId === courierId
        ) {
          const addr = order.deliveryAddress;
          const formattedAddr = `${addr.street}, ${addr.number}${
            addr.complement ? ` (${addr.complement})` : ''
          } - ${addr.neighborhood}, ${addr.city}`;

          deliveries.push({
            subOrderId: sub.id,
            orderId: order.id,
            orderCode: order.code,
            subOrderCode: sub.code,
            subOrderLabel: sub.label,
            citizenName: order.citizenName,
            citizenPhone: order.citizenPhone,
            citizenAddress: formattedAddr,
            items: sub.items,
            status: sub.status,
            pinCode: sub.pinCode,
            courierId: sub.courierId,
            courierName: sub.courierName,
            createdAt: sub.createdAt,
            updatedAt: sub.updatedAt,
            deliveredAt: sub.deliveredAt
          });
        }
      }
    }
  }

  return deliveries;
}

/**
 * Valida o PIN de 4 dígitos e efetua a baixa da entrega
 *
 * Critérios de Aceitação:
 * - Entregador só consegue finalizar a entrega se digitar o PIN exato daquela SubOrder.
 * - Tentativa com PIN errado exibe alerta de erro claro e mantém a entrega aberta.
 * - Conclusão da entrega atualiza a timeline do munícipe em tempo real.
 */
export function validateAndCompleteDelivery(
  subOrderId: string,
  pinInput: string
): DeliveryCompletionResult {
  if (!pinInput || pinInput.trim() === '') {
    return {
      success: false,
      message: 'Por favor, informe o código PIN de 4 dígitos fornecido pelo munícipe.'
    };
  }

  const result = store.completeDelivery(subOrderId, pinInput.trim());

  if (!result.success) {
    return {
      success: false,
      message: result.message
    };
  }

  // Busca o SubOrder atualizado
  const orders = store.getOrders();
  let updatedSubOrder: SubOrder | undefined;

  for (const o of orders) {
    const sub = o.subOrders.find((s) => s.id === subOrderId);
    if (sub) {
      updatedSubOrder = sub;
      break;
    }
  }

  return {
    success: true,
    message: result.message,
    subOrder: updatedSubOrder
  };
}
