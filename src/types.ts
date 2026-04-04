export type UserRole = 'patient' | 'pharmacist' | 'admin' | 'donor';

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
  prescriptionUrl?: string;
  createdAt: number;
  pharmacistUid?: string;
  pharmacistName?: string;
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

export interface MedicationDonation {
  id: string;
  donorUid: string;
  donorName: string;
  donorType: 'individual' | 'charity';
  medicationName: string;
  quantity: string;
  expiryDate: string;
  location: string;
  contactPhone: string;
  status: 'available' | 'claimed';
  imageUrl?: string;
  createdAt: number;
}

export interface PlatformSettings {
  bannerActive: boolean;
  bannerMessage: string;
  bannerType: 'info' | 'warning' | 'success' | 'holiday';
}

export interface Complaint {
  id: string;
  userId: string;
  userName: string;
  text: string;
  status: 'pending' | 'resolved';
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: number;
  link?: string;
}
