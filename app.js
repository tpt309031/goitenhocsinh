const DEFAULT_STUDENTS = [
  "Nguyễn Ngọc Tuệ An",
  "Võ Hồng Khánh An",
  "Phạm Nguyên Anh",
  "Lê Ngọc Bảo Châu",
  "Lê Khả Di",
  "Huỳnh Thị Xuân Diệu",
  "Trương Bình Dương",
  "Trần Linh Đan",
  "Phạm Nhật Đăng",
  "Nguyễn Trà Giang",
  "Nguyễn Trung Khải",
  "Tống An Khang",
  "Trần Nguyên Khang",
  "Nguyễn Hoàng Bảo Khôi",
  "Hồ Gia Khang",
  "Ngô Tường Lam",
  "Phạm Đan Lê",
  "Hà Phạm Phương Linh",
  "Trần Khánh Linh",
  "Phạm Nhật Minh",
  "Trương Hà My",
  "Lê Thảo Ngân",
  "Dương Khánh Ngọc",
  "Hoàng Nguyễn Bảo Ngọc",
  "Nguyễn Minh Ngọc",
  "Vũ Bích Ngọc",
  "Đào Đình Khôi Nguyên",
  "Quách Thiện Nhân",
  "Cao Minh Nhật",
  "Huỳnh Hà Bảo Như",
  "Nguyễn Đỗ Gia Như",
  "Hoàng Xuân Phúc",
  "Mai Hoàng Anh Phúc",
  "Thái Ngọc Thu Phương",
  "Phạm Ngọc Anh Thư",
  "Chu Minh Toàn",
  "Phạm Ái Trinh",
  "Lê Hoàng Nhã Uyên",
  "Trần Ngọc Tú Uyên",
  "Lê Phương Vy",
];

const STORAGE_KEY = "goi-ten-hoc-sinh-roster-v1";
const HISTORY_KEY = "goi-ten-hoc-sinh-history-v1";
const MAX_STUDENTS = 40;
const ORBIT_STAGE_SIZE = 700;
const COLORS = ["#ffd35a", "#ff7657", "#57c7e9", "#9a7cf3", "#61d09f", "#ff8fb1"];

const elements = {
  orbitStage: document.querySelector("#orbitStage"),
  orbitViewport: document.querySelector("#orbitViewport"),
  studentOrbit: document.querySelector("#studentOrbit"),
  selectedName: document.querySelector("#selectedName"),
  selectedHint: document.querySelector("#selectedHint"),
  statusLabel: document.querySelector("#statusLabel"),
  spotlight: document.querySelector("#spotlight"),
  callButton: document.querySelector("#callButton"),
  studentCount: document.querySelector("#studentCount"),
  confetti: document.querySelector("#confetti"),
  musicButton: document.querySelector("#musicButton"),
  musicIcon: document.querySelector("#musicIcon"),
  musicLabel: document.querySelector("#musicLabel"),
  editButton: document.querySelector("#editButton"),
  rosterModal: document.querySelector("#rosterModal"),
  rosterInput: document.querySelector("#rosterInput"),
  rosterCount: document.querySelector("#rosterCount"),
  saveRosterButton: document.querySelector("#saveRosterButton"),
  resetRosterButton: document.querySelector("#resetRosterButton"),
  closeModalButton: document.querySelector("#closeModalButton"),
  recentPanel: document.querySelector("#recentPanel"),
  recentList: document.querySelector("#recentList"),
  clearHistoryButton: document.querySelector("#clearHistoryButton"),
};

let students = loadList(STORAGE_KEY, DEFAULT_STUDENTS);
let history = loadList(HISTORY_KEY, []);
let isSpinning = false;
let audioContext = null;
let musicTimer = null;
let musicStep = 0;
let isMusicOn = false;
let lastHoverSoundAt = 0;

function loadList(key, fallback) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    return Array.isArray(stored) && stored.length ? stored : [...fallback];
  } catch {
    return [...fallback];
  }
}

