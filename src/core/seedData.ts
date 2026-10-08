/**
 * Dados Iniciais Realistas de Indaiatuba - SP
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 */

import type { Citizen, Medication, Courier, Order } from './types.ts';

export const INITIAL_CITIZENS: Citizen[] = [
  {
    id: 'cit-01',
    name: 'Dona Maria de Lourdes Silva',
    cpf: '123.456.789-00',
    cartaoSus: '7000.1234.5678.9012',
    phone: '(19) 99876-5432',
    address: {
      street: 'Rua das Acácias',
      number: '142',
      neighborhood: 'Jardim Morada do Sol',
      city: 'Indaiatuba - SP',
      cep: '13348-000',
      lat: -23.1042,
      lng: -47.2341,
      complement: 'Casa dos fundos'
    }
  },
  {
    id: 'cit-02',
    name: 'Carlos Eduardo dos Santos',
    cpf: '234.567.890-11',
    cartaoSus: '7000.2345.6789.0123',
    phone: '(19) 98765-4321',
    address: {
      street: 'Alameda dos Jacarandás',
      number: '85',
      neighborhood: 'Itaici',
      city: 'Indaiatuba - SP',
      cep: '13340-200',
      lat: -23.0725,
      lng: -47.1953
    }
  }
];

export const INITIAL_MEDICATIONS: Medication[] = [
  {
    id: 'med-01',
    name: 'Losartana Potássica',
    dosage: '50mg',
    presentation: 'Comprimido Revestido (Caixa com 30)',
    stockQuantity: 120,
    minStockAlert: 20,
    active: true,
    category: 'CONTINUO',
    estoquePorUnidade: {
      'Farmácia Central': 60,
      'UBS Morada do Sol': 25,
      'UBS Itaici': 15,
      'UBS Cecap': 10,
      'UBS Parque Corolla': 10
    }
  },
  {
    id: 'med-02',
    name: 'Dipirona Monoidratada',
    dosage: '500mg',
    presentation: 'Comprimido (Cartela com 10)',
    stockQuantity: 85,
    minStockAlert: 15,
    active: true,
    category: 'BASICO',
    estoquePorUnidade: {
      'Farmácia Central': 40,
      'UBS Morada do Sol': 20,
      'UBS Itaici': 10,
      'UBS Cecap': 10,
      'UBS Parque Corolla': 5
    }
  },
  {
    id: 'med-03',
    name: 'Amoxicilina + Clavulanato',
    dosage: '500mg/125mg',
    presentation: 'Comprimido (Caixa com 21)',
    stockQuantity: 0, // Estoque Zerado intencionalmente para teste do Split
    minStockAlert: 10,
    active: true,
    category: 'ANTIBIOTICO',
    estoquePorUnidade: {
      'Farmácia Central': 0,
      'UBS Morada do Sol': 0,
      'UBS Itaici': 0,
      'UBS Cecap': 0,
      'UBS Parque Corolla': 0
    }
  },
  {
    id: 'med-04',
    name: 'Metformina Cloridrato',
    dosage: '850mg',
    presentation: 'Comprimido (Caixa com 30)',
    stockQuantity: 60,
    minStockAlert: 15,
    active: true,
    category: 'CONTINUO',
    estoquePorUnidade: {
      'Farmácia Central': 30,
      'UBS Morada do Sol': 15,
      'UBS Itaici': 5,
      'UBS Cecap': 5,
      'UBS Parque Corolla': 5
    }
  },
  {
    id: 'med-05',
    name: 'Omeprazol',
    dosage: '20mg',
    presentation: 'Cápsula (Frasco com 28)',
    stockQuantity: 4, // Estoque Baixo / Alerta
    minStockAlert: 10,
    active: true,
    category: 'BASICO',
    estoquePorUnidade: {
      'Farmácia Central': 4,
      'UBS Morada do Sol': 0,
      'UBS Itaici': 0,
      'UBS Cecap': 0,
      'UBS Parque Corolla': 0
    }
  },
  {
    id: 'med-06',
    name: 'Clonazepam',
    dosage: '2mg',
    presentation: 'Comprimido (Caixa com 30)',
    stockQuantity: 35,
    minStockAlert: 10,
    active: true,
    category: 'CONTROLADO',
    estoquePorUnidade: {
      'Farmácia Central': 20,
      'UBS Morada do Sol': 5,
      'UBS Itaici': 5,
      'UBS Cecap': 5,
      'UBS Parque Corolla': 0
    }
  }
];

export const INITIAL_COURIERS: Courier[] = [
  {
    id: 'cour-01',
    name: 'Marcos Vinicius (Moto 01)',
    vehicle: 'MOTO',
    plate: 'IND-2026',
    phone: '(19) 99123-4567',
    active: true,
    currentLocation: {
      lat: -23.0903,
      lng: -47.2181,
      updatedAt: new Date().toISOString()
    }
  },
  {
    id: 'cour-02',
    name: 'Rafael Toledo (Moto 02)',
    vehicle: 'MOTO',
    plate: 'IND-9876',
    phone: '(19) 99234-5678',
    active: true,
    currentLocation: {
      lat: -23.0991,
      lng: -47.2254,
      updatedAt: new Date().toISOString()
    }
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-01',
    code: 'PED-2026-001',
    citizenId: 'cit-01',
    citizenName: 'Dona Maria de Lourdes Silva',
    citizenCpf: '123.456.789-00',
    citizenPhone: '(19) 99876-5432',
    deliveryAddress: {
      street: 'Rua das Acácias',
      number: '142',
      neighborhood: 'Jardim Morada do Sol',
      city: 'Indaiatuba - SP',
      cep: '13348-000',
      lat: -23.1042,
      lng: -47.2341
    },
    prescriptionImageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=60',
    status: 'PENDENTE_TRIAGEM',
    isSplit: false,
    subOrders: [],
    createdAt: new Date(Date.now() - 3600000).toISOString()
  }
];
