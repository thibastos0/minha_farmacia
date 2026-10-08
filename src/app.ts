/**
 * Aplicação Principal do Minha Farmácia (Frontend Orchestrator)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Conecta o Store Reativo e NavigationManager à interface WCAG AA
 */

import { store } from './core/store.ts';
import { NavigationManager, MODULE_TABS, type ModuleRole } from './core/navigation.ts';
import {
  initFleetMap,
  invalidateMapSize,
  renderMapMarkers,
  getFleetMarkersData,
  INDAIATUBA_CENTER
} from './modules/farmacia/fleetMapService.ts';
import {
  getCourierDeliveries,
  getWhatsAppLink,
  validateAndCompleteDelivery,
  formatPhoneForWhatsApp
} from './modules/entregador/entregadorService.ts';
import {
  createCitizenPrescriptionOrder,
  formatCitizenOrdersView,
  getCitizenSplitBannerInfo
} from './modules/cidadao/cidadaoService.ts';
import {
  getPharmacyTriageQueue,
  previewStockImpact,
  performPharmacyTriage,
  getPharmacyDashboardCounters
} from './modules/farmacia/farmaciaService.ts';
import {
  getCatalogView,
  searchCatalog,
  addMedication,
  editMedication,
  adjustMedicationStock,
  toggleMedicationStatus,
  getLowStockBadges
} from './modules/farmacia/catalogoService.ts';
import { evaluateAndSplitOrder } from './core/splitEngine.ts';

// Inicializa o gerenciador de navegação
export const navManager = new NavigationManager('cidadao');

/**
 * Anuncia mensagens textuais para tecnologias assistivas (leitores de tela)
 */
export function announceToScreenReader(message: string): void {
  const announcer = document.getElementById('a11y-announcer');
  if (announcer) {
    announcer.textContent = message;
  }
}

/**
 * Alterna visualmente as abas do sistema preservando a conformidade com WCAG AA
 */
export function switchRole(role: ModuleRole | string): void {
  const roleMap: Record<string, ModuleRole> = {
    cliente: 'cidadao',
    cidadao: 'cidadao',
    funcionario: 'farmacia',
    farmacia: 'farmacia',
    motoboy: 'entregador',
    entregador: 'entregador'
  };
  const normalizedRole: ModuleRole = roleMap[role] || (role as ModuleRole);

  navManager.switchRole(normalizedRole);
  updateNavigationUI();
  updatePanelsVisibility();

  // Garante que a sub-aba inicial da Farmácia seja exibida se estiver na janela
  if (normalizedRole === 'farmacia' && typeof (window as any)?.switchFuncTab === 'function') {
    try {
      (window as any).switchFuncTab('dash');
    } catch (e) {
      console.warn('Não foi possível ativar a sub-aba da farmácia:', e);
    }
  }
}

/**
 * Atualiza classes visuais e atributos ARIA dos botões do seletor de módulos
 */
function updateNavigationUI(): void {
  if (typeof document === 'undefined') return;
  const currentRole = navManager.getActiveRole();

  const legacyIdMap: Record<ModuleRole, string> = {
    cidadao: 'btn-role-cliente',
    farmacia: 'btn-role-funcionario',
    entregador: 'btn-role-motoboy'
  };

  MODULE_TABS.forEach((tab) => {
    const isSelected = tab.role === currentRole;
    const btnIds = [`btn-role-${tab.role}`, legacyIdMap[tab.role]];

    btnIds.forEach((id) => {
      const btn = document.getElementById(id);
      if (!btn) return;

      btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      btn.setAttribute('role', 'tab');
      btn.setAttribute('tabindex', isSelected ? '0' : '-1');

      if (isSelected) {
        btn.classList.add('bg-white', 'text-emerald-950', 'shadow-md', 'font-black');
        btn.classList.remove('hover:bg-emerald-800', 'text-emerald-100', 'text-white', 'font-bold');
      } else {
        btn.classList.remove('bg-white', 'text-emerald-950', 'shadow-md', 'font-black');
        btn.classList.add('hover:bg-emerald-800', 'text-emerald-100', 'font-bold');
      }
    });
  });
}

