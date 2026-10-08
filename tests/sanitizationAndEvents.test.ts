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
  openModalTriagem,
  closeModalTriagem,
  aprovarESelecionarMedicamentos,
  voltarParaReceita,
  openWhatsAppChat,
  openModalDespacho,
  closeModalDespacho,
  store
} from '../src/app.ts';
import { StateStore } from '../src/core/store.ts';

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
    // Verifica o link de Receita Médica na tabela com onclick="window.openModalValidacao('${pedido.id}')"
    assert.match(
      htmlContent,
      /onclick="(?:window\.)?openModalValidacao\('\$\{(?:p|pedido)\.id\}'\)"[^>]*>[\s\S]*?Receita Médica/,
      'O elemento de Receita Médica na tabela de solicitações deve ter o evento onclick="window.openModalValidacao(\'${pedido.id}\')"'
    );

    // Verifica o botão "Validar Receita" na tabela
    assert.match(
      htmlContent,
      /onclick="(?:window\.)?openModalValidacao\('\$\{(?:p|pedido)\.id\}'\)"[^>]*>[\s\S]*?Validar Receita/,
      'O botão Validar Receita deve chamar window.openModalValidacao(\'${pedido.id}\')'
    );
  });

  test('Modal de inspeção RDC 44/2009 deve conter simulação visual da Receita do SUS com timbre, CRM, paciente e posologia', () => {
    // 1. Timbre oficial de Indaiatuba / SUS
    assert.match(htmlContent, /PREFEITURA MUNICIPAL DE INDAIATUBA • SECRETARIA MUNICIPAL DE SAÚDE/i);
    assert.match(htmlContent, /Sistema Único de Saúde/i);
    assert.match(htmlContent, /Receituário Médico Oficial/i);
    assert.match(htmlContent, /UBS Morada do Sol/i);

    // 2. Médico e CRM
    assert.match(htmlContent, /val-medico-nome/);
    assert.match(htmlContent, /val-medico-crm/);
    assert.match(htmlContent, /Dr\. Eduardo Lima/);
    assert.match(htmlContent, /CRM-SP/i);
    assert.match(htmlContent, /142\.890/);

    // 3. Paciente, Cartão SUS, CPF e Endereço
    assert.match(htmlContent, /val-cliente-nome/);
    assert.match(htmlContent, /val-cliente-sus/);
    assert.match(htmlContent, /val-cliente-cpf/);
    assert.match(htmlContent, /val-prescricao-data/);
    assert.match(htmlContent, /val-cliente-end/);

    // 4. Três Medicamentos Prescritos com posologias exatas
    assert.match(htmlContent, /1\.\s*Amoxicilina\s*500mg/i);
    assert.match(htmlContent, /Tomar 1 comprimido de 8 em 8 horas por 7 dias \(2 caixas\)/i);

    assert.match(htmlContent, /2\.\s*Losartana\s*Potássica\s*50mg/i);
    assert.match(htmlContent, /Tomar 1 comprimido ao dia de uso contínuo \(1 caixa\)/i);

    assert.match(htmlContent, /3\.\s*Dipirona\s*500mg/i);
    assert.match(htmlContent, /Tomar 1 comprimido se houver dor ou febre \(1 caixa\)/i);

    // 5. Rodapé da Receita: Assinatura e Carimbo Digital + QR Code de Autenticidade do SUS
    assert.match(htmlContent, /Assinatura & Carimbo Digital/i);
    assert.match(htmlContent, /Dr\. Eduardo Lima — CRM-SP 142\.890/i);
    assert.match(htmlContent, /QR Code de Autenticidade do SUS/i);
    assert.match(htmlContent, /Chave:\s*SUS-SP-IND-9A82F1/i);
    assert.match(htmlContent, /Portaria 467\/2020/i);

    // 6. RDC 44/2009 e RT Farmacêutica
    assert.match(htmlContent, /RDC 44\/2009/i);
    assert.match(htmlContent, /Dra\. Camila S\. Rocha/i);
  });

  test('Botão "Aprovar e Selecionar Medicamentos" deve transicionar para modal de triagem e desmembramento', () => {
    // Verifica botão de transição na modal de receita
    assert.match(htmlContent, /id="btn-aprovar-receita"/);
    assert.match(htmlContent, /onclick="aprovarESelecionarMedicamentos\(\)"/);
    assert.match(htmlContent, /Aprovar e Selecionar Medicamentos/);

    // Verifica presença da modal de triagem e botão de retorno
    assert.match(htmlContent, /id="modal-triagem"/);
    assert.match(htmlContent, /onclick="voltarParaReceita\(\)"/);
    assert.match(htmlContent, /Voltar à Receita Médica/);
  });

  test('Funções de validação, triagem, WhatsApp e despacho devem estar expostas e ser chamáveis', () => {
    assert.equal(typeof openModalValidacao, 'function', 'openModalValidacao deve ser função');
    assert.equal(typeof closeModalValidacao, 'function', 'closeModalValidacao deve ser função');
    assert.equal(typeof openModalTriagem, 'function', 'openModalTriagem deve ser função');
    assert.equal(typeof closeModalTriagem, 'function', 'closeModalTriagem deve ser função');
    assert.equal(typeof aprovarESelecionarMedicamentos, 'function', 'aprovarESelecionarMedicamentos deve ser função');
    assert.equal(typeof voltarParaReceita, 'function', 'voltarParaReceita deve ser função');
    assert.equal(typeof openWhatsAppChat, 'function', 'openWhatsAppChat deve ser função');
    assert.equal(typeof openModalDespacho, 'function', 'openModalDespacho deve ser função');
    assert.equal(typeof closeModalDespacho, 'function', 'closeModalDespacho deve ser função');

    // Executa sem quebrar em ambiente Node / sem DOM
    assert.doesNotThrow(() => {
      openModalValidacao('ord-01');
      closeModalValidacao();
      openModalTriagem('ord-01');
      closeModalTriagem();
      aprovarESelecionarMedicamentos('ord-01');
      voltarParaReceita('ord-01');
      openWhatsAppChat('19998765432', 'PED-2026-001-A', 'Munícipe');
      openModalDespacho('ord-01', 'sub-01', 'PED-A');
      closeModalDespacho();
    });

    // Verifica que estão expostas no window no script do index.html
    assert.match(htmlContent, /window\.openModalValidacao\s*=/);
    assert.match(htmlContent, /window\.closeModalValidacao\s*=/);
    assert.match(htmlContent, /window\.aprovarESelecionarMedicamentos\s*=/);
    assert.match(htmlContent, /window\.voltarParaReceita\s*=/);
    assert.match(htmlContent, /window\.openModalTriagem\s*=/);
    assert.match(htmlContent, /window\.closeModalTriagem\s*=/);
    assert.match(htmlContent, /window\.openWhatsAppChat\s*=/);
    assert.match(htmlContent, /window\.openModalDespacho\s*=/);
    assert.match(htmlContent, /window\.closeModalDespacho\s*=/);
  });

  test('StateStore deve implementar getCitizenById e expor getters de orders e citizens sem quebrar', () => {
    assert.equal(typeof store.getCitizenById, 'function', 'store.getCitizenById deve ser uma função');
    const citizen = store.getCitizenById('cit-01');
    assert.ok(citizen, 'Deve localizar cidadão cit-01');
    assert.equal(citizen?.id, 'cit-01');
    assert.ok(Array.isArray(store.orders), 'store.orders deve ser um array');
    assert.ok(Array.isArray(store.citizens), 'store.citizens deve ser um array');

    // Execução com pedido inexistente ou com cidadão ausente não deve lançar exceção
    assert.doesNotThrow(() => {
      openModalValidacao('pedido-inexistente-xyz');
      openModalTriagem('pedido-inexistente-xyz');
    });
  });
});
