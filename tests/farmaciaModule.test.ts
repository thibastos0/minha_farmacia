/**
 * Testes Unitários: Módulo da Farmácia (/farmacia) — Triagem e Desmembramento 1:N
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 4
 *
 * NOTA: O Node.js test runner executa testes dentro de uma suite em paralelo.
 * Para garantir isolamento com o store singleton, cada teste que modifica o estado
 * cria seu próprio pedido via store.createOrder() ao invés de depender do ord-01.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../src/core/store.ts';
import {
  getPharmacyTriageQueue,
  previewStockImpact,
  performPharmacyTriage,
  getPharmacyDashboardCounters
} from '../src/modules/farmacia/farmaciaService.ts';

/** Helper: cria um pedido fresco para isolar o teste do estado global */
function createFreshOrder(): string {
  const citizen = store.getCurrentCitizen();
  const order = store.createOrder({
    citizenId: citizen.id,
    prescriptionImageUrl: 'data:image/png;base64,testReceipt',
    notes: 'Pedido de teste isolado'
  });
  return order.id;
}

// ======================================================================
// SUITE 1: Fila de Triagem e Conferência de Estoque
// ======================================================================

describe('Módulo da Farmácia: Fila de Triagem e Conferência de Estoque', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve retornar pedidos no status PENDENTE_TRIAGEM para a fila de triagem', () => {
    store.resetToDefaults();
    const queue = getPharmacyTriageQueue();

    assert.ok(queue.length > 0, 'A fila deve conter ao menos um pedido pendente');

    // Todos os itens da fila devem estar em PENDENTE_TRIAGEM
    for (const item of queue) {
      assert.equal(
        item.status,
        'PENDENTE_TRIAGEM',
        `Pedido ${item.code} não deveria estar na fila (status: ${item.status})`
      );
      assert.ok(item.prescriptionImageUrl, 'Deve ter a imagem da receita para visualização');
      assert.ok(item.citizenName, 'Deve ter o nome do munícipe');
      assert.ok(item.citizenCpf, 'Deve ter o CPF do munícipe');
    }
  });

  test('Deve calcular o impacto no estoque antes de confirmar a triagem (preview)', () => {
    store.resetToDefaults();
    const orderId = createFreshOrder();

    // Preview com med-01 (Losartana, estoque=120) e med-03 (Amoxicilina, estoque=0)
    const preview = previewStockImpact(orderId, [
      { medicationId: 'med-01', approvedQty: 10 },
      { medicationId: 'med-03', approvedQty: 5 }
    ]);

    assert.equal(preview.items.length, 2, 'Deve retornar preview de 2 medicamentos');

    const losartana = preview.items.find((i) => i.medicationId === 'med-01')!;
    assert.ok(losartana, 'Deve incluir a Losartana no preview');
    assert.equal(losartana.isAvailable, true, 'Losartana tem estoque, deve estar disponível');
    assert.equal(losartana.currentStock, 120);
    assert.equal(losartana.stockAfter, 110, 'Estoque da Losartana deve reduzir de 120 para 110');

    const amoxicilina = preview.items.find((i) => i.medicationId === 'med-03')!;
    assert.ok(amoxicilina, 'Deve incluir a Amoxicilina no preview');
    assert.equal(amoxicilina.isAvailable, false, 'Amoxicilina zerada, não está disponível');
    assert.equal(amoxicilina.currentStock, 0);
    assert.equal(amoxicilina.stockAfter, 0, 'Estoque da Amoxicilina não pode ficar negativo');

    // Preview não deve alterar o store
    const storedMed = store.getMedications().find((m) => m.id === 'med-01')!;
    assert.equal(storedMed.stockQuantity, 120, 'Preview NÃO deve modificar o estoque real');
  });
});

// ======================================================================
// SUITE 2: Desmembramento 1:N e Reatividade no Store
// ======================================================================

