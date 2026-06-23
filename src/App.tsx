import React, { useState, useEffect, useRef } from 'react';

// Eigene SVG Icons, um Import-Fehler vollständig zu vermeiden und maximale Ladegeschwindigkeit zu garantieren.
const CalculatorIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12" y1="18" y2="18"/><line x1="16" x2="16" y1="18" y2="18"/><line x1="8" x2="8" y1="18" y2="18"/><line x1="16" x2="16" y1="14" y2="14"/><line x1="12" x2="12" y1="14" y2="14"/><line x1="8" x2="8" y1="14" y2="14"/><line x1="16" x2="16" y1="10" y2="10"/><line x1="12" x2="12" y1="10" y2="10"/><line x1="8" x2="8" y1="10" y2="10"/><path d="M8 6h8"/></svg>
);

const BookOpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
);

const ImageIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);

const StarIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
);

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
);

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-green-600"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
);

const XCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-red-500"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="m15 18-6-6 6-6"/></svg>
);

const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M20 5H9l-7 7 7 7h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Z"/><path d="m18 9-6 6"/><path d="m12 9 6 6"/></svg>
);

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
);

const chapters = {
  "15. Juni": [
    { id: "1x1", title: "Das kleine 1x1", icon: <CalculatorIcon />, color: "bg-blue-500" },
    { id: "geteilt", title: "Geteiltaufgaben", icon: <CalculatorIcon />, color: "bg-purple-500" },
    { id: "addition", title: "Schriftliche Addition", icon: <BookOpenIcon />, color: "bg-green-500" }
  ],
  "23. Juni": [
    { id: "1x1", title: "Das kleine 1x1", icon: <CalculatorIcon />, color: "bg-blue-500" },
    { id: "geteilt", title: "Geteiltaufgaben", icon: <CalculatorIcon />, color: "bg-purple-500" },
    { id: "addition", title: "Schriftliche Addition", icon: <BookOpenIcon />, color: "bg-green-500" },
    { id: "subtraktion", title: "Schriftliche Subtraktion", icon: <BookOpenIcon />, color: "bg-red-500" },
    { id: "bilder", title: "Sonderaufgaben (Bilder)", icon: <ImageIcon />, color: "bg-orange-500" }
  ]
};

// Hilfsfunktion zur Erzeugung von Zahlen mit erzwungenem Übertrag (Addition)
const getAddDigitsWithCarry = () => {
  let a = Math.floor(Math.random() * 6) + 3; // Ziffer 3-8
  let minB = 10 - a;
  let b = Math.floor(Math.random() * (10 - minB)) + minB; // Garantiert a+b >= 10
  return [a, b];
};

// Hilfsfunktion zur Erzeugung von Zahlen mit erzwungenem Borgen (Subtraktion)
const getSubDigitsWithBorrow = () => {
  let a = Math.floor(Math.random() * 7); // Ziffer 0-6
  let minB = a + 1;
  let b = Math.floor(Math.random() * (10 - minB)) + minB; // Garantiert a < b
  return [a, b];
};

