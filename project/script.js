/* ============================================================
   INTERVIEW UPSKILL AI — script.js
   Vanilla JavaScript: no frameworks, no build step
   ============================================================ */

// ── Company & Role data ──────────────────────────────────────
const COMPANIES = [
  { id: "google",    name: "Google",    short: "G",  color: "#4285F4" },
  { id: "amazon",    name: "Amazon",    short: "A",  color: "#FF9900" },
  { id: "microsoft", name: "Microsoft", short: "M",  color: "#00A4EF" },
  { id: "infosys",   name: "Infosys",   short: "I",  color: "#007CC3" },
  { id: "tcs",       name: "TCS",       short: "T",  color: "#0095DA" },
  { id: "wipro",     name: "Wipro",     short: "W",  color: "#341C6A" },
  { id: "accenture", name: "Accenture", short: "Ac", color: "#A100FF" },
];
const ROLES = [
  "Software Engineer","Frontend Dev","Backend Dev","Full Stack",
  "Data Scientist","DevOps","HR","Product Manager",
];

// ── State ────────────────────────────────────────────────────
let selectedCompany = null;
let selectedRole    = null;
let selectedDiff    = "Medium";
let currentQuestion = "";
let questionCount   = 0;
let micActive       = false;
let micStream       = null;
let analyser        = null;
let animFrame       = 0;
let sessions        = JSON.parse(localStorage.getItem("upskill_sessions") || "[]");

// ── Page navigation ──────────────────────────────────────────
function showPage(id) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("page-" + id).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => {
    if (b.textContent.toLowerCase().includes(id)) b.classList.add("active");
  });
  if (id === "dashboard") renderDashboard();
  if (id === "interview") updateInterviewMeta();
}

// ── Build company grid ───────────────────────────────────────
function buildCompanyGrid() {
  const grid = document.getElementById("company-grid");
  grid.innerHTML = "";
  COMPANIES.forEach(c => {
    const card = document.createElement("div");
    card.className = "company-card";
    card.dataset.id = c.id;
    card.innerHTML = `
      <div class="dot"></div>
      <div class="company-logo" style="background:linear-gradient(135deg,${c.color}cc,${c.color}66)">${c.short}</div>
      <div class="company-name">${c.name}</div>`;
    card.onclick = () => {
      document.querySelectorAll(".company-card").forEach(x => x.classList.remove("selected"));
      card.classList.add("selected");
      selectedCompany = c.id;
      checkStartReady();
    };
    grid.appendChild(card);
  });

  // Showcase grid
  const show = document.getElementById("showcase-grid");
  show.innerHTML = "";
  COMPANIES.forEach(c => {
    const el = document.createElement("div");
    el.className = "showcase-card";
    el.innerHTML = `
      <div class="showcase-logo" style="background:linear-gradient(135deg,${c.color}cc,${c.color}44)">${c.short}</div>
      <div class="showcase-name">${c.name}</div>`;
    show.appendChild(el);
  });
}

