/* =========================
   СОМНА — логіка сну (оптимізована)
   ========================= */

const NICK_PREFIXES = [
  "тінь", "сон", "голос", "відлуння", "уламки", "подих", "луна",
  "попіл", "імла", "шепіт", "відбиток", "слід"
];

const NICK_SUFFIXES = [
  "місяця", "води", "коридору", "дзеркала", "піску", "листя",
  "тихого", "далекого", "забутого", "неіснуючого", "вчорашнього"
];

var currentUser = "";
var posts = [];
var touchCounts = {};
var activityScore = 0;
var lucidActive = false;
var paralysisActive = false;
var dreamTimeOffset = 0;
var currentTheme = "default";
var nextPostId = 100;
var MAX_ISLANDS = 8;
var isWeak = false;
var tabHidden = false;
var feedEl = null;

function detectWeakDevice() {
  var cores = navigator.hardwareConcurrency || 2;
  var mem = navigator.deviceMemory || 2;
  var mobile = window.innerWidth < 768 || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  isWeak = cores <= 4 || mem <= 2 || mobile;
  if (isWeak) {
    MAX_ISLANDS = 5;
    document.body.classList.add("weak-device");
  }
}

function generateNick() {
  var p = NICK_PREFIXES[Math.floor(Math.random() * NICK_PREFIXES.length)];
  var s = NICK_SUFFIXES[Math.floor(Math.random() * NICK_SUFFIXES.length)];
  return p + "_" + s + "_" + Math.floor(Math.random() * 90 + 10);
}

function applyBlackouts(text, intensity) {
  intensity = intensity == null ? 0.3 : intensity;
  var result = String(text);
  var i, word, regex, words, idx;
  for (i = 0; i < BLACKOUT_WORDS.length; i++) {
    if (Math.random() < intensity) {
      word = BLACKOUT_WORDS[i];
      regex = new RegExp(word, "gi");
      result = result.replace(regex, "██████");
    }
  }
  if (Math.random() < intensity + 0.08) {
    words = result.split(" ");
    idx = Math.floor(Math.random() * words.length);
    if (words[idx] && words[idx].length > 3 && words[idx].indexOf("█") === -1) {
      words[idx] = "██████";
      result = words.join(" ");
    }
  }
  return result;
}

function formatContent(text, intensity) {
  return applyBlackouts(text, intensity)
    .replace(/██████/g, '<span class="blackout">██████</span>');
}

function createIsland(post) {
  var island = document.createElement("div");
  island.className = "post-island" + (isWeak ? "" : " drifting");
  island.dataset.id = post.id;
  island.dataset.age = "0";

  var isMobile = window.innerWidth < 768;
  var x = isMobile ? 4 + Math.random() * 38 : 6 + Math.random() * 55;
  var y = isMobile ? 16 + Math.random() * 40 : 14 + Math.random() * 50;
  island.style.left = x + "%";
  island.style.top = y + "%";

  if (!isWeak) {
    island.style.animationDelay = (-Math.random() * 12) + "s";
    island.style.animationDuration = (16 + Math.random() * 10) + "s";
  }

  var user = FAKE_USERS.find(function(u) { return u.name === post.author; }) || { mood: "нейтральний" };
  var isSleeping = !isWeak && Math.random() < 0.18;
  var authorName = String(post.author || "невідомий");
  var sleepClass = isSleeping ? " sleeping" : "";

  island.innerHTML =
    '<div class="post-header">' +
      '<div class="shadow-avatar' + sleepClass + '" data-mood="' + user.mood + '"></div>' +
      '<div>' +
        '<div class="author-name"></div>' +
        '<div class="post-date">' + post.displayDate + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="post-content">' + formatContent(post.content, isWeak ? 0.2 : 0.3) + '</div>' +
    '<div class="post-actions">' +
      '<div class="touch-btn" data-id="' + post.id + '"><span>◉</span> <span class="touch-label">дотик</span></div>' +
      '<div class="comment-btn" data-id="' + post.id + '">коментарі · ' + post.commentsCount + '</div>' +
    '</div>';

  var nameEl = island.querySelector(".author-name");
  nameEl.textContent = authorName;
  nameEl.dataset.original = authorName;

  island.querySelector(".touch-btn").addEventListener("click", function(e) {
    e.stopPropagation();
    if (paralysisActive) return;
    handleTouch(post.id, island);
    activityScore += 1;
  });

  island.querySelector(".comment-btn").addEventListener("click", function(e) {
    e.stopPropagation();
    if (paralysisActive) return;
    openComments(post);
    activityScore += 1;
  });

  enableDrag(island);
  return island;
}

