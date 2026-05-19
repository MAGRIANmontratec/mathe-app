import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  ArrowRight,
  Trophy,
  Home,
  Volume2,
  VolumeX,
  Pyramid,
  ShoppingBag,
  Box,
  BookOpen,
  Layers,
  Calculator,
  Trash2,
  Scale,
  Coins,
  Divide,
  RefreshCw,
  Banknote,
  HelpCircle,
  History,
  X,
  CalendarDays,
  Clock,
  Settings,
  Ruler,
  Brain,
  Eye,
} from "lucide-react";

// --- KONFIGURATION ---
const QUESTIONS_PER_ROUND = 10;
const OFFLINE_READY_KEY = "mathe_offline_ready";

// --- TYPEN ---
type Category = "calc" | "money" | "mixed" | "grade3";

type GameMode =
  | "menu"
  | "history"
  // KATEGORIE: RECHNEN
  | "multiplication"
  | "division"
  | "addition"
  | "subtraction"
  | "addition_1000"
  | "subtraction_1000"
  | "gap_add"
  | "gap_sub"
  | "division_remainder"
  | "inverse_calc"
  | "pyramid"
  | "estimation"
  // KATEGORIE: GELD & SACH
  | "money_count"
  | "money_calc"
  | "money_pay"
  | "shopping"
  | "word_problem"
  // KATEGORIE: KLASSE 3 (Erweitert nach Buchvorlage)
  | "cube_buildings"
  | "geometry_shapes"
  | "geometry_riddles"
  | "units_length"
  | "units_weight"
  | "compare_units"
  | "realistic_sizes"
  | "word_problem_units";

type FeedbackType = "none" | "correct" | "wrong";

interface AppSettings {
  difficulty: 1 | 2 | 3;
  cubeGridSize: "random" | "2x4" | "3x3" | "3x4" | "4x4";
  activeShapes: string[];
}

// Datenstrukturen
interface GridCell {
  id: string;
  val: number | string;
  isGiven: boolean;
  label?: string;
}

interface StepData {
  start: number;
  operator: "+" | "-";
  operand: number;
  result: number;
  steps: { val: number; res: number }[];
}

interface ShoppingData {
  items: { name: string; price: number; icon: string }[];
  wallet: number;
  total: number;
  change: number;
}

interface EstimationData {
  a: number;
  b: number;
  roundedA: number;
  roundedB: number;
  estResult: number;
  op: "+" | "-";
}

interface Question {
  text: string | React.ReactNode;
  answer: number | string; // Erweitert für Text-Antworten (>, <, =, MC)
  helpText?: string;
  isCompare?: boolean; // Aktiviert die <, =, > Tastatur
  mcOptions?: string[]; // Aktiviert Multiple Choice Buttons
  gridData?: {
    cells: GridCell[];
    type: "pyramid" | "cube_plan";
    meta?: any;
  };
  stepData?: StepData;
  shoppingData?: ShoppingData;
  divisionData?: {
    dividend: number;
    divisor: number;
    quotient: number;
    remainder: number;
  };
  inverseData?: { a: number; b: number; add: number; result: number };
  estimationData?: EstimationData;
  payData?: { target: number };
  isDecimal?: boolean;
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  mode: string;
  score: number;
  total: number;
  avgTime: number;
}

interface ModeInfo {
  name: string;
  icon: string | React.ReactNode;
  color: string;
  border: string;
  isNew?: boolean;
}

// --- HELPER FUNCTIONS ---
const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const playSound = (type: "correct" | "wrong" | "click", enabled: boolean) => {
  if (!enabled) return;
  const AudioContext =
    window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;
  if (type === "click") {
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
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start();
    osc.stop(now + 0.4);
  }
};

const getModeInfo = (m: string): ModeInfo => {
  switch (m) {
    case "multiplication": return { name: "1x1", icon: "✖️", color: "bg-blue-500", border: "border-blue-700" };
    case "division": return { name: "Geteilt", icon: "➗", color: "bg-emerald-500", border: "border-emerald-700" };
    case "division_remainder": return { name: "Rest", icon: <Divide size={20} />, color: "bg-emerald-600", border: "border-emerald-800" };
    case "inverse_calc": return { name: "Probe", icon: <RefreshCw size={20} />, color: "bg-blue-600", border: "border-blue-800" };
    case "addition": return { name: "Plus", icon: "➕", color: "bg-orange-500", border: "border-orange-700" };
    case "subtraction": return { name: "Minus", icon: "➖", color: "bg-red-500", border: "border-red-700" };
    case "gap_add": return { name: "Lücken +", icon: "❓", color: "bg-amber-500", border: "border-amber-700" };
    case "gap_sub": return { name: "Lücken -", icon: "❓", color: "bg-rose-500", border: "border-rose-700" };
    case "addition_1000": return { name: "Plus 1000", icon: <Calculator size={20} />, color: "bg-orange-600", border: "border-orange-800" };
    case "subtraction_1000": return { name: "Minus 1000", icon: <Calculator size={20} />, color: "bg-red-600", border: "border-red-800" };
    case "estimation": return { name: "Überschlag", icon: <Scale size={20} />, color: "bg-purple-600", border: "border-purple-800" };
    case "pyramid": return { name: "Mauer", icon: <Pyramid size={20} />, color: "bg-indigo-500", border: "border-indigo-700" };
    case "money_count": return { name: "Zählen", icon: "💰", color: "bg-yellow-500", border: "border-yellow-700" };
    case "money_calc": return { name: "Rechnen €", icon: <Coins size={20} />, color: "bg-emerald-600", border: "border-emerald-800" };
    case "money_pay": return { name: "Bezahlen", icon: <Banknote size={20} />, color: "bg-green-600", border: "border-green-800" };
    case "shopping": return { name: "Einkaufen", icon: <ShoppingBag size={20} />, color: "bg-rose-500", border: "border-rose-700" };
    case "word_problem": return { name: "Lesen", icon: <BookOpen size={20} />, color: "bg-amber-500", border: "border-amber-700" };
    
    // KATEGORIEN KLASSE 3 (Erweitert)
    case "cube_buildings": return { name: "Baupläne", icon: <Box size={20} />, color: "bg-orange-600", border: "border-orange-800" };
    case "geometry_shapes": return { name: "Körper", icon: "🧊", color: "bg-indigo-600", border: "border-indigo-800" };
    case "geometry_riddles": return { name: "Rätsel", icon: <Brain size={20} />, color: "bg-purple-600", border: "border-purple-800", isNew: true };
    case "units_length": return { name: "Längen", icon: <Ruler size={20} />, color: "bg-emerald-600", border: "border-emerald-800" };
    case "units_weight": return { name: "Gewicht", icon: <Scale size={20} />, color: "bg-rose-600", border: "border-rose-800" };
    case "compare_units": return { name: "Vergleich (<=>)", icon: <Eye size={20} />, color: "bg-sky-600", border: "border-sky-800", isNew: true };
    case "realistic_sizes": return { name: "Im Alltag", icon: "📏", color: "bg-teal-600", border: "border-teal-800", isNew: true };
    case "word_problem_units": return { name: "Sachrechnen", icon: <BookOpen size={20} />, color: "bg-cyan-600", border: "border-cyan-800" };

    case "mixed": return { name: "Gemischt", icon: <Layers size={20} />, color: "bg-slate-800", border: "border-slate-900" };

    default: return { name: m, icon: "🎮", color: "bg-slate-500", border: "border-slate-700" };
  }
};

// --- SUB-COMPONENTS ---

const PerfectScoreAnimation = () => {
  const [effect] = useState(() => {
    const effects = ["confetti", "fireworks", "balloons", "unicorns"];
    return effects[Math.floor(Math.random() * effects.length)];
  });

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      <style>
        {`
          @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0; } }
          @keyframes pop { 0% { transform: scale(0); opacity: 1; } 50% { opacity: 1; } 100% { transform: scale(2); opacity: 0; } }
          @keyframes floatUp { 0% { transform: translateY(110vh) translateX(0); opacity: 1; } 100% { transform: translateY(-10vh) translateX(30px); opacity: 0; } }
        `}
      </style>
      {effect === "confetti" && Array.from({ length: 80 }).map((_, i) => ( <div key={`confetti-${i}`} className="absolute w-3 h-3 rounded-sm" style={{ left: `${Math.random() * 100}%`, top: '-5%', backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)], animation: `fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite` }} /> ))}
      {effect === "fireworks" && Array.from({ length: 12 }).map((_, i) => ( <div key={`fireworks-${i}`} className="absolute" style={{ left: `${10 + Math.random() * 80}%`, top: `${10 + Math.random() * 60}%`, animation: `pop ${1 + Math.random()}s ease-out ${Math.random() * 2}s infinite` }}> <div className="w-16 h-16 rounded-full border-4 border-dashed" style={{ borderColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][Math.floor(Math.random() * 5)] }} /> </div> ))}
      {effect === "balloons" && Array.from({ length: 25 }).map((_, i) => ( <div key={`balloons-${i}`} className="absolute text-5xl drop-shadow-md" style={{ left: `${Math.random() * 100}%`, animation: `floatUp ${4 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite` }}> {['🎈', '🎈', '🎈'][Math.floor(Math.random() * 3)]} </div> ))}
      {effect === "unicorns" && Array.from({ length: 20 }).map((_, i) => ( <div key={`unicorns-${i}`} className="absolute text-5xl drop-shadow-md" style={{ left: `${Math.random() * 100}%`, animation: `floatUp ${3 + Math.random() * 3}s ease-in-out ${Math.random() * 2}s infinite` }}> {['🦄', '🌈', '✨', '💖'][Math.floor(Math.random() * 4)]} </div> ))}
    </div>
  );
};

const Coin = ({ value, size = "md", onClick, selected }: { value: number; size?: "sm" | "md"; onClick?: () => void; selected?: boolean; }) => {
  let sizeClass = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 sm:w-14 sm:h-14 text-sm sm:text-base";
  let bg = "bg-amber-700"; let text = "text-white"; let border = "border-amber-900"; let content = `${value}`; let unit = <span className="opacity-80 ml-0.5">ct</span>;
  if (value >= 10 && value <= 50) { bg = "bg-yellow-500"; text = "text-yellow-900"; border = "border-yellow-700"; if (value === 50 && size !== "sm") sizeClass = "w-12 h-12 sm:w-16 sm:h-16"; } 
  else if (value >= 100) { bg = "bg-slate-300 ring-2 ring-yellow-500"; text = "text-slate-800"; border = "border-slate-500"; sizeClass = size === "sm" ? "w-10 h-10" : "w-12 h-12 sm:w-16 sm:h-16"; content = value === 100 ? "1" : "2"; unit = <span className="ml-0.5">€</span>; }
  return ( <div onClick={onClick} className={`${sizeClass} ${bg} rounded-full flex items-center justify-center font-bold shadow-md border-b-2 sm:border-b-4 ${border} ${text} shrink-0 ${onClick ? "cursor-pointer active:scale-95" : ""} ${selected ? "ring-4 ring-blue-400 scale-110" : ""}`}>{content}{unit}</div> );
};

