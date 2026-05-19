const CONFIG = {
  initialBlindBoxes: 9,
  emojis: ["桃", "麦", "音", "符", "吉", "竹", "鹿", "戏", "花"],
  lineTriples: [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
    [2, 3, 4],
  ],
  achievements: [
    { name: "青铜吧唧手", need: 10, reward: 3 },
    { name: "白银吧唧手", need: 25, reward: 5 },
    { name: "黄金吧唧手", need: 50, reward: 8 },
    { name: "钻石吧唧手", need: 100, reward: 10 },
    { name: "王者吧唧手", need: 200, reward: 15 },
  ],
  externalAchievements: [
    { need: 50, reward: 5 },
    { need: 200, reward: 10 },
    { need: 500, reward: 20 },
    { need: 1000, reward: 30 },
    { need: 2000, reward: 50 },
    { need: 5000, reward: 100 },
  ],
  rescueOptions: [
    { name: "小补一下", cost: 10, badges: 3 },
    { name: "中补一下", cost: 20, badges: 6 },
    { name: "大补一下", cost: 30, badges: 10, best: true },
  ],
  packages: [
    { name: "小试牛刀", price: "￥6", tickets: 80, cubes: 50, energy: 0 },
    { name: "初露锋芒", price: "￥12", tickets: 160, cubes: 30, energy: 80 },
    { name: "一掷乾坤", price: "￥18", tickets: 240, cubes: 40, energy: 120 },
  ],
};

const state = {
  tickets: 3,
  boosterTokens: 50,
  storeTokens: 0,
  lifetimeBadges: 0,
  claimedExternal: new Set(),
  selectedLucky: null,
  selectedPicker: null,
  board: Array(9).fill(null),
  blindBoxes: 0,
  bag: [],
  rescueUsed: false,
  gameActive: false,
  triggeredRoundAchievements: new Set(),
  lastResult: null,
};

const flow = {
  packageOpenedFromRescue: false,
  purchaseOpenedFromRescue: false,
};

const $ = (selector) => document.querySelector(selector);
const boardEl = $("#board");
const toastEl = $("#toast");

function badgeHTML(type, small = false) {
  if (type === null || type === undefined) return "";
  return `<img class="${small ? "mini-badge" : "badge"} badge-${type}" src="assets/badges/badge-${type}.svg" alt="${CONFIG.emojis[type]}徽章">`;
}

function renderBoard() {
  boardEl.innerHTML = state.board
    .map((item, index) => `<div class="cell" data-cell="${index}">${badgeHTML(item)}</div>`)
    .join("");
}

function renderResources() {
  $("#ticketCount").textContent = state.tickets;
  $("#boosterCount").textContent = state.boosterTokens;
  $("#tokenCount").textContent = state.storeTokens;
  $("#bagCount").textContent = state.bag.length;
  $("#blindCount").textContent = state.blindBoxes;
  $("#luckyPreview").outerHTML =
    state.selectedLucky === null
      ? `<div id="luckyPreview" class="mini-badge empty">?</div>`
      : `<img id="luckyPreview" class="mini-badge badge-${state.selectedLucky}" src="assets/badges/badge-${state.selectedLucky}.svg" alt="${CONFIG.emojis[state.selectedLucky]}徽章">`;

  $("#collectionPreview").innerHTML = state.bag
    .slice(-5)
    .map((type) => badgeHTML(type, true))
    .join("");

  const packs = Math.min(state.blindBoxes, 16);
  $("#blindGrid").innerHTML = Array.from({ length: packs }, () => `<span class="blind-pack"></span>`).join("");
  renderMilestones();
  renderRoundAchievement();
}

function renderMilestones() {
  const stageStarts = [0, 150, 450, 1000];
  const stage = stageStarts.findLastIndex((start) => state.lifetimeBadges >= start) + 1;
  $("#stageNumber").textContent = Math.max(1, stage);
  const next = getNextExternalAchievement();
  const currentLabel = next
    ? `当前 ${state.lifetimeBadges} / 下档 ${next.need}`
    : `当前 ${state.lifetimeBadges} / 已完成全部`;
  const visible = CONFIG.externalAchievements.slice(0, 5);
  $("#milestoneLine").innerHTML = visible
    .map((m) => {
      const done = state.lifetimeBadges >= m.need;
      return `<div class="milestone ${done ? "done" : ""}">
        <span class="chest"></span><b>${m.need}</b>
      </div>`;
    })
    .join("");
  $(".stage-time").textContent = next ? `${currentLabel}，奖励 +${next.reward}` : currentLabel;
}

