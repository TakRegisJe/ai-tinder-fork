// app.js
// Plain global JS, no modules.

// -------------------
// Data generator
// -------------------
const TAGS = [
  "Coffee","Hiking","Movies","Live Music","Board Games","Cats","Dogs","Traveler",
  "Foodie","Tech","Art","Runner","Climbing","Books","Yoga","Photography"
];
const FIRST_NAMES = [
  "Alex","Sam","Jordan","Taylor","Casey","Avery","Riley","Morgan","Quinn","Cameron",
  "Jamie","Drew","Parker","Reese","Emerson","Rowan","Shawn","Harper","Skyler","Devon"
];
const CITIES = [
  "Brooklyn","Manhattan","Queens","Jersey City","Hoboken","Astoria",
  "Williamsburg","Bushwick","Harlem","Lower East Side"
];
const JOBS = [
  "Product Designer","Software Engineer","Data Analyst","Barista","Teacher",
  "Photographer","Architect","Chef","Nurse","Marketing Manager","UX Researcher"
];
const BIOS = [
  "Weekend hikes and weekday lattes.",
  "Dog parent. Amateur chef. Karaoke enthusiast.",
  "Trying every taco in the city — for science.",
  "Bookstore browser and movie quote machine.",
  "Gym sometimes, Netflix always.",
  "Looking for the best slice in town.",
  "Will beat you at Mario Kart.",
  "Currently planning the next trip."
];

const UNSPLASH_SEEDS = [
  "1515462277126-2b47b9fa09e6",
  "1520975916090-3105956dac38",
  "1519340241574-2cec6aef0c01",
  "1554151228-14d9def656e4",
  "1548142813-c348350df52b",
  "1517841905240-472988babdf9",
  "1535713875002-d1d0cf377fde",
  "1545996124-0501ebae84d0",
  "1524504388940-b1c1722653e1",
  "1531123897727-8f129e1688ce",
];

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='3'%3E%3Crect fill='%23222436' width='4' height='3'/%3E%3C/svg%3E";

function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickTags() { return Array.from(new Set(Array.from({ length: 4 }, () => sample(TAGS)))); }
function imgFor(seed) {
  return `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1200&q=80`;
}

// Pick `count` distinct images by sampling without replacement from the seed pool.
function pickImages(count = 3) {
  const pool = [...UNSPLASH_SEEDS];
  const result = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(imgFor(pool.splice(idx, 1)[0]));
  }
  return result;
}

function generateProfiles(count = 12) {
  const profiles = [];
  for (let i = 0; i < count; i++) {
    profiles.push({
      id: `p_${i}_${Date.now().toString(36)}`,
      name: sample(FIRST_NAMES),
      age: 18 + Math.floor(Math.random() * 22),
      city: sample(CITIES),
      title: sample(JOBS),
      bio: sample(BIOS),
      tags: pickTags(),
      images: pickImages(3),
    });
  }
  return profiles;
}

// -------------------
// DOM refs
// -------------------
const deckEl       = document.getElementById("deck");
const shuffleBtn   = document.getElementById("shuffleBtn");
const likeBtn      = document.getElementById("likeBtn");
const nopeBtn      = document.getElementById("nopeBtn");
const superLikeBtn = document.getElementById("superLikeBtn");
const galleryModal = document.getElementById("galleryModal");
const galleryTrack = document.getElementById("galleryTrack");
const galleryClose = document.getElementById("galleryClose");

let profiles = [];

// -------------------
// Rendering
// -------------------
function renderDeck() {
  deckEl.setAttribute("aria-busy", "true");
  deckEl.innerHTML = "";

  profiles.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    card.dataset.id = p.id;
    card.setAttribute("tabindex", "-1");
    card.setAttribute("aria-label", `${p.name}, ${p.age}`);

    // Swipe-direction stamp overlays
    const likeLabel  = makeLabel("swipe-label--like",  "LIKE");
    const nopeLabel  = makeLabel("swipe-label--nope",  "NOPE");
    const superLabel = makeLabel("swipe-label--super", "SUPER");

    const img = document.createElement("img");
    img.className = "card__media";
    img.src = p.images[0];
    img.alt = `${p.name} — profile photo`;
    img.addEventListener("error", () => {
      img.src = PLACEHOLDER_IMG;
      img.alt = "Photo unavailable";
    });

    const body = document.createElement("div");
    body.className = "card__body";

    const titleRow = document.createElement("div");
    titleRow.className = "title-row";
    titleRow.innerHTML = `<h2 class="card__title">${p.name}</h2><span class="card__age">${p.age}</span>`;

    const meta = document.createElement("div");
    meta.className = "card__meta";
    meta.textContent = `${p.title} • ${p.city}`;

    const chips = document.createElement("div");
    chips.className = "card__chips";
    p.tags.forEach((t) => {
      const c = document.createElement("span");
      c.className = "chip";
      c.textContent = t;
      chips.appendChild(c);
    });

    body.append(titleRow, meta, chips);
    card.append(likeLabel, nopeLabel, superLabel, img, body);
    deckEl.appendChild(card);

    addDragHandlers(card, p);
    addKeyHandlers(card, p);
  });

  // Only the top card (last child) should be reachable via Tab
  promoteTopCard();
  deckEl.removeAttribute("aria-busy");
}

function makeLabel(cls, text) {
  const el = document.createElement("div");
  el.className = `swipe-label ${cls}`;
  el.textContent = text;
  return el;
}

// -------------------
// Card dismissal
// -------------------

