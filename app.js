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
const ORBIT_STAGE_WIDTH = 1160;
const ORBIT_STAGE_HEIGHT = 560;
const SPIN_DURATION = 4200;
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
let musicDuckedUntil = 0;

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

function calculateFrameLayout(count) {
  if (count <= 10) {
    return [{ count, halfWidth: 240 + count * 14, halfHeight: 90 + count * 7 }];
  }

  if (count <= 20) {
    return [{ count, halfWidth: Math.min(520, 240 + count * 14), halfHeight: Math.min(220, 90 + count * 7) }];
  }

  const outerCount = Math.ceil(count * 0.6);
  return [
    { count: count - outerCount, halfWidth: 380, halfHeight: 130 },
    { count: outerCount, halfWidth: 520, halfHeight: 235 },
  ];
}

function getFramePoints(count, halfWidth, halfHeight) {
  if (count === 1) return [{ x: 0, y: -halfHeight }];
  if (count === 2) return [{ x: -halfWidth, y: 0 }, { x: halfWidth, y: 0 }];
  if (count === 3) return [{ x: 0, y: -halfHeight }, { x: halfWidth, y: 0 }, { x: -halfWidth, y: 0 }];

  let horizontalCount = 2 * Math.round((count * halfWidth) / (halfWidth + halfHeight) / 2);
  horizontalCount = Math.max(2, Math.min(count - 2, horizontalCount));
  const verticalCount = count - horizontalCount;
  const topCount = Math.ceil(horizontalCount / 2);
  const bottomCount = Math.floor(horizontalCount / 2);
  const rightCount = Math.ceil(verticalCount / 2);
  const leftCount = Math.floor(verticalCount / 2);
  const points = [];

  for (let index = 0; index < topCount; index += 1) {
    points.push({ x: -halfWidth + ((index + 1) * halfWidth * 2) / (topCount + 1), y: -halfHeight });
  }
  for (let index = 0; index < rightCount; index += 1) {
    points.push({ x: halfWidth, y: -halfHeight + ((index + 1) * halfHeight * 2) / (rightCount + 1) });
  }
  for (let index = 0; index < bottomCount; index += 1) {
    points.push({ x: halfWidth - ((index + 1) * halfWidth * 2) / (bottomCount + 1), y: halfHeight });
  }
  for (let index = 0; index < leftCount; index += 1) {
    points.push({ x: -halfWidth, y: halfHeight - ((index + 1) * halfHeight * 2) / (leftCount + 1) });
  }
  return points;
}

