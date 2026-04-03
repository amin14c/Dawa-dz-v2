export type UserRole = 'patient' | 'pharmacist';

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  role: UserRole;
  location: string;
  email: string;
  pharmacyName?: string;
  createdAt: number;
}

export interface MedicationRequest {
  id: string;
  patientUid: string;
  patientName: string;
  medicationName: string;
  medicalInfo: string;
  dosage: string;
  boxes: number;
  deliveryMethod: 'pickup' | 'delivery';
  status: 'pending' | 'found' | 'completed';
  location: string;
  createdAt: number;
}

export interface PharmacyOffer {
  id: string;
  requestId: string;
  pharmacistUid: string;
  pharmacyName: string;
  phone: string;
  message: string;
  available: boolean;
  createdAt: number;
}
