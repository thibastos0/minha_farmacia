/**
 * Tipos e Modelos de Domínio do Minha Farmácia
 * Prefeitura Municipal de Indaiatuba - Hackathon Fatec 2026
 * Conforme especificado em .spec/02_data_models_and_split.md
 */

export type OrderStatus =
  | 'PENDENTE_TRIAGEM'
  | 'EM_PROCESSAMENTO'
  | 'FINALIZADO'
  | 'CANCELADO';

export type SubOrderStatus =
  | 'EM_SEPARACAO'          // Itens aprovados e separados fisicamente na farmácia
  | 'AGUARDANDO_RETIRADA'   // Pacote pronto na farmácia aguardando retirada/aceite do motoboy
  | 'AGUARDANDO_COLETA'     // Compatibilidade legada
  | 'SAIU_PARA_ENTREGA'     // Motoboy a caminho do munícipe
  | 'AGUARDANDO_REPOSICAO'  // Medicamento em falta aguardando lote da central
  | 'ENTREGUE'              // Entregue e confirmado com PIN
  | 'CANCELADO';            // Inviabilidade clínica ou cancelamento administrativo

export interface CitizenAddress {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  cep: string;
  lat: number;
  lng: number;
  complement?: string;
}

export interface Citizen {
  id: string;
  name: string;
  cpf: string;
  cartaoSus: string;
  phone: string;
  address: CitizenAddress;
}

export type MedicationCategory = 'BASICO' | 'CONTROLADO' | 'CONTINUO' | 'ANTIBIOTICO';

export type UBSUnit =
  | 'Farmácia Central'
  | 'UBS Morada do Sol'
  | 'UBS Itaici'
  | 'UBS Cecap'
  | 'UBS Parque Corolla';

export const INDAIATUBA_UBS_UNITS: UBSUnit[] = [
  'Farmácia Central',
  'UBS Morada do Sol',
  'UBS Itaici',
  'UBS Cecap',
  'UBS Parque Corolla'
];

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  presentation: string;
  stockQuantity: number;
  minStockAlert: number;
  active: boolean;
  category: MedicationCategory;
  estoquePorUnidade?: Record<UBSUnit, number>;
}

export interface OrderItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  quantityRequested: number;
  quantityApproved: number;
  isAvailable: boolean;
}

export interface SubOrder {
  id: string;
  orderId: string;
  code: string;               // Ex: "PED-2026-01-A", "PED-2026-01-B"
  label: string;              // Ex: "Remessa Imediata (Estoque Disponível)" vs "Remessa Reposição"
  items: OrderItem[];
  status: SubOrderStatus;
  pinCode: string;            // Código numérico de 4 dígitos para entrega (Ex: "4921")
  courierId?: string;
  courierName?: string;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
}

export interface Order {
  id: string;
  code: string;               // Ex: "PED-2026-01"
  citizenId: string;
  citizenName: string;
  citizenCpf: string;
  citizenPhone: string;
  deliveryAddress: CitizenAddress;
  prescriptionImageUrl: string;
  status: OrderStatus;
  isSplit: boolean;
  splitReason?: string;
  subOrders: SubOrder[];
  createdAt: string;
  reviewedByPharmacistId?: string;
  reviewedAt?: string;
}

export interface Courier {
  id: string;
  name: string;
  vehicle: 'MOTO' | 'BICICLETA_ELETRICA' | 'CARRO';
  plate: string;
  phone: string;
  active: boolean;
  currentLocation: {
    lat: number;
    lng: number;
    updatedAt: string;
  };
}

export interface TriageDecision {
  medicationId: string;
  approvedQty: number;
}

export interface SplitResult {
  isSplit: boolean;
  subOrders: SubOrder[];
  stockDeductions: { medicationId: string; quantity: number }[];
}