const Bill = ({ value, size = "md", onClick, selected }: { value: number; size?: "sm" | "md"; onClick?: () => void; selected?: boolean; }) => {
  let color = "bg-slate-400";
  if (value === 5) color = "bg-neutral-400 text-neutral-800 border-neutral-500";
  if (value === 10) color = "bg-red-400 text-red-900 border-red-600";
  if (value === 20) color = "bg-blue-400 text-blue-900 border-blue-600";
  if (value === 50) color = "bg-orange-400 text-orange-900 border-orange-600";
  const dim = size === "sm" ? "w-16 h-8 text-sm" : "w-24 h-12 sm:w-32 sm:h-16 text-lg sm:text-2xl";
  return (
    <div onClick={onClick} className={`${color} ${dim} rounded-sm border-b-2 sm:border-b-4 shadow-lg flex items-center justify-between px-2 sm:px-3 font-bold relative overflow-hidden transform hover:-rotate-1 transition-transform ${onClick ? "cursor-pointer active:scale-95" : ""} ${selected ? "ring-4 ring-blue-400 scale-105" : ""}`}>
      <div className="flex flex-col leading-none"><span className="text-[6px] sm:text-[8px] opacity-70 uppercase tracking-widest">Euro</span><span>{value}</span></div>
      <div className="text-xl sm:text-4xl opacity-20 absolute right-2 top-1">€</div>
    </div>
  );
};

const ScratchPad = ({ clearTrigger }: { clearTrigger: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color] = useState("#334155");

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { const parent = canvas.parentElement; if (parent) { canvas.width = parent.clientWidth; canvas.height = parent.clientHeight; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = color; } };
    resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize);
  }, [color]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) { const ctx = canvas.getContext("2d"); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }, [clearTrigger]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => { setIsDrawing(true); draw(e); };
  const stopDrawing = () => { setIsDrawing(false); const canvas = canvasRef.current; const ctx = canvas?.getContext("2d"); if (ctx) ctx.beginPath(); };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect(); let clientX, clientY;
    if ("touches" in e) { clientX = e.touches[0].clientX; clientY = e.touches[0].clientY; } else { clientX = (e as React.MouseEvent).clientX; clientY = (e as React.MouseEvent).clientY; }
    const x = clientX - rect.left; const y = clientY - rect.top;
    ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
  };
  const clearCanvas = () => { const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext("2d"); if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); } };

  return (
    <div className="flex flex-col h-full bg-yellow-50 rounded-3xl shadow-inner border-4 border-yellow-200 relative overflow-hidden">
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 pointer-events-none">
        <span className="text-yellow-800/30 font-bold uppercase text-xs tracking-widest ml-2 pointer-events-auto">Notizblock</span>
        <button onClick={clearCanvas} className="p-1.5 bg-white/80 rounded-full shadow text-red-400 hover:text-red-600 transition-colors pointer-events-auto"><Trash2 size={16} /></button>
      </div>
      <canvas ref={canvasRef} className="w-full h-full touch-none cursor-crosshair" onMouseDown={startDrawing} onMouseUp={stopDrawing} onMouseMove={draw} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchEnd={stopDrawing} onTouchMove={draw} />
    </div>
  );
};

