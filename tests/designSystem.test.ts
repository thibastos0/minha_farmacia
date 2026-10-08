/**
 * Testes Unitários: Design System e Shell Acessível (WCAG AA)
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Verificação TDD dos critérios de aceitação da Task 2
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  A11Y_TOKENS,
  MODULE_TABS,
  type ModuleRole,
  NavigationManager,
  MOCK_PROFILES,
  type AuthUser
} from '../src/core/navigation.ts';
import { StateStore } from '../src/core/store.ts';

describe('Design System "Minha Indaiatuba" e Acessibilidade (WCAG AA)', () => {
  test('Deve garantir token de área mínima de toque de 48px conforme WCAG 2.1 AA', () => {
    assert.equal(
      A11Y_TOKENS.MIN_TOUCH_TARGET_PX,
      48,
      'A área mínima de toque deve ser rigorosamente 48px'
    );
    assert.equal(
      A11Y_TOKENS.TOUCH_TARGET_CLASS,
      'min-h-[48px] min-w-[48px]',
      'A classe Tailwind de alvo de toque deve assegurar 48px mínimos'
    );
  });

  test('Deve possuir a paleta oficial Minha Indaiatuba com contraste e cantos arredondados', () => {
    assert.equal(A11Y_TOKENS.BG_GLOBAL, '#f8fafc');
    assert.equal(A11Y_TOKENS.CARD_RADIUS, 'rounded-3xl');
    assert.ok(A11Y_TOKENS.PRIMARY_GREEN.includes('059669'));
    assert.ok(A11Y_TOKENS.MUNICIPAL_BLUE.includes('0284c7'));
  });

  test('Deve conter os três módulos desacoplados no menu de navegação', () => {
    const roles = MODULE_TABS.map((t) => t.role);
    assert.deepEqual(roles, ['cidadao', 'farmacia', 'entregador']);
  });
});

describe('NavigationManager: Shell e Acessibilidade de Abas', () => {
  let nav: NavigationManager;

  beforeEach(() => {
    nav = new NavigationManager('cidadao');
  });

  test('Deve inicializar com o módulo do Cidadão ativo e atributos ARIA corretos', () => {
    assert.equal(nav.getActiveRole(), 'cidadao');
    const tabs = nav.getTabsState();
    
    const cidadaoTab = tabs.find((t) => t.role === 'cidadao');
    const farmaciaTab = tabs.find((t) => t.role === 'farmacia');
    const entregadorTab = tabs.find((t) => t.role === 'entregador');

    assert.equal(cidadaoTab?.isSelected, true);
    assert.equal(farmaciaTab?.isSelected, false);
    assert.equal(entregadorTab?.isSelected, false);
  });

  test('Deve alternar módulos de forma fluida e atualizar estados ARIA', () => {
    let announcedMessage = '';
    nav.onAnnouncement((msg) => {
      announcedMessage = msg;
    });

    nav.switchRole('farmacia');
    assert.equal(nav.getActiveRole(), 'farmacia');

    const tabs = nav.getTabsState();
    assert.equal(tabs.find((t) => t.role === 'farmacia')?.isSelected, true);
    assert.equal(tabs.find((t) => t.role === 'cidadao')?.isSelected, false);

    assert.match(
      announcedMessage,
      /Painel da Farmácia/i,
      'Deve anunciar a mudança de contexto para leitores de tela'
    );

    nav.switchRole('entregador');
    assert.equal(nav.getActiveRole(), 'entregador');
    assert.match(announcedMessage, /Painel do Entregador/i);
  });

  test('Deve disparar callback específico quando a aba da Farmácia for ativada (para suporte ao mapa Leaflet)', () => {
    let mapTriggered = false;
    nav.onFarmaciaActivated(() => {
      mapTriggered = true;
    });

    nav.switchRole('farmacia');
    assert.equal(mapTriggered, true, 'Deve notificar a ativação da farmácia para o ciclo de vida do mapa');
  });
});

describe('Autenticação e Perfis de Acesso Simulado (Cidadão ID / Acesso Municipal)', () => {
  let nav: NavigationManager;
  let store: StateStore;

  beforeEach(() => {
    nav = new NavigationManager('cidadao');
    store = new StateStore();
  });

  test('Deve conter perfis pré-definidos para Cidadão, Farmácia e Entregador', () => {
    assert.ok(MOCK_PROFILES.cidadao, 'Perfil de cidadão deve existir');
    assert.ok(MOCK_PROFILES.farmacia, 'Perfil de farmácia deve existir');
    assert.ok(MOCK_PROFILES.entregador, 'Perfil de entregador deve existir');

    assert.equal(MOCK_PROFILES.cidadao.username, 'usuario');
    assert.equal(MOCK_PROFILES.cidadao.displayName, 'Thiago Silva');
    assert.equal(MOCK_PROFILES.farmacia.displayName, 'Dra. Renata Souza');
    assert.equal(MOCK_PROFILES.entregador.displayName, 'Marcos Vinicius');
  });

  test('Deve realizar login de Cidadão e notificar ouvintes', () => {
    let notifiedUser: AuthUser | null = null;
    nav.onAuthChange((user) => {
      notifiedUser = user;
    });

    const user = nav.login('cidadao', 'usuario');
    assert.equal(user.role, 'cidadao');
    assert.equal(user.displayName, 'Thiago Silva');
    assert.equal(nav.getActiveRole(), 'cidadao');
    assert.deepEqual(notifiedUser, user);
  });

  test('Deve realizar login de Farmacêutico RT e alternar módulo automaticamente', () => {
    const user = nav.login('farmacia', 'farmaceutico');
    assert.equal(user.role, 'farmacia');
    assert.equal(user.badgeTitle, 'Farmacêutica RT (CRF 48.219)');
    assert.equal(nav.getActiveRole(), 'farmacia');
  });

  test('Deve realizar login de Entregador Municipal e alternar módulo', () => {
    const user = nav.login('entregador', 'entregador');
    assert.equal(user.role, 'entregador');
    assert.equal(user.badgeTitle, 'Entregador Municipal (Moto IND-2026)');
    assert.equal(nav.getActiveRole(), 'entregador');
  });

  test('Deve permitir logout e limpar o usuário ativo', () => {
    nav.login('cidadao', 'usuario');
    assert.ok(nav.getCurrentUser());

    let notifiedUser: AuthUser | null = nav.getCurrentUser();
    nav.onAuthChange((user) => {
      notifiedUser = user;
    });

    nav.logout();
    assert.equal(nav.getCurrentUser(), null);
    assert.equal(notifiedUser, null);
  });

  test('Deve cadastrar novo munícipe no Store e disponibilizá-lo para seleção', () => {
    const initialCount = store.getCitizens().length;

    const newCitizen = store.addCitizen({
      name: 'Mariana dos Santos',
      cpf: '999.888.777-66',
      phone: '(19) 99123-4567',
      address: {
        street: 'Rua das Primaveras',
        number: '350',
        neighborhood: 'Jardim Primavera',
        city: 'Indaiatuba',
        state: 'SP',
        zipCode: '13330-000'
      }
    });

    assert.ok(newCitizen.id.startsWith('cit-'));
    assert.equal(store.getCitizens().length, initialCount + 1);

    store.setCurrentCitizen(newCitizen.id);
    assert.equal(store.getCurrentCitizen().name, 'Mariana dos Santos');
    assert.equal(store.getCurrentCitizen().cpf, '999.888.777-66');
  });
});
