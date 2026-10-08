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
  getAvailableDeliveries,
  getActiveCourierDeliveries,
  acceptCourierDelivery,
  dispatchSubOrder,
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
  getPharmacyDashboardCounters,
  dispatchOrderForPickup
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
 * Atualiza classes visuais e atributos ARIA dos botões do seletor de módulos (topo e mobile bottom nav)
 */
export function updateNavigationUI(): void {
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

    // Atualiza botões superiores da barra de navegação
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

    // Atualiza botões da barra de navegação inferior (Mobile Bottom Navigation Bar)
    const bottomBtn = document.getElementById(`bottom-btn-role-${tab.role}`);
    if (bottomBtn) {
      bottomBtn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      bottomBtn.setAttribute('tabindex', isSelected ? '0' : '-1');

      if (isSelected) {
        bottomBtn.classList.add('bg-emerald-800', 'text-white', 'font-black', 'shadow-inner');
        bottomBtn.classList.remove('text-emerald-200');
      } else {
        bottomBtn.classList.remove('bg-emerald-800', 'text-white', 'font-black', 'shadow-inner');
        bottomBtn.classList.add('text-emerald-200');
      }
    }
  });
}

/**
 * Alterna visibilidade das seções dos 3 módulos desacoplados
 */
export function updatePanelsVisibility(): void {
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

/**
 * Autentica usuário simulado com base no perfil selecionado
 */
export function loginUser(
  role: ModuleRole,
  username?: string,
  customData?: Partial<any>
): any {
  const user = navManager.login(role, username, customData);
  updateAuthUI();
  updateNavigationUI();
  updatePanelsVisibility();
  closeModalLogin();

  // Sincroniza com o cidadão ativo no store caso seja perfil de cidadão
  if (role === 'cidadao') {
    const citizens = store.getCitizens();
    const targetCpf = customData?.cpf || user.cpf;
    const match = citizens.find((c) => (targetCpf && c.cpf === targetCpf) || c.name === user.displayName);
    if (match) {
      store.setCurrentCitizen(match.id);
    }
  }

  // Notifica tecnologias assistivas
  announceToScreenReader(`Acesso concedido para ${user.displayName} como ${user.badgeTitle}.`);
  return user;
}

/**
 * Encerra a sessão e reabre o modal de login para troca de perfil
 */
export function logoutUser(): void {
  navManager.logout();
  updateAuthUI();
  openModalLogin();
  announceToScreenReader('Sessão encerrada. Selecione um perfil para entrar.');
}

/**
 * Atualiza os badges e dados do usuário no cabeçalho e tela do munícipe
 */
export function updateAuthUI(): void {
  if (typeof document === 'undefined') return;
  const user = navManager.getCurrentUser();

  const avatarEl = document.getElementById('user-avatar-badge');
  const nameEl = document.getElementById('user-display-name');
  const roleEl = document.getElementById('user-role-badge');
  const modalLogin = document.getElementById('modal-login');

  if (user) {
    if (avatarEl) avatarEl.textContent = user.avatarInitials || 'ID';
    if (nameEl) nameEl.textContent = user.displayName;
    if (roleEl) roleEl.textContent = user.badgeTitle;
    if (modalLogin) {
      modalLogin.classList.add('hidden');
      modalLogin.setAttribute('hidden', 'true');
    }

    // Se estiver no módulo do cidadão, atualiza o cartão do munícipe na home
    const citNameEl = document.getElementById('cit-profile-name');
    const citAddrEl = document.getElementById('cit-profile-address');
    const citInitEl = document.getElementById('cit-profile-initials');
    if (citNameEl && user.role === 'cidadao') citNameEl.textContent = user.displayName;
    if (citAddrEl && user.role === 'cidadao') {
      citAddrEl.innerHTML = `<i class="fa-solid fa-location-dot text-emerald-600 mr-1"></i> ${user.address || 'Indaiatuba - SP'}`;
    }
    if (citInitEl && user.role === 'cidadao') citInitEl.textContent = user.avatarInitials;
  } else {
    if (avatarEl) avatarEl.textContent = '??';
    if (nameEl) nameEl.textContent = 'Não Autenticado';
    if (roleEl) roleEl.textContent = 'Cidadão ID / Acesso Municipal';
  }
}

export function openModalLogin(): void {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('modal-login');
  if (modal) {
    modal.classList.remove('hidden');
    modal.removeAttribute('hidden');
  }
}

export function closeModalLogin(): void {
  if (typeof document === 'undefined') return;
  const modal = document.getElementById('modal-login');
  if (modal) {
    modal.classList.add('hidden');
    modal.setAttribute('hidden', 'true');
  }
}

export function openModalCadastro(): void {
  if (typeof document === 'undefined') return;
  const modalCad = document.getElementById('modal-cadastro');
  if (modalCad) {
    modalCad.classList.remove('hidden');
    modalCad.removeAttribute('hidden');
    const nomeInput = document.getElementById('cad-nome');
    if (nomeInput) (nomeInput as HTMLElement).focus();
  }
}

export function closeModalCadastro(): void {
  if (typeof document === 'undefined') return;
  const modalCad = document.getElementById('modal-cadastro');
  if (modalCad) {
    modalCad.classList.add('hidden');
    modalCad.setAttribute('hidden', 'true');
  }
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
    getAvailableDeliveries,
    getActiveCourierDeliveries,
    acceptCourierDelivery,
    dispatchSubOrder,
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
    dispatchOrderForPickup,
    // Catálogo e Estoque
    getCatalogView,
    searchCatalog,
    addMedication,
    editMedication,
    adjustMedicationStock,
    toggleMedicationStatus,
    getLowStockBadges,
    // Motor 1:N
    evaluateAndSplitOrder,
    // Autenticação e Perfis
    loginUser,
    logoutUser,
    updateAuthUI,
    openModalLogin,
    closeModalLogin,
    openModalCadastro,
    closeModalCadastro
  };

  // Suporte aos cliques dos botões legados ou declarados inline
  (window as any).switchRole = switchRole;
  (window as any).loginUser = loginUser;
  (window as any).logoutUser = logoutUser;
  (window as any).openModalLogin = openModalLogin;
  (window as any).closeModalLogin = closeModalLogin;
  (window as any).openModalCadastro = openModalCadastro;
  (window as any).closeModalCadastro = closeModalCadastro;
  (window as any).updateAuthUI = updateAuthUI;
  (window as any).updateNavigationUI = updateNavigationUI;
  (window as any).updatePanelsVisibility = updatePanelsVisibility;
  (window as any).initMap = () => {
    initFleetMap('map-gerencial');
  };
  (window as any).initFleetMap = initFleetMap;
  (window as any).invalidateMapSize = invalidateMapSize;
  (window as any).getCourierDeliveries = getCourierDeliveries;
  (window as any).getAvailableDeliveries = getAvailableDeliveries;
  (window as any).getActiveCourierDeliveries = getActiveCourierDeliveries;
  (window as any).acceptCourierDelivery = acceptCourierDelivery;
  (window as any).dispatchSubOrder = dispatchSubOrder;
  (window as any).dispatchOrderForPickup = dispatchOrderForPickup;
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
    updateAuthUI();

    // Se o usuário ainda não realizou o login, exibe o modal inicial de login
    if (!navManager.getCurrentUser()) {
      openModalLogin();
    }
  });
}

