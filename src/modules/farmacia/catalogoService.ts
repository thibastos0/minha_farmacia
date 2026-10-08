/**
 * Serviço do Catálogo de Medicamentos — CRUD e Reabastecimento Reativo
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 *
 * Responsável pela lógica de negócio do gerenciamento do catálogo municipal:
 * - Listagem e busca por texto/categoria com badges de estoque crítico
 * - CRUD completo: criação com validação, edição, inativação lógica (soft delete)
 * - Ajuste rápido de estoque (+10, +50, -10) com gatilho reativo automático
 * - Gatilho reativo: reabastecimento promove SubOrders AGUARDANDO_REPOSICAO → EM_SEPARACAO
 */

import { store } from '../../core/store.ts';
import type { Medication, MedicationCategory, UBSUnit } from '../../core/types.ts';

// ======================================================================
// TIPOS PÚBLICOS DA CAMADA DE VIEW
// ======================================================================

/** View enriquecida de um medicamento para exibição no catálogo */
export interface MedicationView extends Medication {
  isLowStock: boolean;    // true quando stockQuantity < minStockAlert
  isOutOfStock: boolean;  // true quando stockQuantity === 0
}

/** Parâmetros de busca no catálogo */
export interface CatalogSearchParams {
  query?: string;              // busca por nome ou dosagem (case-insensitive)
  category?: MedicationCategory;
  includeInactive?: boolean;   // padrão: false (só ativos)
}

/** Campos para criação de novo medicamento (sem id e active, gerados automaticamente) */
export interface AddMedicationParams {
  name: string;
  dosage: string;
  presentation: string;
  stockQuantity: number;
  minStockAlert: number;
  category: MedicationCategory;
  estoquePorUnidade?: Record<UBSUnit, number>;
}

/** Resultado de operações de criação/edição */
export interface MedicationMutationResult {
  success: boolean;
  medication?: MedicationView;
  error?: string;
}

/** Resultado de ajuste de estoque */
export interface StockAdjustResult {
  success: boolean;
  newStock?: number;
  error?: string;
}

/** Resultado de toggle de status ativo/inativo */
export interface ToggleStatusResult {
  success: boolean;
  newStatus?: boolean;
  error?: string;
}

/** Badge de alerta de estoque crítico */
export type StockSeverity = 'OUT_OF_STOCK' | 'LOW_STOCK';

export interface LowStockBadge {
  id: string;
  name: string;
  dosage: string;
  category: MedicationCategory;
  stockQuantity: number;
  minStockAlert: number;
  severity: StockSeverity;
}

// ======================================================================
// HELPERS INTERNOS
// ======================================================================

/** Converte um Medication do store em MedicationView com flags de estoque */
function toMedicationView(med: Medication): MedicationView {
  return {
    ...med,
    isOutOfStock: med.stockQuantity === 0,
    isLowStock: med.stockQuantity < med.minStockAlert
  };
}

/** Valida os campos obrigatórios de um novo medicamento */
function validateMedicationParams(params: AddMedicationParams): string | null {
  if (!params.name || params.name.trim() === '') {
    return 'O nome do medicamento é obrigatório.';
  }
  if (!params.dosage || params.dosage.trim() === '') {
    return 'A dosagem do medicamento é obrigatória.';
  }
  if (!params.presentation || params.presentation.trim() === '') {
    return 'A apresentação do medicamento é obrigatória.';
  }
  if (typeof params.stockQuantity !== 'number' || params.stockQuantity < 0) {
    return 'A quantidade em estoque deve ser um número não negativo.';
  }
  if (typeof params.minStockAlert !== 'number' || params.minStockAlert < 0) {
    return 'O alerta mínimo de estoque deve ser um número não negativo.';
  }
  return null;
}

// ======================================================================
// FUNÇÕES DE SERVIÇO — LEITURA
// ======================================================================

/**
 * Retorna todos os medicamentos ativos do catálogo, enriquecidos com flags de estoque.
 * Ordenados alfabeticamente por nome.
 *
 * Critério de Aceitação: Tabela acessível com lista de medicamentos da RENAME de Indaiatuba.
 */
export function getCatalogView(includeInactive = false): MedicationView[] {
  const meds = store.getMedications();

  return meds
    .filter((m) => includeInactive || m.active)
    .map(toMedicationView)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Busca medicamentos por texto livre (nome ou dosagem) e/ou categoria.
 * Retorna apenas medicamentos ativos por padrão.
 *
 * Critério de Aceitação: CRUD funcional — buscar por texto/categoria.
 */
export function searchCatalog(params: CatalogSearchParams): MedicationView[] {
  const meds = store.getMedications();
  const queryLower = params.query?.toLowerCase().trim() ?? '';

  return meds
    .filter((m) => params.includeInactive || m.active)
    .filter((m) => {
      if (queryLower === '') return true;
      return (
        m.name.toLowerCase().includes(queryLower) ||
        m.dosage.toLowerCase().includes(queryLower) ||
        m.presentation.toLowerCase().includes(queryLower)
      );
    })
    .filter((m) => {
      if (!params.category) return true;
      return m.category === params.category;
    })
    .map(toMedicationView)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

/**
 * Retorna a lista de medicamentos com estoque crítico (abaixo do minStockAlert).
 * Inclui medicamentos zerados (severity=OUT_OF_STOCK) e baixos (severity=LOW_STOCK).
 *
 * Critério de Aceitação: Badges visuais de estoque crítico (< minStockAlert).
 */
export function getLowStockBadges(): LowStockBadge[] {
  const meds = store.getMedications();

  return meds
    .filter((m) => m.active && m.stockQuantity < m.minStockAlert)
    .map((m): LowStockBadge => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      category: m.category,
      stockQuantity: m.stockQuantity,
      minStockAlert: m.minStockAlert,
      severity: m.stockQuantity === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK'
    }))
    .sort((a, b) => a.stockQuantity - b.stockQuantity); // mais críticos primeiro
}

