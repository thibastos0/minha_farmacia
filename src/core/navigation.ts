/**
 * Sistema de Navegação Acessível e Tokens de Design
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Conforme especificado em .spec/01_architecture_and_design.md
 */

export type ModuleRole = 'cidadao' | 'farmacia' | 'entregador';

export const A11Y_TOKENS = {
  MIN_TOUCH_TARGET_PX: 48,
  TOUCH_TARGET_CLASS: 'min-h-[48px] min-w-[48px]',
  BG_GLOBAL: '#f8fafc',
  CARD_RADIUS: 'rounded-3xl',
  PRIMARY_GREEN: '#059669',
  PRIMARY_GREEN_HOVER: '#047857',
  MUNICIPAL_BLUE: '#0284c7',
  FOCUS_RING_CLASS:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2'
};

export interface ModuleTabConfig {
  role: ModuleRole;
  label: string;
  ariaLabel: string;
  targetId: string;
  icon: string;
}

export const MODULE_TABS: ModuleTabConfig[] = [
  {
    role: 'cidadao',
    label: 'Área do Cidadão',
    ariaLabel: 'Acessar Área do Cidadão e Acompanhamento de Remédios',
    targetId: 'portal-cidadao',
    icon: 'fa-solid fa-user'
  },
  {
    role: 'farmacia',
    label: 'Painel da Farmácia & Gestão',
    ariaLabel: 'Acessar Painel do Farmacêutico, Triagem e Gestão de Estoque',
    targetId: 'portal-farmacia',
    icon: 'fa-solid fa-user-doctor'
  },
  {
    role: 'entregador',
    label: 'Painel do Entregador',
    ariaLabel: 'Acessar Painel do Motoboy e Entregas em Trânsito',
    targetId: 'portal-entregador',
    icon: 'fa-solid fa-motorcycle'
  }
];

export interface TabState {
  role: ModuleRole;
  label: string;
  ariaLabel: string;
  targetId: string;
  icon: string;
  isSelected: boolean;
}

export class NavigationManager {
  private activeRole: ModuleRole;
  private announcementListeners: Set<(msg: string) => void> = new Set();
  private farmaciaListeners: Set<() => void> = new Set();
  private roleChangeListeners: Set<(role: ModuleRole) => void> = new Set();

  constructor(initialRole: ModuleRole = 'cidadao') {
    this.activeRole = initialRole;
  }

  public getActiveRole(): ModuleRole {
    return this.activeRole;
  }

  public getTabsState(): TabState[] {
    return MODULE_TABS.map((tab) => ({
      ...tab,
      isSelected: tab.role === this.activeRole
    }));
  }

  public switchRole(role: ModuleRole): void {
    if (this.activeRole === role) return;
    this.activeRole = role;

    const tab = MODULE_TABS.find((t) => t.role === role);
    const roleName = tab ? tab.label : role;
    const msg = `Navegado para ${roleName}. Conteúdo atualizado.`;

    // Notifica leitores de tela
    this.announcementListeners.forEach((fn) => fn(msg));

    // Notifica ouvintes de troca de papel
    this.roleChangeListeners.forEach((fn) => fn(role));

    // Notificação específica de ativação da farmácia (para invalidateSize do mapa)
    if (role === 'farmacia') {
      this.farmaciaListeners.forEach((fn) => fn());
    }
  }

  public onAnnouncement(listener: (msg: string) => void): () => void {
    this.announcementListeners.add(listener);
    return () => this.announcementListeners.delete(listener);
  }

  public onFarmaciaActivated(listener: () => void): () => void {
    this.farmaciaListeners.add(listener);
    return () => this.farmaciaListeners.delete(listener);
  }

  public onRoleChange(listener: (role: ModuleRole) => void): () => void {
    this.roleChangeListeners.add(listener);
    return () => this.roleChangeListeners.delete(listener);
  }
}
