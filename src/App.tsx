import React, { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import {
  Star, ArrowRight, ArrowLeft, ArrowDown, ArrowUp, CheckCircle, Trophy, Home, History, Zap, LayoutGrid, Pyramid, ShoppingBag, ListOrdered, GripHorizontal, AlignCenterHorizontal, GitCommitHorizontal, TrendingUp, Box, Users, BookOpen, Layers, Triangle, CircleDashed, Volume2, VolumeX, Target, Calculator, Trash2, Map, HelpCircle, PenTool, AlertTriangle, Sparkles
} from "lucide-react";

// ==========================================
// 1. INFRASTRUKTUR & HELFER (DIE "ENGINE")
// ==========================================

const QUESTIONS_PER_ROUND = 10;
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- SOUND ENGINE ---
let audioCtx: AudioContext | null = null;
const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  return audioCtx;
};

const playSound = (type: "correct" | "wrong" | "click", enabled: boolean) => {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  if (type === "click") {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.01);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === "correct") {
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.05, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.4);
      o.start(now + i * 0.1);
      o.stop(now + i * 0.1 + 0.4);
    });
  } else {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start();
    osc.stop(now + 0.4);
  }
};

// --- MODE INFO & TYPES ---
type Category = "calc" | "space" | "money" | "written_calc" | "mixed" | "new_june15" | "new_june23";
type GameMode = string; 
type FeedbackType = "none" | "correct" | "wrong";

const getModeInfo = (m: string) => {
  switch (m) {
    // Calc
    case "multiplication": return { name: "1x1", icon: "✖️", color: "bg-blue-500", border: "border-blue-700" };
    case "division": return { name: "Geteilt", icon: "➗", color: "bg-emerald-500", border: "border-emerald-700" };
    case "addition": return { name: "Plus", icon: "➕", color: "bg-orange-500", border: "border-orange-700" };
    case "subtraction": return { name: "Minus", icon: "➖", color: "bg-red-500", border: "border-red-700" };
    case "addition_1000": return { name: "Plus 1000", icon: <Calculator size={20} />, color: "bg-orange-600", border: "border-orange-800" };
    case "subtraction_1000": return { name: "Minus 1000", icon: <Calculator size={20} />, color: "bg-red-600", border: "border-red-800" };
    case "pyramid": return { name: "Mauer", icon: <Pyramid size={20} />, color: "bg-indigo-500", border: "border-indigo-700" };
    case "calc_table": return { name: "Tabelle", icon: <LayoutGrid size={20} />, color: "bg-cyan-600", border: "border-cyan-800" };
    case "fact_family": return { name: "Familie", icon: <Users size={20} />, color: "bg-fuchsia-500", border: "border-fuchsia-700" };
    case "triangle": return { name: "Dreieck", icon: <Triangle size={20} />, color: "bg-teal-500", border: "border-teal-700" };
    case "triangle_add": return { name: "Dreieck +", icon: <Triangle size={20} />, color: "bg-teal-600", border: "border-teal-800" };
    case "calc_wheel": return { name: "Rad", icon: <CircleDashed size={20} />, color: "bg-rose-600", border: "border-rose-800" };
    
    // Schriftliches Rechnen
    case "written_add": return { name: "Schriftlich +", icon: <PenTool size={20} />, color: "bg-orange-600", border: "border-orange-800" };
    case "written_sub": return { name: "Schriftlich -", icon: <PenTool size={20} />, color: "bg-red-600", border: "border-red-800" };
    case "written_mixed_target": return { name: "Schriftlich + Vorgabe", icon: <PenTool size={20} />, color: "bg-fuchsia-600", border: "border-fuchsia-800" };
    case "written_gap": return { name: "Lücken +", icon: <HelpCircle size={20} />, color: "bg-amber-500", border: "border-amber-700" };
    case "written_error": return { name: "Was ist falsch?", icon: <AlertTriangle size={20} />, color: "bg-red-500", border: "border-red-700" };
    case "written_fix_error": return { name: "Fehler finden", icon: <CheckCircle size={20} />, color: "bg-rose-600", border: "border-rose-800" };

    // Space & Logic
    case "grid_cutout": return { name: "Ausschnitt", icon: <LayoutGrid size={20}/>, color: "bg-indigo-600", border: "border-indigo-800" };
    case "arrow_path": return { name: "Pfeile", icon: <Map size={20}/>, color: "bg-violet-600", border: "border-violet-800" };
    case "estimation": return { name: "Überschlag", icon: <Target size={20}/>, color: "bg-amber-600", border: "border-amber-800" };
    case "rounding": return { name: "Runden", icon: <Target size={20} />, color: "bg-cyan-500", border: "border-cyan-700" };
    case "neighbors": return { name: "Nachbarn", icon: <GripHorizontal size={20} />, color: "bg-teal-600", border: "border-teal-800" };
    case "sequences": return { name: "Folgen", icon: <ListOrdered size={20} />, color: "bg-lime-600", border: "border-lime-800" };
    case "chain": return { name: "Kette", icon: <GitCommitHorizontal size={20} />, color: "bg-violet-600", border: "border-violet-800" };
    case "sorting": return { name: "Ordnen", icon: <TrendingUp size={20} />, color: "bg-sky-600", border: 'border-sky-800' };
    case "number_line": return { name: "Strahl", icon: <AlignCenterHorizontal size={20} />, color: "bg-indigo-400", border: "border-indigo-600" };
    case "symbols": return { name: "Symbole", icon: "🧩", color: "bg-pink-500", border: "border-pink-700" };
    case "shapes": return { name: "Formen", icon: "🔲", color: "bg-violet-500", border: "border-violet-700" };
    case "place_value": return { name: "Stellen", icon: <Box size={20} />, color: "bg-blue-600", border: "border-blue-800" };
    case "logic_grid_colors": return { name: "Würfelgitter", icon: <LayoutGrid size={20} />, color: "bg-fuchsia-600", border: "border-fuchsia-800" };
    
    // Money
    case "money_count": return { name: "Zählen", icon: "💰", color: "bg-yellow-500", border: "border-yellow-700" };
    case "shopping": return { name: "Einkaufen", icon: <ShoppingBag size={20} />, color: "bg-rose-500", border: "border-rose-700" };
    case "word_problem": return { name: "Sachaufgaben", icon: <BookOpen size={20} />, color: "bg-amber-500", border: "border-amber-700" };
    
    default: return { name: m, icon: "🎮", color: "bg-slate-500", border: "border-slate-700" };
  }
};

// ==========================================
// 2. UI KOMPONENTEN
// ==========================================

const Coin = ({ value }: { value: number }) => {
  let bg = "bg-amber-700", text = "text-white", border = "border-amber-900", size = "w-10 h-10";
  if (value >= 10 && value <= 50) { bg = "bg-yellow-500"; text = "text-yellow-900"; border = "border-yellow-700"; if(value===50) size="w-12 h-12"; }
  else if (value >= 100) { bg = "bg-slate-300 ring-2 ring-yellow-500"; text = "text-slate-800"; border = "border-slate-500"; size = "w-12 h-12"; }
  return <div className={`${size} ${bg} rounded-full flex items-center justify-center font-bold shadow-md border-b-4 ${border} ${text} shrink-0 text-sm`}>{value >= 100 ? value/100 : value}<span className="text-[8px] ml-0.5 opacity-80">{value>=100?'€':'ct'}</span></div>;
};

const Bill = ({ value }: { value: number }) => {
  let color = "bg-slate-400";
  if (value === 5) color = "bg-neutral-400 border-neutral-500";
  if (value === 10) color = "bg-red-400 border-red-600";
  if (value === 20) color = "bg-blue-400 border-blue-600";
  if (value === 50) color = "bg-orange-400 border-orange-600";
  return <div className={`${color} w-20 h-10 rounded-sm border-b-4 shadow-lg flex items-center justify-between px-2 font-bold text-lg relative overflow-hidden text-white/90`}><span className="text-xs">€</span>{value}</div>;
};

const ScratchPad = ({ clearTrigger }: { clearTrigger: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement;
    if(parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; }
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#334155";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, [clearTrigger]);

  const getPos = (e: any) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
  };
  const start = (e: any) => { setIsDrawing(true); const {x,y} = getPos(e); const ctx = canvasRef.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(x,y); };
  const move = (e: any) => { if(!isDrawing) return; const {x,y} = getPos(e); const ctx = canvasRef.current!.getContext('2d')!; ctx.lineTo(x,y); ctx.stroke(); e.preventDefault(); };
  const end = () => setIsDrawing(false);

  return (
    <div className="flex flex-col h-full bg-yellow-50 rounded-3xl shadow-inner border-4 border-yellow-200 relative overflow-hidden">
      <div className="absolute top-2 right-2 z-10"><button onClick={() => { const c = canvasRef.current; c?.getContext('2d')?.clearRect(0,0,c.width,c.height); }} className="p-1.5 bg-white/80 rounded-full text-red-400 hover:bg-white transition-colors"><Trash2 size={16}/></button></div>
      <canvas ref={canvasRef} className="w-full h-full touch-none cursor-crosshair" onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
    </div>
  );
};

