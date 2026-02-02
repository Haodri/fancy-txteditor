const editor = document.getElementById("editor");
const flowBar = document.getElementById("flow-bar");

const speedCurrent = document.getElementById("speed-current");
const speedAverage = document.getElementById("speed-average");

const btnReset = document.getElementById("btn-reset");
const btnExport = document.getElementById("btn-export");
const btnHeatmap = document.getElementById("btn-heatmap");

let lastTime = 0;
let speedList = [];

const SMOOTH_ALPHA = 0.35; 
let smoothDiff = null;

let heatmapEnabled = true;

let currentWordSpans = [];wwwwww
let currentWordSpeeds = [];

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function smooth(ms) {
  if (smoothDiff === null) smoothDiff = ms;
  smoothDiff = smoothDiff + SMOOTH_ALPHA * (ms - smoothDiff);
  return smoothDiff;
}

function getFontVariation(speedMs) {
  const tFast = clamp((1000 - speedMs) / 900, 0, 1);

  const punch = Math.pow(tFast, 0.35);
  const chaos = Math.pow(tFast, 2.0);

  let wght = 200 + punch * 800;   
  let slnt = -(12 * punch);      
  let INKT = chaos;               
  let MONO = chaos;              

 
  if (tFast > 0.55) {
    const intensity = (tFast - 0.55) / 0.45; 
    const j = (Math.random() - 0.5) * 2 * intensity; 

    
    wght += j * 320;   
    slnt += j * 5.5;   
    INKT += j * 0.25;  
    MONO += j * 0.25;  
  }

  wght = Math.round(clamp(wght, 200, 1000));
  slnt = +clamp(slnt, -12, 0).toFixed(2);
  INKT = +clamp(INKT, 0, 1).toFixed(3);
  MONO = +clamp(MONO, 0, 1).toFixed(3);

  return { wght, slnt, INKT, MONO };
}


function updateFlowMeter(speedMs) {
  const minSpeed = 100;
  const maxSpeed = 1000;

  let tSlow = (speedMs - minSpeed) / (maxSpeed - minSpeed);
  tSlow = clamp(tSlow, 0, 1);

  const percent = (1 - tSlow) * 100;
  flowBar.style.height = percent + "%";

  const hue = (1 - tSlow) * 200; 
  const bottom = `hsla(${hue}, 95%, 55%, 0.35)`;
  const mid = `hsla(${hue}, 95%, 55%, 0.18)`;

  flowBar.style.background = `
    linear-gradient(
      to top,
      ${bottom} 0%,
      ${mid} 55%,
      rgba(0,0,0,0) 100%
    )
  `;
}

function speedToHeatColor(speedMs) {
  const tSlow = clamp((speedMs - 100) / 900, 0, 1);
  const hue = (1 - tSlow) * 200;
  return `hsla(${hue}, 90%, 60%, 0.28)`;
}

function finalizeCurrentWord() {
  if (currentWordSpans.length === 0) return;

  if (heatmapEnabled) {
    const avg =
      currentWordSpeeds.reduce((a, b) => a + b, 0) / currentWordSpeeds.length;

    const color = speedToHeatColor(avg);

    for (const s of currentWordSpans) {
      s.classList.add("heat");
      s.style.background = color;
    }
  }

  currentWordSpans = [];
  currentWordSpeeds = [];
}

btnReset.addEventListener("click", () => {
  editor.innerHTML = "";
  lastTime = 0;
  speedList = [];
  smoothDiff = null;

  currentWordSpans = [];
  currentWordSpeeds = [];

  speedCurrent.textContent = "0.00 s";
  speedAverage.textContent = "Ø 0.00 s";

  updateFlowMeter(1000);
  editor.focus();
});

btnExport.addEventListener("click", () => {
  const text = editor.innerText || "";
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "flow-text.txt";
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});

btnHeatmap.addEventListener("click", () => {
  heatmapEnabled = !heatmapEnabled;

  btnHeatmap.textContent = heatmapEnabled ? "Heatmap: An" : "Heatmap: Aus";
  btnHeatmap.setAttribute("aria-pressed", String(heatmapEnabled));
  btnHeatmap.classList.toggle("is-off", !heatmapEnabled);

  if (!heatmapEnabled) {
    for (const s of editor.querySelectorAll("span.heat")) {
      s.classList.remove("heat");
      s.style.background = "";
    }
    currentWordSpans = [];
    currentWordSpeeds = [];
  }
});

editor.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    finalizeCurrentWord();
    document.execCommand("insertHTML", false, "<br>");
    return;
  }

  if (event.key.length !== 1) return;

  const now = Date.now();
  const diff = lastTime ? now - lastTime : 600;
  lastTime = now;

  const diffSmooth = smooth(diff);

  speedCurrent.textContent = (diffSmooth / 1000).toFixed(2) + " s";

  speedList.push(diff);
  if (speedList.length > 300) speedList.shift();
  const avg = speedList.reduce((a, b) => a + b, 0) / speedList.length;
  speedAverage.textContent = "Ø " + (avg / 1000).toFixed(2) + " s";

  updateFlowMeter(diffSmooth);
  const vars = getFontVariation(diffSmooth);

  const isWhitespace = /\s/.test(event.key);

  if (isWhitespace) {
    finalizeCurrentWord();
  }

 
  const span = document.createElement("span");
  span.textContent = event.key;

  span.style.fontFamily = '"ABC Whyte Plus Variable", system-ui, sans-serif';
  span.style.fontVariationSettings =
  `"wght" ${vars.wght}, "slnt" ${vars.slnt}, "INKT" ${vars.INKT}, "MONO" ${vars.MONO}`;

  const sel = window.getSelection();
  if (!sel.rangeCount) {
    editor.appendChild(span);
    event.preventDefault();
    return;
  }

  const range = sel.getRangeAt(0);
  range.insertNode(span);
  range.setStartAfter(span);
  range.setEndAfter(span);
  sel.removeAllRanges();
  sel.addRange(range);

  if (heatmapEnabled && !isWhitespace) {
    currentWordSpans.push(span);
    currentWordSpeeds.push(diffSmooth);
  }

  event.preventDefault();
});