// ── Build role grid ──────────────────────────────────────────
function buildRoleGrid() {
  const grid = document.getElementById("role-grid");
  grid.innerHTML = "";
  ROLES.forEach(r => {
    const btn = document.createElement("button");
    btn.className = "role-btn";
    btn.textContent = r;
    btn.onclick = () => {
      document.querySelectorAll(".role-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedRole = r;
      checkStartReady();
    };
    grid.appendChild(btn);
  });
}

// ── Difficulty selector ──────────────────────────────────────
function selectDiff(d, btn) {
  document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active-diff"));
  btn.classList.add("active-diff");
  selectedDiff = d;
}

// ── Start button readiness ───────────────────────────────────
function checkStartReady() {
  const btn = document.getElementById("start-btn");
  if (selectedCompany && selectedRole) {
    btn.disabled = false;
    btn.textContent = "Start Interview →";
  } else {
    btn.disabled = true;
    btn.textContent = "Select company and role to begin";
  }
}

// ── Start interview ──────────────────────────────────────────
function startInterview() {
  if (!selectedCompany || !selectedRole) return;
  questionCount = 0;
  showPage("interview");
  setStage("ready");
  document.getElementById("ready-desc").textContent =
    `Click below to get a ${selectedDiff.toLowerCase()} ${selectedRole} question from ${getCompany().name}`;
}

function getCompany() {
  return COMPANIES.find(c => c.id === selectedCompany) || COMPANIES[0];
}

// ── Interview meta header ────────────────────────────────────
function updateInterviewMeta() {
  const c = getCompany();
  const diffClass = { Easy:"diff-easy", Medium:"diff-medium", Hard:"diff-hard" }[selectedDiff] || "diff-medium";
  document.getElementById("interview-meta").innerHTML = `
    <div class="meta-logo" style="background:linear-gradient(135deg,${c.color}cc,${c.color}66)">${c.short}</div>
    <span class="meta-company">${c.name}</span>
    <span class="meta-sep">›</span>
    <span class="meta-role">${selectedRole || "—"}</span>
    <span class="meta-diff ${diffClass}">${selectedDiff}</span>`;
  document.getElementById("q-count").textContent = questionCount > 0 ? `Q#${questionCount}` : "Q#—";
}

// ── Stage management ─────────────────────────────────────────
function setStage(name) {
  document.querySelectorAll(".stage").forEach(s => s.classList.remove("active"));
  const el = document.getElementById("stage-" + name);
  if (el) el.classList.add("active");
}

// ── Generate question ────────────────────────────────────────
async function generateQuestion() {
  hideError();
  setStage("generating");
  try {
    const res = await fetch("/api/generate-question", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: getCompany().name, role: selectedRole, difficulty: selectedDiff }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to generate question");
    currentQuestion = data.question;
    questionCount++;
    document.getElementById("q-count").textContent = `Q#${questionCount}`;
    document.getElementById("question-box").innerHTML = `
      <div class="qlabel">Interview Question</div>
      <div class="qtext">${escHtml(currentQuestion)}</div>`;
    document.getElementById("answer-input").value = "";
    updateAnswerMeta();
    setStage("answering");
  } catch (e) {
    showError(e.message);
    setStage("ready");
  }
}

// ── Answer meta counters ─────────────────────────────────────
function updateAnswerMeta() {
  const txt = document.getElementById("answer-input").value;
  document.getElementById("char-count").textContent = txt.length + " characters";
  const words = txt.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById("word-count").textContent = words + " words";
}
document.addEventListener("input", e => {
  if (e.target.id === "answer-input") updateAnswerMeta();
});

// ── Submit answer ────────────────────────────────────────────
async function submitAnswer() {
  const answer = document.getElementById("answer-input").value.trim();
  if (!answer) return;
  hideError();
  setStage("evaluating");
  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: currentQuestion, answer, company: getCompany().name, role: selectedRole }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to evaluate answer");
    renderFeedback(data, answer);
    saveSession({ question: currentQuestion, answer, score: data.score, company: getCompany().name, role: selectedRole });
  } catch (e) {
    showError(e.message);
    setStage("answering");
  }
}

// ── Render feedback ──────────────────────────────────────────
function renderFeedback(fb, answer) {
  const score = fb.score;
  const color = score >= 8 ? "#22c55e" : score >= 5 ? "#3b82f6" : "#ef4444";
  const label = score >= 8 ? "Excellent!" : score >= 6 ? "Good" : score >= 4 ? "Fair" : "Needs Work";

  document.getElementById("feedback-question").innerHTML = `
    <div class="qlabel">Question</div>
    <div class="qtext">${escHtml(currentQuestion)}</div>`;

  // Score ring
  const circumference = 2 * Math.PI * 40;
  const dash = (score / 10) * circumference;
  const ring = document.getElementById("score-ring");
  ring.setAttribute("stroke", color);
  ring.setAttribute("stroke-dasharray", `${dash} ${circumference}`);
  ring.style.filter = `drop-shadow(0 0 8px ${color})`;

  document.getElementById("score-num").textContent = score;
  document.getElementById("score-num").style.color = color;
  document.getElementById("score-label").textContent = label;
  document.getElementById("score-label").style.color = color;
  document.getElementById("score-desc").textContent = `Your answer scored ${score}/10`;

  const bar = document.getElementById("score-bar");
  bar.style.background = color;
  bar.style.width = "0%";
  setTimeout(() => { bar.style.width = `${(score / 10) * 100}%`; }, 100);

  // Strengths
  const sl = document.getElementById("strengths-list");
  sl.innerHTML = fb.strengths && fb.strengths.length
    ? fb.strengths.map(s => `<li><span style="color:#4ade80">•</span> ${escHtml(s)}</li>`).join("")
    : `<li class="muted">No specific strengths noted.</li>`;

  // Weaknesses
  const wl = document.getElementById("weaknesses-list");
  wl.innerHTML = fb.weaknesses && fb.weaknesses.length
    ? fb.weaknesses.map(w => `<li><span style="color:#f87171">•</span> ${escHtml(w)}</li>`).join("")
    : `<li class="muted">No major weaknesses.</li>`;

  document.getElementById("improved-answer").textContent = fb.improvedAnswer || "—";

  setStage("feedback");
}