function dissolveIsland(island) {
  island.classList.add("dissolving");
  setTimeout(function() {
    if (island.parentNode) island.remove();
  }, 700);
}

var dragState = null;

function enableDrag(island) {
  island.addEventListener("mousedown", onDragStart);
  island.addEventListener("touchstart", onDragStart, { passive: false });
}

function onDragStart(e) {
  if (paralysisActive) return;
  if (e.target.closest(".touch-btn") || e.target.closest(".comment-btn")) return;

  var island = e.currentTarget;
  var point = e.touches ? e.touches[0] : e;
  var rect = island.getBoundingClientRect();

  dragState = {
    island: island,
    startX: point.clientX,
    startY: point.clientY,
    origLeft: rect.left,
    origTop: rect.top
  };

  island.classList.add("dragging");
  island.classList.remove("drifting");
  island.style.left = rect.left + "px";
  island.style.top = rect.top + "px";
  island.style.right = "auto";
  island.style.bottom = "auto";
  island.style.position = "fixed";
  island.style.zIndex = "50";
  e.preventDefault();
}

function onDragMove(e) {
  if (!dragState) return;
  e.preventDefault();
  var point = e.touches ? e.touches[0] : e;
  dragState.island.style.left = (dragState.origLeft + point.clientX - dragState.startX) + "px";
  dragState.island.style.top = (dragState.origTop + point.clientY - dragState.startY) + "px";
}

function onDragEnd() {
  if (!dragState) return;
  var island = dragState.island;
  island.classList.remove("dragging");

  var rect = island.getBoundingClientRect();
  var parent = feedEl.getBoundingClientRect();
  island.style.position = "absolute";
  island.style.left = ((rect.left - parent.left) / parent.width * 100) + "%";
  island.style.top = ((rect.top - parent.top) / parent.height * 100) + "%";
  island.style.zIndex = "";

  if (!isWeak) {
    setTimeout(function() { island.classList.add("drifting"); }, 40);
  }
  dragState = null;
}

function handleTouch(id, island) {
  touchCounts[id] = (touchCounts[id] || 0) + 1;
  island.classList.add("touched");
  island.dataset.age = "0";

  if (touchCounts[id] >= 4) island.classList.add("breathing");

  var avatar = island.querySelector(".shadow-avatar");
  if (avatar && avatar.classList.contains("sleeping")) {
    avatar.classList.remove("sleeping");
    avatar.classList.add("waking");
    setTimeout(function() { avatar.classList.remove("waking"); }, 1200);
  }

  setTimeout(function() {
    if (touchCounts[id] < 4) island.classList.remove("touched");
  }, 1000);
}

function openComments(post) {
  var panel = document.getElementById("comments-panel");
  var list = document.getElementById("comments-list");
  var title = document.getElementById("comments-title");

  title.textContent = "коментарі · " + post.commentsCount;
  var html = "";
  for (var i = 0; i < post.comments.length; i++) {
    var c = post.comments[i];
    html +=
      '<div class="comment">' +
        '<div class="comment-author">' + c.author + '</div>' +
        '<div class="comment-text">' + formatContent(c.text, 0.25) + '</div>' +
        '<div class="comment-date">' + c.date + '</div>' +
      '</div>';
  }
  list.innerHTML = html;
  panel.classList.add("open");
}

function closeComments() {
  document.getElementById("comments-panel").classList.remove("open");
}

function spawnGlitch() {
  if (lucidActive || tabHidden || isWeak) return;
  if (Math.random() > 0.5) return;

  var el = document.createElement("div");
  el.className = Math.random() > 0.5 ? "glitch-rect" : "glitch-square";
  var w = 20 + Math.random() * 100;
  el.style.width = w + "px";
  el.style.height = (Math.random() > 0.5 ? 4 + Math.random() * 12 : w) + "px";
  el.style.left = (Math.random() * 100) + "vw";
  el.style.top = (Math.random() * 100) + "vh";
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.remove(); }, 400);
}

function setupFleeingButton() {
  var btn = document.getElementById("publish-btn");
  var fleeTimeout = null;
  var isTouch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  btn.addEventListener("mouseenter", function() {
    if (paralysisActive || lucidActive || isWeak) return;
    if (fleeTimeout) clearTimeout(fleeTimeout);

    var distance = Math.random() < 0.1 ? 200 + Math.random() * 150 : 3 + Math.random() * 10;
    if (isTouch) distance = Math.min(distance, 40);

    var angle = Math.random() * Math.PI * 2;
    btn.classList.add("fleeing");
    btn.style.transform = "translate(" + (Math.cos(angle) * distance) + "px," + (Math.sin(angle) * distance) + "px)";

    fleeTimeout = setTimeout(function() {
      btn.style.transform = "translate(0,0)";
      btn.classList.remove("fleeing");
    }, 2500 + Math.random() * 3000);
  });
}

