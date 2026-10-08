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
      category: "CONTINUO",
      estoquePorUnidade: {
        "Farm\xE1cia Central": 60,
        "UBS Morada do Sol": 25,
        "UBS Itaici": 15,
        "UBS Cecap": 10,
        "UBS Parque Corolla": 10
      }
    },
    {
      id: "med-02",
      name: "Dipirona Monoidratada",
      dosage: "500mg",
      presentation: "Comprimido (Cartela com 10)",
      stockQuantity: 85,
      minStockAlert: 15,
      active: true,
      category: "BASICO",
      estoquePorUnidade: {
        "Farm\xE1cia Central": 40,
        "UBS Morada do Sol": 20,
        "UBS Itaici": 10,
        "UBS Cecap": 10,
        "UBS Parque Corolla": 5
      }
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
      category: "ANTIBIOTICO",
      estoquePorUnidade: {
        "Farm\xE1cia Central": 0,
        "UBS Morada do Sol": 0,
        "UBS Itaici": 0,
        "UBS Cecap": 0,
        "UBS Parque Corolla": 0
      }
    },
    {
      id: "med-04",
      name: "Metformina Cloridrato",
      dosage: "850mg",
      presentation: "Comprimido (Caixa com 30)",
      stockQuantity: 60,
      minStockAlert: 15,
      active: true,
      category: "CONTINUO",
      estoquePorUnidade: {
        "Farm\xE1cia Central": 30,
        "UBS Morada do Sol": 15,
        "UBS Itaici": 5,
        "UBS Cecap": 5,
        "UBS Parque Corolla": 5
      }
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
      category: "BASICO",
      estoquePorUnidade: {
        "Farm\xE1cia Central": 4,
        "UBS Morada do Sol": 0,
        "UBS Itaici": 0,
        "UBS Cecap": 0,
        "UBS Parque Corolla": 0
      }
    },
    {
      id: "med-06",
      name: "Clonazepam",
      dosage: "2mg",
      presentation: "Comprimido (Caixa com 30)",
      stockQuantity: 35,
      minStockAlert: 10,
      active: true,
      category: "CONTROLADO",
      estoquePorUnidade: {
        "Farm\xE1cia Central": 20,
        "UBS Morada do Sol": 5,
        "UBS Itaici": 5,
        "UBS Cecap": 5,
        "UBS Parque Corolla": 0
      }
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
    getCitizens() {
      return [...this.data.citizens];
    }
    setCurrentCitizen(citizenId) {
      if (this.data.citizens.some((c) => c.id === citizenId)) {
        this.data.currentCitizenId = citizenId;
        this.persistAndNotify();
      }
    }
    addCitizen(citizenData) {
      const id = `cit-${Date.now()}`;
      const newCitizen = {
        id,
        name: citizenData.name,
        cpf: citizenData.cpf,
        cartaoSus: citizenData.cartaoSus || "7000.9999.8888.7777",
        phone: citizenData.phone || "(19) 99999-0000",
        address: {
          street: citizenData.address.street || "Rua Central",
          number: citizenData.address.number || "100",
          neighborhood: citizenData.address.neighborhood || "Jardim Morada do Sol",
          city: citizenData.address.city || "Indaiatuba - SP",
          cep: citizenData.address.cep || "13348-000",
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
    getMedications() {
      return [...this.data.medications];
    }
    addMedication(med) {
      const estoquePorUnidade = med.estoquePorUnidade || {
        "Farm\xE1cia Central": med.stockQuantity,
        "UBS Morada do Sol": 0,
        "UBS Itaici": 0,
        "UBS Cecap": 0,
        "UBS Parque Corolla": 0
      };
      const newMed = {
        ...med,
        estoquePorUnidade,
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
      if (!med.estoquePorUnidade) {
        med.estoquePorUnidade = {
          "Farm\xE1cia Central": med.stockQuantity,
          "UBS Morada do Sol": 0,
          "UBS Itaici": 0,
          "UBS Cecap": 0,
          "UBS Parque Corolla": 0
        };
      }
      if (delta >= 0) {
        med.estoquePorUnidade["Farm\xE1cia Central"] = (med.estoquePorUnidade["Farm\xE1cia Central"] || 0) + delta;
      } else {
        let toRemove = Math.abs(delta);
        const centralCurrent = med.estoquePorUnidade["Farm\xE1cia Central"] || 0;
        const removeCentral = Math.min(centralCurrent, toRemove);
        med.estoquePorUnidade["Farm\xE1cia Central"] = centralCurrent - removeCentral;
        toRemove -= removeCentral;
        if (toRemove > 0) {
          const otherUnits = Object.keys(med.estoquePorUnidade).filter((u) => u !== "Farm\xE1cia Central");
          for (const u of otherUnits) {
            if (toRemove <= 0) break;
            const uCurrent = med.estoquePorUnidade[u] || 0;
            const take = Math.min(uCurrent, toRemove);
            med.estoquePorUnidade[u] = uCurrent - take;
            toRemove -= take;
          }
        }
      }
      med.stockQuantity = Object.values(med.estoquePorUnidade).reduce((acc, val) => acc + val, 0);
      if (delta > 0) {
        this.checkAndPromoteAwaitingOrders(id);
      }
      this.persistAndNotify();
      return true;
    }
    adjustStockUnit(id, ubs, delta) {
      const med = this.data.medications.find((m) => m.id === id);
      if (!med) return false;
      if (!med.estoquePorUnidade) {
        med.estoquePorUnidade = {
          "Farm\xE1cia Central": med.stockQuantity,
          "UBS Morada do Sol": 0,
          "UBS Itaici": 0,
          "UBS Cecap": 0,
          "UBS Parque Corolla": 0
        };
      }
      const currentVal = med.estoquePorUnidade[ubs] ?? 0;
      const newVal = Math.max(0, currentVal + delta);
      med.estoquePorUnidade[ubs] = newVal;
      med.stockQuantity = Object.values(med.estoquePorUnidade).reduce((acc, val) => acc + val, 0);
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
          if (med.estoquePorUnidade) {
            let rem = deduction.quantity;
            const ubsKeys = Object.keys(med.estoquePorUnidade);
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
              if (med.estoquePorUnidade) {
                let rem = item.quantityRequested;
                const ubsKeys = Object.keys(med.estoquePorUnidade);
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
              subOrder.status = "EM_SEPARACAO";
              subOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
              subOrder.notes = "Lote reabastecido pela Farm\xE1cia Central de Indaiatuba. Liberado para separa\xE7\xE3o.";
            }
          }
        }
      }
    }
    // === MÉTODOS DE ENTREGADORES E DESPACHO ===
    getCouriers() {
      return [...this.data.couriers];
    }
    /**
     * Despacha uma remessa em separação para aguardando retirada pelo entregador
     */
    dispatchSubOrder(subOrderId, courierId) {
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
        return { success: false, message: "Subpedido n\xE3o encontrado." };
      }
      if (targetSubOrder.status !== "EM_SEPARACAO") {
        return {
          success: false,
          message: `N\xE3o \xE9 poss\xEDvel despachar uma remessa no status ${targetSubOrder.status}.`
        };
      }
      targetSubOrder.status = "AGUARDANDO_RETIRADA";
      targetSubOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      if (courierId && courierId !== "FROTA_GERAL") {
        const courier = this.data.couriers.find((c) => c.id === courierId);
        if (courier) {
          targetSubOrder.courierId = courier.id;
          targetSubOrder.courierName = courier.name;
          targetSubOrder.notes = `Despachado na Farm\xE1cia Central. Aguardando retirada por ${courier.name}.`;
        }
      } else {
        targetSubOrder.courierId = void 0;
        targetSubOrder.courierName = void 0;
        targetSubOrder.notes = "Disponibilizado na Central para retirada pela frota geral de entregadores.";
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
    acceptCourierDelivery(subOrderId, courierId) {
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
        return { success: false, message: "Subpedido n\xE3o encontrado." };
      }
      if (targetSubOrder.status !== "AGUARDANDO_RETIRADA" && targetSubOrder.status !== "AGUARDANDO_COLETA") {
        return {
          success: false,
          message: `N\xE3o \xE9 poss\xEDvel aceitar uma remessa no status ${targetSubOrder.status}.`
        };
      }
      const courier = this.data.couriers.find((c) => c.id === courierId) || this.data.couriers[0];
      targetSubOrder.status = "SAIU_PARA_ENTREGA";
      targetSubOrder.courierId = courier ? courier.id : courierId;
      targetSubOrder.courierName = courier ? courier.name : "Motoboy Indaiatuba";
      targetSubOrder.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      targetSubOrder.notes = `Corrida aceita por ${targetSubOrder.courierName}. Pacote retirado na Central, em rota at\xE9 o mun\xEDcipe.`;
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
  var MOCK_PROFILES = {
    cidadao: {
      role: "cidadao",
      username: "usuario",
      displayName: "Thiago Silva",
      badgeTitle: "Mun\xEDcipe de Indaiatuba",
      avatarInitials: "TS",
      cpf: "123.456.789-00",
      neighborhood: "Jardim Morada do Sol",
      address: "Rua das Pr\xEDmulas, 450 - Morada do Sol, Indaiatuba"
    },
    farmacia: {
      role: "farmacia",
      username: "farmaceutico",
      displayName: "Dra. Renata Souza",
      badgeTitle: "Farmac\xEAutica RT (CRF 48.219)",
      avatarInitials: "RS",
      cpf: "321.654.987-11",
      neighborhood: "Centro",
      address: "Farm\xE1cia Central Municipal - Av. Eng. F\xE1bio Roberto Barnab\xE9"
    },
    entregador: {
      role: "entregador",
      username: "entregador",
      displayName: "Marcos Vinicius",
      badgeTitle: "Entregador Municipal (Moto IND-2026)",
      avatarInitials: "MV",
      cpf: "456.789.012-33",
      neighborhood: "Jardim Pau Preto",
      address: "Central de Log\xEDstica Farmac\xEAutica"
    }
  };
  var NavigationManager = class {
    constructor(initialRole = "cidadao") {
      __publicField(this, "activeRole");
      __publicField(this, "currentUser", null);
      __publicField(this, "announcementListeners", /* @__PURE__ */ new Set());
      __publicField(this, "farmaciaListeners", /* @__PURE__ */ new Set());
      __publicField(this, "roleChangeListeners", /* @__PURE__ */ new Set());
      __publicField(this, "authChangeListeners", /* @__PURE__ */ new Set());
      this.activeRole = initialRole;
    }
    getActiveRole() {
      return this.activeRole;
    }
    getCurrentUser() {
      return this.currentUser;
    }
    login(role, username, customData) {
      const base = MOCK_PROFILES[role] || MOCK_PROFILES.cidadao;
      const user = {
        ...base,
        ...customData,
        role,
        username: username || base.username
      };
      this.currentUser = user;
      this.switchRole(role);
      this.authChangeListeners.forEach((fn) => fn(user));
      return user;
    }
    logout() {
      this.currentUser = null;
      this.authChangeListeners.forEach((fn) => fn(null));
    }
    onAuthChange(listener) {
      this.authChangeListeners.add(listener);
      return () => this.authChangeListeners.delete(listener);
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
        if (sub.status === "SAIU_PARA_ENTREGA" || sub.status === "AGUARDANDO_RETIRADA" || sub.status === "AGUARDANDO_COLETA" || sub.status === "EM_SEPARACAO" || sub.status === "ENTREGUE") {
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
  function getAvailableDeliveries() {
    const allOrders = store.getOrders();
    const available = [];
    for (const order of allOrders) {
      for (const sub of order.subOrders) {
        if (sub.status === "AGUARDANDO_RETIRADA" || sub.status === "AGUARDANDO_COLETA") {
          const addr = order.deliveryAddress;
          const formattedAddr = `${addr.street}, ${addr.number}${addr.complement ? ` (${addr.complement})` : ""} - ${addr.neighborhood}, ${addr.city}`;
          available.push({
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
    return available;
  }
  function getActiveCourierDeliveries(courierId) {
    const allOrders = store.getOrders();
    const active = [];
    for (const order of allOrders) {
      for (const sub of order.subOrders) {
        if (sub.status === "SAIU_PARA_ENTREGA") {
          if (!courierId || !sub.courierId || sub.courierId === courierId) {
            const addr = order.deliveryAddress;
            const formattedAddr = `${addr.street}, ${addr.number}${addr.complement ? ` (${addr.complement})` : ""} - ${addr.neighborhood}, ${addr.city}`;
            active.push({
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
    return active;
  }
  function acceptCourierDelivery(subOrderId, courierId) {
    return store.acceptCourierDelivery(subOrderId, courierId);
  }
  function dispatchSubOrder(subOrderId, courierId) {
    return store.dispatchSubOrder(subOrderId, courierId);
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

  // src/modules/cidadao/cidadaoService.ts
  function createCitizenPrescriptionOrder(params) {
    if (!params.prescriptionImageUrl || params.prescriptionImageUrl.trim() === "") {
      return {
        success: false,
        error: "Por favor, anexar a imagem da receita m\xE9dica antes de enviar o pedido."
      };
    }
    const currentCitizen = store.getCurrentCitizen();
    const newOrder = store.createOrder({
      citizenId: currentCitizen.id,
      prescriptionImageUrl: params.prescriptionImageUrl.trim(),
      notes: params.notes
    });
    return {
      success: true,
      order: store.getOrderById(newOrder.id)
    };
  }
  function formatCitizenOrdersView(citizenId) {
    const allOrders = store.getOrders();
    const citizenOrders = allOrders.filter((o) => o.citizenId === citizenId);
    return citizenOrders.map((order) => {
      const subOrderViews = order.subOrders.map((sub) => ({
        id: sub.id,
        code: sub.code,
        label: sub.label,
        status: sub.status,
        pinCode: sub.pinCode,
        items: sub.items,
        courierId: sub.courierId,
        courierName: sub.courierName,
        createdAt: sub.createdAt,
        updatedAt: sub.updatedAt,
        estimatedDelivery: sub.estimatedDelivery,
        deliveredAt: sub.deliveredAt,
        notes: sub.notes
      }));
      return {
        id: order.id,
        code: order.code,
        status: order.status,
        isSplit: order.isSplit,
        splitReason: order.splitReason,
        prescriptionImageUrl: order.prescriptionImageUrl,
        createdAt: order.createdAt,
        subOrders: subOrderViews
      };
    });
  }
  function getCitizenSplitBannerInfo(orderView) {
    if (!orderView.isSplit || orderView.subOrders.length < 2) {
      return {
        showBanner: false,
        message: ""
      };
    }
    const remessaA = orderView.subOrders[0];
    const remessaB = orderView.subOrders[1];
    const message = `Seu pedido foi dividido em duas remessas para n\xE3o atrasar seus medicamentos. A ${remessaA.label} (${remessaA.code}) ser\xE1 enviada imediatamente com os itens dispon\xEDveis. A ${remessaB.label} (${remessaB.code}) ser\xE1 enviada assim que o estoque for reposto pela Farm\xE1cia Central de Indaiatuba.`;
    return {
      showBanner: true,
      message
    };
  }

  // src/modules/farmacia/farmaciaService.ts
  function getPharmacyTriageQueue() {
    const allOrders = store.getOrders();
    const pending = allOrders.filter((o) => o.status === "PENDENTE_TRIAGEM").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return pending.map((o) => ({
      id: o.id,
      code: o.code,
      status: o.status,
      citizenName: o.citizenName,
      citizenCpf: o.citizenCpf,
      citizenPhone: o.citizenPhone,
      prescriptionImageUrl: o.prescriptionImageUrl,
      createdAt: o.createdAt,
      deliveryAddress: o.deliveryAddress
    }));
  }
  function previewStockImpact(orderId, decisions) {
    const medications = store.getMedications();
    let willBeSplit = false;
    const items = decisions.map((decision) => {
      const med = medications.find((m) => m.id === decision.medicationId);
      if (!med) {
        return {
          medicationId: decision.medicationId,
          medicationName: "Medicamento n\xE3o encontrado",
          dosage: "-",
          approvedQty: decision.approvedQty,
          currentStock: 0,
          stockAfter: 0,
          isAvailable: false
        };
      }
      const isAvailable = med.stockQuantity >= decision.approvedQty;
      const stockAfter = isAvailable ? med.stockQuantity - decision.approvedQty : med.stockQuantity;
      if (!isAvailable) {
        willBeSplit = true;
      }
      return {
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        approvedQty: decision.approvedQty,
        currentStock: med.stockQuantity,
        stockAfter: Math.max(0, stockAfter),
        isAvailable
      };
    });
    return { orderId, willBeSplit, items };
  }
  function performPharmacyTriage(orderId, decisions, pharmacistId = "farm-central") {
    const order = store.getOrderById(orderId);
    if (!order) {
      return { success: false, error: `Pedido ${orderId} n\xE3o encontrado.` };
    }
    if (order.status !== "PENDENTE_TRIAGEM") {
      return {
        success: false,
        error: `Pedido ${order.code} j\xE1 foi processado (status: ${order.status}).`
      };
    }
    const storeResult = store.performTriage(orderId, decisions, pharmacistId);
    if (!storeResult.success) {
      return { success: false, error: storeResult.error };
    }
    return { success: true, triageResult: storeResult.result };
  }
  function getPharmacyDashboardCounters() {
    const allOrders = store.getOrders();
    let pendingTriage = 0;
    let inRoute = 0;
    let awaitingRestock = 0;
    let readyForPickup = 0;
    let inSeparation = 0;
    for (const order of allOrders) {
      if (order.status === "PENDENTE_TRIAGEM") {
        pendingTriage++;
      }
      for (const sub of order.subOrders) {
        switch (sub.status) {
          case "SAIU_PARA_ENTREGA":
            inRoute++;
            break;
          case "AGUARDANDO_REPOSICAO":
            awaitingRestock++;
            break;
          case "AGUARDANDO_RETIRADA":
          case "AGUARDANDO_COLETA":
            readyForPickup++;
            break;
          case "EM_SEPARACAO":
            inSeparation++;
            break;
        }
      }
    }
    const medDemandMap = {
      "Amoxicilina + Clavulanato": 42,
      "Dipirona Monoidratada": 38,
      "Losartana Pot\xE1ssica": 35,
      "Metformina Cloridrato": 28,
      "Omeprazol": 21
    };
    for (const order of allOrders) {
      for (const sub of order.subOrders) {
        for (const item of sub.items) {
          medDemandMap[item.medicationName] = (medDemandMap[item.medicationName] || 0) + (item.quantityRequested || 1);
        }
      }
    }
    const sortedDemand = Object.entries(medDemandMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxVal = sortedDemand.length > 0 ? sortedDemand[0][1] : 1;
    const topMedications = sortedDemand.map(([name, count]) => ({
      name,
      count,
      percentage: Math.round(count / maxVal * 100)
    }));
    const meds = store.getMedications();
    const ruptures = [];
    for (const m of meds) {
      if (!m.active) continue;
      const unitMap = m.estoquePorUnidade || { "Farm\xE1cia Central": m.stockQuantity };
      const zeroUnits = [];
      let allZero = true;
      for (const [ubs, qty] of Object.entries(unitMap)) {
        if (qty === 0) {
          zeroUnits.push(ubs);
        } else {
          allZero = false;
        }
      }
      if (zeroUnits.length > 0) {
        ruptures.push({
          id: m.id,
          name: m.name,
          dosage: m.dosage,
          totalStock: m.stockQuantity,
          ruptureLocations: allZero ? ["Rede Zerada (Todas as Unidades)"] : zeroUnits
        });
      }
    }
    const slas = {
      avgTriageMinutes: 14,
      avgSeparationMinutes: 22,
      avgDeliveryMinutes: 35
    };
    return {
      pendingTriage,
      inRoute,
      awaitingRestock,
      readyForPickup,
      inSeparation,
      totalOrders: allOrders.length,
      topMedications,
      ruptures,
      slas
    };
  }
  function dispatchOrderForPickup(subOrderId, courierId) {
    return store.dispatchSubOrder(subOrderId, courierId);
  }

  // src/modules/farmacia/catalogoService.ts
  function toMedicationView(med) {
    return {
      ...med,
      isOutOfStock: med.stockQuantity === 0,
      isLowStock: med.stockQuantity < med.minStockAlert
    };
  }
  function validateMedicationParams(params) {
    if (!params.name || params.name.trim() === "") {
      return "O nome do medicamento \xE9 obrigat\xF3rio.";
    }
    if (!params.dosage || params.dosage.trim() === "") {
      return "A dosagem do medicamento \xE9 obrigat\xF3ria.";
    }
    if (!params.presentation || params.presentation.trim() === "") {
      return "A apresenta\xE7\xE3o do medicamento \xE9 obrigat\xF3ria.";
    }
    if (typeof params.stockQuantity !== "number" || params.stockQuantity < 0) {
      return "A quantidade em estoque deve ser um n\xFAmero n\xE3o negativo.";
    }
    if (typeof params.minStockAlert !== "number" || params.minStockAlert < 0) {
      return "O alerta m\xEDnimo de estoque deve ser um n\xFAmero n\xE3o negativo.";
    }
    return null;
  }
  function getCatalogView(includeInactive = false) {
    const meds = store.getMedications();
    return meds.filter((m) => includeInactive || m.active).map(toMedicationView).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
  function searchCatalog(params) {
    const meds = store.getMedications();
    const queryLower = params.query?.toLowerCase().trim() ?? "";
    return meds.filter((m) => params.includeInactive || m.active).filter((m) => {
      if (queryLower === "") return true;
      return m.name.toLowerCase().includes(queryLower) || m.dosage.toLowerCase().includes(queryLower) || m.presentation.toLowerCase().includes(queryLower);
    }).filter((m) => {
      if (!params.category) return true;
      return m.category === params.category;
    }).map(toMedicationView).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }
  function getLowStockBadges() {
    const meds = store.getMedications();
    return meds.filter((m) => m.active && m.stockQuantity < m.minStockAlert).map((m) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      category: m.category,
      stockQuantity: m.stockQuantity,
      minStockAlert: m.minStockAlert,
      severity: m.stockQuantity === 0 ? "OUT_OF_STOCK" : "LOW_STOCK"
    })).sort((a, b) => a.stockQuantity - b.stockQuantity);
  }
  function addMedication(params) {
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
  function editMedication(id, updates) {
    const existing = store.getMedications().find((m) => m.id === id);
    if (!existing) {
      return { success: false, error: `Medicamento ${id} n\xE3o encontrado no cat\xE1logo.` };
    }
    if (updates.name !== void 0 && updates.name.trim() === "") {
      return { success: false, error: "O nome do medicamento n\xE3o pode ser vazio." };
    }
    if (updates.dosage !== void 0 && updates.dosage.trim() === "") {
      return { success: false, error: "A dosagem do medicamento n\xE3o pode ser vazia." };
    }
    if (updates.stockQuantity !== void 0 && updates.stockQuantity < 0) {
      return { success: false, error: "A quantidade em estoque n\xE3o pode ser negativa." };
    }
    const updated = store.updateMedication(id, updates);
    if (!updated) {
      return { success: false, error: `Falha ao atualizar o medicamento ${id}.` };
    }
    const newMed = store.getMedications().find((m) => m.id === id);
    return { success: true, medication: toMedicationView(newMed) };
  }
  function adjustMedicationStock(id, delta) {
    const existing = store.getMedications().find((m) => m.id === id);
    if (!existing) {
      return { success: false, error: `Medicamento ${id} n\xE3o encontrado no cat\xE1logo.` };
    }
    const updated = store.adjustStock(id, delta);
    if (!updated) {
      return { success: false, error: `Falha ao ajustar estoque do medicamento ${id}.` };
    }
    const newMed = store.getMedications().find((m) => m.id === id);
    return { success: true, newStock: newMed.stockQuantity };
  }
  function adjustMedicationStockUnit(id, ubs, delta) {
    const existing = store.getMedications().find((m) => m.id === id);
    if (!existing) {
      return { success: false, error: `Medicamento ${id} n\xE3o encontrado no cat\xE1logo.` };
    }
    const updated = store.adjustStockUnit(id, ubs, delta);
    if (!updated) {
      return { success: false, error: `Falha ao ajustar estoque na unidade ${ubs}.` };
    }
    const newMed = store.getMedications().find((m) => m.id === id);
    return {
      success: true,
      newStock: newMed.stockQuantity,
      estoquePorUnidade: newMed.estoquePorUnidade
    };
  }
  function toggleMedicationStatus(id) {
    const existing = store.getMedications().find((m) => m.id === id);
    if (!existing) {
      return { success: false, error: `Medicamento ${id} n\xE3o encontrado no cat\xE1logo.` };
    }
    const updated = store.toggleMedicationActive(id);
    if (!updated) {
      return { success: false, error: `Falha ao alterar status do medicamento ${id}.` };
    }
    const newMed = store.getMedications().find((m) => m.id === id);
    return { success: true, newStatus: newMed.active };
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
      const bottomBtn = document.getElementById(`bottom-btn-role-${tab.role}`);
      if (bottomBtn) {
        bottomBtn.setAttribute("aria-selected", isSelected ? "true" : "false");
        bottomBtn.setAttribute("tabindex", isSelected ? "0" : "-1");
        if (isSelected) {
          bottomBtn.classList.add("bg-emerald-800", "text-white", "font-black", "shadow-inner");
          bottomBtn.classList.remove("text-emerald-200");
        } else {
          bottomBtn.classList.remove("bg-emerald-800", "text-white", "font-black", "shadow-inner");
          bottomBtn.classList.add("text-emerald-200");
        }
      }
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
  function loginUser(role, username, customData) {
    const user = navManager.login(role, username, customData);
    updateAuthUI();
    updateNavigationUI();
    updatePanelsVisibility();
    closeModalLogin();
    if (role === "cidadao") {
      const citizens = store.getCitizens();
      const targetCpf = customData?.cpf || user.cpf;
      const match = citizens.find((c) => targetCpf && c.cpf === targetCpf || c.name === user.displayName);
      if (match) {
        store.setCurrentCitizen(match.id);
      }
    }
    announceToScreenReader(`Acesso concedido para ${user.displayName} como ${user.badgeTitle}.`);
    return user;
  }
  function logoutUser() {
    navManager.logout();
    updateAuthUI();
    openModalLogin();
    announceToScreenReader("Sess\xE3o encerrada. Selecione um perfil para entrar.");
  }
  function updateAuthUI() {
    if (typeof document === "undefined") return;
    const user = navManager.getCurrentUser();
    const avatarEl = document.getElementById("user-avatar-badge");
    const nameEl = document.getElementById("user-display-name");
    const roleEl = document.getElementById("user-role-badge");
    const modalLogin = document.getElementById("modal-login");
    if (user) {
      if (avatarEl) avatarEl.textContent = user.avatarInitials || "ID";
      if (nameEl) nameEl.textContent = user.displayName;
      if (roleEl) roleEl.textContent = user.badgeTitle;
      if (modalLogin) {
        modalLogin.classList.add("hidden");
        modalLogin.setAttribute("hidden", "true");
      }
      const citNameEl = document.getElementById("cit-profile-name");
      const citAddrEl = document.getElementById("cit-profile-address");
      const citInitEl = document.getElementById("cit-profile-initials");
      if (citNameEl && user.role === "cidadao") citNameEl.textContent = user.displayName;
      if (citAddrEl && user.role === "cidadao") {
        citAddrEl.innerHTML = `<i class="fa-solid fa-location-dot text-emerald-600 mr-1"></i> ${user.address || "Indaiatuba - SP"}`;
      }
      if (citInitEl && user.role === "cidadao") citInitEl.textContent = user.avatarInitials;
    } else {
      if (avatarEl) avatarEl.textContent = "??";
      if (nameEl) nameEl.textContent = "N\xE3o Autenticado";
      if (roleEl) roleEl.textContent = "Cidad\xE3o ID / Acesso Municipal";
    }
  }
  function openModalLogin() {
    if (typeof document === "undefined") return;
    const modal = document.getElementById("modal-login");
    if (modal) {
      modal.classList.remove("hidden");
      modal.removeAttribute("hidden");
    }
  }
  function closeModalLogin() {
    if (typeof document === "undefined") return;
    const modal = document.getElementById("modal-login");
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("hidden", "true");
    }
  }
  function openModalCadastro() {
    if (typeof document === "undefined") return;
    const modalCad = document.getElementById("modal-cadastro");
    if (modalCad) {
      modalCad.classList.remove("hidden");
      modalCad.removeAttribute("hidden");
      const nomeInput = document.getElementById("cad-nome");
      if (nomeInput) nomeInput.focus();
    }
  }
  function closeModalCadastro() {
    if (typeof document === "undefined") return;
    const modalCad = document.getElementById("modal-cadastro");
    if (modalCad) {
      modalCad.classList.add("hidden");
      modalCad.setAttribute("hidden", "true");
    }
  }
  function openModalValidacao(orderId) {
    if (typeof window !== "undefined" && typeof window.openModalValidacaoImpl === "function") {
      window.openModalValidacaoImpl(orderId);
      return;
    }
    if (typeof document === "undefined") return;
    const modal = document.getElementById("modal-validacao");
    if (modal) {
      modal.classList.remove("hidden");
      modal.removeAttribute("hidden");
    }
  }
  function closeModalValidacao() {
    if (typeof window !== "undefined" && typeof window.closeModalValidacaoImpl === "function") {
      window.closeModalValidacaoImpl();
      return;
    }
    if (typeof document === "undefined") return;
    const modal = document.getElementById("modal-validacao");
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("hidden", "true");
    }
  }
  function openWhatsAppChat(phone, code, citizenName) {
    if (typeof window !== "undefined" && typeof window.openWhatsAppChatImpl === "function") {
      window.openWhatsAppChatImpl(phone, code, citizenName);
      return;
    }
    const link = getWhatsAppLink(phone || "19998765432", code || "PED-2026", citizenName || "Mun\xEDcipe");
    if (typeof window !== "undefined" && window.open) {
      window.open(link, "_blank");
    }
  }
  function openModalDespacho(orderId, subOrderId, subOrderCode) {
    if (typeof window !== "undefined" && typeof window.openModalDespachoImpl === "function") {
      window.openModalDespachoImpl(orderId, subOrderId, subOrderCode);
      return;
    }
    if (typeof document === "undefined") return;
    const modal = document.getElementById("modal-despacho");
    if (modal) {
      modal.classList.remove("hidden");
      modal.removeAttribute("hidden");
    }
  }
  function closeModalDespacho() {
    if (typeof window !== "undefined" && typeof window.closeModalDespachoImpl === "function") {
      window.closeModalDespachoImpl();
      return;
    }
    if (typeof document === "undefined") return;
    const modal = document.getElementById("modal-despacho");
    if (modal) {
      modal.classList.add("hidden");
      modal.setAttribute("hidden", "true");
    }
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
      getAvailableDeliveries,
      getActiveCourierDeliveries,
      acceptCourierDelivery,
      dispatchSubOrder,
      getWhatsAppLink,
      validateAndCompleteDelivery,
      formatPhoneForWhatsApp,
      // Módulo do Cidadão
      createCitizenPrescriptionOrder,
      formatCitizenOrdersView,
      getCitizenSplitBannerInfo,
      // Módulo da Farmácia
      getPharmacyTriageQueue,
      previewStockImpact,
      performPharmacyTriage,
      getPharmacyDashboardCounters,
      dispatchOrderForPickup,
      openModalValidacao,
      closeModalValidacao,
      openWhatsAppChat,
      openModalDespacho,
      closeModalDespacho,
      // Catálogo e Estoque
      getCatalogView,
      searchCatalog,
      addMedication,
      editMedication,
      adjustMedicationStock,
      adjustMedicationStockUnit,
      toggleMedicationStatus,
      getLowStockBadges,
      // Motor de Entrega Desmembrada Municipal
      evaluateAndSplitOrder,
      // Autenticação e Perfis
      loginUser,
      logoutUser,
      updateAuthUI,
      openModalLogin,
      closeModalLogin,
      openModalCadastro,
      closeModalCadastro
    };
    window.switchRole = switchRole;
    window.loginUser = loginUser;
    window.logoutUser = logoutUser;
    window.openModalLogin = openModalLogin;
    window.closeModalLogin = closeModalLogin;
    window.openModalCadastro = openModalCadastro;
    window.closeModalCadastro = closeModalCadastro;
    window.openModalValidacao = openModalValidacao;
    window.closeModalValidacao = closeModalValidacao;
    window.openWhatsAppChat = openWhatsAppChat;
    window.openModalDespacho = openModalDespacho;
    window.closeModalDespacho = closeModalDespacho;
    window.updateAuthUI = updateAuthUI;
    window.updateNavigationUI = updateNavigationUI;
    window.updatePanelsVisibility = updatePanelsVisibility;
    window.initMap = () => {
      initFleetMap("map-gerencial");
    };
    window.initFleetMap = initFleetMap;
    window.invalidateMapSize = invalidateMapSize;
    window.getCourierDeliveries = getCourierDeliveries;
    window.getAvailableDeliveries = getAvailableDeliveries;
    window.getActiveCourierDeliveries = getActiveCourierDeliveries;
    window.acceptCourierDelivery = acceptCourierDelivery;
    window.dispatchSubOrder = dispatchSubOrder;
    window.dispatchOrderForPickup = dispatchOrderForPickup;
    window.getWhatsAppLink = getWhatsAppLink;
    window.validateAndCompleteDelivery = validateAndCompleteDelivery;
    window.createCitizenPrescriptionOrder = createCitizenPrescriptionOrder;
    window.formatCitizenOrdersView = formatCitizenOrdersView;
    window.getCitizenSplitBannerInfo = getCitizenSplitBannerInfo;
    window.getPharmacyTriageQueue = getPharmacyTriageQueue;
    window.performPharmacyTriage = performPharmacyTriage;
    window.previewStockImpact = previewStockImpact;
    window.getPharmacyDashboardCounters = getPharmacyDashboardCounters;
    window.getCatalogView = getCatalogView;
    window.searchCatalog = searchCatalog;
    window.addMedication = addMedication;
    window.adjustMedicationStock = adjustMedicationStock;
    window.adjustMedicationStockUnit = adjustMedicationStockUnit;
    window.toggleMedicationStatus = toggleMedicationStatus;
    navManager.onAnnouncement((msg) => {
      announceToScreenReader(msg);
    });
    document.addEventListener("DOMContentLoaded", () => {
      updateNavigationUI();
      updatePanelsVisibility();
      updateAuthUI();
      if (!navManager.getCurrentUser()) {
        openModalLogin();
      }
    });
  }
})();
