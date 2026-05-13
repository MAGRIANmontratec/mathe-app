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

// --- TYPEN ---
type Category = "calc" | "space" | "money" | "mixed";

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
  | "calc_table"
  | "fact_family"
  | "triangle"
  | "triangle_add"
  | "calc_wheel"
  | "estimation"
  // KATEGORIE: ZAHLENRAUM
  | "rounding"
  | "arrows"
  | "symbols"
  | "shapes"
  | "neighbors"
  | "sequences"
  | "sorting"
  | "number_line"
  | "chain"
  | "place_value"
  // KATEGORIE: GELD & SACH
  | "money_count"
  | "money_calc"
  | "money_compare"
  | "money_pay"
  | "shopping"
  | "word_problem";

type FeedbackType = "none" | "correct" | "wrong";

// Datenstrukturen
interface GridCell {
  id: string;
  val: number | string;
  isGiven: boolean;
  label?: string;
  x?: number;
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
interface PlaceValueData {
  h: number;
  z: number;
  e: number;
}
interface FactFamilyData {
  a: number;
  b: number;
  prod: number;
}
interface TriangleData {
  top: number;
  left: number;
  right: number;
  prodLeft: number;
  prodRight: number;
  prodBottom: number;
  sumLeft?: number;
  sumRight?: number;
  sumBottom?: number;
  mode: "mult" | "add";
}
interface WheelData {
  center: number;
  op: string;
  segments: { inner: number; outer: number }[];
}
interface MoneyCompareData {
  walletA: number[];
  walletB: number[];
  sumA: number;
  sumB: number;
  diff: number;
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
  answer: number;
  hint?: string;
  gridData?: {
    cells: GridCell[];
    type:
      | "shape"
      | "pyramid"
      | "calc_table"
      | "neighbors"
      | "sequence"
      | "sorting"
      | "number_line"
      | "chain";
    meta?: any;
  };
  stepData?: StepData;
  shoppingData?: ShoppingData;
  placeValueData?: PlaceValueData;
  factFamilyData?: FactFamilyData;
  triangleData?: TriangleData;
  wheelData?: WheelData;
  moneyCompareData?: MoneyCompareData;
  divisionData?: {
    dividend: number;
    divisor: number;
    quotient: number;
    remainder: number;
  };
  inverseData?: { a: number; b: number; add: number; result: number };
  estimationData?: EstimationData;
  payData?: { target: number };
  wordProblemAnswer?: number;
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

const getModeInfo = (m: string) => {
  switch (m) {
    case "multiplication":
      return {
        name: "1x1",
        icon: "✖️",
        color: "bg-blue-500",
        border: "border-blue-700",
      };
    case "division":
      return {
        name: "Geteilt",
        icon: "➗",
        color: "bg-emerald-500",
        border: "border-emerald-700",
      };
    case "division_remainder":
      return {
        name: "Rest",
        icon: <Divide size={20} />,
        color: "bg-emerald-600",
        border: "border-emerald-800",
        isNew: true,
      };
    case "inverse_calc":
      return {
        name: "Probe",
        icon: <RefreshCw size={20} />,
        color: "bg-blue-600",
        border: "border-blue-800",
        isNew: true,
      };
    case "addition":
      return {
        name: "Plus",
        icon: "➕",
        color: "bg-orange-500",
        border: "border-orange-700",
      };
    case "subtraction":
      return {
        name: "Minus",
        icon: "➖",
        color: "bg-red-500",
        border: "border-red-700",
      };
    case "gap_add":
      return {
        name: "Lücken +",
        icon: "❓",
        color: "bg-amber-500",
        border: "border-amber-700",
        isNew: true,
      };
    case "gap_sub":
      return {
        name: "Lücken -",
        icon: "❓",
        color: "bg-rose-500",
        border: "border-rose-700",
        isNew: true,
      };
    case "addition_1000":
      return {
        name: "Plus 1000",
        icon: <Calculator size={20} />,
        color: "bg-orange-600",
        border: "border-orange-800",
      };
    case "subtraction_1000":
      return {
        name: "Minus 1000",
        icon: <Calculator size={20} />,
        color: "bg-red-600",
        border: "border-red-800",
      };
    case "estimation":
      return {
        name: "Überschlag",
        icon: <Scale size={20} />,
        color: "bg-purple-600",
        border: "border-purple-800",
        isNew: true,
      };
    case "triangle_add":
      return {
        name: "Dreieck +",
        icon: <Triangle size={20} />,
        color: "bg-teal-600",
        border: "border-teal-800",
      };
    case "rounding":
      return {
        name: "Runden",
        icon: <Target size={20} />,
        color: "bg-cyan-500",
        border: "border-cyan-700",
      };
    case "pyramid":
      return {
        name: "Mauer",
        icon: <Pyramid size={20} />,
        color: "bg-indigo-500",
        border: "border-indigo-700",
      };
    case "calc_table":
      return {
        name: "Tabelle",
        icon: <LayoutGrid size={20} />,
        color: "bg-cyan-600",
        border: "border-cyan-800",
      };
    case "fact_family":
      return {
        name: "Familie",
        icon: <Users size={20} />,
        color: "bg-fuchsia-500",
        border: "border-fuchsia-700",
      };
    case "triangle":
      return {
        name: "Dreieck",
        icon: <Triangle size={20} />,
        color: "bg-teal-500",
        border: "border-teal-700",
      };
    case "calc_wheel":
      return {
        name: "Rad",
        icon: <CircleDashed size={20} />,
        color: "bg-rose-600",
        border: "border-rose-800",
      };
    case "neighbors":
      return {
        name: "Nachbarn",
        icon: <GripHorizontal size={20} />,
        color: "bg-teal-600",
        border: "border-teal-800",
      };
    case "sequences":
      return {
        name: "Folgen",
        icon: <ListOrdered size={20} />,
        color: "bg-lime-600",
        border: "border-lime-800",
      };
    case "chain":
      return {
        name: "Kette",
        icon: <GitCommitHorizontal size={20} />,
        color: "bg-violet-600",
        border: "border-violet-800",
      };
    case "sorting":
      return {
        name: "Ordnen",
        icon: <TrendingUp size={20} />,
        color: "bg-sky-600",
        border: "border-sky-800",
      };
    case "number_line":
      return {
        name: "Strahl",
        icon: <AlignCenterHorizontal size={20} />,
        color: "bg-indigo-400",
        border: "border-indigo-600",
      };
    case "arrows":
      return {
        name: "Pfeile",
        icon: "➡️",
        color: "bg-purple-500",
        border: "border-purple-700",
      };
    case "symbols":
      return {
        name: "Symbole",
        icon: "🧩",
        color: "bg-pink-500",
        border: "border-pink-700",
      };
    case "shapes":
      return {
        name: "Formen",
        icon: "🔲",
        color: "bg-violet-500",
        border: "border-violet-700",
      };
    case "place_value":
      return {
        name: "Stellen",
        icon: <Box size={20} />,
        color: "bg-blue-600",
        border: "border-blue-800",
      };
    case "money_count":
      return {
        name: "Zählen",
        icon: "💰",
        color: "bg-yellow-500",
        border: "border-yellow-700",
      };
    case "money_calc":
      return {
        name: "Rechnen €",
        icon: <Coins size={20} />,
        color: "bg-emerald-600",
        border: "border-emerald-800",
        isNew: true,
      };
    case "money_compare":
      return {
        name: "Vergleich",
        icon: <Scale size={20} />,
        color: "bg-sky-500",
        border: "border-sky-700",
        isNew: true,
      };
    case "money_pay":
      return {
        name: "Bezahlen",
        icon: <Banknote size={20} />,
        color: "bg-green-600",
        border: "border-green-800",
        isNew: true,
      };
    case "shopping":
      return {
        name: "Einkaufen",
        icon: <ShoppingBag size={20} />,
        color: "bg-rose-500",
        border: "border-rose-700",
      };
    case "word_problem":
      return {
        name: "Lesen",
        icon: <BookOpen size={20} />,
        color: "bg-amber-500",
        border: "border-amber-700",
      };
    default:
      return {
        name: m,
        icon: "🎮",
        color: "bg-slate-500",
        border: "border-slate-700",
      };
  }
};

// --- SUB-COMPONENTS ---

const Coin = ({
  value,
  size = "md",
  onClick,
  selected,
}: {
  value: number;
  size?: "sm" | "md";
  onClick?: () => void;
  selected?: boolean;
}) => {
  let sizeClass =
    size === "sm"
      ? "w-8 h-8 text-[10px]"
      : "w-10 h-10 sm:w-14 sm:h-14 text-sm sm:text-base";
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
      {content}
      {unit}
    </div>
  );
};

const Bill = ({
  value,
  size = "md",
  onClick,
  selected,
}: {
  value: number;
  size?: "sm" | "md";
  onClick?: () => void;
  selected?: boolean;
}) => {
  let color = "bg-slate-400";
  if (value === 5) color = "bg-neutral-400 text-neutral-800 border-neutral-500";
  if (value === 10) color = "bg-red-400 text-red-900 border-red-600";
  if (value === 20) color = "bg-blue-400 text-blue-900 border-blue-600";
  if (value === 50) color = "bg-orange-400 text-orange-900 border-orange-600";
  const dim =
    size === "sm"
      ? "w-16 h-8 text-sm"
      : "w-24 h-12 sm:w-32 sm:h-16 text-lg sm:text-2xl";
  return (
    <div
      onClick={onClick}
      className={`${color} ${dim} rounded-sm border-b-2 sm:border-b-4 shadow-lg flex items-center justify-between px-2 sm:px-3 font-bold relative overflow-hidden transform hover:-rotate-1 transition-transform ${
        onClick ? "cursor-pointer active:scale-95" : ""
      } ${selected ? "ring-4 ring-blue-400 scale-105" : ""}`}
    >
      <div className="flex flex-col leading-none">
        <span className="text-[6px] sm:text-[8px] opacity-70 uppercase tracking-widest">
          Euro
        </span>
        <span>{value}</span>
      </div>
      <div className="text-xl sm:text-4xl opacity-20 absolute right-2 top-1">
        €
      </div>
    </div>
  );
};

const ScratchPad = ({ clearTrigger }: { clearTrigger: number }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color] = useState("#334155");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [clearTrigger]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.strokeStyle = color;
    }
  }, [color]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDrawing(true);
    draw(e);
  };
  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) ctx.beginPath();
  };
  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="flex flex-col h-full bg-yellow-50 rounded-3xl shadow-inner border-4 border-yellow-200 relative overflow-hidden">
      <div className="absolute top-2 left-2 right-2 flex justify-between items-center z-10 pointer-events-none">
        <span className="text-yellow-800/30 font-bold uppercase text-xs tracking-widest ml-2 pointer-events-auto">
          Notizblock
        </span>
        <button
          onClick={clearCanvas}
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

