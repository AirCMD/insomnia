/* =========================
   СОМНА — логіка сну
   ========================= */

const NICK_PREFIXES = [
  "тінь", "сон", "голос", "відлуння", "уламки", "подих", "луна",
  "попіл", "імла", "шепіт", "відбиток", "слід"
];

const NICK_SUFFIXES = [
  "місяця", "води", "коридору", "дзеркала", "піску", "листя",
  "тихого", "далекого", "забутого", "неіснуючого", "вчорашнього"
];

let currentUser = "";
let posts = [];
let touchCounts = {};
let activityScore = 0;
let lucidActive = false;
let paralysisActive = false;
let dreamTimeOffset = 0;
let currentTheme = "default";
let nextPostId = 100;

// ---------- Генерація ніка ----------
function generateNick() {
  const p = NICK_PREFIXES[Math.floor(Math.random() * NICK_PREFIXES.length)];
  const s = NICK_SUFFIXES[Math.floor(Math.random() * NICK_SUFFIXES.length)];
  return `\( {p}_ \){s}_${Math.floor(Math.random() * 90 + 10)}`;
}

// ---------- Чорні квадрати (тільки для контенту постів) ----------
function applyBlackouts(text, intensity = 0.35) {
  let result = String(text);
  BLACKOUT_WORDS.forEach(word => {
    if (Math.random() < intensity) {
      const regex = new RegExp(word, "gi");
      result = result.replace(regex, "██████");
    }
  });
  if (Math.random() < intensity + 0.1) {
    const words = result.split(" ");
    const idx = Math.floor(Math.random() * words.length);
    if (words[idx] && words[idx].length > 3 && !words[idx].includes("█")) {
      words[idx] = "██████";
      result = words.join(" ");
    }
  }
  return result;
}

function formatContent(text, intensity = 0.35) {
  return applyBlackouts(text, intensity)
    .replace(/██████/g, '<span class="blackout">██████</span>');
}

// ---------- Створення острова ----------
function createIsland(post) {
  const island = document.createElement("div");
  island.className = "post-island drifting";
  island.dataset.id = post.id;
  island.dataset.age = 0;

  const isMobile = window.innerWidth < 768;
  const x = isMobile ? 4 + Math.random() * 38 : 6 + Math.random() * 55;
  const y = isMobile ? 16 + Math.random() * 40 : 14 + Math.random() * 50;
  island.style.left = `${x}%`;
  island.style.top = `${y}%`;
  island.style.animationDelay = `${-Math.random() * 12}s`;
  island.style.animationDuration = `${14 + Math.random() * 10}s`;

  const user = FAKE_USERS.find(u => u.name === post.author) || { mood: "нейтральний" };
  const isSleeping = Math.random() < 0.22;

  // Чистий автор без будь-яких замін
  const cleanAuthor = post.author;

  island.innerHTML = `
    <div class="post-header">
      <div class="shadow-avatar \( {isSleeping ? "sleeping" : ""}" data-mood=" \){user.mood}"></div>
      <div>
        <div class="author-name" data-original="\( {cleanAuthor}"> \){cleanAuthor}</div>
        <div class="post-date">${post.displayDate}</div>
      </div>
    </div>
    <div class="post-content">${formatContent(post.content)}</div>
    <div class="post-actions">
      <div class="touch-btn" data-id="${post.id}">
        <span>◉</span> <span class="touch-label">дотик</span>
      </div>
      <div class="comment-btn" data-id="${post.id}">
        коментарі · ${post.commentsCount}
      </div>
    </div>
  `;

  // Дотик
  island.querySelector(".touch-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (paralysisActive) return;
    handleTouch(post.id, island);
    activityScore += 1;
  });

  // Коментарі
  island.querySelector(".comment-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    if (paralysisActive) return;
    openComments(post);
    activityScore += 1;
  });

  // Перетягування
  enableDrag(island);

  if (Math.random() < 0.1) {
    setTimeout(() => dissolveIsland(island), 12000 + Math.random() * 18000);
  }

  return island;
}

function dissolveIsland(island) {
  island.classList.add("dissolving");
  setTimeout(() => island.remove(), 900);
}

