import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimate } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Shield, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  Send, 
  Info,
  ChevronRight,
  Eye,
  EyeOff,
  FileDigit,
  Fingerprint
} from 'lucide-react';
import { 
  SimulationMode, 
  EveState, 
  SimulationStep, 
  EntityState 
} from './types';
import { 
  MODULUS_P, 
  BASE_G, 
  SIMULATION_SPEEDS, 
  STEP_DESCRIPTIONS 
} from './constants';

const initialEntityState = (secret: number, identity: string): EntityState => ({
  privateKey: secret,
  identityPublicKey: identity,
  publicKey: 0,
  receivedKey: 0,
  sharedKey: null,
  message: '',
  encryption: { original: '', cipher: '', decrypted: '' }
});

export default function App() {
  // --- Simulation State ---
  const [mode, setMode] = useState<SimulationMode>(SimulationMode.BASIC_DH);
  const [eveState, setEveState] = useState<EveState>(EveState.IDLE);
  const [step, setStep] = useState<SimulationStep>(SimulationStep.RESET);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [animationTrigger, setAnimationTrigger] = useState(0);
  const progressRef = React.useRef(0);

  // --- Entity States ---
  const [alice, setAlice] = useState<EntityState>(initialEntityState(15, 'CERT-ALICE-123'));
  const [bob, setBob] = useState<EntityState>(initialEntityState(13, 'CERT-BOB-456'));
  const [eve, setEve] = useState<EntityState & { sharedKeyAlice: number | null, sharedKeyBob: number | null }>(() => ({
    ...initialEntityState(11, 'CERT-EVE-999'),
    sharedKeyAlice: null,
    sharedKeyBob: null
  }));

  const [messageTarget, setMessageTarget] = useState<'alice' | 'bob' | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  // Logic to calculate public values
  const calculatePublic = (privateKey: number) => {
    return Math.pow(BASE_G, privateKey) % MODULUS_P;
  };

  // Logic to calculate shared keys
  const calculateShared = (receivedPublicKey: number, myPrivateKey: number) => {
    return Math.pow(receivedPublicKey, myPrivateKey) % MODULUS_P;
  };

  // Simple "Encryption" (Caesar-like shift based on key)
  const encrypt = (text: string, key: number) => {
    return text.split('').map(char => String.fromCharCode(char.charCodeAt(0) + key)).join('');
  };

  const decrypt = (text: string, key: number) => {
    return text.split('').map(char => String.fromCharCode(char.charCodeAt(0) - key)).join('');
  };

  // --- Simulation Logic ---
  const resetSimulation = useCallback(() => {
    setIsPlaying(false);
    setStep(SimulationStep.RESET);
    setAlice(initialEntityState(15, 'CERT-ALICE-123'));
    setBob(initialEntityState(13, 'CERT-BOB-456'));
    setEve({ ...initialEntityState(11, 'CERT-EVE-999'), sharedKeyAlice: null, sharedKeyBob: null });
    setAnimationTrigger(0);
    setIsSendingMessage(false);
    setMessageTarget(null);
    progressRef.current = 0;
  }, []);

  const nextStep = useCallback(() => {
    setStep(prev => {
      switch (prev) {
        case SimulationStep.RESET: return SimulationStep.INITIAL_PARAMETERS;
        case SimulationStep.INITIAL_PARAMETERS: return SimulationStep.CALC_PUBLIC_KEYS;
        case SimulationStep.CALC_PUBLIC_KEYS: return SimulationStep.EXCHANGE;
        case SimulationStep.EXCHANGE: return SimulationStep.FINAL_CALC;
        case SimulationStep.FINAL_CALC: return SimulationStep.READY_FOR_MESSAGING;
        default: return prev;
      }
    });
    setAnimationTrigger(prev => prev + 1);
    progressRef.current = 0;
  }, []);

  // Pausable step timer
  useEffect(() => {
    if (!isPlaying || step === SimulationStep.READY_FOR_MESSAGING || isSendingMessage) return;

    const interval = setInterval(() => {
      progressRef.current += 50 * speed;
      if (progressRef.current >= 3000) {
        nextStep();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPlaying, step, speed, nextStep, isSendingMessage]);

  // Execute logic based on step
  useEffect(() => {
    if (step === SimulationStep.CALC_PUBLIC_KEYS) {
      setAlice(prev => ({ ...prev, publicKey: calculatePublic(prev.privateKey) }));
      setBob(prev => ({ ...prev, publicKey: calculatePublic(prev.privateKey) }));
      if (eveState === EveState.INTERCEPTING) {
        setEve(prev => ({ ...prev, publicKey: calculatePublic(prev.privateKey) }));
      }
    } else if (step === SimulationStep.EXCHANGE) {
      if (eveState === EveState.INTERCEPTING) {
        // Eve intercepts!
        // Alice receives Eve's public key (thinking it's Bob's)
        setAlice(prev => ({ ...prev, receivedKey: eve.publicKey }));
        // Bob receives Eve's public key (thinking it's Alice's)
        setBob(prev => ({ ...prev, receivedKey: eve.publicKey }));
        // Eve receives both
        setEve(prev => ({ ...prev, receivedKey: alice.publicKey })); // This is just for UI, Eve has both anyway
      } else {
        setAlice(prev => ({ ...prev, receivedKey: bob.publicKey }));
        setBob(prev => ({ ...prev, receivedKey: alice.publicKey }));
      }
    } else if (step === SimulationStep.FINAL_CALC) {
      if (mode === SimulationMode.WITH_SIGNATURE && eveState === EveState.INTERCEPTING) {
        // In signature mode, tampering is detected
        setStep(SimulationStep.READY_FOR_MESSAGING);
        return;
      }

      setAlice(prev => ({ ...prev, sharedKey: calculateShared(prev.receivedKey, prev.privateKey) }));
      setBob(prev => ({ ...prev, sharedKey: calculateShared(prev.receivedKey, prev.privateKey) }));
      
      if (eveState === EveState.INTERCEPTING) {
        setEve(prev => ({ 
          ...prev, 
          sharedKeyAlice: calculateShared(alice.publicKey, prev.privateKey),
          sharedKeyBob: calculateShared(bob.publicKey, prev.privateKey)
        }));
      }
    }
  }, [step, eveState, mode, alice.publicKey, bob.publicKey, eve.publicKey, eve.privateKey]);

  const messageProgressRef = React.useRef(0);

  // Pausable message timer
  useEffect(() => {
    if (!isSendingMessage || !isPlaying) return;

    const interval = setInterval(() => {
      messageProgressRef.current += 50 * speed;
      if (messageProgressRef.current >= 3000) {
        completeMessageTransmission();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isSendingMessage, isPlaying, speed]);

  const completeMessageTransmission = () => {
    const from = messageTarget === 'bob' ? 'alice' : 'bob';
    const sender = from === 'alice' ? alice : bob;
    const receiver = from === 'alice' ? bob : alice;
    const cipher = sender.encryption.cipher;

    // Eve interference logic
    if (eveState === EveState.INTERCEPTING && mode === SimulationMode.BASIC_DH) {
      const decryptedByEve = decrypt(cipher, from === 'alice' ? eve.sharedKeyAlice! : eve.sharedKeyBob!);
      const modifiedMessage = decryptedByEve; 
      const reEncryptedByEve = encrypt(modifiedMessage, from === 'alice' ? eve.sharedKeyBob! : eve.sharedKeyAlice!);
      
      setEve(prev => ({ 
        ...prev, 
        encryption: { original: decryptedByEve, cipher: reEncryptedByEve, decrypted: decryptedByEve } 
      }));

      if (from === 'alice') {
        setBob(prev => ({ ...prev, encryption: { original: '', cipher: reEncryptedByEve, decrypted: modifiedMessage } }));
      } else {
        setAlice(prev => ({ ...prev, encryption: { original: '', cipher: reEncryptedByEve, decrypted: modifiedMessage } }));
      }
    } else {
      const decryptedByReceiver = decrypt(cipher, receiver.sharedKey!);
      if (from === 'alice') {
        setBob(prev => ({ ...prev, encryption: { original: '', cipher: cipher, decrypted: decryptedByReceiver } }));
      } else {
        setAlice(prev => ({ ...prev, encryption: { original: '', cipher: cipher, decrypted: decryptedByReceiver } }));
      }
    }
    setIsSendingMessage(false);
    setIsPlaying(false);
    messageProgressRef.current = 0;
  };

  const handleSendMessage = (from: 'alice' | 'bob') => {
    const sender = from === 'alice' ? alice : bob;
    
    if (sender.sharedKey === null || !sender.message) return;

    const cipher = encrypt(sender.message, sender.sharedKey);
    
    if (from === 'alice') {
      setAlice(prev => ({ ...prev, encryption: { ...prev.encryption, original: prev.message, cipher: cipher } }));
      setMessageTarget('bob');
    } else {
      setBob(prev => ({ ...prev, encryption: { ...prev.encryption, original: prev.message, cipher: cipher } }));
      setMessageTarget('alice');
    }
    
    messageProgressRef.current = 0;
    setIsSendingMessage(true);
    setIsPlaying(true);
  };

  const isSharedKeyMatch = alice.sharedKey !== null && alice.sharedKey === bob.sharedKey;
  const isEveTampering = eveState === EveState.INTERCEPTING && mode === SimulationMode.WITH_SIGNATURE;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-6xl mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Diffie-Hellman Simulation</h1>
          <p className="text-slate-500 text-sm mt-1">Interactive Cryptography Lab</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-full shadow-sm border border-slate-200">
          <button 
            onClick={() => { setMode(SimulationMode.BASIC_DH); resetSimulation(); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${mode === SimulationMode.BASIC_DH ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Basic DH
          </button>
          <button 
            onClick={() => { setMode(SimulationMode.WITH_SIGNATURE); resetSimulation(); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${mode === SimulationMode.WITH_SIGNATURE ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            With Digital Signature
          </button>
        </div>
      </header>

      <main className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Kolom Kiri: Alice */}
        <EntityPanel 
          name="Alice" 
          role="Sender"
          state={alice} 
          icon={<Lock size={20} className="text-blue-500" />}
          bgColor="bg-alice-soft"
          onMessageChange={(v) => setAlice(prev => ({ ...prev, message: v }))}
          onSend={() => handleSendMessage('alice')}
          isReady={step === SimulationStep.READY_FOR_MESSAGING && !isSendingMessage}
        />

        {/* Kolom Tengah: Area Transmisi & Eve */}
        <div className="flex flex-col gap-6">
          <div className="relative h-[450px] bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
            <div className="absolute inset-0 flex flex-col justify-around py-12 px-4 pointer-events-none">
              <div className="h-px w-full bg-slate-100 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] uppercase tracking-widest text-slate-400">Transmission Line</div>
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative">
              <AnimatePresence>
                {step === SimulationStep.INITIAL_PARAMETERS && (
                  <Packet 
                    label={`g=${BASE_G}, p=${MODULUS_P}`} 
                    direction="right" 
                    speed={speed} 
                    isPlaying={isPlaying}
                    isIntercepted={false}
                  />
                )}
                {step === SimulationStep.EXCHANGE && (
                  <>
                    <Packet 
                      label={`A=${alice.publicKey}`} 
                      direction="right" 
                      speed={speed} 
                      isPlaying={isPlaying}
                      isIntercepted={eveState === EveState.INTERCEPTING}
                      isSigned={mode === SimulationMode.WITH_SIGNATURE}
                    />
                    <Packet 
                      label={`B=${bob.publicKey}`} 
                      direction="left" 
                      speed={speed} 
                      isPlaying={isPlaying}
                      isIntercepted={eveState === EveState.INTERCEPTING}
                      isSigned={mode === SimulationMode.WITH_SIGNATURE}
                    />
                  </>
                )}
                {isSendingMessage && messageTarget && (
                  <Packet 
                    label={`MSG: ${messageTarget === 'bob' ? alice.encryption.cipher : bob.encryption.cipher}`}
                    direction={messageTarget === 'bob' ? 'right' : 'left'}
                    speed={speed}
                    isPlaying={isPlaying}
                    isIntercepted={eveState === EveState.INTERCEPTING && mode === SimulationMode.BASIC_DH}
                  />
                )}
              </AnimatePresence>

              <EvePanel 
                state={eveState} 
                onToggle={() => {
                  if (step === SimulationStep.RESET) {
                    setEveState(prev => prev === EveState.IDLE ? EveState.INTERCEPTING : EveState.IDLE);
                  }
                }}
                disabled={step !== SimulationStep.RESET}
                data={eve}
                mode={mode}
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200">
               <div className="flex items-center gap-2 mb-2">
                 <Info size={14} className="text-slate-400" />
                 <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">Simulation Status</span>
               </div>
               <p className="text-sm text-slate-600 min-h-[40px] italic">
                 {isEveTampering ? 'Digital Signature detected tampering! Simulation aborted for safety.' : STEP_DESCRIPTIONS[step]}
               </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      if (step === SimulationStep.READY_FOR_MESSAGING) resetSimulation();
                      else setIsPlaying(!isPlaying);
                    }}
                    className={`p-3 rounded-full transition-all ${isPlaying ? 'bg-amber-100 text-amber-600' : 'bg-slate-800 text-white active:scale-95'}`}
                  >
                    {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                  </button>
                  <button 
                    onClick={resetSimulation}
                    className="p-3 bg-slate-100 text-slate-600 rounded-full hover:bg-slate-200 active:scale-95"
                  >
                    <RotateCcw size={20} />
                  </button>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Speed: {speed}X</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="4" 
                    step="1"
                    value={SIMULATION_SPEEDS.indexOf(speed)} 
                    onChange={(e) => setSpeed(SIMULATION_SPEEDS[parseInt(e.target.value)])}
                    className="w-32"
                  />
                </div>
             </div>
             
             {/* Progress bar */}
             <div className="flex gap-1 h-1.5">
               {Object.values(SimulationStep).filter(s => s !== 'RESET').map((s, i) => (
                 <div 
                   key={s} 
                   className={`flex-1 rounded-full transition-all duration-500 ${
                     Object.values(SimulationStep).indexOf(step) >= i + 1 
                      ? 'bg-slate-800 shadow-[0_0_8px_rgba(0,0,0,0.1)]' 
                      : 'bg-slate-200'
                   }`} 
                 />
               ))}
             </div>
          </div>
        </div>

        {/* Kolom Kanan: Bob */}
        <EntityPanel 
          name="Bob" 
          role="Receiver"
          state={bob} 
          icon={<Unlock size={20} className="text-orange-500" />}
          bgColor="bg-bob-soft"
          onMessageChange={(v) => setBob(prev => ({ ...prev, message: v }))}
          onSend={() => handleSendMessage('bob')}
          isReady={step === SimulationStep.READY_FOR_MESSAGING && !isSendingMessage}
        />
      </main>

      {/* Footer Info */}
      <footer className="mt-12 text-slate-400 text-xs flex gap-6 items-center">
        <div className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-3 py-1.5 rounded-full border border-slate-200">
           <span className="w-2 h-2 rounded-full bg-blue-500" /> Base (g): {BASE_G}
        </div>
        <div className="flex items-center gap-1.5 backdrop-blur-sm bg-white/50 px-3 py-1.5 rounded-full border border-slate-200">
           <span className="w-2 h-2 rounded-full bg-indigo-500" /> Modulus (p): {MODULUS_P}
        </div>
        <p>Diffie-Hellman Simulation</p>
      </footer>
    </div>
  );
}

// --- Subcomponents ---

function EntityPanel({ 
  name, 
  role, 
  state, 
  icon, 
  bgColor, 
  onMessageChange, 
  onSend, 
  isReady,
}: { 
  name: string; 
  role: string;
  state: EntityState; 
  icon: React.ReactNode; 
  bgColor: string;
  onMessageChange: (v: string) => void;
  onSend: () => void;
  isReady: boolean;
}) {
  return (
    <div className={`flex flex-col gap-4 p-6 rounded-[32px] border border-slate-200 shadow-sm transition-all bg-white relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-5 pointer-events-none ${bgColor.replace('bg-', 'bg-')}`} />
      
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2.5 rounded-2xl ${bgColor}`}>
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold leading-tight">{name}</h2>
          <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">{role}</span>
        </div>
      </div>

      <div className="space-y-3">
        <DataField label="Secret Key (a/b)" value={state.privateKey} isSecret />
        <DataField label="Identity Public Key" value={state.identityPublicKey} />
        <DataField label="Public Component" value={state.publicKey || '-'} />
        <DataField label="Received Value" value={state.receivedKey || '-'} />
        <div className={`p-4 rounded-2xl border transition-all ${state.sharedKey !== null ? (name === 'Alice' ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100') : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex justify-between items-center mb-1">
             <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Shared Secret Key</span>
             {state.sharedKey !== null && <Lock size={12} className="text-slate-400" />}
          </div>
          <p className="text-2xl font-mono font-bold tracking-tighter">
            {state.sharedKey !== null ? state.sharedKey : '??'}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <Send size={14} className="text-slate-400" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Secure Messaging</span>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Type a secret message..." 
              disabled={!isReady}
              value={state.message}
              onChange={(e) => onMessageChange(e.target.value)}
              className="w-full pl-4 pr-12 py-3 bg-slate-100 border-none rounded-2xl text-sm focus:ring-2 ring-slate-800/10 placeholder:text-slate-400 transition-all disabled:opacity-50"
            />
            <button 
              onClick={onSend}
              disabled={!isReady || !state.message}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-800 text-white rounded-xl disabled:bg-slate-200 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {state.encryption.cipher && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-2.5 bg-slate-800 rounded-xl text-white shadow-md border border-slate-700"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Ciphertext Out</span>
                  <Lock size={10} className="text-slate-500" />
                </div>
                <p className="font-mono text-[11px] break-all tracking-wider text-slate-300">{state.encryption.cipher}</p>
              </motion.div>
            )}

            {state.encryption.decrypted && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-2.5 bg-green-50 rounded-xl border border-green-100 flex justify-between items-center"
              >
                <div>
                  <p className="text-[9px] uppercase font-bold text-green-600/60 mb-1">Received & Decrypted</p>
                  <p className="text-sm font-semibold text-green-800">{state.encryption.decrypted}</p>
                </div>
                <Unlock size={14} className="text-green-500" />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value, isSecret = false }: { label: string, value: any, isSecret?: boolean }) {
  const [show, setShow] = useState(!isSecret);
  
  return (
    <div className="flex justify-between items-center py-2 px-3 bg-white border border-slate-100 rounded-xl">
      <span className="text-[11px] font-medium text-slate-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`font-mono text-sm font-bold ${show ? '' : 'blur-sm select-none'}`}>
          {value}
        </span>
        {isSecret && (
          <button onClick={() => setShow(!show)} className="text-slate-300 hover:text-slate-500 transition-colors">
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function EvePanel({ state, onToggle, disabled, data, mode }: { 
  state: EveState, 
  onToggle: () => void, 
  disabled: boolean,
  data: any,
  mode: SimulationMode
}) {
  const isIntercepting = state === EveState.INTERCEPTING;
  const isBlocked = mode === SimulationMode.WITH_SIGNATURE && isIntercepting;

  return (
    <div className="relative group">
      <motion.div 
        animate={{ 
          scale: isIntercepting ? 1.05 : 1,
          borderColor: isBlocked ? '#ef4444' : (isIntercepting ? '#f59e0b' : '#e2e8f0'),
          backgroundColor: isBlocked ? '#fff0f0' : (isIntercepting ? '#fffbeb' : '#ffffff')
        }}
        className={`w-36 flex flex-col items-center p-4 rounded-3xl border-2 transition-all shadow-lg relative z-10`}
      >
        <div className={`mb-3 p-3 rounded-2xl ${isBlocked ? 'bg-red-100 text-red-600' : (isIntercepting ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600')}`}>
          {isBlocked ? <ShieldAlert size={28} /> : (isIntercepting ? <Eye size={28} /> : <EyeOff size={28} />)}
        </div>
        
        <h3 className="font-bold text-sm">EVE</h3>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isBlocked ? 'text-red-500' : (isIntercepting ? 'text-amber-500' : 'text-slate-400')}`}>
          {isBlocked ? 'Blocked' : (isIntercepting ? 'Intercepting' : 'Idle')}
        </p>

        {isIntercepting && !isBlocked && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 w-full pt-4 border-t border-amber-200/50 space-y-2 overflow-hidden"
          >
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-amber-600/70 font-semibold uppercase">Key (E-A)</span>
              <span className="font-mono font-bold text-amber-900">{data.sharedKeyAlice || '?'}</span>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-amber-600/70 font-semibold uppercase">Key (E-B)</span>
              <span className="font-mono font-bold text-amber-900">{data.sharedKeyBob || '?'}</span>
            </div>
            {data.encryption.original && (
               <div className="bg-amber-200/30 p-2 rounded-lg border border-amber-200 mt-2">
                 <p className="text-[9px] uppercase font-bold text-amber-700/60 mb-1">Decrypted msg</p>
                 <p className="text-xs font-semibold text-amber-900 break-all">"{data.encryption.original}"</p>
               </div>
            )}
          </motion.div>
        )}

        <button 
          onClick={onToggle}
          disabled={disabled}
          className={`mt-4 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-tighter transition-all 
            ${disabled ? 'opacity-0 pointer-events-none' : 'bg-slate-800 text-white hover:bg-slate-700 active:scale-95'}`}
        >
          {isIntercepting ? 'Drop Attack' : 'Attack'}
        </button>
      </motion.div>
      
      {/* Visual background effect for interception */}
      {isIntercepting && !isBlocked && (
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute inset-0 bg-amber-400 rounded-full blur-[40px] -z-10"
        />
      )}
    </div>
  );
}

function Packet({ label, direction, speed, isPlaying, isIntercepted, isSigned }: { label: string, direction: 'right' | 'left', speed: number, isPlaying: boolean, isIntercepted: boolean, isSigned?: boolean }) {
  const [scope, animate] = useAnimate();
  const animationRef = React.useRef<any>(null);
  const duration = 2 / speed;
  const targetX = isIntercepted ? 0 : (direction === 'right' ? 180 : -180);
  const startX = direction === 'right' ? -180 : 180;

  useEffect(() => {
    const finalDuration = isIntercepted ? duration / 2 : duration;
    
    animationRef.current = animate(
      scope.current,
      { 
        x: [startX, targetX],
        opacity: [0, 1, 1, 0]
      },
      { 
        duration: finalDuration, 
        ease: "linear",
        opacity: { times: [0, 0.1, 0.9, 1], duration: finalDuration }
      }
    );

    if (!isPlaying) {
      animationRef.current.pause();
    }

    return () => {
      animationRef.current?.stop();
    };
  }, [label, direction, isIntercepted, speed]);

  useEffect(() => {
    if (isPlaying) {
      animationRef.current?.play();
    } else {
      animationRef.current?.pause();
    }
  }, [isPlaying]);

  return (
    <div 
      ref={scope}
      className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 z-20"
      style={{ opacity: 0 }} // Start invisible, animate handles it
    >
      <div className={`px-3 py-2 rounded-xl text-white text-xs font-mono font-bold flex items-center gap-2 shadow-lg 
        ${isIntercepted ? 'bg-amber-500' : 'bg-slate-800'}`}>
        {isSigned && <Fingerprint size={12} className="text-blue-300" />}
        {label}
        {isSigned && <span className="p-0.5 bg-blue-500 rounded-md text-[8px] tracking-tight">SIG</span>}
      </div>
      {isIntercepted && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: duration / 2 }}
          className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200"
        >
          Captured!
        </motion.div>
      )}
    </div>
  );
}

