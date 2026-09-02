/* =========================
   СОМНА — логіка сну
   ========================= */

const NICK_PREFIXES = [
  "тінь", "сон", "голос", "відлуння", "уламки", "подих", "луна",
  "попіл", "імла", "шепіт", "відбиток", "слід", "відлуння"
];

const NICK_SUFFIXES = [
  "місяця", "води", "коридору", "дзеркала", "піску", "листя",
  "тихого", "далекого", "забутого", "неіснуючого", "вчорашнього"
];

let currentUser = "";
let posts = [];
let touchCounts = {};
let activeCommentsPostId = null;

// ---------- Генерація ніка ----------
function generateNick() {
  const p = NICK_PREFIXES[Math.floor(Math.random() * NICK_PREFIXES.length)];
  const s = NICK_SUFFIXES[Math.floor(Math.random() * NICK_SUFFIXES.length)];
  return `\( {p}_ \){s}_${Math.floor(Math.random() * 90 + 10)}`;
}

// ---------- Чорні квадрати ----------
function applyBlackouts(text) {
  let result = text;
  BLACKOUT_WORDS.forEach(word => {
    if (Math.random() < 0.35) {
      const regex = new RegExp(word, "gi");
      result = result.replace(regex, "██████");
    }
  });
  if (Math.random() < 0.4) {
    const words = result.split(" ");
    const idx = Math.floor(Math.random() * words.length);
    if (words[idx].length > 3 && !words[idx].includes("█")) {
      words[idx] = "██████";
      result = words.join(" ");
    }
  }
  return result;
}

// ---------- Форматування контенту ----------
function formatContent(text) {
  return applyBlackouts(text)
    .replace(/██████/g, '<span class="blackout">██████</span>');
}

// ---------- Створення острова-поста ----------
function createIsland(post, index) {
  const island = document.createElement("div");
  island.className = "post-island drifting";
  island.dataset.id = post.id;

  const x = 5 + Math.random() * 60;
  const y = 12 + Math.random() * 55;
  island.style.left = `${x}%`;
  island.style.top = `${y}%`;
  island.style.animationDelay = `${-Math.random() * 12}s`;
  island.style.animationDuration = `${14 + Math.random() * 10}s`;

  const user = FAKE_USERS.find(u => u.name === post.author) || { mood: "нейтральний" };

  island.innerHTML = `
    <div class="post-header">
      <div class="shadow-avatar" data-mood="${user.mood}"></div>
      <div>
        <div class="author-name">${post.author}</div>
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

  island.querySelector(".touch-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    handleTouch(post.id, island);
  });

  island.querySelector(".comment-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    openComments(post);
  });

  // іноді пост розчиняється
  if (Math.random() < 0.18) {
    setTimeout(() => {
      island.classList.add("dissolving");
      setTimeout(() => island.remove(), 900);
    }, 8000 + Math.random() * 20000);
  }

  return island;
}

// ---------- Дотик (лайк) ----------
function handleTouch(id, island) {
  touchCounts[id] = (touchCounts[id] || 0) + 1;
  island.classList.add("touched");

  if (touchCounts[id] >= 4) {
    island.classList.add("breathing");
  }

  setTimeout(() => {
    if (touchCounts[id] < 4) {
      island.classList.remove("touched");
    }
  }, 1200);
}

// ---------- Коментарі ----------
function openComments(post) {
  activeCommentsPostId = post.id;
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

  // іноді текст переставляється
  if (Math.random() < 0.3) {
    setTimeout(() => {
      const texts = list.querySelectorAll(".comment-text");
      texts.forEach(el => {
        const words = el.textContent.split(" ");
        if (words.length > 3) {
          const i = Math.floor(Math.random() * (words.length - 1));
          [words[i], words[i + 1]] = [words[i + 1], words[i]];
          el.textContent = words.join(" ");
        }
      });
    }, 2000 + Math.random() * 3000);
  }

  panel.classList.add("open");
}

function closeComments() {
  document.getElementById("comments-panel").classList.remove("open");
  activeCommentsPostId = null;
}

// ---------- Глюки ----------
function spawnGlitch() {
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

  btn.addEventListener("mouseenter", () => {
    if (fleeTimeout) clearTimeout(fleeTimeout);

    const distance = Math.random() < 0.12 
      ? 300 + Math.random() * 200
      : 3 + Math.random() * 12;

    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;

    btn.classList.add("fleeing");
    btn.style.transform = `translate(${dx}px, ${dy}px)`;

    fleeTimeout = setTimeout(() => {
      btn.style.transform = "translate(0, 0)";
      btn.classList.remove("fleeing");
    }, 3000 + Math.random() * 5000);
  });
}

// ---------- Публікація ----------
function publishPost() {
  const textarea = document.getElementById("compose-text");
  let text = textarea.value.trim();
  if (!text) return;

  text = applyBlackouts(text);

  const newPost = {
    id: Date.now(),
    author: currentUser,
    content: text,
    date: "2047-11-13",
    displayDate: "завтра, " + new Date(Date.now() + 86400000).toLocaleDateString("uk-UA", {
      day: "numeric", month: "long", year: "numeric"
    }).replace(/\d{4}/, "20" + (47 + Math.floor(Math.random() * 50))),
    commentsCount: Math.floor(Math.random() * 5) + 1,
    comments: [
      {
        author: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name,
        text: "Я бачив щось схоже. Але трохи інакше.",
        date: "2009-0" + (Math.floor(Math.random() * 9) + 1) + "-1" + Math.floor(Math.random() * 9)
      }
    ]
  };

  posts.unshift(newPost);
  const island = createIsland(newPost, 0);
  document.getElementById("feed").appendChild(island);

  textarea.value = "";
  
  setTimeout(spawnGlitch, 200);
  setTimeout(spawnGlitch, 400);
}

// ---------- Ініціалізація ----------
function init() {
  currentUser = generateNick();

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
    setTimeout(() => {
      feed.appendChild(createIsland(p, i));
    }, i * 180);
  });

  document.getElementById("publish-btn").addEventListener("click", publishPost);
  setupFleeingButton();

  document.getElementById("close-comments").addEventListener("click", closeComments);

  setInterval(() => {
    if (Math.random() < 0.4) spawnGlitch();
  }, 4000 + Math.random() * 6000);

  setInterval(() => {
    document.querySelectorAll(".shadow-avatar").forEach(av => {
      if (Math.random() < 0.3) {
        const moods = FAKE_USERS.map(u => u.mood);
        av.dataset.mood = moods[Math.floor(Math.random() * moods.length)];
      }
    });
  }, 12000);
}

document.addEventListener("DOMContentLoaded", init);
