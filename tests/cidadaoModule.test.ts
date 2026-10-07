/**
 * Testes Unitários: Módulo do Cidadão (/cidadao)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 3
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../src/core/store.ts';
import {
  formatCitizenOrdersView,
  createCitizenPrescriptionOrder,
  getCitizenSplitBannerInfo
} from '../src/modules/cidadao/cidadaoService.ts';

describe('Módulo do Cidadão: Submissão de Receita e Identificação Gov.br', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve criar novo pedido no status PENDENTE_TRIAGEM com dados oficiais do munícipe', () => {
    const currentCitizen = store.getCurrentCitizen();
    assert.ok(currentCitizen, 'Deve haver um munícipe logado via Cidadão ID');

    const result = createCitizenPrescriptionOrder({
      prescriptionImageUrl: 'data:image/png;base64,mockPrescription',
      notes: 'Receita médica do posto Jd. Morada do Sol'
    });

    assert.equal(result.success, true);
    assert.ok(result.order);
    assert.equal(result.order?.status, 'PENDENTE_TRIAGEM');
    assert.equal(result.order?.citizenId, currentCitizen.id);
    assert.equal(result.order?.citizenName, currentCitizen.name);
    assert.equal(result.order?.deliveryAddress.neighborhood, currentCitizen.address.neighborhood);

    // Verifica que o pedido consta no store
    const storedOrder = store.getOrderById(result.order!.id);
    assert.ok(storedOrder);
    assert.equal(storedOrder?.prescriptionImageUrl, 'data:image/png;base64,mockPrescription');
  });

  test('Deve recusar submissão caso a imagem da receita não seja fornecida', () => {
    const result = createCitizenPrescriptionOrder({
      prescriptionImageUrl: ''
    });

    assert.equal(result.success, false);
    assert.match(result.error!, /anexar a imagem da receita/i);
  });
});

describe('Módulo do Cidadão: Visualização de Desmembramento e PINs Independentes', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve formatar a visualização de pedido desmembrado com 2 remessas e PINs distintos', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    // Executa triagem que desmembra o pedido em 1:N
    store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }, // Losartana tem estoque
      { medicationId: 'med-03', approvedQty: 5 }   // Amoxicilina está zerada
    ]);

    const citizenOrders = formatCitizenOrdersView('cit-01');
    assert.ok(citizenOrders.length > 0);

    const targetOrderView = citizenOrders.find((o) => o.id === orderId);
    assert.ok(targetOrderView);
    assert.equal(targetOrderView?.isSplit, true);
    assert.equal(targetOrderView?.subOrders.length, 2, 'Munícipe deve ver exatamente 2 remessas');

    const remessaA = targetOrderView?.subOrders[0]!;
    const remessaB = targetOrderView?.subOrders[1]!;

    // Validação da Remessa A
    assert.equal(remessaA.status, 'EM_SEPARACAO');
    assert.match(remessaA.pinCode, /^\d{4}$/);

    // Validação da Remessa B
    assert.equal(remessaB.status, 'AGUARDANDO_REPOSICAO');
    assert.match(remessaB.pinCode, /^\d{4}$/);
    assert.notEqual(remessaA.pinCode, remessaB.pinCode, 'Cada remessa deve ter seu próprio PIN');

    // Validação do Banner de Desmembramento Transparente
    const bannerInfo = getCitizenSplitBannerInfo(targetOrderView!);
    assert.equal(bannerInfo.showBanner, true);
    assert.match(bannerInfo.message, /duas remessas/i);
    assert.match(bannerInfo.message, /não atrasar/i);
  });

  test('Não deve exibir banner de desmembramento para pedidos não desmembrados', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    // Apenas Losartana (com estoque total)
    store.performTriage(orderId, [{ medicationId: 'med-01', approvedQty: 10 }]);

    const citizenOrders = formatCitizenOrdersView('cit-01');
    const targetOrderView = citizenOrders.find((o) => o.id === orderId);

    assert.ok(targetOrderView);
    assert.equal(targetOrderView?.isSplit, false);

    const bannerInfo = getCitizenSplitBannerInfo(targetOrderView!);
    assert.equal(bannerInfo.showBanner, false);
  });
});