describe('Módulo da Farmácia: Desmembramento 1:N e Reatividade', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve desmembrar pedido em 2 SubOrders ao acionar triagem com item em falta', () => {
    store.resetToDefaults();
    // Pedido próprio para este teste — sem depender do ord-01 compartilhado
    const orderId = createFreshOrder();

    const result = performPharmacyTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }, // com estoque
      { medicationId: 'med-03', approvedQty: 5 }   // sem estoque → desmembra
    ]);

    assert.equal(result.success, true, `Triagem falhou: ${result.error}`);
    assert.ok(result.triageResult);
    assert.equal(result.triageResult?.isSplit, true, 'O pedido deve ser marcado como desmembrado');
    assert.equal(result.triageResult?.subOrders.length, 2, 'Deve gerar exatamente 2 SubOrders');

    // Verifica no store reativo que o pedido foi atualizado
    const updatedOrder = store.getOrderById(orderId)!;
    assert.equal(updatedOrder.isSplit, true);
    assert.equal(updatedOrder.status, 'EM_PROCESSAMENTO');
    assert.equal(updatedOrder.subOrders.length, 2);

    // Remessa A: itens disponíveis → EM_SEPARACAO
    const remessaA = updatedOrder.subOrders.find((s) => s.status === 'EM_SEPARACAO')!;
    assert.ok(remessaA, 'Remessa A deve existir com status EM_SEPARACAO');
    assert.match(remessaA.pinCode, /^\d{4}$/);

    // Remessa B: itens em falta → AGUARDANDO_REPOSICAO
    const remessaB = updatedOrder.subOrders.find((s) => s.status === 'AGUARDANDO_REPOSICAO')!;
    assert.ok(remessaB, 'Remessa B deve existir com status AGUARDANDO_REPOSICAO');
    assert.match(remessaB.pinCode, /^\d{4}$/);

    // PINs devem ser distintos
    assert.notEqual(remessaA.pinCode, remessaB.pinCode, 'PINs das remessas devem ser únicos');
  });

  test('Não deve desmembrar pedido quando todos os itens têm estoque suficiente', () => {
    store.resetToDefaults();
    // Pedido próprio para este teste
    const orderId = createFreshOrder();

    // med-01 (120 unid) e med-02 (85 unid) — ambos com estoque
    const result = performPharmacyTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 },
      { medicationId: 'med-02', approvedQty: 5 }
    ]);

    assert.equal(result.success, true, `Triagem falhou inesperadamente: ${result.error}`);
    assert.equal(result.triageResult?.isSplit, false, 'Não deve desmembrar pedido completo');

    const updatedOrder = store.getOrderById(orderId)!;
    assert.equal(updatedOrder.isSplit, false);
    assert.equal(updatedOrder.subOrders.length, 1, 'Deve gerar apenas 1 SubOrder');
    assert.equal(updatedOrder.subOrders[0].status, 'EM_SEPARACAO');
  });

  test('Deve retornar erro ao tentar triar pedido inexistente', () => {
    const result = performPharmacyTriage('ord-nao-existe', [
      { medicationId: 'med-01', approvedQty: 5 }
    ]);

    assert.equal(result.success, false);
    assert.match(result.error!, /não encontrado/i);
  });

  test('Deve notificar listeners do store ao concluir a triagem (reatividade)', () => {
    store.resetToDefaults();
    // Pedido próprio para este teste
    const orderId = createFreshOrder();

    let notified = false;
    const unsubscribe = store.subscribe(() => {
      notified = true;
    });

    // Reset da flag após o subscribe inicial (que dispara imediatamente)
    notified = false;

    performPharmacyTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 },
      { medicationId: 'med-03', approvedQty: 5 }
    ]);

    unsubscribe();
    assert.equal(notified, true, 'O store deve ter notificado os subscribers após a triagem');
  });
});

// ======================================================================
// SUITE 3: Dashboard de Contadores
// ======================================================================

describe('Módulo da Farmácia: Dashboard de Contadores', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve retornar contadores corretos antes de qualquer triagem', () => {
    store.resetToDefaults();
    const counters = getPharmacyDashboardCounters();

    // Estado inicial (seedData): 1 pedido PENDENTE_TRIAGEM, nenhum em rota ou reposição
    assert.equal(
      counters.pendingTriage,
      1,
      'Deve ter 1 pedido aguardando triagem (PED-2026-001)'
    );
    assert.equal(counters.inRoute, 0, 'Nenhum pedido em rota ainda');
    assert.equal(counters.awaitingRestock, 0, 'Nenhum pedido aguardando reposição ainda');
  });

  test('Deve atualizar contadores corretamente após triagem com desmembramento', () => {
    store.resetToDefaults();
    // Pedido próprio para isolar este teste
    const orderId = createFreshOrder();

    performPharmacyTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 },
      { medicationId: 'med-03', approvedQty: 5 }
    ]);

    const counters = getPharmacyDashboardCounters();

    // O pedido fresh foi triado, mas o ord-01 original ainda está PENDENTE_TRIAGEM
    // Portanto pendingTriage >= 1 (o ord-01 seed)
    assert.ok(counters.pendingTriage >= 1, 'O pedido seed ainda está na fila');
    assert.equal(
      counters.awaitingRestock,
      1,
      'Deve haver 1 SubOrder aguardando reposição (Remessa B do pedido fresh)'
    );
  });

  test('Deve expor totalOrders como soma de todos os pedidos no store', () => {
    store.resetToDefaults();
    const counters = getPharmacyDashboardCounters();
    const allOrders = store.getOrders();

    assert.equal(counters.totalOrders, allOrders.length);
  });

  test('Deve calcular métricas de SLA, Top 5 Medicamentos e Rupturas por UBS', () => {
    store.resetToDefaults();
    const counters = getPharmacyDashboardCounters();

    // SLAs operacionais
    assert.ok(counters.slas, 'Deve conter indicadores de SLA');
    assert.equal(counters.slas.avgTriageMinutes, 14);
    assert.equal(counters.slas.avgSeparationMinutes, 22);
    assert.equal(counters.slas.avgDeliveryMinutes, 35);

    // Top 5 Medicamentos
    assert.ok(Array.isArray(counters.topMedications), 'Top medicamentos deve ser array');
    assert.ok(counters.topMedications.length <= 5, 'Deve ter até 5 medicamentos');
    assert.ok(counters.topMedications.some(m => m.name.includes('Amoxicilina')));
    assert.ok(counters.topMedications.some(m => m.name.includes('Dipirona')));

    // Painel de Rupturas
    assert.ok(Array.isArray(counters.ruptures), 'Rupturas deve ser array');
    assert.ok(counters.ruptures.length > 0, 'Deve identificar medicamentos com estoque zerado em UBSs');
    const amoxRupture = counters.ruptures.find(r => r.name.includes('Amoxicilina'));
    assert.ok(amoxRupture, 'Amoxicilina deve ser identificada em ruptura');
  });
});

