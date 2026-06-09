// ─── DOM ─────────────────────────────────────────────────────────────────────

const promptInput  = document.getElementById("prompt-input");
const charCount    = document.getElementById("char-count");
const generateBtn  = document.getElementById("generate-btn");
const genBtnLabel  = document.getElementById("gen-btn-label");
const chips        = document.querySelectorAll(".chip");

const stateEmpty   = document.getElementById("state-empty");
const stateLoading = document.getElementById("state-loading");
const stateResult  = document.getElementById("state-result");
const loadingLog   = document.getElementById("loading-log");

const embedFrame   = document.getElementById("embed-frame");
const riName       = document.getElementById("ri-name");
const riScore      = document.getElementById("ri-score");
const riStats      = document.getElementById("ri-stats");

// ─── State ───────────────────────────────────────────────────────────────────

let busy = false;

// ─── View switching ───────────────────────────────────────────────────────────

function showState(id) {
  [stateEmpty, stateLoading, stateResult].forEach(el => el.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ─── Generation log ───────────────────────────────────────────────────────────

let logTimer = null;

function clearLog() {
  loadingLog.innerHTML = "";
}

function appendLog(html, delay) {
  return new Promise(res => {
    logTimer = setTimeout(() => {
      const line = document.createElement("div");
      line.className = "log-line";
      line.innerHTML = html;
      loadingLog.appendChild(line);
      loadingLog.scrollTop = loadingLog.scrollHeight;
      res();
    }, delay);
  });
}

async function runLog(prompt, data) {
  const kw    = data.keywords.slice(0, 4).join(", ") || prompt;
  const cat   = data.category || "general";
  const total = data.total;

  const lines = [
    [  0, `<span class="ll-dot">◈</span> <span class="ll-hi">analizez promptul</span> <span class="ll-val">"${esc(prompt)}"</span>`],
  ];

  // Show translation step if Romanian was detected
  if (data.translated) {
    lines.push([250, `<span class="ll-dot">◈</span> <span class="ll-hi">limbă detectată</span> <span class="ll-val">română → engleză</span>`]);
    lines.push([500, `<span class="ll-dot">◈</span> <span class="ll-hi">traducere</span> <span class="ll-val">"${esc(data.translated_q)}"</span>`]);
    lines.push([750, `<span class="ll-dot">◈</span> <span class="ll-hi">cuvinte cheie extrase</span> <span class="ll-val">[${esc(kw)}]</span>`]);
    lines.push([950, `<span class="ll-dot">◈</span> <span class="ll-hi">categorie detectată</span> <span class="ll-val">${cat}</span>`]);
    lines.push([1150,`<span class="ll-dot">◈</span> scanez baza de date Sketchfab...`]);
    lines.push([1550,`<span class="ll-dot">◈</span> <span class="ll-hi">candidați găsiți</span> <span class="ll-val">${total}</span>`]);
    lines.push([1800,`<span class="ll-dot">◈</span> evaluez după relevanță · calitate · descărcări...`]);
  } else {
    lines.push([300, `<span class="ll-dot">◈</span> <span class="ll-hi">cuvinte cheie extrase</span> <span class="ll-val">[${esc(kw)}]</span>`]);
    lines.push([500, `<span class="ll-dot">◈</span> <span class="ll-hi">categorie detectată</span> <span class="ll-val">${cat}</span>`]);
    lines.push([700, `<span class="ll-dot">◈</span> scanez baza de date Sketchfab...`]);
    lines.push([1100,`<span class="ll-dot">◈</span> <span class="ll-hi">candidați găsiți</span> <span class="ll-val">${total}</span>`]);
    lines.push([1350,`<span class="ll-dot">◈</span> evaluez după relevanță · calitate · descărcări...`]);
  }

  // show only the winner
  const winner = data.candidates[0];
  if (winner) {
    lines.push([1700, `<span class="ll-dot ll-ok">✓</span> <span class="ll-ok">model generat → ${esc(winner.name)}</span>`]);
  }

  lines.push([t + 100, `<span class="ll-dot ll-ok">◈</span> <span class="ll-ok">se încarcă vizualizatorul...</span>`]);

  for (const [delay, html] of lines) {
    await appendLog(html, delay);
  }
}

// ─── Generate ─────────────────────────────────────────────────────────────────

async function generate() {
  const prompt = promptInput.value.trim();
  if (!prompt || busy) return;

  busy = true;
  generateBtn.disabled = true;
  genBtnLabel.textContent = "Se generează...";

  clearLog();
  showState("state-loading");
  embedFrame.src = "";

  try {
    // Fire the API call immediately — log animates concurrently
    const fetchPromise = fetch(`/api/best?q=${encodeURIComponent(prompt)}`);

    const res = await fetchPromise;
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    const data = await res.json();

    // Play the log animation while we wait (minimum display time)
    await runLog(prompt, data);

    // Small pause so the last log line is visible
    await sleep(400);

    // Populate result
    displayResult(data);
    showState("state-result");

  } catch (err) {
    clearLog();
    await appendLog(`<span class="ll-dot" style="color:var(--error,#f87171)">✕</span> <span style="color:#f87171">${esc(err.message)}</span>`, 0);
    await sleep(300);
    await appendLog(`<span class="ll-dot">◈</span> asigură-te că serverul rulează pe <span class="ll-hi">localhost:3456</span>`, 100);
  } finally {
    busy = false;
    generateBtn.disabled = false;
    genBtnLabel.textContent = "Generează Model 3D";
  }
}

function displayResult(data) {
  const m = data.model;

  riName.textContent  = m.name;
  riScore.textContent = `scor potrivire ${data.score}`;

  // stat pills
  riStats.innerHTML = [
    m.faceCount  ? `<span class="ri-pill faces">◈ ${fmt(m.faceCount)} faces</span>` : "",
    m.likeCount  ? `<span class="ri-pill likes">♥ ${fmt(m.likeCount)}</span>` : "",
    m.animated   ? `<span class="ri-pill anim">Animated</span>` : "",
    m.downloadable ? `<span class="ri-pill dl">Downloadable</span>` : "",
    m.rigged     ? `<span class="ri-pill rigged">Rigged</span>` : "",
  ].join("");

  embedFrame.src = `${m.viewerUrl}?autostart=1&ui_theme=dark&camera=0&ui_infos=0&ui_watermark=0`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fmt(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ─── Events ───────────────────────────────────────────────────────────────────

promptInput.addEventListener("input", () => {
  charCount.textContent = `${promptInput.value.length} / 300`;
});

promptInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate();
});

generateBtn.addEventListener("click", generate);

chips.forEach(chip => {
  chip.addEventListener("click", () => {
    promptInput.value = chip.dataset.prompt;
    charCount.textContent = `${promptInput.value.length} / 300`;
    promptInput.focus();
  });
});
