/**
 * Testes Unitários: Módulo da Farmácia — CRUD de Catálogo e Reabastecimento Reativo
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 5
 *
 * NOTA: O Node.js test runner executa testes dentro de uma suite em paralelo.
 * Cada teste usa store.resetToDefaults() explicitamente para garantir isolamento.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../src/core/store.ts';
import {
  getCatalogView,
  searchCatalog,
  addMedication,
  editMedication,
  adjustMedicationStock,
  adjustMedicationStockUnit,
  toggleMedicationStatus,
  getLowStockBadges
} from '../src/modules/farmacia/catalogoService.ts';

// ======================================================================
// SUITE 1: Listagem e Busca do Catálogo (CRUD — Read)
// ======================================================================

describe('Catálogo de Medicamentos: Listagem e Busca', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve listar todos os medicamentos ativos do catálogo com status de estoque', () => {
    store.resetToDefaults();
    const catalog = getCatalogView();

    assert.ok(catalog.length > 0, 'O catálogo deve conter medicamentos');

    for (const item of catalog) {
      assert.ok(item.id, 'Deve ter id');
      assert.ok(item.name, 'Deve ter nome');
      assert.ok(item.dosage, 'Deve ter dosagem');
      assert.ok(item.category, 'Deve ter categoria');
      assert.ok(typeof item.stockQuantity === 'number', 'Deve ter quantidade em estoque');
      assert.ok(typeof item.isLowStock === 'boolean', 'Deve ter flag de estoque crítico');
      assert.ok(typeof item.isOutOfStock === 'boolean', 'Deve ter flag de estoque zerado');
    }
  });

  test('Deve sinalizar isLowStock=true para medicamentos abaixo do minStockAlert', () => {
    store.resetToDefaults();
    const catalog = getCatalogView();

    // Omeprazol (med-05): stockQuantity=4, minStockAlert=10 → deve ser crítico
    const omeprazol = catalog.find((m) => m.id === 'med-05');
    assert.ok(omeprazol, 'Omeprazol deve constar no catálogo');
    assert.equal(omeprazol?.isLowStock, true, 'Omeprazol com estoque 4 < minAlert 10 = crítico');
    assert.equal(omeprazol?.isOutOfStock, false);

    // Losartana (med-01): stockQuantity=120 → não é crítico
    const losartana = catalog.find((m) => m.id === 'med-01');
    assert.ok(losartana);
    assert.equal(losartana?.isLowStock, false, 'Losartana com estoque 120 não é crítica');
  });

  test('Deve sinalizar isOutOfStock=true para medicamentos zerados', () => {
    store.resetToDefaults();
    const catalog = getCatalogView();

    // Amoxicilina (med-03): stockQuantity=0 → zerado
    const amoxicilina = catalog.find((m) => m.id === 'med-03');
    assert.ok(amoxicilina, 'Amoxicilina deve constar no catálogo');
    assert.equal(amoxicilina?.isOutOfStock, true, 'Amoxicilina com estoque 0 está zerada');
    assert.equal(amoxicilina?.isLowStock, true, '0 < minAlert também é estoque crítico');
  });

  test('Deve buscar medicamentos por texto (nome ou dosagem)', () => {
    store.resetToDefaults();
    const results = searchCatalog({ query: 'losartana' });

    assert.ok(results.length > 0, 'Busca por "losartana" deve retornar resultados');
    assert.ok(
      results.every((m) => m.name.toLowerCase().includes('losartana')),
      'Todos os resultados devem conter "losartana" no nome'
    );
  });

  test('Deve buscar medicamentos por categoria', () => {
    store.resetToDefaults();
    const results = searchCatalog({ category: 'CONTINUO' });

    assert.ok(results.length > 0, 'Deve retornar medicamentos de uso contínuo');
    assert.ok(
      results.every((m) => m.category === 'CONTINUO'),
      'Todos os resultados devem ser da categoria CONTINUO'
    );
  });

  test('Deve combinar busca por texto e categoria simultaneamente', () => {
    store.resetToDefaults();
    const results = searchCatalog({ query: 'metformina', category: 'CONTINUO' });

    assert.ok(results.length > 0, 'Metformina é de uso CONTINUO');
    const metformina = results[0];
    assert.ok(metformina.name.toLowerCase().includes('metformina'));
    assert.equal(metformina.category, 'CONTINUO');
  });

  test('Deve retornar lista vazia para busca sem correspondência', () => {
    store.resetToDefaults();
    const results = searchCatalog({ query: 'medicamento-inexistente-xyz' });

    assert.equal(results.length, 0, 'Busca sem match deve retornar lista vazia');
  });
});

// ======================================================================
// SUITE 2: Criação e Edição de Medicamentos (CRUD — Create / Update)
// ======================================================================

describe('Catálogo de Medicamentos: Criação e Edição', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve criar novo medicamento com todos os campos obrigatórios', () => {
    store.resetToDefaults();
    const result = addMedication({
      name: 'Atenolol',
      dosage: '25mg',
      presentation: 'Comprimido (Caixa com 30)',
      stockQuantity: 50,
      minStockAlert: 10,
      category: 'CONTINUO'
    });

    assert.equal(result.success, true, `Falhou: ${result.error}`);
    assert.ok(result.medication, 'Deve retornar o medicamento criado');
    assert.ok(result.medication?.id, 'Deve ter id gerado automaticamente');
    assert.equal(result.medication?.name, 'Atenolol');
    assert.equal(result.medication?.active, true, 'Novo medicamento deve estar ativo por padrão');

    // Verifica persistência no store
    const inCatalog = getCatalogView().find((m) => m.id === result.medication?.id);
    assert.ok(inCatalog, 'Medicamento deve aparecer no catálogo após criação');
  });

  test('Deve rejeitar criação com campos obrigatórios ausentes', () => {
    store.resetToDefaults();
    // Nome vazio
    const r1 = addMedication({
      name: '',
      dosage: '25mg',
      presentation: 'Comprimido',
      stockQuantity: 10,
      minStockAlert: 5,
      category: 'BASICO'
    });
    assert.equal(r1.success, false);
    assert.match(r1.error!, /nome/i);

    // Dosagem vazia
    const r2 = addMedication({
      name: 'Remédio Teste',
      dosage: '',
      presentation: 'Comprimido',
      stockQuantity: 10,
      minStockAlert: 5,
      category: 'BASICO'
    });
    assert.equal(r2.success, false);
    assert.match(r2.error!, /dosagem/i);

    // Quantidade negativa
    const r3 = addMedication({
      name: 'Remédio Teste',
      dosage: '10mg',
      presentation: 'Comprimido',
      stockQuantity: -5,
      minStockAlert: 5,
      category: 'BASICO'
    });
    assert.equal(r3.success, false);
    assert.match(r3.error!, /quantidade/i);
  });

  test('Deve editar medicamento existente e persistir as alterações', () => {
    store.resetToDefaults();
    const result = editMedication('med-01', {
      name: 'Losartana Potássica Atualizada',
      minStockAlert: 30
    });

    assert.equal(result.success, true, `Edição falhou: ${result.error}`);

    const updated = getCatalogView().find((m) => m.id === 'med-01');
    assert.ok(updated);
    assert.equal(updated?.name, 'Losartana Potássica Atualizada');
    assert.equal(updated?.minStockAlert, 30);
    // Outros campos não devem ter mudado
    assert.equal(updated?.dosage, '50mg');
  });

  test('Deve retornar erro ao editar medicamento inexistente', () => {
    store.resetToDefaults();
    const result = editMedication('med-nao-existe', { name: 'Teste' });

    assert.equal(result.success, false);
    assert.match(result.error!, /não encontrado/i);
  });
});

// ======================================================================
// SUITE 3: Ajuste de Estoque e Inativação (CRUD — Stock / Delete)
// ======================================================================

describe('Catálogo de Medicamentos: Ajuste de Estoque e Inativação', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve ajustar estoque com delta positivo e negativo', () => {
    store.resetToDefaults();
    // +10 na Losartana (estoque inicial: 120)
    const r1 = adjustMedicationStock('med-01', +10);
    assert.equal(r1.success, true);
    assert.equal(r1.newStock, 130);

    // -10 na Losartana (agora 130 - 10 = 120)
    const r2 = adjustMedicationStock('med-01', -10);
    assert.equal(r2.success, true);
    assert.equal(r2.newStock, 120);
  });

  test('Não deve permitir estoque ficar negativo', () => {
    store.resetToDefaults();
    // Dipirona tem 85; tentar remover 100
    const result = adjustMedicationStock('med-02', -100);
    assert.equal(result.success, true, 'Operação deve ser aceita');
    assert.equal(result.newStock, 0, 'Estoque deve ser zerado, não ficar negativo');
  });

  test('Deve retornar erro ao ajustar estoque de medicamento inexistente', () => {
    store.resetToDefaults();
    const result = adjustMedicationStock('med-nao-existe', 10);
    assert.equal(result.success, false);
    assert.match(result.error!, /não encontrado/i);
  });

  test('Deve inativar medicamento via soft delete (preservando histórico)', () => {
    store.resetToDefaults();
    const result = toggleMedicationStatus('med-01');

    assert.equal(result.success, true);
    assert.equal(result.newStatus, false, 'Medicamento ativo deve ser inativado');

    // Medicamento inativo NÃO deve aparecer no catálogo ativo
    const catalog = getCatalogView();
    const found = catalog.find((m) => m.id === 'med-01');
    assert.equal(found, undefined, 'Medicamento inativo não deve aparecer no catálogo');
  });

  test('Deve reativar medicamento inativo (toggle)', () => {
    store.resetToDefaults();
    // Inativa primeiro
    toggleMedicationStatus('med-01');
    // Reativa
    const result = toggleMedicationStatus('med-01');

    assert.equal(result.success, true);
    assert.equal(result.newStatus, true, 'Medicamento deve ser reativado');

    // Deve reaparecer no catálogo
    const catalog = getCatalogView();
    const found = catalog.find((m) => m.id === 'med-01');
    assert.ok(found, 'Medicamento reativado deve aparecer no catálogo');
  });
});

// ======================================================================
// SUITE 4: Badges de Estoque Crítico
// ======================================================================

describe('Catálogo de Medicamentos: Badges de Estoque Crítico', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve retornar badges de estoque crítico para medicamentos abaixo do alerta', () => {
    store.resetToDefaults();
    const badges = getLowStockBadges();

    assert.ok(badges.length > 0, 'Deve haver ao menos um medicamento em estado crítico');

    for (const badge of badges) {
      assert.ok(badge.id, 'Badge deve ter id');
      assert.ok(badge.name, 'Badge deve ter nome do medicamento');
      assert.ok(typeof badge.stockQuantity === 'number');
      assert.ok(typeof badge.minStockAlert === 'number');
      assert.ok(
        badge.stockQuantity < badge.minStockAlert,
        `${badge.name}: estoque ${badge.stockQuantity} não é menor que minAlert ${badge.minStockAlert}`
      );
      assert.ok(badge.severity === 'OUT_OF_STOCK' || badge.severity === 'LOW_STOCK');
    }
  });

  test('Deve classificar severidade como OUT_OF_STOCK quando estoque é zero', () => {
    store.resetToDefaults();
    const badges = getLowStockBadges();

    // Amoxicilina (med-03) tem estoque 0
    const amoxBadge = badges.find((b) => b.id === 'med-03');
    assert.ok(amoxBadge, 'Amoxicilina deve ter badge (estoque=0)');
    assert.equal(amoxBadge?.severity, 'OUT_OF_STOCK');
  });

  test('Deve classificar severidade como LOW_STOCK quando estoque > 0 mas abaixo do alerta', () => {
    store.resetToDefaults();
    const badges = getLowStockBadges();

    // Omeprazol (med-05) tem estoque 4, minAlert 10
    const omepBadge = badges.find((b) => b.id === 'med-05');
    assert.ok(omepBadge, 'Omeprazol deve ter badge (estoque=4 < minAlert=10)');
    assert.equal(omepBadge?.severity, 'LOW_STOCK');
  });
});

// ======================================================================
// SUITE 5: Gatilho Reativo — Reabastecimento promove SubOrders
// ======================================================================

describe('Catálogo de Medicamentos: Reabastecimento Reativo', () => {
  beforeEach(() => {
    store.resetToDefaults();
  });

  test('Deve promover SubOrder de AGUARDANDO_REPOSICAO para EM_SEPARACAO ao reabastecer', () => {
    store.resetToDefaults();

    // 1. Cria e triia um pedido que desmembra (med-03 zerado)
    const citizen = store.getCurrentCitizen();
    const order = store.createOrder({
      citizenId: citizen.id,
      prescriptionImageUrl: 'data:image/png;base64,test'
    });
    store.performTriage(order.id, [
      { medicationId: 'med-01', approvedQty: 5 },
      { medicationId: 'med-03', approvedQty: 3 }
    ]);

    // Confirma que Remessa B está AGUARDANDO_REPOSICAO
    const afterTriage = store.getOrderById(order.id)!;
    const remessaB = afterTriage.subOrders.find((s) => s.status === 'AGUARDANDO_REPOSICAO')!;
    assert.ok(remessaB, 'Remessa B deve estar AGUARDANDO_REPOSICAO antes do reabastecimento');

    // 2. Reabastecer Amoxicilina via adjustMedicationStock (+50)
    const restockResult = adjustMedicationStock('med-03', +50);
    assert.equal(restockResult.success, true);

    // 3. Verificar que a Remessa B foi promovida automaticamente para EM_SEPARACAO
    const afterRestock = store.getOrderById(order.id)!;
    const remessaBAfter = afterRestock.subOrders.find((s) => s.id === remessaB.id)!;
    assert.equal(
      remessaBAfter.status,
      'EM_SEPARACAO',
      'Remessa B deve ter sido automaticamente promovida para EM_SEPARACAO'
    );
  });

  test('Deve notificar listeners ao reabastecer estoque (reatividade do store)', () => {
    store.resetToDefaults();

    let notificationCount = 0;
    const unsubscribe = store.subscribe(() => {
      notificationCount++;
    });
    notificationCount = 0; // ignora a notificação inicial do subscribe

    adjustMedicationStock('med-01', +10);
    unsubscribe();

    assert.ok(
      notificationCount > 0,
      'O store deve ter notificado os subscribers após o reabastecimento'
    );
  });
});

// ======================================================================
// SUITE 5: Gestão de Estoque Distribuído por Unidades Básicas de Saúde (UBSs)
// ======================================================================
describe('Catálogo de Medicamentos: Estoque por UBSs e Reabastecimento Reativo', () => {
  test('Deve estruturar saldo individual por UBS para medicamentos da rede', () => {
    store.resetToDefaults();
    const meds = store.getMedications();
    const losartana = meds.find(m => m.id === 'med-01')!;

    assert.ok(losartana.estoquePorUnidade, 'Deve possuir estoque distribuído por unidade');
    assert.equal(losartana.estoquePorUnidade['Farmácia Central'], 60);
    assert.equal(losartana.estoquePorUnidade['UBS Morada do Sol'], 25);
    assert.equal(losartana.estoquePorUnidade['UBS Itaici'], 15);
    assert.equal(losartana.estoquePorUnidade['UBS Cecap'], 10);
    assert.equal(losartana.estoquePorUnidade['UBS Parque Corolla'], 10);

    const sum = Object.values(losartana.estoquePorUnidade).reduce((acc, v) => acc + v, 0);
    assert.equal(sum, losartana.stockQuantity, 'A soma das UBSs deve corresponder ao saldo total');
  });

  test('Deve permitir ajustar estoque de UBS específica e recalcular saldo geral', () => {
    store.resetToDefaults();
    // Adiciona +10 na UBS Morada do Sol para Losartana (original: 25)
    const res = adjustMedicationStockUnit('med-01', 'UBS Morada do Sol', 10);
    assert.equal(res.success, true);
    assert.equal(res.newStock, 130);
    assert.equal(res.estoquePorUnidade!['UBS Morada do Sol'], 35);
  });

  test('Deve disparar promoção reativa de SubOrders pendentes ao abastecer UBS zerada', () => {
    store.resetToDefaults();
    const currentCitizen = store.getCurrentCitizen();

    // 1. Cria pedido com Amoxicilina (estoque inicial zerado)
    const order = store.createOrder({
      citizenId: currentCitizen.id,
      prescriptionImageUrl: 'receita-teste-ubs.jpg'
    });

    store.performTriage(order.id, [
      { medicationId: 'med-01', approvedQty: 5 }, // disponível
      { medicationId: 'med-03', approvedQty: 10 } // zerado
    ]);

    const orderBefore = store.getOrderById(order.id)!;
    const subB = orderBefore.subOrders.find(s => s.status === 'AGUARDANDO_REPOSICAO')!;
    assert.ok(subB, 'Deve existir subordem AGUARDANDO_REPOSICAO');

    // 2. Abastece a Amoxicilina diretamente na UBS Morada do Sol (+20)
    const res = adjustMedicationStockUnit('med-03', 'UBS Morada do Sol', 20);
    assert.equal(res.success, true);

    // 3. SubOrder deve ser promovida para EM_SEPARACAO
    const orderAfter = store.getOrderById(order.id)!;
    const subBAfter = orderAfter.subOrders.find(s => s.id === subB.id)!;
    assert.equal(subBAfter.status, 'EM_SEPARACAO', 'SubOrder deve ser promovida reativamente para EM_SEPARACAO');
  });
});

