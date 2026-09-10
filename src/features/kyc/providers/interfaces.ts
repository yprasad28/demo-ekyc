export interface AadhaarProfile {
  name: string;
  dob: string;
  gender: 'M' | 'F';
  address: string;
  maskedAadhaar: string;
  photo: string;
}

export interface AadhaarProvider {
  sendOtp(aadhaarNumber: string): Promise<{ success: boolean; message: string }>;
  verifyOtp(aadhaarNumber: string, otp: string): Promise<AadhaarProfile | null>;
}

export interface DigiLockerSessionResult {
  success: boolean;
  txnId: string;
  authorizationUrl: string;
}

export interface DigiLockerPanProfile {
  panNumber: string;
  name: string;
  dob: string;
  gender: string;
  status: string;
}

export interface DigiLockerProvider {
  initiateSession(aadhaarNumber?: string): Promise<DigiLockerSessionResult>;
  fetchEaadhaar(txnId: string): Promise<AadhaarProfile | null>;
  fetchPanFromDigiLocker(txnId: string): Promise<DigiLockerPanProfile | null>;
}

export interface PanProfile {
  panNumber: string;
  name: string;
  dob: string;
  status: string;
  panType: string;
}

export interface PanProvider {
  verifyPan(panNumber: string): Promise<PanProfile | null>;
}