const CategorySection = ({ title, modes, cat, onStart }: { title: string; modes: GameMode[]; cat: Category; onStart: (m: GameMode | Category) => void; }) => (
  <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">{title}</h3>
      <button onClick={() => onStart(cat)} className="text-xs bg-slate-800 text-white px-3 py-1 rounded-full font-bold shadow hover:bg-slate-700 active:scale-95 flex items-center gap-1">
        <Layers size={12} /> Alles mischen
      </button>
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {modes.map((m) => {
        const info = getModeInfo(m);
        return (
          <button key={m} onClick={() => onStart(m)} className={`${info.color} text-white py-3 rounded-xl shadow active:scale-95 flex flex-col items-center gap-1 border-b-4 ${info.border} relative hover:brightness-110 transition-all`}>
            {info.isNew && ( <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm animate-bounce">NEU</span> )}
            <span className="text-xl">{info.icon}</span>
            <span className="text-[10px] sm:text-xs font-bold text-center px-1 leading-tight">{info.name}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// Schrägbild-Rendering für Würfelgebäude
const IsometricCubes = ({ grid }: { grid: number[][] }) => {
  const size = 28; const depthX = 14; const depthY = 14; const rows = grid.length; const cols = grid[0].length;
  const cubes: {r: number, c: number, z: number}[] = [];
  for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { const h = grid[r][c]; for (let z = 0; z < h; z++) { cubes.push({ r, c, z }); } } }
  return (
    <svg viewBox="-20 -150 200 180" className="w-48 h-48 sm:w-64 sm:h-64 mx-auto overflow-visible drop-shadow-md">
      {cubes.map((cube, i) => {
        const { r, c, z } = cube; const d = rows - 1 - r; const x = c * size + d * depthX; const y = -z * size - d * depthY;
        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <polygon points={`0,0 ${depthX},${-depthY} ${size+depthX},${-depthY} ${size},0`} fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
            <polygon points={`${size},0 ${size+depthX},${-depthY} ${size+depthX},${-depthY+size} ${size},${size}`} fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
            <polygon points={`0,0 ${size},0 ${size},${size} 0,${size}`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
};

// Durchsichtige geometrische Körper
const ShapePreview = ({ type }: { type: string }) => {
  let content = null; const stroke = "#3b82f6"; const strokeBack = "#93c5fd"; const fill = "rgba(239, 246, 255, 0.4)"; 
  if (type === "cube" || type === "cuboid") {
     const h = type === "cube" ? 60 : 40; const w = type === "cube" ? 60 : 90; const d = type === "cube" ? 30 : 40; 
     content = (
       <g transform={`translate(${type === "cube" ? 25 : 10}, ${type === "cube" ? 40 : 50})`}>
         <polyline points={`0,0 ${d},${-d} ${w+d},${-d}`} fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <line x1={d} y1={-d} x2={d} y2={h-d} stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <line x1={d} y1={h-d} x2={0} y2={h} stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <line x1={d} y1={h-d} x2={w+d} y2={h-d} stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <polygon points={`0,0 ${w},0 ${w},${h} 0,${h}`} fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
         <polygon points={`0,0 ${d},${-d} ${w+d},${-d} ${w},0`} fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
         <polygon points={`${w},0 ${w+d},${-d} ${w+d},${h-d} ${w},${h}`} fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
       </g>
     );
  } else if (type === "cylinder") {
     content = ( <g transform="translate(45, 25)"><path d="M0,70 A40,15 0 0,1 80,70" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><path d="M0,0 L0,70 A40,15 0 0,0 80,70 L80,0 Z" fill={fill} stroke={stroke} strokeWidth="3" /><ellipse cx="40" cy="0" rx="40" ry="15" fill={fill} stroke={stroke} strokeWidth="3" /></g> );
  } else if (type === "pyramid") {
     content = ( <g transform="translate(25, 95)"><polyline points="0,0 65,-20 110,0" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><line x1="65" y1="-20" x2="55" y2="-85" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><polyline points="0,0 45,20 110,0" fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" /><polygon points="0,0 45,20 55,-85" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" /><polygon points="45,20 110,0 55,-85" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" /></g> );
  } else if (type === "sphere") {
     content = ( <g transform="translate(70, 60)"><circle cx="0" cy="0" r="50" fill={fill} stroke={stroke} strokeWidth="3" /><path d="M-50,0 A50,15 0 0,1 50,0" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><path d="M-50,0 A50,15 0 0,0 50,0" fill="none" stroke={stroke} strokeWidth="3" /><path d="M0,-50 A15,50 0 0,1 0,50" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><path d="M0,-50 A15,50 0 0,0 0,50" fill="none" stroke={stroke} strokeWidth="3" /></g> );
  } else if (type === "cone") {
     content = ( <g transform="translate(30, 95)"><path d="M0,0 A40,15 0 0,1 80,0" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><path d="M0,0 A40,15 0 0,0 80,0 L40,-80 Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" /></g> );
  } else if (type === "prism") {
     content = ( <g transform="translate(15, 60)"><polyline points="10,30 40,10 80,10" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><line x1="40" y1="10" x2="60" y2="-30" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" /><polygon points="10,30 50,30 30,-10" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" /><polygon points="50,30 80,10 60,-30 30,-10" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" /></g> );
  }
  return <svg viewBox="0 0 140 120" className="w-32 h-32 sm:w-48 sm:h-48 mx-auto drop-shadow-sm">{content}</svg>;
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [mode, setMode] = useState<GameMode>("menu");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // --- EINSTELLUNGEN ---
  const [settings, setSettings] = useState<AppSettings>(() => {
    try { const saved = localStorage.getItem("mathe_settings"); if (saved) return JSON.parse(saved); } catch (e) {}
    return { difficulty: 2, cubeGridSize: "random", activeShapes: ["cube", "cuboid", "cylinder", "pyramid", "sphere", "cone", "prism"] };
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  useEffect(() => { localStorage.setItem("mathe_settings", JSON.stringify(settings)); }, [settings]);

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(() => localStorage.getItem(OFFLINE_READY_KEY) === "1");

  const currentModeInfo = getModeInfo(mode);

  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [input, setInput] = useState<string>("");
  const [multiInputs, setMultiInputs] = useState<Record<string, string>>({});
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [selectedMoney, setSelectedMoney] = useState<number[]>([]);

  const [feedback, setFeedback] = useState<FeedbackType>("none");
  const [questionIndex, setQuestionIndex] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);

  const usedQuestionsRef = useRef<Set<string>>(new Set());
  const [showHelpModal, setShowHelpModal] = useState(false);

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try { const saved = localStorage.getItem("mathe-trainer-history"); return saved ? JSON.parse(saved) : []; } catch (e) { return []; }
  });

  useEffect(() => { localStorage.setItem("mathe-trainer-history", JSON.stringify(history)); }, [history]);
  
  useEffect(() => {
    const update = () => { const offlineNow = !navigator.onLine; setIsOffline(offlineNow); if (!offlineNow) { localStorage.setItem(OFFLINE_READY_KEY, "1"); setOfflineReady(true); } };
    window.addEventListener("online", update); window.addEventListener("offline", update); update();
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  useEffect(() => {
    if (mode !== "menu" && mode !== "history" && !isRoundOver && !currentQuestion) setMode("menu");
  }, [mode, currentQuestion, isRoundOver]);

  // --- HELPER LOGIC ---
  const pickModeForCategory = (cat: Category): GameMode => {
    const calcModes: GameMode[] = ["multiplication", "division", "division_remainder", "inverse_calc", "addition", "subtraction", "addition_1000", "subtraction_1000", "pyramid", "estimation", "gap_add", "gap_sub"];
    const moneyModes: GameMode[] = ["money_count", "money_calc", "money_pay", "shopping", "word_problem"];
    const grade3Modes: GameMode[] = ["cube_buildings", "geometry_shapes", "geometry_riddles", "units_length", "units_weight", "compare_units", "realistic_sizes", "word_problem_units"];
    let pool: GameMode[] = [];
    if (cat === "calc") pool = calcModes; else if (cat === "money") pool = moneyModes; else if (cat === "grade3") pool = grade3Modes; else pool = [...calcModes, ...moneyModes, ...grade3Modes];
    return pool[rand(0, pool.length - 1)];
  };

  const generateQuestion = (targetMode: GameMode) => {
    let q: Question = { text: "", answer: 0 };
    let signature = "";
    let attempts = 0;
    const dif = settings.difficulty;

    do {
      setMultiInputs({}); setActiveCellId(null); setInput(""); setSelectedMoney([]);
      
      // --- KLASSE 3 ERWEITERUNGEN ---
      
      if (targetMode === "compare_units") {
          const type = rand(1, 2);
          if (type === 1) { // Längen vergleichen
              const comparisons = [
                  { l: "3 m 33 cm", r: "233 cm", ans: ">", h: "Wandle alles in cm um: 3 m 33 cm = 333 cm." },
                  { l: "7,04 m", r: "74 cm", ans: ">", h: "7,04 m sind 704 cm." },
                  { l: "590 cm", r: "5,09 m", ans: ">", h: "5,09 m sind 509 cm." },
                  { l: "4 m 17 cm", r: "417 cm", ans: "=", h: "4 m 17 cm sind genau 417 cm." },
                  { l: "29 cm", r: "1,29 m", ans: "<", h: "1,29 m sind 129 cm." },
                  { l: "68 mm", r: "8,6 cm", ans: "<", h: "8,6 cm sind 86 mm." }
              ];
              const c = comparisons[rand(0, comparisons.length - 1)];
              q = { text: <div className="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-4"><span>{c.l}</span><span className="w-16 h-16 bg-slate-100 rounded-xl border-4 border-dashed border-slate-300 flex items-center justify-center text-slate-400">?</span><span>{c.r}</span></div>, answer: c.ans, isCompare: true, helpText: c.h };
              signature = `compL-${c.l}-${c.r}`;
          } else { // Gewichte vergleichen
              const comparisons = [
                  { l: "½ kg", r: "500 g", ans: "=", h: "Ein halbes Kilogramm (½ kg) sind genau 500 g." },
                  { l: "¼ kg", r: "250 g", ans: "=", h: "Ein viertel Kilogramm (¼ kg) sind genau 250 g." },
                  { l: "1 kg", r: "1000 g", ans: "=", h: "1 kg sind 1000 g." },
                  { l: "5 kg", r: "5000 g", ans: "=", h: "5 kg sind 5000 g." },
                  { l: "½ kg", r: "300 g", ans: ">", h: "½ kg = 500 g. 500 g ist mehr als 300 g." },
                  { l: "250 g", r: "½ kg", ans: "<", h: "½ kg = 500 g. 250 g ist weniger als 500 g." },
                  { l: "1000 g", r: "2 kg", ans: "<", h: "2 kg = 2000 g." }
              ];
              const c = comparisons[rand(0, comparisons.length - 1)];
              const renderSide = (str: string) => {
                  if (str === "½ kg") return <div className="flex items-center gap-1"><div className="flex flex-col text-lg items-center leading-[0.8]"><span className="border-b-2 border-slate-700 pb-[1px]">1</span><span className="pt-[1px]">2</span></div> kg</div>;
                  if (str === "¼ kg") return <div className="flex items-center gap-1"><div className="flex flex-col text-lg items-center leading-[0.8]"><span className="border-b-2 border-slate-700 pb-[1px]">1</span><span className="pt-[1px]">4</span></div> kg</div>;
                  return str;
              };
              q = { text: <div className="text-3xl sm:text-4xl font-bold flex items-center justify-center gap-4"><span>{renderSide(c.l)}</span><span className="w-16 h-16 bg-slate-100 rounded-xl border-4 border-dashed border-slate-300 flex items-center justify-center text-slate-400">?</span><span>{renderSide(c.r)}</span></div>, answer: c.ans, isCompare: true, helpText: c.h };
              signature = `compW-${c.l}-${c.r}`;
          }
      } else if (targetMode === "realistic_sizes") {
          const items = [
              { name: "Länge eines Bleistiftes", opts: ["15 mm", "15 cm", "15 m", "15 km"], ans: "15 cm" },
              { name: "Länge einer Ameise", opts: ["5 mm", "5 cm", "5 m", "5 km"], ans: "5 mm" },
              { name: "Länge eines Fußballfeldes", opts: ["100 mm", "100 cm", "100 m", "100 km"], ans: "100 m" },
              { name: "Höhe eines Einfamilienhauses", opts: ["8 mm", "8 cm", "8 m", "8 km"], ans: "8 m" },
              { name: "Größe eines 8-jährigen Kindes", opts: ["135 mm", "135 cm", "135 m", "135 km"], ans: "135 cm" },
              { name: "Ein Paket Mehl wiegt", opts: ["1 g", "10 g", "100 g", "1 kg"], ans: "1 kg" },
              { name: "Eine Tafel Schokolade wiegt", opts: ["10 g", "100 g", "1 kg", "10 kg"], ans: "100 g" },
              { name: "Ein Auto wiegt ca.", opts: ["100 g", "10 kg", "1500 kg", "1000 g"], ans: "1500 kg" }
          ];
          const item = items[rand(0, items.length - 1)];
          q = { text: <div className="text-2xl font-bold text-slate-700">Was ist realistisch?<br/><span className="text-blue-600 block mt-2 text-3xl">{item.name}</span></div>, answer: item.ans, mcOptions: item.opts, helpText: "Stelle dir den Gegenstand in Wirklichkeit vor. Ein Zentimeter (cm) ist ca. ein Finger breit, ein Meter (m) ein großer Schritt." };
          signature = `real-${item.name}`;
      } else if (targetMode === "geometry_riddles") {
          const riddles = [
              { text: "Ich habe acht Ecken. Meine Kanten sind alle gleich lang.", ans: "Würfel" },
              { text: "Ich habe nur eine Spitze und eine Kante. Dafür habe ich zwei Seitenflächen.", ans: "Kegel" },
              { text: "Ich habe keine Ecken und nur eine Seitenfläche.", ans: "Kugel" },
              { text: "Ich habe eine quadratische und vier dreieckige Seitenflächen.", ans: "Pyramide" },
              { text: "Ich habe 3 Seitenflächen. Zwei davon sind Kreise.", ans: "Zylinder" }
          ];
          const r = riddles[rand(0, riddles.length - 1)];
          q = { text: <div className="text-2xl font-bold text-slate-700 max-w-md mx-auto italic">"{r.text}"<br/><br/><span className="text-blue-600 not-italic">Welcher Körper bin ich?</span></div>, answer: r.ans, mcOptions: ["Würfel", "Quader", "Kugel", "Kegel", "Pyramide", "Zylinder"], helpText: "Überlege dir genau, wie viele Ecken, Kanten und Flächen die verschiedenen Körper haben." };
          signature = `riddle-${r.ans}`;
      } else if (targetMode === "units_length") {
        const type = rand(1, 6);
        if (type === 1) { const a = rand(2, 25); q = { text: `${a} cm = ? mm`, answer: a * 10, helpText: "1 cm sind 10 mm. Hänge eine Null an." }; signature = `len1-${a}`; }
        else if (type === 2) { const a = rand(2, 50); q = { text: `${a * 10} mm = ? cm`, answer: a, helpText: "Nimm eine Null weg, denn 10 mm sind 1 cm." }; signature = `len2-${a}`; }
        else if (type === 3) { const a = rand(2, 12); q = { text: `${a} m = ? cm`, answer: a * 100, helpText: "1 m sind 100 cm. Hänge zwei Nullen an." }; signature = `len3-${a}`; }
        else if (type === 4) { 
           const a = rand(1, 9) * 100 + (rand(0,1) === 1 ? 50 : 0);
           q = { text: <div className="text-center text-3xl font-bold">{a} m + <span className="text-blue-500">? m</span> = 1 km</div>, answer: 1000 - a, helpText: "1 km sind genau 1000 m. Wie viel fehlt bis zur 1000?" }; 
           signature = `len4-${a}`; 
        }
        else if (type === 5) { 
           const cm = rand(2, 15); const mm = rand(1, 9);
           q = { text: `${cm} cm ${mm} mm = ? cm`, answer: `${cm},${mm}`, mcOptions: [`${cm},${mm}`, `${cm}${mm}`, `${mm},${cm}`, `${cm},0${mm}`], helpText: "Die Millimeter kommen nach dem Komma." }; 
           signature = `len5-${cm}-${mm}`; 
        }
        else {
          const mm = rand(1, 9);
          q = { text: <div className="text-center text-3xl font-bold">{mm} mm + <span className="text-blue-500">? mm</span> = 1 cm</div>, answer: 10 - mm, helpText: "1 cm sind genau 10 mm. Wie viel fehlt bis zur 10?" };
          signature = `len6-${mm}`;
        }
      } else if (targetMode === "units_weight") {
        const type = rand(1, 5);
        if (type === 1) { const a = rand(2, 15); q = { text: `${a} kg = ? g`, answer: a * 1000, helpText: "1 kg sind 1000 g. Hänge drei Nullen an." }; signature = `wei1-${a}`; }
        else if (type === 2) { 
           const a = rand(1, 9) * 100 + (rand(0,1) === 1 ? 50 : 0);
           q = { text: <div className="text-center text-3xl font-bold">{a} g + <span className="text-blue-500">? g</span> = 1 kg</div>, answer: 1000 - a, helpText: "1 kg sind genau 1000 g. Wie viel fehlt bis zur 1000?" }; 
           signature = `wei2-${a}`; 
        }
        else if (type === 3) { 
           const a = rand(1, 4) * 100 + rand(1, 9) * 10;
           q = { text: <div className="text-center text-3xl font-bold flex justify-center items-center gap-2">{a} g + <span className="text-blue-500">? g</span> = <div className="flex flex-col text-xl items-center leading-[0.8]"><span className="border-b-2 border-slate-700 pb-[1px]">1</span><span className="pt-[1px]">2</span></div> kg</div>, answer: 500 - a, helpText: "Ein halbes Kilogramm (½ kg) sind genau 500 g. Wie viel fehlt bis zur 500?" }; 
           signature = `wei3-${a}`; 
        }
        else if (type === 4) { 
           const a = rand(5, 20) * 10;
           q = { text: <div className="text-center text-3xl font-bold flex justify-center items-center gap-2">{a} g + <span className="text-blue-500">? g</span> = <div className="flex flex-col text-xl items-center leading-[0.8]"><span className="border-b-2 border-slate-700 pb-[1px]">1</span><span className="pt-[1px]">4</span></div> kg</div>, answer: 250 - a, helpText: "Ein viertel Kilogramm (¼ kg) sind genau 250 g. Wie viel fehlt bis zur 250?" }; 
           signature = `wei4-${a}`; 
        }
        else {
          const kg = rand(1, 5); const g = rand(10, 990); 
          q = { text: `${kg} kg ${g} g = ? g`, answer: kg * 1000 + g, helpText: `Verwandle zuerst die Kilogramm in Gramm (${kg} kg = ${kg*1000} g). Zähle dann die ${g} g dazu.` };
          signature = `wei5-${kg}-${g}`;
        }
      }

      // --- ALTE MODI ---
      else if (targetMode === "addition") {
        const maxA = dif === 1 ? 50 : 100;
        const a = rand(10, maxA); const b = rand(10, maxA);
        q = { text: `${a} + ${b} = ?`, answer: a + b, helpText: "Zähle die Einer und Zehner zusammen." };
        signature = `add-${a}-${b}`;
      } else if (targetMode === "subtraction") {
        const maxA = dif === 1 ? 50 : 100;
        const a = rand(30, maxA); const b = rand(10, a);
        q = { text: `${a} - ${b} = ?`, answer: a - b, helpText: "Ziehe erst die Zehner und dann die Einer ab." };
        signature = `sub-${a}-${b}`;
      } else if (targetMode === "multiplication") {
        const multMax = dif === 1 ? 6 : dif === 2 ? 9 : 12;
        const a = rand(2, multMax); const b = rand(2, multMax);
        q = { text: `${a} · ${b} = ?`, answer: a * b, helpText: "Erinnere dich an die Einmaleins-Reihen. Zähle in Schritten, wenn du dir unsicher bist." };
        signature = `mult-${a}-${b}`;
      } else if (targetMode === "division") {
        const maxDiv = dif === 1 ? 5 : dif === 2 ? 9 : 12;
        const divisor = rand(2, maxDiv); const result = rand(2, maxDiv);
        q = { text: `${divisor * result} : ${divisor} = ?`, answer: result, helpText: `Nutze die Umkehraufgabe: Wie oft passt die ${divisor} in die ${divisor * result}?` };
        signature = `div-${divisor * result}-${divisor}`;
      } else if (targetMode === "division_remainder") {
        const maxDiv = dif === 1 ? 5 : dif === 2 ? 9 : 12;
        const divisor = rand(3, maxDiv); const quotient = rand(2, maxDiv); const remainder = rand(1, divisor - 1);
        const dividend = divisor * quotient + remainder;
        q = { text: `${dividend} : ${divisor} = ?`, answer: 0, divisionData: { dividend, divisor, quotient, remainder }, helpText: `Wie oft passt die ${divisor} komplett in die ${dividend}? Der Rest ist das, was übrig bleibt.` };
        signature = `divR-${dividend}-${divisor}`;
        setActiveCellId("div-quotient");
      } else if (targetMode === "inverse_calc") {
        const maxB = dif === 1 ? 5 : 9;
        const b = rand(2, maxB); const a = rand(2, maxB); const add = rand(1, maxB); const res = a * b + add;
        q = { text: "Löse die Umkehraufgabe", answer: 0, inverseData: { a, b, add, result: res }, helpText: "Punkt vor Strich! Rechne zuerst die Mal-Aufgabe und zähle dann die Plus-Zahl dazu." };
        signature = `inv-${a}-${b}-${add}`;
        setActiveCellId("inv-res");
      } else if (targetMode === "gap_add") {
        const maxA = dif === 1 ? 50 : dif === 2 ? 450 : 900;
        const a = rand(10, maxA); const b = rand(10, maxA); const sum = a + b;
        const hideA = rand(0, 1) === 0;
        if (hideA) { q = { text: <span><span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> + {b} = {sum}</span>, answer: a, helpText: `Rechne rückwärts (Umkehraufgabe): ${sum} - ${b} = ?` }; signature = `gapA-?+${b}=${sum}`; } 
        else { q = { text: <span>{a} + <span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> = {sum}</span>, answer: b, helpText: `Rechne rückwärts (Umkehraufgabe): ${sum} - ${a} = ?` }; signature = `gapA-${a}+?=${sum}`; }
      } else if (targetMode === "gap_sub") {
        const maxA = dif === 1 ? 100 : dif === 2 ? 500 : 900;
        const a = rand(50, maxA); const b = rand(10, a - 10); const res = a - b;
        const hideA = rand(0, 1) === 0;
        if (hideA) { q = { text: <span><span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> - {b} = {res}</span>, answer: a, helpText: `Rechne rückwärts (Umkehraufgabe): ${res} + ${b} = ?` }; signature = `gapS-?-${b}=${res}`; } 
        else { q = { text: <span>{a} - <span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> = {res}</span>, answer: b, helpText: `Wie viel fehlt von der ${res} bis zur ${a}? Rechne: ${a} - ${res} = ?` }; signature = `gapS-${a}-?=${res}`; }
      } else if (targetMode === "addition_1000") {
        const maxA = dif === 1 ? 200 : dif === 2 ? 750 : 900;
        const a = rand(100, maxA); const b = rand(50, 990 - a);
        const splitH = Math.floor(b / 100) * 100; const splitZ = Math.floor((b % 100) / 10) * 10; const splitE = b % 10;
        const res1 = a + splitH; const res2 = res1 + splitZ; const res3 = res2 + splitE;
        q = { text: "Rechne schrittweise", answer: a + b, stepData: { start: a, operator: "+", operand: b, result: a + b, steps: [{ val: splitH, res: res1 }, { val: splitZ, res: res2 }, { val: splitE, res: res3 }] }, helpText: "Zerlege die zweite Zahl in Hunderter, Zehner und Einer. Addiere sie Schritt für Schritt." };
        signature = `add1000-${a}+${b}`;
        setActiveCellId("step-0-add");
      } else if (targetMode === "subtraction_1000") {
        const maxA = dif === 1 ? 300 : dif === 2 ? 900 : 990;
        const a = rand(150, maxA); const b = rand(50, a - 50);
        const splitH = Math.floor(b / 100) * 100; const splitZ = Math.floor((b % 100) / 10) * 10; const splitE = b % 10;
        const res1 = a - splitH; const res2 = res1 - splitZ; const res3 = res2 - splitE;
        q = { text: "Rechne schrittweise", answer: a - b, stepData: { start: a, operator: "-", operand: b, result: a - b, steps: [{ val: splitH, res: res1 }, { val: splitZ, res: res2 }, { val: splitE, res: res3 }] }, helpText: "Zerlege die zweite Zahl in Hunderter, Zehner und Einer. Ziehe sie nacheinander ab." };
        signature = `sub1000-${a}-${b}`;
        setActiveCellId("step-0-add");
      } else if (targetMode === "estimation") {
        const isPlus = rand(0, 1) === 1;
        const exactA = rand(1, 8) * 100 + rand(10, 90); const exactB = rand(1, 8) * 100 + rand(10, 90);
        const roundedA = Math.round(exactA / 100) * 100; const roundedB = Math.round(exactB / 100) * 100;
        let estRes = isPlus ? roundedA + roundedB : Math.max(roundedA, roundedB) - Math.min(roundedA, roundedB);
        q = { text: "Überschlage (runde auf Hunderter)", answer: 0, estimationData: { a: exactA, b: exactB, roundedA, roundedB, estResult: estRes, op: isPlus ? "+" : "-" }, helpText: "Runde beide Zahlen auf volle Hunderter. Ab 50 wird aufgerundet, darunter abgerundet. Danach rechne mit den Hundertern." };
        signature = `est-${exactA}${isPlus ? '+' : '-'}${exactB}`;
        setActiveCellId("est-roundA");
      } else if (targetMode === "money_count") {
        const notes = [500, 1000, 2000, 5000]; const coins = [1, 2, 5, 10, 20, 50, 100, 200];
        const numItems = dif === 1 ? rand(2, 4) : dif === 2 ? rand(3, 6) : rand(5, 8);
        let totalCents = 0;
        type MoneyItem = { val: number; type: "note" | "coin" };
        const moneyItems: MoneyItem[] = [];
        for (let i = 0; i < numItems; i++) {
          const isNote = rand(0, 10) > 6;
          const val = isNote ? notes[rand(0, notes.length - 1)] : coins[rand(0, coins.length - 1)];
          moneyItems.push({ val, type: isNote ? "note" : "coin" });
          totalCents += val;
        }
        moneyItems.sort((a, b) => b.val - a.val);
        const moneyContent = (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-wrap justify-center items-end gap-2 sm:gap-4 max-w-lg">
              {moneyItems.map((item, idx) => item.type === "note" ? <Bill key={idx} value={item.val / 100} /> : <Coin key={idx} value={item.val} />)}
            </div>
            <div className="text-slate-400 text-sm font-medium mt-2">Betrag in Euro (z.B. 12,50)</div>
          </div>
        );
        q = { text: moneyContent, answer: totalCents, isDecimal: true, helpText: "Zähle zuerst die großen Scheine, dann die großen Münzen und zuletzt das Kleingeld." };
        signature = `moneyCount-${totalCents}-${rand(1,1000)}`;
      } else if (targetMode === "money_pay") {
        const maxEuro = dif === 1 ? 10 : dif === 2 ? 20 : 50;
        const euro = rand(1, maxEuro); const cent = rand(1, 99); const total = euro * 100 + cent;
        q = { text: `Bezahle passend`, answer: total, payData: { target: total }, helpText: "Klicke auf die Scheine und Münzen unten, bis du genau den verlangten Betrag im grünen Feld hast." };
        signature = `moneyPay-${total}`;
      } else if (targetMode === "money_calc") {
        const maxC = dif === 1 ? 20 : dif === 2 ? 40 : 80;
        const centsA = rand(1, maxC) * 10 + rand(0, 1) * 5; const centsB = rand(1, maxC) * 10 + rand(0, 1) * 5;
        const isPlus = rand(0, 1) === 0;
        const total = isPlus ? centsA + centsB : Math.max(centsA, centsB) - Math.min(centsA, centsB);
        const val1 = isPlus ? centsA : Math.max(centsA, centsB); const val2 = isPlus ? centsB : Math.min(centsA, centsB);
        const format = (c: number) => (c / 100).toFixed(2).replace(".", ",") + " €";
        q = { text: `${format(val1)} ${isPlus ? "+" : "-"} ${format(val2)} = ?`, answer: total, isDecimal: true, helpText: "Stelle dir vor, das Komma wäre nicht da. Rechne in Cent und setze das Komma am Ende wieder vor die letzten beiden Ziffern." };
        signature = `moneyCalc-${val1}${isPlus ? '+' : '-'}${val2}`;
      } else if (targetMode === "shopping") {
        const products = [
          { name: "Brezel", price: 85, icon: "🥨" }, { name: "Stift", price: 150, icon: "✏️" },
          { name: "Apfel", price: 60, icon: "🍎" }, { name: "Heft", price: 220, icon: "📓" },
          { name: "Eis", price: 120, icon: "🍦" }, { name: "Ball", price: 450, icon: "⚽" },
        ];
        const p1 = products[rand(0, products.length - 1)]; let p2 = products[rand(0, products.length - 1)];
        while (p1 === p2) p2 = products[rand(0, products.length - 1)];
        const totalCost = p1.price + p2.price;
        let payAmount = totalCost < 500 ? 500 : totalCost < 1000 ? 1000 : totalCost < 2000 ? 2000 : 5000;
        const change = payAmount - totalCost;
        q = {
          text: "Einkaufen", answer: change,
          shoppingData: { items: [p1, p2], wallet: payAmount, total: totalCost, change: change },
          isDecimal: true,
          helpText: "Schritt 1: Rechne die Preise zusammen. Schritt 2: Ziehe die Summe von dem Geld ab, das du gibst (Rückgeld)."
        };
        signature = `shop-${p1.name}-${p2.name}`;
        setActiveCellId("shop-total");
      } else if (targetMode === "word_problem") {
        const problems = [
          { text: "Anna hat 5 €. Sie kauft ein Eis für 1,50 €. Wie viel Geld hat sie noch?", ans: 350 },
          { text: "Ein Buch kostet 12 €. Tom hat 8 €. Wie viel Euro fehlen ihm?", ans: 400 },
          { text: "Lara kauft 3 Stifte für je 2 €. Wie viel muss sie bezahlen?", ans: 600 }
        ];
        const p = problems[rand(0, problems.length - 1)];
        q = { text: <div className="text-2xl sm:text-3xl font-medium text-slate-700 leading-relaxed max-w-lg text-center px-4">{p.text}</div>, answer: p.ans, isDecimal: true, helpText: "Lies genau: Musst du Plus, Minus oder Mal rechnen?" };
        signature = `wp-${p.ans}`;
      } else if (targetMode === "cube_buildings") {
        let rows = 3; let cols = 3;
        if (settings.cubeGridSize === "random") { rows = rand(2, 3); cols = rand(2, 4); } else { const parts = settings.cubeGridSize.split("x"); rows = parseInt(parts[0]); cols = parseInt(parts[1]); }
        const maxBuildingHeight = settings.difficulty === 1 ? 2 : settings.difficulty === 2 ? 3 : 5;
        const g: number[][] = Array(rows).fill(0).map(() => Array(cols).fill(0));
        const cells: GridCell[] = [];
        for (let r = rows - 1; r >= 0; r--) {
          for (let c = cols - 1; c >= 0; c--) {
            let minH = 0;
            for (let rf = r + 1; rf < rows; rf++) {
              for (let cf = 0; cf < cols; cf++) {
                let delta_r = rf - r; let delta_c = cf - c;
                if (-2 < 2 * delta_c - delta_r && 2 * delta_c - delta_r < 2) { let reqH = g[rf][cf] - Math.floor((delta_r - 1) / 2); if (reqH > minH) minH = reqH; }
              }
            }
            let choices = [0]; 
            let localMax = maxBuildingHeight;
            if (r === rows - 1) localMax = Math.min(maxBuildingHeight, 2); else if (r === rows - 2) localMax = Math.min(maxBuildingHeight, 3);
            let startH = Math.max(1, minH);
            for (let h = startH; h <= localMax; h++) { choices.push(h); }
            if (choices.length > 1 && rand(0, 100) > 30) { let validHeights = choices.slice(1); g[r][c] = validHeights[rand(0, validHeights.length - 1)]; } else { g[r][c] = choices[rand(0, choices.length - 1)]; }
          }
        }
        if (g.flat().reduce((a, b) => a + b, 0) === 0) g[rows-1][0] = 1;
        for (let r = 0; r < rows; r++) { for (let c = 0; c < cols; c++) { cells.push({ id: `cube-${r}-${c}`, val: g[r][c], isGiven: false }); } }
        q = { text: <div className="flex flex-col items-center"><IsometricCubes grid={g} /></div>, answer: 0, gridData: { cells, type: "cube_plan", meta: { rows, cols } }, helpText: "Zähle die Würfel. Was du nicht siehst, ist auch nicht da (schreibe 0 oder lass es leer). Jeder sichtbare Turm geht bis ganz auf den Boden." };
        signature = `cube-${rows}-${cols}-${g.flat().join("")}`;
      } else if (targetMode === "geometry_shapes") {
        const allShapes = [ { id: "cube", name: "Würfel", ecken: 8, kanten: 12, flächen: 6 }, { id: "cuboid", name: "Quader", ecken: 8, kanten: 12, flächen: 6 }, { id: "cylinder", name: "Zylinder", ecken: 0, kanten: 2, flächen: 3 }, { id: "pyramid", name: "Quadratische Pyramide", ecken: 5, kanten: 8, flächen: 5 }, { id: "sphere", name: "Kugel", ecken: 0, kanten: 0, flächen: 1 }, { id: "cone", name: "Kegel", ecken: 1, kanten: 1, flächen: 2 }, { id: "prism", name: "Dreiecksprisma", ecken: 6, kanten: 9, flächen: 5 } ];
        let shapes = allShapes.filter(s => settings.activeShapes.includes(s.id)); if (shapes.length === 0) shapes = allShapes; 
        const s = shapes[rand(0, shapes.length - 1)];
        const props = ["ecken", "kanten", "flächen"] as const; const p = props[rand(0, 2)]; const capP = p.charAt(0).toUpperCase() + p.slice(1);
        q = { text: ( <div className="flex flex-col items-center"><ShapePreview type={s.id} /><div className="text-3xl sm:text-4xl font-black text-slate-800 mt-6 mb-2 text-center">{s.name}</div><div className="text-xl sm:text-2xl text-slate-600 text-center">Wie viele <span className="text-blue-600 font-bold">{capP}</span> hat dieser Körper?</div></div> ), answer: s[p], helpText: "Ecken sind die spitzen Punkte. Kanten sind die geraden oder runden Linien, an denen Flächen zusammenstoßen. Flächen sind die glatten Außenwände." };
        signature = `geo-${s.id}-${p}`;
      } else if (targetMode === "word_problem_units") {
        const problems = [ { text: "Ein Brett ist 2 m lang. Es werden 30 cm abgesägt. Wie lang ist es noch in cm?", ans: 170 }, { text: "Tom wandert an 3 Tagen. Tag 1: 12 km, Tag 2: 9 km, Tag 3: 11 km. Wie lang ist die Strecke insgesamt in km?", ans: 32 }, { text: "In eine Tüte passen 250 g Äpfel. Wie viel Gramm Äpfel sind in 4 Tüten?", ans: 1000 }, { text: "Ein Bäcker braucht 2 kg Mehl. Er hat schon 800 g. Wie viele Gramm (g) fehlen ihm noch?", ans: 1200 }, { text: "Die Mosel ist insgesamt 544 km lang. Der französische Teil ist 313 km lang. Wie lang ist der deutsche Teil in km?", ans: 231 } ];
        const prob = problems[rand(0, problems.length - 1)];
        q = { text: <div className="text-xl sm:text-3xl font-medium text-slate-700 leading-relaxed max-w-lg text-center px-4">{prob.text}</div>, answer: prob.ans, helpText: "Lies dir die Aufgabe ganz genau durch. Manchmal musst du Einheiten (z.B. m in cm) erst umrechnen, bevor du Plus oder Minus rechnest." };
        signature = `wpU-${prob.ans}`;
      } else if (targetMode === "pyramid") {
        const base1 = rand(1, 15), base2 = rand(1, 15), base3 = rand(1, 15);
        const cells: GridCell[] = [ { id: "s0", val: base1, isGiven: true }, { id: "s1", val: base2, isGiven: true }, { id: "s2", val: base3, isGiven: true }, { id: "s3", val: base1 + base2, isGiven: false }, { id: "s4", val: base2 + base3, isGiven: false }, { id: "s5", val: base1 + base2 + base2 + base3, isGiven: false } ];
        q = { text: "Fülle die Mauer", answer: 0, gridData: { cells, type: "pyramid" }, helpText: "Addiere immer zwei Steine, die nebeneinander liegen. Das Ergebnis kommt in den Stein genau darüber." };
        signature = `pyr-${base1}-${base2}-${base3}`;
        setActiveCellId("s3");
      }

      attempts++;
    } while (usedQuestionsRef.current.has(signature) && attempts < 10);

    usedQuestionsRef.current.add(signature);
    setCurrentQuestion(q);
    setFeedback("none");
    setStartTime(Date.now());
  };

  const finishRound = (finalScore: number, finalTimes: number[]) => {
    setIsRoundOver(true); let avg = 0;
    if (finalTimes.length > 0) { const sum = finalTimes.reduce((a, b) => a + b, 0); avg = parseFloat((sum / finalTimes.length).toFixed(1)); }
    const newEntry: HistoryEntry = { id: Date.now().toString(), timestamp: new Date().toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }), mode: activeCategory === "mixed" ? "Gemischt" : currentModeInfo.name, score: finalScore, total: QUESTIONS_PER_ROUND, avgTime: avg };
    setHistory((prev) => [newEntry, ...prev].slice(0, 50));
  };

  const nextQuestion = (currentScore?: number) => {
    const score = currentScore !== undefined ? currentScore : correctCount;
    if (questionIndex >= QUESTIONS_PER_ROUND) { finishRound(score, responseTimes); } 
    else { setQuestionIndex((prev) => prev + 1); if (activeCategory) { const nextMode = pickModeForCategory(activeCategory); setMode(nextMode); generateQuestion(nextMode); } else { generateQuestion(mode); } }
  };

  const startGame = (target: GameMode | Category) => {
    usedQuestionsRef.current.clear(); setCorrectCount(0); setQuestionIndex(1); setIsRoundOver(false); setResponseTimes([]); setSelectedMoney([]); setShowHelpModal(false);
    if (target === "calc" || target === "money" || target === "grade3" || target === "mixed") { setActiveCategory(target); const firstMode = pickModeForCategory(target); setMode(firstMode); generateQuestion(firstMode); } 
    else { setActiveCategory(null); setMode(target as GameMode); generateQuestion(target as GameMode); }
  };

  const clearHistory = () => { if (window.confirm("Möchtest du den gesamten Verlauf löschen?")) { setHistory([]); } };

  const handleInputChange = (id: string | null, value: string) => {
    if (feedback !== "none") return;
    const cleanVal = value.replace(/[^0-9,<>=]/g, ""); // Erlaubt auch < = > für den Vergleich
    if (id) setMultiInputs((prev) => ({ ...prev, [id]: cleanVal })); else setInput(cleanVal);
  };
  const handleMoneySelect = (amount: number) => { if (feedback !== "none") return; setSelectedMoney((prev) => [...prev, amount]); playSound("click", soundEnabled); };
  const handleMoneyRemove = (index: number) => { if (feedback !== "none") return; setSelectedMoney((prev) => prev.filter((_, i) => i !== index)); playSound("click", soundEnabled); };

  const handleNumPad = (val: string) => {
    if (feedback !== "none") return;
    let currentVal = activeCellId ? multiInputs[activeCellId] || "" : input;
    if (val === "DEL") handleInputChange(activeCellId, currentVal.slice(0, -1));
    else if (val === ",") { if (!currentVal.includes(",")) handleInputChange(activeCellId, currentVal + ","); } 
    else { if (currentVal.length < 6) handleInputChange(activeCellId, currentVal + val); }
    playSound("click", soundEnabled);
  };

  const checkAnswer = (overrideInput?: string) => {
    if (!currentQuestion) return;
    let isCorrect = false;
    const valueToCheck = overrideInput !== undefined ? overrideInput : input;
    const parseMoney = (s: string) => Math.round(parseFloat((s || "0").replace(",", ".")) * 100);

    if (currentQuestion.mcOptions || currentQuestion.isCompare) {
        isCorrect = valueToCheck.toString() === currentQuestion.answer.toString();
    } else if (mode === "shopping" && currentQuestion.shoppingData) {
      const d = currentQuestion.shoppingData; const userTotal = parseMoney(multiInputs["shop-total"]); const userChange = parseMoney(multiInputs["shop-change"]);
      isCorrect = userTotal === d.total && userChange === d.change;
    } else if (mode === "division_remainder" && currentQuestion.divisionData) {
      const d = currentQuestion.divisionData; const userQ = parseInt(multiInputs["div-quotient"] || "0"); const userR = parseInt(multiInputs["div-remainder"] || "0");
      isCorrect = userQ === d.quotient && userR === d.remainder;
    } else if (mode === "inverse_calc" && currentQuestion.inverseData) {
      const d = currentQuestion.inverseData; const userRes = parseInt(multiInputs["inv-res"] || "0"); isCorrect = userRes === d.result;
    } else if (mode === "estimation" && currentQuestion.estimationData) {
      const d = currentQuestion.estimationData; const rA = parseInt(multiInputs["est-roundA"] || "0"); const rB = parseInt(multiInputs["est-roundB"] || "0"); const res = parseInt(multiInputs["est-res"] || "0");
      isCorrect = rA === d.roundedA && rB === d.roundedB && res === d.estResult;
    } else if (mode === "money_pay" && currentQuestion.payData) {
      const totalSelected = selectedMoney.reduce((a, b) => a + b, 0); isCorrect = totalSelected === currentQuestion.payData.target;
    } else if (currentQuestion.gridData) {
      const data = currentQuestion.gridData; const emptyCells = data.cells.filter((c) => !c.isGiven);
      isCorrect = emptyCells.every((c) => { const u = multiInputs[c.id]; const parsed = (u === "" || u === undefined) ? 0 : parseInt(u); return parsed === c.val; });
    } else if (currentQuestion.stepData) {
      const i = multiInputs; const stepData = currentQuestion.stepData; let stepsCorrect = true;
      if (parseInt(i["main-result"] || "0") !== stepData.result) stepsCorrect = false;
      stepData.steps.forEach((s, idx) => {
        const userInputAdd = parseInt(i[`step-${idx}-add`] || "0"); const userInputRes = parseInt(i[`step-${idx}-res`] || "0");
        if (idx > 0) { const prevRes = stepData.steps[idx - 1].res; const userStart = parseInt(i[`step-${idx}-start`] || "0"); if (userStart !== prevRes) stepsCorrect = false; }
        if (userInputAdd !== s.val) stepsCorrect = false; if (userInputRes !== s.res) stepsCorrect = false;
      });
      isCorrect = stepsCorrect;
    } else if (currentQuestion.isDecimal) {
      if (valueToCheck !== "") isCorrect = parseMoney(valueToCheck) === (currentQuestion.answer as number);
    } else {
      if (valueToCheck !== "") isCorrect = parseInt(valueToCheck) === currentQuestion.answer;
    }

    if (isCorrect) {
      setFeedback("correct"); playSound("correct", soundEnabled); const newScore = correctCount + 1; setCorrectCount(newScore); const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000; setResponseTimes([...responseTimes, durationSeconds]);
      setTimeout(() => { setShowHelpModal(false); nextQuestion(newScore); }, 1500);
    } else {
      setFeedback("wrong"); playSound("wrong", soundEnabled);
      if (overrideInput !== undefined) setInput(overrideInput); // Bei MC Fehler anzeigen
    }
  };

  const handleMCOptionClick = (opt: string) => {
      if (feedback !== "none") return;
      playSound("click", soundEnabled);
      checkAnswer(opt);
  }

  const jumpToNextField = () => {
    let allIds: string[] = [];
    if (mode === "shopping") allIds = ["shop-total", "shop-change"];
    else if (mode === "division_remainder") allIds = ["div-quotient", "div-remainder"];
    else if (mode === "estimation") allIds = ["est-roundA", "est-roundB", "est-res"];
    else if (currentQuestion?.stepData) { currentQuestion.stepData.steps.forEach((_, idx) => { if (idx > 0) allIds.push(`step-${idx}-start`); allIds.push(`step-${idx}-add`); allIds.push(`step-${idx}-res`); }); allIds.push("main-result"); } 
    else if (currentQuestion?.gridData) { allIds = currentQuestion.gridData.cells.filter((c) => !c.isGiven).map((c) => c.id); }
    const firstEmpty = allIds.find((id) => !multiInputs[id]);
    if (firstEmpty) setActiveCellId(firstEmpty); else checkAnswer();
  };

  const renderMultiInputCell = (id: string, value: number | string, isGiven: boolean, label?: string, customStyle?: string) => {
    const isActive = activeCellId === id; const userInput = multiInputs[id] || ""; let isWrong = false; const parsedInput = (userInput === "" || userInput === undefined) ? 0 : parseInt(userInput);
    if (feedback === "wrong" && !isGiven) { isWrong = typeof value === "number" ? parsedInput !== value : userInput !== value; }
    let baseStyle = customStyle || "w-14 h-14 sm:w-16 sm:h-16 border-2 rounded-xl";
    let colorStyle = isGiven ? "bg-slate-200 border-slate-300 text-slate-500" : isActive && feedback === "none" ? "bg-white border-blue-500 ring-4 ring-blue-100 scale-105 z-10" : "bg-white border-slate-300 hover:bg-slate-50";
    if (isWrong) colorStyle = "bg-red-50 border-red-300 text-red-600";
    if (feedback === "correct" && !isGiven) colorStyle = "bg-green-50 border-green-500 text-green-700";
    return (
      <div key={id} className="flex flex-col items-center">
        {label && <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-1 uppercase text-center w-full">{label}</div>}
        <div className={`flex items-center justify-center font-bold text-lg sm:text-2xl transition-all relative shadow-sm ${baseStyle} ${colorStyle}`}>
          {isGiven ? (<span>{value}</span>) : ( <input type="text" inputMode="none" value={userInput} onChange={(e) => handleInputChange(id, e.target.value)} onFocus={() => { if (feedback === "none") setActiveCellId(id); }} className="w-full h-full text-center bg-transparent outline-none p-0 m-0 cursor-pointer" autoComplete="off" /> )}
          {isWrong && ( <div className="text-[10px] text-green-600 font-bold absolute -bottom-4 bg-white/80 px-1 rounded shadow-sm z-20 whitespace-nowrap">{value}</div> )}
        </div>
      </div>
    );
  };

  const renderMoneyPay = () => {
    if (!currentQuestion?.payData) return null;
    const selectedSum = selectedMoney.reduce((a, b) => a + b, 0); const target = currentQuestion.payData.target;
    const notes = [5000, 2000, 1000, 500]; const coins = [200, 100, 50, 20, 10, 5, 2, 1];
    return (
      <div className="flex flex-col items-center w-full gap-4">
        <div className="flex flex-wrap justify-center gap-2 p-4 bg-slate-100 rounded-2xl w-full">
          {notes.map((v) => <Bill key={v} value={v / 100} onClick={() => handleMoneySelect(v)} />)}
          {coins.map((v) => <Coin key={v} value={v} onClick={() => handleMoneySelect(v)} />)}
        </div>
        <div className="w-full min-h-[120px] bg-green-50 border-2 border-dashed border-green-300 rounded-2xl p-4 flex flex-wrap gap-2 justify-center items-center relative">
          <div className="absolute top-2 left-2 text-xs font-bold text-green-700 uppercase tracking-wider">Dein Geld: {(selectedSum / 100).toFixed(2).replace(".", ",")} €</div>
          <div className="absolute top-2 right-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Ziel: {(target / 100).toFixed(2).replace(".", ",")} €</div>
          {selectedMoney.length === 0 && <div className="text-green-800/30 font-bold">Hier Geld hinlegen</div>}
          {selectedMoney.map((v, i) => v >= 500 ? <Bill key={i} value={v / 100} onClick={() => handleMoneyRemove(i)} selected /> : <Coin key={i} value={v} onClick={() => handleMoneyRemove(i)} selected />)}
        </div>
        {feedback === "wrong" && <div className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded border border-green-200">Ziel: {(target / 100).toFixed(2).replace(".", ",")} €</div>}
      </div>
    );
  };

  const renderShopping = () => {
    if (!currentQuestion?.shoppingData) return null;
    const d = currentQuestion.shoppingData;
    return (
      <div className="flex flex-col items-center gap-6 mt-4 w-full">
        <div className="flex justify-center gap-8 bg-slate-50 p-6 rounded-2xl border-2 border-slate-200 w-full max-w-md">
          {d.items.map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <span className="text-6xl">{item.icon}</span>
              <span className="font-bold text-slate-700">{item.name}</span>
              <span className="bg-white px-3 py-1 rounded-full text-sm font-bold shadow-sm border border-slate-200">{(item.price / 100).toFixed(2).replace(".", ",")} €</span>
            </div>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
          <div className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-200 w-full flex flex-col items-center">
            <span className="text-sm font-bold text-blue-600 mb-2 uppercase">Zusammen</span>
            {renderMultiInputCell("shop-total", d.total, false, undefined, "w-24 h-14 bg-white")}
          </div>
          <div className="flex-1 bg-green-50 p-4 rounded-xl border border-green-200 w-full flex flex-col items-center">
            <span className="text-sm font-bold text-green-600 mb-2 uppercase text-center">Rückgeld von {(d.wallet / 100).toFixed(2).replace(".", ",")} €</span>
            {renderMultiInputCell("shop-change", d.change, false, undefined, "w-24 h-14 bg-white")}
          </div>
        </div>
      </div>
    );
  }

  const renderGameContent = () => {
    if (!currentQuestion) return null;
    return (
      <div className={`w-full flex-1 bg-white rounded-3xl shadow-lg p-4 flex flex-col items-center justify-center mb-6 lg:mb-0 relative overflow-y-auto transition-colors ${feedback === "correct" ? "bg-green-50 ring-4 ring-green-200" : feedback === "wrong" ? "bg-red-50 ring-4 ring-red-200" : ""}`}>
        
        {/* HILFE MODAL */}
        {showHelpModal && (
          <div className="absolute top-4 left-4 right-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 z-30 shadow-lg flex flex-col gap-2">
            <div className="flex justify-between items-center text-blue-800 font-bold">
              <span>💡 Tipp zur Aufgabe</span>
              <button onClick={() => setShowHelpModal(false)} className="bg-blue-200 p-1 rounded-full text-blue-700 hover:bg-blue-300"><X size={16}/></button>
            </div>
            <p className="text-blue-900 text-sm">{currentQuestion.helpText || "Versuche die Aufgabe Schritt für Schritt zu lösen. Notiere dir Zwischenergebnisse im Notizblock rechts."}</p>
          </div>
        )}

        {mode === "division_remainder" && currentQuestion.divisionData ? (
           <div className="flex items-center gap-2 text-2xl font-bold text-slate-700"><span>{currentQuestion.divisionData.dividend} : {currentQuestion.divisionData.divisor} =</span>{renderMultiInputCell("div-quotient", currentQuestion.divisionData.quotient, false, "Ergebnis", "w-16 h-16 border-2 rounded-xl")}<span>R</span>{renderMultiInputCell("div-remainder", currentQuestion.divisionData.remainder, false, "Rest", "w-16 h-16 border-2 rounded-xl")}</div>
        ) : mode === "inverse_calc" && currentQuestion.inverseData ? (
          <div className="flex flex-col items-center gap-4 mt-6"><div className="flex items-center gap-2 text-2xl font-bold text-slate-700 bg-blue-50 p-4 rounded-xl border border-blue-100"><span className="text-blue-500">{currentQuestion.inverseData.a}</span><span>·</span><span className="text-blue-500">{currentQuestion.inverseData.b}</span><span>+</span><span className="text-orange-500">{currentQuestion.inverseData.add}</span><span>=</span>{renderMultiInputCell("inv-res", currentQuestion.inverseData.result, false, undefined, "w-20 h-16 border-2 rounded-xl bg-white")}</div></div>
        ) : mode === "estimation" && currentQuestion.estimationData ? (
          <div className="flex flex-col items-center gap-4 mt-4"><div className="text-lg font-bold text-slate-400 mb-2">{currentQuestion.estimationData.a} {currentQuestion.estimationData.op} {currentQuestion.estimationData.b}</div><div className="flex items-center gap-2">{renderMultiInputCell("est-roundA", currentQuestion.estimationData.roundedA, false, "Rund 1", "w-20 h-14 border-2 rounded-lg")}<span className="text-2xl font-bold">{currentQuestion.estimationData.op}</span>{renderMultiInputCell("est-roundB", currentQuestion.estimationData.roundedB, false, "Rund 2", "w-20 h-14 border-2 rounded-lg")}<span className="text-2xl font-bold">=</span>{renderMultiInputCell("est-res", currentQuestion.estimationData.estResult, false, "Ergebnis", "w-20 h-14 border-2 rounded-lg bg-purple-50")}</div></div>
        ) : mode === "money_pay" ? (
          renderMoneyPay()
        ) : mode === "shopping" ? (
          renderShopping()
        ) : currentQuestion.gridData ? (
          <div className="w-full flex flex-col items-center">
            {typeof currentQuestion.text === "string" ? (<h3 className="text-xl font-bold text-slate-500 mb-2">{currentQuestion.text}</h3>) : (currentQuestion.text)}
            {currentQuestion.gridData.type === "cube_plan" ? (
               <div className="flex flex-col items-center gap-2 w-full"><div className="font-bold text-slate-600 mt-4">Trage den Bauplan ein</div><div className="grid gap-1 bg-slate-200 p-2 rounded-xl shadow-inner mt-2" style={{ gridTemplateColumns: `repeat(${currentQuestion.gridData.meta.cols}, 1fr)` }}>{currentQuestion.gridData.cells.map(c => renderMultiInputCell(c.id, c.val as number, false, undefined, "w-12 h-12 sm:w-16 sm:h-16 border-2 rounded-lg bg-white text-2xl"))}</div><div className="text-xs text-slate-400 mt-2 font-medium">Tipp: Leere Felder kannst du frei lassen oder eine 0 eintragen.</div></div>
            ) : currentQuestion.gridData.type === "pyramid" ? (
               <div className="flex flex-col items-center gap-2 mt-4"><div className="flex justify-center">{renderMultiInputCell(currentQuestion.gridData.cells[5].id, currentQuestion.gridData.cells[5].val as number, currentQuestion.gridData.cells[5].isGiven, undefined, "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1")}</div><div className="flex justify-center gap-1">{renderMultiInputCell(currentQuestion.gridData.cells[3].id, currentQuestion.gridData.cells[3].val as number, currentQuestion.gridData.cells[3].isGiven, undefined, "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1")}{renderMultiInputCell(currentQuestion.gridData.cells[4].id, currentQuestion.gridData.cells[4].val as number, currentQuestion.gridData.cells[4].isGiven, undefined, "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1")}</div><div className="flex justify-center gap-1">{renderMultiInputCell(currentQuestion.gridData.cells[0].id, currentQuestion.gridData.cells[0].val as number, currentQuestion.gridData.cells[0].isGiven, undefined, "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1")}{renderMultiInputCell(currentQuestion.gridData.cells[1].id, currentQuestion.gridData.cells[1].val as number, currentQuestion.gridData.cells[1].isGiven, undefined, "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1")}{renderMultiInputCell(currentQuestion.gridData.cells[2].id, currentQuestion.gridData.cells[2].val as number, currentQuestion.gridData.cells[2].isGiven, undefined, "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1")}</div></div>
            ) : null}
          </div>
        ) : currentQuestion.stepData ? (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-500 mb-2">{currentQuestion.text}</h3>
            <div className="flex flex-col items-center bg-white p-2 border-2 border-slate-200 shadow-inner rounded-xl overflow-hidden mt-4">
              <div className="grid grid-cols-5 gap-0 bg-slate-100 border-l-2 border-t-2 border-slate-300">
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">{currentQuestion.stepData.start}</div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">{currentQuestion.stepData.operator}</div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">{currentQuestion.stepData.operand}</div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">=</div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-xl font-mono cursor-pointer bg-white">{renderMultiInputCell("main-result", currentQuestion.stepData.result, false, undefined, "w-full h-full border-none rounded-none")}</div>
                <div className="col-span-5 h-1 bg-slate-800 my-0"></div>
                {currentQuestion.stepData.steps.map((step, idx) => {
                  const isFirstRow = idx === 0; const prevRes = isFirstRow ? currentQuestion.stepData?.start : currentQuestion.stepData?.steps[idx - 1].res;
                  return (
                    <React.Fragment key={idx}>
                      {isFirstRow ? ( <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">{prevRes}</div> ) : ( <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center bg-white">{renderMultiInputCell(`step-${idx}-start`, prevRes as number, false, undefined, "w-full h-full border-none rounded-none")}</div> )}
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">{currentQuestion.stepData?.operator}</div>
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center bg-white">{renderMultiInputCell(`step-${idx}-add`, step.val, false, undefined, "w-full h-full border-none rounded-none")}</div>
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">=</div>
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center bg-white">{renderMultiInputCell(`step-${idx}-res`, step.res, false, undefined, "w-full h-full border-none rounded-none")}</div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full mb-6 flex justify-center text-center">
              {typeof currentQuestion.text === "string" ? (<div className="text-2xl sm:text-5xl font-extrabold text-slate-800">{currentQuestion.text}</div>) : (currentQuestion.text)}
            </div>
            
            {/* Standard Eingabefeld (wird bei Multiple-Choice ausgeblendet) */}
            {!currentQuestion.mcOptions && !currentQuestion.isCompare && (
                <div className={`w-64 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-5xl font-mono font-bold tracking-widest border-4 ${feedback === "none" ? "border-slate-200" : feedback === "correct" ? "border-green-500 text-green-600 bg-white" : "border-red-500 text-red-600 bg-white"}`}>
                  <input type="text" inputMode="none" value={input} onChange={(e) => handleInputChange(null, e.target.value)} className="w-full h-full text-center bg-transparent outline-none" />
                </div>
            )}

            {/* Multiple Choice Buttons */}
            {currentQuestion.mcOptions && (
                <div className="grid grid-cols-2 gap-3 w-full max-w-md mt-4">
                    {currentQuestion.mcOptions.map((opt, idx) => (
                        <button 
                            key={idx} 
                            onClick={() => handleMCOptionClick(opt)}
                            disabled={feedback !== "none"}
                            className={`py-4 px-2 rounded-xl text-xl sm:text-2xl font-bold shadow-md border-b-4 transition-all ${
                                feedback === "none" ? "bg-white text-slate-700 border-slate-200 hover:bg-blue-50 active:scale-95" 
                                : input === opt && feedback === "wrong" ? "bg-red-100 text-red-600 border-red-300"
                                : opt === currentQuestion.answer.toString() && feedback === "wrong" ? "bg-green-100 text-green-700 border-green-400 animate-pulse"
                                : opt === currentQuestion.answer.toString() && feedback === "correct" ? "bg-green-500 text-white border-green-700 scale-105"
                                : "bg-slate-50 text-slate-400 border-slate-200 opacity-50"
                            }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}

            {feedback === "wrong" && !currentQuestion.mcOptions && !currentQuestion.isCompare && (
              <div className="text-green-600 font-bold text-xl mt-4 bg-green-50 px-4 py-2 rounded-xl border-2 border-green-200 animate-pulse">
                Lösung: {currentQuestion.isDecimal ? ((currentQuestion.answer as number) / 100).toFixed(2).replace(".", ",") + " €" : currentQuestion.answer}
              </div>
            )}
          </>
        )}
        {feedback === "wrong" && (
          <div className="mt-6 z-20">
            <button onClick={() => { setShowHelpModal(false); nextQuestion(correctCount); }} className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
              <ArrowRight /> Weiter
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderNumPad = () => {
    // Verstecke Numpad komplett bei Multiple Choice oder bei Shopping
    if (currentQuestion?.mcOptions || mode === "shopping") return null;

    // Spezielles Numpad für Vergleiche (<, =, >)
    if (currentQuestion?.isCompare) {
        return (
            <div className="grid grid-cols-3 gap-3 h-48 shrink-0 mt-2">
              <button onClick={() => handleNumPad("<")} className="bg-white text-blue-600 text-5xl font-bold rounded-2xl shadow border-b-4 border-slate-200 active:border-t-4 active:border-b-0">{"<"}</button>
              <button onClick={() => handleNumPad("=")} className="bg-white text-slate-600 text-5xl font-bold rounded-2xl shadow border-b-4 border-slate-200 active:border-t-4 active:border-b-0">{"="}</button>
              <button onClick={() => handleNumPad(">")} className="bg-white text-red-600 text-5xl font-bold rounded-2xl shadow border-b-4 border-slate-200 active:border-t-4 active:border-b-0">{">"}</button>
              <button onClick={() => handleNumPad("DEL")} className="bg-red-50 text-red-500 text-2xl font-bold rounded-2xl shadow border-b-4 border-red-100 active:border-t-4 active:border-b-0">⌫</button>
              <button onClick={() => checkAnswer()} className="col-span-2 bg-green-500 text-white text-3xl font-bold rounded-2xl shadow border-b-4 border-green-700 active:border-t-4 active:border-b-0">OK</button>
            </div>
        );
    }

    // Standard Numpad
    return (
      <div className="grid grid-cols-3 gap-3 h-64 shrink-0 mt-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button key={num} onClick={() => handleNumPad(num.toString())} className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow border-b-4 border-slate-200 active:border-t-4 active:border-b-0">{num}</button>
        ))}
        <button onClick={() => handleNumPad("DEL")} className="bg-red-50 text-red-500 text-2xl font-bold rounded-2xl shadow border-b-4 border-red-100 active:border-t-4 active:border-b-0">⌫</button>
        <button onClick={() => handleNumPad("0")} className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow border-b-4 border-slate-200 active:border-t-4 active:border-b-0">0</button>
        {currentQuestion?.isDecimal || typeof currentQuestion?.answer === 'string' ? (
          <button onClick={() => handleNumPad(",")} className="bg-slate-100 text-slate-700 text-2xl font-bold rounded-2xl border-b-4 border-slate-300">,</button>
        ) : (
          <button onClick={mode.includes("gap") ? jumpToNextField : () => checkAnswer()} className="bg-green-500 text-white text-2xl font-bold rounded-2xl shadow border-b-4 border-green-700 active:border-t-4 active:border-b-0">OK</button>
        )}
        {(currentQuestion?.isDecimal || typeof currentQuestion?.answer === 'string') && feedback === "none" && (
          <button onClick={() => checkAnswer()} className="col-span-3 bg-green-500 text-white font-bold rounded-2xl shadow border-b-4 border-green-700 py-2 mt-1">OK</button>
        )}
      </div>
    );
  };

  // --- VIEWS ---
  if (mode === "menu") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans safe-area-inset">
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-3xl text-center relative overflow-hidden">
          
          <div className="absolute top-4 right-4 flex gap-2 z-20">
            <button onClick={() => setShowSettingsModal(true)} className="bg-slate-100 p-2 rounded-full shadow text-slate-500 hover:text-slate-700 transition-colors" title="Einstellungen"><Settings size={20} /></button>
            <button onClick={() => setMode("history")} className="bg-slate-100 p-2 rounded-full shadow text-blue-500 hover:text-blue-700 transition-colors" title="Auswertung & Verlauf"><History size={20} /></button>
            <button onClick={() => setSoundEnabled(!soundEnabled)} className="bg-slate-100 p-2 rounded-full shadow text-slate-400 hover:text-slate-600 transition-colors" title="Ton umschalten">{soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
          </div>

          <div className="flex items-center justify-center gap-3 mb-6 mt-4">
            <div className="bg-yellow-400 p-2 rounded-full shadow-md rotate-12"><Star className="w-8 h-8 text-white" fill="white" /></div>
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Mathe Profi</h1>
          </div>

          {isOffline && (
            <div className="mb-4 flex justify-center">
              {offlineReady ? (
                <div className="bg-green-100 border border-green-300 text-green-900 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">✅ Offline verfügbar</div>
              ) : (
                <div className="bg-red-100 border border-red-300 text-red-900 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">❌ Nicht komplett offline verfügbar</div>
              )}
            </div>
          )}

          <div className="overflow-y-auto px-1 max-h-[70vh]">
            <CategorySection title="Klasse 3: Raum & Größen" cat="grade3" modes={["cube_buildings", "geometry_shapes", "geometry_riddles", "units_length", "units_weight", "compare_units", "realistic_sizes", "word_problem_units"]} onStart={startGame} />
            <CategorySection title="Rechnen & Knobeln" cat="calc" modes={["addition_1000", "subtraction_1000", "gap_add", "gap_sub", "multiplication", "division", "division_remainder", "inverse_calc", "addition", "subtraction", "pyramid", "estimation"]} onStart={startGame} />
            <CategorySection title="Geld & Sachaufgaben" cat="money" modes={["money_count", "money_compare", "money_calc", "money_pay", "shopping", "word_problem"]} onStart={startGame} />
          </div>

          {/* EINSTELLUNGEN MODAL */}
          {showSettingsModal && (
            <div className="absolute inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-left">
                <div className="p-4 bg-slate-100 flex justify-between items-center border-b border-slate-200"><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Settings className="text-slate-500" /> Einstellungen</h2><button onClick={() => setShowSettingsModal(false)} className="bg-slate-200 p-1.5 rounded-full text-slate-600 hover:bg-slate-300"><X size={20} /></button></div>
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
                  <div>
                    <h3 className="font-bold text-slate-700 mb-2">Schwierigkeitsgrad (Global)</h3>
                    <div className="flex gap-2">{[1, 2, 3].map(level => ( <button key={`diff-${level}`} onClick={() => setSettings({ ...settings, difficulty: level as 1|2|3 })} className={`flex-1 py-2 rounded-xl font-bold border-2 transition-colors ${settings.difficulty === level ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{level === 1 ? "Einfach" : level === 2 ? "Normal" : "Schwer"}</button> ))}</div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700 mb-2">Baupläne Rastergröße</h3>
                    <div className="flex flex-wrap gap-2">{["random", "2x4", "3x3", "3x4", "4x4"].map(size => ( <button key={`grid-${size}`} onClick={() => setSettings({ ...settings, cubeGridSize: size as AppSettings["cubeGridSize"] })} className={`px-4 py-2 rounded-xl font-bold border-2 transition-colors ${settings.cubeGridSize === size ? 'bg-orange-500 text-white border-orange-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{size === "random" ? "Zufall" : size}</button> ))}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- HISTORY VIEW ---
  if (mode === "history") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col p-4 font-sans safe-area-inset">
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-3xl mx-auto flex flex-col h-full">
          <div className="flex justify-between items-center mb-6">
            <button onClick={() => setMode("menu")} className="bg-slate-100 p-3 rounded-xl shadow text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2 font-bold"><Home size={20} /> Zurück</button>
            <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"><History className="text-blue-500" /> Verlauf</h2>
            <button onClick={clearHistory} className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-100 transition-colors flex items-center gap-2 font-bold text-sm"><Trash2 size={16} /> Löschen</button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400"><History size={48} className="mb-4 opacity-50" /><p>Noch keine Runden gespielt.</p></div>
            ) : (
              <div className="grid gap-3">{history.map((entry) => ( <div key={entry.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div className="flex items-center gap-4"><div className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl text-white ${entry.score === entry.total ? 'bg-green-500' : entry.score > entry.total / 2 ? 'bg-yellow-500' : 'bg-red-500'}`}>{entry.score}/{entry.total}</div><div><div className="font-bold text-slate-800 text-lg">{entry.mode}</div><div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs font-medium text-slate-500 mt-1"><span className="flex items-center gap-1"><CalendarDays size={14} /> {entry.timestamp}</span><span className="flex items-center gap-1"><Clock size={14} /> Ø {entry.avgTime}s pro Aufgabe</span></div></div></div></div> ))}</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isRoundOver) {
    const percentage = (correctCount / QUESTIONS_PER_ROUND) * 100; const isPerfect = correctCount === QUESTIONS_PER_ROUND;
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {isPerfect && <PerfectScoreAnimation />}
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center relative z-10">
          <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4" /><h2 className="text-3xl font-bold mb-2">{percentage === 100 ? "Perfekt!" : "Gut gemacht!"}</h2>
          <div className="text-4xl font-black text-slate-800 mb-6">{correctCount} / {QUESTIONS_PER_ROUND}</div>
          <button onClick={() => setMode("menu")} className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl shadow mb-3">Zum Menü</button>
          <button onClick={() => setMode("history")} className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-xl shadow hover:bg-slate-200">Verlauf ansehen</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col p-4 font-sans safe-area-inset overflow-hidden">
      <div className="flex justify-between items-center mb-4 relative z-20">
        <button onClick={() => setMode("menu")} className="bg-white p-3 rounded-xl shadow text-slate-600 hover:bg-slate-50 transition-colors"><Home className="w-6 h-6" /></button>
        <div className="flex flex-col items-center"><div className={`px-3 py-1 rounded-full text-xs font-bold text-white mb-1 ${currentModeInfo.color}`}>{currentModeInfo.name}</div><div className="text-2xl font-black text-slate-700">{questionIndex} <span className="text-lg text-slate-400">/ {QUESTIONS_PER_ROUND}</span></div></div>
        <div className="flex gap-2">
          <button onClick={() => setShowHelpModal(!showHelpModal)} className={`bg-white p-2 rounded-xl shadow transition-colors flex items-center justify-center ${showHelpModal ? 'text-blue-500 bg-blue-50 ring-2 ring-blue-300' : 'text-slate-400 hover:text-blue-400'}`}><HelpCircle className="w-6 h-6" /></button>
          <div className="bg-white px-3 py-2 rounded-xl shadow flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" fill="currentColor" /><span className="font-bold text-slate-700 text-xl">{correctCount}</span></div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 relative z-10">
        <div className="flex flex-col flex-1 min-h-0 relative">
          {renderGameContent()}
          {feedback !== "correct" && mode !== "money_pay" && renderNumPad()}
          {feedback !== "correct" && mode === "money_pay" && (
            <div className="mt-4">
              <button onClick={() => checkAnswer()} className="w-full bg-green-500 text-white text-2xl font-bold rounded-2xl shadow border-b-4 border-green-700 py-4 active:scale-95 active:border-b-0">OK</button>
            </div>
          )}
        </div>
        <div className="w-full lg:w-1/3 h-64 lg:h-auto min-h-[250px] lg:min-h-0 flex flex-col">
          <ScratchPad clearTrigger={questionIndex} />
        </div>
      </div>
    </div>
  );
}