// ── Next question ────────────────────────────────────────────
function nextQuestion() {
  setStage("ready");
  currentQuestion = "";
  document.getElementById("answer-input").value = "";
  document.getElementById("ready-desc").textContent =
    `Click below to get a ${selectedDiff.toLowerCase()} ${selectedRole} question from ${getCompany().name}`;
}

// ── Error helpers ────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById("error-banner");
  el.textContent = "⚠ " + msg;
  el.style.display = "flex";
}
function hideError() {
  document.getElementById("error-banner").style.display = "none";
}

// ── Session storage ──────────────────────────────────────────
function saveSession(s) {
  s.timestamp = Date.now();
  sessions.push(s);
  localStorage.setItem("upskill_sessions", JSON.stringify(sessions));
}
function clearSessions() {
  if (!confirm("Clear all session data?")) return;
  sessions = [];
  localStorage.removeItem("upskill_sessions");
  renderDashboard();
}

// ── Dashboard ────────────────────────────────────────────────
function renderDashboard() {
  const empty   = document.getElementById("dash-empty");
  const content = document.getElementById("dash-content");
  const clearBtn = document.getElementById("clear-btn");

  if (sessions.length === 0) {
    empty.style.display   = "flex";
    content.style.display = "none";
    clearBtn.style.display = "none";
    return;
  }
  empty.style.display   = "none";
  content.style.display = "block";
  clearBtn.style.display = "block";

  const total = sessions.length;
  const avgScore = sessions.reduce((s, r) => s + r.score, 0) / total;
  const accuracy = Math.round((avgScore / 10) * 100);
  const best = Math.max(...sessions.map(s => s.score));

  document.getElementById("stat-accuracy").textContent = accuracy + "%";
  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-avg").textContent = (Math.round(avgScore * 10) / 10) + "/10";
  document.getElementById("stat-best").textContent = best + "/10";

  // Accuracy bar
  document.getElementById("acc-pct").textContent = accuracy + "%";
  const accBar = document.getElementById("acc-bar");
  accBar.style.width = "0%";
  setTimeout(() => { accBar.style.width = accuracy + "%"; }, 100);

  // Score chart
  drawScoreChart();

  // Company breakdown
  const companyStats = {};
  sessions.forEach(s => {
    if (!companyStats[s.company]) companyStats[s.company] = { total: 0, sum: 0 };
    companyStats[s.company].total++;
    companyStats[s.company].sum += s.score;
  });
  const barsEl = document.getElementById("company-bars");
  barsEl.innerHTML = Object.entries(companyStats).map(([name, d]) => {
    const avg = Math.round((d.sum / d.total) * 10) / 10;
    const pct = (avg / 10) * 100;
    const col = scoreColor(avg);
    return `
      <div class="company-bar-item">
        <div class="company-bar-row">
          <span>${escHtml(name)}</span>
          <span>${d.total} questions · avg ${avg}/10</span>
        </div>
        <div class="company-bar-bg">
          <div class="company-bar-fill" style="width:0%;background:${col}" data-pct="${pct}"></div>
        </div>
      </div>`;
  }).join("");
  setTimeout(() => {
    document.querySelectorAll(".company-bar-fill").forEach(el => {
      el.style.width = el.dataset.pct + "%";
    });
  }, 100);

  // Recent sessions
  const listEl = document.getElementById("session-list");
  listEl.innerHTML = [...sessions].reverse().slice(0, 10).map(s => {
    const col = scoreColor(s.score);
    return `
      <div class="session-item">
        <div class="session-score" style="background:${col}22;color:${col}">${s.score}</div>
        <div class="session-info">
          <div class="session-q">${escHtml(s.question)}</div>
          <div class="session-meta">${escHtml(s.company)} · ${escHtml(s.role)}</div>
        </div>
      </div>`;
  }).join("");
}