/**
 * Alterna visibilidade das seções dos 3 módulos desacoplados
 */
function updatePanelsVisibility(): void {
  if (typeof document === 'undefined') return;
  const currentRole = navManager.getActiveRole();

  const sectionMap: Record<ModuleRole, string[]> = {
    cidadao: ['portal-cidadao', 'portal-cliente'],
    farmacia: ['portal-farmacia', 'portal-funcionario'],
    entregador: ['portal-entregador', 'portal-motoboy']
  };

  (Object.keys(sectionMap) as ModuleRole[]).forEach((role) => {
    const isCurrent = role === currentRole;
    sectionMap[role].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;

      if (isCurrent) {
        el.classList.remove('hidden');
        el.removeAttribute('hidden');
        el.setAttribute('tabindex', '-1');
      } else {
        el.classList.add('hidden');
        el.setAttribute('hidden', 'true');
      }
    });
  });
}

// Vincula ouvinte de ativação do módulo da farmácia ao hook invalidateSize do mapa
navManager.onFarmaciaActivated(() => {
  setTimeout(() => {
    invalidateMapSize();
    renderMapMarkers();
  }, 100);
});

// Sincroniza atualizações reativas do store com os marcadores do mapa
store.subscribe(() => {
  renderMapMarkers();
});

// Vincula ouvintes e disponibiliza funções no escopo global para o index.html
if (typeof window !== 'undefined') {
  (window as any).MinhaFarmacia = {
    store,
    navManager,
    switchRole,
    announceToScreenReader,
    initFleetMap,
    invalidateMapSize,
    renderMapMarkers,
    getFleetMarkersData,
    INDAIATUBA_CENTER,
    getCourierDeliveries,
    getWhatsAppLink,
    validateAndCompleteDelivery,
    formatPhoneForWhatsApp,
    // Módulo do Cidadão
    createCitizenPrescriptionOrder,
    formatCitizenOrdersView,
    getCitizenSplitBannerInfo,
    // Módulo da Farmácia
    getPharmacyTriageQueue,
    previewStockImpact,
    performPharmacyTriage,
    getPharmacyDashboardCounters,
    // Catálogo e Estoque
    getCatalogView,
    searchCatalog,
    addMedication,
    editMedication,
    adjustMedicationStock,
    toggleMedicationStatus,
    getLowStockBadges,
    // Motor 1:N
    evaluateAndSplitOrder
  };

  // Suporte aos cliques dos botões legados ou declarados inline
  (window as any).switchRole = switchRole;
  (window as any).initMap = () => {
    initFleetMap('map-gerencial');
  };
  (window as any).initFleetMap = initFleetMap;
  (window as any).invalidateMapSize = invalidateMapSize;
  (window as any).getCourierDeliveries = getCourierDeliveries;
  (window as any).getWhatsAppLink = getWhatsAppLink;
  (window as any).validateAndCompleteDelivery = validateAndCompleteDelivery;
  (window as any).createCitizenPrescriptionOrder = createCitizenPrescriptionOrder;
  (window as any).formatCitizenOrdersView = formatCitizenOrdersView;
  (window as any).getCitizenSplitBannerInfo = getCitizenSplitBannerInfo;
  (window as any).getPharmacyTriageQueue = getPharmacyTriageQueue;
  (window as any).performPharmacyTriage = performPharmacyTriage;
  (window as any).previewStockImpact = previewStockImpact;
  (window as any).getPharmacyDashboardCounters = getPharmacyDashboardCounters;
  (window as any).getCatalogView = getCatalogView;
  (window as any).searchCatalog = searchCatalog;
  (window as any).addMedication = addMedication;
  (window as any).adjustMedicationStock = adjustMedicationStock;
  (window as any).toggleMedicationStatus = toggleMedicationStatus;

  navManager.onAnnouncement((msg) => {
    announceToScreenReader(msg);
  });

  // Inicialização no carregamento da página
  document.addEventListener('DOMContentLoaded', () => {
    updateNavigationUI();
    updatePanelsVisibility();
  });
}
