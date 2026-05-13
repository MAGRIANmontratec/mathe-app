import React, { useState, useEffect, useRef } from "react";
import {
  Star,
  ArrowRight,
  Trophy,
  Home,
  Volume2,
  VolumeX,
  LayoutGrid,
  Pyramid,
  ShoppingBag,
  ListOrdered,
  GripHorizontal,
  AlignCenterHorizontal,
  GitCommitHorizontal,
  TrendingUp,
  Box,
  Users,
  BookOpen,
  Layers,
  Triangle,
  CircleDashed,
  Target,
  Calculator,
  Trash2,
  Scale,
  Coins,
  Divide,
  RefreshCw,
  Banknote,
} from "lucide-react";

// --- KONFIGURATION ---
const QUESTIONS_PER_ROUND = 10;
const OFFLINE_READY_KEY = "mathe_offline_ready";

// --- HELPER FUNCTIONS ---
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const playSound = (type, enabled) => {
  if (!enabled) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
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

const getModeInfo = (m) => {
  switch (m) {
    case "multiplication": return { name: "1x1", icon: "✖️", color: "bg-blue-500", border: "border-blue-700" };
    case "division": return { name: "Geteilt", icon: "➗", color: "bg-emerald-500", border: "border-emerald-700" };
    case "division_remainder": return { name: "Rest", icon: <Divide size={20} />, color: "bg-emerald-600", border: "border-emerald-800", isNew: true };
    case "inverse_calc": return { name: "Probe", icon: <RefreshCw size={20} />, color: "bg-blue-600", border: "border-blue-800", isNew: true };
    case "addition": return { name: "Plus", icon: "➕", color: "bg-orange-500", border: "border-orange-700" };
    case "subtraction": return { name: "Minus", icon: "➖", color: "bg-red-500", border: "border-red-700" };
    case "gap_add": return { name: "Lücken +", icon: "❓", color: "bg-amber-500", border: "border-amber-700", isNew: true };
    case "gap_sub": return { name: "Lücken -", icon: "❓", color: "bg-rose-500", border: "border-rose-700", isNew: true };
    case "addition_1000": return { name: "Plus 1000", icon: <Calculator size={20} />, color: "bg-orange-600", border: "border-orange-800" };
    case "subtraction_1000": return { name: "Minus 1000", icon: <Calculator size={20} />, color: "bg-red-600", border: "border-red-800" };
    case "estimation": return { name: "Überschlag", icon: <Scale size={20} />, color: "bg-purple-600", border: "border-purple-800", isNew: true };
    case "triangle_add": return { name: "Dreieck +", icon: <Triangle size={20} />, color: "bg-teal-600", border: "border-teal-800" };
    case "rounding": return { name: "Runden", icon: <Target size={20} />, color: "bg-cyan-500", border: "border-cyan-700" };
    case "pyramid": return { name: "Mauer", icon: <Pyramid size={20} />, color: "bg-indigo-500", border: "border-indigo-700" };
    case "calc_table": return { name: "Tabelle", icon: <LayoutGrid size={20} />, color: "bg-cyan-600", border: "border-cyan-800" };
    case "fact_family": return { name: "Familie", icon: <Users size={20} />, color: "bg-fuchsia-500", border: "border-fuchsia-700" };
    case "triangle": return { name: "Dreieck", icon: <Triangle size={20} />, color: "bg-teal-500", border: "border-teal-700" };
    case "calc_wheel": return { name: "Rad", icon: <CircleDashed size={20} />, color: "bg-rose-600", border: "border-rose-800" };
    case "neighbors": return { name: "Nachbarn", icon: <GripHorizontal size={20} />, color: "bg-teal-600", border: "border-teal-800" };
    case "sequences": return { name: "Folgen", icon: <ListOrdered size={20} />, color: "bg-lime-600", border: "border-lime-800" };
    case "chain": return { name: "Kette", icon: <GitCommitHorizontal size={20} />, color: "bg-violet-600", border: "border-violet-800" };
    case "sorting": return { name: "Ordnen", icon: <TrendingUp size={20} />, color: "bg-sky-600", border: "border-sky-800" };
    case "number_line": return { name: "Strahl", icon: <AlignCenterHorizontal size={20} />, color: "bg-indigo-400", border: "border-indigo-600" };
    case "place_value": return { name: "Stellen", icon: <Box size={20} />, color: "bg-blue-600", border: "border-blue-800" };
    case "money_count": return { name: "Zählen", icon: "💰", color: "bg-yellow-500", border: "border-yellow-700" };
    case "money_calc": return { name: "Rechnen €", icon: <Coins size={20} />, color: "bg-emerald-600", border: "border-emerald-800", isNew: true };
    case "money_compare": return { name: "Vergleich", icon: <Scale size={20} />, color: "bg-sky-500", border: "border-sky-700", isNew: true };
    case "money_pay": return { name: "Bezahlen", icon: <Banknote size={20} />, color: "bg-green-600", border: "border-green-800", isNew: true };
    case "shopping": return { name: "Einkaufen", icon: <ShoppingBag size={20} />, color: "bg-rose-500", border: "border-rose-700" };
    case "word_problem": return { name: "Lesen", icon: <BookOpen size={20} />, color: "bg-amber-500", border: "border-amber-700" };
    
    // KATEGORIEN KLASSE 3
    case "cube_buildings": return { name: "Baupläne", icon: <Box size={20} />, color: "bg-orange-600", border: "border-orange-800", isNew: true };
    case "geometry_shapes": return { name: "Körper", icon: "🧊", color: "bg-indigo-600", border: "border-indigo-800", isNew: true };
    case "units_length": return { name: "Längen", icon: "📏", color: "bg-emerald-600", border: "border-emerald-800", isNew: true };
    case "units_weight": return { name: "Gewicht", icon: <Scale size={20} />, color: "bg-rose-600", border: "border-rose-800", isNew: true };
    case "word_problem_units": return { name: "Sachrechnen", icon: <BookOpen size={20} />, color: "bg-cyan-600", border: "border-cyan-800", isNew: true };

    default: return { name: m, icon: "🎮", color: "bg-slate-500", border: "border-slate-700" };
  }
};

// --- SUB-COMPONENTS ---

const Coin = ({ value, size = "md", onClick, selected }) => {
  let sizeClass = size === "sm" ? "w-8 h-8 text-[10px]" : "w-10 h-10 sm:w-14 sm:h-14 text-sm sm:text-base";
  let bg = "bg-amber-700";
  let text = "text-white";
  let border = "border-amber-900";
  let content = `${value}`;
  let unit = <span className="opacity-80 ml-0.5">ct</span>;
  if (value >= 10 && value <= 50) {
    bg = "bg-yellow-500";
    text = "text-yellow-900";
    border = "border-yellow-700";
    if (value === 50 && size !== "sm") sizeClass = "w-12 h-12 sm:w-16 sm:h-16";
  } else if (value >= 100) {
    bg = "bg-slate-300 ring-2 ring-yellow-500";
    text = "text-slate-800";
    border = "border-slate-500";
    sizeClass = size === "sm" ? "w-10 h-10" : "w-12 h-12 sm:w-16 sm:h-16";
    content = value === 100 ? "1" : "2";
    unit = <span className="ml-0.5">€</span>;
  }
  return (
    <div
      onClick={onClick}
      className={`${sizeClass} ${bg} rounded-full flex items-center justify-center font-bold shadow-md border-b-2 sm:border-b-4 ${border} ${text} shrink-0 ${
        onClick ? "cursor-pointer active:scale-95" : ""
      } ${selected ? "ring-4 ring-blue-400 scale-110" : ""}`}
    >
      {content}{unit}
    </div>
  );
};

const Bill = ({ value, size = "md", onClick, selected }) => {
  let color = "bg-slate-400";
  if (value === 5) color = "bg-neutral-400 text-neutral-800 border-neutral-500";
  if (value === 10) color = "bg-red-400 text-red-900 border-red-600";
  if (value === 20) color = "bg-blue-400 text-blue-900 border-blue-600";
  if (value === 50) color = "bg-orange-400 text-orange-900 border-orange-600";
  const dim = size === "sm" ? "w-16 h-8 text-sm" : "w-24 h-12 sm:w-32 sm:h-16 text-lg sm:text-2xl";
  return (
    <div
      onClick={onClick}
      className={`${color} ${dim} rounded-sm border-b-2 sm:border-b-4 shadow-lg flex items-center justify-between px-2 sm:px-3 font-bold relative overflow-hidden transform hover:-rotate-1 transition-transform ${
        onClick ? "cursor-pointer active:scale-95" : ""
      } ${selected ? "ring-4 ring-blue-400 scale-105" : ""}`}
    >
      <div className="flex flex-col leading-none">
        <span className="text-[6px] sm:text-[8px] opacity-70 uppercase tracking-widest">Euro</span>
        <span>{value}</span>
      </div>
      <div className="text-xl sm:text-4xl opacity-20 absolute right-2 top-1">€</div>
    </div>
  );
};

const ScratchPad = ({ clearTrigger }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#334155";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [clearTrigger]);

  const startDrawing = (e) => {
    setIsDrawing(true);
    draw(e);
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.beginPath();
  };
  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  return (
    <div className="flex flex-col h-full bg-yellow-50 rounded-3xl shadow-inner border-4 border-yellow-200 relative overflow-hidden">
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 pointer-events-none">
        <span className="text-yellow-800/30 font-bold uppercase text-xs tracking-widest ml-2">Notizblock</span>
        <button
          onClick={() => {
            const ctx = canvasRef.current?.getContext("2d");
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }}
          className="p-1.5 bg-white/80 rounded-full shadow text-red-400 hover:text-red-600 transition-colors pointer-events-auto"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-full touch-none cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchEnd={stopDrawing}
        onTouchMove={draw}
      />
    </div>
  );
};

const CategorySection = ({ title, modes, cat, onStart }) => (
  <div className="bg-slate-50 rounded-2xl p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">{title}</h3>
      <button
        onClick={() => onStart(cat)}
        className="text-xs bg-slate-800 text-white px-3 py-1 rounded-full font-bold shadow hover:bg-slate-700 active:scale-95 flex items-center gap-1"
      >
        <Layers size={12} /> Alles mischen
      </button>
    </div>
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {modes.map((m) => {
        const info = getModeInfo(m);
        return (
          <button
            key={m}
            onClick={() => onStart(m)}
            className={`${info.color} text-white py-3 rounded-xl shadow active:scale-95 flex flex-col items-center gap-1 border-b-4 ${info.border} relative`}
          >
            {info.isNew && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm animate-bounce">
                NEU
              </span>
            )}
            <span className="text-xl">{info.icon}</span>
            <span className="text-[10px] sm:text-xs font-bold text-center px-1 leading-tight">{info.name}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// Schrägbild-Rendering für Würfelgebäude (Kabinettprojektion)
const IsometricCubes = ({ grid }) => {
  const size = 28;
  const depthX = 14;
  const depthY = 14;
  const rows = grid.length;
  const cols = grid[0].length;
  
  const cubes = [];
  // Zeichnen von hinten (r=0) nach vorne (r=rows-1),
  // und von links (c=0) nach rechts (c=cols-1)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = grid[r][c];
      for (let z = 0; z < h; z++) {
        cubes.push({ r, c, z });
      }
    }
  }
  
  return (
    <svg viewBox="-20 -150 200 180" className="w-48 h-48 sm:w-64 sm:h-64 mx-auto overflow-visible drop-shadow-md">
      {cubes.map((cube, i) => {
        const { r, c, z } = cube;
        const d = rows - 1 - r; // Tiefe (0 für vorderste Reihe)
        const x = c * size + d * depthX;
        const y = -z * size - d * depthY;
        
        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            {/* Obere Seite */}
            <polygon points={`0,0 ${depthX},${-depthY} ${size+depthX},${-depthY} ${size},0`} fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Rechte Seite */}
            <polygon points={`${size},0 ${size+depthX},${-depthY} ${size+depthX},${-depthY+size} ${size},${size}`} fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
            {/* Vordere Seite */}
            <polygon points={`0,0 ${size},0 ${size},${size} 0,${size}`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
          </g>
        );
      })}
    </svg>
  );
};

// Durchsichtige geometrische Körper (Drahtgitter / Blueprint)
const ShapePreview = ({ type }) => {
  let content = null;
  const stroke = "#3b82f6"; // Blau für Vorderkanten
  const strokeBack = "#93c5fd"; // Hellblau für Rückkanten
  const fill = "rgba(239, 246, 255, 0.4)"; // Leicht durchsichtige Flächen
  
  if (type === "cube" || type === "cuboid") {
     const h = type === "cube" ? 60 : 40;
     const w = type === "cube" ? 60 : 90;
     const d = type === "cube" ? 30 : 40; 
     content = (
       <g transform={`translate(${type === "cube" ? 25 : 10}, ${type === "cube" ? 40 : 50})`}>
         {/* Gestrichelte Kanten hinten */}
         <polyline points={`0,0 ${d},${-d} ${w+d},${-d}`} fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <line x1={d} y1={-d} x2={d} y2={h-d} stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <line x1={d} y1={h-d} x2={0} y2={h} stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <line x1={d} y1={h-d} x2={w+d} y2={h-d} stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         
         {/* Vordere Flächen (transparent) */}
         <polygon points={`0,0 ${w},0 ${w},${h} 0,${h}`} fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
         <polygon points={`0,0 ${d},${-d} ${w+d},${-d} ${w},0`} fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
         <polygon points={`${w},0 ${w+d},${-d} ${w+d},${h-d} ${w},${h}`} fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
       </g>
     );
  } else if (type === "cylinder") {
     content = (
       <g transform="translate(45, 25)">
         {/* Untere Rückkante (gestrichelt) */}
         <path d="M0,70 A40,15 0 0,1 80,70" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         {/* Zylinder-Mantel */}
         <path d="M0,0 L0,70 A40,15 0 0,0 80,70 L80,0 Z" fill={fill} stroke={stroke} strokeWidth="3" />
         {/* Deckfläche */}
         <ellipse cx="40" cy="0" rx="40" ry="15" fill={fill} stroke={stroke} strokeWidth="3" />
       </g>
     );
  } else if (type === "pyramid") {
     content = (
       <g transform="translate(25, 95)">
         {/* Hintere Grundkanten */}
         <polyline points="0,0 65,-20 110,0" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         {/* Kante hinten zur Spitze */}
         <line x1="65" y1="-20" x2="55" y2="-85" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         
         {/* Vordere Grundkanten */}
         <polyline points="0,0 45,20 110,0" fill="none" stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
         
         {/* Vordere Seitenflächen */}
         <polygon points="0,0 45,20 55,-85" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
         <polygon points="45,20 110,0 55,-85" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
       </g>
     );
  } else if (type === "sphere") {
     content = (
       <g transform="translate(70, 60)">
         <circle cx="0" cy="0" r="50" fill={fill} stroke={stroke} strokeWidth="3" />
         {/* Äquator & Meridian (hinten gestrichelt) */}
         <path d="M-50,0 A50,15 0 0,1 50,0" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <path d="M-50,0 A50,15 0 0,0 50,0" fill="none" stroke={stroke} strokeWidth="3" />
         <path d="M0,-50 A15,50 0 0,1 0,50" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         <path d="M0,-50 A15,50 0 0,0 0,50" fill="none" stroke={stroke} strokeWidth="3" />
       </g>
     );
  } else if (type === "cone") {
     content = (
       <g transform="translate(30, 95)">
         {/* Hintere Bogenkante */}
         <path d="M0,0 A40,15 0 0,1 80,0" fill="none" stroke={strokeBack} strokeWidth="2.5" strokeDasharray="5,5" />
         {/* Vorderer Kegelmantel */}
         <path d="M0,0 A40,15 0 0,0 80,0 L40,-80 Z" fill={fill} stroke={stroke} strokeWidth="3" strokeLinejoin="round" />
       </g>
     );
  }

  return <svg viewBox="0 0 140 120" className="w-32 h-32 sm:w-48 sm:h-48 mx-auto drop-shadow-sm">{content}</svg>;
};


// --- MAIN APP ---

export default function App() {
  const [mode, setMode] = useState("menu");
  const [activeCategory, setActiveCategory] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineReady, setOfflineReady] = useState(localStorage.getItem(OFFLINE_READY_KEY) === "1");

  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [input, setInput] = useState("");
  const [multiInputs, setMultiInputs] = useState({});
  const [activeCellId, setActiveCellId] = useState(null);
  const [selectedMoney, setSelectedMoney] = useState([]);
  const [feedback, setFeedback] = useState("none");
  const [questionIndex, setQuestionIndex] = useState(1);
  const [correctCount, setCorrectCount] = useState(0);
  const [isRoundOver, setIsRoundOver] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [responseTimes, setResponseTimes] = useState([]);

  useEffect(() => {
    const updateStatus = () => {
      const online = navigator.onLine;
      setIsOffline(!online);
      if (online) {
        localStorage.setItem(OFFLINE_READY_KEY, "1");
        setOfflineReady(true);
      }
    };
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  const generateQuestion = (targetMode) => {
    let q = { text: "", answer: 0 };
    setMultiInputs({});
    setActiveCellId(null);
    setInput("");
    setSelectedMoney([]);

    if (targetMode === "multiplication") {
      const a = rand(2, 9), b = rand(2, 9);
      q = { text: `${a} · ${b} = ?`, answer: a * b };
    } else if (targetMode === "division") {
      const divisor = rand(2, 9), result = rand(2, 10);
      q = { text: `${divisor * result} : ${divisor} = ?`, answer: result };
    } else if (targetMode === "addition_1000") {
        const a = rand(100, 500), b = rand(100, 450);
        q = { text: `${a} + ${b} = ?`, answer: a + b };
    } else if (targetMode === "subtraction_1000") {
        const a = rand(500, 999), b = rand(100, 450);
        q = { text: `${a} - ${b} = ?`, answer: a - b };
    } else if (targetMode === "pyramid") {
      const b1 = rand(1, 10), b2 = rand(1, 10), b3 = rand(1, 10);
      const cells = [
        { id: "s0", val: b1, isGiven: true },
        { id: "s1", val: b2, isGiven: true },
        { id: "s2", val: b3, isGiven: true },
        { id: "s3", val: b1 + b2, isGiven: false },
        { id: "s4", val: b2 + b3, isGiven: false },
        { id: "s5", val: b1 + b2 + b2 + b3, isGiven: false },
      ];
      q = { text: "Fülle die Mauer", answer: 0, gridData: { cells, type: "pyramid" } };
      setActiveCellId("s3");
    } else if (targetMode === "money_count") {
      const items = [{ val: 500, type: "note" }, { val: 200, type: "coin" }, { val: 50, type: "coin" }];
      q = {
        text: (
          <div className="flex flex-wrap gap-2 justify-center">
            <Bill value={5} /> <Coin value={200} /> <Coin value={50} />
          </div>
        ),
        answer: 750,
        isDecimal: true
      };
    } else if (targetMode === "cube_buildings") {
      const rows = rand(2, 3);
      const cols = rand(2, 4);
      const g = [];
      const cells = [];
      
      for (let r = 0; r < rows; r++) {
        const row = [];
        for (let c = 0; c < cols; c++) {
          // Bedingung: Höhere Würfel immer hinten!
          let maxH = r === 0 ? rand(1, 4) : g[r-1][c];
          let h = rand(0, maxH);
          row.push(h);
          cells.push({ id: `cube-${r}-${c}`, val: h, isGiven: false });
        }
        g.push(row);
      }
      
      // Verhindere komplett leere Aufgaben
      if (g[0][0] === 0) {
          g[0][0] = 1;
          cells[0].val = 1;
      }

      q = {
        text: (
          <div className="flex flex-col items-center">
            <IsometricCubes grid={g} />
          </div>
        ),
        answer: 0,
        gridData: { cells, type: "cube_plan", meta: { rows, cols } }
      };
    } else if (targetMode === "geometry_shapes") {
      const shapes = [
        { id: "cube", name: "Würfel", ecken: 8, kanten: 12, flächen: 6 },
        { id: "cuboid", name: "Quader", ecken: 8, kanten: 12, flächen: 6 },
        { id: "cylinder", name: "Zylinder", ecken: 0, kanten: 2, flächen: 3 },
        { id: "pyramid", name: "quadratische Pyramide", ecken: 5, kanten: 8, flächen: 5 },
        { id: "sphere", name: "Kugel", ecken: 0, kanten: 0, flächen: 1 },
        { id: "cone", name: "Kegel", ecken: 1, kanten: 1, flächen: 2 }
      ];
      const s = shapes[rand(0, shapes.length - 1)];
      const props = ["ecken", "kanten", "flächen"];
      const p = props[rand(0, 2)];
      const capP = p.charAt(0).toUpperCase() + p.slice(1);
      q = { 
        text: (
            <div className="flex flex-col items-center">
                <ShapePreview type={s.id} />
                <div className="text-4xl sm:text-5xl font-black text-slate-800 mt-6 mb-2">{s.name}</div>
                <div className="text-2xl text-slate-600">Wie viele <span className="text-blue-600 font-bold">{capP}</span>?</div>
            </div>
        ), 
        answer: s[p] 
      };
    } else if (targetMode === "units_length") {
      const type = rand(1, 5);
      if (type === 1) { const a = rand(2, 15); q = { text: `${a} cm = ? mm`, answer: a * 10 }; }
      else if (type === 2) { const a = rand(2, 15); q = { text: `${a * 10} mm = ? cm`, answer: a }; }
      else if (type === 3) { const a = rand(2, 9); q = { text: `${a} m = ? cm`, answer: a * 100 }; }
      else if (type === 4) { const a = rand(2, 15); q = { text: `${a} km = ? m`, answer: a * 1000 }; }
      else { const a = rand(1, 9) * 10; q = { text: <div className="text-center text-2xl sm:text-4xl font-bold">{a} cm + <span className="text-blue-500">? cm</span> = 1 m</div>, answer: 100 - a }; }
    } else if (targetMode === "units_weight") {
      const type = rand(1, 3);
      if (type === 1) { const a = rand(2, 15); q = { text: `${a} kg = ? g`, answer: a * 1000 }; }
      else if (type === 2) { const a = rand(2, 15); q = { text: `${a * 1000} g = ? kg`, answer: a }; }
      else { const a = rand(1, 9) * 100; q = { text: <div className="text-center text-2xl sm:text-4xl font-bold">{a} g + <span className="text-blue-500">? g</span> = 1 kg</div>, answer: 1000 - a }; }
    } else if (targetMode === "word_problem_units") {
      const problems = [
        { text: "Ein Brett ist 100 cm lang. Es werden 30 cm abgesägt. Wie lang ist es noch in cm?", ans: 70 },
        { text: "Tom wandert an 2 Tagen. Tag 1: 12 km, Tag 2: 9 km. Wie lang ist die Strecke insgesamt in km?", ans: 21 },
        { text: "In eine Tüte passen 500 g Äpfel. Wie viel Gramm Äpfel sind in 2 Tüten?", ans: 1000 },
        { text: "Anna springt 120 cm weit. Max springt 15 cm weiter. Wie viele cm springt Max?", ans: 135 },
        { text: "Ein Auto ist 4 m lang. Wie viele cm sind das?", ans: 400 },
        { text: "Ein LKW wiegt 3000 kg. Wie viele Tonnen (t) sind das? (Tipp: 1000 kg = 1 t)", ans: 3 }
      ];
      const prob = problems[rand(0, problems.length - 1)];
      q = {
        text: <div className="text-xl sm:text-3xl font-medium text-slate-700 leading-relaxed max-w-lg text-center px-4">{prob.text}</div>,
        answer: prob.ans
      };
    } else {
      const a = rand(10, 50), b = rand(10, 40);
      q = { text: `${a} + ${b} = ?`, answer: a + b };
    }

    setCurrentQuestion(q);
    setFeedback("none");
    setStartTime(Date.now());
  };

  const getNextMode = (cat) => {
    const cats = {
        calc: ["addition_1000", "subtraction_1000", "multiplication", "division", "pyramid"],
        space: ["neighbors", "sorting", "rounding"],
        money: ["money_count", "shopping", "money_pay"],
        grade3: ["cube_buildings", "geometry_shapes", "units_length", "units_weight", "word_problem_units"]
    };
    const pool = cat === "mixed" 
        ? [...cats.calc, ...cats.space, ...cats.money, ...cats.grade3] 
        : cats[cat];
    return pool[rand(0, pool.length - 1)];
  };

  const startGame = (target) => {
    setCorrectCount(0);
    setQuestionIndex(1);
    setIsRoundOver(false);
    setResponseTimes([]);
    
    let actualMode = target;
    if (["calc", "space", "money", "grade3", "mixed"].includes(target)) {
        setActiveCategory(target);
        actualMode = getNextMode(target);
    } else {
        setActiveCategory(null);
    }
    setMode(actualMode);
    generateQuestion(actualMode);
  };

  const handleInputChange = (id, val) => {
    const clean = val.replace(/[^0-9,]/g, "");
    if (id) setMultiInputs(p => ({ ...p, [id]: clean }));
    else setInput(clean);
  };

  const checkAnswer = () => {
    if (!currentQuestion) return;
    let correct = false;
    const parseNum = (s) => parseInt((s || "0").replace(",", ""));
    const parseMoney = (s) => Math.round(parseFloat((s || "0").replace(",", ".")) * 100);

    if (currentQuestion.gridData) {
        correct = currentQuestion.gridData.cells
            .filter(c => !c.isGiven)
            .every(c => {
                const u = multiInputs[c.id];
                const parsed = (u === "" || u === undefined) ? 0 : parseNum(u);
                return parsed === c.val;
            });
    } else if (currentQuestion.isDecimal) {
        correct = parseMoney(input) === currentQuestion.answer;
    } else {
        correct = parseNum(input) === currentQuestion.answer;
    }

    if (correct) {
      setFeedback("correct");
      playSound("correct", soundEnabled);
      setCorrectCount(c => c + 1);
      setTimeout(() => {
        if (questionIndex >= QUESTIONS_PER_ROUND) {
            setIsRoundOver(true);
        } else {
            setQuestionIndex(i => i + 1);
            if (activeCategory) {
                const nextMode = getNextMode(activeCategory);
                setMode(nextMode);
                generateQuestion(nextMode);
            } else {
                generateQuestion(mode);
            }
        }
      }, 1500);
    } else {
      setFeedback("wrong");
      playSound("wrong", soundEnabled);
    }
  };

  const renderMultiInputCell = (id, value, isGiven, customStyle) => {
    const isActive = activeCellId === id;
    const userInput = multiInputs[id];
    const parsedInput = (userInput === "" || userInput === undefined) ? 0 : parseInt(userInput);
    const isWrong = feedback === "wrong" && !isGiven && parsedInput !== value;
    
    let baseStyle = customStyle || "w-14 h-14 sm:w-16 sm:h-16 border-2 rounded-xl";
    let colorStyle = isGiven ? "bg-slate-200 border-slate-300 text-slate-500" :
                    isActive && feedback === "none" ? "bg-white border-blue-500 ring-4 ring-blue-100 scale-105 z-10" :
                    feedback === "correct" ? "bg-green-50 border-green-500 text-green-700" :
                    isWrong ? "bg-red-50 border-red-300 text-red-600" : "bg-white border-slate-300";

    return (
      <div key={id} className={`flex items-center justify-center font-bold text-lg sm:text-2xl transition-all shadow-sm relative ${baseStyle} ${colorStyle}`}>
        {isGiven ? <span>{value}</span> : (
          <input
            type="text"
            inputMode="numeric"
            value={userInput || ""}
            onChange={(e) => handleInputChange(id, e.target.value)}
            onFocus={() => feedback === "none" && setActiveCellId(id)}
            className="w-full h-full text-center bg-transparent outline-none cursor-pointer"
          />
        )}
        {isWrong && (
          <div className="text-[12px] sm:text-sm text-green-700 font-black absolute -bottom-6 bg-green-100 px-2 py-0.5 rounded-md shadow-sm z-20 whitespace-nowrap border border-green-400">
            {value}
          </div>
        )}
      </div>
    );
  };

  if (mode === "menu") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-3xl text-center relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-2">
                <div className="bg-yellow-400 p-2 rounded-full rotate-12 shadow-md"><Star className="text-white" fill="white" /></div>
                <h1 className="text-2xl font-black text-slate-800">Mathe Profi</h1>
             </div>
             <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 bg-slate-100 rounded-full text-slate-400">
               {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
             </button>
          </div>

          {isOffline && (
            <div className={`mb-4 rounded-xl px-4 py-2 text-sm font-bold border ${offlineReady ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              {offlineReady ? "✅ Offline bereit" : "❌ Nicht offline bereit"}
            </div>
          )}

          <div className="max-h-[70vh] overflow-y-auto pr-2">
            <CategorySection title="Klasse 3: Raum & Größen" cat="grade3" onStart={startGame} modes={["cube_buildings", "geometry_shapes", "units_length", "units_weight", "word_problem_units"]} />
            <CategorySection title="Rechnen" cat="calc" onStart={startGame} modes={["addition_1000", "subtraction_1000", "multiplication", "division", "pyramid"]} />
            <CategorySection title="Zahlenraum" cat="space" onStart={startGame} modes={["neighbors", "sorting", "rounding"]} />
            <CategorySection title="Geld" cat="money" onStart={startGame} modes={["money_count", "shopping", "money_pay"]} />
          </div>
        </div>
      </div>
    );
  }

  if (isRoundOver) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-sm w-full">
          <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-slate-800 mb-2">Fertig!</h2>
          <div className="text-5xl font-black text-blue-600 mb-8">{correctCount} / {QUESTIONS_PER_ROUND}</div>
          <button onClick={() => setMode("menu")} className="w-full bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-transform">
            Zum Menü
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col p-4 font-sans safe-area-inset">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => setMode("menu")} className="bg-white p-3 rounded-2xl shadow text-slate-400 hover:text-slate-600"><Home /></button>
        <div className="text-center">
            <div className={`text-xs font-bold uppercase tracking-wider text-white px-3 py-1 rounded-full mb-1 ${getModeInfo(mode).color}`}>{getModeInfo(mode).name}</div>
            <div className="text-2xl font-black text-slate-700">{questionIndex} <span className="text-slate-300">/ {QUESTIONS_PER_ROUND}</span></div>
        </div>
        <div className="bg-white px-4 py-2 rounded-2xl shadow flex items-center gap-2">
          <Star className="text-yellow-400" fill="currentColor" size={20} />
          <span className="font-black text-xl text-slate-700">{correctCount}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        <div className="flex-1 flex flex-col gap-6">
          <div className={`flex-1 bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center relative transition-colors ${feedback === 'correct' ? 'bg-green-50 ring-4 ring-green-200' : feedback === 'wrong' ? 'bg-red-50 ring-4 ring-red-200' : ''}`}>
            
            {currentQuestion?.gridData?.type === "cube_plan" ? (
              <div className="flex flex-col items-center gap-2 w-full">
                {currentQuestion.text}
                <div className="font-bold text-slate-600 mt-4">Trage den Bauplan ein</div>
                <div className="grid gap-1 bg-slate-200 p-2 rounded-xl shadow-inner mt-2" style={{ gridTemplateColumns: `repeat(${currentQuestion.gridData.meta.cols}, 1fr)` }}>
                  {currentQuestion.gridData.cells.map(c => renderMultiInputCell(c.id, c.val, false, "w-12 h-12 sm:w-16 sm:h-16 border-2 rounded-lg bg-white text-2xl"))}
                </div>
                <div className="text-xs text-slate-400 mt-2 font-medium">Tipp: Leere Felder kannst du frei lassen oder eine 0 eintragen.</div>
              </div>
            ) : currentQuestion?.gridData?.type === "pyramid" ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center">{renderMultiInputCell("s5", currentQuestion.gridData.cells[5].val, false, "w-20 h-14")}</div>
                <div className="flex gap-2">
                  {renderMultiInputCell("s3", currentQuestion.gridData.cells[3].val, false, "w-20 h-14")}
                  {renderMultiInputCell("s4", currentQuestion.gridData.cells[4].val, false, "w-20 h-14")}
                </div>
                <div className="flex gap-2">
                  {currentQuestion.gridData.cells.slice(0, 3).map(c => renderMultiInputCell(c.id, c.val, true, "w-20 h-14"))}
                </div>
              </div>
            ) : (
              <>
                <div className="text-4xl sm:text-6xl font-black text-slate-800 mb-8 text-center">{currentQuestion?.text}</div>
                <div className={`w-64 h-20 bg-slate-50 border-4 rounded-3xl flex items-center justify-center text-5xl font-mono font-bold ${feedback === 'none' ? 'border-slate-200' : feedback === 'correct' ? 'border-green-400 text-green-600 bg-white' : 'border-red-400 text-red-600 bg-white'}`}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={input}
                    onChange={(e) => handleInputChange(null, e.target.value)}
                    className="w-full h-full text-center bg-transparent outline-none"
                    autoFocus
                  />
                </div>
                {feedback === "wrong" && (
                  <div className="mt-6 text-xl sm:text-2xl font-bold text-green-700 bg-green-100 px-6 py-3 rounded-2xl border-2 border-green-400 shadow-sm animate-pulse">
                    Lösung: {currentQuestion.isDecimal ? (currentQuestion.answer / 100).toFixed(2).replace(".", ",") + " €" : currentQuestion.answer}
                  </div>
                )}
              </>
            )}
            
            {feedback === "wrong" && (
                <div className="mt-6 z-20">
                    <button onClick={() => { 
                      setQuestionIndex(i => i + 1); 
                      if (activeCategory) {
                        const nextMode = getNextMode(activeCategory);
                        setMode(nextMode);
                        generateQuestion(nextMode);
                      } else {
                        generateQuestion(mode);
                      }
                    }} className="bg-blue-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2">
                        Weiter <ArrowRight />
                    </button>
                </div>
            )}
          </div>

          {feedback !== "correct" && (
            <div className="grid grid-cols-3 gap-3 h-64 shrink-0">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                <button key={n} onClick={() => { 
                  if (activeCellId) {
                    const current = multiInputs[activeCellId] || "";
                    if (current.length < 2) handleInputChange(activeCellId, current + n);
                  } else {
                    setInput(p => p + n); 
                  }
                  playSound("click", soundEnabled); 
                }} className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow-md border-b-4 border-slate-200 active:border-b-0 active:translate-y-1">{n}</button>
              ))}
              <button onClick={() => {
                if (activeCellId) {
                  const current = multiInputs[activeCellId] || "";
                  handleInputChange(activeCellId, current.slice(0, -1));
                } else {
                  setInput(p => p.slice(0, -1));
                }
              }} className="bg-red-50 text-red-500 text-2xl font-bold rounded-2xl shadow-md border-b-4 border-red-100">⌫</button>
              <button onClick={() => {
                if (activeCellId) {
                  const current = multiInputs[activeCellId] || "";
                  if (current.length < 2) handleInputChange(activeCellId, current + "0");
                } else {
                  setInput(p => p + "0");
                }
              }} className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow-md border-b-4 border-slate-200">0</button>
              <button onClick={checkAnswer} className="bg-green-500 text-white text-2xl font-bold rounded-2xl shadow-md border-b-4 border-green-700">OK</button>
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 h-64 lg:h-auto min-h-[300px]">
          <ScratchPad clearTrigger={questionIndex} />
        </div>
      </div>
    </div>
  );
}