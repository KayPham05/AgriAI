export type NavigationTab = 
  | 'home' 
  | 'diagnose' 
  | 'plants' 
  | 'plant-detail'
  | 'diseases' 
  | 'disease-detail'
  | 'history' 
  | 'about' 
  | 'profile';

export type DiagnoseStep = 
  | 'upload' 
  | 'preview' 
  | 'validation' 
  | 'analyzing' 
  | 'result';

export type ValidationStatus = 'pass' | 'warning' | 'fail';

export interface QualityCheck {
  id: string;
  name: string;
  status: ValidationStatus;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  leaf_detected: boolean;
  sharpness: ValidationStatus;
  lighting: ValidationStatus;
  background: ValidationStatus;
  leaf_visibility: ValidationStatus;
  message: string;
  checks: QualityCheck[];
  canAnalyzeAnyway: boolean;
}

export interface TopPrediction {
  label: string;
  confidence: number; // e.g. 0.948
  isHealthy?: boolean;
}

export interface BoundingBox {
  id: string;
  label: string;
  confidence: number;
  x: number; // % relative 0-100
  y: number; // % relative 0-100
  width: number; // % relative
  height: number; // % relative
}

export type SeverityLevel = 'Nhẹ' | 'Trung bình' | 'Nặng' | 'Mild' | 'Moderate' | 'Severe';

export interface SeverityInfo {
  level: SeverityLevel;
  affectedAreaPercentage: number; // e.g. 27.4
  scaleRange: [number, number, number]; // e.g. [15, 35, 75]
}

export interface DiagnosisResult {
  id: string;
  isDemo?: boolean;
  timestamp: string;
  plant: string;
  scientificName?: string;
  prediction: string;
  diseaseId?: string;
  confidence: number; // 0 to 1
  confidenceCategory: 'Độ tin cậy cao' | 'Độ tin cậy trung bình' | 'Độ tin cậy thấp' | 'High confidence' | 'Moderate confidence' | 'Low confidence';
  top_predictions: TopPrediction[];
  originalImageUrl: string;
  gradcam_url: string;
  severity: SeverityInfo | null;
  detectionBoxes?: BoundingBox[] | null;
  segmentation_url?: string | null;
  isHealthy?: boolean;
  notes?: string;
  modelVersion: string;
  validationSummary?: {
    sharpness: string;
    lighting: string;
  };
}

export interface DiseaseSummary {
  id: string;
  name: string;
  scientificName?: string;
  shortDescription: string;
  imageUrl?: string;
  isHealthy?: boolean;
}

export interface Plant {
  id: string;
  name: string;
  scientificName: string;
  category: 'Cây lương thực' | 'Cây ăn trái' | 'Cây công nghiệp' | 'Khác' | 'Food Crops' | 'Fruit Trees' | 'Industrial Crops' | 'Other';
  description: string;
  imageUrl: string;
  detectableCount: number;
  conditions: DiseaseSummary[];
}

export interface Disease {
  id: string;
  name: string;
  plant: string;
  plantId: string;
  scientificName?: string;
  category: 'Nấm' | 'Vi khuẩn' | 'Virus' | 'Sinh lý' | 'Khỏe mạnh' | 'Fungal' | 'Bacterial' | 'Viral' | 'Physiological' | 'Healthy';
  status: 'Phổ biến' | 'Nghiêm trọng' | 'Bình thường' | 'Common' | 'Severe' | 'Normal';
  heroImage: string;
  overview: string;
  symptoms: string[];
  visualCharacteristics: string[];
  causes: string[];
  affectedPlants: string[];
  prevention: string[];
  management: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: 'success' | 'info' | 'warning';
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
  location: string;
  joinedDate: string;
}

export interface Toast {
  id: string;
  title?: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}