function normalizeNames(value) {
  const seen = new Set();
  return value
    .split(/\r?\n/)
    .map((name) => name.replace(/\s+/g, " ").trim())
    .filter((name) => {
      const key = name.toLocaleLowerCase("vi");
      if (!name || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_STUDENTS);
}

function cryptoRandomIndex(length) {
  if (length <= 1) return 0;
  const max = 0x100000000;
  const limit = max - (max % length);
  const random = new Uint32Array(1);
  do {
    crypto.getRandomValues(random);
  } while (random[0] >= limit);
  return random[0] % length;
}

function calculateRingLayout(count) {
  if (count <= 10) {
    return [{ count, radius: Math.max(150, 85 + count * 13) }];
  }

  if (count <= 24) {
    const innerCount = Math.round(count * 0.38);
    return [
      { count: innerCount, radius: 140 + Math.min(innerCount, 8) * 3 },
      { count: count - innerCount, radius: 235 + Math.min(count - innerCount, 15) * 2 },
    ];
  }

  const outerCount = Math.ceil(count * 0.5);
  const remaining = count - outerCount;
  const middleCount = Math.ceil(remaining * 0.7);
  return [
    { count: remaining - middleCount, radius: 140 },
    { count: middleCount, radius: 220 },
    { count: outerCount, radius: 310 },
  ];
}

function updateOrbitScale() {
  const availableWidth = Math.max(1, elements.orbitViewport.clientWidth - 8);
  const availableHeight = Math.max(1, elements.orbitViewport.clientHeight - 8);
  const scale = Math.min(1, availableWidth / ORBIT_STAGE_SIZE, availableHeight / ORBIT_STAGE_SIZE);
  elements.orbitStage.style.setProperty("--stage-scale", scale.toFixed(4));
}

function playNameHoverSound(index) {
  if (isSpinning) return;
  const now = performance.now();
  if (now - lastHoverSoundAt < 90) return;
  const context = getAudioContext();
  if (!context || context.state !== "running") return;
  lastHoverSoundAt = now;
  const notes = [659, 698, 784, 880, 988, 1047];
  const note = notes[index % notes.length];
  playTone(note, 0, 0.11, "sine", 0.028);
  playTone(note * 1.5, 0.035, 0.09, "triangle", 0.016);
}

function renderOrbit() {
  elements.studentOrbit.replaceChildren();
  elements.studentCount.textContent = students.length;

  let studentIndex = 0;
  calculateRingLayout(students.length).forEach((ring, ringIndex) => {
    const offset = -90 + (ringIndex % 2 ? 180 / ring.count : 0);
    for (let position = 0; position < ring.count; position += 1) {
      const student = students[studentIndex];
      const chipIndex = studentIndex;
      const chip = document.createElement("span");
      chip.className = "student-chip";
      chip.textContent = student;
      chip.dataset.student = student;
      chip.style.setProperty("--orbit-radius", `${ring.radius}px`);
      chip.style.setProperty("--chip-angle", `${offset + (360 / ring.count) * position}deg`);
      chip.style.setProperty("--chip-color", COLORS[chipIndex % COLORS.length]);
      chip.addEventListener("pointerenter", () => {
        if (isSpinning) return;
        chip.classList.add("is-hovered");
        playNameHoverSound(chipIndex);
      });
      chip.addEventListener("pointerleave", () => chip.classList.remove("is-hovered"));
      elements.studentOrbit.append(chip);
      studentIndex += 1;
    }
  });

  window.requestAnimationFrame(updateOrbitScale);
}

function shortName(fullName) {
  const parts = fullName.split(" ");
  if (parts.length <= 3) return fullName;
  return parts.slice(-3).join(" ");
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioContext = new AudioContext();
  }
  if (audioContext?.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(frequency, start, duration, type = "sine", volume = 0.08) {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime + start);
  gain.gain.setValueAtTime(0.0001, context.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, context.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(context.currentTime + start);
  oscillator.stop(context.currentTime + start + duration + 0.03);
}

function playStartSound() {
  [392, 523, 659].forEach((note, index) => playTone(note, index * 0.07, 0.13, "triangle", 0.075));
}

function playWinnerSound() {
  [523, 659, 784, 1047].forEach((note, index) => playTone(note, index * 0.11, 0.28, "triangle", 0.095));
  playTone(262, 0, 0.62, "sine", 0.035);
}

function playMusicNote() {
  if (!isMusicOn) return;
  const melody = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 1047, 880, 784, 659, 587];
  playTone(melody[musicStep % melody.length], 0, 0.25, "triangle", 0.025);
  if (musicStep % 2 === 0) playTone([262, 294, 349, 392][Math.floor(musicStep / 4) % 4], 0, 0.38, "sine", 0.012);
  musicStep += 1;
}

function toggleMusic() {
  isMusicOn = !isMusicOn;
  elements.musicButton.setAttribute("aria-pressed", String(isMusicOn));
  elements.musicIcon.textContent = isMusicOn ? "♬" : "♫";
  elements.musicLabel.textContent = isMusicOn ? "Tắt nhạc" : "Bật nhạc";

  if (isMusicOn) {
    getAudioContext();
    playMusicNote();
    musicTimer = window.setInterval(playMusicNote, 330);
  } else {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

function shufflePreview() {
  elements.selectedName.textContent = shortName(students[cryptoRandomIndex(students.length)]);
}

function burstConfetti() {
  elements.confetti.replaceChildren();
  for (let index = 0; index < 42; index += 1) {
    const piece = document.createElement("i");
    piece.className = "confetti-piece";
    const angle = (Math.PI * 2 * index) / 42;
    const distance = 130 + Math.random() * 240;
    piece.style.setProperty("--x", `${Math.cos(angle) * distance}px`);
    piece.style.setProperty("--r", `${Math.random() * 900 - 450}deg`);
    piece.style.setProperty("--confetti-color", COLORS[index % COLORS.length]);
    piece.style.animationDelay = `${Math.random() * 0.12}s`;
    elements.confetti.append(piece);
  }
  window.setTimeout(() => elements.confetti.replaceChildren(), 1500);
}

function renderHistory() {
  elements.recentPanel.hidden = history.length === 0;
  elements.recentList.replaceChildren();
  history.slice(0, 4).forEach((name) => {
    const item = document.createElement("span");
    item.textContent = shortName(name);
    item.title = name;
    elements.recentList.append(item);
  });
}

function callStudent() {
  if (isSpinning || students.length === 0) return;
  isSpinning = true;
  elements.callButton.disabled = true;
  document.querySelectorAll(".student-chip").forEach((chip) => chip.classList.remove("is-selected", "is-hovered"));
  elements.orbitStage.classList.remove("has-winner");
  elements.spotlight.classList.remove("is-winner");
  elements.orbitStage.classList.add("is-spinning");
  elements.statusLabel.textContent = "Vòng quay đang chọn...";
  elements.selectedHint.textContent = "Cả lớp cùng đếm ngược nhé!";
  playStartSound();

  const previewTimer = window.setInterval(shufflePreview, 90);
  window.setTimeout(() => {
    window.clearInterval(previewTimer);
    const winner = students[cryptoRandomIndex(students.length)];
    elements.selectedName.textContent = winner;
    elements.statusLabel.textContent = "Xin chúc mừng!";
    elements.selectedHint.textContent = "Mời bạn chuẩn bị câu trả lời nào!";
    elements.orbitStage.classList.remove("is-spinning");
    elements.orbitStage.classList.add("has-winner");
    elements.spotlight.classList.add("is-winner");
    document.querySelectorAll(".student-chip").forEach((chip) => {
      chip.classList.toggle("is-selected", chip.dataset.student === winner);
    });
    history = [winner, ...history].slice(0, 8);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
    burstConfetti();
    playWinnerSound();
    elements.callButton.disabled = false;
    isSpinning = false;
  }, 2800);
}

function openRosterModal() {
  elements.rosterInput.value = students.join("\n");
  updateRosterCount();
  elements.rosterModal.hidden = false;
  document.body.classList.add("modal-open");
  window.setTimeout(() => elements.rosterInput.focus(), 50);
}

function closeRosterModal() {
  elements.rosterModal.hidden = true;
  document.body.classList.remove("modal-open");
  elements.editButton.focus();
}

function updateRosterCount() {
  const count = normalizeNames(elements.rosterInput.value).length;
  elements.rosterCount.textContent = count === MAX_STUDENTS
    ? `${count} học sinh · Đã đạt tối đa`
    : `${count} học sinh`;
}

function saveRoster() {
  const updated = normalizeNames(elements.rosterInput.value);
  if (!updated.length) {
    elements.rosterInput.focus();
    elements.rosterCount.textContent = "Cần ít nhất 1 học sinh";
    return;
  }
  students = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
  renderOrbit();
  closeRosterModal();
}

function resetRoster() {
  elements.rosterInput.value = DEFAULT_STUDENTS.join("\n");
  updateRosterCount();
}

elements.callButton.addEventListener("click", callStudent);
elements.musicButton.addEventListener("click", toggleMusic);
elements.editButton.addEventListener("click", openRosterModal);
elements.closeModalButton.addEventListener("click", closeRosterModal);
elements.rosterModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]")) closeRosterModal();
});
elements.rosterInput.addEventListener("input", updateRosterCount);
elements.saveRosterButton.addEventListener("click", saveRoster);
elements.resetRosterButton.addEventListener("click", resetRoster);
elements.clearHistoryButton.addEventListener("click", () => {
  history = [];
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !elements.rosterModal.hidden) closeRosterModal();
  if (event.code === "Space" && elements.rosterModal.hidden && !event.repeat) {
    event.preventDefault();
    callStudent();
  }
});

document.addEventListener("pointerdown", () => getAudioContext(), { once: true });

let resizeTimer;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(updateOrbitScale, 100);
});

renderOrbit();
renderHistory();