const CategorySection = ({ title, modes, cat, onStart, highlight = false, icon = null }: { title: string, modes: GameMode[], cat: Category, onStart: (m: GameMode | Category) => void, highlight?: boolean, icon?: ReactNode }) => (
  <div className={`${highlight ? 'bg-indigo-50 border-2 border-indigo-100' : 'bg-slate-50'} rounded-2xl p-4 mb-4`}>
    <div className="flex items-center justify-between mb-3">
      <h3 className={`${highlight ? 'text-indigo-600' : 'text-slate-500'} font-bold uppercase text-xs tracking-wider flex items-center gap-1.5`}>
          {icon} {title}
      </h3>
      <button onClick={() => onStart(cat)} className={`text-xs ${highlight ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700'} text-white px-3 py-1 rounded-full font-bold shadow active:scale-95 flex items-center gap-1 transition-all`}><Layers size={12} /> Alles mischen</button>
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {modes.map(m => {
        const info = getModeInfo(m);
        return (
          <button key={m} onClick={() => onStart(m)} className={`${info.color} text-white py-3 rounded-xl shadow hover:brightness-110 active:scale-95 flex flex-col items-center gap-1 border-b-4 ${info.border} relative transition-all`}>
            {/* {(info as any).isNew && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm animate-bounce">NEU</span>} */}
            <span className="text-xl">{info.icon}</span><span className="text-[10px] sm:text-xs font-bold text-center leading-tight px-1">{info.name}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// ==========================================
// 3. TASK REGISTRY (AUFGABEN-LOGIK)
// ==========================================

interface TaskDef {
  id: string; category: Category; isMultiInput: boolean;
  generate: () => any;
  validate: (data: any, inputs: Record<string, string>, simpleInput: string) => boolean;
  getFieldOrder?: (data: any, inputs?: Record<string, string>) => string[];
  render: (data: any, inputs: Record<string, string>, simpleInput: string, feedback: FeedbackType, activeId: string|null, renderCell: any, handleInput?: (val: string, id: string | null) => void) => ReactNode;
}

const TASKS: Record<string, TaskDef> = {
  // --- SCHRIFTLICHES RECHNEN ---
  written_add: {
      id: 'written_add', category: 'written_calc', isMultiInput: true,
      generate: () => {
          const a = rand(100, 899); const b = rand(10, 999-a);
          return { a, b, res: a+b };
      },
      validate: (d, i) => {
          const rH = Math.floor(d.res/100); const rZ = Math.floor((d.res%100)/10); const rE = d.res%10;
          const cZ = Math.floor((d.a%10 + d.b%10)/10);
          const cH = Math.floor((d.a%100 + d.b%100)/100);
          
          return parseInt(i['re']||'0')===rE && 
                 parseInt(i['rz']||'0')===rZ && 
                 parseInt(i['rh']||'0')===rH &&
                 parseInt(i['ce']||'0')===cZ && 
                 parseInt(i['cz']||'0')===cH;
      },
      getFieldOrder: (d) => {
          const cZ = Math.floor((d.a%10 + d.b%10)/10);
          const cH = Math.floor((d.a%100 + d.b%100)/100);
          const fields = ['re'];
          if (cZ > 0) fields.push('ce');
          fields.push('rz');
          if (cH > 0) fields.push('cz');
          fields.push('rh');
          return fields;
      },
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center">
              <h3 className="font-bold text-slate-500 mb-4">Schriftliche Addition</h3>
              <div className="bg-white p-4 border-2 rounded-xl shadow-inner grid grid-cols-4 gap-1 text-2xl font-mono text-center items-center">
                  <div className="text-slate-400 font-bold bg-slate-100 rounded"></div>
                  <div className="text-slate-400 font-bold bg-slate-100 rounded">H</div>
                  <div className="text-slate-400 font-bold bg-slate-100 rounded">Z</div>
                  <div className="text-slate-400 font-bold bg-slate-100 rounded">E</div>

                  <div></div>
                  <div className="p-2">{Math.floor(d.a/100) || ''}</div>
                  <div className="p-2">{Math.floor((d.a%100)/10)}</div>
                  <div className="p-2">{d.a%10}</div>

                  <div className="p-2">+</div>
                  <div className="p-2">{Math.floor(d.b/100) || ''}</div>
                  <div className="p-2">{Math.floor((d.b%100)/10)}</div>
                  <div className="p-2">{d.b%10}</div>

                  <div></div>
                  <div className="p-1 flex justify-center">{c('cz', i['cz'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                  <div className="p-1 flex justify-center">{c('ce', i['ce'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                  <div></div>

                  <div className="col-span-4 border-b-4 border-slate-800 my-1"></div>

                  <div></div>
                  <div className="p-1 flex justify-center">{c('rh', i['rh'], false, '', 'w-12 h-12')}</div>
                  <div className="p-1 flex justify-center">{c('rz', i['rz'], false, '', 'w-12 h-12')}</div>
                  <div className="p-1 flex justify-center">{c('re', i['re'], false, '', 'w-12 h-12')}</div>
              </div>
              <p className="text-xs text-slate-400 mt-4 max-w-xs text-center">Tipp: Beginne bei den Einern (E). Wenn nichts übertragen wird, kannst du das kleine Kästchen einfach leer lassen.</p>
          </div>
      )
  },
  written_sub: {
      id: 'written_sub', category: 'written_calc', isMultiInput: true,
      generate: () => {
          const a = rand(200, 999); const b = rand(10, a - 1);
          return { a, b, res: a - b };
      },
      validate: (d, i) => {
          const rH = Math.floor(d.res/100); const rZ = Math.floor((d.res%100)/10); const rE = d.res%10;
          const aE = d.a % 10; const bE = d.b % 10;
          const cE = aE < bE ? 1 : 0;
          const aZ = Math.floor((d.a % 100) / 10);
          const bZ = Math.floor((d.b % 100) / 10);
          const cZ = aZ < bZ + cE ? 1 : 0;
          
          return parseInt(i['re']||'0')===rE && 
                 parseInt(i['rz']||'0')===rZ && 
                 parseInt(i['rh']||'0')===rH &&
                 parseInt(i['ce']||'0')===cE && 
                 parseInt(i['cz']||'0')===cZ;
      },
      getFieldOrder: (d) => {
          const aE = d.a % 10; const bE = d.b % 10;
          const cE = aE < bE ? 1 : 0;
          const aZ = Math.floor((d.a % 100) / 10);
          const bZ = Math.floor((d.b % 100) / 10);
          const cZ = aZ < bZ + cE ? 1 : 0;
          
          const fields = ['re'];
          if (cE > 0) fields.push('ce');
          fields.push('rz');
          if (cZ > 0) fields.push('cz');
          fields.push('rh');
          return fields;
      },
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center">
              <h3 className="font-bold text-slate-500 mb-4">Schriftliche Subtraktion</h3>
              <div className="bg-white p-4 border-2 rounded-xl shadow-inner grid grid-cols-4 gap-1 text-2xl font-mono text-center items-center">
                  <div className="text-slate-400 font-bold bg-slate-100 rounded"></div>
                  <div className="text-slate-400 font-bold bg-slate-100 rounded">H</div>
                  <div className="text-slate-400 font-bold bg-slate-100 rounded">Z</div>
                  <div className="text-slate-400 font-bold bg-slate-100 rounded">E</div>

                  <div></div>
                  <div className="p-2">{Math.floor(d.a/100) || ''}</div>
                  <div className="p-2">{Math.floor((d.a%100)/10)}</div>
                  <div className="p-2">{d.a%10}</div>

                  <div className="p-2">-</div>
                  <div className="p-2">{Math.floor(d.b/100) || ''}</div>
                  <div className="p-2">{Math.floor((d.b%100)/10)}</div>
                  <div className="p-2">{d.b%10}</div>

                  <div></div>
                  <div className="p-1 flex justify-center">{c('cz', i['cz'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                  <div className="p-1 flex justify-center">{c('ce', i['ce'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                  <div></div>

                  <div className="col-span-4 border-b-4 border-slate-800 my-1"></div>

                  <div></div>
                  <div className="p-1 flex justify-center">{c('rh', i['rh'], false, '', 'w-12 h-12')}</div>
                  <div className="p-1 flex justify-center">{c('rz', i['rz'], false, '', 'w-12 h-12')}</div>
                  <div className="p-1 flex justify-center">{c('re', i['re'], false, '', 'w-12 h-12')}</div>
              </div>
              <p className="text-xs text-slate-400 mt-4 max-w-xs text-center">Tipp: Beginne bei den Einern (E). Den Übertrag (falls nötig) trägst du in das kleine Kästchen ein.</p>
          </div>
      )
  },
  written_mixed_target: {
      id: 'written_mixed_target', category: 'written_calc', isMultiInput: true,
      generate: () => {
          const op = rand(0, 1) === 0 ? '+' : '-';
          const a = rand(200, 800);
          let res1, res2;
          if (op === '+') {
              res1 = rand(a + 10, 999);
              res2 = rand(a + 10, 999);
              while (res1 === res2) res2 = rand(a + 10, 999);
          } else {
              res1 = rand(10, a - 10);
              res2 = rand(10, a - 10);
              while (res1 === res2) res2 = rand(10, a - 10);
          }
          if (rand(0, 1) === 1) { const tmp = res1; res1 = res2; res2 = tmp; }
          return { op, a, res1, res2 };
      },
      validate: (d, i) => {
          if (!i['target']) return false;
          const targetRes = i['target'] === '1' ? d.res1 : d.res2;
          
          const bHStr = i['b_h'] || '0';
          const bZStr = i['b_z'] || '0';
          const bEStr = i['b_e'] || '0';
          
          const b = parseInt(bHStr) * 100 + parseInt(bZStr) * 10 + parseInt(bEStr);
          
          if (d.op === '+') {
              if (d.a + b !== targetRes) return false;
              const cE = (d.a % 10 + b % 10) >= 10 ? 1 : 0;
              const cZ = (Math.floor((d.a % 100) / 10) + Math.floor((b % 100) / 10) + cE) >= 10 ? 1 : 0;
              return parseInt(i['ce'] || '0') === cE && parseInt(i['cz'] || '0') === cZ;
          } else {
              if (d.a - b !== targetRes) return false;
              const aE = d.a % 10;
              const bE = b % 10;
              const cE = aE < bE ? 1 : 0;
              const aZ = Math.floor((d.a % 100) / 10);
              const bZ = Math.floor((b % 100) / 10);
              const cZ = aZ < bZ + cE ? 1 : 0;
              return parseInt(i['ce'] || '0') === cE && parseInt(i['cz'] || '0') === cZ;
          }
      },
      getFieldOrder: (d, inputs) => {
          if (!inputs || !inputs['target']) return ['b_e', 'ce', 'b_z', 'cz', 'b_h'];
          
          const targetRes = inputs['target'] === '1' ? d.res1 : d.res2;
          const b = d.op === '+' ? targetRes - d.a : d.a - targetRes;
          
          const fields = ['b_e'];
          let cE = 0;
          if (d.op === '+') { cE = (d.a % 10 + b % 10) >= 10 ? 1 : 0; } 
          else { cE = (d.a % 10) < (b % 10) ? 1 : 0; }
          
          if (cE > 0) fields.push('ce');
          fields.push('b_z');
          
          let cZ = 0;
          if (d.op === '+') { cZ = (Math.floor((d.a % 100) / 10) + Math.floor((b % 100) / 10) + cE) >= 10 ? 1 : 0; } 
          else { cZ = Math.floor((d.a % 100) / 10) < (Math.floor((b % 100) / 10) + cE) ? 1 : 0; }
          
          if (cZ > 0) fields.push('cz');
          if (b >= 100) fields.push('b_h');
          
          return fields;
      },
      render: (d, i, _s, _f, _a, c, handleInput) => {
          const targetSelected = i['target'];
          
          if (!targetSelected) {
              return (
                  <div className="flex flex-col items-center">
                      <h3 className="font-bold text-slate-500 mb-6 text-center px-4">Wähle ein Ziel-Ergebnis für die {d.op === '+' ? 'Addition' : 'Subtraktion'}:</h3>
                      <div className="flex gap-4">
                          <button onClick={() => handleInput && handleInput('1', 'target')} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg text-2xl transition-transform active:scale-95">
                              {d.res1}
                          </button>
                          <button onClick={() => handleInput && handleInput('2', 'target')} className="bg-fuchsia-500 hover:bg-fuchsia-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg text-2xl transition-transform active:scale-95">
                              {d.res2}
                          </button>
                      </div>
                  </div>
              );
          }
          
          const targetRes = targetSelected === '1' ? d.res1 : d.res2;
          
          return (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <h3 className="font-bold text-slate-500 mb-4">Schriftlich {d.op} Vorgabe</h3>
                  <div className="bg-white p-4 border-2 rounded-xl shadow-inner grid grid-cols-4 gap-1 text-2xl font-mono text-center items-center">
                      <div className="text-slate-400 font-bold bg-slate-100 rounded"></div>
                      <div className="text-slate-400 font-bold bg-slate-100 rounded">H</div>
                      <div className="text-slate-400 font-bold bg-slate-100 rounded">Z</div>
                      <div className="text-slate-400 font-bold bg-slate-100 rounded">E</div>

                      <div></div>
                      <div className="p-2">{Math.floor(d.a/100) || ''}</div>
                      <div className="p-2">{Math.floor((d.a%100)/10)}</div>
                      <div className="p-2">{d.a%10}</div>

                      <div className="p-2">{d.op}</div>
                      <div className="p-1 flex justify-center">{c('b_h', i['b_h'], false, '', 'w-12 h-12 border-fuchsia-300 bg-fuchsia-50')}</div>
                      <div className="p-1 flex justify-center">{c('b_z', i['b_z'], false, '', 'w-12 h-12 border-fuchsia-300 bg-fuchsia-50')}</div>
                      <div className="p-1 flex justify-center">{c('b_e', i['b_e'], false, '', 'w-12 h-12 border-fuchsia-300 bg-fuchsia-50')}</div>

                      <div></div>
                      <div className="p-1 flex justify-center">{c('cz', i['cz'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                      <div className="p-1 flex justify-center">{c('ce', i['ce'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                      <div></div>

                      <div className="col-span-4 border-b-4 border-slate-800 my-1"></div>

                      <div></div>
                      <div className="p-2">{Math.floor(targetRes/100) || ''}</div>
                      <div className="p-2">{Math.floor((targetRes%100)/10)}</div>
                      <div className="p-2">{targetRes%10}</div>
                  </div>
                  <p className="text-xs text-slate-400 mt-4 max-w-xs text-center">Finde die passende zweite Zahl, um dein Ziel zu erreichen!</p>
              </div>
          );
      }
  },
  written_gap: {
      id: 'written_gap', category: 'written_calc', isMultiInput: true,
      generate: () => {
          const a = rand(100, 899); const b = rand(10, 999-a); const res = a+b;
          const hidden = new Set();
          while(hidden.size < 3) hidden.add(rand(0,8));
          return { a, b, res, hidden: Array.from(hidden) };
      },
      validate: (d, i) => {
          const digits = [ Math.floor(d.a/100), Math.floor((d.a%100)/10), d.a%10, Math.floor(d.b/100), Math.floor((d.b%100)/10), d.b%10, Math.floor(d.res/100), Math.floor((d.res%100)/10), d.res%10 ];
          return d.hidden.every((h:number) => parseInt(i[`gap-${h}`]||'0') === digits[h]);
      },
      getFieldOrder: (d) => d.hidden.map((h:number) => `gap-${h}`),
      render: (d, i, _s, _f, _a, c) => {
          const digits = [ Math.floor(d.a/100), Math.floor((d.a%100)/10), d.a%10, Math.floor(d.b/100), Math.floor((d.b%100)/10), d.b%10, Math.floor(d.res/100), Math.floor((d.res%100)/10), d.res%10 ];
          const isH = (idx:number) => d.hidden.includes(idx);
          const rD = (idx:number) => isH(idx) ? c(`gap-${idx}`, i[`gap-${idx}`], false, '', 'w-12 h-12 bg-yellow-50') : <div className="p-2 w-12 h-12 flex items-center justify-center">{digits[idx]||(idx===0||idx===3?'':'0')}</div>;
          
          return (
              <div className="flex flex-col items-center">
                  <h3 className="font-bold text-slate-500 mb-4">Ergänze die fehlenden Ziffern</h3>
                  <div className="bg-white p-4 border-2 rounded-xl shadow-inner grid grid-cols-4 gap-1 text-2xl font-mono text-center items-center">
                      <div></div>{rD(0)}{rD(1)}{rD(2)}
                      <div className="p-2">+</div>{rD(3)}{rD(4)}{rD(5)}
                      <div className="col-span-4 border-b-4 border-slate-800 my-1"></div>
                      <div></div>{rD(6)}{rD(7)}{rD(8)}
                  </div>
              </div>
          )
      }
  },
  written_error: {
      id: 'written_error', category: 'written_calc', isMultiInput: false,
      generate: () => {
          const errType = rand(0, 2);
          let a, b, res, wrongRes, bDisplayStr;
          
          if (errType === 2) {
              // Nicht stellengerecht
              a = rand(120, 350); 
              b = rand(11, 59); 
              res = a + b;
              wrongRes = a + b * 10;
              bDisplayStr = [Math.floor(b/10), b%10, ''];
          } else if (errType === 0) {
              // Übertrag vergessen
              let aE = rand(5, 9); let bE = rand(10-aE, 9);
              let aZ = rand(2, 8); let bZ = rand(0, 9-aZ);
              if (rand(0,1)===1) { 
                  aE = rand(1, 4); bE = rand(1, 9-aE);
                  aZ = rand(5, 9); bZ = rand(10-aZ, 9);
              }
              let aH = rand(1, 5); let bH = rand(1, 8-aH);
              
              a = aH*100 + aZ*10 + aE;
              b = bH*100 + bZ*10 + bE;
              res = a + b;
              
              const rE = (aE + bE) % 10;
              const rZ = (aZ + bZ) % 10;
              const rH = aH + bH;
              wrongRes = rH*100 + rZ*10 + rE;
              bDisplayStr = [Math.floor(b/100) || '', Math.floor((b%100)/10), b%10];
          } else {
              // Falsch addiert (Echter Rechenfehler! Offset z.B. +2 oder -3)
              a = rand(100, 700); 
              b = rand(10, 850-a); 
              res = a + b;
              const offset = rand(0,1) === 0 ? 2 : 3;
              const offsetPlace = rand(0,1) === 0 ? 1 : 10; // Fehler bei den Einern oder Zehnern
              wrongRes = res + (rand(0,1) === 0 ? offset * offsetPlace : -offset * offsetPlace);
              
              bDisplayStr = [Math.floor(b/100) || '', Math.floor((b%100)/10), b%10];
          }
          
          const options = [
              "Der Übertrag wurde vergessen (Verfahren).",
              "Es wurde sich verrechnet (Rechenfehler).",
              "Nicht stellengerecht untereinander geschrieben."
          ];
          
          return { a, b, bDisplayStr, wrongRes, ans: options[errType], mcOptions: options.slice().sort(()=>Math.random()-0.5) };
      },
      validate: (d, _, inp) => inp === d.ans,
      render: (d) => (
          <div className="flex flex-col items-center">
              <h3 className="font-bold text-slate-500 mb-4 text-center">Welcher Fehler wurde gemacht?</h3>
              <div className="bg-red-50 p-4 border-2 border-red-200 rounded-xl shadow-inner grid grid-cols-4 gap-1 text-2xl font-mono text-center items-center opacity-80 mb-6">
                  <div></div>
                  <div className="p-2">{Math.floor(d.a/100) || ''}</div>
                  <div className="p-2">{Math.floor((d.a%100)/10)}</div>
                  <div className="p-2">{d.a%10}</div>

                  <div className="p-2">+</div>
                  <div className="p-2">{d.bDisplayStr[0]}</div>
                  <div className="p-2">{d.bDisplayStr[1]}</div>
                  <div className="p-2">{d.bDisplayStr[2]}</div>

                  <div className="col-span-4 border-b-4 border-slate-800 my-1"></div>

                  <div></div>
                  <div className="p-1">{Math.floor(d.wrongRes/100) || ''}</div>
                  <div className="p-1">{Math.floor((d.wrongRes%100)/10)}</div>
                  <div className="p-1">{d.wrongRes%10}</div>
              </div>
          </div>
      )
  },
  written_fix_error: {
      id: 'written_fix_error', category: 'written_calc', isMultiInput: true,
      generate: () => {
          const a = rand(100, 700); const b = rand(10, 850-a);
          const wrongRes = a + b + (rand(0,1)===0 ? 10 : -10);
          return { a, b, wrongRes, res: a+b };
      },
      validate: (d, i) => {
          const rH = Math.floor(d.res/100); const rZ = Math.floor((d.res%100)/10); const rE = d.res%10;
          const cZ = Math.floor((d.a%10 + d.b%10)/10); const cH = Math.floor((d.a%100 + d.b%100)/100);
          return parseInt(i['re']||'0')===rE && parseInt(i['rz']||'0')===rZ && parseInt(i['rh']||'0')===rH && parseInt(i['ce']||'0')===cZ && parseInt(i['cz']||'0')===cH;
      },
      getFieldOrder: (d) => {
          const cZ = Math.floor((d.a%10 + d.b%10)/10); const cH = Math.floor((d.a%100 + d.b%100)/100);
          const fields = ['re'];
          if (cZ > 0) fields.push('ce');
          fields.push('rz');
          if (cH > 0) fields.push('cz');
          fields.push('rh');
          return fields;
      },
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center">
              <h3 className="font-bold text-slate-500 mb-4 text-center">Finde den Fehler und rechne richtig!</h3>
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="bg-red-50 p-3 border-2 border-red-200 rounded-xl opacity-80 grid grid-cols-4 gap-1 text-2xl font-mono text-center items-center">
                       <div></div><div className="p-1">{Math.floor(d.a/100)||''}</div><div className="p-1">{Math.floor((d.a%100)/10)}</div><div className="p-1">{d.a%10}</div>
                       <div className="p-1">+</div><div className="p-1">{Math.floor(d.b/100)||''}</div><div className="p-1">{Math.floor((d.b%100)/10)}</div><div className="p-1">{d.b%10}</div>
                       <div className="col-span-4 border-b-4 border-slate-800 my-1"></div>
                       <div></div>
                       <div className="p-1 text-red-600 line-through decoration-2">{Math.floor(d.wrongRes/100)||''}</div>
                       <div className="p-1 text-red-600 line-through decoration-2">{Math.floor((d.wrongRes%100)/10)}</div>
                       <div className="p-1 text-red-600 line-through decoration-2">{d.wrongRes%10}</div>
                  </div>
                  <ArrowRight className="text-slate-400 hidden sm:block" size={32} />
                  <ArrowDown className="text-slate-400 block sm:hidden" size={32} />
                  <div className="bg-white p-3 border-2 rounded-xl shadow-inner grid grid-cols-4 gap-1 text-2xl font-mono text-center items-center">
                       <div></div><div className="p-1">{Math.floor(d.a/100)||''}</div><div className="p-1">{Math.floor((d.a%100)/10)}</div><div className="p-1">{d.a%10}</div>
                       <div className="p-1">+</div><div className="p-1">{Math.floor(d.b/100)||''}</div><div className="p-1">{Math.floor((d.b%100)/10)}</div><div className="p-1">{d.b%10}</div>
                       <div></div>
                       <div className="p-1 flex justify-center">{c('cz', i['cz'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                       <div className="p-1 flex justify-center">{c('ce', i['ce'], false, '', 'w-8 h-8 text-sm bg-yellow-50')}</div>
                       <div></div>
                       <div className="col-span-4 border-b-4 border-slate-800 my-1"></div>
                       <div></div>
                       <div className="p-1 flex justify-center">{c('rh', i['rh'], false, '', 'w-12 h-12')}</div>
                       <div className="p-1 flex justify-center">{c('rz', i['rz'], false, '', 'w-12 h-12')}</div>
                       <div className="p-1 flex justify-center">{c('re', i['re'], false, '', 'w-12 h-12')}</div>
                  </div>
              </div>
          </div>
      )
  },

  // --- RECHNEN ---
  multiplication: {
    id: 'multiplication', category: 'calc', isMultiInput: false,
    generate: () => ({ a: rand(2,9), b: rand(2,9) }),
    validate: (d, _, inp) => parseInt(inp) === d.a * d.b,
    render: (d) => <div className="text-center text-5xl font-black text-slate-800 mb-8">{d.a} · {d.b} = ?</div>
  },
  division: {
    id: 'division', category: 'calc', isMultiInput: false,
    generate: () => { const div=rand(2,9); const res=rand(2,10); return { a: div*res, b: div, res }; },
    validate: (d, _, inp) => parseInt(inp) === d.res,
    render: (d) => <div className="text-center text-5xl font-black text-slate-800 mb-8">{d.a} : {d.b} = ?</div>
  },
  addition: {
    id: 'addition', category: 'calc', isMultiInput: true,
    generate: () => { const a=rand(15,75), b=rand(15,95-a); return { a, b, op: '+', res: a+b, split: Math.floor(b/10)*10, split2: b%10 }; },
    validate: (d, i) => parseInt(i['res']) === d.res,
    getFieldOrder: () => ['op1', 'res1', 'start2', 'op2', 'res2', 'res'],
    render: (d, _i, _s, _f, _a, c) => (
      <div className="flex flex-col items-center">
        <h3 className="font-bold text-slate-500 mb-2">Rechne schrittweise</h3>
        <div className="bg-white p-2 border-2 rounded-xl shadow-inner grid grid-cols-5 gap-0 bg-slate-50 text-xl font-mono">
           <div className="col-span-5 flex justify-center py-1 border-b-2 font-bold mb-1">{d.a} {d.op} {d.b} = {c('res', d.res, false, '', 'w-16 h-10 border-2 ml-2 inline-flex')}</div>
           <div className="flex justify-center items-center py-1">{d.a}</div><div className="flex justify-center items-center">{d.op}</div>{c('op1', d.split, false)}<div className="flex justify-center items-center">=</div>{c('res1', d.a+d.split, false)}
           {c('start2', d.a+d.split, false)}<div className="flex justify-center items-center">{d.op}</div>{c('op2', d.split2, false)}<div className="flex justify-center items-center">=</div>{c('res2', d.res, false)}
        </div>
      </div>
    )
  },
  subtraction: {
     id: 'subtraction', category: 'calc', isMultiInput: true,
     generate: () => { const a=rand(35,95), b=rand(15,a-10); return { a, b, op: '-', res: a-b, split: Math.floor(b/10)*10, split2: b%10 }; },
     validate: (d, i) => parseInt(i['res']) === d.res,
     getFieldOrder: () => ['op1', 'res1', 'start2', 'op2', 'res2', 'res'],
     render: (d, _i, _s, _f, _a, c) => TASKS['addition'].render(d, _i, _s, _f, _a, c)
  },
  addition_1000: {
    id: 'addition_1000', category: 'calc', isMultiInput: true,
    generate: () => { const a=rand(100,750), b=rand(120,950-a); return { a, b, res: a+b }; },
    validate: (d, i) => parseInt(i['res']) === d.res,
    getFieldOrder: () => ['res'],
    render: (d, _i, _s, _f, _a, c) => <div className="text-center text-4xl font-black text-slate-800 flex gap-4 items-center justify-center">{d.a} + {d.b} = {c('res', d.res, false, '', 'w-32 h-16 text-3xl')}</div>
  },
  subtraction_1000: {
    id: 'subtraction_1000', category: 'calc', isMultiInput: true,
    generate: () => { const a=rand(350,990), b=rand(120,a-100); return { a, b, res: a-b }; },
    validate: (d, i) => parseInt(i['res']) === d.res,
    getFieldOrder: () => ['res'],
    render: (d, _i, _s, _f, _a, c) => <div className="text-center text-4xl font-black text-slate-800 flex gap-4 items-center justify-center">{d.a} - {d.b} = {c('res', d.res, false, '', 'w-32 h-16 text-3xl')}</div>
  },
  pyramid: {
      id: 'pyramid', category: 'calc', isMultiInput: true,
      generate: () => { const b1=rand(1,10), b2=rand(1,10), b3=rand(1,10); const m1=b1+b2, m2=b2+b3, top=m1+m2; return { stones: [b1,b2,b3,m1,m2,top], given: rand(0,1)===0 ? [1,1,1,0,0,0] : [1,0,1,1,0,0] }; },
      validate: (d, i) => d.stones.every((v:number,k:number) => d.given[k] || parseInt(i[`stone-${k}`]) === v),
      getFieldOrder: (d) => d.stones.map((_:any,k:number)=>!d.given[k]?`stone-${k}`:null).filter(Boolean) as string[],
      render: (d, _i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center gap-1 mt-4">
              <div className="flex justify-center">{c('stone-5', d.stones[5], d.given[5], undefined, "w-20 h-14 border-2 rounded-lg")}</div>
              <div className="flex justify-center gap-1">{c('stone-3', d.stones[3], d.given[3], undefined, "w-20 h-14 border-2 rounded-lg")}{c('stone-4', d.stones[4], d.given[4], undefined, "w-20 h-14 border-2 rounded-lg")}</div>
              <div className="flex justify-center gap-1">{c('stone-0', d.stones[0], d.given[0], undefined, "w-20 h-14 border-2 rounded-lg")}{c('stone-1', d.stones[1], d.given[1], undefined, "w-20 h-14 border-2 rounded-lg")}{c('stone-2', d.stones[2], d.given[2], undefined, "w-20 h-14 border-2 rounded-lg")}</div>
          </div>
      )
  },
  calc_table: {
      id: 'calc_table', category: 'calc', isMultiInput: true,
      generate: () => { const isPlus=rand(0,1)===1; const base=rand(20,70); const ops=[rand(2,9), rand(10,15), rand(20,25)]; return { base, ops, isPlus }; },
      validate: (d, i) => d.ops.every((op:number, idx:number) => parseInt(i[`res-${idx}`]) === (d.isPlus ? d.base+op : d.base-op)),
      getFieldOrder: (d) => d.ops.map((_:any,idx:number)=>`res-${idx}`),
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center mt-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
             <div className="flex gap-2 mb-2">
                 <div className="w-16 h-12 flex items-center justify-center font-bold text-slate-500 bg-slate-100 rounded-lg">{d.isPlus?'+':'-'} {d.base}</div>
                 {d.ops.map((op:number, idx:number) => <div key={idx} className="w-16 h-12 flex items-center justify-center font-bold text-blue-600 bg-blue-50 rounded-lg border border-blue-100">{op}</div>)}
             </div>
             <div className="flex gap-2">
                 <div className="w-16 h-14 flex items-center justify-center font-bold text-2xl text-slate-400">=</div>
                 {d.ops.map((_op:number, idx:number) => c(`res-${idx}`, i[`res-${idx}`], false, undefined, "w-16 h-14 border-2 rounded-lg"))}
             </div>
          </div>
      )
  },
  fact_family: {
      id: 'fact_family', category: 'calc', isMultiInput: true,
      generate: () => { const a=rand(2,9), b=rand(2,9), prod=a*b; return { a, b, prod }; },
      validate: (_d, _i) => true, 
      getFieldOrder: () => [],
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col gap-2">
             <div className="text-center font-bold mb-2">Zahlen: {d.a}, {d.b}, {d.prod}</div>
             <div className="grid grid-cols-1 gap-2">
                 {[0,1,2,3].map(r => <div key={r} className="flex gap-1 items-center justify-center">{c(`ff-${r}-0`, i[`ff-${r}-0`], false)}{r<2?'·':':'}{c(`ff-${r}-1`, i[`ff-${r}-1`], false)}={c(`ff-${r}-2`, i[`ff-${r}-2`], false)}</div>)}
             </div>
          </div>
      )
  },
  triangle: {
      id: 'triangle', category: 'calc', isMultiInput: true,
      generate: () => { const t=rand(2,9), l=rand(2,9), r=rand(2,9); return { t, l, r }; },
      validate: (d, i) => parseInt(i['pl']) === d.t*d.l && parseInt(i['pr']) === d.t*d.r && parseInt(i['pb']) === d.l*d.r,
      getFieldOrder: () => ['pl', 'pr', 'pb'],
      render: (d, i, _s, _f, _a, c) => (
         <div className="relative w-64 h-56 mt-4 mx-auto">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 180"><polygon points="100,20 20,160 180,160" fill="none" stroke="#cbd5e1" strokeWidth="3" /></svg>
            <div className="absolute top-0 left-1/2 -translate-x-1/2">{c('t', d.t, true, undefined, "w-12 h-12 rounded-full border-2")}</div>
            <div className="absolute bottom-4 left-4">{c('l', d.l, true, undefined, "w-12 h-12 rounded-full border-2")}</div>
            <div className="absolute bottom-4 right-4">{c('r', d.r, true, undefined, "w-12 h-12 rounded-full border-2")}</div>
            <div className="absolute top-1/2 left-4 -translate-y-1/2">{c('pl', i['pl'], false, undefined, "w-14 h-10 bg-white border-2 rounded-lg")}</div>
            <div className="absolute top-1/2 right-4 -translate-y-1/2">{c('pr', i['pr'], false, undefined, "w-14 h-10 bg-white border-2 rounded-lg")}</div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">{c('pb', i['pb'], false, undefined, "w-14 h-10 bg-white border-2 rounded-lg")}</div>
         </div>
      )
  },
  triangle_add: {
      id: 'triangle_add', category: 'calc', isMultiInput: true,
      generate: () => { const t=rand(10,50), l=rand(10,50), r=rand(10,50); return { t, l, r }; },
      validate: (d, i) => parseInt(i['pl']) === d.t+d.l && parseInt(i['pr']) === d.t+d.r && parseInt(i['pb']) === d.l+d.r,
      getFieldOrder: () => ['pl', 'pr', 'pb'],
      render: (d, i, _s, _f, _a, c) => TASKS['triangle'].render(d, i, _s, _f, _a, c) 
  },
  calc_wheel: {
      id: 'calc_wheel', category: 'calc', isMultiInput: true,
      generate: () => { const op=rand(0,1)===0?'+':(rand(0,1)===0?'-':'·'); const c=rand(2,9); const segs=[]; for(let i=0;i<4;i++) segs.push({inner:rand(2,9), outer: op==='+'?c+rand(2,9):op==='-'?c-rand(1,c-1):c*rand(2,9)}); return { center:c, op, segments:segs }; },
      validate: (d, i) => d.segments.every((v:any,k:number)=> parseInt(i[`w-${k}`]) === (d.op==='+'?d.center+v.inner:d.op==='-'?d.center-v.inner:d.center*v.inner)),
      getFieldOrder: (_d) => [0,1,2,3].map(k=>`w-${k}`),
      render: (d, i, _s, _f, _a, c) => (
          <div className="relative w-64 h-64 mx-auto flex items-center justify-center">
             <div className="absolute z-10 w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center font-bold border-4 border-rose-300">{d.op}{d.center}</div>
             {d.segments.map((v:any,k:number)=>{
                 const ang=k*90; const rad=ang*Math.PI/180;
                 const ix=Math.cos(rad)*60, iy=Math.sin(rad)*60;
                 const ox=Math.cos(rad)*110, oy=Math.sin(rad)*110;
                 return (
                     <React.Fragment key={k}>
                         <div className="absolute" style={{transform:`translate(${ix}px,${iy}px)`}}>{c(`wi-${k}`, v.inner, true, undefined, "w-10 h-10 rounded-full border bg-white text-sm")}</div>
                         <div className="absolute" style={{transform:`translate(${ox}px,${oy}px)`}}>{c(`w-${k}`, i[`w-${k}`], false, undefined, "w-12 h-12 rounded-xl border-2")}</div>
                     </React.Fragment>
                 )
             })}
          </div>
      )
  },
  
  // --- ZAHLENRAUM & LOGIK ---
  logic_grid_colors: {
      id: 'logic_grid_colors', category: 'space', isMultiInput: true,
      generate: () => {
          const colors = [
              { n: '1', name: 'rot', bg: 'bg-red-500' }, { n: '2', name: 'blau', bg: 'bg-blue-500' },
              { n: '3', name: 'grün', bg: 'bg-green-500' }, { n: '4', name: 'gelb', bg: 'bg-yellow-400' },
              { n: '5', name: 'orange', bg: 'bg-orange-500' }, { n: '6', name: 'lila', bg: 'bg-purple-500' },
              { n: '7', name: 'braun', bg: 'bg-amber-800' }, { n: '8', name: 'schwarz', bg: 'bg-slate-800' },
              { n: '9', name: 'rosa', bg: 'bg-pink-400' }
          ];
          let grid = [...colors].sort(() => Math.random() - 0.5);
          const posNames = [
              "hinten links", "hinten in der Mitte", "hinten rechts",
              "in der Mitte links", "genau in der Mitte", "in der Mitte rechts",
              "vorn links", "vorn in der Mitte", "vorn rechts"
          ];
          let clues = grid.map((c, i) => `Die ${c.n} (${c.name}) ist ${posNames[i]}.`);
          clues = clues.sort(() => Math.random() - 0.5);
          return { grid, clues, colors };
      },
      validate: (d, i) => d.grid.every((c: any, idx: number) => i[`lg-${idx}`] === c.n),
      getFieldOrder: () => [0,1,2,3,4,5,6,7,8].map(i => `lg-${i}`),
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center w-full max-w-2xl px-2">
              <h3 className="font-bold text-slate-500 mb-4">Wo liegen die Farben im 3x3 Gitter?</h3>
              <div className="flex flex-col sm:flex-row gap-6 w-full items-start justify-center">
                  <div className="grid grid-cols-3 gap-2 p-4 bg-slate-200 rounded-2xl mx-auto shrink-0 border-4 border-slate-300">
                      {[0,1,2,3,4,5,6,7,8].map(idx => {
                          const val = i[`lg-${idx}`];
                          const colorObj = d.colors.find((col: any) => col.n === val);
                          const bgClass = colorObj ? colorObj.bg : 'bg-white';
                          const isDark = colorObj && ['8','7','2','1','6'].includes(colorObj.n);
                          return (
                              <div key={idx} className="relative">
                                  {c(`lg-${idx}`, val, false, '', `w-16 h-16 border-2 rounded-xl text-2xl font-bold shadow-sm ${bgClass} ${isDark ? 'text-white' : 'text-slate-800'}`)}
                              </div>
                          )
                      })}
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-xl shadow-sm border-2 border-yellow-200 text-sm sm:text-base text-slate-700 flex-1 space-y-2 font-medium">
                      {d.clues.map((clue: string, idx: number) => (
                          <div key={idx} className="flex gap-2">
                              <span className="text-yellow-600">•</span>
                              <span>{clue}</span>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )
  },
  grid_cutout: {
    id: 'grid_cutout', category: 'space', isMultiInput: true,
    generate: () => {
        const start = rand(101, 800);
        const shapes = [ [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:0,y:1},{x:0,y:2}], [{x:1,y:0},{x:1,y:1},{x:1,y:2},{x:0,y:1},{x:2,y:1}], [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:2,y:2}] ];
        const shape = shapes[rand(0, shapes.length-1)];
        const given = shape.map(() => rand(0, 10) > 6);
        if(given.every(g => !g)) given[0] = true;
        return { start, shape, given };
    },
    validate: (d, i) => d.shape.every((cell:any, idx:number) => d.given[idx] || parseInt(i[`gc-${idx}`]) === d.start + (cell.y * 10) + cell.x),
    getFieldOrder: (d) => d.shape.map((_:any, idx:number) => !d.given[idx] ? `gc-${idx}` : null).filter(Boolean) as string[],
    render: (d, _i, _s, _f, _a, c) => (
        <div className="relative w-64 h-64 mx-auto">
            {d.shape.map((cell:any, idx:number) => (
                <div key={idx} className="absolute" style={{left: cell.x*60, top: cell.y*60}}>
                    {c(`gc-${idx}`, d.start + (cell.y * 10) + cell.x, d.given[idx], undefined, "w-14 h-14 border-2 border-slate-800")}
                </div>
            ))}
        </div>
    )
  },
  arrow_path: {
      id: 'arrow_path', category: 'space', isMultiInput: true,
      generate: () => {
          const start = rand(100, 800);
          const moveTypes = []; let curr = start;
          for(let k=0; k<3; k++) {
              const m = rand(0,3); moveTypes.push(m);
              if(m===0) curr+=1; else if(m===1) curr-=1; else if(m===2) curr+=10; else curr-=10;
          }
          return { start, moveTypes, res: curr };
      },
      validate: (d, i) => parseInt(i['res']) === d.res,
      getFieldOrder: () => ['res'],
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center gap-4">
              <div className="text-3xl font-bold text-slate-700">{d.start}</div>
              <div className="flex gap-2 text-slate-500 bg-slate-100 p-2 rounded-xl">
                  {d.moveTypes.map((m:number, idx:number) => {
                      let Icon = ArrowRight; if(m===1) Icon = ArrowLeft; if(m===2) Icon = ArrowDown; if(m===3) Icon = ArrowUp;
                      return <div key={idx} className="p-1 bg-white rounded shadow-sm"><Icon size={24}/></div>
                  })}
              </div>
              <div className="text-2xl">=</div>
              {c('res', i['res'], false, 'Ziel', "w-24 h-16 text-2xl border-2")}
          </div>
      )
  },
  estimation: {
      id: 'estimation', category: 'calc', isMultiInput: true,
      generate: () => {
          const a = rand(100, 400); const b = rand(100, 400);
          const ra = Math.round(a/100)*100; const rb = Math.round(b/100)*100;
          return { a, b, ra, rb, res: ra+rb };
      },
      validate: (d, i) => parseInt(i['res']) === d.res,
      getFieldOrder: () => ['res'],
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center gap-4">
              <div className="text-lg font-bold text-slate-400">Überschlage:</div>
              <div className="text-3xl font-bold text-slate-700">{d.a} + {d.b}</div>
              <div className="text-xl text-slate-400">≈</div>
              <div className="flex gap-2 items-center text-xl text-slate-500">
                  <div>{d.ra}</div><div>+</div><div>{d.rb}</div><div>=</div>
                  {c('res', i['res'], false, '', "w-20 h-12 border-2")}
              </div>
          </div>
      )
  },
  rounding: {
      id: 'rounding', category: 'space', isMultiInput: false,
      generate: () => { const t=rand(0,1)===0?10:100; const v=rand(120,980); return { v, type: t, ans: Math.round(v/t)*t }; },
      validate: (d, _, inp) => parseInt(inp) === d.ans,
      render: (d) => <div className="text-center"><div className="text-sm font-bold uppercase text-slate-400 mb-2">Runde auf {d.type===10?'Zehner':'Hunderter'}</div><div className="text-5xl font-black text-slate-800 mb-8">{d.v} ≈ ?</div></div>
  },
  neighbors: {
      id: 'neighbors', category: 'space', isMultiInput: true,
      generate: () => { const c=rand(123,888); return { c, nhl: Math.floor(c/100)*100, nzl: Math.floor(c/10)*10, nhr: Math.floor(c/100)*100+100, nzr: Math.floor(c/10)*10+10 }; },
      validate: (d, i) => parseInt(i['nhl'])===d.nhl && parseInt(i['nzl'])===d.nzl && parseInt(i['v'])===d.c-1 && parseInt(i['n'])===d.c+1 && parseInt(i['nzr'])===d.nzr && parseInt(i['nhr'])===d.nhr,
      getFieldOrder: () => ['nhl', 'nzl', 'v', 'n', 'nzr', 'nhr'],
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col w-full items-center">
             <div className="flex items-end gap-1 overflow-x-auto p-2 w-full justify-center">
                 {c('nhl', i['nhl'], false, 'NH')} {c('nzl', i['nzl'], false, 'NZ')} {c('v', i['v'], false, 'V')}
                 {c('c', d.c, true, 'Zahl', 'bg-slate-100')}
                 {c('n', i['n'], false, 'N')} {c('nzr', i['nzr'], false, 'NZ')} {c('nhr', i['nhr'], false, 'NH')}
             </div>
          </div>
      )
  },
  sequences: {
      id: 'sequences', category: 'space', isMultiInput: true,
      generate: () => { const step=rand(2,8); const start=rand(10,80); return { nums: [0,1,2,3,4].map(k=>start+k*step), given: [1,0,0,0,1] }; },
      validate: (d, i) => d.nums.every((v:number,k:number)=> d.given[k] || parseInt(i[`seq-${k}`])===v),
      getFieldOrder: (_d) => [1,2,3].map(k=>`seq-${k}`),
      render: (d, _i, _s, _f, _a, c) => <div className="flex flex-wrap justify-center gap-2 mt-6">{d.nums.map((v:number,k:number)=>c(`seq-${k}`, v, d.given[k]))}</div>
  },
  chain: {
      id: 'chain', category: 'space', isMultiInput: true,
      generate: () => { const start=rand(10,50); const ops=[2,5,10,-5]; let cur=start; const chain=[start]; ops.forEach(o=>{cur+=o; chain.push(cur);}); return { start, ops, chain }; },
      validate: (d, i) => d.chain.every((v:number,k:number) => k===0 || parseInt(i[`c-${k}`]) === v),
      getFieldOrder: (_d) => [1,2,3,4].map(k=>`c-${k}`),
      render: (d, _i, _s, _f, _a, c) => (
          <div className="flex flex-wrap justify-center items-center gap-1">
             {d.chain.map((v:number, k:number) => (
                 <React.Fragment key={k}>
                     {k>0 && <div className="text-xs text-slate-400 font-bold">{d.ops[k-1]>0?`+${d.ops[k-1]}`:d.ops[k-1]} →</div>}
                     {c(`c-${k}`, v, k===0, undefined, "w-12 h-12 rounded-full border-2")}
                 </React.Fragment>
             ))}
          </div>
      )
  },
  place_value: {
      id: 'place_value', category: 'space', isMultiInput: false,
      generate: () => ({ h: rand(1,3), z: rand(1,9), e: rand(1,9) }),
      validate: (d, _, input) => parseInt(input) === (d.h*100 + d.z*10 + d.e),
      render: (d) => (
          <div className="flex flex-col items-center">
             <div className="flex items-end justify-center gap-4 mt-6">
                <div className="flex flex-wrap w-24 h-24 gap-1 content-start">{Array.from({length:d.h}).map((_,i)=><div key={i} className="w-16 h-16 bg-green-200 border-2 border-green-500 grid grid-cols-10 gap-px p-0.5">{Array.from({length:100}).map((_,k)=><div key={k} className="bg-green-400/30 rounded-[1px]"></div>)}</div>)}</div>
                <div className="flex gap-1">{Array.from({length:d.z}).map((_,i)=><div key={i} className="w-4 h-16 bg-blue-200 border-2 border-blue-500 flex flex-col gap-px p-px">{Array.from({length:10}).map((_,k)=><div key={k} className="flex-1 bg-blue-400/30 rounded-[1px]"></div>)}</div>)}</div>
                <div className="flex flex-wrap w-16 gap-1 content-end pb-1">{Array.from({length:d.e}).map((_,i)=><div key={i} className="w-4 h-4 bg-red-300 border-2 border-red-500 rounded-sm"></div>)}</div>
             </div>
          </div>
      )
  },

  // --- MONEY ---
  money_count: {
      id: 'money_count', category: 'money', isMultiInput: false,
      generate: () => {
         const notes=[500,1000,2000]; const coins=[1,2,5,10,20,50,100,200];
         const count=rand(3,6); const items=[]; let sum=0;
         for(let k=0;k<count;k++) { const isN=rand(0,10)>6; const val=isN?notes[rand(0,2)]:coins[rand(0,7)]; items.push({val,type:isN?'note':'coin'}); sum+=val; }
         items.sort((a,b)=>b.val-a.val);
         return { items, sum };
      },
      validate: (d, _, input) => Math.round(parseFloat(input.replace(',','.'))*100) === d.sum,
      render: (d) => (
          <div className="flex flex-col items-center gap-4">
             <div className="flex flex-wrap justify-center items-end gap-2 max-w-xs">
                {d.items.map((it:any,idx:number) => it.type==='note'?<Bill key={idx} value={it.val/100}/> : <Coin key={idx} value={it.val}/>)}
             </div>
             <div className="text-slate-400 text-sm">Betrag in Euro</div>
          </div>
      )
  },
  shopping: {
      id: 'shopping', category: 'money', isMultiInput: true,
      generate: () => {
          const products = [ { n: 'Brezel', p: 85, i: '🥨' }, { n: 'Stift', p: 150, i: '✏️' }, { n: 'Apfel', p: 60, i: '🍎' }, { n: 'Heft', p: 220, i: '📓' }, { n: 'Eis', p: 120, i: '🍦' } ];
          const p1 = products[rand(0, 4)]; let p2 = products[rand(0, 4)]; while(p1===p2) p2=products[rand(0,4)];
          const total = p1.p + p2.p;
          const wallet = total < 500 ? 500 : (total < 1000 ? 1000 : 2000);
          return { items: [p1, p2], wallet, total, change: wallet - total };
      },
      validate: (d, i) => Math.round(parseFloat((i['shop-total']||'0').replace(',','.'))*100) === d.total && Math.round(parseFloat((i['shop-change']||'0').replace(',','.'))*100) === d.change,
      getFieldOrder: () => ['shop-total', 'shop-change'],
      render: (d, i, _s, _f, _a, c) => (
          <div className="flex flex-col items-center gap-6 mt-4 w-full">
             <div className="flex gap-4">{d.items.map((it:any,idx:number)=><div key={idx} className="flex flex-col items-center bg-white p-2 rounded-xl shadow border"><div className="text-3xl">{it.i}</div><div className="font-bold text-slate-700">{it.n}</div><div className="text-slate-500">{(it.p/100).toFixed(2).replace('.',',')}€</div></div>)}</div>
             <div className="w-full bg-slate-50 p-3 rounded-xl border flex flex-col items-center">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">1. Summe</div>
                {c('shop-total', i['shop-total'], false, undefined, "w-40 h-12 bg-white border-2 rounded-lg text-xl")}
             </div>
             <div className="w-full bg-slate-50 p-3 rounded-xl border flex flex-col items-center relative mt-4">
                <div className="absolute -top-3 bg-white px-2 py-1 rounded border shadow-sm text-xs font-bold text-slate-500 flex gap-1">Gegeben: <Bill value={d.wallet/100}/></div>
                <div className="h-6"></div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">2. Rückgeld</div>
                {c('shop-change', i['shop-change'], false, undefined, "w-40 h-12 bg-white border-2 rounded-lg text-xl")}
             </div>
          </div>
      )
  },
  word_problem: {
      id: 'word_problem', category: 'money', isMultiInput: false,
      generate: () => {
         const p = [
            { t: "Linus baut 6 Türme. Jeder Turm hat 10 Klötze. Wie viele Klötze sind es insgesamt?", a: 60 },
            { t: "Im Blumenbeet wachsen 45 Astern und 36 Rosen. Wie viele Blumen sind es zusammen?", a: 81 },
            { t: "Monika hat 50€ gespart. Oma gibt ihr 11€. Dann kauft sie ein Bastelset für 24€. Wie viel Geld hat sie noch?", a: 37 },
            { t: "Von Tims Haus sind es 355 m bis zur Schule. Der Weg zum Schwimmbad ist für Tim noch 485 m länger. Wie weit ist es von Tims Haus bis zum Schwimmbad?", a: 840 },
            { t: "In der Schulbücherei stehen 247 Bücher im 1. Stock, 185 im 2. Stock und 231 im 3. Stock. Wie viele Bücher sind es zusammen?", a: 663 },
            { t: "Ein Bäcker backt morgens 450 Brötchen. Bis mittags verkauft er 320 davon. Am Nachmittag backt er noch einmal 150 frische Brötchen. Wie viele Brötchen hat er nun?", a: 280 }
         ];
         return p[rand(0, p.length-1)];
      },
      validate: (d, _, input) => parseInt(input) === d.a,
      render: (d) => <div className="text-xl font-medium text-slate-700 text-center max-w-lg leading-relaxed">{d.t}</div>
  }
};


// ==========================================
// 4. HAUPTKOMPONENTE (ENGINE)
// ==========================================

export default function App() {
  const [mode, setMode] = useState<string>('menu');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Game State
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [input, setInput] = useState<string>('');
  const [multiInputs, setMultiInputs] = useState<Record<string, string>>({});
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  
  const [feedback, setFeedback] = useState<FeedbackType>('none');
  const [stats, setStats] = useState({ q: 1, correct: 0 });
  const [isRoundOver, setIsRoundOver] = useState(false);

  // History Init
  const [history, setHistory] = useState<any[]>(() => {
    try { const s = localStorage.getItem('mathe-trainer-history'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  useEffect(() => { localStorage.setItem('mathe-trainer-history', JSON.stringify(history)); }, [history]);

  // Audio Unlock
  useEffect(() => {
    const unlock = () => { if(audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); };
    window.addEventListener('touchstart', unlock, { once: true });
    window.addEventListener('click', unlock, { once: true });
    return () => { window.removeEventListener('touchstart', unlock); window.removeEventListener('click', unlock); };
  }, []);

  // --- LOGIC ---

  const generateNewQuestion = (targetMode: string) => {
    const taskDef = TASKS[targetMode];
    if (taskDef) {
       const qData = taskDef.generate();
       setCurrentQuestion({ def: taskDef, data: qData });
       setInput('');
       setMultiInputs({});
       // Auto-Focus
       if (taskDef.isMultiInput && taskDef.getFieldOrder) {
           const fields = taskDef.getFieldOrder(qData, {});
           if (fields && fields.length > 0) setActiveCellId(fields[0]);
       } else {
           setActiveCellId(null);
       }
    }
    setFeedback('none');
  };

  const startRound = (m: string | Category) => {
    setStats({ q: 1, correct: 0 });
    setIsRoundOver(false);
    
    if (m === 'new_june23') {
        setActiveCategory('new_june23');
        const keys = ['written_sub', 'written_mixed_target'];
        const randomKey = keys[rand(0, keys.length - 1)];
        setMode(randomKey);
        generateNewQuestion(randomKey);
    } else if (m === 'new_june15') {
        setActiveCategory('new_june15');
        const keys = ['written_add', 'written_gap', 'written_error', 'written_fix_error', 'logic_grid_colors', 'word_problem'];
        const randomKey = keys[rand(0, keys.length - 1)];
        setMode(randomKey);
        generateNewQuestion(randomKey);
    } else if (m === 'calc' || m === 'space' || m === 'money' || m === 'written_calc' || m === 'mixed') {
        setActiveCategory(m as Category);
        const keys = Object.keys(TASKS).filter(k => m === 'mixed' || TASKS[k].category === m);
        const randomKey = keys[rand(0, keys.length - 1)];
        setMode(randomKey);
        generateNewQuestion(randomKey);
    } else {
        setActiveCategory(null);
        setMode(m);
        generateNewQuestion(m);
    }
  };

  const handleNext = () => {
      if (stats.q >= QUESTIONS_PER_ROUND) {
          setIsRoundOver(true);
          const entry = { id: Date.now().toString(), timestamp: new Date().toLocaleString(), mode: activeCategory || mode, score: stats.correct, total: QUESTIONS_PER_ROUND, avgTime: 0 };
          setHistory(p => [entry, ...p].slice(0, 20));
      } else {
          setStats(p => ({ ...p, q: p.q + 1 }));
          if (activeCategory === 'new_june23') {
              const keys = ['written_sub', 'written_mixed_target'];
              const nextMode = keys[rand(0, keys.length - 1)];
              setMode(nextMode);
              generateNewQuestion(nextMode);
          } else if (activeCategory === 'new_june15') {
              const keys = ['written_add', 'written_gap', 'written_error', 'written_fix_error', 'logic_grid_colors', 'word_problem'];
              const nextMode = keys[rand(0, keys.length - 1)];
              setMode(nextMode);
              generateNewQuestion(nextMode);
          } else if (activeCategory) {
              const keys = Object.keys(TASKS).filter(k => activeCategory === 'mixed' || TASKS[k].category === activeCategory);
              const nextMode = keys[rand(0, keys.length - 1)];
              setMode(nextMode);
              generateNewQuestion(nextMode);
          } else {
              generateNewQuestion(mode);
          }
      }
  };

  const handleInput = (val: string, id: string | null) => {
      if (feedback !== 'none') return;
      
      // Für Fehlersuche: Text (Multiple Choice)
      if (mode === "written_error") {
          setInput(val);
          return;
      }
      
      const clean = val.replace(/[^0-9,]/g, '');
      if (id) setMultiInputs(p => ({ ...p, [id]: clean }));
      else setInput(clean);
  };

  const handleNumpad = (char: string) => {
      if (feedback !== 'none') return;
      let val = activeCellId ? multiInputs[activeCellId] || '' : input;
      
      if (char === 'DEL') val = val.slice(0, -1);
      else if (char === ',' && !val.includes(',')) val += ',';
      else if (char !== ',' && val.length < 6) val += char;
      
      handleInput(val, activeCellId);
      playSound('click', soundEnabled);
  };

  const check = (overrideInput?: string) => {
      if (!currentQuestion) return;
      const { def, data } = currentQuestion;
      
      const valToCheck = typeof overrideInput === 'string' ? overrideInput : input;
      
      const isCorrect = def.validate(data, multiInputs, valToCheck);
      if (isCorrect) {
          setFeedback('correct');
          playSound('correct', soundEnabled);
          setStats(s => ({ ...s, correct: s.correct + 1 }));
          setTimeout(handleNext, 1500);
      } else {
          setFeedback('wrong');
          playSound('wrong', soundEnabled);
      }
  };

  const handleEnter = () => {
      if (feedback !== 'none') return;
      if (!currentQuestion) return;
      const { def, data } = currentQuestion;
      if (def.isMultiInput && def.getFieldOrder) {
          const fields = def.getFieldOrder(data, multiInputs) || [];
          const nextEmpty = fields.find((id: string) => !multiInputs[id]);
          if (nextEmpty) {
              setActiveCellId(nextEmpty);
              return;
          }
      }
      check();
  };

  // --- RENDERER HELPER ---
  const renderCell = (id: string, val: any, isGiven: boolean, label?: string, style?: string) => {
      const active = activeCellId === id;
      const wrong = feedback === 'wrong' && !isGiven && multiInputs[id] != val;
      const correct = feedback === 'correct' && !isGiven;
      
      const hasCustomBg = style?.includes('bg-');
      const defaultBg = isGiven ? 'bg-slate-100 text-slate-500 border-slate-300' : active ? 'bg-white border-blue-500 ring-4 ring-blue-100 z-10' : 'bg-white border-slate-300';
      const finalBgClass = hasCustomBg ? (active ? 'border-blue-500 ring-4 ring-blue-300 z-10' : 'border-slate-300') : defaultBg;

      return (
          <div className="flex flex-col items-center">
              {label && <span className="text-[10px] uppercase font-bold text-slate-400 mb-1">{label}</span>}
              <div 
                onClick={() => !isGiven && feedback === 'none' && setActiveCellId(id)}
                className={`flex items-center justify-center font-bold text-xl relative transition-all cursor-pointer shadow-sm
                    ${style || 'w-14 h-14 rounded-xl border-2'}
                    ${finalBgClass}
                    ${wrong && !hasCustomBg ? 'bg-red-50 border-red-400 text-red-600' : ''}
                    ${wrong && hasCustomBg ? 'border-red-500 ring-4 ring-red-400' : ''}
                    ${correct && !hasCustomBg ? 'bg-green-50 border-green-500 text-green-700' : ''}
                    ${correct && hasCustomBg ? 'border-green-400 ring-4 ring-green-300 scale-105' : ''}
                `}
              >
                  {isGiven ? val : <input type="text" inputMode="none" value={multiInputs[id] || ''} onChange={(e) => handleInput(e.target.value, id)} onFocus={() => feedback==='none' && setActiveCellId(id)} className="w-full h-full text-center bg-transparent outline-none p-0"/>}
              </div>
          </div>
      );
  };

  // --- VIEW ---

  if (mode === 'menu') {
      return (
          <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center justify-center font-sans">
             <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-2xl relative">
                 <button onClick={() => setSoundEnabled(!soundEnabled)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">{soundEnabled ? <Volume2/> : <VolumeX/>}</button>
                 <h1 className="text-3xl font-extrabold text-slate-800 text-center mb-6">Mathe Profi</h1>
                 <div className="space-y-4">
                     
                     <CategorySection 
                        title="23. Juni NEU" 
                        cat="new_june23" 
                        modes={['written_sub', 'written_mixed_target']} 
                        onStart={startRound} 
                        highlight={true}
                        icon={<Sparkles size={16} className="text-indigo-500" />}
                     />
                     
                     <CategorySection 
                        title="15. Juni" 
                        cat="new_june15" 
                        modes={['written_add', 'written_gap', 'written_error', 'written_fix_error', 'logic_grid_colors', 'word_problem']} 
                        onStart={startRound} 
                     />
                     
                     <CategorySection title="Kopfrechnen" cat="calc" modes={['multiplication', 'division', 'addition', 'subtraction', 'addition_1000', 'subtraction_1000', 'pyramid', 'calc_table', 'fact_family', 'triangle', 'triangle_add', 'calc_wheel', 'estimation']} onStart={startRound} />
                     <CategorySection title="Zahlenraum & Logik" cat="space" modes={['grid_cutout', 'arrow_path', 'neighbors', 'sequences', 'chain', 'number_line', 'symbols', 'shapes', 'place_value', 'sorting', 'rounding']} onStart={startRound} />
                     <CategorySection title="Geld & Sachaufgaben" cat="money" modes={['money_count', 'shopping']} onStart={startRound} />
                     <div className="grid grid-cols-2 gap-3 mt-6">
                        <button onClick={() => startRound('mixed')} className="bg-slate-800 text-white font-bold py-3 rounded-2xl shadow flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors"><Zap size={18}/> Mix</button>
                        <button onClick={() => setMode('history')} className="bg-white text-slate-500 font-bold py-3 rounded-2xl border-2 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"><History size={18}/> Verlauf</button>
                     </div>
                 </div>
             </div>
          </div>
      );
  }

  // --- HISTORY VIEW ---
  if (mode === 'history') {
      return (
          <div className="min-h-screen bg-slate-100 p-4 flex flex-col items-center justify-center font-sans">
             <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-2xl relative">
                 <button onClick={() => setMode('menu')} className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"><Home/></button>
                 <h1 className="text-3xl font-extrabold text-slate-800 text-center mb-6 mt-2">Dein Verlauf</h1>
                 
                 {history.length === 0 ? (
                    <div className="text-center text-slate-500 py-10 italic">Noch keine Runden gespielt.</div>
                 ) : (
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                       {history.map((entry, idx) => (
                           <div key={idx} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                               <div>
                                   <div className="font-bold text-slate-700 capitalize text-lg">{entry.mode.replace(/_/g, ' ')}</div>
                                   <div className="text-xs text-slate-400">{entry.timestamp}</div>
                               </div>
                               <div className="flex items-center gap-2 font-bold text-xl">
                                   <Star className="text-yellow-400 fill-current" size={20} />
                                   <span className="text-slate-800">{entry.score} <span className="text-sm text-slate-400">/ {entry.total}</span></span>
                               </div>
                           </div>
                       ))}
                    </div>
                 )}
                 <button onClick={() => setMode('menu')} className="mt-6 w-full bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-slate-700 transition-colors">Zurück zum Menü</button>
             </div>
          </div>
      )
  }

  if (isRoundOver) {
      return (
          <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center font-sans">
              <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center">
                  <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-slate-800 mb-2">Fertig!</h2>
                  <div className="text-5xl font-black text-slate-800 mb-8">{stats.correct} <span className="text-2xl text-slate-400">/ {QUESTIONS_PER_ROUND}</span></div>
                  <button onClick={() => setMode('menu')} className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-600 transition-colors">Zum Menü</button>
              </div>
          </div>
      )
  }

  const taskDef = TASKS[mode];
  const qData = currentQuestion?.data;
  
  return (
      <div className="min-h-screen bg-slate-100 flex flex-col p-4 font-sans safe-area-inset">
          <div className="flex justify-between items-center mb-6">
              <button onClick={() => setMode('menu')} className="bg-white p-3 rounded-xl shadow text-slate-500 hover:text-slate-700 transition-colors"><Home/></button>
              <div className="flex flex-col items-center">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold text-white mb-1 ${getModeInfo(mode)?.color || 'bg-slate-500'}`}>{getModeInfo(mode)?.name}</div>
                  <div className="text-xl font-black text-slate-700">{stats.q} <span className="text-slate-400">/ {QUESTIONS_PER_ROUND}</span></div>
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setSoundEnabled(!soundEnabled)} className="bg-white p-2 rounded-xl shadow text-slate-400 hover:text-slate-600 transition-colors">{soundEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}</button>
                 <div className="bg-white px-3 py-2 rounded-xl shadow flex items-center gap-2"><Star className="text-yellow-400 fill-current" size={20}/><span className="font-bold text-slate-700">{stats.correct}</span></div>
              </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
             <div className={`flex-1 bg-white rounded-3xl shadow-lg p-4 flex flex-col items-center justify-center mb-6 lg:mb-0 relative overflow-hidden transition-all ${feedback==='correct'?'ring-4 ring-green-200':feedback==='wrong'?'ring-4 ring-red-200':''}`}>
                
                {/* Dynamisches Rendern über das Modul-System oder Fallback für Standard-Eingabe */}
                {currentQuestion && taskDef && !qData.mcOptions && !taskDef.isMultiInput && mode !== "money_count" && mode !== "word_problem" && (
                    <div className="text-center">
                        <div className="w-full mb-6 flex justify-center text-center">
                            {taskDef.render ? taskDef.render(currentQuestion.data, multiInputs, input, feedback, activeCellId, renderCell, handleInput) : (typeof currentQuestion.data.text === "string" ? (<div className="text-2xl sm:text-5xl font-extrabold text-slate-800">{currentQuestion.data.text}</div>) : (currentQuestion.data.text))}
                        </div>
                        <div className={`w-64 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-5xl font-mono font-bold tracking-widest border-4 transition-colors ${feedback === "none" ? "border-slate-200" : feedback === "correct" ? "border-green-500 text-green-600 bg-white" : "border-red-500 text-red-600 bg-white"}`}>
                            <input type="text" inputMode="none" value={input} onChange={(e) => handleInput(e.target.value, null)} className="w-full h-full text-center bg-transparent outline-none" />
                        </div>
                    </div>
                )}
                
                {currentQuestion && taskDef && (taskDef.isMultiInput || qData.mcOptions || mode === "money_count" || mode === "word_problem") && (
                    taskDef.render(currentQuestion.data, multiInputs, input, feedback, activeCellId, renderCell, handleInput)
                )}
                
                {/* Multiple Choice Rendering */}
                {currentQuestion?.data.mcOptions && (
                    <div className="grid grid-cols-1 gap-3 w-full max-w-md mt-4">
                        {currentQuestion.data.mcOptions.map((opt: string, idx: number) => (
                            <button 
                                key={idx} 
                                onClick={() => { handleInput(opt, null); check(opt); }}
                                disabled={feedback !== "none"}
                                className={`py-4 px-2 rounded-xl text-lg font-bold shadow-sm border-2 transition-all ${
                                    feedback === "none" ? "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 active:scale-95" 
                                    : opt === currentQuestion.data.ans && feedback === "wrong" ? "bg-green-100 text-green-700 border-green-400 animate-pulse"
                                    : input === opt && feedback === "wrong" ? "bg-red-100 text-red-600 border-red-300"
                                    : opt === currentQuestion.data.ans && feedback === "correct" ? "bg-green-500 text-white border-green-700 scale-105 shadow-lg"
                                    : "bg-slate-50 text-slate-400 border-slate-200 opacity-50"
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}
                
                {feedback === 'correct' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-green-50/90 backdrop-blur-sm z-50 animate-in fade-in zoom-in">
                        <CheckCircle className="w-32 h-32 text-green-500 drop-shadow-xl" />
                    </div>
                )}
             </div>
             
             <div className="hidden lg:block w-1/3 min-h-[300px]">
                 <ScratchPad clearTrigger={stats.q} />
             </div>
          </div>

          {/* NumPad oder "Weiter" */}
          <div className="grid grid-cols-3 gap-3 h-64 shrink-0 mt-4 lg:mt-0">
             {feedback === 'wrong' ? (
                 <button onClick={handleNext} className="col-span-3 bg-blue-500 text-white text-xl font-bold rounded-2xl shadow-[0_4px_0_0_rgba(37,99,235,0.4)] border-b-4 border-blue-700 active:border-0 active:shadow-none active:translate-y-1 flex items-center justify-center gap-1 mt-1 py-3 transition-all hover:bg-blue-600">Weiter <ArrowRight size={20}/></button>
             ) : currentQuestion?.data.mcOptions ? (
                 <div className="col-span-3 flex items-center justify-center text-slate-400 italic bg-white/50 rounded-2xl border-2 border-dashed border-slate-300">Bitte wähle eine Antwort.</div>
             ) : (
                 <>
                     {[1,2,3,4,5,6,7,8,9].map(n => (
                         <button key={n} onClick={() => handleNumpad(n.toString())} className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.1)] active:shadow-none active:translate-y-1 border-b-4 border-slate-200 active:border-0 transition-all hover:bg-slate-50">{n}</button>
                     ))}
                     <button onClick={() => handleNumpad('DEL')} className="bg-red-50 text-red-500 text-2xl font-bold rounded-2xl shadow-[0_4px_0_0_rgba(239,68,68,0.2)] border-b-4 border-red-100 active:border-0 active:shadow-none active:translate-y-1 flex items-center justify-center transition-all hover:bg-red-100">⌫</button>
                     <button onClick={() => handleNumpad('0')} className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow-[0_4px_0_0_rgba(0,0,0,0.1)] border-b-4 border-slate-200 active:border-0 active:shadow-none active:translate-y-1 transition-all hover:bg-slate-50">0</button>
                     
                     {(taskDef?.id === 'money_count' || taskDef?.id === 'shopping') && feedback === 'none' ? (
                         <>
                            <button onClick={() => handleNumpad(',')} className="bg-slate-100 text-slate-600 text-2xl font-bold rounded-2xl shadow border-b-4 border-slate-300 active:border-0 active:translate-y-1 transition-all hover:bg-slate-200">,</button>
                            <button onClick={handleEnter} className="col-span-2 bg-green-500 text-white text-xl font-bold rounded-2xl shadow-[0_4px_0_0_rgba(22,163,74,0.4)] border-b-4 border-green-700 active:border-0 active:shadow-none active:translate-y-1 transition-all hover:bg-green-600">Fertig</button>
                         </>
                     ) : (
                         <button onClick={handleEnter} className="bg-green-500 text-white text-xl font-bold rounded-2xl shadow-[0_4px_0_0_rgba(22,163,74,0.4)] border-b-4 border-green-700 active:border-0 active:shadow-none active:translate-y-1 transition-all hover:bg-green-600">
                            {taskDef?.isMultiInput ? 'Fertig' : 'OK'}
                         </button>
                     )}
                 </>
             )}
          </div>
      </div>
  );
}