function getNextExternalAchievement() {
  return CONFIG.externalAchievements.find((achievement) => state.lifetimeBadges < achievement.need) || null;
}

function getRoundAchievementState() {
  const current = state.bag.length;
  const next = CONFIG.achievements.find((achievement) => !state.triggeredRoundAchievements.has(achievement.need)) || null;
  const previous = [...CONFIG.achievements]
    .reverse()
    .find((achievement) => state.triggeredRoundAchievements.has(achievement.need)) || null;
  const previousNeed = previous?.need || 0;
  const progressMax = next ? next.need - previousNeed : 1;
  const progressNow = next ? current - previousNeed : 1;
  const percent = next ? Math.max(0, Math.min(100, (progressNow / progressMax) * 100)) : 100;
  return { current, next, previous, percent };
}

function renderRoundAchievement() {
  const round = getRoundAchievementState();
  const title = round.previous ? `已达成：${round.previous.name}` : "本局成就";
  const text = round.next
    ? `当前 ${round.current} / 下档 ${round.next.need}，还差 ${Math.max(0, round.next.need - round.current)}，奖励 +${round.next.reward} 盲袋`
    : `当前 ${round.current}，本局成就已全部达成`;

  $("#roundAchievementTitle").textContent = title;
  $("#roundAchievementText").textContent = text;
  $("#roundAchievementFill").style.width = `${round.percent}%`;
  $("#roundAchievement").classList.toggle("is-complete", !round.next);
}

function renderRescueAchievement() {
  const round = getRoundAchievementState();
  const title = round.previous ? `已达成：${round.previous.name}` : "本局成就";
  const text = round.next
    ? `当前收获袋 ${round.current} 个，距离 ${round.next.name} 还差 ${Math.max(0, round.next.need - round.current)} 个，可奖励 +${round.next.reward} 盲袋`
    : `当前收获袋 ${round.current} 个，本局成就已全部达成`;

  $("#rescueAchievementTitle").textContent = title;
  $("#rescueAchievementText").textContent = text;
  $("#rescueAchievementFill").style.width = `${round.percent}%`;
  $("#rescueAchievement").classList.toggle("is-complete", !round.next);
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.remove("show");
  void toastEl.offsetWidth;
  toastEl.classList.add("show");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog.open) dialog.showModal();
}

function closeDialog(id) {
  const dialog = document.getElementById(id);
  if (dialog.open) dialog.close();
}

function closeDialogAndResume(id) {
  closeDialog(id);
  if (id === "purchaseModal" && flow.purchaseOpenedFromRescue) {
    flow.purchaseOpenedFromRescue = false;
    closeDialog("packageModal");
    flow.packageOpenedFromRescue = false;
    reopenRescueChoice();
  } else if (id === "packageModal" && flow.packageOpenedFromRescue) {
    flow.packageOpenedFromRescue = false;
    reopenRescueChoice();
  }
}

function reopenRescueChoice() {
  if (!state.gameActive || state.rescueUsed) return;
  renderRescueOptions();
  openDialog("rescueModal");
}

function randomBadge() {
  return Math.floor(Math.random() * CONFIG.emojis.length);
}

function resetRound() {
  state.board = Array(9).fill(null);
  state.blindBoxes = CONFIG.initialBlindBoxes;
  state.bag = [];
  state.rescueUsed = false;
  state.gameActive = true;
  state.triggeredRoundAchievements = new Set();
  state.selectedLucky = null;
  state.selectedPicker = null;
  $("#guideSpeech").style.display = "none";
  renderBoard();
  renderResources();
}

function startGame() {
  if (state.tickets <= 0) {
    showToast("入场券不足");
    openDialog("packageModal");
    return;
  }
  state.tickets -= 1;
  resetRound();
  renderPicker();
  openDialog("pickerModal");
}

function renderPicker() {
  $("#confirmLucky").disabled = true;
  $("#badgePicker").innerHTML = CONFIG.emojis
    .map(
      (_, index) => `<button class="pick-badge" data-pick="${index}" type="button">
        ${badgeHTML(index)}
      </button>`,
    )
    .join("");
}

function chooseLucky(type) {
  state.selectedPicker = type;
  document.querySelectorAll(".pick-badge").forEach((button) => {
    button.classList.toggle("selected", Number(button.dataset.pick) === type);
  });
  $("#confirmLucky").disabled = false;
}

async function confirmLucky() {
  if (state.selectedPicker === null) return;
  state.selectedLucky = state.selectedPicker;
  closeDialog("pickerModal");
  renderResources();
  await runMainLoop();
}