function publishPost() {
  if (paralysisActive) return;
  var textarea = document.getElementById("compose-text");
  var text = textarea.value.trim();
  if (!text) return;

  text = applyBlackouts(text, 0.3);
  trimIslands();

  var newPost = {
    id: nextPostId++,
    author: currentUser,
    content: text,
    date: "2047-11-13",
    displayDate: "завтра, " + weirdDate(),
    commentsCount: Math.floor(Math.random() * 4) + 1,
    comments: [{
      author: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name,
      text: "Я бачив щось схоже. Але трохи інакше.",
      date: "2009-03-14"
    }]
  };

  posts.unshift(newPost);
  feedEl.appendChild(createIsland(newPost));
  textarea.value = "";

  if (!isWeak && Math.random() < 0.4) {
    setTimeout(function() {
      trimIslands();
      var echo = {
        id: nextPostId++,
        author: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name,
        content: applyBlackouts(text, 0.5),
        date: "1999-99-99",
        displayDate: "колись",
        commentsCount: 0,
        comments: []
      };
      var echoIsland = createIsland(echo);
      echoIsland.classList.add("echo");
      feedEl.appendChild(echoIsland);
    }, 2000);
  }

  activityScore += 2;
}

function weirdDate() {
  var day = Math.floor(Math.random() * 28) + 1;
  var months = ["січня","лютого","березня","квітня","травня","червня","липня","серпня","вересня","жовтня","листопада","грудня"];
  return day + " " + months[Math.floor(Math.random() * 12)] + " " + (20 + Math.floor(Math.random() * 80));
}

function trimIslands() {
  var islands = feedEl.querySelectorAll(".post-island");
  while (islands.length >= MAX_ISLANDS) {
    dissolveIsland(islands[0]);
    islands = feedEl.querySelectorAll(".post-island");
  }
}

function spawnNewPost() {
  if (tabHidden) return;
  if (feedEl.querySelectorAll(".post-island").length >= MAX_ISLANDS) return;

  var author = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name;
  var content = EXTRA_DREAMS[Math.floor(Math.random() * EXTRA_DREAMS.length)];

  var newPost = {
    id: nextPostId++,
    author: author,
    content: content,
    date: "2088-01-01",
    displayDate: "завтра, " + weirdDate(),
    commentsCount: Math.floor(Math.random() * 3) + 1,
    comments: [{
      author: FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)].name,
      text: "Я теж це відчував.",
      date: "2011-03-14"
    }]
  };

  var island = createIsland(newPost);
  island.style.opacity = "0";
  feedEl.appendChild(island);
  requestAnimationFrame(function() {
    island.style.transition = "opacity 0.9s ease";
    island.style.opacity = "1";
  });
}

var tickCount = 0;

function mainTick() {
  if (tabHidden) return;
  tickCount++;

  if (tickCount % 3 === 0) updateDreamClock();
  if (tickCount % 7 === 0) forgetPosts();
  if (!isWeak && tickCount % 12 === 0) manageSleepingShadows();
  if (!isWeak && tickCount % 10 === 0) mutateNames();
  if (tickCount % 5 === 0) checkVoid();
  if (tickCount % 20 === 0) maybeParalysis();
  if (!isWeak && tickCount % 5 === 0) spawnGlitch();
  if (tickCount % (isWeak ? 22 : 16) === 0) spawnNewPost();
}

function forgetPosts() {
  var islands = feedEl.querySelectorAll(".post-island");
  for (var i = 0; i < islands.length; i++) {
    var island = islands[i];
    var age = parseInt(island.dataset.age || "0", 10) + 1;
    island.dataset.age = String(age);

    if (age > 12 && Math.random() < 0.3) {
      var content = island.querySelector(".post-content");
      if (content) {
        content.innerHTML = formatContent(content.textContent, 0.2 + Math.min(age * 0.03, 0.5));
      }
    }
    if (age > 28 && Math.random() < 0.25) {
      dissolveIsland(island);
    }
  }
}

function manageSleepingShadows() {
  var avatars = feedEl.querySelectorAll(".shadow-avatar");
  for (var i = 0; i < avatars.length; i++) {
    if (Math.random() < 0.06) avatars[i].classList.add("sleeping");
  }
}

