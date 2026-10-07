/**
 * Serviço de Mapeamento Geográfico da Frota Leaflet.js — Farmácia Municipal
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 *
 * Responsável por:
 * - Renderização do mapa Leaflet centrado em Indaiatuba (-23.0903, -47.2181)
 * - Marcador fixo da Farmácia Central Municipal
 * - Marcadores interativos da frota de entregadores/motoboys com popups completos
 * - Hook de redimensionamento `invalidateSize()` para evitar tiles cinzas/quebrados
 *   quando o mapa é inicializado em abas ocultas.
 */

import { store } from '../../core/store.ts';
import type { Courier, Order } from '../../core/types.ts';

/** Coordenadas centrais da Farmácia Central de Indaiatuba */
export const INDAIATUBA_CENTER = {
  lat: -23.0903,
  lng: -47.2181,
  zoom: 14
};

/** Estrutura do marcador informativo do mapa */
export interface FleetMarkerInfo {
  id: string;
  type: 'PHARMACY' | 'COURIER' | 'DESTINATION';
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  vehicleInfo?: string;
  statusText: string;
  popupHtml: string;
}

/** Estado da instância do mapa mantida pelo serviço */
let activeMapInstance: any = null;
let currentContainerId: string | null = null;
let markerObjects: Map<string, any> = new Map();

/**
 * Retorna os dados completos de todos os marcadores da frota e pontos de interesse
 */