function firstEmptyIndex() {
  return state.board.findIndex((item) => item === null);
}

function boardIsFull() {
  return state.board.every((item) => item !== null);
}

function boardIsEmpty() {
  return state.board.every((item) => item === null);
}

async function runMainLoop() {
  while (state.gameActive && state.blindBoxes > 0 && firstEmptyIndex() !== -1) {
    state.blindBoxes -= 1;
    const type = randomBadge();
    if (type === state.selectedLucky) {
      state.blindBoxes += 1;
      showToast("幸运色 +1");
      await wait(260);
    }
    const target = firstEmptyIndex();
    state.board[target] = type;
    renderBoard();
    renderResources();
    const badge = document.querySelector(`[data-cell="${target}"] .badge`);
    badge?.classList.add("pop");
    await wait(260);

    if (boardIsFull() || state.blindBoxes === 0) {
      await resolveBoard();
    }
  }

  if (!state.gameActive) return;

  if (state.blindBoxes === 0 || firstEmptyIndex() === -1) {
    await resolveBoard();
  }
}

function findFamily() {
  if (!boardIsFull()) return null;
  const set = new Set(state.board);
  return set.size === CONFIG.emojis.length ? state.board.map((_, index) => index) : null;
}

function findTriple() {
  const sortedLines = [...CONFIG.lineTriples].sort((a, b) => {
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  });
  return sortedLines.find((line) => {
    const [a, b, c] = line;
    return state.board[a] !== null && state.board[a] === state.board[b] && state.board[b] === state.board[c];
  }) || null;
}

function findPair() {
  const pairs = [];
  for (let i = 0; i < state.board.length; i += 1) {
    if (state.board[i] === null) continue;
    for (let j = i + 1; j < state.board.length; j += 1) {
      if (state.board[i] === state.board[j]) pairs.push([i, j]);
    }
  }
  pairs.sort((a, b) => a[0] + a[1] - (b[0] + b[1]) || a[0] - b[0]);
  return pairs[0] || null;
}

async function resolveBoard() {
  let hadMatch = false;
  while (state.gameActive) {
    const family = findFamily();
    if (family) {
      hadMatch = true;
      await removeBadges(family, 8, "全家福 +8");
      continue;
    }

    const triple = findTriple();
    if (triple) {
      hadMatch = true;
      await removeBadges(triple, 5, "三连 +5");
      continue;
    }

    const pair = findPair();
    if (pair) {
      hadMatch = true;
      await removeBadges(pair, 1, "对碰 +1");
      continue;
    }
    break;
  }

  if (!state.gameActive) return;

  if (boardIsFull() && !findFamily() && !findTriple() && !findPair()) {
    await enterEndFlow();
    return;
  }

  if (state.blindBoxes > 0 && firstEmptyIndex() !== -1) {
    if (hadMatch) await wait(250);
    await runMainLoop();
    return;
  }

  if (state.blindBoxes === 0) {
    await enterEndFlow();
  }
}

async function removeBadges(indices, blindReward, label) {
  indices.forEach((index) => document.querySelector(`[data-cell="${index}"]`)?.classList.add("removing"));
  showToast(label);
  await wait(460);

  const removed = indices.map((index) => state.board[index]);
  removed.forEach((type) => state.bag.push(type));
  indices.forEach((index) => {
    state.board[index] = null;
  });
  state.blindBoxes += blindReward;

  if (boardIsEmpty()) {
    state.blindBoxes += 8;
    showToast("清台 +8");
    await wait(360);
  }

  const achievementLabels = checkRoundAchievements();
  renderBoard();
  renderResources();
  if (achievementLabels.length) {
    showToast(achievementLabels.join(" "));
    await wait(520);
  }
}

function checkRoundAchievements() {
  const labels = [];
  CONFIG.achievements.forEach((achievement) => {
    if (state.bag.length >= achievement.need && !state.triggeredRoundAchievements.has(achievement.need)) {
      state.triggeredRoundAchievements.add(achievement.need);
      state.blindBoxes += achievement.reward;
      labels.push(`${achievement.name} +${achievement.reward}`);
    }
  });
  return labels;
}

async function enterEndFlow() {
  if (state.boosterTokens > 0 && !state.rescueUsed) {
    renderRescueOptions();
    openDialog("rescueModal");
    return;
  }
  finishGame();
}

function renderRescueOptions() {
  renderRescueAchievement();
  $("#rescueOptions").innerHTML = CONFIG.rescueOptions
    .map(
      (option, index) => `<button class="rescue-option ${option.best ? "best" : ""}" data-rescue="${index}" type="button">
        <span class="pack-art"></span>
        <b>${option.badges}</b>
        <span class="rescue-price"><span class="cube-icon"></span>${option.cost}</span>
      </button>`,
    )
    .join("");
}

