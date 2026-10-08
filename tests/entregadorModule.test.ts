/**
 * Testes Unitários: Módulo do Entregador (/entregador)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 7
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../src/core/store.ts';
import {
  getCourierDeliveries,
  getAvailableDeliveries,
  getActiveCourierDeliveries,
  acceptCourierDelivery,
  getWhatsAppLink,
  validateAndCompleteDelivery,
  formatPhoneForWhatsApp
} from '../src/modules/entregador/entregadorService.ts';
import { formatCitizenOrdersView } from '../src/modules/cidadao/cidadaoService.ts';

describe('Módulo do Entregador: Formatação do WhatsApp e Links Diretos', () => {
  test('Deve formatar números de telefone com código do país (55) e remover caracteres especiais', () => {
    assert.equal(formatPhoneForWhatsApp('(19) 99876-5432'), '5519998765432');
    assert.equal(formatPhoneForWhatsApp('19987654321'), '5519987654321');
  });

  test('Deve gerar link de WhatsApp wa.me com mensagem institucional e código da remessa', () => {
    const link = getWhatsAppLink('(19) 99876-5432', 'PED-2026-001-A', 'Dona Maria');

    assert.ok(link.startsWith('https://wa.me/5519998765432?text='));
    assert.match(decodeURIComponent(link), /Farmácia Municipal de Indaiatuba/i);
    assert.match(decodeURIComponent(link), /PED-2026-001-A/i);
    assert.match(decodeURIComponent(link), /Dona Maria/i);
    assert.match(decodeURIComponent(link), /PIN/i);
  });
});

describe('Módulo do Entregador: Fila de Corridas e Baixa com PIN de Segurança', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve listar entregas com dados do destino, paciente e itens cadastrados', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    // Realiza triagem para gerar SubOrders
    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }
    ]);

    const deliveries = getCourierDeliveries();
    assert.ok(deliveries.length > 0, 'Deve haver entregas na fila');

    const delivery = deliveries.find((d) => d.orderId === orderId);
    assert.ok(delivery);
    assert.equal(delivery?.citizenName, 'Dona Maria de Lourdes Silva');
    assert.match(delivery?.citizenAddress!, /Morada do Sol/i);
    assert.equal(delivery?.items.length, 1);
    assert.equal(delivery?.items[0].medicationName, 'Losartana Potássica');
  });

  test('Deve recusar finalização de entrega com PIN incorreto e manter status da remessa aberto', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }
    ]);

    const deliveries = getCourierDeliveries();
    const targetDelivery = deliveries[0];
    const subOrderId = targetDelivery.subOrderId;

    // Tenta finalizar com PIN errado
    const result = validateAndCompleteDelivery(subOrderId, '0000');

    assert.equal(result.success, false);
    assert.match(result.message, /código PIN incorreto/i);

    // Confirma que a remessa continua em aberto (não ENTREGUE)
    const currentDeliveries = getCourierDeliveries();
    const checkDelivery = currentDeliveries.find((d) => d.subOrderId === subOrderId);
    assert.notEqual(checkDelivery?.status, 'ENTREGUE');
  });

  test('Deve finalizar entrega com sucesso ao digitar o PIN de 4 dígitos exato e atualizar timeline do cidadão em tempo real', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    // Pedido desmembrado em 1:N
    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 },
      { medicationId: 'med-03', approvedQty: 5 }
    ]);

    const citizenOrdersBefore = formatCitizenOrdersView('cit-01');
    const orderViewBefore = citizenOrdersBefore.find((o) => o.id === orderId);
    const remessaA = orderViewBefore?.subOrders[0]!;

    assert.equal(remessaA.status, 'EM_SEPARACAO');
    const correctPin = remessaA.pinCode;

    // Finaliza entrega com o PIN exato
    const result = validateAndCompleteDelivery(remessaA.id, correctPin);

    assert.equal(result.success, true);
    assert.match(result.message, /entregue e confirmada/i);
    assert.equal(result.subOrder?.status, 'ENTREGUE');
    assert.ok(result.subOrder?.deliveredAt);

    // Sincronização em Tempo Real com o Portal do Cidadão
    const citizenOrdersAfter = formatCitizenOrdersView('cit-01');
    const orderViewAfter = citizenOrdersAfter.find((o) => o.id === orderId);
    const updatedRemessaA = orderViewAfter?.subOrders[0]!;

    assert.equal(updatedRemessaA.status, 'ENTREGUE');
  });

  test('Deve impedir nova tentativa de entrega em remessa já finalizada', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }
    ]);

    const deliveries = getCourierDeliveries();
    const remessa = deliveries[0];

    // Primeira entrega válida
    const firstAttempt = validateAndCompleteDelivery(remessa.subOrderId, remessa.pinCode);
    assert.equal(firstAttempt.success, true);

    // Segunda tentativa na mesma entrega
    const secondAttempt = validateAndCompleteDelivery(remessa.subOrderId, remessa.pinCode);
    assert.equal(secondAttempt.success, false);
    assert.match(secondAttempt.message, /já foi entregue/i);
  });
});

describe('Módulo do Entregador: Fluxo de Despacho e Aceite de Corridas (Farmácia -> Motoboy -> Cidadão)', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve despachar remessa de EM_SEPARACAO para AGUARDANDO_RETIRADA na Central', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }
    ]);

    const order = store.getOrderById(orderId)!;
    const subOrder = order.subOrders[0];
    assert.equal(subOrder.status, 'EM_SEPARACAO');

    // Despacho pela Farmácia para a frota geral
    const dispatchResult = store.dispatchSubOrder(subOrder.id);
    assert.equal(dispatchResult.success, true);
    assert.equal(dispatchResult.subOrder?.status, 'AGUARDANDO_RETIRADA');
    assert.equal(dispatchResult.subOrder?.courierId, undefined);

    // Deve constar na listagem de pacotes disponíveis na central
    const available = getAvailableDeliveries();
    const found = available.find((a) => a.subOrderId === subOrder.id);
    assert.ok(found, 'Pacote deve estar disponível na Central');
    assert.equal(found.status, 'AGUARDANDO_RETIRADA');
  });

  test('Deve despachar remessa com atribuição específica a um entregador municipal', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }
    ]);

    const order = store.getOrderById(orderId)!;
    const subOrder = order.subOrders[0];

    const dispatchResult = store.dispatchSubOrder(subOrder.id, 'cour-01');
    assert.equal(dispatchResult.success, true);
    assert.equal(dispatchResult.subOrder?.status, 'AGUARDANDO_RETIRADA');
    assert.equal(dispatchResult.subOrder?.courierId, 'cour-01');
    assert.match(dispatchResult.subOrder?.courierName!, /Marcos Vinicius/i);

    // Munícipe enxerga nome do motoboy na timeline
    const citizenOrders = formatCitizenOrdersView('cit-01');
    const myOrder = citizenOrders.find((o) => o.id === orderId)!;
    assert.equal(myOrder.subOrders[0].status, 'AGUARDANDO_RETIRADA');
    assert.equal(myOrder.subOrders[0].courierName, 'Marcos Vinicius (Moto 01)');
  });

  test('Deve aceitar corrida e fazer a transição para SAIU_PARA_ENTREGA', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }
    ]);

    const order = store.getOrderById(orderId)!;
    const subOrder = order.subOrders[0];
    store.dispatchSubOrder(subOrder.id);

    // Motoboy aceita corrida na Central
    const acceptResult = acceptCourierDelivery(subOrder.id, 'cour-01');
    assert.equal(acceptResult.success, true);
    assert.equal(acceptResult.subOrder?.status, 'SAIU_PARA_ENTREGA');
    assert.equal(acceptResult.subOrder?.courierId, 'cour-01');

    // Não deve mais constar em pacotes prontos na central
    const available = getAvailableDeliveries();
    assert.ok(!available.some((a) => a.subOrderId === subOrder.id));

    // Deve constar em entregas ativas do motoboy
    const active = getActiveCourierDeliveries('cour-01');
    const foundActive = active.find((a) => a.subOrderId === subOrder.id);
    assert.ok(foundActive);
    assert.equal(foundActive.status, 'SAIU_PARA_ENTREGA');

    // Conclusão com PIN
    const completeResult = validateAndCompleteDelivery(subOrder.id, subOrder.pinCode);
    assert.equal(completeResult.success, true);
    assert.equal(completeResult.subOrder?.status, 'ENTREGUE');
  });
});

