/**
 * Aplicação Principal do Minha Farmácia (Frontend Orchestrator)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Conecta o Store Reativo e NavigationManager à interface WCAG AA
 */

import { store } from './core/store.ts';
import { NavigationManager, MODULE_TABS, type ModuleRole } from './core/navigation.ts';

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
export function switchRole(role: ModuleRole): void {
  navManager.switchRole(role);
  updateNavigationUI();
  updatePanelsVisibility();
}

/**
 * Atualiza classes visuais e atributos ARIA dos botões do seletor de módulos
 */
function updateNavigationUI(): void {
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
        btn.className =
          'role-btn min-h-[48px] px-4 py-3 rounded-2xl bg-white text-emerald-950 font-black text-sm shadow-md flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950';
      } else {
        btn.className =
          'role-btn min-h-[48px] px-4 py-3 rounded-2xl hover:bg-emerald-800 text-emerald-100 font-bold text-sm flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950';
      }
    });
  });
}

/**
 * Alterna visibilidade das seções dos 3 módulos desacoplados
 */
function updatePanelsVisibility(): void {
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

// Vincula ouvintes e disponibiliza funções no escopo global para o index.html
if (typeof window !== 'undefined') {
  (window as any).MinhaFarmacia = {
    store,
    navManager,
    switchRole,
    announceToScreenReader
  };

  // Suporte aos cliques dos botões legados ou declarados inline
  (window as any).switchRole = switchRole;

  navManager.onAnnouncement((msg) => {
    announceToScreenReader(msg);
  });

  // Inicialização no carregamento da página
  document.addEventListener('DOMContentLoaded', () => {
    updateNavigationUI();
    updatePanelsVisibility();
  });
}