async function buyRescue(index) {
  const option = CONFIG.rescueOptions[index];
  if (!option || state.boosterTokens < option.cost) {
    showBoosterShortage(option);
    return;
  }
  state.boosterTokens -= option.cost;
  state.rescueUsed = true;
  closeDialog("rescueModal");

  if (boardIsFull()) {
    state.bag.push(state.board[0]);
    state.board[0] = null;
  }

  for (let i = 0; i < option.badges; i += 1) {
    const slot = firstEmptyIndex();
    if (slot === -1) break;
    state.board[slot] = randomBadge();
  }

  renderBoard();
  renderResources();
  await wait(360);
  await resolveBoard();
}

function showBoosterShortage(option) {
  const needed = option ? Math.max(0, option.cost - state.boosterTokens) : 0;
  $("#shortageText").textContent = option
    ? `当前补充包代币 ${state.boosterTokens}，选择「${option.name}」需要 ${option.cost}，还差 ${needed}。可以先购买礼包，回来后继续选择补给或结束。`
    : "当前补充包代币不足，可以先购买礼包，回来后继续选择补给或结束。";
  openDialog("shortageModal");
}

function openPackageFromRescue() {
  closeDialog("shortageModal");
  closeDialog("rescueModal");
  flow.packageOpenedFromRescue = true;
  renderPackageModal();
  openDialog("packageModal");
}

function finishGame() {
  state.gameActive = false;
  const remaining = state.board.filter((item) => item !== null);
  const totalBadges = state.bag.length + remaining.length;
  const allBadges = [...state.bag, ...remaining];
  const counts = CONFIG.emojis.map((_, index) => allBadges.filter((type) => type === index).length);
  state.storeTokens += totalBadges;
  state.lifetimeBadges += totalBadges;
  const externalRewards = checkExternalAchievements();
  state.lastResult = {
    totalBadges,
    counts,
    rescueUsed: state.rescueUsed,
    roundAchievements: [...state.triggeredRoundAchievements],
    externalRewards,
  };
  renderResources();
  renderResult();
  openDialog("resultModal");
}

function checkExternalAchievements() {
  const rewards = [];
  CONFIG.externalAchievements.forEach((achievement) => {
    if (state.lifetimeBadges >= achievement.need && !state.claimedExternal.has(achievement.need)) {
      state.claimedExternal.add(achievement.need);
      state.boosterTokens += achievement.reward;
      rewards.push(`累计${achievement.need}吧唧 +${achievement.reward}补充包`);
    }
  });
  return rewards;
}

function renderResult() {
  const result = state.lastResult;
  $("#resultTotal").textContent = result.totalBadges;
  $("#resultCrate").innerHTML = CONFIG.emojis
    .slice(0, 8)
    .map((_, index) => `<img class="mini-badge badge-${index}" src="assets/badges/badge-${index}.svg" alt="${CONFIG.emojis[index]}徽章" style="transform: rotate(${(index - 3.5) * 9}deg) translateY(${-index * 3}px)">`)
    .join("");
  $("#resultBreakdown").innerHTML = result.counts
    .map(
      (count, index) => `<div class="result-item">
        <img class="mini-badge badge-${index}" src="assets/badges/badge-${index}.svg" alt="${CONFIG.emojis[index]}徽章"><b>${count}</b>
      </div>`,
    )
    .join("");
  const notes = [
    `转化吧唧商店代币 +${result.totalBadges}`,
    result.rescueUsed ? "本局使用了补充包救命" : "本局未使用补充包",
    result.roundAchievements.length ? `触发单局成就 ${result.roundAchievements.length} 档` : "未触发单局成就",
    ...result.externalRewards,
  ];
  $("#resultNotes").innerHTML = notes.map((note) => `<div>${note}</div>`).join("");
}

