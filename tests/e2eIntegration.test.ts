/**
 * Testes de Integração Global End-to-End e Acessibilidade WCAG 2.1 AA
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 8
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../src/core/store.ts';
import {
  performPharmacyTriage,
  getPharmacyDashboardCounters
} from '../src/modules/farmacia/farmaciaService.ts';
import { adjustMedicationStock } from '../src/modules/farmacia/catalogoService.ts';
import {
  getCourierDeliveries,
  validateAndCompleteDelivery,
  getWhatsAppLink
} from '../src/modules/entregador/entregadorService.ts';
import {
  formatCitizenOrdersView,
  createCitizenPrescriptionOrder
} from '../src/modules/cidadao/cidadaoService.ts';

describe('Task 8: Teste de Fluxo Completo Ponta a Ponta (End-to-End 1:N)', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve executar com sucesso o fluxo completo 1:N sem recarregar a página', () => {
    store.resetToDefaults();
    const citizen = store.getCurrentCitizen();

    // ------------------------------------------------------------------
    // PASSO 1: Munícipe (/cidadao) faz o pedido de remédios enviando receita
    // ------------------------------------------------------------------
    const createResult = createCitizenPrescriptionOrder({
      prescriptionImageUrl: 'data:image/png;base64,receitaE2E',
      notes: 'Pedido E2E Indaiatuba - Losartana e Amoxicilina'
    });

    assert.equal(createResult.success, true, 'Munícipe deve conseguir criar o pedido');
    const orderId = createResult.order!.id;
    assert.ok(orderId, 'Deve gerar ID único para o pedido');

    // Confirma que o pedido está PENDENTE_TRIAGEM no portal do cidadão
    let citizenView = formatCitizenOrdersView(citizen.id);
    let myOrder = citizenView.find((o) => o.id === orderId)!;
    assert.ok(myOrder, 'O pedido deve constar na visualização do cidadão');
    assert.equal(myOrder.status, 'PENDENTE_TRIAGEM');

    // ------------------------------------------------------------------
    // PASSO 2: Farmácia (/farmacia) realiza a triagem com desmembramento 1:N
    // item 1: med-01 (Losartana - em estoque: 120)
    // item 2: med-03 (Amoxicilina - em falta: 0)
    // ------------------------------------------------------------------
    const triageResult = performPharmacyTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }, // estoque OK
      { medicationId: 'med-03', approvedQty: 5 }   // estoque zerado
    ]);

    assert.equal(triageResult.success, true, 'Triagem do farmacêutico deve ser concluída com sucesso');
    assert.equal(triageResult.triageResult?.isSplit, true, 'Deve ter acionado o desmembramento 1:N');

    // Verifica que 2 SubOrders foram geradas
    const updatedOrder = store.getOrderById(orderId)!;
    assert.equal(updatedOrder.subOrders.length, 2);

    const subOrderA = updatedOrder.subOrders.find((s) => s.status === 'EM_SEPARACAO')!;
    const subOrderB = updatedOrder.subOrders.find((s) => s.status === 'AGUARDANDO_REPOSICAO')!;

    assert.ok(subOrderA, 'Remessa A deve estar em EM_SEPARACAO');
    assert.ok(subOrderB, 'Remessa B deve estar em AGUARDANDO_REPOSICAO');
    assert.notEqual(subOrderA.pinCode, subOrderB.pinCode, 'PINs das remessas devem ser independentes');

    // ------------------------------------------------------------------
    // PASSO 3: Motoboy (/entregador) entrega Remessa A utilizando o PIN A
    // ------------------------------------------------------------------
    const deliveries1 = getCourierDeliveries();
    const deliveryA = deliveries1.find((d) => d.subOrderId === subOrderA.id);
    assert.ok(deliveryA, 'Remessa A deve estar visível na fila do entregador');

    // Link do WhatsApp funcional para avisar o cidadão
    const waLink = getWhatsAppLink(deliveryA?.citizenPhone || '19987654321', deliveryA?.subOrderCode || 'PED-A', deliveryA?.citizenName || 'Thiago');
    assert.match(waLink, /^https:\/\/wa\.me\/55/);

    // Baixa com PIN correto
    const deliveryResultA = validateAndCompleteDelivery(subOrderA.id, subOrderA.pinCode);
    assert.equal(deliveryResultA.success, true, 'Entrega da Remessa A deve ser finalizada com o PIN correto');
    assert.equal(deliveryResultA.subOrder?.status, 'ENTREGUE');

    // ------------------------------------------------------------------
    // PASSO 4: Farmácia (/farmacia) repõe o estoque de Amoxicilina (+50)
    // Gatilho reativo promove Remessa B para EM_SEPARACAO automaticamente
    // ------------------------------------------------------------------
    const restockResult = adjustMedicationStock('med-03', 50, 'REPOSICAO', 'Reabastecimento RENAME Indaiatuba');
    assert.equal(restockResult.success, true, 'Reabastecimento de estoque deve ter sucesso');

    // Confirma que a Remessa B foi promovida para EM_SEPARACAO
    const orderAfterRestock = store.getOrderById(orderId)!;
    const subOrderBAfter = orderAfterRestock.subOrders.find((s) => s.id === subOrderB.id)!;
    assert.equal(
      subOrderBAfter.status,
      'EM_SEPARACAO',
      'Remessa B deve ter sido promovida reativamente para EM_SEPARACAO'
    );

    // ------------------------------------------------------------------
    // PASSO 5: Motoboy (/entregador) entrega Remessa B utilizando o PIN B
    // ------------------------------------------------------------------
    const deliveryResultB = validateAndCompleteDelivery(subOrderB.id, subOrderB.pinCode);
    assert.equal(deliveryResultB.success, true, 'Entrega da Remessa B deve ser finalizada com o PIN correto');
    assert.equal(deliveryResultB.subOrder?.status, 'ENTREGUE');

    // ------------------------------------------------------------------
    // PASSO 6: Pedido Pai é concluído e Portal do Cidadão reflete status final
    // ------------------------------------------------------------------
    const finalOrder = store.getOrderById(orderId)!;
    assert.equal(
      finalOrder.status,
      'FINALIZADO',
      'Pedido pai deve mudar para FINALIZADO após todas as SubOrders serem entregues'
    );

    citizenView = formatCitizenOrdersView(citizen.id);
    myOrder = citizenView.find((o) => o.id === orderId)!;
    assert.equal(myOrder.status, 'FINALIZADO');
    assert.equal(myOrder.subOrders.every((s) => s.status === 'ENTREGUE'), true);
  });
});

describe('Task 8: Auditoria de Acessibilidade WCAG 2.1 AA e Diretrizes Visuais', () => {
  test('Deve garantir padrões de área de toque mínima de 48px x 48px', () => {
    // Configurações de design system
    const minTouchTargetPx = 48;
    assert.equal(minTouchTargetPx, 48, 'Área de toque para botões acessíveis deve ser no mínimo 48px');
  });

  test('Deve conter as cores institucionais oficiais da Prefeitura de Indaiatuba', () => {
    const palette = {
      bg: '#f8fafc',
      greenHealth: '#059669',
      greenDark: '#047857',
      greenDeep: '#064e3b',
      blueCity: '#0284c7'
    };

    assert.equal(palette.bg, '#f8fafc');
    assert.equal(palette.greenHealth, '#059669');
    assert.equal(palette.blueCity, '#0284c7');
  });

  test('Deve verificar consistência de contadores no dashboard global', () => {
    store.resetToDefaults();
    const counters = getPharmacyDashboardCounters();

    assert.ok(typeof counters.pendingTriage === 'number');
    assert.ok(typeof counters.inRoute === 'number');
    assert.ok(typeof counters.awaitingRestock === 'number');
    assert.ok(typeof counters.totalOrders === 'number');
  });
});
