/**
 * Testes Unitários: splitEngine e StateStore
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 1
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateAndSplitOrder, generateSecurePin } from '../src/core/splitEngine.ts';
import { store } from '../src/core/store.ts';
import type { Medication, Order } from '../src/core/types.ts';

describe('Motor de Desmembramento (splitEngine)', () => {
  const mockCatalog: Medication[] = [
    {
      id: 'med-losartana',
      name: 'Losartana Potássica',
      dosage: '50mg',
      presentation: 'Comprimido',
      stockQuantity: 100,
      minStockAlert: 20,
      active: true,
      category: 'CONTINUO'
    },
    {
      id: 'med-amox',
      name: 'Amoxicilina',
      dosage: '500mg',
      presentation: 'Comprimido',
      stockQuantity: 0, // Estoque Zerado
      minStockAlert: 10,
      active: true,
      category: 'ANTIBIOTICO'
    }
  ];

  const mockOrder: Order = {
    id: 'ord-test-01',
    code: 'PED-TEST-001',
    citizenId: 'cit-01',
    citizenName: 'Maria Silva',
    citizenCpf: '123.456.789-00',
    citizenPhone: '(19) 99876-5432',
    deliveryAddress: {
      street: 'Rua das Acácias',
      number: '142',
      neighborhood: 'Jardim Morada do Sol',
      city: 'Indaiatuba - SP',
      cep: '13348-000',
      lat: -23.1042,
      lng: -47.2341
    },
    prescriptionImageUrl: 'https://exemplo.com/receita.jpg',
    status: 'PENDENTE_TRIAGEM',
    isSplit: false,
    subOrders: [],
    createdAt: new Date().toISOString()
  };

  test('Deve desmembrar pedido 1:N quando 1 medicamento tem estoque e outro está em falta', () => {
    const decisions = [
      { medicationId: 'med-losartana', approvedQty: 30 },
      { medicationId: 'med-amox', approvedQty: 21 }
    ];

    const result = evaluateAndSplitOrder(mockOrder, decisions, mockCatalog);

    assert.equal(result.isSplit, true, 'O pedido deveria ser marcado como desmembrado (isSplit: true)');
    assert.equal(result.subOrders.length, 2, 'Deveria gerar exatamente 2 SubOrders');

    const subOrderA = result.subOrders[0];
    const subOrderB = result.subOrders[1];

    // Remessa A: Imediata
    assert.equal(subOrderA.status, 'EM_SEPARACAO');
    assert.equal(subOrderA.items.length, 1);
    assert.equal(subOrderA.items[0].medicationName, 'Losartana Potássica');
    assert.equal(subOrderA.items[0].quantityApproved, 30);
    assert.equal(subOrderA.items[0].isAvailable, true);

    // Remessa B: Aguardando Reposição
    assert.equal(subOrderB.status, 'AGUARDANDO_REPOSICAO');
    assert.equal(subOrderB.items.length, 1);
    assert.equal(subOrderB.items[0].medicationName, 'Amoxicilina');
    assert.equal(subOrderB.items[0].quantityApproved, 21);
    assert.equal(subOrderB.items[0].isAvailable, false);
  });

  test('Deve gerar PINs numéricos de 4 dígitos independentes e únicos para cada SubOrder', () => {
    const decisions = [
      { medicationId: 'med-losartana', approvedQty: 30 },
      { medicationId: 'med-amox', approvedQty: 21 }
    ];

    const result = evaluateAndSplitOrder(mockOrder, decisions, mockCatalog);

    const pinA = result.subOrders[0].pinCode;
    const pinB = result.subOrders[1].pinCode;

    assert.match(pinA, /^\d{4}$/, 'PIN da SubOrder-A deve ter 4 dígitos numéricos');
    assert.match(pinB, /^\d{4}$/, 'PIN da SubOrder-B deve ter 4 dígitos numéricos');
    assert.notEqual(pinA, pinB, 'PINs de SubOrders diferentes devem ser distintos para segurança');
  });

  test('Não deve desmembrar pedido quando todos os itens têm estoque suficiente', () => {
    const decisions = [{ medicationId: 'med-losartana', approvedQty: 20 }];
    const result = evaluateAndSplitOrder(mockOrder, decisions, mockCatalog);

    assert.equal(result.isSplit, false);
    assert.equal(result.subOrders.length, 1);
    assert.equal(result.subOrders[0].status, 'EM_SEPARACAO');
  });
});

describe('Store Reativo (StateStore)', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve notificar subscribers reativos quando um pedido for criado', () => {
    let callCount = 0;
    const unsubscribe = store.subscribe(() => {
      callCount++;
    });

    store.createOrder({
      citizenId: 'cit-01',
      prescriptionImageUrl: 'https://exemplo.com/receita2.jpg'
    });

    unsubscribe();
    assert.ok(callCount >= 2, 'O listener deveria ter sido notificado na inicialização e na criação');
  });

  test('Deve validar PIN estritamente ao concluir a entrega e rejeitar PIN incorreto', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    // Executa triagem para gerar SubOrder com PIN
    const triageResult = store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }
    ]);

    assert.equal(triageResult.success, true);
    const subOrder = triageResult.result?.subOrders[0]!;
    const correctPin = subOrder.pinCode;

    // Tentativa com PIN errado
    const wrongAttempt = store.completeDelivery(subOrder.id, '0000');
    assert.equal(wrongAttempt.success, false);
    assert.match(wrongAttempt.message, /PIN incorreto/);

    // Tentativa com PIN correto
    const correctAttempt = store.completeDelivery(subOrder.id, correctPin);
    assert.equal(correctAttempt.success, true);

    const updatedOrder = store.getOrderById(orderId);
    assert.equal(updatedOrder?.subOrders[0].status, 'ENTREGUE');
    assert.equal(updatedOrder?.status, 'FINALIZADO');
  });

  test('Deve promover SubOrder de AGUARDANDO_REPOSICAO para EM_SEPARACAO quando o estoque for reabastecido no CRUD', () => {
    const orders = store.getOrders();
    const orderId = orders[0].id;

    // Amoxicilina (med-03) tem estoque 0 no seed inicial
    const triage = store.performTriage(orderId, [
      { medicationId: 'med-01', approvedQty: 10 }, // Losartana tem estoque
      { medicationId: 'med-03', approvedQty: 5 }   // Amoxicilina está zerada
    ]);

    assert.equal(triage.success, true);
    assert.equal(triage.result?.isSplit, true);

    const subOrderB = store.getOrderById(orderId)?.subOrders.find((s) => s.status === 'AGUARDANDO_REPOSICAO');
    assert.ok(subOrderB, 'SubOrder-B deve estar com status AGUARDANDO_REPOSICAO');

    // Farmacêutico reabastece o estoque de Amoxicilina (+50 unidades)
    store.adjustStock('med-03', 50);

    const updatedSubOrderB = store.getOrderById(orderId)?.subOrders.find((s) => s.id === subOrderB.id);
    assert.equal(
      updatedSubOrderB?.status,
      'EM_SEPARACAO',
      'SubOrder-B deve ter sido promovido automaticamente para EM_SEPARACAO'
    );
  });
});