// ---------- Перетягування постів ----------
function enableDrag(island) {
  let isDragging = false;
  let startX, startY, origLeft, origTop;

  const onStart = (e) => {
    if (paralysisActive) return;
    // Не починаємо drag якщо клікнули на кнопку
    if (e.target.closest(".touch-btn") || e.target.closest(".comment-btn")) return;

    isDragging = true;
    island.classList.add("dragging");
    island.classList.remove("drifting");

    const point = e.touches ? e.touches[0] : e;
    startX = point.clientX;
    startY = point.clientY;

    const rect = island.getBoundingClientRect();
    origLeft = rect.left;
    origTop = rect.top;

    island.style.left = origLeft + "px";
    island.style.top = origTop + "px";
    island.style.right = "auto";
    island.style.bottom = "auto";
    island.style.position = "fixed";
    island.style.zIndex = "50";
  };

  const onMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - startX;
    const dy = point.clientY - startY;
    island.style.left = (origLeft + dx) + "px";
    island.style.top = (origTop + dy) + "px";
  };

  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    island.classList.remove("dragging");
    // Повертаємо відносні % щоб дрейф працював далі
    const rect = island.getBoundingClientRect();
    const parent = document.getElementById("feed").getBoundingClientRect();
    island.style.position = "absolute";
    island.style.left = ((rect.left - parent.left) / parent.width * 100) + "%";
    island.style.top = ((rect.top - parent.top) / parent.height * 100) + "%";
    island.style.zIndex = "";
    setTimeout(() => island.classList.add("drifting"), 50);
  };

  island.addEventListener("mousedown", onStart);
  island.addEventListener("touchstart", onStart, { passive: false });
  window.addEventListener("mousemove", onMove);
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("mouseup", onEnd);
  window.addEventListener("touchend", onEnd);
}

// ---------- Дотик ----------
function handleTouch(id, island) {
  touchCounts[id] = (touchCounts[id] || 0) + 1;
  island.classList.add("touched");
  island.dataset.age = 0;

  if (touchCounts[id] >= 4) {
    island.classList.add("breathing");
  }

  const avatar = island.querySelector(".shadow-avatar");
  if (avatar && avatar.classList.contains("sleeping")) {
    avatar.classList.remove("sleeping");
    avatar.classList.add("waking");
    setTimeout(() => avatar.classList.remove("waking"), 1500);
  }

  setTimeout(() => {
    if (touchCounts[id] < 4) island.classList.remove("touched");
  }, 1200);
}

// ---------- Коментарі ----------
function openComments(post) {
  const panel = document.getElementById("comments-panel");
  const list = document.getElementById("comments-list");
  const title = document.getElementById("comments-title");

  title.textContent = `коментарі · ${post.commentsCount}`;

  list.innerHTML = "";
  post.comments.forEach(c => {
    const div = document.createElement("div");
    div.className = "comment";
    div.innerHTML = `
      <div class="comment-author">${c.author}</div>
      <div class="comment-text">${formatContent(c.text)}</div>
      <div class="comment-date">${c.date}</div>
    `;
    list.appendChild(div);
  });

  if (Math.random() < 0.3) {
    setTimeout(() => {
      list.querySelectorAll(".comment-text").forEach(el => {
        const words = el.textContent.split(" ");
        if (words.length > 3) {
          const i = Math.floor(Math.random() * (words.length - 1));
          [words[i], words[i + 1]] = [words[i + 1], words[i]];
          el.textContent = words.join(" ");
        }
      });
    }, 1800 + Math.random() * 2500);
  }

  panel.classList.add("open");
}

function closeComments() {
  document.getElementById("comments-panel").classList.remove("open");
}