const CategorySection = ({
  title,
  modes,
  cat,
  onStart,
}: {
  title: string;
  modes: GameMode[];
  cat: Category;
  onStart: (m: GameMode | Category) => void;
}) => (
  <div className="bg-slate-50 rounded-2xl p-4 mb-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-slate-500 font-bold uppercase text-xs tracking-wider">
        {title}
      </h3>
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
            {(info as any).isNew && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-white shadow-sm animate-bounce">
                NEU
              </span>
            )}
            <span className="text-xl">{info.icon}</span>
            <span className="text-[10px] sm:text-xs font-bold">
              {info.name}
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// --- MAIN APP COMPONENT ---

export default function App() {
  const [mode, setMode] = useState<GameMode>("menu");
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

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

  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem("mathe-trainer-history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("mathe-trainer-history", JSON.stringify(history));
  }, [history]);
  useEffect(() => {
    if (
      mode !== "menu" &&
      mode !== "history" &&
      !isRoundOver &&
      !currentQuestion
    )
      setMode("menu");
  }, [mode, currentQuestion, isRoundOver]);

  // --- HELPER LOGIC ---
  const pickModeForCategory = (cat: Category): GameMode => {
    const calcModes: GameMode[] = [
      "multiplication",
      "division",
      "division_remainder",
      "inverse_calc",
      "addition",
      "subtraction",
      "addition_1000",
      "subtraction_1000",
      "pyramid",
      "calc_table",
      "estimation",
      "gap_add",
      "gap_sub",
    ];
    const spaceModes: GameMode[] = [
      "rounding",
      "number_line",
      "neighbors",
      "sequences",
      "chain",
      "sorting",
      "arrows",
      "symbols",
      "shapes",
      "place_value",
    ];
    const moneyModes: GameMode[] = [
      "money_count",
      "money_calc",
      "money_compare",
      "shopping",
      "word_problem",
      "money_pay",
    ];
    let pool: GameMode[] = [];
    if (cat === "calc") pool = calcModes;
    else if (cat === "space") pool = spaceModes;
    else if (cat === "money") pool = moneyModes;
    else pool = [...calcModes, ...spaceModes, ...moneyModes];
    return pool[rand(0, pool.length - 1)];
  };

  const generateQuestion = (targetMode: GameMode) => {
    let q: Question = { text: "", answer: 0 };
    setMultiInputs({});
    setActiveCellId(null);
    setInput("");
    setSelectedMoney([]);

    // --- RECHNEN ---
    if (targetMode === "multiplication") {
      const a = rand(2, 9);
      const b = rand(2, 9);
      q = { text: `${a} · ${b} = ?`, answer: a * b };
    } else if (targetMode === "division") {
      const divisor = rand(2, 9);
      const result = rand(2, 10);
      q = { text: `${divisor * result} : ${divisor} = ?`, answer: result };
    } else if (targetMode === "division_remainder") {
      const divisor = rand(3, 9);
      const quotient = rand(2, 9);
      const remainder = rand(1, divisor - 1);
      const dividend = divisor * quotient + remainder;
      q = {
        text: `${dividend} : ${divisor} = ?`,
        answer: 0,
        divisionData: { dividend, divisor, quotient, remainder },
      };
      setActiveCellId("div-quotient");
    } else if (targetMode === "inverse_calc") {
      const b = rand(2, 9);
      const a = rand(2, 9);
      const add = rand(1, 9);
      const res = a * b + add;
      q = {
        text: "Löse die Umkehraufgabe",
        answer: 0,
        inverseData: { a, b, add, result: res },
      };
      setActiveCellId("inv-res");
    } else if (targetMode === "gap_add") {
      const a = rand(10, 450);
      const b = rand(10, 450);
      const sum = a + b;
      const hideA = rand(0, 1) === 0;
      if (hideA)
        q = {
          text: (
            <span>
              <span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> +{" "}
              {b} = {sum}
            </span>
          ),
          answer: a,
          hint: `Wie viel + ${b} = ${sum}?`,
        };
      else
        q = {
          text: (
            <span>
              {a} +{" "}
              <span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> ={" "}
              {sum}
            </span>
          ),
          answer: b,
          hint: `${a} + wie viel = ${sum}?`,
        };
    } else if (targetMode === "gap_sub") {
      const a = rand(200, 900);
      const b = rand(10, a - 50);
      const res = a - b;
      const hideA = rand(0, 1) === 0;
      if (hideA)
        q = {
          text: (
            <span>
              <span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> -{" "}
              {b} = {res}
            </span>
          ),
          answer: a,
          hint: `Rechne: ${res} + ${b}`,
        };
      else
        q = {
          text: (
            <span>
              {a} -{" "}
              <span className="bg-slate-200 px-3 py-1 rounded mx-1">?</span> ={" "}
              {res}
            </span>
          ),
          answer: b,
          hint: `Rechne: ${a} - ${res}`,
        };
    } else if (targetMode === "addition") {
      let a = rand(15, 75);
      let b = rand(15, 95 - a);
      while ((a % 10) + (b % 10) <= 10) {
        a = rand(15, 75);
        b = rand(15, 95 - a);
      }
      const splitTens = Math.floor(b / 10) * 10;
      const splitOnes = b % 10;
      q = {
        text: "Rechne schrittweise",
        answer: a + b,
        stepData: {
          start: a,
          operator: "+",
          operand: b,
          result: a + b,
          steps: [
            { val: splitTens, res: a + splitTens },
            { val: splitOnes, res: a + b },
          ],
        },
      };
      setActiveCellId("step-0-add");
    } else if (targetMode === "subtraction") {
      let a = rand(35, 95);
      let b = rand(15, a - 10);
      while (a % 10 >= b % 10) {
        a = rand(35, 95);
        b = rand(15, a - 10);
      }
      const splitTens = Math.floor(b / 10) * 10;
      const splitOnes = b % 10;
      q = {
        text: "Rechne schrittweise",
        answer: a - b,
        stepData: {
          start: a,
          operator: "-",
          operand: b,
          result: a - b,
          steps: [
            { val: splitTens, res: a - splitTens },
            { val: splitOnes, res: a - b },
          ],
        },
      };
      setActiveCellId("step-0-add");
    } else if (targetMode === "addition_1000") {
      const a = rand(100, 750);
      const b = rand(120, 950 - a);
      const splitH = Math.floor(b / 100) * 100;
      const splitZ = Math.floor((b % 100) / 10) * 10;
      const splitE = b % 10;
      const res1 = a + splitH;
      const res2 = res1 + splitZ;
      const res3 = res2 + splitE;
      q = {
        text: "Rechne schrittweise",
        answer: a + b,
        stepData: {
          start: a,
          operator: "+",
          operand: b,
          result: a + b,
          steps: [
            { val: splitH, res: res1 },
            { val: splitZ, res: res2 },
            { val: splitE, res: res3 },
          ],
        },
      };
      setActiveCellId("step-0-add");
    } else if (targetMode === "subtraction_1000") {
      const a = rand(350, 990);
      const b = rand(120, a - 100);
      const splitH = Math.floor(b / 100) * 100;
      const splitZ = Math.floor((b % 100) / 10) * 10;
      const splitE = b % 10;
      const res1 = a - splitH;
      const res2 = res1 - splitZ;
      const res3 = res2 - splitE;
      q = {
        text: "Rechne schrittweise",
        answer: a - b,
        stepData: {
          start: a,
          operator: "-",
          operand: b,
          result: a - b,
          steps: [
            { val: splitH, res: res1 },
            { val: splitZ, res: res2 },
            { val: splitE, res: res3 },
          ],
        },
      };
      setActiveCellId("step-0-add");
    } else if (targetMode === "estimation") {
      const isPlus = rand(0, 1) === 1;
      const exactA = rand(1, 8) * 100 + rand(10, 90);
      const exactB = rand(1, 8) * 100 + rand(10, 90);
      const roundedA = Math.round(exactA / 100) * 100;
      const roundedB = Math.round(exactB / 100) * 100;
      let estRes = isPlus
        ? roundedA + roundedB
        : Math.max(roundedA, roundedB) - Math.min(roundedA, roundedB);
      q = {
        text: "Überschlage (runde auf Hunderter)",
        answer: 0,
        estimationData: {
          a: exactA,
          b: exactB,
          roundedA,
          roundedB,
          estResult: estRes,
          op: isPlus ? "+" : "-",
        },
      };
      setActiveCellId("est-roundA");
    } else if (targetMode === "money_count") {
      const notes = [500, 1000, 2000, 5000];
      const coins = [1, 2, 5, 10, 20, 50, 100, 200];
      const numItems = rand(3, 6);
      let totalCents = 0;
      type MoneyItem = { val: number; type: "note" | "coin" };
      const moneyItems: MoneyItem[] = [];
      for (let i = 0; i < numItems; i++) {
        const isNote = rand(0, 10) > 6;
        const val = isNote
          ? notes[rand(0, notes.length - 1)]
          : coins[rand(0, coins.length - 1)];
        moneyItems.push({ val, type: isNote ? "note" : "coin" });
        totalCents += val;
      }
      moneyItems.sort((a, b) => b.val - a.val);
      const MoneyDisplay = () => (
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-wrap justify-center items-end gap-2 sm:gap-4 max-w-lg">
            {moneyItems.map((item, idx) =>
              item.type === "note" ? (
                <Bill key={idx} value={item.val / 100} />
              ) : (
                <Coin key={idx} value={item.val} />
              )
            )}
          </div>
          <div className="text-slate-400 text-sm font-medium mt-2">
            Betrag in Euro (z.B. 12,50)
          </div>
        </div>
      );
      q = { text: <MoneyDisplay />, answer: totalCents, isDecimal: true };
    } else if (targetMode === "money_pay") {
      const euro = rand(1, 20);
      const cent = rand(1, 99);
      const total = euro * 100 + cent;
      q = {
        text: `Bezahle passend`,
        answer: total,
        payData: { target: total },
      };
    } else if (targetMode === "money_calc") {
      const centsA = rand(1, 40) * 10 + rand(0, 1) * 5;
      const centsB = rand(1, 40) * 10 + rand(0, 1) * 5;
      const isPlus = rand(0, 1) === 0;
      const total = isPlus
        ? centsA + centsB
        : Math.max(centsA, centsB) - Math.min(centsA, centsB);
      const val1 = isPlus ? centsA : Math.max(centsA, centsB);
      const val2 = isPlus ? centsB : Math.min(centsA, centsB);
      const format = (c: number) =>
        (c / 100).toFixed(2).replace(".", ",") + " €";
      q = {
        text: `${format(val1)} ${isPlus ? "+" : "-"} ${format(val2)} = ?`,
        answer: total,
        isDecimal: true,
      };
    } else if (targetMode === "money_compare") {
      const genWallet = () => {
        const notes = [500, 1000, 2000];
        const coins = [10, 20, 50, 100, 200];
        const count = rand(3, 5);
        let sum = 0;
        const items = [];
        for (let i = 0; i < count; i++) {
          const val =
            rand(0, 10) > 7
              ? notes[rand(0, notes.length - 1)]
              : coins[rand(0, coins.length - 1)];
          sum += val;
          items.push(val);
        }
        return { sum, items: items.sort((a, b) => b - a) };
      };
      let wA = genWallet();
      let wB = genWallet();
      while (wA.sum === wB.sum) wB = genWallet();
      q = {
        text: "Vergleiche die Beträge",
        answer: 0,
        moneyCompareData: {
          walletA: wA.items,
          walletB: wB.items,
          sumA: wA.sum,
          sumB: wB.sum,
          diff: Math.abs(wA.sum - wB.sum),
        },
        isDecimal: true,
      };
      setActiveCellId("money-comp-a");
    } else if (targetMode === "shopping") {
      const products = [
        { name: "Brezel", price: 85, icon: "🥨" },
        { name: "Stift", price: 150, icon: "✏️" },
        { name: "Apfel", price: 60, icon: "🍎" },
        { name: "Heft", price: 220, icon: "📓" },
        { name: "Eis", price: 120, icon: "🍦" },
        { name: "Ball", price: 450, icon: "⚽" },
      ];
      const p1 = products[rand(0, products.length - 1)];
      let p2 = products[rand(0, products.length - 1)];
      while (p1 === p2) p2 = products[rand(0, products.length - 1)];
      const totalCost = p1.price + p2.price;
      let payAmount =
        totalCost < 500
          ? 500
          : totalCost < 1000
          ? 1000
          : totalCost < 2000
          ? 2000
          : 5000;
      const change = payAmount - totalCost;
      q = {
        text: "Einkaufen",
        answer: change,
        shoppingData: {
          items: [p1, p2],
          wallet: payAmount,
          total: totalCost,
          change: change,
        },
        isDecimal: true,
      };
      setActiveCellId("shop-total");
    } else if (targetMode === "word_problem") {
      const problems = [
        {
          text: "Linus baut 6 Türme. Jeder Turm hat 10 Klötze. Wie viele Klötze sind es insgesamt?",
          ans: 60,
        },
        {
          text: "Im Blumenbeet wachsen 45 Astern und 36 Rosen. Wie viele Blumen sind es zusammen?",
          ans: 81,
        },
        {
          text: "Monika hat 50€ gespart. Oma gibt ihr 11€. Dann kauft sie ein Bastelset für 24€. Wie viel Geld hat sie noch?",
          ans: 37,
        },
        {
          text: "Karl geht 3-mal am Tag mit seinem Hund raus. Jedes Mal sind sie 30 Minuten unterwegs. Wie viele Minuten sind sie insgesamt unterwegs?",
          ans: 90,
        },
        {
          text: "Anna hat 40€ im Geldbeutel. Sie kauft ein Mäppchen für 12€, 3 Stifte für je 4€ und ein Eis für 3€. Wie viel Geld hat sie noch übrig?",
          ans: 13,
        },
      ];
      const prob = problems[rand(0, problems.length - 1)];
      q = {
        text: (
          <div className="text-xl sm:text-2xl font-medium text-slate-700 leading-relaxed max-w-lg text-center">
            {prob.text}
          </div>
        ),
        answer: prob.ans,
        wordProblemAnswer: prob.ans,
      };
    }
    // Standard grids as fallbacks or specific implementations for pyramid etc.
    else if (targetMode === "pyramid") {
      const base1 = rand(1, 10),
        base2 = rand(1, 10),
        base3 = rand(1, 10);
      const cells: GridCell[] = [
        { id: "s0", val: base1, isGiven: true },
        { id: "s1", val: base2, isGiven: true },
        { id: "s2", val: base3, isGiven: true },
        { id: "s3", val: base1 + base2, isGiven: false },
        { id: "s4", val: base2 + base3, isGiven: false },
        { id: "s5", val: base1 + base2 + base2 + base3, isGiven: false },
      ];
      q = {
        text: "Fülle die Mauer",
        answer: 0,
        gridData: { cells, type: "pyramid" },
      };
      setActiveCellId("s3");
    } else {
      // Fallback for other modes
      const a = rand(2, 9),
        b = rand(2, 9);
      q = { text: `${a} · ${b} = ?`, answer: a * b };
    }
    setCurrentQuestion(q);
    setFeedback("none");
    setStartTime(Date.now());
  };

  const finishRound = (finalScore: number, finalTimes: number[]) => {
    setIsRoundOver(true);
    let avg = 0;
    if (finalTimes.length > 0) {
      const sum = finalTimes.reduce((a, b) => a + b, 0);
      avg = parseFloat((sum / finalTimes.length).toFixed(1));
    }
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      mode: mode as string,
      score: finalScore,
      total: QUESTIONS_PER_ROUND,
      avgTime: avg,
    };
    setHistory((prev) => [newEntry, ...prev].slice(0, 20));
  };

  const nextQuestion = (currentScore?: number) => {
    const score = currentScore !== undefined ? currentScore : correctCount;
    if (questionIndex >= QUESTIONS_PER_ROUND) {
      finishRound(score, responseTimes);
    } else {
      setQuestionIndex((prev) => prev + 1);
      if (activeCategory) {
        const nextMode = pickModeForCategory(activeCategory);
        setMode(nextMode);
        generateQuestion(nextMode);
      } else {
        generateQuestion(mode);
      }
    }
  };

  const startGame = (target: GameMode | Category) => {
    setCorrectCount(0);
    setQuestionIndex(1);
    setIsRoundOver(false);
    setResponseTimes([]);
    setSelectedMoney([]);

    if (
      target === "calc" ||
      target === "space" ||
      target === "money" ||
      target === "mixed"
    ) {
      setActiveCategory(target);
      const firstMode = pickModeForCategory(target);
      setMode(firstMode);
      generateQuestion(firstMode);
    } else {
      setActiveCategory(null);
      setMode(target as GameMode);
      generateQuestion(target as GameMode);
    }
  };

  const handleInputChange = (id: string | null, value: string) => {
    if (feedback !== "none") return;
    const cleanVal = value.replace(/[^0-9,]/g, "");
    if (id) setMultiInputs((prev) => ({ ...prev, [id]: cleanVal }));
    else setInput(cleanVal);
  };
  const handleMoneySelect = (amount: number) => {
    if (feedback !== "none") return;
    setSelectedMoney((prev) => [...prev, amount]);
    playSound("click", soundEnabled);
  };
  const handleMoneyRemove = (index: number) => {
    if (feedback !== "none") return;
    setSelectedMoney((prev) => prev.filter((_, i) => i !== index));
    playSound("click", soundEnabled);
  };

  const handleNumPad = (val: string) => {
    if (feedback !== "none") return;
    let currentVal = activeCellId ? multiInputs[activeCellId] || "" : input;
    if (val === "DEL") handleInputChange(activeCellId, currentVal.slice(0, -1));
    else if (val === ",") {
      if (!currentVal.includes(","))
        handleInputChange(activeCellId, currentVal + ",");
    } else {
      if (currentVal.length < 6)
        handleInputChange(activeCellId, currentVal + val);
    }
    playSound("click", soundEnabled);
  };

  const checkAnswer = () => {
    if (!currentQuestion) return;
    let isCorrect = false;
    const parseMoney = (s: string) =>
      Math.round(parseFloat((s || "0").replace(",", ".")) * 100);

    if (mode === "shopping" && currentQuestion.shoppingData) {
      const d = currentQuestion.shoppingData;
      const userTotal = parseMoney(multiInputs["shop-total"]);
      const userChange = parseMoney(multiInputs["shop-change"]);
      isCorrect = userTotal === d.total && userChange === d.change;
    } else if (mode === "money_compare" && currentQuestion.moneyCompareData) {
      const d = currentQuestion.moneyCompareData;
      const uA = parseMoney(multiInputs["money-comp-a"]);
      const uB = parseMoney(multiInputs["money-comp-b"]);
      const uDiff = parseMoney(multiInputs["money-comp-diff"]);
      isCorrect = uA === d.sumA && uB === d.sumB && uDiff === d.diff;
    } else if (mode === "division_remainder" && currentQuestion.divisionData) {
      const d = currentQuestion.divisionData;
      const userQ = parseInt(multiInputs["div-quotient"] || "0");
      const userR = parseInt(multiInputs["div-remainder"] || "0");
      isCorrect = userQ === d.quotient && userR === d.remainder;
    } else if (mode === "inverse_calc" && currentQuestion.inverseData) {
      const d = currentQuestion.inverseData;
      const userRes = parseInt(multiInputs["inv-res"] || "0");
      isCorrect = userRes === d.result;
    } else if (mode === "estimation" && currentQuestion.estimationData) {
      const d = currentQuestion.estimationData;
      const rA = parseInt(multiInputs["est-roundA"] || "0");
      const rB = parseInt(multiInputs["est-roundB"] || "0");
      const res = parseInt(multiInputs["est-res"] || "0");
      isCorrect = rA === d.roundedA && rB === d.roundedB && res === d.estResult;
    } else if (mode === "money_pay" && currentQuestion.payData) {
      const totalSelected = selectedMoney.reduce((a, b) => a + b, 0);
      isCorrect = totalSelected === currentQuestion.payData.target;
    } else if (currentQuestion.factFamilyData) {
      const { a, b, prod } = currentQuestion.factFamilyData;
      const checkRow = (r: number, op: string) => {
        const v1 = parseInt(multiInputs[`ff-${r}-0`] || "0");
        const v2 = parseInt(multiInputs[`ff-${r}-1`] || "0");
        const v3 = parseInt(multiInputs[`ff-${r}-2`] || "0");
        if (op === "*")
          return v1 * v2 === v3 && v3 === prod && (v1 === a || v1 === b);
        if (op === ":")
          return v1 / v2 === v3 && v1 === prod && (v3 === a || v3 === b);
        return false;
      };
      isCorrect =
        checkRow(0, "*") &&
        checkRow(1, "*") &&
        checkRow(2, ":") &&
        checkRow(3, ":");
    } else if (currentQuestion.triangleData) {
      const d = currentQuestion.triangleData;
      if (d.mode === "mult") {
        const checkSide = (v1: number, v2: number, prod: number) =>
          v1 * v2 === prod;
        const pl = parseInt(multiInputs["tri-prod-left"] || "0");
        const pr = parseInt(multiInputs["tri-prod-right"] || "0");
        const pb = parseInt(multiInputs["tri-prod-bottom"] || "0");
        isCorrect =
          checkSide(d.top, d.left, pl) &&
          checkSide(d.top, d.right, pr) &&
          checkSide(d.left, d.right, pb);
      } else {
        const checkSide = (v1: number, v2: number, sum: number) =>
          v1 + v2 === sum;
        const sl = parseInt(multiInputs["tri-sum-left"] || "0");
        const sr = parseInt(multiInputs["tri-sum-right"] || "0");
        const sb = parseInt(multiInputs["tri-sum-bottom"] || "0");
        isCorrect =
          checkSide(d.top, d.left, sl) &&
          checkSide(d.top, d.right, sr) &&
          checkSide(d.left, d.right, sb);
      }
    } else if (currentQuestion.wheelData) {
      const d = currentQuestion.wheelData;
      let allCorrect = true;
      d.segments.forEach((seg, i) => {
        const outVal = parseInt(multiInputs[`wheel-${i}-o`] || "0");
        if (outVal !== seg.outer) allCorrect = false;
      });
      isCorrect = allCorrect;
    } else if (currentQuestion.gridData) {
      const data = currentQuestion.gridData;
      const emptyCells = data.cells.filter((c) => !c.isGiven);
      const allFilled = emptyCells.every(
        (c) => multiInputs[c.id] && multiInputs[c.id] !== ""
      );
      if (allFilled)
        isCorrect = emptyCells.every(
          (c) => parseInt(multiInputs[c.id]) === c.val
        );
    } else if (currentQuestion.stepData) {
      const i = multiInputs;
      const stepData = currentQuestion.stepData;
      let stepsCorrect = true;
      if (parseInt(i["main-result"] || "0") !== stepData.result)
        stepsCorrect = false;
      stepData.steps.forEach((s, idx) => {
        const userInputAdd = parseInt(i[`step-${idx}-add`] || "0");
        const userInputRes = parseInt(i[`step-${idx}-res`] || "0");
        if (idx > 0) {
          const prevRes = stepData.steps[idx - 1].res;
          const userStart = parseInt(i[`step-${idx}-start`] || "0");
          if (userStart !== prevRes) stepsCorrect = false;
        }
        if (userInputAdd !== s.val) stepsCorrect = false;
        if (userInputRes !== s.res) stepsCorrect = false;
      });
      isCorrect = stepsCorrect;
    } else if (currentQuestion.isDecimal) {
      if (input !== "")
        isCorrect = parseMoney(input) === currentQuestion.answer;
    } else {
      if (input !== "") isCorrect = parseInt(input) === currentQuestion.answer;
    }

    if (isCorrect) {
      setFeedback("correct");
      playSound("correct", soundEnabled);
      const newScore = correctCount + 1;
      setCorrectCount(newScore);
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      setResponseTimes([...responseTimes, durationSeconds]);
      setTimeout(() => nextQuestion(newScore), 1500);
    } else {
      setFeedback("wrong");
      playSound("wrong", soundEnabled);
    }
  };

  const jumpToNextField = () => {
    let allIds: string[] = [];
    if (mode === "shopping") allIds = ["shop-total", "shop-change"];
    else if (mode === "division_remainder")
      allIds = ["div-quotient", "div-remainder"];
    else if (mode === "estimation")
      allIds = ["est-roundA", "est-roundB", "est-res"];
    else if (mode === "money_compare")
      allIds = ["money-comp-a", "money-comp-b", "money-comp-diff"];
    else if (currentQuestion?.stepData) {
      currentQuestion.stepData.steps.forEach((_, idx) => {
        if (idx > 0) allIds.push(`step-${idx}-start`);
        allIds.push(`step-${idx}-add`);
        allIds.push(`step-${idx}-res`);
      });
      allIds.push("main-result");
    } else if (currentQuestion?.gridData) {
      allIds = currentQuestion.gridData.cells
        .filter((c) => !c.isGiven)
        .map((c) => c.id);
    } else if (currentQuestion?.wheelData) {
      currentQuestion.wheelData.segments.forEach((_, i) =>
        allIds.push(`wheel-${i}-o`)
      );
    } else if (currentQuestion?.triangleData) {
      const isMult = currentQuestion.triangleData.mode === "mult";
      if (isMult)
        allIds = ["tri-prod-left", "tri-prod-right", "tri-prod-bottom"];
      else allIds = ["tri-sum-left", "tri-sum-right", "tri-sum-bottom"];
    } else if (currentQuestion?.factFamilyData) {
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 3; c++) allIds.push(`ff-${r}-${c}`);
    }
    const firstEmpty = allIds.find((id) => !multiInputs[id]);
    if (firstEmpty) setActiveCellId(firstEmpty);
    else checkAnswer();
  };

  const renderMultiInputCell = (
    id: string,
    value: number | string,
    isGiven: boolean,
    label?: string,
    customStyle?: string
  ) => {
    const isActive = activeCellId === id;
    const userInput = multiInputs[id] || "";
    const isWrong =
      feedback === "wrong" &&
      !isGiven &&
      (typeof value === "number"
        ? parseInt(userInput) !== value
        : userInput !== value);
    const moneyVal = typeof value === "number" ? value : 0;
    const moneyUser = Math.round(parseFloat(userInput.replace(",", ".")) * 100);
    const isMoneyWrong =
      feedback === "wrong" &&
      !isGiven &&
      mode === "money_compare" &&
      moneyUser !== moneyVal;
    let baseStyle =
      customStyle || "w-14 h-14 sm:w-16 sm:h-16 border-2 rounded-xl";
    let colorStyle = isGiven
      ? "bg-slate-200 border-slate-300 text-slate-500"
      : isActive && feedback === "none"
      ? "bg-white border-blue-500 ring-4 ring-blue-100 scale-105 z-10"
      : "bg-white border-slate-300 hover:bg-slate-50";
    if (isWrong || isMoneyWrong)
      colorStyle = "bg-red-50 border-red-300 text-red-600";
    if (feedback === "correct" && !isGiven)
      colorStyle = "bg-green-50 border-green-500 text-green-700";

    return (
      <div key={id} className="flex flex-col items-center">
        {label && (
          <div className="text-[10px] sm:text-xs text-slate-400 font-bold mb-1 uppercase text-center w-full">
            {label}
          </div>
        )}
        <div
          className={`flex items-center justify-center font-bold text-lg sm:text-2xl transition-all relative shadow-sm ${baseStyle} ${colorStyle}`}
        >
          {isGiven ? (
            <span>{value}</span>
          ) : (
            <input
              type="text"
              inputMode="none"
              value={userInput}
              onChange={(e) => handleInputChange(id, e.target.value)}
              onFocus={() => {
                if (feedback === "none") setActiveCellId(id);
              }}
              className="w-full h-full text-center bg-transparent outline-none p-0 m-0 cursor-pointer"
              autoComplete="off"
            />
          )}
          {(isWrong || isMoneyWrong) && (
            <div className="text-[10px] text-green-600 font-bold absolute -bottom-4 bg-white/80 px-1 rounded shadow-sm z-20 whitespace-nowrap">
              {mode === "money_compare"
                ? (moneyVal / 100).toFixed(2).replace(".", ",")
                : value}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDivisionRemainder = () => {
    if (!currentQuestion?.divisionData) return null;
    const d = currentQuestion.divisionData;
    return (
      <div className="flex flex-col items-center gap-4 mt-4">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-700">
          <span>
            {d.dividend} : {d.divisor} =
          </span>
          {renderMultiInputCell(
            "div-quotient",
            d.quotient,
            false,
            "Ergebnis",
            "w-16 h-16 border-2 rounded-xl"
          )}
          <span>R</span>
          {renderMultiInputCell(
            "div-remainder",
            d.remainder,
            false,
            "Rest",
            "w-16 h-16 border-2 rounded-xl"
          )}
        </div>
      </div>
    );
  };

  const renderInverseCalc = () => {
    if (!currentQuestion?.inverseData) return null;
    const d = currentQuestion.inverseData;
    return (
      <div className="flex flex-col items-center gap-4 mt-6">
        <div className="flex items-center gap-2 text-2xl font-bold text-slate-700 bg-blue-50 p-4 rounded-xl border border-blue-100">
          <span className="text-blue-500">{d.a}</span>
          <span>·</span>
          <span className="text-blue-500">{d.b}</span>
          <span>+</span>
          <span className="text-orange-500">{d.add}</span>
          <span>=</span>
          {renderMultiInputCell(
            "inv-res",
            d.result,
            false,
            undefined,
            "w-20 h-16 border-2 rounded-xl bg-white"
          )}
        </div>
        <div className="text-sm text-slate-400">Tipp: Punkt vor Strich!</div>
      </div>
    );
  };

  const renderEstimation = () => {
    if (!currentQuestion?.estimationData) return null;
    const d = currentQuestion.estimationData;
    return (
      <div className="flex flex-col items-center gap-4 mt-4">
        <div className="text-lg font-bold text-slate-400 mb-2">
          {d.a} {d.op} {d.b}
        </div>
        <div className="flex items-center gap-2">
          {renderMultiInputCell(
            "est-roundA",
            d.roundedA,
            false,
            "Rund 1",
            "w-20 h-14 border-2 rounded-lg"
          )}
          <span className="text-2xl font-bold">{d.op}</span>
          {renderMultiInputCell(
            "est-roundB",
            d.roundedB,
            false,
            "Rund 2",
            "w-20 h-14 border-2 rounded-lg"
          )}
          <span className="text-2xl font-bold">=</span>
          {renderMultiInputCell(
            "est-res",
            d.estResult,
            false,
            "Ergebnis",
            "w-20 h-14 border-2 rounded-lg bg-purple-50"
          )}
        </div>
      </div>
    );
  };

  const renderMoneyPay = () => {
    if (!currentQuestion?.payData) return null;
    const selectedSum = selectedMoney.reduce((a, b) => a + b, 0);
    const target = currentQuestion.payData.target;
    const notes = [5000, 2000, 1000, 500];
    const coins = [200, 100, 50, 20, 10, 5, 2, 1];

    return (
      <div className="flex flex-col items-center w-full gap-4">
        <div className="flex flex-wrap justify-center gap-2 p-4 bg-slate-100 rounded-2xl w-full">
          {notes.map((v) => (
            <Bill
              key={v}
              value={v / 100}
              onClick={() => handleMoneySelect(v)}
            />
          ))}
          {coins.map((v) => (
            <Coin key={v} value={v} onClick={() => handleMoneySelect(v)} />
          ))}
        </div>
        <div className="w-full min-h-[120px] bg-green-50 border-2 border-dashed border-green-300 rounded-2xl p-4 flex flex-wrap gap-2 justify-center items-center relative">
          <div className="absolute top-2 left-2 text-xs font-bold text-green-700 uppercase tracking-wider">
            Dein Geld: {(selectedSum / 100).toFixed(2).replace(".", ",")} €
          </div>
          <div className="absolute top-2 right-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Ziel: {(target / 100).toFixed(2).replace(".", ",")} €
          </div>
          {selectedMoney.length === 0 && (
            <div className="text-green-800/30 font-bold">
              Hier Geld hinlegen
            </div>
          )}
          {selectedMoney.map((v, i) =>
            v >= 500 ? (
              <Bill
                key={i}
                value={v / 100}
                onClick={() => handleMoneyRemove(i)}
                selected
              />
            ) : (
              <Coin
                key={i}
                value={v}
                onClick={() => handleMoneyRemove(i)}
                selected
              />
            )
          )}
        </div>
        {feedback === "wrong" && (
          <div className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded border border-green-200">
            Ziel: {(target / 100).toFixed(2).replace(".", ",")} €
          </div>
        )}
      </div>
    );
  };

  const renderMoneyCompare = () => {
    const d = currentQuestion?.moneyCompareData;
    if (!d) return null;
    const formatMoney = (cents: number) =>
      (cents / 100).toFixed(2).replace(".", ",") + " €";
    const userA = Math.round(
      parseFloat((multiInputs["money-comp-a"] || "").replace(",", ".")) * 100
    );
    const userB = Math.round(
      parseFloat((multiInputs["money-comp-b"] || "").replace(",", ".")) * 100
    );
    const userDiff = Math.round(
      parseFloat((multiInputs["money-comp-diff"] || "").replace(",", ".")) * 100
    );

    const renderWallet = (
      items: number[],
      id: string,
      label: string,
      correctSum: number,
      userVal: number
    ) => (
      <div className="flex-1 flex flex-col items-center bg-slate-50 p-2 rounded-xl border border-slate-200">
        <div className="text-slate-400 font-bold text-xs uppercase mb-2">
          {label}
        </div>
        <div className="flex flex-wrap justify-center gap-1 min-h-[80px] content-start">
          {items.map((val, i) =>
            val >= 500 ? (
              <Bill key={i} value={val / 100} size="sm" />
            ) : (
              <Coin key={i} value={val} size="sm" />
            )
          )}
        </div>
        <div
          className={`mt-2 w-32 h-10 bg-white rounded-lg border-2 flex items-center justify-center font-bold ${
            activeCellId === id ? "border-blue-500 ring-2" : "border-slate-300"
          } ${
            feedback === "wrong" && userVal !== correctSum
              ? "border-red-300 bg-red-50"
              : ""
          }`}
        >
          <input
            type="text"
            inputMode="none"
            value={multiInputs[id] || ""}
            onChange={(e) => handleInputChange(id, e.target.value)}
            onFocus={() => setActiveCellId(id)}
            className="w-full h-full text-center bg-transparent outline-none"
            placeholder="Betrag €"
          />
        </div>
        {feedback === "wrong" && userVal !== correctSum && (
          <div className="text-sm text-green-600 font-bold mt-1">
            {formatMoney(correctSum)}
          </div>
        )}
      </div>
    );

    return (
      <div className="w-full flex flex-col gap-4 mt-2">
        <div className="flex gap-2 w-full">
          {renderWallet(d.walletA, "money-comp-a", "Max", d.sumA, userA)}
          {renderWallet(d.walletB, "money-comp-b", "Mira", d.sumB, userB)}
        </div>
        <div className="w-full bg-blue-50 rounded-xl p-3 flex flex-col items-center border border-blue-100">
          <div className="text-blue-800 font-bold text-xs uppercase mb-1">
            Unterschied
          </div>
          <div
            className={`w-32 h-10 bg-white rounded-lg border-2 flex items-center justify-center font-bold text-lg ${
              activeCellId === "money-comp-diff"
                ? "border-blue-500 ring-2"
                : "border-blue-200"
            } ${
              feedback === "wrong" && userDiff !== d.diff
                ? "border-red-300 bg-red-50"
                : ""
            }`}
          >
            <input
              type="text"
              inputMode="none"
              value={multiInputs["money-comp-diff"] || ""}
              onChange={(e) =>
                handleInputChange("money-comp-diff", e.target.value)
              }
              onFocus={() => setActiveCellId("money-comp-diff")}
              className="w-full h-full text-center bg-transparent outline-none"
              placeholder="Diff €"
            />
          </div>
          {feedback === "wrong" && userDiff !== d.diff && (
            <div className="text-sm text-green-600 font-bold mt-1">
              {formatMoney(d.diff)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderShoppingTask = () => {
    if (!currentQuestion?.shoppingData) return null;
    const d = currentQuestion.shoppingData;
    return (
      <div className="w-full flex flex-col items-center gap-6 mt-4">
        <div className="flex gap-4">
          {d.items.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center bg-white p-3 rounded-2xl shadow-sm border border-slate-100"
            >
              <div className="text-4xl mb-2">{item.icon}</div>
              <div className="font-bold text-slate-700">{item.name}</div>
              <div className="text-slate-500">
                {(item.price / 100).toFixed(2).replace(".", ",")} €
              </div>
            </div>
          ))}
        </div>
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center">
          <div className="text-sm text-slate-400 font-bold uppercase mb-2">
            1. Wie viel kostet es?
          </div>
          <div
            className={`w-40 h-14 bg-white rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
              activeCellId === "shop-total"
                ? "border-blue-500 ring-4"
                : "border-slate-300"
            }`}
          >
            <input
              type="text"
              inputMode="none"
              value={multiInputs["shop-total"] || ""}
              onChange={(e) => handleInputChange("shop-total", e.target.value)}
              onFocus={() => setActiveCellId("shop-total")}
              className="w-full h-full text-center bg-transparent outline-none"
              placeholder="Summe €"
            />
          </div>
        </div>
        <div className="w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center relative">
          <div className="absolute -top-3 bg-white px-2 py-1 rounded-lg border shadow-sm text-xs font-bold text-slate-500 flex items-center gap-1">
            Du gibst: <Bill value={d.wallet / 100} />
          </div>
          <div className="h-8"></div>
          <div className="text-sm text-slate-400 font-bold uppercase mb-2">
            2. Dein Rückgeld?
          </div>
          <div
            className={`w-40 h-14 bg-white rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
              activeCellId === "shop-change"
                ? "border-blue-500 ring-4"
                : "border-slate-300"
            }`}
          >
            <input
              type="text"
              inputMode="none"
              value={multiInputs["shop-change"] || ""}
              onChange={(e) => handleInputChange("shop-change", e.target.value)}
              onFocus={() => setActiveCellId("shop-change")}
              className="w-full h-full text-center bg-transparent outline-none"
              placeholder="Rückgeld €"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderPlaceValue = () => {
    if (!currentQuestion?.placeValueData) return null;
    const { h, z, e } = currentQuestion.placeValueData;
    return (
      <div className="flex items-end justify-center gap-4 mt-6">
        <div className="flex flex-wrap w-24 h-24 sm:w-32 sm:h-32 gap-1 content-start">
          {Array.from({ length: h }).map((_, i) => (
            <div
              key={i}
              className="w-16 h-16 sm:w-20 sm:h-20 bg-green-200 border-2 border-green-500 grid grid-cols-10 grid-rows-10 gap-px p-0.5 shadow-sm"
            >
              {Array.from({ length: 100 }).map((_, k) => (
                <div key={k} className="bg-green-400/30 rounded-[1px]"></div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: z }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-16 sm:w-5 sm:h-20 bg-blue-200 border-2 border-blue-500 flex flex-col gap-px p-px shadow-sm"
            >
              {Array.from({ length: 10 }).map((_, k) => (
                <div
                  key={k}
                  className="flex-1 bg-blue-400/30 rounded-[1px]"
                ></div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap w-16 gap-1 content-end pb-1">
          {Array.from({ length: e }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 sm:w-5 sm:h-5 bg-red-300 border-2 border-red-500 shadow-sm rounded-sm"
            ></div>
          ))}
        </div>
      </div>
    );
  };

  const renderFactFamily = () => {
    if (!currentQuestion?.factFamilyData) return null;
    const { a, b, prod } = currentQuestion.factFamilyData;
    const rows = [
      { id: 0, op: "·", vals: [a, b, prod] },
      { id: 1, op: "·", vals: [b, a, prod] },
      { id: 2, op: ":", vals: [prod, a, b] },
      { id: 3, op: ":", vals: [prod, b, a] },
    ];
    return (
      <div className="flex flex-col gap-3 mt-4 w-full max-w-sm">
        <div className="flex justify-center gap-4 mb-4">
          {[a, b, prod].map((n, i) => (
            <div
              key={i}
              className="w-12 h-12 bg-fuchsia-100 border-2 border-fuchsia-300 rounded-full flex items-center justify-center font-bold text-fuchsia-800 text-xl"
            >
              {n}
            </div>
          ))}
        </div>
        {rows.map((row, r) => (
          <div
            key={r}
            className="flex items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm"
          >
            {renderMultiInputCell(
              `ff-${r}-0`,
              row.vals[0],
              false,
              undefined,
              "w-12 h-12 border-2 rounded-lg text-lg"
            )}
            <span className="font-bold text-slate-400 text-xl">{row.op}</span>
            {renderMultiInputCell(
              `ff-${r}-1`,
              row.vals[1],
              false,
              undefined,
              "w-12 h-12 border-2 rounded-lg text-lg"
            )}
            <span className="font-bold text-slate-400 text-xl">=</span>
            {renderMultiInputCell(
              `ff-${r}-2`,
              row.vals[2],
              false,
              undefined,
              "w-12 h-12 border-2 rounded-lg text-lg"
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTriangle = () => {
    if (!currentQuestion?.triangleData) return null;
    const d = currentQuestion.triangleData;
    const isMult = d.mode === "mult";
    const keyLeft = isMult ? "tri-prod-left" : "tri-sum-left";
    const keyRight = isMult ? "tri-prod-right" : "tri-sum-right";
    const keyBottom = isMult ? "tri-prod-bottom" : "tri-sum-bottom";
    const valLeft = isMult ? d.prodLeft : d.sumLeft;
    const valRight = isMult ? d.prodRight : d.sumRight;
    const valBottom = isMult ? d.prodBottom : d.sumBottom;
    return (
      <div className="relative w-64 h-56 mt-4 mx-auto">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 180">
          <polygon
            points="100,20 20,160 180,160"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="3"
          />
        </svg>
        <div className="absolute top-0 left-1/2 -translate-x-1/2">
          {renderMultiInputCell(
            "tri-top",
            d.top,
            true,
            undefined,
            "w-12 h-12 rounded-full border-2"
          )}
        </div>
        <div className="absolute bottom-4 left-4">
          {renderMultiInputCell(
            "tri-left",
            d.left,
            true,
            undefined,
            "w-12 h-12 rounded-full border-2"
          )}
        </div>
        <div className="absolute bottom-4 right-4">
          {renderMultiInputCell(
            "tri-right",
            d.right,
            true,
            undefined,
            "w-12 h-12 rounded-full border-2"
          )}
        </div>
        <div className="absolute top-1/2 left-4 -translate-y-1/2">
          {renderMultiInputCell(
            keyLeft,
            valLeft || 0,
            false,
            undefined,
            "w-14 h-10 bg-white border-2 rounded-lg"
          )}
        </div>
        <div className="absolute top-1/2 right-4 -translate-y-1/2">
          {renderMultiInputCell(
            keyRight,
            valRight || 0,
            false,
            undefined,
            "w-14 h-10 bg-white border-2 rounded-lg"
          )}
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2">
          {renderMultiInputCell(
            keyBottom,
            valBottom || 0,
            false,
            undefined,
            "w-14 h-10 bg-white border-2 rounded-lg"
          )}
        </div>
      </div>
    );
  };

  const renderWheel = () => {
    if (!currentQuestion?.wheelData) return null;
    const d = currentQuestion.wheelData;
    return (
      <div className="relative w-72 h-72 mt-4 mx-auto flex items-center justify-center">
        <div className="absolute z-20 w-20 h-20 bg-rose-100 border-4 border-rose-300 rounded-full flex items-center justify-center font-bold text-xl text-rose-800 shadow-sm">
          {d.op} {d.center}
        </div>
        {d.segments.map((seg, i) => {
          const angle = i * 90;
          const rad = (a: number) => a * (Math.PI / 180);
          const innerR = 65;
          const outerR = 115;
          const ix = Math.cos(rad(angle)) * innerR;
          const iy = Math.sin(rad(angle)) * innerR;
          const ox = Math.cos(rad(angle)) * outerR;
          const oy = Math.sin(rad(angle)) * outerR;
          return (
            <React.Fragment key={i}>
              <div
                className="absolute z-10"
                style={{ transform: `translate(${ix}px, ${iy}px)` }}
              >
                {renderMultiInputCell(
                  `wheel-${i}-i`,
                  seg.inner,
                  true,
                  undefined,
                  "w-12 h-12 rounded-full border-2 text-sm bg-white"
                )}
              </div>
              <div
                className="absolute z-10"
                style={{ transform: `translate(${ox}px, ${oy}px)` }}
              >
                {renderMultiInputCell(
                  `wheel-${i}-o`,
                  seg.outer,
                  false,
                  undefined,
                  "w-14 h-14 border-2 rounded-xl bg-white shadow-sm"
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderGridTask = () => {
    if (!currentQuestion?.gridData) return null;
    const { cells, type, meta } = currentQuestion.gridData;

    if (type === "pyramid")
      return (
        <div className="flex flex-col items-center gap-2 mt-4">
          <div className="flex justify-center">
            {renderMultiInputCell(
              cells[5].id,
              cells[5].val as number,
              cells[5].isGiven,
              undefined,
              "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1"
            )}
          </div>
          <div className="flex justify-center gap-1">
            {renderMultiInputCell(
              cells[3].id,
              cells[3].val as number,
              cells[3].isGiven,
              undefined,
              "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1"
            )}
            {renderMultiInputCell(
              cells[4].id,
              cells[4].val as number,
              cells[4].isGiven,
              undefined,
              "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1"
            )}
          </div>
          <div className="flex justify-center gap-1">
            {renderMultiInputCell(
              cells[0].id,
              cells[0].val as number,
              cells[0].isGiven,
              undefined,
              "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1"
            )}
            {renderMultiInputCell(
              cells[1].id,
              cells[1].val as number,
              cells[1].isGiven,
              undefined,
              "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1"
            )}
            {renderMultiInputCell(
              cells[2].id,
              cells[2].val as number,
              cells[2].isGiven,
              undefined,
              "w-16 h-10 sm:w-20 sm:h-14 border-2 rounded-lg mb-1"
            )}
          </div>
        </div>
      );
    if (type === "neighbors")
      return (
        <div className="flex items-end justify-center gap-1 mt-6 overflow-x-auto w-full pb-2">
          {cells.map((c) =>
            renderMultiInputCell(
              c.id,
              c.val,
              c.isGiven,
              c.label,
              "w-10 h-14 sm:w-14 sm:h-16 border-2 rounded-lg text-lg"
            )
          )}
        </div>
      );
    if (type === "sorting")
      return (
        <div className="flex flex-col items-center w-full">
          <div className="flex gap-2 mb-4 bg-slate-100 p-2 rounded-lg">
            {meta.unsorted.map((n: number, i: number) => (
              <span key={i} className="font-bold text-slate-600 mx-1">
                {n}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            {cells.map((c, i) => (
              <React.Fragment key={c.id}>
                {i > 0 && (
                  <span className="text-slate-300 font-bold">&lt;</span>
                )}
                {renderMultiInputCell(
                  c.id,
                  c.val,
                  c.isGiven,
                  undefined,
                  "w-12 h-12 sm:w-16 sm:h-16 border-2 rounded-xl"
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    if (type === "chain")
      return (
        <div className="flex flex-wrap items-center justify-center gap-1 mt-4">
          {cells.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && (
                <div className="h-0.5 w-4 bg-slate-300 relative">
                  <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold text-purple-500">
                    {c.label}
                  </span>
                </div>
              )}
              {renderMultiInputCell(
                c.id,
                c.val,
                c.isGiven,
                undefined,
                "w-12 h-12 rounded-full border-2"
              )}
            </React.Fragment>
          ))}
        </div>
      );
    if (type === "number_line")
      return (
        <div className="w-full mt-8 relative h-20">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-400"></div>
          {Array.from({ length: 11 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-1/2 h-3 w-0.5 bg-slate-400"
              style={{ left: `${i * 10}%`, transform: "translateY(-50%)" }}
            ></div>
          ))}
          {cells.map((c) => (
            <div
              key={c.id}
              className="absolute"
              style={{
                left: `${(c.x || 0) * 10}%`,
                top: "-40px",
                transform: "translateX(-50%)",
              }}
            >
              {renderMultiInputCell(
                c.id,
                c.val,
                c.isGiven,
                undefined,
                "w-10 h-8 text-sm border bg-white z-10"
              )}
              <div className="w-0.5 h-6 bg-slate-300 mx-auto"></div>
            </div>
          ))}
          <div className="absolute top-1/2 -left-2 text-xs text-slate-400">
            {meta.start}
          </div>
          <div className="absolute top-1/2 -right-2 text-xs text-slate-400">
            {meta.start + 10 * meta.step}
          </div>
        </div>
      );
    if (type === "sequence")
      return (
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          {cells.map((c) => renderMultiInputCell(c.id, c.val, c.isGiven))}
        </div>
      );
    if (type === "calc_table")
      return (
        <div className="flex flex-col items-center mt-4 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <div className="flex gap-2 mb-2">
            <div className="w-14 h-10 sm:w-16 sm:h-12 bg-slate-100 flex items-center justify-center font-bold text-slate-500 rounded-lg">
              {meta.operator} {meta.baseVal}
            </div>
            {cells.map((cell, i) => (
              <div
                key={`head-${i}`}
                className="w-14 h-10 sm:w-16 sm:h-12 bg-blue-50 flex items-center justify-center font-bold text-blue-700 rounded-lg border border-blue-100"
              >
                {cell.label}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center font-bold text-2xl text-slate-700">
              =
            </div>
            {cells.map((cell) =>
              renderMultiInputCell(cell.id, cell.val as number, cell.isGiven)
            )}
          </div>
        </div>
      );

    if (type === "shape") {
      const shapeCoords: number[][] = meta.coords;
      const shapeWidth = 3;
      const shapeHeight = 3;
      const gridCells = [];
      for (let r = 0; r < shapeHeight; r++) {
        for (let c = 0; c < shapeWidth; c++) {
          const coordIndex = shapeCoords.findIndex(
            (sc) => sc[0] === r && sc[1] === c
          );
          if (coordIndex !== -1)
            gridCells.push(
              <div key={`shape-${r}-${c}`}>
                {renderMultiInputCell(
                  cells[coordIndex].id,
                  cells[coordIndex].val,
                  cells[coordIndex].isGiven
                )}
              </div>
            );
          else gridCells.push(<div key={`empty-${r}-${c}`}></div>);
        }
      }
      return (
        <div
          className="grid gap-2 mt-4"
          style={{ gridTemplateColumns: `repeat(3, 1fr)` }}
        >
          {gridCells}
        </div>
      );
    }
    return (
      <div
        className="grid gap-2 mt-4"
        style={{ gridTemplateColumns: `repeat(3, 1fr)` }}
      >
        {cells.map((cell) =>
          renderMultiInputCell(cell.id, cell.val, cell.isGiven)
        )}
      </div>
    );
  };

  const renderGameContent = () => {
    if (!currentQuestion) return null;
    return (
      <div
        className={`w-full flex-1 bg-white rounded-3xl shadow-lg p-4 flex flex-col items-center justify-center mb-6 lg:mb-0 relative overflow-y-auto transition-colors ${
          feedback === "correct"
            ? "bg-green-50 ring-4 ring-green-200"
            : feedback === "wrong"
            ? "bg-red-50 ring-4 ring-red-200"
            : ""
        }`}
      >
        {mode === "shopping" ? (
          renderShoppingTask()
        ) : mode === "division_remainder" ? (
          renderDivisionRemainder()
        ) : mode === "inverse_calc" ? (
          renderInverseCalc()
        ) : mode === "estimation" ? (
          renderEstimation()
        ) : mode === "money_pay" ? (
          renderMoneyPay()
        ) : mode === "money_compare" ? (
          renderMoneyCompare()
        ) : mode === "place_value" && currentQuestion.placeValueData ? (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-500 mb-2">
              {currentQuestion.text}
            </h3>
            <div className="flex items-end justify-center gap-4 mt-6">
              {renderPlaceValue()}
            </div>
            <div
              className={`w-64 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-5xl font-mono font-bold tracking-widest border-4 mt-8 ${
                feedback === "none"
                  ? "border-slate-200"
                  : feedback === "correct"
                  ? "border-green-500 text-green-600 bg-white"
                  : "border-red-500 text-red-600 bg-white"
              }`}
            >
              <input
                type="text"
                inputMode="none"
                value={input}
                onChange={(e) => handleInputChange(null, e.target.value)}
                className="w-full h-full text-center bg-transparent outline-none"
              />
            </div>
          </div>
        ) : mode === "fact_family" ? (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-500 mb-2">
              {currentQuestion.text}
            </h3>
            {renderFactFamily()}
          </div>
        ) : mode === "triangle" || mode === "triangle_add" ? (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-500 mb-2">
              {currentQuestion.text}
            </h3>
            {renderTriangle()}
          </div>
        ) : mode === "calc_wheel" ? (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-500 mb-2">
              {currentQuestion.text}
            </h3>
            {renderWheel()}
          </div>
        ) : currentQuestion.gridData ? (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-500 mb-2">
              {currentQuestion.text}
            </h3>
            {currentQuestion.hint && (
              <div className="text-sm text-blue-500 mb-2">
                {currentQuestion.hint}
              </div>
            )}
            {renderGridTask()}
          </div>
        ) : currentQuestion.stepData ? (
          <div className="w-full flex flex-col items-center">
            <h3 className="text-xl font-bold text-slate-500 mb-2">
              {currentQuestion.text}
            </h3>
            <div className="flex flex-col items-center bg-white p-2 border-2 border-slate-200 shadow-inner rounded-xl overflow-hidden mt-4">
              <div className="grid grid-cols-5 gap-0 bg-slate-100 border-l-2 border-t-2 border-slate-300">
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                  {currentQuestion.stepData.start}
                </div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                  {currentQuestion.stepData.operator}
                </div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                  {currentQuestion.stepData.operand}
                </div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                  =
                </div>
                <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-xl font-mono cursor-pointer bg-white">
                  {renderMultiInputCell(
                    "main-result",
                    currentQuestion.stepData.result,
                    false,
                    undefined,
                    "w-full h-full border-none rounded-none"
                  )}
                </div>
                <div className="col-span-5 h-1 bg-slate-800 my-0"></div>
                {currentQuestion.stepData.steps.map((step, idx) => {
                  const isFirstRow = idx === 0;
                  const prevRes = isFirstRow
                    ? currentQuestion.stepData?.start
                    : currentQuestion.stepData?.steps[idx - 1].res;
                  return (
                    <React.Fragment key={idx}>
                      {isFirstRow ? (
                        <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                          {prevRes}
                        </div>
                      ) : (
                        <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center bg-white">
                          {renderMultiInputCell(
                            `step-${idx}-start`,
                            prevRes as number,
                            false,
                            undefined,
                            "w-full h-full border-none rounded-none"
                          )}
                        </div>
                      )}
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                        {currentQuestion.stepData?.operator}
                      </div>
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center bg-white">
                        {renderMultiInputCell(
                          `step-${idx}-add`,
                          step.val,
                          false,
                          undefined,
                          "w-full h-full border-none rounded-none"
                        )}
                      </div>
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center text-slate-500 bg-slate-50">
                        =
                      </div>
                      <div className="w-14 h-12 border-b-2 border-r-2 border-slate-300 flex items-center justify-center bg-white">
                        {renderMultiInputCell(
                          `step-${idx}-res`,
                          step.res,
                          false,
                          undefined,
                          "w-full h-full border-none rounded-none"
                        )}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full mb-6 flex justify-center text-center">
              {typeof currentQuestion.text === "string" ? (
                <div className="text-2xl sm:text-5xl font-extrabold text-slate-800">
                  {currentQuestion.text}
                </div>
              ) : (
                currentQuestion.text
              )}
            </div>
            {currentQuestion.hint && feedback !== "wrong" && (
              <div className="text-xl sm:text-2xl text-blue-400 font-bold mb-6">
                {currentQuestion.hint}
              </div>
            )}
            <div
              className={`w-64 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-5xl font-mono font-bold tracking-widest border-4 ${
                feedback === "none"
                  ? "border-slate-200"
                  : feedback === "correct"
                  ? "border-green-500 text-green-600 bg-white"
                  : "border-red-500 text-red-600 bg-white"
              }`}
              >
                <input
                  type="text"
                  inputMode="none"
                  value={input}
                  onChange={(e) => handleInputChange(null, e.target.value)}
                  className="w-full h-full text-center bg-transparent outline-none"
                />
              </div>
            {feedback === "wrong" && (
              <div className="text-green-600 font-bold text-xl mt-4 bg-green-50 px-4 py-2 rounded-xl border-2 border-green-200 animate-pulse">
                Lösung:{" "}
                {currentQuestion.isDecimal
                  ? (currentQuestion.answer / 100)
                      .toFixed(2)
                      .replace(".", ",") + " €"
                  : currentQuestion.answer}
              </div>
            )}
          </>
        )}
        {feedback === "wrong" && (
          <div className="mt-6 z-20">
            <button
              onClick={() => nextQuestion(correctCount)}
              className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"
            >
              <ArrowRight /> Weiter
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderNumPad = () => (
    <div className="grid grid-cols-3 gap-3 h-64 shrink-0">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          onClick={() => handleNumPad(num.toString())}
          className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow border-b-4 border-slate-200 active:border-t-4 active:border-b-0"
        >
          {num}
        </button>
      ))}
      <button
        onClick={() => handleNumPad("DEL")}
        className="bg-red-50 text-red-500 text-2xl font-bold rounded-2xl shadow border-b-4 border-red-100 active:border-t-4 active:border-b-0"
      >
        ⌫
      </button>
      <button
        onClick={() => handleNumPad("0")}
        className="bg-white text-slate-700 text-3xl font-bold rounded-2xl shadow border-b-4 border-slate-200 active:border-t-4 active:border-b-0"
      >
        0
      </button>
      {currentQuestion?.isDecimal ? (
        <button
          onClick={() => handleNumPad(",")}
          className="bg-slate-100 text-slate-700 text-2xl font-bold rounded-2xl border-b-4 border-slate-300"
        >
          ,
        </button>
      ) : (
        <button
          onClick={
            mode === "money_compare" || mode.includes("gap")
              ? jumpToNextField
              : checkAnswer
          }
          className="bg-green-500 text-white text-2xl font-bold rounded-2xl shadow border-b-4 border-green-700 active:border-t-4 active:border-b-0"
        >
          OK
        </button>
      )}
      {currentQuestion?.isDecimal && feedback === "none" && (
        <button
          onClick={mode === "money_compare" ? jumpToNextField : checkAnswer}
          className="col-span-3 bg-green-500 text-white font-bold rounded-2xl shadow border-b-4 border-green-700 py-2 mt-1"
        >
          OK
        </button>
      )}
    </div>
  );

  // --- VIEWS ---
  if (mode === "menu") {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans safe-area-inset">
        <div className="bg-white p-6 rounded-3xl shadow-xl w-full max-w-3xl text-center relative">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="absolute top-6 right-6 bg-slate-100 p-2 rounded-full shadow text-slate-400 hover:text-slate-600 transition-colors z-20"
          >
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="bg-yellow-400 p-2 rounded-full shadow-md rotate-12">
              <Star className="w-8 h-8 text-white" fill="white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Mathe Profi
            </h1>
          </div>
          <div className="overflow-y-auto px-1 max-h-[75vh]">
            <CategorySection
              title="Rechnen & Knobeln"
              cat="calc"
              modes={[
                "addition_1000",
                "subtraction_1000",
                "gap_add",
                "gap_sub",
                "triangle_add",
                "multiplication",
                "division",
                "division_remainder",
                "inverse_calc",
                "addition",
                "subtraction",
                "pyramid",
                "calc_table",
                "fact_family",
                "triangle",
                "calc_wheel",
                "estimation",
              ]}
              onStart={startGame}
            />
            <CategorySection
              title="Zahlenraum & Orientierung"
              cat="space"
              modes={[
                "rounding",
                "place_value",
                "neighbors",
                "number_line",
                "sequences",
                "chain",
                "sorting",
                "arrows",
                "symbols",
                "shapes",
              ]}
              onStart={startGame}
            />
            <CategorySection
              title="Geld & Sachaufgaben"
              cat="money"
              modes={[
                "money_count",
                "money_compare",
                "money_calc",
                "money_pay",
                "shopping",
                "word_problem",
              ]}
              onStart={startGame}
            />
          </div>
        </div>
      </div>
    );
  }

  if (mode === "history") {
    return <div>History Placeholder</div>;
  }
  if (isRoundOver) {
    const percentage = (correctCount / QUESTIONS_PER_ROUND) * 100;
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">
            {percentage === 100 ? "Perfekt!" : "Gut gemacht!"}
          </h2>
          <div className="text-4xl font-black text-slate-800 mb-6">
            {correctCount} / {QUESTIONS_PER_ROUND}
          </div>
          <button
            onClick={() => setMode("menu")}
            className="w-full bg-blue-500 text-white font-bold py-4 rounded-xl shadow"
          >
            Zum Menü
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col p-4 font-sans safe-area-inset overflow-hidden">
      <div className="flex justify-between items-center mb-4 relative z-20">
        <button
          onClick={() => setMode("menu")}
          className="bg-white p-3 rounded-xl shadow text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold text-white mb-1 ${currentModeInfo.color}`}
          >
            {currentModeInfo.name}
          </div>
          <div className="text-2xl font-black text-slate-700">
            {questionIndex}{" "}
            <span className="text-lg text-slate-400">
              / {QUESTIONS_PER_ROUND}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="bg-white px-3 py-2 rounded-xl shadow flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" fill="currentColor" />
            <span className="font-bold text-slate-700 text-xl">
              {correctCount}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 relative z-10">
        <div className="flex flex-col flex-1 min-h-0">
          {renderGameContent()}
          {feedback !== "correct" && mode !== "money_pay" && renderNumPad()}
          {feedback !== "correct" && mode === "money_pay" && (
            <div className="mt-4">
              <button
                onClick={checkAnswer}
                className="w-full bg-green-500 text-white text-2xl font-bold rounded-2xl shadow border-b-4 border-green-700 py-4 active:scale-95 active:border-b-0"
              >
                OK
              </button>
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
