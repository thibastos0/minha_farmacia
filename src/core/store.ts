/**
 * Store Reativo Central com Sincronização e Pub/Sub
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Conforme especificado em .spec/01_architecture_and_design.md e .spec/02_data_models_and_split.md
 */

import type {
  Order,
  SubOrder,
  Medication,
  Citizen,
  Courier,
  TriageDecision,
  SplitResult,
  UBSUnit
} from './types.ts';
import { evaluateAndSplitOrder } from './splitEngine.ts';
import {
  INITIAL_CITIZENS,
  INITIAL_MEDICATIONS,
  INITIAL_COURIERS,
  INITIAL_ORDERS
} from './seedData.ts';

export interface StateData {
  citizens: Citizen[];
  currentCitizenId: string;
  medications: Medication[];
  couriers: Courier[];
  orders: Order[];
}

export type StoreListener = (state: StateData) => void;

export class StateStore {
  private data: StateData;
  private listeners: Set<StoreListener> = new Set();
  private storageKey = 'minha_farmacia_state_v1';

  constructor() {
    this.data = this.loadInitialData();
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  private loadInitialData(): StateData {
    if (this.isBrowser()) {
      try {
        const saved = window.localStorage.getItem(this.storageKey);
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Erro ao ler localStorage, utilizando dados iniciais', e);
      }
    }

    return {
      citizens: JSON.parse(JSON.stringify(INITIAL_CITIZENS)),
      currentCitizenId: INITIAL_CITIZENS[0].id,
      medications: JSON.parse(JSON.stringify(INITIAL_MEDICATIONS)),
      couriers: JSON.parse(JSON.stringify(INITIAL_COURIERS)),
      orders: JSON.parse(JSON.stringify(INITIAL_ORDERS))
    };
  }

  private persistAndNotify(): void {
    if (this.isBrowser()) {
      try {
        window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
      } catch (e) {
        console.warn('Erro ao salvar no localStorage', e);
      }
    }
    const snapshot = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        console.error('Erro em listener do store:', e);
      }
    });
  }

  public subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    // Notifica o novo listener imediatamente com o estado atual
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): StateData {
    return JSON.parse(JSON.stringify(this.data));
  }

  public resetToDefaults(): void {
    this.data = {
      citizens: JSON.parse(JSON.stringify(INITIAL_CITIZENS)),
      currentCitizenId: INITIAL_CITIZENS[0].id,
      medications: JSON.parse(JSON.stringify(INITIAL_MEDICATIONS)),
      couriers: JSON.parse(JSON.stringify(INITIAL_COURIERS)),
      orders: JSON.parse(JSON.stringify(INITIAL_ORDERS))
    };
    this.persistAndNotify();
  }

  // === MÉTODOS DE CIDADÃO ===
  public getCurrentCitizen(): Citizen {
    const cit = this.data.citizens.find((c) => c.id === this.data.currentCitizenId);
    return cit || this.data.citizens[0];
  }

  public getCitizens(): Citizen[] {
    return [...this.data.citizens];
  }

  public getCitizenById(citizenId: string): Citizen | undefined {
    return this.data.citizens.find((c) => c.id === citizenId);
  }

  public get citizens(): Citizen[] {
    return [...this.data.citizens];
  }

  public get orders(): Order[] {
    return [...this.data.orders];
  }

  public setCurrentCitizen(citizenId: string): void {
    if (this.data.citizens.some((c) => c.id === citizenId)) {
      this.data.currentCitizenId = citizenId;
      this.persistAndNotify();
    }
  }

  public addCitizen(citizenData: {
    name: string;
    cpf: string;
    cartaoSus?: string;
    phone?: string;
    address: {
      street: string;
      number: string;
      neighborhood: string;
      city?: string;
      cep?: string;
      lat?: number;
      lng?: number;
      complement?: string;
    };
  }): Citizen {
    const id = `cit-${Date.now()}`;
    const newCitizen: Citizen = {
      id,
      name: citizenData.name,
      cpf: citizenData.cpf,
      cartaoSus: citizenData.cartaoSus || '7000.9999.8888.7777',
      phone: citizenData.phone || '(19) 99999-0000',
      address: {
        street: citizenData.address.street || 'Rua Central',
        number: citizenData.address.number || '100',
        neighborhood: citizenData.address.neighborhood || 'Jardim Morada do Sol',
        city: citizenData.address.city || 'Indaiatuba - SP',
        cep: citizenData.address.cep || '13348-000',
        lat: citizenData.address.lat || -23.1042,
        lng: citizenData.address.lng || -47.2341,
        complement: citizenData.address.complement
      }
    };
    this.data.citizens.push(newCitizen);
    this.data.currentCitizenId = id;
    this.persistAndNotify();
    return newCitizen;
  }


  // === MÉTODOS DE MEDICAMENTOS (CRUD) ===
  public getMedications(): Medication[] {
    return [...this.data.medications];
  }

  public addMedication(med: Omit<Medication, 'id'>): Medication {
    const estoquePorUnidade = med.estoquePorUnidade || {
      'Farmácia Central': med.stockQuantity,
      'UBS Morada do Sol': 0,
      'UBS Itaici': 0,
      'UBS Cecap': 0,
      'UBS Parque Corolla': 0
    };
    const newMed: Medication = {
      ...med,
      estoquePorUnidade,
      id: `med-${Date.now()}`
    };
    this.data.medications.push(newMed);
    this.persistAndNotify();
    return newMed;
  }

  public updateMedication(id: string, updates: Partial<Medication>): boolean {
    const index = this.data.medications.findIndex((m) => m.id === id);
    if (index === -1) return false;

    this.data.medications[index] = {
      ...this.data.medications[index],
      ...updates
    };

    // Se houve acréscimo de estoque, aciona a reavaliação de subpedidos aguardando reposição
    if (typeof updates.stockQuantity === 'number') {
      this.checkAndPromoteAwaitingOrders(id);
    }

    this.persistAndNotify();
    return true;
  }

  public adjustStock(id: string, delta: number): boolean {
    const med = this.data.medications.find((m) => m.id === id);
    if (!med) return false;

    if (!med.estoquePorUnidade) {
      med.estoquePorUnidade = {
        'Farmácia Central': med.stockQuantity,
        'UBS Morada do Sol': 0,
        'UBS Itaici': 0,
        'UBS Cecap': 0,
        'UBS Parque Corolla': 0
      };
    }

    if (delta >= 0) {
      med.estoquePorUnidade['Farmácia Central'] = (med.estoquePorUnidade['Farmácia Central'] || 0) + delta;
    } else {
      let toRemove = Math.abs(delta);
      // Primeiro tenta remover da Farmácia Central
      const centralCurrent = med.estoquePorUnidade['Farmácia Central'] || 0;
      const removeCentral = Math.min(centralCurrent, toRemove);
      med.estoquePorUnidade['Farmácia Central'] = centralCurrent - removeCentral;
      toRemove -= removeCentral;

      // Se ainda restou a remover, remove das outras unidades
      if (toRemove > 0) {
        const otherUnits = (Object.keys(med.estoquePorUnidade) as UBSUnit[]).filter(u => u !== 'Farmácia Central');
        for (const u of otherUnits) {
          if (toRemove <= 0) break;
          const uCurrent = med.estoquePorUnidade[u] || 0;
          const take = Math.min(uCurrent, toRemove);
          med.estoquePorUnidade[u] = uCurrent - take;
          toRemove -= take;
        }
      }
    }

    // Recalcula total a partir das unidades
    med.stockQuantity = Object.values(med.estoquePorUnidade).reduce((acc, val) => acc + val, 0);

    if (delta > 0) {
      this.checkAndPromoteAwaitingOrders(id);
    }

    this.persistAndNotify();
    return true;
  }

  public adjustStockUnit(id: string, ubs: UBSUnit, delta: number): boolean {
    const med = this.data.medications.find((m) => m.id === id);
    if (!med) return false;

    if (!med.estoquePorUnidade) {
      med.estoquePorUnidade = {
        'Farmácia Central': med.stockQuantity,
        'UBS Morada do Sol': 0,
        'UBS Itaici': 0,
        'UBS Cecap': 0,
        'UBS Parque Corolla': 0
      };
    }

    const currentVal = med.estoquePorUnidade[ubs] ?? 0;
    const newVal = Math.max(0, currentVal + delta);
    med.estoquePorUnidade[ubs] = newVal;

    // Atualiza stockQuantity geral como soma de todas as unidades
    med.stockQuantity = (Object.values(med.estoquePorUnidade) as number[]).reduce((acc, val) => acc + val, 0);

    // Se adicionou estoque, aciona promoção reativa de SubOrders pendentes
    if (delta > 0) {
      this.checkAndPromoteAwaitingOrders(id);
    }

    this.persistAndNotify();
    return true;
  }

  public toggleMedicationActive(id: string): boolean {
    const med = this.data.medications.find((m) => m.id === id);
    if (!med) return false;
    med.active = !med.active;
    this.persistAndNotify();
    return true;
  }

  // === MÉTODOS DE PEDIDOS & MOTOR 1:N ===
  public getOrders(): Order[] {
    return [...this.data.orders];
  }

  public getOrderById(orderId: string): Order | undefined {
    return this.data.orders.find((o) => o.id === orderId);
  }

  public createOrder(params: {
    citizenId: string;
    prescriptionImageUrl: string;
    notes?: string;
  }): Order {
    const citizen = this.data.citizens.find((c) => c.id === params.citizenId) || this.getCurrentCitizen();
    const count = this.data.orders.length + 1;
    const code = `PED-2026-${String(count).padStart(3, '0')}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      code,
      citizenId: citizen.id,
      citizenName: citizen.name,
      citizenCpf: citizen.cpf,
      citizenPhone: citizen.phone,
      deliveryAddress: citizen.address,
      prescriptionImageUrl: params.prescriptionImageUrl,
      status: 'PENDENTE_TRIAGEM',
      isSplit: false,
      subOrders: [],
      createdAt: new Date().toISOString()
    };

    this.data.orders.unshift(newOrder);
    this.persistAndNotify();
    return newOrder;
  }

  /**
   * Executa a triagem com desmembramento inteligente 1:N
   */
  public performTriage(
    orderId: string,
    decisions: TriageDecision[],
    pharmacistId: string = 'farm-central'
  ): { success: boolean; result?: SplitResult; error?: string } {
    const order = this.data.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'Pedido não encontrado.' };

    const splitResult = evaluateAndSplitOrder(order, decisions, this.data.medications);

    if (splitResult.subOrders.length === 0) {
      return { success: false, error: 'Nenhum medicamento válido selecionado.' };
    }

    // Deduz estoque dos itens disponíveis
    for (const deduction of splitResult.stockDeductions) {
      const med = this.data.medications.find((m) => m.id === deduction.medicationId);
      if (med) {
        med.stockQuantity = Math.max(0, med.stockQuantity - deduction.quantity);
        if (med.estoquePorUnidade) {
          let rem = deduction.quantity;
          const ubsKeys = Object.keys(med.estoquePorUnidade) as UBSUnit[];
          for (const ubs of ubsKeys) {
            if (rem <= 0) break;
            const current = med.estoquePorUnidade[ubs] || 0;
            const take = Math.min(current, rem);
            med.estoquePorUnidade[ubs] = current - take;
            rem -= take;
          }
        }
      }
    }

    // Atualiza o pedido com os SubOrders
    order.isSplit = splitResult.isSplit;
    order.status = 'EM_PROCESSAMENTO';
    order.subOrders = splitResult.subOrders;
    order.reviewedByPharmacistId = pharmacistId;
    order.reviewedAt = new Date().toISOString();

    if (splitResult.isSplit) {
      order.splitReason = 'Pedido desmembrado: Remessa A imediata e Remessa B aguardando reposição.';
    }

    this.persistAndNotify();
    return { success: true, result: splitResult };
  }

  /**
   * Reabastecimento reativo: promove SubOrders em AGUARDANDO_REPOSICAO para EM_SEPARACAO
   */
  private checkAndPromoteAwaitingOrders(medicationId: string): void {
    const med = this.data.medications.find((m) => m.id === medicationId);
    if (!med || med.stockQuantity <= 0) return;

    for (const order of this.data.orders) {
      for (const subOrder of order.subOrders) {
        if (subOrder.status === 'AGUARDANDO_REPOSICAO') {
          const item = subOrder.items.find((i) => i.medicationId === medicationId && !i.isAvailable);
          if (item && med.stockQuantity >= item.quantityRequested) {
            med.stockQuantity -= item.quantityRequested;
            if (med.estoquePorUnidade) {
              let rem = item.quantityRequested;
              const ubsKeys = Object.keys(med.estoquePorUnidade) as UBSUnit[];
              for (const ubs of ubsKeys) {
                if (rem <= 0) break;
                const current = med.estoquePorUnidade[ubs] || 0;
                const take = Math.min(current, rem);
                med.estoquePorUnidade[ubs] = current - take;
                rem -= take;
              }
            }
            item.isAvailable = true;
            item.quantityApproved = item.quantityRequested;
            subOrder.status = 'EM_SEPARACAO';
            subOrder.updatedAt = new Date().toISOString();
            subOrder.notes = 'Lote reabastecido pela Farmácia Central de Indaiatuba. Liberado para separação.';
          }
        }
      }
    }
  }

  // === MÉTODOS DE ENTREGADORES E DESPACHO ===
  public getCouriers(): Courier[] {
    return [...this.data.couriers];
  }

  /**
   * Despacha uma remessa em separação para aguardando retirada pelo entregador
   */
  public dispatchSubOrder(
    subOrderId: string,
    courierId?: string
  ): { success: boolean; message: string; subOrder?: SubOrder } {
    let targetSubOrder: SubOrder | undefined;
    let parentOrder: Order | undefined;

    for (const order of this.data.orders) {
      const sub = order.subOrders.find((s) => s.id === subOrderId);
      if (sub) {
        targetSubOrder = sub;
        parentOrder = order;
        break;
      }
    }

    if (!targetSubOrder || !parentOrder) {
      return { success: false, message: 'Subpedido não encontrado.' };
    }

    if (targetSubOrder.status !== 'EM_SEPARACAO') {
      return {
        success: false,
        message: `Não é possível despachar uma remessa no status ${targetSubOrder.status}.`
      };
    }

    targetSubOrder.status = 'AGUARDANDO_RETIRADA';
    targetSubOrder.updatedAt = new Date().toISOString();

    if (courierId && courierId !== 'FROTA_GERAL') {
      const courier = this.data.couriers.find((c) => c.id === courierId);
      if (courier) {
        targetSubOrder.courierId = courier.id;
        targetSubOrder.courierName = courier.name;
        targetSubOrder.notes = `Despachado na Farmácia Central. Aguardando retirada por ${courier.name}.`;
      }
    } else {
      targetSubOrder.courierId = undefined;
      targetSubOrder.courierName = undefined;
      targetSubOrder.notes = 'Disponibilizado na Central para retirada pela frota geral de entregadores.';
    }

    this.persistAndNotify();
    return {
      success: true,
      message: `Remessa ${targetSubOrder.code} despachada para retirada com sucesso!`,
      subOrder: targetSubOrder
    };
  }

  /**
   * Aceite de corrida pelo motoboy (AGUARDANDO_RETIRADA -> SAIU_PARA_ENTREGA)
   */
  public acceptCourierDelivery(
    subOrderId: string,
    courierId: string
  ): { success: boolean; message: string; subOrder?: SubOrder } {
    let targetSubOrder: SubOrder | undefined;
    let parentOrder: Order | undefined;

    for (const order of this.data.orders) {
      const sub = order.subOrders.find((s) => s.id === subOrderId);
      if (sub) {
        targetSubOrder = sub;
        parentOrder = order;
        break;
      }
    }

    if (!targetSubOrder || !parentOrder) {
      return { success: false, message: 'Subpedido não encontrado.' };
    }

    if (
      targetSubOrder.status !== 'AGUARDANDO_RETIRADA' &&
      targetSubOrder.status !== 'AGUARDANDO_COLETA'
    ) {
      return {
        success: false,
        message: `Não é possível aceitar uma remessa no status ${targetSubOrder.status}.`
      };
    }

    const courier = this.data.couriers.find((c) => c.id === courierId) || this.data.couriers[0];

    targetSubOrder.status = 'SAIU_PARA_ENTREGA';
    targetSubOrder.courierId = courier ? courier.id : courierId;
    targetSubOrder.courierName = courier ? courier.name : 'Motoboy Indaiatuba';
    targetSubOrder.updatedAt = new Date().toISOString();
    targetSubOrder.notes = `Corrida aceita por ${targetSubOrder.courierName}. Pacote retirado na Central, em rota até o munícipe.`;

    this.persistAndNotify();
    return {
      success: true,
      message: `Corrida da remessa ${targetSubOrder.code} aceita com sucesso por ${targetSubOrder.courierName}!`,
      subOrder: targetSubOrder
    };
  }

  /**
   * Validação de PIN e finalização da entrega do SubOrder
   */
  public completeDelivery(
    subOrderId: string,
    pinInput: string
  ): { success: boolean; message: string } {
    let targetSubOrder: SubOrder | undefined;
    let parentOrder: Order | undefined;

    for (const order of this.data.orders) {
      const sub = order.subOrders.find((s) => s.id === subOrderId);
      if (sub) {
        targetSubOrder = sub;
        parentOrder = order;
        break;
      }
    }

    if (!targetSubOrder || !parentOrder) {
      return { success: false, message: 'Subpedido de entrega não encontrado.' };
    }

    if (targetSubOrder.status === 'ENTREGUE') {
      return { success: false, message: 'Esta remessa já foi entregue anteriormente.' };
    }

    // Validação estrita do PIN
    if (targetSubOrder.pinCode.trim() !== pinInput.trim()) {
      return {
        success: false,
        message: 'Código PIN incorreto. Peça ao munícipe o código de 4 dígitos do app Minha Farmácia.'
      };
    }

    // Sucesso: Baixa na entrega
    targetSubOrder.status = 'ENTREGUE';
    targetSubOrder.deliveredAt = new Date().toISOString();
    targetSubOrder.updatedAt = new Date().toISOString();

    // Se todos os subpedidos do pedido foram entregues, finaliza o pedido pai
    const allDelivered = parentOrder.subOrders.every((s) => s.status === 'ENTREGUE');
    if (allDelivered) {
      parentOrder.status = 'FINALIZADO';
    }

    this.persistAndNotify();
    return {
      success: true,
      message: `Remessa ${targetSubOrder.code} entregue e confirmada com sucesso!`
    };
  }
}

export const store = new StateStore();