// Sets tabindex="-1" on every card, then makes the new top card (lastElementChild)
// focusable and moves keyboard focus to it.
function promoteTopCard() {
  const cards = deckEl.querySelectorAll(".card");
  cards.forEach((c) => c.setAttribute("tabindex", "-1"));
  const top = deckEl.lastElementChild;
  if (top && top.classList.contains("card")) {
    top.setAttribute("tabindex", "0");
    top.focus({ preventScroll: true });
  }
}

function dismissTopCard(direction) {
  const top = deckEl.lastElementChild;
  if (top && top.classList.contains("card")) dismissCard(top, direction);
}

function dismissCard(card, direction) {
  // Guard against double-dismiss (e.g. button + drag simultaneously)
  if (card.classList.contains("card--leaving")) return;
  card.classList.add("card--leaving");
  card.classList.remove("card--dragging");

  const flyClass = {
    right: "card--fly-right",
    left:  "card--fly-left",
    up:    "card--fly-up",
  }[direction];
  card.classList.add(flyClass);

  profiles = profiles.filter((p) => p.id !== card.dataset.id);

  card.addEventListener("transitionend", () => {
    card.remove();
    promoteTopCard();
    checkEmptyDeck();
  }, { once: true });
}

function checkEmptyDeck() {
  if (deckEl.childElementCount !== 0) return;
  const empty = document.createElement("div");
  empty.className = "deck__empty";
  empty.innerHTML = `
    <span class="deck__empty-icon">🔥</span>
    <p>You've seen everyone</p>
    <p class="deck__empty-hint">Hit Shuffle to load more</p>
  `;
  deckEl.appendChild(empty);
}

// -------------------
// Drag / swipe gestures
// -------------------
const SWIPE_X = 100; // px horizontal threshold for like / nope
const SWIPE_Y = 80;  // px vertical threshold for super like

function addDragHandlers(card, profile) {
  let startX = 0, startY = 0, active = false, lastTap = 0;
  const DOUBLE_TAP_MS = 280;

  card.addEventListener("pointerdown", (e) => {
    // Double-tap → open gallery
    const now = Date.now();
    if (now - lastTap < DOUBLE_TAP_MS) {
      openGallery(profile);
      active = false;
      return;
    }
    lastTap = now;

    // Only the top card (last child) responds to drag
    if (card !== deckEl.lastElementChild) return;

    active = true;
    startX = e.clientX;
    startY = e.clientY;
    card.setPointerCapture(e.pointerId);
    card.classList.add("card--dragging");
    e.preventDefault();
  });

  card.addEventListener("pointermove", (e) => {
    if (!active) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    card.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.08}deg)`;
    updateLabels(card, dx, dy);
  });

  function onRelease(e) {
    if (!active) return;
    active = false;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (dx > SWIPE_X) {
      dismissCard(card, "right");
    } else if (dx < -SWIPE_X) {
      dismissCard(card, "left");
    } else if (dy < -SWIPE_Y && Math.abs(dx) < SWIPE_X) {
      dismissCard(card, "up");
    } else {
      snapBack(card);
    }
  }

  card.addEventListener("pointerup", onRelease);
  card.addEventListener("pointercancel", () => {
    if (active) { active = false; snapBack(card); }
  });
}

function updateLabels(card, dx, dy) {
  const [likeEl, nopeEl, superEl] = card.querySelectorAll(".swipe-label");
  const fade = (v, start = 20, range = 60) => Math.max(0, Math.min(1, (v - start) / range));
  likeEl.style.opacity  = fade(dx);
  nopeEl.style.opacity  = fade(-dx);
  // Super-like label only shows when swipe is mostly upward
  superEl.style.opacity = Math.abs(dx) < 60 ? fade(-dy) : 0;
}

function snapBack(card) {
  card.classList.remove("card--dragging");
  card.style.transition = "transform 350ms cubic-bezier(.23,1,.32,1)";
  card.style.transform  = "";
  card.querySelectorAll(".swipe-label").forEach((l) => (l.style.opacity = 0));
  card.addEventListener("transitionend", () => { card.style.transition = ""; }, { once: true });
}

// -------------------
// Keyboard support
// -------------------
function addKeyHandlers(card, profile) {
  card.addEventListener("keydown", (e) => {
    if (card !== deckEl.lastElementChild) return;
    if      (e.key === "ArrowRight") dismissCard(card, "right");
    else if (e.key === "ArrowLeft")  dismissCard(card, "left");
    else if (e.key === "ArrowUp")    dismissCard(card, "up");
    else if (e.key === "Enter")      openGallery(profile);
  });
}

// -------------------
// Photo gallery
// -------------------
function openGallery(profile) {
  galleryTrack.innerHTML = "";
  profile.images.forEach((src, i) => {
    const img = document.createElement("img");
    img.className = "gallery__img";
    img.src = src;
    img.alt = `${profile.name} photo ${i + 1}`;
    img.addEventListener("error", () => { img.src = PLACEHOLDER_IMG; });
    galleryTrack.appendChild(img);
  });
  galleryModal.hidden = false;
  galleryClose.focus();
}

function closeGallery() {
  galleryModal.hidden = true;
}

galleryClose.addEventListener("click", closeGallery);
galleryModal.addEventListener("click", (e) => { if (e.target === galleryModal) closeGallery(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeGallery(); });

// -------------------
// Control buttons
// -------------------
likeBtn.addEventListener("click",      () => dismissTopCard("right"));
nopeBtn.addEventListener("click",      () => dismissTopCard("left"));
superLikeBtn.addEventListener("click", () => dismissTopCard("up"));
shuffleBtn.addEventListener("click",   resetDeck);

// -------------------
// Boot
// -------------------
function resetDeck() {
  profiles = generateProfiles(12);
  renderDeck();
}

resetDeck();
