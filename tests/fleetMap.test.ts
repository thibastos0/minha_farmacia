/**
 * Testes Unitários: Módulo da Farmácia — Mapa da Frota Leaflet.js e invalidateSize()
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 6
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { store } from '../src/core/store.ts';
import {
  INDAIATUBA_CENTER,
  getFleetMarkersData,
  initFleetMap,
  invalidateMapSize,
  destroyFleetMap
} from '../src/modules/farmacia/fleetMapService.ts';
import { NavigationManager } from '../src/core/navigation.ts';

describe('Módulo da Farmácia: Mapa da Frota Leaflet.js', () => {
  beforeEach(() => {
    store.resetToDefaults();
    destroyFleetMap();
  });

  test('Deve centralizar o mapa nas coordenadas oficiais de Indaiatuba', () => {
    assert.equal(INDAIATUBA_CENTER.lat, -23.0903);
    assert.equal(INDAIATUBA_CENTER.lng, -47.2181);
    assert.equal(INDAIATUBA_CENTER.zoom, 14);
  });

  test('Deve gerar marcador fixo da Farmácia Central e marcadores da frota de entregadores', () => {
    store.resetToDefaults();
    const markers = getFleetMarkersData();

    assert.ok(markers.length >= 3, 'Deve haver no mínimo o marcador da farmácia e dos 2 entregadores seed');

    // 1. Marcador da Farmácia Central
    const pharmacy = markers.find((m) => m.type === 'PHARMACY');
    assert.ok(pharmacy, 'Deve conter o marcador da Farmácia Central');
    assert.equal(pharmacy?.lat, -23.0903);
    assert.equal(pharmacy?.lng, -47.2181);
    assert.match(pharmacy?.title!, /Farmácia Central/i);
    assert.match(pharmacy?.popupHtml!, /Farmácia Central de Indaiatuba/i);

    // 2. Marcadores dos Entregadores
    const couriers = markers.filter((m) => m.type === 'COURIER');
    assert.equal(couriers.length, store.getState().couriers.length);

    for (const courierMarker of couriers) {
      assert.ok(courierMarker.id);
      assert.ok(courierMarker.title);
      assert.ok(courierMarker.vehicleInfo);
      assert.ok(typeof courierMarker.lat === 'number');
      assert.ok(typeof courierMarker.lng === 'number');
      assert.ok(courierMarker.popupHtml.includes(courierMarker.title));
    }
  });

  test('Deve atualizar marcador com informações da entrega quando o entregador estiver em rota', () => {
    store.resetToDefaults();

    // Cria um pedido e atribui uma SubOrder para o motoboy cour-01 em rota
    const citizen = store.getCurrentCitizen();
    const order = store.createOrder({
      citizenId: citizen.id,
      prescriptionImageUrl: 'data:image/png;base64,test'
    });

    const triage = store.performTriage(order.id, [
      { medicationId: 'med-01', approvedQty: 5 }
    ]);

    const subOrder = triage.result?.subOrders[0]!;
    subOrder.assignedCourierId = 'cour-01';
    subOrder.status = 'SAIU_PARA_ENTREGA';

    const markers = getFleetMarkersData();
    const cour01Marker = markers.find((m) => m.id === 'cour-01');

    assert.ok(cour01Marker, 'Marcador do cour-01 deve existir');
    assert.equal(cour01Marker?.statusText, 'Em Rota');
    assert.match(cour01Marker?.popupHtml!, /Em Rota de Entrega/i);
    assert.match(cour01Marker?.popupHtml!, new RegExp(citizen.name));
  });

  test('Deve inicializar o mapa graciosamente sem erros em ambientes com ou sem DOM', () => {
    const map = initFleetMap('map-gerencial');
    assert.ok(map, 'Deve retornar a instância do mapa ou mock seguro');
  });

  test('Deve invocar invalidateSize() via hook de redimensionamento ao ativar a aba da Farmácia', () => {
    const nav = new NavigationManager('cidadao');
    let invalidateCalled = false;

    // Simula inicialização do mapa
    initFleetMap('map-gerencial');

    nav.onFarmaciaActivated(() => {
      invalidateCalled = invalidateMapSize();
    });

    // Alterna para o módulo da farmácia
    nav.switchRole('farmacia');

    assert.equal(
      invalidateCalled,
      true,
      'O hook onFarmaciaActivated deve disparar invalidateSize no mapa'
    );
  });
});
