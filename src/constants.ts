export const MODULUS_P = 17;
export const BASE_G = 3;

export const SIMULATION_SPEEDS = [0.1, 0.25, 0.5, 1, 1.5];

export const STEP_DESCRIPTIONS: Record<string, string> = {
  RESET: 'Press Play to start the simulation.',
  INITIAL_PARAMETERS: 'Sharing public parameters: Base (g) and Modulus (p).',
  CALC_PUBLIC_KEYS: 'Alice and Bob calculate their first key components using their private keys.',
  EXCHANGE: 'Alice and Bob exchange their calculated public components.',
  FINAL_CALC: 'Calculating the shared secret key using the received values.',
  READY_FOR_MESSAGING: 'Shared keys established! You can now send encrypted messages.',
};