// ======================================================================
// FUNÇÕES DE SERVIÇO — MUTAÇÃO (CRUD)
// ======================================================================

/**
 * Cria um novo medicamento no catálogo com validação de campos obrigatórios.
 * O novo medicamento é marcado como ativo por padrão.
 *
 * Critério de Aceitação: CRUD funcional — criar medicamentos.
 */
export function addMedication(params: AddMedicationParams): MedicationMutationResult {
  const validationError = validateMedicationParams(params);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const newMed = store.addMedication({
    name: params.name.trim(),
    dosage: params.dosage.trim(),
    presentation: params.presentation.trim(),
    stockQuantity: params.stockQuantity,
    minStockAlert: params.minStockAlert,
    category: params.category,
    estoquePorUnidade: params.estoquePorUnidade,
    active: true
  });

  return { success: true, medication: toMedicationView(newMed) };
}

/**
 * Edita um medicamento existente no catálogo.
 * Aceita atualizações parciais (Partial<Medication>).
 *
 * Critério de Aceitação: CRUD funcional — editar medicamentos.
 */
export function editMedication(
  id: string,
  updates: Partial<Omit<Medication, 'id'>>
): MedicationMutationResult {
  const existing = store.getMedications().find((m) => m.id === id);
  if (!existing) {
    return { success: false, error: `Medicamento ${id} não encontrado no catálogo.` };
  }

  // Validações de campos editados
  if (updates.name !== undefined && updates.name.trim() === '') {
    return { success: false, error: 'O nome do medicamento não pode ser vazio.' };
  }
  if (updates.dosage !== undefined && updates.dosage.trim() === '') {
    return { success: false, error: 'A dosagem do medicamento não pode ser vazia.' };
  }
  if (updates.stockQuantity !== undefined && updates.stockQuantity < 0) {
    return { success: false, error: 'A quantidade em estoque não pode ser negativa.' };
  }

  const updated = store.updateMedication(id, updates);
  if (!updated) {
    return { success: false, error: `Falha ao atualizar o medicamento ${id}.` };
  }

  const newMed = store.getMedications().find((m) => m.id === id)!;
  return { success: true, medication: toMedicationView(newMed) };
}

/**
 * Ajusta o estoque de um medicamento por um delta positivo ou negativo.
 * O estoque nunca fica negativo.
 * Ao adicionar estoque (+delta), aciona o gatilho reativo do store que promove
 * SubOrders de AGUARDANDO_REPOSICAO → EM_SEPARACAO automaticamente.
 *
 * Critério de Aceitação:
 * - Botões de ajuste rápido (+10, +50, -10).
 * - Ao adicionar estoque de item em falta, pedidos aguardando reposição são promovidos.
 */
export function adjustMedicationStock(id: string, delta: number): StockAdjustResult {
  const existing = store.getMedications().find((m) => m.id === id);
  if (!existing) {
    return { success: false, error: `Medicamento ${id} não encontrado no catálogo.` };
  }

  // Delega ao store que encapsula o gatilho reativo checkAndPromoteAwaitingOrders
  const updated = store.adjustStock(id, delta);
  if (!updated) {
    return { success: false, error: `Falha ao ajustar estoque do medicamento ${id}.` };
  }

  const newMed = store.getMedications().find((m) => m.id === id)!;
  return { success: true, newStock: newMed.stockQuantity };
}

/**
 * Ajusta o saldo de estoque de um medicamento em uma UBS específica de Indaiatuba.
 * Ao adicionar estoque em uma unidade zerada, dispara a promoção reativa das SubOrders pendentes.
 */
export function adjustMedicationStockUnit(
  id: string,
  ubs: UBSUnit,
  delta: number
): StockAdjustResult & { estoquePorUnidade?: Record<UBSUnit, number> } {
  const existing = store.getMedications().find((m) => m.id === id);
  if (!existing) {
    return { success: false, error: `Medicamento ${id} não encontrado no catálogo.` };
  }

  const updated = store.adjustStockUnit(id, ubs, delta);
  if (!updated) {
    return { success: false, error: `Falha ao ajustar estoque na unidade ${ubs}.` };
  }

  const newMed = store.getMedications().find((m) => m.id === id)!;
  return {
    success: true,
    newStock: newMed.stockQuantity,
    estoquePorUnidade: newMed.estoquePorUnidade
  };
}

/**
 * Alterna o status ativo/inativo de um medicamento (soft delete / reativação).
 * Medicamentos inativados não aparecem no catálogo nem na triagem,
 * mas seus dados históricos são preservados no store.
 *
 * Critério de Aceitação: Inativação lógica com preservação de histórico.
 */
export function toggleMedicationStatus(id: string): ToggleStatusResult {
  const existing = store.getMedications().find((m) => m.id === id);
  if (!existing) {
    return { success: false, error: `Medicamento ${id} não encontrado no catálogo.` };
  }

  const updated = store.toggleMedicationActive(id);
  if (!updated) {
    return { success: false, error: `Falha ao alterar status do medicamento ${id}.` };
  }

  const newMed = store.getMedications().find((m) => m.id === id)!;
  return { success: true, newStatus: newMed.active };
}
