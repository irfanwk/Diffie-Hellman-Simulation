export enum SimulationMode {
  BASIC_DH = 'BASIC_DH',
  WITH_SIGNATURE = 'WITH_SIGNATURE',
}

export enum EveState {
  IDLE = 'IDLE',
  INTERCEPTING = 'INTERCEPTING',
  BLOCKED = 'BLOCKED',
}

export enum SimulationStep {
  RESET = 'RESET',
  INITIAL_PARAMETERS = 'INITIAL_PARAMETERS',
  CALC_PUBLIC_KEYS = 'CALC_PUBLIC_KEYS',
  EXCHANGE = 'EXCHANGE',
  FINAL_CALC = 'FINAL_CALC',
  READY_FOR_MESSAGING = 'READY_FOR_MESSAGING',
}

export interface EncryptionData {
  original: string;
  cipher: string;
  decrypted: string;
}

export interface EntityState {
  privateKey: number;
  identityPublicKey: string;
  publicKey: number;
  receivedKey: number;
  sharedKey: number | null;
  message: string;
  encryption: EncryptionData;
}
