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
        citizens: JSON.parse(JSON.stringify(INITIAL_CITIZENS)),
        currentCitizenId: INITIAL_CITIZENS[0].id,
        medications: JSON.parse(JSON.stringify(INITIAL_MEDICATIONS)),
        couriers: JSON.parse(JSON.stringify(INITIAL_COURIERS)),
        orders: JSON.parse(JSON.stringify(INITIAL_ORDERS))
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
        citizens: JSON.parse(JSON.stringify(INITIAL_CITIZENS)),
        currentCitizenId: INITIAL_CITIZENS[0].id,
        medications: JSON.parse(JSON.stringify(INITIAL_MEDICATIONS)),
        couriers: JSON.parse(JSON.stringify(INITIAL_COURIERS)),
        orders: JSON.parse(JSON.stringify(INITIAL_ORDERS))
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

  // src/modules/farmacia/fleetMapService.ts
  var INDAIATUBA_CENTER = {
    lat: -23.0903,
    lng: -47.2181,
    zoom: 14
  };
  var activeMapInstance = null;
  var currentContainerId = null;
  var markerObjects = /* @__PURE__ */ new Map();
  function getFleetMarkersData() {
    const markers = [];
    markers.push({
      id: "pharmacy-central",
      type: "PHARMACY",
      title: "Farm\xE1cia Central de Indaiatuba",
      subtitle: "Prefeitura Municipal \u2022 Ponto Central de Distribui\xE7\xE3o",
      lat: INDAIATUBA_CENTER.lat,
      lng: INDAIATUBA_CENTER.lng,
      statusText: "Operacional",
      popupHtml: `
      <div class="p-2 space-y-1 font-sans">
        <div class="flex items-center gap-1.5 text-emerald-800 font-extrabold text-sm">
          <i class="fa-solid fa-hospital"></i> Farm\xE1cia Central de Indaiatuba
        </div>
        <p class="text-xs text-gray-600 font-medium">Ponto Central de Distribui\xE7\xE3o RENAME</p>
        <p class="text-[11px] text-gray-500">Rua Candel\xE1ria, 800 - Centro, Indaiatuba - SP</p>
        <span class="inline-block bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1">
          Ponto de Origem da Frota
        </span>
      </div>
    `
    });
    const couriers = store.getState().couriers;
    const orders = store.getOrders();
    couriers.forEach((courier) => {
      let activeDeliveryInfo = null;
      for (const order of orders) {
        const activeSub = order.subOrders.find(
          (s) => s.assignedCourierId === courier.id && s.status === "SAIU_PARA_ENTREGA"
        );
        if (activeSub) {
          activeDeliveryInfo = {
            citizenName: order.citizenName,
            address: `${order.deliveryAddress.street}, ${order.deliveryAddress.number} - ${order.deliveryAddress.neighborhood}`
          };
          break;
        }
      }
      const lat = courier.currentLocation?.lat ?? INDAIATUBA_CENTER.lat;
      const lng = courier.currentLocation?.lng ?? INDAIATUBA_CENTER.lng;
      const statusBadge = activeDeliveryInfo ? `<span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Em Rota de Entrega</span>` : `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Dispon\xEDvel / Livre</span>`;
      const deliveryText = activeDeliveryInfo ? `<div class="mt-1 text-xs text-blue-900 bg-blue-50 p-2 rounded-lg border border-blue-200">
           <p class="font-bold"><i class="fa-solid fa-user"></i> Destino: ${activeDeliveryInfo.citizenName}</p>
           <p class="text-[11px] text-gray-600">${activeDeliveryInfo.address}</p>
         </div>` : `<p class="text-xs text-gray-500 italic mt-1">Aguardando atribui\xE7\xE3o de nova corrida.</p>`;
      markers.push({
        id: courier.id,
        type: "COURIER",
        title: courier.name,
        subtitle: `Ve\xEDculo: ${courier.vehicle} (${courier.plate})`,
        lat,
        lng,
        vehicleInfo: `${courier.vehicle} - ${courier.plate}`,
        statusText: activeDeliveryInfo ? "Em Rota" : "Livre",
        popupHtml: `
        <div class="p-2 space-y-1 font-sans">
          <div class="flex items-center justify-between gap-2 border-b pb-1">
            <h4 class="font-bold text-sm text-gray-900 flex items-center gap-1.5">
              <i class="fa-solid fa-motorcycle text-emerald-600"></i> ${courier.name}
            </h4>
            ${statusBadge}
          </div>
          <p class="text-xs text-gray-600"><b>Placa/Ve\xEDculo:</b> ${courier.plate} (${courier.vehicle})</p>
          <p class="text-xs text-gray-600"><b>Contato:</b> ${courier.phone}</p>
          ${deliveryText}
        </div>
      `
      });
    });
    return markers;
  }
  function initFleetMap(containerId = "map-gerencial") {
    if (typeof window === "undefined" || !window.L) {
      currentContainerId = containerId;
      const mockMap = {
        isMock: true,
        invalidateSize: () => true,
        remove: () => true,
        setView: () => true
      };
      activeMapInstance = mockMap;
      return mockMap;
    }
    const L = window.L;
    const container = document.getElementById(containerId);
    if (!container) return null;
    if (activeMapInstance) {
      try {
        activeMapInstance.remove();
      } catch (e) {
      }
      activeMapInstance = null;
      markerObjects.clear();
    }
    currentContainerId = containerId;
    const map = L.map(containerId).setView(
      [INDAIATUBA_CENTER.lat, INDAIATUBA_CENTER.lng],
      INDAIATUBA_CENTER.zoom
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; Prefeitura de Indaiatuba / OpenStreetMap"
    }).addTo(map);
    activeMapInstance = map;
    renderMapMarkers();
    setTimeout(() => {
      invalidateMapSize();
    }, 100);
    return map;
  }
  function renderMapMarkers() {
    if (!activeMapInstance || typeof window === "undefined" || !window.L) {
      return;
    }
    const L = window.L;
    markerObjects.forEach((m) => {
      try {
        activeMapInstance.removeLayer(m);
      } catch (e) {
      }
    });
    markerObjects.clear();
    const markersData = getFleetMarkersData();
    markersData.forEach((data) => {
      let icon;
      if (data.type === "PHARMACY") {
        icon = L.divIcon({
          className: "custom-pharmacy-icon",
          html: `
          <div style="background-color: #059669; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
            <i class="fa-solid fa-hospital" style="font-size: 16px;"></i>
          </div>
        `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
          popupAnchor: [0, -18]
        });
      } else {
        const isRoute = data.statusText === "Em Rota";
        const bgColor = isRoute ? "#0284c7" : "#059669";
        icon = L.divIcon({
          className: "custom-courier-icon",
          html: `
          <div style="background-color: ${bgColor}; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 3px 5px -1px rgba(0,0,0,0.3);">
            <i class="fa-solid fa-motorcycle" style="font-size: 14px;"></i>
          </div>
        `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });
      }
      const marker = L.marker([data.lat, data.lng], { icon }).addTo(activeMapInstance).bindPopup(data.popupHtml);
      markerObjects.set(data.id, marker);
    });
  }
  function invalidateMapSize() {
    if (!activeMapInstance) return false;
    try {
      if (typeof activeMapInstance.invalidateSize === "function") {
        activeMapInstance.invalidateSize();
        return true;
      }
    } catch (e) {
      console.warn("Erro ao invocar invalidateSize no mapa:", e);
    }
    return false;
  }

  // src/modules/entregador/entregadorService.ts
  function formatPhoneForWhatsApp(phone) {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    return digits;
  }
  function getWhatsAppLink(phone, subOrderCode, citizenName) {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    const nameGreeting = citizenName ? ` ${citizenName}` : "";
    const message = `Ol\xE1${nameGreeting}! Sou da equipe de entregas da Farm\xE1cia Municipal de Indaiatuba. Estou referente ao seu pedido de medicamentos (${subOrderCode}). Por favor, tenha em m\xE3os o seu c\xF3digo PIN de 4 d\xEDgitos para a valida\xE7\xE3o do recebimento.`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  }
  function getCourierDeliveries(courierId) {
    const allOrders = store.getOrders();
    const deliveries = [];
    for (const order of allOrders) {
      for (const sub of order.subOrders) {
        if (sub.status === "SAIU_PARA_ENTREGA" || sub.status === "AGUARDANDO_COLETA" || sub.status === "EM_SEPARACAO" || sub.status === "ENTREGUE") {
          if (!courierId || !sub.courierId || sub.courierId === courierId) {
            const addr = order.deliveryAddress;
            const formattedAddr = `${addr.street}, ${addr.number}${addr.complement ? ` (${addr.complement})` : ""} - ${addr.neighborhood}, ${addr.city}`;
            deliveries.push({
              subOrderId: sub.id,
              orderId: order.id,
              orderCode: order.code,
              subOrderCode: sub.code,
              subOrderLabel: sub.label,
              citizenName: order.citizenName,
              citizenPhone: order.citizenPhone,
              citizenAddress: formattedAddr,
              items: sub.items,
              status: sub.status,
              pinCode: sub.pinCode,
              courierId: sub.courierId,
              courierName: sub.courierName,
              createdAt: sub.createdAt,
              updatedAt: sub.updatedAt,
              deliveredAt: sub.deliveredAt
            });
          }
        }
      }
    }
    return deliveries;
  }
  function validateAndCompleteDelivery(subOrderId, pinInput) {
    if (!pinInput || pinInput.trim() === "") {
      return {
        success: false,
        message: "Por favor, informe o c\xF3digo PIN de 4 d\xEDgitos fornecido pelo mun\xEDcipe."
      };
    }
    const result = store.completeDelivery(subOrderId, pinInput.trim());
    if (!result.success) {
      return {
        success: false,
        message: result.message
      };
    }
    const orders = store.getOrders();
    let updatedSubOrder;
    for (const o of orders) {
      const sub = o.subOrders.find((s) => s.id === subOrderId);
      if (sub) {
        updatedSubOrder = sub;
        break;
      }
    }
    return {
      success: true,
      message: result.message,
      subOrder: updatedSubOrder
    };
  }

  // src/app.ts
  var navManager = new NavigationManager("cidadao");
  function announceToScreenReader(message) {
    const announcer = document.getElementById("a11y-announcer");
    if (announcer) {
      announcer.textContent = message;
    }
  }
  function switchRole(role) {
    const roleMap = {
      cliente: "cidadao",
      cidadao: "cidadao",
      funcionario: "farmacia",
      farmacia: "farmacia",
      motoboy: "entregador",
      entregador: "entregador"
    };
    const normalizedRole = roleMap[role] || role;
    navManager.switchRole(normalizedRole);
    updateNavigationUI();
    updatePanelsVisibility();
    if (normalizedRole === "farmacia" && typeof window?.switchFuncTab === "function") {
      try {
        window.switchFuncTab("dash");
      } catch (e) {
        console.warn("N\xE3o foi poss\xEDvel ativar a sub-aba da farm\xE1cia:", e);
      }
    }
  }
  function updateNavigationUI() {
    if (typeof document === "undefined") return;
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
          btn.classList.add("bg-white", "text-emerald-950", "shadow-md", "font-black");
          btn.classList.remove("hover:bg-emerald-800", "text-emerald-100", "text-white", "font-bold");
        } else {
          btn.classList.remove("bg-white", "text-emerald-950", "shadow-md", "font-black");
          btn.classList.add("hover:bg-emerald-800", "text-emerald-100", "font-bold");
        }
      });
    });
  }
  function updatePanelsVisibility() {
    if (typeof document === "undefined") return;
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
  navManager.onFarmaciaActivated(() => {
    setTimeout(() => {
      invalidateMapSize();
      renderMapMarkers();
    }, 100);
  });
  store.subscribe(() => {
    renderMapMarkers();
  });
  if (typeof window !== "undefined") {
    window.MinhaFarmacia = {
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
      getWhatsAppLink,
      validateAndCompleteDelivery,
      formatPhoneForWhatsApp
    };
    window.switchRole = switchRole;
    window.initMap = () => {
      initFleetMap("map-gerencial");
    };
    window.initFleetMap = initFleetMap;
    window.invalidateMapSize = invalidateMapSize;
    window.getCourierDeliveries = getCourierDeliveries;
    window.getWhatsAppLink = getWhatsAppLink;
    window.validateAndCompleteDelivery = validateAndCompleteDelivery;
    navManager.onAnnouncement((msg) => {
      announceToScreenReader(msg);
    });
    document.addEventListener("DOMContentLoaded", () => {
      updateNavigationUI();
      updatePanelsVisibility();
    });
  }
})();