function renderAchievementsModal() {
  const next = getNextExternalAchievement();
  const previousNeed = [...CONFIG.externalAchievements]
    .reverse()
    .find((achievement) => state.lifetimeBadges >= achievement.need)?.need || 0;
  const progressMax = next ? next.need - previousNeed : 1;
  const progressNow = next ? state.lifetimeBadges - previousNeed : 1;
  const percent = next ? Math.max(0, Math.min(100, (progressNow / progressMax) * 100)) : 100;

  $("#achievementSummary").textContent = next
    ? `当前累计 ${state.lifetimeBadges} 个吧唧，达到 ${next.need} 个可获得 ${next.reward} 个补充包代币。`
    : `当前累计 ${state.lifetimeBadges} 个吧唧，外部成就已全部达成。`;
  $("#currentLifetime").textContent = state.lifetimeBadges;
  $("#nextAchievementText").textContent = next
    ? `下档 ${next.need}，还差 ${Math.max(0, next.need - state.lifetimeBadges)}`
    : "全部奖励已达成";
  $("#achievementProgressFill").style.width = `${percent}%`;
  $("#achievementStages").innerHTML = CONFIG.externalAchievements
    .map((achievement) => {
      const done = state.lifetimeBadges >= achievement.need;
      const claimed = state.claimedExternal.has(achievement.need);
      return `<div class="achievement-stage ${done ? "done" : ""}">
        <span class="achievement-icon"></span>
        <div><b>${achievement.need}</b><br>${done ? "已达到目标" : `还差 ${achievement.need - state.lifetimeBadges}`}</div>
        <strong>${claimed ? "已领" : `+${achievement.reward}`}</strong>
      </div>`;
    })
    .join("");
}

function renderPackageModal() {
  $("#packageCards").innerHTML = CONFIG.packages
    .map(
      (pack) => `<article class="package-card">
        <h3>${pack.name}</h3>
        <div><span class="ticket-icon"></span> ${pack.tickets}</div>
        <div><span class="cube-icon"></span> ${pack.cubes}</div>
        <div><span class="energy-icon"></span> ${pack.energy}</div>
        <button data-buy-pack="${pack.name}" type="button">${pack.price}</button>
      </article>`,
    )
    .join("");
}

function buyPackage(name) {
  const pack = CONFIG.packages.find((item) => item.name === name);
  if (!pack) return;
  const addedTickets = Math.max(1, Math.round(pack.tickets / 80));
  state.tickets += addedTickets;
  state.boosterTokens += pack.cubes;
  renderResources();
  purchaseOpenedFromCurrentPackage();
  showPurchaseFeedback(pack.name, [
    { icon: "ticket-icon", label: `入场券 +${addedTickets}` },
    { icon: "cube-icon", label: `补充包代币 +${pack.cubes}` },
  ]);
}

function buyBundle() {
  state.tickets += 8;
  state.boosterTokens += 120;
  renderResources();
  purchaseOpenedFromCurrentPackage();
  showPurchaseFeedback("打包全收", [
    { icon: "ticket-icon", label: "入场券 +8" },
    { icon: "cube-icon", label: "补充包代币 +120" },
  ]);
}

function purchaseOpenedFromCurrentPackage() {
  flow.purchaseOpenedFromRescue = flow.packageOpenedFromRescue;
}

function showPurchaseFeedback(title, rewards) {
  $("#purchaseModal h2").textContent = `${title}购买成功`;
  $("#purchaseRewards").innerHTML = rewards
    .map((reward) => `<div class="purchase-reward"><span class="${reward.icon}"></span>${reward.label}</div>`)
    .join("");
  openDialog("purchaseModal");
}

document.addEventListener("click", (event) => {
  const closeId = event.target.dataset.close;
  if (closeId) closeDialogAndResume(closeId);

  const pick = event.target.closest("[data-pick]");
  if (pick) chooseLucky(Number(pick.dataset.pick));

  const rescue = event.target.closest("[data-rescue]");
  if (rescue) buyRescue(Number(rescue.dataset.rescue));

  const pack = event.target.closest("[data-buy-pack]");
  if (pack) buyPackage(pack.dataset.buyPack);
});

$("#startButton").addEventListener("click", startGame);
$("#confirmLucky").addEventListener("click", confirmLucky);
$("#openRules").addEventListener("click", () => openDialog("rulesModal"));
$("#skipRescue").addEventListener("click", () => {
  closeDialog("rescueModal");
  finishGame();
});
$("#againButton").addEventListener("click", () => {
  closeDialog("resultModal");
  startGame();
});
$("#openAchievements").addEventListener("click", () => {
  renderAchievementsModal();
  openDialog("achievementsModal");
});
$("#openPackage").addEventListener("click", () => {
  renderPackageModal();
  openDialog("packageModal");
});
$("#buyBundle").addEventListener("click", buyBundle);
$("#goPackageFromRescue").addEventListener("click", openPackageFromRescue);

  renderBoard();
  renderResources();
  renderPackageModal();
  renderAchievementsModal();

Object.assign(window, {
  state,
  renderBoard,
  renderResources,
  renderRescueOptions,
  renderRoundAchievement,
  openPackageFromRescue,
});