function mutateNames() {
  var names = feedEl.querySelectorAll(".author-name");
  for (var i = 0; i < names.length; i++) {
    if (Math.random() < 0.07) {
      var el = names[i];
      var original = el.dataset.original || el.textContent;
      el.style.opacity = "0.35";
      (function(node, orig) {
        setTimeout(function() {
          node.style.opacity = "1";
          node.textContent = orig;
        }, 600 + Math.random() * 800);
      })(el, original);
    }
  }
}

function updateDreamClock() {
  var clock = document.getElementById("dream-clock");
  if (!clock) return;
  dreamTimeOffset += (Math.random() - 0.45) * 30;
  var now = new Date(Date.now() + dreamTimeOffset * 60000);
  var h = String(now.getHours()).padStart(2, "0");
  var m = String(now.getMinutes()).padStart(2, "0");
  var weird = Math.random() < 0.1 ? (Math.random() < 0.5 ? "∞" : "??") : m;
  clock.textContent = h + ":" + weird;
}

function toggleLucid() {
  if (paralysisActive) return;
  lucidActive = true;
  document.body.classList.add("lucid");
  var btn = document.getElementById("lucid-btn");
  if (btn) btn.style.opacity = "0.3";
  setTimeout(function() {
    lucidActive = false;
    document.body.classList.remove("lucid");
    if (btn) btn.style.opacity = "1";
  }, 8000);
}

function checkVoid() {
  if (activityScore > 16 && Math.random() < 0.35) {
    triggerVoid();
    activityScore = 0;
  }
  activityScore = Math.max(0, activityScore - 0.4);
}

function triggerVoid() {
  var voidEl = document.getElementById("void");
  var messages = ["ти прокинувся?", "це все ще сон", "не рухайся", "хтось дивиться", "ти вже був тут"];
  voidEl.querySelector("span").textContent = messages[Math.floor(Math.random() * messages.length)];
  voidEl.classList.add("active");
  setTimeout(function() { voidEl.classList.remove("active"); }, 2200);
}

function maybeParalysis() {
  if (paralysisActive || lucidActive || isWeak || Math.random() > 0.012) return;
  paralysisActive = true;
  document.body.classList.add("paralysis");
  document.getElementById("paralysis-msg").classList.add("visible");
  setTimeout(function() {
    paralysisActive = false;
    document.body.classList.remove("paralysis");
    document.getElementById("paralysis-msg").classList.remove("visible");
  }, 4000);
}

function setTheme(theme) {
  currentTheme = theme;
  document.body.dataset.theme = theme;
  try { localStorage.setItem("somna-theme", theme); } catch (e) {}
  var btns = document.querySelectorAll(".theme-btn");
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle("active", btns[i].dataset.theme === theme);
  }
}

function init() {
  detectWeakDevice();
  feedEl = document.getElementById("feed");
  currentUser = generateNick();

  var savedTheme = "default";
  try { savedTheme = localStorage.getItem("somna-theme") || "default"; } catch (e) {}
  setTheme(savedTheme);

  var overlay = document.getElementById("intro");
  var nickEl = document.getElementById("intro-nick");
  var hintEl = document.getElementById("intro-hint");

  nickEl.textContent = currentUser;
  document.getElementById("user-nick").textContent = currentUser;

  setTimeout(function() { nickEl.classList.add("visible"); }, 500);
  setTimeout(function() { hintEl.classList.add("visible"); }, 1200);
  setTimeout(function() {
    overlay.classList.add("hidden");
    setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 1000);
  }, 2800);

  var initial = DREAM_POSTS.slice(0, isWeak ? 4 : 6);
  posts = initial.slice();
  initial.forEach(function(p, i) {
    setTimeout(function() { feedEl.appendChild(createIsland(p)); }, i * 120);
  });

  document.getElementById("publish-btn").addEventListener("click", publishPost);
  setupFleeingButton();
  document.getElementById("close-comments").addEventListener("click", closeComments);
  document.getElementById("lucid-btn").addEventListener("click", toggleLucid);

  var themeBtns = document.querySelectorAll(".theme-btn");
  for (var i = 0; i < themeBtns.length; i++) {
    (function(btn) {
      btn.addEventListener("click", function() { setTheme(btn.dataset.theme); });
    })(themeBtns[i]);
  }

  setInterval(mainTick, 1000);

  window.addEventListener("mousemove", onDragMove);
  window.addEventListener("touchmove", onDragMove, { passive: false });
  window.addEventListener("mouseup", onDragEnd);
  window.addEventListener("touchend", onDragEnd);

  document.addEventListener("visibilitychange", function() {
    tabHidden = document.hidden;
  });

  updateDreamClock();
}

document.addEventListener("DOMContentLoaded", init);