// ── Score history chart (pure Canvas) ───────────────────────
function drawScoreChart() {
  const canvas = document.getElementById("score-chart");
  const data = sessions.slice(-20);
  if (!data.length) return;

  canvas.width = canvas.parentElement.offsetWidth || 600;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const pad = { top: 16, right: 16, bottom: 30, left: 36 };
  const cW = W - pad.left - pad.right;
  const cH = H - pad.top - pad.bottom;
  const barW = Math.min(32, (cW / data.length) - 4);

  ctx.clearRect(0, 0, W, H);

  // Y grid lines
  for (let i = 0; i <= 10; i += 2) {
    const y = pad.top + cH - (i / 10) * cH;
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W - pad.right, y); ctx.stroke();
    ctx.fillStyle = "#64748b"; ctx.font = "10px Inter"; ctx.textAlign = "right";
    ctx.fillText(i, pad.left - 6, y + 4);
  }

  // Bars
  data.forEach((s, i) => {
    const x = pad.left + (i / data.length) * cW + (cW / data.length - barW) / 2;
    const barH = (s.score / 10) * cH;
    const y = pad.top + cH - barH;
    const col = scoreColor(s.score);

    ctx.fillStyle = col + "99";
    roundRect(ctx, x, y, barW, barH, 4);
    ctx.fill();
    ctx.fillStyle = col;
    roundRect(ctx, x, y, barW, Math.min(barH, 6), 3);
    ctx.fill();

    // Label
    ctx.fillStyle = "#64748b"; ctx.font = "9px Inter"; ctx.textAlign = "center";
    ctx.fillText(`Q${i + 1}`, x + barW / 2, H - 8);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ── Score color helper ───────────────────────────────────────
function scoreColor(score) {
  if (score >= 8) return "#22c55e";
  if (score >= 5) return "#3b82f6";
  return "#ef4444";
}

// ── Mic / Waveform ───────────────────────────────────────────
function toggleMic() {
  if (micActive) stopMic();
  else startMic();
}

function startMic() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {
      micStream = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      micActive = true;
      document.getElementById("mic-btn").textContent = "🔴 Stop Mic";
      document.getElementById("mic-btn").classList.add("active");
      drawLiveWaveform();
    })
    .catch(() => alert("Microphone access denied or unavailable."));
}

function stopMic() {
  if (micStream) micStream.getTracks().forEach(t => t.stop());
  micStream = null; analyser = null; micActive = false;
  cancelAnimationFrame(animFrame);
  document.getElementById("mic-btn").textContent = "🎙️ Start Voice Interview";
  document.getElementById("mic-btn").classList.remove("active");
  drawIdleWaveform(document.getElementById("interview-waveform"));
}

function drawLiveWaveform() {
  const canvas = document.getElementById("interview-waveform");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  const data = new Uint8Array(analyser.fftSize);

  function frame() {
    analyser.getByteTimeDomainData(data);
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0,    "rgba(59,130,246,0)");
    g.addColorStop(0.25, "rgba(59,130,246,0.9)");
    g.addColorStop(0.5,  "rgba(139,92,246,1)");
    g.addColorStop(0.75, "rgba(59,130,246,0.9)");
    g.addColorStop(1,    "rgba(59,130,246,0)");
    ctx.strokeStyle = g; ctx.lineWidth = 2.5;
    ctx.shadowBlur = 20; ctx.shadowColor = "rgba(99,102,241,0.7)";
    ctx.beginPath();
    const sw = W / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const y = (data[i] / 128.0 * H) / 2;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      x += sw;
    }
    ctx.stroke();
    animFrame = requestAnimationFrame(frame);
  }
  frame();
}

function drawIdleWaveform(canvas) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  let phase = 0;

  function frame() {
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0,   "rgba(59,130,246,0)");
    g.addColorStop(0.3, "rgba(99,102,241,0.8)");
    g.addColorStop(0.5, "rgba(139,92,246,1)");
    g.addColorStop(0.7, "rgba(99,102,241,0.8)");
    g.addColorStop(1,   "rgba(59,130,246,0)");
    ctx.strokeStyle = g; ctx.lineWidth = 2.5;
    ctx.shadowBlur = 12; ctx.shadowColor = "rgba(139,92,246,0.5)";
    ctx.beginPath();
    const amp = 6 + Math.sin(phase * 0.3) * 3;
    for (let x = 0; x <= W; x++) {
      const y = H / 2 + Math.sin((x / W) * Math.PI * 4 + phase) * amp * Math.sin((x / W) * Math.PI);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    phase += 0.04;
    canvas._idleFrame = requestAnimationFrame(frame);
  }
  if (canvas._idleFrame) cancelAnimationFrame(canvas._idleFrame);
  frame();
}

// ── Utility ──────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Init ─────────────────────────────────────────────────────
(function init() {
  buildCompanyGrid();
  buildRoleGrid();

  // Start idle waveforms
  drawIdleWaveform(document.getElementById("hero-waveform"));
  drawIdleWaveform(document.getElementById("interview-waveform"));

  // Redraw chart on resize
  window.addEventListener("resize", () => {
    if (sessions.length > 0) drawScoreChart();
  });

  // Default page
  showPage("home");
})();