const generateTask = (categoryId) => {
  let format = "inline", qText = "", ans = 0, details = null;

  if (categoryId === "1x1") {
    let n1 = Math.floor(Math.random() * 10) + 1;
    let n2 = Math.floor(Math.random() * 10) + 1;
    ans = n1 * n2;
    qText = `${n1} × ${n2} =`;
  } 
  else if (categoryId === "geteilt") {
    ans = Math.floor(Math.random() * 10) + 1;
    let n2 = Math.floor(Math.random() * 10) + 1;
    let n1 = ans * n2;
    qText = `${n1} ÷ ${n2} =`;
  }
  else if (categoryId === "addition") {
    let [a0, b0] = getAddDigitsWithCarry();
    let [a1, b1] = getAddDigitsWithCarry();
    let a2 = Math.floor(Math.random() * 4) + 1; 
    let b2 = Math.floor(Math.random() * 4) + 1; 
    
    let n1 = a2 * 100 + a1 * 10 + a0;
    let n2 = b2 * 100 + b1 * 10 + b0;
    ans = n1 + n2;
    
    let cols = 3; 
    let s1 = String(n1).split('').reverse().map(Number);
    let s2 = String(n2).split('').reverse().map(Number);
    let expected = {};
    let seq = [];
    let c = 0;
    
    for (let i = 0; i < cols; i++) {
      let sum = (s1[i] || 0) + (s2[i] || 0) + c;
      expected[`r${i}`] = (sum % 10).toString();
      c = sum >= 10 ? 1 : 0;
      if (i < cols - 1) {
        expected[`c${i+1}`] = c.toString();
      }
    }
    if (c > 0) {
      expected[`r${cols}`] = c.toString();
    }

    seq = ['r0', 'c1', 'r1', 'c2', 'r2'];
    if (c > 0) {
      seq.push('r3');
    }

    format = "vertical";
    details = { n1, n2, op: '+', expected, seq, cols };
  }
  else if (categoryId === "subtraktion") {
    let [a0, b0] = getSubDigitsWithBorrow();
    let [a1, b1] = getSubDigitsWithBorrow();
    let a2 = Math.floor(Math.random() * 4) + 5; 
    let b2 = Math.floor(Math.random() * 3) + 1; 
    
    let n1 = a2 * 100 + a1 * 10 + a0;
    let n2 = b2 * 100 + b1 * 10 + b0;
    ans = n1 - n2;

    let cols = 3;
    let s1 = String(n1).split('').reverse().map(Number);
    let s2 = String(n2).split('').reverse().map(Number);
    let expected = {};
    let seq = [];
    let c = 0;

    for (let i = 0; i < cols; i++) {
      let diff = (s1[i] || 0) - (s2[i] || 0) - c;
      let finalDigit = diff < 0 ? diff + 10 : diff;
      expected[`r${i}`] = finalDigit.toString();
      c = diff < 0 ? 1 : 0;
      if (i < cols - 1) {
        expected[`c${i+1}`] = c.toString();
      }
    }

    seq = ['r0', 'c1', 'r1', 'c2', 'r2'];

    format = "vertical";
    details = { n1, n2, op: '-', expected, seq, cols };
  }
  else if (categoryId === "bilder") {
    const bildAufgaben = [
      { q: "Ein Bauer erntet am Montag 245 rote Äpfel und am Dienstag 188 grüne Äpfel. Wie viele Äpfel hat er insgesamt?", a: 433 },
      { q: "In der Schule sind 524 Schüler. Heute fehlen 135 Kinder wegen einer Grippewelle. Wie viele Kinder sind heute in der Schule?", a: 389 },
      { q: "Ein Spielzeugladen hat 312 Baustein-Sets. Am Vormittag werden 145 Sets verkauft. Wie viele Sets sind noch im Laden?", a: 167 },
      { q: "Die Klasse 3a sammelt Spenden für Tierfutter. Am ersten Tag sammeln sie 156 Euro, am zweiten Tag 275 Euro. Wie viel Geld haben sie?", a: 431 },
      { q: "Für ein Schulfest wurden 600 Luftballons aufgeblasen. Davon platzen leider 246 Stück. Wie viele Luftballons sind noch ganz?", a: 354 },
      { q: "Ein Buch hat 415 Seiten. Felix hat bereits 189 Seiten geschafft. Wie viele Seiten muss Felix noch lesen, um das Buch fertig zu kriegen?", a: 226 }
    ];
    const rTask = bildAufgaben[Math.floor(Math.random() * bildAufgaben.length)];
    ans = rTask.a;
    qText = rTask.q;
    format = "text";
  }

  return { answer: ans, format, qText, categoryId, details };
};