function updateOrbitScale() {
  const availableWidth = Math.max(1, elements.orbitViewport.clientWidth - 8);
  const availableHeight = Math.max(1, elements.orbitViewport.clientHeight - 8);
  const scale = Math.min(1, availableWidth / ORBIT_STAGE_WIDTH, availableHeight / ORBIT_STAGE_HEIGHT);
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
  calculateFrameLayout(students.length).forEach((frame) => {
    const points = getFramePoints(frame.count, frame.halfWidth, frame.halfHeight);
    for (let position = 0; position < frame.count; position += 1) {
      const student = students[studentIndex];
      const chipIndex = studentIndex;
      const point = points[position];
      const chip = document.createElement("span");
      chip.className = "student-chip";
      chip.textContent = student;
      chip.dataset.student = student;
      chip.style.setProperty("--chip-x", `${point.x}px`);
      chip.style.setProperty("--chip-y", `${point.y}px`);
      chip.style.setProperty("--chip-delay", `${(-chipIndex * 37) % 420}ms`);
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

function playStringTone(frequency, start, duration, volume = 0.02) {
  const context = getAudioContext();
  if (!context) return;
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const startTime = context.currentTime + start;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1450, startTime);
  filter.Q.setValueAtTime(1.1, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.07);
  gain.gain.setValueAtTime(volume, startTime + Math.max(0.08, duration - 0.14));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  filter.connect(gain).connect(context.destination);

  [-6, 6].forEach((detune, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = index === 0 ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.detune.setValueAtTime(detune, startTime);
    oscillator.connect(filter);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  });
}

function playTimpani(start = 0, volume = 0.07) {
  const context = getAudioContext();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(128, context.currentTime + start);
  oscillator.frequency.exponentialRampToValueAtTime(52, context.currentTime + start + 0.42);
  gain.gain.setValueAtTime(volume, context.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + start + 0.48);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(context.currentTime + start);
  oscillator.stop(context.currentTime + start + 0.5);
}

function playStartSound() {
  playTimpani(0, 0.1);
  [220, 233.08, 261.63].forEach((note, index) => playTone(note, index * 0.055, 0.32, "sawtooth", 0.028));
}

function playWinnerSound() {
  [523, 659, 784, 1047].forEach((note, index) => playTone(note, index * 0.11, 0.28, "triangle", 0.095));
  playTone(262, 0, 0.62, "sine", 0.035);
}

function playMusicNote() {
  if (!isMusicOn) return;
  const duck = performance.now() < musicDuckedUntil ? 0.2 : 1;
  const intensity = (isSpinning ? 1.65 : 1) * duck;
  const ostinato = [220, 261.63, 329.63, 261.63, 233.08, 293.66, 349.23, 293.66];
  const bassLine = [110, 110, 103.83, 103.83, 98, 98, 92.5, 103.83];
  const step = musicStep % ostinato.length;

  playTone(ostinato[step], 0, 0.2, "triangle", 0.024 * intensity);
  playTone(ostinato[step] * 2, 0.025, 0.12, "sawtooth", 0.008 * intensity);
  if (musicStep % 2 === 0) {
    playStringTone(bassLine[step], 0, 0.48, 0.015 * intensity);
    playTone(bassLine[step] / 2, 0, 0.48, "sine", 0.032 * intensity);
  }
  if (musicStep % 8 === 7) {
    playTimpani(0, 0.045 * intensity);
    [220, 261.63, 329.63].forEach((note) => playStringTone(note, 0, 0.82, 0.011 * intensity));
  }
  musicStep += 1;
}

function toggleMusic() {
  isMusicOn = !isMusicOn;
  elements.musicButton.setAttribute("aria-pressed", String(isMusicOn));
  elements.musicIcon.textContent = isMusicOn ? "♬" : "♫";
  elements.musicLabel.textContent = isMusicOn ? "Tắt nhạc hồi hộp" : "Bật nhạc hồi hộp";

  if (isMusicOn) {
    getAudioContext();
    playMusicNote();
    musicTimer = window.setInterval(playMusicNote, 250);
  } else {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

function speakStudentName(name) {
  if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) return;
  window.speechSynthesis.cancel();
  const voices = window.speechSynthesis.getVoices();
  const vietnameseVoices = voices.filter((voice) => voice.lang.toLocaleLowerCase().startsWith("vi"));
  const preferredPatterns = [/hoaimy|hoài\s*my/i, /female|woman|nữ/i, /linh|mai|an/i, /natural/i];
  const voice = vietnameseVoices
    .map((candidate) => ({
      candidate,
      score: preferredPatterns.reduce((score, pattern, index) => score + (pattern.test(candidate.name) ? 10 - index : 0), 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.candidate;

  const utterance = new SpeechSynthesisUtterance(`Mời em ${name}.`);
  utterance.lang = "vi-VN";
  utterance.rate = 0.82;
  utterance.pitch = 1.12;
  utterance.volume = 1;
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function playChaseTick(index) {
  const notes = [523.25, 587.33, 659.25, 698.46, 783.99];
  playTone(notes[index % notes.length], 0, 0.055, "square", 0.012);
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

  const chips = [...document.querySelectorAll(".student-chip")];
  let chaseIndex = 0;
  let activeChip = null;
  const chaseIntervalMs = Math.max(70, Math.min(140, SPIN_DURATION / chips.length));
  const advanceChase = () => {
    activeChip?.classList.remove("is-chasing");
    activeChip = chips[chaseIndex % chips.length];
    activeChip.classList.add("is-chasing");
    playChaseTick(chaseIndex);
    chaseIndex += 1;
  };
  advanceChase();
  const chaseTimer = window.setInterval(advanceChase, chaseIntervalMs);
  const previewTimer = window.setInterval(shufflePreview, 90);
  window.setTimeout(() => {
    window.clearInterval(previewTimer);
    window.clearInterval(chaseTimer);
    activeChip?.classList.remove("is-chasing");
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
    musicDuckedUntil = performance.now() + 2600;
    window.setTimeout(() => speakStudentName(winner), 420);
    elements.callButton.disabled = false;
    isSpinning = false;
  }, SPIN_DURATION);
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
