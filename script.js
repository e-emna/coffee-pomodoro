
// ============ DATA ============

const MENU = [
  { id: "cinnamon-latte", name: "Cinnamon Latte", price: 5 },
  { id: "matcha-latte", name: "Matcha Latte", price: 8 },
  { id: "cheese-cake", name: "Cheese Cake", price: 7 },
  { id: "cinnamon-roll", name: "Cinnamon Roll", price: 6 },
  { id: "lemonade", name: "Lemonade", price: 4 },
  { id: "lemon-tarte", name: "Lemon Tarte", price: 8 },
  { id: "hot-chocolate", name: "Hot Chocolate", price: 6 },
  { id: "butter-croissant", name: "Butter Croissant", price: 6 },
  { id: "blueberry-muffin", name: "Blueberry Muffin", price: 9 },
  { id: "iced-coffee", name: "Iced Coffee", price: 7 },
];

const SEATS = {
  window: {
    name: "Window Nook",
    discountItem: "cinnamon-latte",
  },
  corner: {
    name: "Corner Chair",
    discountItem: "hot-chocolate",
  },
  "long-table": {
    name: "Long Table",
    discountItem: "lemonade",
  },
};

const DISCOUNT_AMOUNT = 1;
const STORAGE_KEY = "focusCafeState";

// ============ STATE ============

const DEFAULT_STATE = {
  seat: null,
  balance: 10,
  ordered: [],
  session: {
    active: false,
    durationMins: 25,
    secondsLeft: 25 * 60,
  },
};

let state = {
  ...DEFAULT_STATE,
  ordered: [],
  session: { ...DEFAULT_STATE.session },
};

let timerInterval = null;

// ============ DOM REFERENCES ============

const balanceEl = document.querySelector("#balance");
const seatCards = document.querySelectorAll(".seat-card");

const focusMessageEl = document.querySelector("#focus-message");
const menuNameEl = document.querySelector("#menu-name");
const menuListEl = document.querySelector("#menu-list");

const noSeatMessageEl = document.querySelector("#no-seat-message");
const sessionUIEl = document.querySelector("#session-ui");
const seatLabelEl = document.querySelector("#seat-label");

const timerCircleEl = document.querySelector(".timer-circle");
const timerDisplayEl = document.querySelector("#timer-display");

const goalInput = document.querySelector("#goal-input");
const durationOptionsEl = document.querySelector(".duration-options");

const startBtn = document.querySelector("#btn");
const startBtnLabel = document.querySelector("#state");
const leaveBtn = document.querySelector("#leave-btn");

const progressBarEl = document.querySelector("#progress-bar-fill");
const progressPctEl = document.querySelector("#progress-pct");
const tableAreaEl = document.querySelector("#table-area");

// ============ PERSISTENCE ============

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Unable to save progress:", error);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    const parsed = JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") return;

    const durationMins = [15, 25, 50].includes(
      parsed.session?.durationMins
    )
      ? parsed.session.durationMins
      : DEFAULT_STATE.session.durationMins;

    state = {
      ...DEFAULT_STATE,
      ...parsed,
      seat: SEATS[parsed.seat] ? parsed.seat : null,
      balance:
        Number.isFinite(parsed.balance) && parsed.balance >= 0
          ? parsed.balance
          : DEFAULT_STATE.balance,
      ordered: Array.isArray(parsed.ordered)
        ? parsed.ordered.filter((id) =>
            MENU.some((item) => item.id === id)
          )
        : [],
      session: {
        ...DEFAULT_STATE.session,
        ...parsed.session,
        active: false,
        durationMins,
        secondsLeft: durationMins * 60,
      },
    };
  } catch (error) {
    console.warn("Unable to load saved progress:", error);
  }
}

// ============ HELPERS ============

