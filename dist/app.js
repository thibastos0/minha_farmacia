(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/core/splitEngine.ts
  function generateSecurePin() {
    return Math.floor(1e3 + Math.random() * 9e3).toString();
  }
  function evaluateAndSplitOrder(order, triageDecisions, currentCatalog) {
    const availableItems = [];
    const awaitingRestockItems = [];
    const stockDeductions = [];
    for (const decision of triageDecisions) {
      const med = currentCatalog.find((m) => m.id === decision.medicationId);
      if (!med || decision.approvedQty <= 0) continue;
      const availableQty = Math.max(0, Math.min(med.stockQuantity, decision.approvedQty));
      const deficitQty = decision.approvedQty - availableQty;
      if (availableQty > 0) {
        availableItems.push({
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          quantityRequested: decision.approvedQty,
          quantityApproved: availableQty,
          isAvailable: true
        });
        stockDeductions.push({ medicationId: med.id, quantity: availableQty });
      }
      if (deficitQty > 0) {
        awaitingRestockItems.push({
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          quantityRequested: decision.approvedQty,
          quantityApproved: deficitQty,
          isAvailable: false
        });
      }
    }
    const subOrders = [];
    const isSplit = availableItems.length > 0 && awaitingRestockItems.length > 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (availableItems.length > 0) {
      subOrders.push({
        id: `${order.id}-A`,
        orderId: order.id,
        code: isSplit ? `${order.code}-A` : order.code,
        label: isSplit ? "Remessa Imediata (Itens Prontos)" : "Entrega Padr\xE3o (Todos os Itens)",
        items: availableItems,
        status: "EM_SEPARACAO",
        pinCode: generateSecurePin(),
        createdAt: now,
        updatedAt: now,
        notes: isSplit ? "Remessa priorit\xE1ria com itens dispon\xEDveis em estoque." : void 0
      });
    }
    if (awaitingRestockItems.length > 0) {
      let pinB = generateSecurePin();
      if (subOrders.length > 0 && pinB === subOrders[0].pinCode) {
        pinB = generateSecurePin();
      }
      subOrders.push({
        id: `${order.id}-B`,
        orderId: order.id,
        code: isSplit ? `${order.code}-B` : `${order.code}-REPOSICAO`,
        label: isSplit ? "Segunda Remessa (Aguardando Reposi\xE7\xE3o no Estoque)" : "Remessa em Espera de Reposi\xE7\xE3o",
        items: awaitingRestockItems,
        status: "AGUARDANDO_REPOSICAO",
        pinCode: pinB,
        createdAt: now,
        updatedAt: now,
        notes: "Medicamento em reabastecimento junto ao almoxarifado central de Indaiatuba."
      });
    }
    return {
      isSplit,
      subOrders,
      stockDeductions
    };
  }

  // src/core/seedData.ts
  var INITIAL_CITIZENS = [
    {
      id: "cit-01",
      name: "Dona Maria de Lourdes Silva",
      cpf: "123.456.789-00",
      cartaoSus: "7000.1234.5678.9012",
      phone: "(19) 99876-5432",
      address: {
        street: "Rua das Ac\xE1cias",
        number: "142",
        neighborhood: "Jardim Morada do Sol",
        city: "Indaiatuba - SP",
        cep: "13348-000",
        lat: -23.1042,
        lng: -47.2341,
        complement: "Casa dos fundos"
      }
    },
    {
      id: "cit-02",
      name: "Carlos Eduardo dos Santos",
      cpf: "234.567.890-11",
      cartaoSus: "7000.2345.6789.0123",
      phone: "(19) 98765-4321",
      address: {
        street: "Alameda dos Jacarand\xE1s",
        number: "85",
        neighborhood: "Itaici",
        city: "Indaiatuba - SP",
        cep: "13340-200",
        lat: -23.0725,
        lng: -47.1953
      }
    }
  ];
  var INITIAL_MEDICATIONS = [
    {
      id: "med-01",
      name: "Losartana Pot\xE1ssica",
      dosage: "50mg",
      presentation: "Comprimido Revestido (Caixa com 30)",
      stockQuantity: 120,
      minStockAlert: 20,
      active: true,
      category: "CONTINUO"
    },
    {
      id: "med-02",
      name: "Dipirona Monoidratada",
      dosage: "500mg",
      presentation: "Comprimido (Cartela com 10)",
      stockQuantity: 85,
      minStockAlert: 15,
      active: true,
      category: "BASICO"
    },
    {
      id: "med-03",
      name: "Amoxicilina + Clavulanato",
      dosage: "500mg/125mg",
      presentation: "Comprimido (Caixa com 21)",
      stockQuantity: 0,
      // Estoque Zerado intencionalmente para teste do Split
      minStockAlert: 10,
      active: true,
      category: "ANTIBIOTICO"
    },
    {
      id: "med-04",
      name: "Metformina Cloridrato",
      dosage: "850mg",
      presentation: "Comprimido (Caixa com 30)",
      stockQuantity: 60,
      minStockAlert: 15,
      active: true,
      category: "CONTINUO"
    },
    {
      id: "med-05",
      name: "Omeprazol",
      dosage: "20mg",
      presentation: "C\xE1psula (Frasco com 28)",
      stockQuantity: 4,
      // Estoque Baixo / Alerta
      minStockAlert: 10,
      active: true,
      category: "BASICO"
    },
    {
      id: "med-06",
      name: "Clonazepam",
      dosage: "2mg",
      presentation: "Comprimido (Caixa com 30)",
      stockQuantity: 35,
      minStockAlert: 10,
      active: true,
      category: "CONTROLADO"
    }
  ];
  var INITIAL_COURIERS = [
    {
      id: "cour-01",
      name: "Marcos Vinicius (Moto 01)",
      vehicle: "MOTO",
      plate: "IND-2026",
      phone: "(19) 99123-4567",
      active: true,
      currentLocation: {
        lat: -23.0903,
        lng: -47.2181,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    },
    {
      id: "cour-02",
      name: "Rafael Toledo (Moto 02)",
      vehicle: "MOTO",
      plate: "IND-9876",
      phone: "(19) 99234-5678",
      active: true,
      currentLocation: {
        lat: -23.0991,
        lng: -47.2254,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    }
  ];
  var INITIAL_ORDERS = [
    {
      id: "ord-01",
      code: "PED-2026-001",
      citizenId: "cit-01",
      citizenName: "Dona Maria de Lourdes Silva",
      citizenCpf: "123.456.789-00",
      citizenPhone: "(19) 99876-5432",
      deliveryAddress: {
        street: "Rua das Ac\xE1cias",
        number: "142",
        neighborhood: "Jardim Morada do Sol",
        city: "Indaiatuba - SP",
        cep: "13348-000",
        lat: -23.1042,
        lng: -47.2341
      },
      prescriptionImageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60",
      status: "PENDENTE_TRIAGEM",
      isSplit: false,
      subOrders: [],
      createdAt: new Date(Date.now() - 36e5).toISOString()
    }
  ];

  // src/core/store.ts
  var StateStore = class {
    constructor() {
      __publicField(this, "data");
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      __publicField(this, "storageKey", "minha_farmacia_state_v1");
      this.data = this.loadInitialData();
    }
    isBrowser() {
      return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
    }
    loadInitialData() {
      if (this.isBrowser()) {
        try {
          const saved = window.localStorage.getItem(this.storageKey);
          if (saved) {
            return JSON.parse(saved);
          }
        } catch (e) {
          console.warn("Erro ao ler localStorage, utilizando dados iniciais", e);
        }
      }
      return {
        citizens: [...INITIAL_CITIZENS],
        currentCitizenId: INITIAL_CITIZENS[0].id,
        medications: [...INITIAL_MEDICATIONS],
        couriers: [...INITIAL_COURIERS],
        orders: [...INITIAL_ORDERS]
      };
    }
    persistAndNotify() {
      if (this.isBrowser()) {
        try {
          window.localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
          console.warn("Erro ao salvar no localStorage", e);
        }
      }
      const snapshot = this.getState();
      this.listeners.forEach((listener) => {
        try {
          listener(snapshot);
        } catch (e) {
          console.error("Erro em listener do store:", e);
        }
      });
    }
    subscribe(listener) {
      this.listeners.add(listener);
      listener(this.getState());
      return () => {
        this.listeners.delete(listener);
      };
    }
    getState() {
      return JSON.parse(JSON.stringify(this.data));
    }
    resetToDefaults() {
      this.data = {
        citizens: [...INITIAL_CITIZENS],
        currentCitizenId: INITIAL_CITIZENS[0].id,
        medications: [...INITIAL_MEDICATIONS],
        couriers: [...INITIAL_COURIERS],
        orders: [...INITIAL_ORDERS]
      };
      this.persistAndNotify();
    }
    // === MÉTODOS DE CIDADÃO ===
    getCurrentCitizen() {
      const cit = this.data.citizens.find((c) => c.id === this.data.currentCitizenId);
      return cit || this.data.citizens[0];
    }
    setCurrentCitizen(citizenId) {
      if (this.data.citizens.some((c) => c.id === citizenId)) {
        this.data.currentCitizenId = citizenId;
        this.persistAndNotify();
      }
    }
    // === MÉTODOS DE MEDICAMENTOS (CRUD) ===
    getMedications() {
      return [...this.data.medications];
    }
    addMedication(med) {
      const newMed = {
        ...med,
        id: `med-${Date.now()}`
      };
      this.data.medications.push(newMed);
      this.persistAndNotify();
      return newMed;
    }
    updateMedication(id, updates) {
      const index = this.data.medications.findIndex((m) => m.id === id);
      if (index === -1) return false;
      this.data.medications[index] = {
        ...this.data.medications[index],
        ...updates
      };
      if (typeof updates.stockQuantity === "number") {
        this.checkAndPromoteAwaitingOrders(id);
      }
      this.persistAndNotify();
      return true;
    }
    adjustStock(id, delta) {
      const med = this.data.medications.find((m) => m.id === id);
      if (!med) return false;
      med.stockQuantity = Math.max(0, med.stockQuantity + delta);
      if (delta > 0) {
        this.checkAndPromoteAwaitingOrders(id);
      }
      this.persistAndNotify();
      return true;
    }
    toggleMedicationActive(id) {
      const med = this.data.medications.find((m) => m.id === id);
      if (!med) return false;
      med.active = !med.active;
      this.persistAndNotify();
      return true;
    }
    // === MÉTODOS DE PEDIDOS & MOTOR 1:N ===
    getOrders() {
      return [...this.data.orders];
    }
    getOrderById(orderId) {
      return this.data.orders.find((o) => o.id === orderId);
    }
    createOrder(params) {
      const citizen = this.data.citizens.find((c) => c.id === params.citizenId) || this.getCurrentCitizen();
      const count = this.data.orders.length + 1;
      const code = `PED-2026-${String(count).padStart(3, "0")}`;
      const newOrder = {
        id: `ord-${Date.now()}`,
        code,
        citizenId: citizen.id,
        citizenName: citizen.name,
        citizenCpf: citizen.cpf,
        citizenPhone: citizen.phone,
        deliveryAddress: citizen.address,
        prescriptionImageUrl: params.prescriptionImageUrl,
        status: "PENDENTE_TRIAGEM",
        isSplit: false,
        subOrders: [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.data.orders.unshift(newOrder);
      this.persistAndNotify();
      return newOrder;
    }
    /**
     * Executa a triagem com desmembramento inteligente 1:N
     */
    performTriage(orderId, decisions, pharmacistId = "farm-central") {
      const order = this.data.orders.find((o) => o.id === orderId);
      if (!order) return { success: false, error: "Pedido n\xE3o encontrado." };
      const splitResult = evaluateAndSplitOrder(order, decisions, this.data.medications);
      if (splitResult.subOrders.length === 0) {
        return { success: false, error: "Nenhum medicamento v\xE1lido selecionado." };
      }
      for (const deduction of splitResult.stockDeductions) {
        const med = this.data.medications.find((m) => m.id === deduction.medicationId);
        if (med) {
          med.stockQuantity = Math.max(0, med.stockQuantity - deduction.quantity);
        }
      }
      order.isSplit = splitResult.isSplit;
      order.status = "EM_PROCESSAMENTO";
      order.subOrders = splitResult.subOrders;
      order.reviewedByPharmacistId = pharmacistId;
      order.reviewedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (splitResult.isSplit) {
        order.splitReason = "Pedido desmembrado: Remessa A imediata e Remessa B aguardando reposi\xE7\xE3o.";
      }
      this.persistAndNotify();
      return { success: true, result: splitResult };
    }
    /**
     * Reabastecimento reativo: promove SubOrders em AGUARDANDO_REPOSICAO para EM_SEPARACAO
     */
    checkAndPromoteAwaitingOrders(medicationId) {
      const med = this.data.medications.find((m) => m.id === medicationId);
      if (!med || med.stockQuantity <= 0) return;
      for (const order of this.data.orders) {
        for (const subOrder of order.subOrders) {
          if (subOrder.status === "AGUARDANDO_REPOSICAO") {
            const item = subOrder.items.find((i) => i.medicationId === medicationId && !i.isAvailable);
            if (item && med.stockQuantity >= item.quantityRequested) {
              med.stockQuantity -= item.quantityRequested;
              item.isAvailable = true;
              item.quantityApproved = item.quantityRequested;
              subOrder.status = "EM_SEPARACAO";
              subOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
              subOrder.notes = "Lote reabastecido pela Farm\xE1cia Central de Indaiatuba. Liberado para separa\xE7\xE3o.";
            }
          }
        }
      }
    }
    /**
     * Validação de PIN e finalização da entrega do SubOrder
     */
    completeDelivery(subOrderId, pinInput) {
      let targetSubOrder;
      let parentOrder;
      for (const order of this.data.orders) {
        const sub = order.subOrders.find((s) => s.id === subOrderId);
        if (sub) {
          targetSubOrder = sub;
          parentOrder = order;
          break;
        }
      }
      if (!targetSubOrder || !parentOrder) {
        return { success: false, message: "Subpedido de entrega n\xE3o encontrado." };
      }
      if (targetSubOrder.status === "ENTREGUE") {
        return { success: false, message: "Esta remessa j\xE1 foi entregue anteriormente." };
      }
      if (targetSubOrder.pinCode.trim() !== pinInput.trim()) {
        return {
          success: false,
          message: "C\xF3digo PIN incorreto. Pe\xE7a ao mun\xEDcipe o c\xF3digo de 4 d\xEDgitos do app Minha Farm\xE1cia."
        };
      }
      targetSubOrder.status = "ENTREGUE";
      targetSubOrder.deliveredAt = (/* @__PURE__ */ new Date()).toISOString();
      targetSubOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      const allDelivered = parentOrder.subOrders.every((s) => s.status === "ENTREGUE");
      if (allDelivered) {
        parentOrder.status = "FINALIZADO";
      }
      this.persistAndNotify();
      return {
        success: true,
        message: `Remessa ${targetSubOrder.code} entregue e confirmada com sucesso!`
      };
    }
  };
  var store = new StateStore();

  // src/core/navigation.ts
  var MODULE_TABS = [
    {
      role: "cidadao",
      label: "\xC1rea do Cidad\xE3o",
      ariaLabel: "Acessar \xC1rea do Cidad\xE3o e Acompanhamento de Rem\xE9dios",
      targetId: "portal-cidadao",
      icon: "fa-solid fa-user"
    },
    {
      role: "farmacia",
      label: "Painel da Farm\xE1cia & Gest\xE3o",
      ariaLabel: "Acessar Painel do Farmac\xEAutico, Triagem e Gest\xE3o de Estoque",
      targetId: "portal-farmacia",
      icon: "fa-solid fa-user-doctor"
    },
    {
      role: "entregador",
      label: "Painel do Entregador",
      ariaLabel: "Acessar Painel do Motoboy e Entregas em Tr\xE2nsito",
      targetId: "portal-entregador",
      icon: "fa-solid fa-motorcycle"
    }
  ];
  var NavigationManager = class {
    constructor(initialRole = "cidadao") {
      __publicField(this, "activeRole");
      __publicField(this, "announcementListeners", /* @__PURE__ */ new Set());
      __publicField(this, "farmaciaListeners", /* @__PURE__ */ new Set());
      __publicField(this, "roleChangeListeners", /* @__PURE__ */ new Set());
      this.activeRole = initialRole;
    }
    getActiveRole() {
      return this.activeRole;
    }
    getTabsState() {
      return MODULE_TABS.map((tab) => ({
        ...tab,
        isSelected: tab.role === this.activeRole
      }));
    }
    switchRole(role) {
      if (this.activeRole === role) return;
      this.activeRole = role;
      const tab = MODULE_TABS.find((t) => t.role === role);
      const roleName = tab ? tab.label : role;
      const msg = `Navegado para ${roleName}. Conte\xFAdo atualizado.`;
      this.announcementListeners.forEach((fn) => fn(msg));
      this.roleChangeListeners.forEach((fn) => fn(role));
      if (role === "farmacia") {
        this.farmaciaListeners.forEach((fn) => fn());
      }
    }
    onAnnouncement(listener) {
      this.announcementListeners.add(listener);
      return () => this.announcementListeners.delete(listener);
    }
    onFarmaciaActivated(listener) {
      this.farmaciaListeners.add(listener);
      return () => this.farmaciaListeners.delete(listener);
    }
    onRoleChange(listener) {
      this.roleChangeListeners.add(listener);
      return () => this.roleChangeListeners.delete(listener);
    }
  };

  // src/app.ts
  var navManager = new NavigationManager("cidadao");
  function announceToScreenReader(message) {
    const announcer = document.getElementById("a11y-announcer");
    if (announcer) {
      announcer.textContent = message;
    }
  }
  function switchRole(role) {
    navManager.switchRole(role);
    updateNavigationUI();
    updatePanelsVisibility();
  }
  function updateNavigationUI() {
    const currentRole = navManager.getActiveRole();
    const legacyIdMap = {
      cidadao: "btn-role-cliente",
      farmacia: "btn-role-funcionario",
      entregador: "btn-role-motoboy"
    };
    MODULE_TABS.forEach((tab) => {
      const isSelected = tab.role === currentRole;
      const btnIds = [`btn-role-${tab.role}`, legacyIdMap[tab.role]];
      btnIds.forEach((id) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.setAttribute("aria-selected", isSelected ? "true" : "false");
        btn.setAttribute("role", "tab");
        btn.setAttribute("tabindex", isSelected ? "0" : "-1");
        if (isSelected) {
          btn.className = "role-btn min-h-[48px] px-4 py-3 rounded-2xl bg-white text-emerald-950 font-black text-sm shadow-md flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950";
        } else {
          btn.className = "role-btn min-h-[48px] px-4 py-3 rounded-2xl hover:bg-emerald-800 text-emerald-100 font-bold text-sm flex items-center gap-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-emerald-950";
        }
      });
    });
  }
  function updatePanelsVisibility() {
    const currentRole = navManager.getActiveRole();
    const sectionMap = {
      cidadao: ["portal-cidadao", "portal-cliente"],
      farmacia: ["portal-farmacia", "portal-funcionario"],
      entregador: ["portal-entregador", "portal-motoboy"]
    };
    Object.keys(sectionMap).forEach((role) => {
      const isCurrent = role === currentRole;
      sectionMap[role].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (isCurrent) {
          el.classList.remove("hidden");
          el.removeAttribute("hidden");
          el.setAttribute("tabindex", "-1");
        } else {
          el.classList.add("hidden");
          el.setAttribute("hidden", "true");
        }
      });
    });
  }
  if (typeof window !== "undefined") {
    window.MinhaFarmacia = {
      store,
      navManager,
      switchRole,
      announceToScreenReader
    };
    window.switchRole = switchRole;
    navManager.onAnnouncement((msg) => {
      announceToScreenReader(msg);
    });
    document.addEventListener("DOMContentLoaded", () => {
      updateNavigationUI();
      updatePanelsVisibility();
    });
  }
})();