// ---------- Глюки ----------
function spawnGlitch() {
  if (lucidActive) return;
  const type = Math.random() > 0.5 ? "rect" : "square";
  const el = document.createElement("div");
  el.className = type === "rect" ? "glitch-rect" : "glitch-square";
  const w = type === "rect" ? 40 + Math.random() * 180 : 12 + Math.random() * 40;
  const h = type === "rect" ? 4 + Math.random() * 18 : w;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  el.style.left = `${Math.random() * 100}vw`;
  el.style.top = `${Math.random() * 100}vh`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

// ---------- Кнопка, що втікає ----------
function setupFleeingButton() {
  const btn = document.getElementById("publish-btn");
  let fleeTimeout = null;
  const isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  btn.addEventListener("mouseenter", () => {
    if (paralysisActive || lucidActive) return;
    if (fleeTimeout) clearTimeout(fleeTimeout);

    const farChance = isTouch ? 0.04 : 0.12;
    const distance = Math.random() < farChance
      ? (isTouch ? 60 + Math.random() * 100 : 300 + Math.random() * 200)
      : (isTouch ? 2 + Math.random() * 7 : 3 + Math.random() * 12);

    const angle = Math.random() * Math.PI * 2;
    btn.classList.add("fleeing");
    btn.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;

    fleeTimeout = setTimeout(() => {
      btn.style.transform = "translate(0, 0)";
      btn.classList.remove("fleeing");
    }, 3000 + Math.random() * 5000);
  });
}

// ---------- Публікація + Відлуння ----------
function publishPost() {
  if (paralysisActive) return;

  const textarea = document.getElementById("compose-text");
  let text = textarea.value.trim();
  if (!text) return;

  text = applyBlackouts(text);

  const newPost = {
    id: nextPostId++,
    author: currentUser,
    content: text,
    date: "2047-11-13",
    displayDate: "завтра, " + weirdDate(),
    commentsCount: Math.floor(Math.random() * 5) + 1,
    comments: [{
      author: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name,
      text: "Я бачив щось схоже. Але трохи інакше.",
      date: "2009-0" + (Math.floor(Math.random() * 9) + 1) + "-1" + Math.floor(Math.random() * 9)
    }]
  };

  posts.unshift(newPost);
  document.getElementById("feed").appendChild(createIsland(newPost));
  textarea.value = "";

  if (Math.random() < 0.5) {
    setTimeout(() => {
      const echo = {
        id: nextPostId++,
        author: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name,
        content: applyBlackouts(text, 0.55),
        date: "1999-99-99",
        displayDate: "колись",
        commentsCount: 0,
        comments: []
      };
      const echoIsland = createIsland(echo);
      echoIsland.classList.add("echo");
      document.getElementById("feed").appendChild(echoIsland);
    }, 2000 + Math.random() * 2000);
  }

  activityScore += 2;
  setTimeout(spawnGlitch, 200);
  setTimeout(spawnGlitch, 450);
}

function weirdDate() {
  const day = Math.floor(Math.random() * 28) + 1;
  const months = ["січня","лютого","березня","квітня","травня","червня","липня","серпня","вересня","жовтня","листопада","грудня"];
  const year = 20 + Math.floor(Math.random() * 80);
  return `${day} ${months[Math.floor(Math.random()*12)]} ${year}`;
}

// ---------- Поява нових постів ----------
function spawnNewPost() {
  if (document.querySelectorAll(".post-island").length > 14) return;

  const author = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name;
  const content = EXTRA_DREAMS[Math.floor(Math.random() * EXTRA_DREAMS.length)];

  const newPost = {
    id: nextPostId++,
    author,
    content,
    date: "2088-01-01",
    displayDate: "завтра, " + weirdDate(),
    commentsCount: Math.floor(Math.random() * 4) + 1,
    comments: [{
      author: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name,
      text: "Я теж це відчував.",
      date: "2011-03-14"
    }]
  };

  const island = createIsland(newPost);
  island.style.opacity = "0";
  document.getElementById("feed").appendChild(island);
  requestAnimationFrame(() => {
    island.style.transition = "opacity 1.2s ease";
    island.style.opacity = "1";
  });
}

// ---------- Забування ----------
function forgetPosts() {
  document.querySelectorAll(".post-island").forEach(island => {
    let age = parseInt(island.dataset.age || "0");
    age += 1;
    island.dataset.age = age;

    const content = island.querySelector(".post-content");
    if (!content) return;

    if (age > 9 && Math.random() < 0.35) {
      content.innerHTML = formatContent(content.textContent, 0.2 + age * 0.035);
    }
    if (age > 24 && Math.random() < 0.28) {
      dissolveIsland(island);
    }
  });
}

// ---------- Тіні засинають ----------
function manageSleepingShadows() {
  document.querySelectorAll(".shadow-avatar").forEach(av => {
    if (Math.random() < 0.07) av.classList.add("sleeping");
  });
}

// ---------- Легка мутація імен (без ламання ніків) ----------
function mutateNames() {
  document.querySelectorAll(".author-name").forEach(el => {
    if (Math.random() < 0.08) {
      const original = el.dataset.original || el.textContent;
      if (Math.random() < 0.5) {
        el.style.opacity = "0.4";
        setTimeout(() => {
          el.style.opacity = "1";
          el.textContent = original;
        }, 800 + Math.random() * 1200);
      }
    }
  });
}

// ---------- Час сну ----------
function updateDreamClock() {
  const clock = document.getElementById("dream-clock");
  if (!clock) return;
  dreamTimeOffset += (Math.random() - 0.45) * 35;
  const now = new Date(Date.now() + dreamTimeOffset * 1000 * 60);
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const weird = Math.random() < 0.12 ? (Math.random() < 0.5 ? "∞" : "??") : m;
  clock.textContent = `\( {h}: \){weird}`;
}

// ---------- Люцидний режим ----------
function toggleLucid() {
  if (paralysisActive) return;
  lucidActive = true;
  document.body.classList.add("lucid");
  const btn = document.getElementById("lucid-btn");
  if (btn) btn.style.opacity = "0.3";

  setTimeout(() => {
    lucidActive = false;
    document.body.classList.remove("lucid");
    document.querySelectorAll(".post-island").forEach(isle => {
      if (Math.random() < 0.35) {
        const content = isle.querySelector(".post-content");
        if (content) content.innerHTML = formatContent(content.textContent, 0.5);
      }
    });
    if (btn) btn.style.opacity = "1";
  }, 9000);
}

// ---------- Провал ----------
function checkVoid() {
  if (activityScore > 14 && Math.random() < 0.4) {
    triggerVoid();
    activityScore = 0;
  }
  activityScore = Math.max(0, activityScore - 0.35);
}

function triggerVoid() {
  const voidEl = document.getElementById("void");
  const messages = ["ти прокинувся?", "це все ще сон", "не рухайся", "хтось дивиться", "ти вже був тут"];
  voidEl.querySelector("span").textContent = messages[Math.floor(Math.random() * messages.length)];
  voidEl.classList.add("active");
  setTimeout(() => voidEl.classList.remove("active"), 2600 + Math.random() * 1400);
}

// ---------- Сонний параліч ----------
function maybeParalysis() {
  if (paralysisActive || lucidActive || Math.random() > 0.015) return;
  paralysisActive = true;
  document.body.classList.add("paralysis");
  document.getElementById("paralysis-msg").classList.add("visible");
  setTimeout(() => {
    paralysisActive = false;
    document.body.classList.remove("paralysis");
    document.getElementById("paralysis-msg").classList.remove("visible");
  }, 4200 + Math.random() * 1800);
}

// ---------- Теми ----------
function setTheme(theme) {
  currentTheme = theme;
  document.body.dataset.theme = theme;
  localStorage.setItem("somna-theme", theme);

  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

// ---------- Ініціалізація ----------
function init() {
  currentUser = generateNick();

  // Відновлюємо тему
  const savedTheme = localStorage.getItem("somna-theme") || "default";
  setTheme(savedTheme);

  const overlay = document.getElementById("intro");
  const nickEl = document.getElementById("intro-nick");
  const hintEl = document.getElementById("intro-hint");

  nickEl.textContent = currentUser;
  document.getElementById("user-nick").textContent = currentUser;

  setTimeout(() => nickEl.classList.add("visible"), 600);
  setTimeout(() => hintEl.classList.add("visible"), 1400);
  setTimeout(() => {
    overlay.classList.add("hidden");
    setTimeout(() => overlay.remove(), 1300);
  }, 3200);

  posts = [...DREAM_POSTS];
  const feed = document.getElementById("feed");
  posts.forEach((p, i) => {
    setTimeout(() => feed.appendChild(createIsland(p)), i * 150);
  });

  document.getElementById("publish-btn").addEventListener("click", publishPost);
  setupFleeingButton();
  document.getElementById("close-comments").addEventListener("click", closeComments);
  document.getElementById("lucid-btn").addEventListener("click", toggleLucid);

  // Перемикач тем
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => setTheme(btn.dataset.theme));
  });

  setInterval(() => { if (Math.random() < 0.32) spawnGlitch(); }, 4800);
  setInterval(forgetPosts, 6500);
  setInterval(manageSleepingShadows, 12000);
  setInterval(mutateNames, 10000);
  setInterval(updateDreamClock, 3200);
  setInterval(checkVoid, 4200);
  setInterval(maybeParalysis, 20000);
  setInterval(spawnNewPost, 14000 + Math.random() * 8000);
  updateDreamClock();
}

document.addEventListener("DOMContentLoaded", init);