function formatTime(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;

  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getDiscountedPrice(item) {
  const seat = SEATS[state.seat];

  if (seat && seat.discountItem === item.id) {
    return item.price - DISCOUNT_AMOUNT;
  }

  return item.price;
}

// ============ RENDER ============

function renderSeats() {
  seatCards.forEach((card) => {
    const isThisSeat = card.dataset.seat === state.seat;
    const btn = card.querySelector(".sit-btn");

    card.classList.toggle("occupied", isThisSeat);

    btn.textContent = isThisSeat ? "You're here" : "Sit down";
    btn.style.backgroundColor = isThisSeat ? "#8d5f3e" : "";
    btn.disabled = isThisSeat;
  });
}

function renderSeatState() {
  if (state.seat) {
    const seatName = SEATS[state.seat].name;

    focusMessageEl.textContent = "Order up, then settle in";
    menuNameEl.textContent = seatName;
    seatLabelEl.textContent = `Seated at ${seatName}`;

    noSeatMessageEl.classList.add("hidden");
    sessionUIEl.classList.remove("hidden");
  } else {
    focusMessageEl.textContent = "Take a seat to start focusing";
    menuNameEl.textContent = "The";
    seatLabelEl.textContent = "Pick a spot to begin";

    noSeatMessageEl.classList.remove("hidden");
    sessionUIEl.classList.add("hidden");
  }
}

function renderMenu() {
  document.querySelectorAll(".item").forEach((itemEl) => {
    const item = MENU.find(
      (menuItem) => menuItem.id === itemEl.dataset.item
    );

    if (!item) return;

    const price = getDiscountedPrice(item);
    const pricePill = itemEl.querySelector(".pill");
    const orderBtn = itemEl.querySelector("button");

    if (pricePill) {
      pricePill.textContent = `$${price}`;
    }

    itemEl.classList.toggle(
      "house-special",
      price < item.price
    );

    orderBtn.disabled = state.balance < price;
  });
}

function renderTimer() {
  const { durationMins, secondsLeft, active } = state.session;
  const fullDuration = durationMins * 60;
  const elapsed = fullDuration - secondsLeft;
  const pct = Math.round((elapsed / fullDuration) * 100);

  timerDisplayEl.textContent = formatTime(secondsLeft);

  progressBarEl.style.width = `${pct}%`;
  progressPctEl.textContent = `${pct}%`;

  timerCircleEl.classList.toggle("active", active);

  if (active) {
    startBtnLabel.textContent = "Pause";
  } else if (secondsLeft < fullDuration) {
    startBtnLabel.textContent = "Resume";
  } else {
    startBtnLabel.textContent = "Start";
  }

  startBtn.disabled = !state.seat;

  document.querySelectorAll(".duration-btn").forEach((btn) => {
    const mins = Number(btn.dataset.mins);

    btn.classList.toggle(
      "selected",
      mins === durationMins
    );

    btn.disabled = active;
  });
}

function renderTable() {
  if (state.ordered.length === 0) {
    tableAreaEl.textContent =
      "Nothing on the table yet — finish a session, then order something from the menu.";

    return;
  }

  tableAreaEl.innerHTML = state.ordered
    .map((id) => {
      const item = MENU.find((menuItem) => menuItem.id === id);
      const img = document.querySelector(
        `.item[data-item="${id}"] img`
      );

      if (!item || !img) return "";

      const src = img.getAttribute("src");

      return `
        <div class="table-item">
          <img src="${src}" alt="">
          <div class="table-item-text">
            <strong>${item.name}</strong>
            <span>on the table · keeps you company</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function render() {
  balanceEl.textContent = state.balance;

  renderSeats();
  renderSeatState();
  renderMenu();
  renderTimer();
  renderTable();

  saveState();
}

// ============ SEAT EVENTS ============

seatCards.forEach((card) => {
  const btn = card.querySelector(".sit-btn");

  btn.addEventListener("click", () => {
    state.seat = card.dataset.seat;
    render();
  });
});

leaveBtn.addEventListener("click", () => {
  stopTimer();

  state.seat = null;
  state.session.active = false;
  state.session.secondsLeft =
    state.session.durationMins * 60;

  render();
});

// ============ DURATION EVENTS ============

durationOptionsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".duration-btn");

  if (!btn || state.session.active) return;

  const mins = Number(btn.dataset.mins);

  state.session.durationMins = mins;
  state.session.secondsLeft = mins * 60;

  render();
});

// ============ TIMER EVENTS ============

startBtn.addEventListener("click", () => {
  if (!state.seat) return;

  if (state.session.active) {
    pauseTimer();
  } else {
    startTimer();
  }

  render();
});

function startTimer() {
  if (state.session.active) return;

  if (state.session.secondsLeft <= 0) {
    state.session.secondsLeft =
      state.session.durationMins * 60;
  }

  state.session.active = true;

  timerInterval = setInterval(() => {
    state.session.secondsLeft--;

    if (state.session.secondsLeft <= 0) {
      completeSession();
      return;
    }

    render();
  }, 1000);
}

function pauseTimer() {
  state.session.active = false;
  stopTimer();
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function completeSession() {
  stopTimer();

  state.balance += state.session.durationMins;
  state.session.active = false;
  state.session.secondsLeft =
    state.session.durationMins * 60;

  render();
}

// ============ ORDERING EVENTS ============

menuListEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");

  if (!btn) return;

  const itemEl = btn.closest(".item");

  if (!itemEl) return;

  const item = MENU.find(
    (menuItem) => menuItem.id === itemEl.dataset.item
  );

  if (!item) return;

  const price = getDiscountedPrice(item);

  if (state.balance < price) return;

  state.balance -= price;
  state.ordered.push(item.id);

  render();
});

// ============ INITIALIZATION ============

loadState();
render();
