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
  NavigationManager
} from '../src/core/navigation.ts';

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