// Interaktives Zeichen-Schmierblatt für Kinder-Skizzen
function Scratchpad({ activeCategory }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Inhalt sichern vor dem Resize
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempCtx.drawImage(canvas, 0, 0);

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 360;

      // Kontext wiederherstellen
      const ctx = canvas.getContext('2d');
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#4f46e5'; 
      ctx.lineWidth = 4;

      ctx.drawImage(tempCanvas, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeCategory]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { x, y } = getCoordinates(e);

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="flex flex-col bg-amber-50 border-2 border-dashed border-amber-300 rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <span className="text-amber-800 font-bold flex items-center gap-2 text-base">
          <PencilIcon /> Zauber-Schmierblatt
        </span>
        <button
          onClick={clearCanvas}
          type="button"
          className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-3 rounded-xl shadow-sm text-sm flex items-center gap-1.5 transition active:scale-95"
        >
          <TrashIcon /> Löschen
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden shadow-inner relative h-[360px]">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair touch-none"
        />
        <div className="absolute bottom-2 right-3 text-xs text-slate-300 pointer-events-none select-none font-bold">
          Schreibe oder zeichne hier deine Notizen!
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeChapter, setActiveChapter] = useState("15. Juni");
  const [activeCategory, setActiveCategory] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [feedback, setFeedback] = useState(null); 
  const [score, setScore] = useState(0);

  const [userAnswer, setUserAnswer] = useState(""); 
  const [userInputs, setUserInputs] = useState({}); 
  const [activeCell, setActiveCell] = useState(""); 

  const startCategory = (category) => {
    setActiveCategory(category);
    const task = generateTask(category.id);
    setCurrentTask(task);
    setFeedback(null);
    setUserAnswer("");
    setUserInputs({});
    
    if (task.format === "vertical") {
      setActiveCell(task.details.seq[0]);
    }
  };

  const handleNextTask = () => {
    const task = generateTask(activeCategory.id);
    setCurrentTask(task);
    setFeedback(null);
    setUserAnswer("");
    setUserInputs({});
    
    if (task.format === "vertical") {
      setActiveCell(task.details.seq[0]);
    }
  };

  const handleDigitInput = (digit) => {
    if (feedback !== null) return;

    if (currentTask.format === "vertical") {
      const updatedInputs = { ...userInputs, [activeCell]: digit };
      setUserInputs(updatedInputs);

      const currentIndex = currentTask.details.seq.indexOf(activeCell);
      
      if (currentIndex !== -1 && currentIndex < currentTask.details.seq.length - 1) {
        setActiveCell(currentTask.details.seq[currentIndex + 1]);
      }
    } else {
      setUserAnswer((prev) => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (feedback !== null) return;

    if (currentTask.format === "vertical") {
      const updatedInputs = { ...userInputs, [activeCell]: "" };
      setUserInputs(updatedInputs);

      if (!userInputs[activeCell]) {
        const currentIndex = currentTask.details.seq.indexOf(activeCell);
        if (currentIndex > 0) {
          setActiveCell(currentTask.details.seq[currentIndex - 1]);
        }
      }
    } else {
      setUserAnswer((prev) => prev.slice(0, -1));
    }
  };

  const isInputComplete = () => {
    if (!currentTask) return false;
    if (currentTask.format !== "vertical") {
      return userAnswer.trim() !== "";
    }
    
    return currentTask.details.seq.every(cellId => {
      if (cellId.startsWith('c') && currentTask.details.expected[cellId] === "0") {
        return true; 
      }
      return userInputs[cellId] !== undefined && userInputs[cellId] !== "";
    });
  };

  const checkAnswer = (e) => {
    if (e) e.preventDefault();
    if (!isInputComplete()) return;

    if (currentTask.format === "vertical") {
      let allCorrect = true;
      currentTask.details.seq.forEach((cellId) => {
        const userVal = userInputs[cellId] || "";
        const expectedVal = currentTask.details.expected[cellId] || "0";
        
        if (cellId.startsWith('c') && expectedVal === "0" && (userVal === "" || userVal === "0")) {
          // Korrekt ausgelassenes Feld
        } else if (userVal !== expectedVal) {
          allCorrect = false;
        }
      });

      if (allCorrect) {
        setFeedback("correct");
        setScore((s) => s + 1);
      } else {
        setFeedback("incorrect");
      }
    } else {
      const parsed = parseInt(userAnswer.trim(), 10);
      if (parsed === currentTask.answer) {
        setFeedback("correct");
        setScore((s) => s + 1);
      } else {
        setFeedback("incorrect");
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") {
        handleDigitInput(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Enter") {
        if (isInputComplete()) {
          checkAnswer();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeCell, userInputs, userAnswer, currentTask, feedback]);

  const renderVerticalGrid = () => {
    const { n1, n2, op } = currentTask.details;
    const digits1 = String(n1).padStart(3, ' ').split('');
    const digits2 = String(n2).padStart(3, ' ').split('');

    return (
      <div className="flex flex-col items-center my-4">
        <div className="grid grid-cols-4 gap-2 text-4xl md:text-5xl font-mono font-bold text-gray-800 items-center justify-items-center bg-white p-5 rounded-2xl border border-gray-200 shadow-inner">
          <div className="text-gray-300"></div>
          {digits1.map((d, i) => (
            <div key={`n1-${i}`} className="w-12 h-12 flex items-center justify-center">{d !== ' ' ? d : ''}</div>
          ))}

          <div className="text-indigo-600">{op}</div>
          {digits2.map((d, i) => (
            <div key={`n2-${i}`} className="w-12 h-12 flex items-center justify-center">{d !== ' ' ? d : ''}</div>
          ))}

          <div className="text-xs text-indigo-400 font-sans font-semibold uppercase tracking-wider self-center">
            {op === '+' ? 'Übertrag' : 'Borgen'}
          </div>
          <div className="w-12 h-12 flex items-center justify-center">
            {renderInputCell("c2")}
          </div>
          <div className="w-12 h-12 flex items-center justify-center">
            {renderInputCell("c1")}
          </div>
          <div className="w-12 h-12 text-gray-300 text-sm flex items-center justify-center">-</div>

          <div className="col-span-4 w-full h-1 bg-gray-400 my-1 rounded-full"></div>

          <div className="text-xs text-green-600 font-sans font-semibold uppercase tracking-wider">Ergebnis</div>
          <div className="w-12 h-12 flex items-center justify-center">
            {renderInputCell("r2")}
          </div>
          <div className="w-12 h-12 flex items-center justify-center">
            {renderInputCell("r1")}
          </div>
          <div className="w-12 h-12 flex items-center justify-center">
            {renderInputCell("r0")}
          </div>
        </div>
      </div>
    );
  };

  const renderInputCell = (cellId) => {
    const isCarry = cellId.startsWith('c');
    const userVal = userInputs[cellId] || "";
    const expectedVal = currentTask.details.expected[cellId] || "0";
    const isActive = activeCell === cellId && feedback === null;
    
    const isWrong = feedback !== null && (
      isCarry && expectedVal === "0" 
        ? (userVal !== "" && userVal !== "0")
        : userVal !== expectedVal
    );
    const isCorrect = feedback !== null && !isWrong;
    const isUnneededCarry = isCarry && expectedVal === "0";

    return (
      <div 
        onClick={() => feedback === null && setActiveCell(cellId)}
        className={`relative w-12 h-12 flex items-center justify-center rounded-xl cursor-pointer transition-all border-2 font-mono font-bold
          ${isActive ? 'border-indigo-600 bg-indigo-50 shadow-md scale-105' : 'border-gray-200 hover:border-gray-300 bg-gray-50'}
          ${isCarry ? 'text-lg text-indigo-700 w-10 h-10' : 'text-3xl text-gray-800'}
          ${isCorrect ? 'border-green-500 bg-green-50 text-green-700' : ''}
          ${isWrong ? 'border-red-500 bg-red-50' : ''}
          ${isUnneededCarry && feedback === null ? 'opacity-30 border-dashed bg-transparent hover:border-gray-300' : ''}
        `}
      >
        {isWrong ? (
          <div className="relative flex flex-col items-center justify-center">
            <span className="text-red-500 line-through decoration-red-600 decoration-3">
              {userVal || "0"}
            </span>
            <span className="absolute -top-5 text-sm text-green-600 font-extrabold font-sans">
              {expectedVal}
            </span>
          </div>
        ) : (
          <span>{userVal}</span>
        )}
      </div>
    );
  };

  const renderKeypad = () => {
    return (
      <div className="w-full max-w-sm mx-auto mt-4 bg-slate-200 p-4 rounded-3xl shadow-lg border border-slate-300">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitInput(num.toString())}
              className="bg-white hover:bg-indigo-50 text-gray-800 font-bold text-2xl py-4 rounded-2xl active:scale-95 transition shadow-sm border-b-4 border-slate-300 hover:border-indigo-200"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleBackspace}
            className="bg-red-100 hover:bg-red-200 text-red-600 font-bold text-xl py-4 rounded-2xl active:scale-95 transition shadow-sm flex items-center justify-center border-b-4 border-red-300"
          >
            <DeleteIcon />
          </button>
          <button
            type="button"
            onClick={() => handleDigitInput("0")}
            className="bg-white hover:bg-indigo-50 text-gray-800 font-bold text-2xl py-4 rounded-2xl active:scale-95 transition shadow-sm border-b-4 border-slate-300"
          >
            0
          </button>
          <button
            type="button"
            disabled={!isInputComplete() || feedback !== null}
            onClick={() => checkAnswer()}
            className={`font-bold text-lg py-4 rounded-2xl active:scale-95 transition shadow-sm border-b-4 flex items-center justify-center
              ${isInputComplete() && feedback === null
                ? 'bg-green-500 hover:bg-green-600 text-white border-green-600' 
                : 'bg-gray-300 text-gray-500 border-gray-400 cursor-not-allowed'}`}
          >
            Prüfen
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-gray-900 pb-12">
      {/* HEADER */}
      {activeCategory ? (
        <header className={`${activeCategory.color} text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-50`}>
          <button 
            onClick={() => setActiveCategory(null)}
            className="flex items-center gap-2 hover:bg-white/20 p-2 rounded-xl transition font-bold"
          >
            <ChevronLeftIcon /> Zurück
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            {activeCategory.title}
          </h1>
          <div className="flex items-center gap-1 font-bold text-lg bg-white/20 px-4 py-1.5 rounded-full shadow-inner">
            <StarIcon className="w-5 h-5 text-yellow-300" /> {score} Sternchen
          </div>
        </header>
      ) : (
        <header className="bg-indigo-600 text-white p-8 shadow-lg text-center rounded-b-[2.5rem] relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full opacity-30"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-700 rounded-full opacity-40"></div>
          <h1 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 drop-shadow-md">
            <CalculatorIcon />
            Zauberhafte Mathe App
          </h1>
          <p className="opacity-90 mt-2 text-lg font-medium">Rechnen lernen macht riesigen Spaß! 🌟</p>
        </header>
      )}

      {/* BODY CONTENT */}
      <main className="max-w-7xl mx-auto p-4 mt-6">
        {!activeCategory ? (
          /* KAPITEL & KATEGORIEN-ANSICHT */
          <div className="max-w-3xl mx-auto animate-in fade-in duration-300">
            {/* KAPITEL NAVIGATOR */}
            <div className="flex justify-center gap-4 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-200 max-w-sm mx-auto">
              {Object.keys(chapters).map((chapter) => (
                <button
                  key={chapter}
                  onClick={() => setActiveChapter(chapter)}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold text-base transition-all duration-200 ${
                    activeChapter === chapter
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {chapter}
                </button>
              ))}
            </div>

            {/* AUFGABEN-KARTEN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {chapters[activeChapter].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => startCategory(cat)}
                  className="bg-white rounded-3xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex items-center gap-5 group border border-gray-100 text-left"
                >
                  <div className={`${cat.color} text-white p-4 rounded-2xl group-hover:scale-110 transition-transform duration-300 shadow-md`}>
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-gray-400 mt-1 text-sm font-medium">Hier tippen zum Üben &rarr;</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ZWEISPALTIGES INTERAKTIVES RECHENZENTRUM MIT SCHMIERBLATT */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in zoom-in duration-200">
            
            {/* LINKE SPALTE: AUFGABE & KEYPAD */}
            <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl p-6 border border-gray-100">
              
              {/* AUFGABEN-STELLUNG */}
              {currentTask && (
                <div>
                  {currentTask.format === "inline" && (
                    <div className="text-5xl md:text-6xl font-bold text-gray-800 text-center my-10 font-mono tracking-wide">
                      {currentTask.qText}{" "}
                      <span className="inline-block px-4 py-1.5 border-4 border-dashed border-indigo-400 text-indigo-600 rounded-2xl min-w-[3rem] text-center">
                        {userAnswer || "?"}
                      </span>
                    </div>
                  )}

                  {currentTask.format === "text" && (
                    <div className="bg-orange-50 border-2 border-orange-200 p-6 rounded-2xl text-lg md:text-xl font-medium leading-relaxed text-gray-700 max-w-xl mx-auto shadow-sm my-6 relative">
                      <span className="absolute -top-3 left-4 bg-orange-400 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        Sachaufgabe
                      </span>
                      <p className="mt-2">{currentTask.qText}</p>
                      <div className="mt-6 flex justify-center items-center gap-3">
                        <span className="text-gray-500 font-bold">Ergebnis:</span>
                        <span className="inline-block text-2xl font-mono font-bold px-4 py-1.5 border-2 border-dashed border-orange-400 bg-white text-orange-600 rounded-xl min-w-[3rem] text-center shadow-inner">
                          {userAnswer || "?"}
                        </span>
                      </div>
                    </div>
                  )}

                  {currentTask.format === "vertical" && (
                    <div className="my-2">
                      <p className="text-gray-400 text-center text-sm font-bold uppercase tracking-wider mb-2">
                        Klicke auf die grauen Kästchen zum Rechnen!
                      </p>
                      {renderVerticalGrid()}
                    </div>
                  )}
                </div>
              )}

              {/* RÜCKMELDUNG BEI FEHLERN */}
              {feedback === 'incorrect' && currentTask.format !== "vertical" && (
                <div className="bg-red-50 border-2 border-red-200 text-red-800 p-4 rounded-2xl max-w-md mx-auto text-center my-4 animate-bounce">
                  <p className="font-bold flex items-center justify-center gap-2">
                    <XCircleIcon /> Fast geschafft!
                  </p>
                  <p className="text-base font-medium mt-1">
                    Du hattest <span className="line-through decoration-red-600 font-extrabold">{userAnswer || "?"}</span> eingegeben.
                  </p>
                  <p className="text-green-700 font-extrabold text-lg mt-1">
                    Das richtige Ergebnis ist: {currentTask.answer}
                  </p>
                </div>
              )}

              {feedback === 'correct' && (
                <div className="bg-green-50 border-2 border-green-200 text-green-800 p-4 rounded-2xl max-w-md mx-auto text-center my-4 animate-bounce flex flex-col items-center justify-center gap-1">
                  <CheckCircleIcon />
                  <p className="font-extrabold text-xl mt-1">Phantastisch gerechnet!</p>
                  <p className="text-sm font-medium text-green-600">+1 Sternchen verdient ⭐️</p>
                </div>
              )}

              {/* KEYPAD & NAVIGATION BUTTONS */}
              {feedback === null ? (
                renderKeypad()
              ) : (
                <div className="flex justify-center mt-6">
                  <button
                    type="button"
                    onClick={handleNextTask}
                    className={`w-full max-w-xs py-4 flex items-center justify-center gap-2 text-white font-bold rounded-2xl text-xl shadow-lg hover:shadow-xl active:scale-95 transition-all
                      ${feedback === 'correct' ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    Nächste Aufgabe <ArrowRightIcon />
                  </button>
                </div>
              )}

            </div>

            {/* RECHTE SPALTE: SCHMIERBLATT / NOTIZBEREICH */}
            <div className="lg:col-span-5">
              <Scratchpad activeCategory={activeCategory} />
            </div>

          </div>
        )}
      </main>
    </div>
  );
}