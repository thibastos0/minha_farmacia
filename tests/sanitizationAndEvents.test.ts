/**
 * Testes Unitários e de Interface:
 * Higienização de Textos e Correção de Eventos na Fila de Farmácia
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  openModalValidacao,
  closeModalValidacao,
  openWhatsAppChat,
  openModalDespacho,
  closeModalDespacho
} from '../src/app.ts';

describe('Higienização de Textos da Interface (index.html)', () => {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  test('Botão no Portal do Cidadão deve ser "Ver Detalhes do Pedido e Remessas" sem menção ao Mercado Livre', () => {
    assert.match(
      htmlContent,
      /Ver Detalhes do Pedido e Remessas/,
      'O botão do munícipe deve ter o texto exato "Ver Detalhes do Pedido e Remessas"'
    );
    assert.doesNotMatch(
      htmlContent,
      /Estilo Mercado Livre/i,
      'Não deve conter menção a "(Estilo Mercado Livre)" na interface'
    );
    assert.doesNotMatch(
      htmlContent,
      /Mercado Livre/i,
      'Não deve conter nenhuma menção ao Mercado Livre no index.html'
    );
  });

  test('Deve substituir termos internos ("1:N", "splitEngine", "mock") por termos institucionais limpos', () => {
    assert.doesNotMatch(
      htmlContent,
      /\b1:N\b/i,
      'Não deve conter o termo técnico "1:N" visível na interface ou scripts do index.html'
    );
    assert.doesNotMatch(
      htmlContent,
      /splitEngine/i,
      'Não deve conter a referência interna "splitEngine" em index.html'
    );
    assert.doesNotMatch(
      htmlContent,
      /\bmock\b/i,
      'Não deve conter a palavra "mock" no index.html'
    );
    assert.match(
      htmlContent,
      /Entrega Desmembrada Municipal/i,
      'Deve conter a nomenclatura institucional "Entrega Desmembrada Municipal"'
    );
  });

  test('Deve remover referências externas como "Estilo iFood" e "Estilo Delivery"', () => {
    assert.doesNotMatch(
      htmlContent,
      /iFood/i,
      'Não deve conter referências ao iFood'
    );
    assert.doesNotMatch(
      htmlContent,
      /Estilo Delivery/i,
      'Não deve conter menções informais como "Estilo Delivery"'
    );
  });
});

describe('Correção dos Eventos na Fila de Farmácia (/farmacia)', () => {
  const htmlPath = path.resolve(process.cwd(), 'index.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  test('Deve associar openModalValidacao tanto ao botão "Validar Receita" quanto ao link "📄 Receita Médica"', () => {
    // Verifica o link de Receita Médica na tabela
    assert.match(
      htmlContent,
      /onclick="openModalValidacao\('\$\{p\.id\}'\)"[^>]*>[\s\S]*?Receita Médica/,
      'O elemento de Receita Médica na tabela de solicitações deve ter o evento onclick="openModalValidacao(\'${p.id}\')"'
    );

    // Verifica o botão "Validar Receita" na tabela
    assert.match(
      htmlContent,
      /onclick="openModalValidacao\('\$\{p\.id\}'\)"[^>]*>[\s\S]*?Validar Receita/,
      'O botão Validar Receita deve chamar openModalValidacao(\'${p.id}\')'
    );
  });

  test('Modal de inspeção RDC 44/2009 deve conter simulação visual da Receita do SUS com timbre, CRM, paciente e posologia', () => {
    // 1. Timbre oficial de Indaiatuba / SUS
    assert.match(htmlContent, /Prefeitura Municipal de Indaiatuba/i);
    assert.match(htmlContent, /Secretaria Municipal de Saúde/i);
    assert.match(htmlContent, /Sistema Único de Saúde/i);
    assert.match(htmlContent, /UBS Morada do Sol/i);

    // 2. Médico e CRM
    assert.match(htmlContent, /val-medico-nome/);
    assert.match(htmlContent, /val-medico-crm/);
    assert.match(htmlContent, /CRM-SP/i);

    // 3. Paciente, Cartão SUS, CPF e Endereço
    assert.match(htmlContent, /val-cliente-nome/);
    assert.match(htmlContent, /val-cliente-sus/);
    assert.match(htmlContent, /val-cliente-cpf/);
    assert.match(htmlContent, /val-cliente-end/);

    // 4. Posologia Prescrita
    assert.match(htmlContent, /Posologia Prescrita/i);
    assert.match(htmlContent, /Losartana Potássica/i);
    assert.match(htmlContent, /Amoxicilina/i);

    // 5. RDC 44/2009
    assert.match(htmlContent, /RDC 44\/2009/i);
    assert.match(htmlContent, /Dra\. Camila S\. Rocha/i);
  });

  test('Funções openModalValidacao, openWhatsAppChat e openModalDespacho devem estar expostas e ser chamáveis', () => {
    assert.equal(typeof openModalValidacao, 'function', 'openModalValidacao deve ser função');
    assert.equal(typeof closeModalValidacao, 'function', 'closeModalValidacao deve ser função');
    assert.equal(typeof openWhatsAppChat, 'function', 'openWhatsAppChat deve ser função');
    assert.equal(typeof openModalDespacho, 'function', 'openModalDespacho deve ser função');
    assert.equal(typeof closeModalDespacho, 'function', 'closeModalDespacho deve ser função');

    // Executa sem quebrar em ambiente Node / sem DOM
    assert.doesNotThrow(() => {
      openModalValidacao('ord-01');
      closeModalValidacao();
      openWhatsAppChat('19998765432', 'PED-2026-001-A', 'Munícipe');
      openModalDespacho('ord-01', 'sub-01', 'PED-A');
      closeModalDespacho();
    });

    // Verifica que estão expostas no window no script do index.html
    assert.match(htmlContent, /window\.openModalValidacao\s*=/);
    assert.match(htmlContent, /window\.openWhatsAppChat\s*=/);
    assert.match(htmlContent, /window\.openModalDespacho\s*=/);
  });
});