export function getFleetMarkersData(): FleetMarkerInfo[] {
  const markers: FleetMarkerInfo[] = [];

  // 1. Marcador Principal: Farmácia Central de Indaiatuba
  markers.push({
    id: 'pharmacy-central',
    type: 'PHARMACY',
    title: 'Farmácia Central de Indaiatuba',
    subtitle: 'Prefeitura Municipal • Ponto Central de Distribuição',
    lat: INDAIATUBA_CENTER.lat,
    lng: INDAIATUBA_CENTER.lng,
    statusText: 'Operacional',
    popupHtml: `
      <div class="p-2 space-y-1 font-sans">
        <div class="flex items-center gap-1.5 text-emerald-800 font-extrabold text-sm">
          <i class="fa-solid fa-hospital"></i> Farmácia Central de Indaiatuba
        </div>
        <p class="text-xs text-gray-600 font-medium">Ponto Central de Distribuição RENAME</p>
        <p class="text-[11px] text-gray-500">Rua Candelária, 800 - Centro, Indaiatuba - SP</p>
        <span class="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">
          Ponto de Origem da Frota
        </span>
      </div>
    `
  });

  // 2. Marcadores da Frota de Entregadores do Store
  const couriers = store.getState().couriers;
  const orders = store.getOrders();

  couriers.forEach((courier) => {
    // Procura se o entregador tem alguma entrega ativa (SAIU_PARA_ENTREGA)
    let activeDeliveryInfo: { citizenName?: string; address?: string } | null = null;

    for (const order of orders) {
      const activeSub = order.subOrders.find(
        (s) => s.assignedCourierId === courier.id && s.status === 'SAIU_PARA_ENTREGA'
      );
      if (activeSub) {
        activeDeliveryInfo = {
          citizenName: order.citizenName,
          address: `${order.deliveryAddress.street}, ${order.deliveryAddress.number} - ${order.deliveryAddress.neighborhood}`
        };
        break;
      }
    }

    const lat = courier.currentLocation?.lat ?? INDAIATUBA_CENTER.lat;
    const lng = courier.currentLocation?.lng ?? INDAIATUBA_CENTER.lng;

    const statusBadge = activeDeliveryInfo
      ? `<span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Em Rota de Entrega</span>`
      : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Disponível / Livre</span>`;

    const deliveryText = activeDeliveryInfo
      ? `<div class="mt-1 text-xs text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-200">
           <p class="font-bold"><i class="fa-solid fa-user"></i> Destino: ${activeDeliveryInfo.citizenName}</p>
           <p class="text-[11px] text-gray-600">${activeDeliveryInfo.address}</p>
         </div>`
      : `<p class="text-xs text-gray-500 italic mt-1">Aguardando atribuição de nova corrida.</p>`;

    markers.push({
      id: courier.id,
      type: 'COURIER',
      title: courier.name,
      subtitle: `Veículo: ${courier.vehicle} (${courier.plate})`,
      lat,
      lng,
      vehicleInfo: `${courier.vehicle} - ${courier.plate}`,
      statusText: activeDeliveryInfo ? 'Em Rota' : 'Livre',
      popupHtml: `
        <div class="p-2 space-y-1 font-sans">
          <div class="flex items-center justify-between gap-2 border-b pb-1">
            <h4 class="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <i class="fa-solid fa-motorcycle text-emerald-600"></i> ${courier.name}
            </h4>
            ${statusBadge}
          </div>
          <p class="text-xs text-gray-600"><b>Placa/Veículo:</b> ${courier.plate} (${courier.vehicle})</p>
          <p class="text-xs text-gray-600"><b>Contato:</b> ${courier.phone}</p>
          ${deliveryText}
        </div>
      `
    });
  });

  return markers;
}

/**
 * Inicializa a instância do mapa Leaflet no container especificado.
 * Trata graciosamente ambientes sem window/Leaflet (ex: testes unitários em Node).
 */
export function initFleetMap(containerId: string = 'map-gerencial'): any {
  if (typeof window === 'undefined' || !(window as any).L) {
    // Retorna mock seguro em ambiente Node / testes unitários
    currentContainerId = containerId;
    const mockMap = {
      isMock: true,
      invalidateSize: () => true,
      remove: () => true,
      setView: () => true
    };
    activeMapInstance = mockMap;
    return mockMap;
  }

  const L = (window as any).L;
  const container = document.getElementById(containerId);
  if (!container) return null;

  // Destrói instância prévia se já existia no mesmo container
  if (activeMapInstance) {
    try {
      activeMapInstance.remove();
    } catch (e) {
      // ignora erro ao remover
    }
    activeMapInstance = null;
    markerObjects.clear();
  }

  currentContainerId = containerId;

  // Cria o mapa centrado em Indaiatuba
  const map = L.map(containerId).setView(
    [INDAIATUBA_CENTER.lat, INDAIATUBA_CENTER.lng],
    INDAIATUBA_CENTER.zoom
  );

  // Adiciona camada de tiles do OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; Prefeitura de Indaiatuba / OpenStreetMap'
  }).addTo(map);

  activeMapInstance = map;

  // Renderiza os marcadores iniciais
  renderMapMarkers();

  // Executa invalidateSize após pequeno timeout para renderização correta
  setTimeout(() => {
    invalidateMapSize();
  }, 100);

  return map;
}

/**
 * Atualiza ou recria os marcadores da frota no mapa Leaflet ativo
 */
export function renderMapMarkers(): void {
  if (!activeMapInstance || typeof window === 'undefined' || !(window as any).L) {
    return;
  }

  const L = (window as any).L;

  // Limpa marcadores existentes
  markerObjects.forEach((m) => {
    try {
      activeMapInstance.removeLayer(m);
    } catch (e) {
      // ignora
    }
  });
  markerObjects.clear();

  const markersData = getFleetMarkersData();

  markersData.forEach((data) => {
    // Escolhe ícone customizado de acordo com o tipo
    let icon;
    if (data.type === 'PHARMACY') {
      icon = L.divIcon({
        className: 'custom-pharmacy-icon',
        html: `
          <div style="background-color: #059669; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
            <i class="fa-solid fa-hospital" style="font-size: 16px;"></i>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });
    } else {
      const isRoute = data.statusText === 'Em Rota';
      const bgColor = isRoute ? '#0284c7' : '#059669';
      icon = L.divIcon({
        className: 'custom-courier-icon',
        html: `
          <div style="background-color: ${bgColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 3px 5px -1px rgba(0,0,0,0.3);">
            <i class="fa-solid fa-motorcycle" style="font-size: 14px;"></i>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -16]
      });
    }

    const marker = L.marker([data.lat, data.lng], { icon })
      .addTo(activeMapInstance)
      .bindPopup(data.popupHtml);

    markerObjects.set(data.id, marker);
  });
}

/**
 * Invoca `map.invalidateSize()` na instância do Leaflet para recalcular
 * as dimensões do mapa quando uma aba ou contêiner oculto se torna visível.
 *
 * Solução técnica definitiva para tiles cinzas ou cortados no Leaflet.js.
 */
export function invalidateMapSize(): boolean {
  if (!activeMapInstance) return false;

  try {
    if (typeof activeMapInstance.invalidateSize === 'function') {
      activeMapInstance.invalidateSize();
      return true;
    }
  } catch (e) {
    console.warn('Erro ao invocar invalidateSize no mapa:', e);
  }
  return false;
}

/**
 * Retorna a instância ativa do mapa Leaflet (ou null)
 */
export function getActiveMapInstance(): any {
  return activeMapInstance;
}

/**
 * Desconecta e limpa o mapa ativo
 */
export function destroyFleetMap(): void {
  if (activeMapInstance) {
    try {
      activeMapInstance.remove();
    } catch (e) {
      // ignora
    }
  }
  activeMapInstance = null;
  currentContainerId = null;
  markerObjects.clear();
}
