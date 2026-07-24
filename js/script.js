"use strict";

const STORAGE_KEYS = {
  transactions: "expenseVisualizer.transactions.v1",
  budget: "expenseVisualizer.budget.v1",
  theme: "expenseVisualizer.theme.v1"
};

const chartColors = [
  "#4f46e5",
  "#06b6d4",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#64748b"
];

const state = {
  transactions: readJson(STORAGE_KEYS.transactions, []),
  budget: Number(localStorage.getItem(STORAGE_KEYS.budget)) || 0,
  monthFilter: getCurrentMonth(),
  sortBy: "newest"
};

const elements = {
  form: document.getElementById("transactionForm"),
  itemName: document.getElementById("itemName"),
  amount: document.getElementById("amount"),
  date: document.getElementById("transactionDate"),
  category: document.getElementById("category"),
  customCategory: document.getElementById("customCategory"),
  customCategoryField: document.getElementById("customCategoryField"),
  list: document.getElementById("transactionList"),
  totalBalance: document.getElementById("totalBalance"),
  monthlyTotal: document.getElementById("monthlyTotal"),
  monthlyCount: document.getElementById("monthlyCount"),
  balanceStatus: document.getElementById("balanceStatus"),
  monthFilter: document.getElementById("monthFilter"),
  sortSelect: document.getElementById("sortSelect"),
  clearMonthFilter: document.getElementById("clearMonthFilter"),
  chart: document.getElementById("expenseChart"),
  chartEmpty: document.getElementById("chartEmpty"),
  chartLegend: document.getElementById("chartLegend"),
  budgetForm: document.getElementById("budgetForm"),
  budgetInput: document.getElementById("budgetLimit"),
  budgetDisplay: document.getElementById("budgetDisplay"),
  budgetRemaining: document.getElementById("budgetRemaining"),
  budgetProgress: document.getElementById("budgetProgress"),
  budgetMessage: document.getElementById("budgetMessage"),
  removeBudget: document.getElementById("removeBudget"),
  balanceCard: document.getElementById("balanceCard"),
  themeToggle: document.getElementById("themeToggle"),
  emptyTemplate: document.getElementById("emptyStateTemplate")
};

initialize();

function initialize() {
  elements.date.value = getToday();
  elements.monthFilter.value = state.monthFilter;
  elements.budgetInput.value = state.budget || "";
  applySavedTheme();
  bindEvents();
  render();
}

function bindEvents() {
  elements.form.addEventListener("submit", handleAddTransaction);
  elements.category.addEventListener("change", handleCategoryChange);
  elements.list.addEventListener("click", handleListClick);
  elements.monthFilter.addEventListener("change", () => {
    state.monthFilter = elements.monthFilter.value;
    render();
  });
  elements.sortSelect.addEventListener("change", () => {
    state.sortBy = elements.sortSelect.value;
    renderTransactions();
  });
  elements.clearMonthFilter.addEventListener("click", () => {
    state.monthFilter = "";
    elements.monthFilter.value = "";
    render();
  });
  elements.budgetForm.addEventListener("submit", handleBudgetSave);
  elements.removeBudget.addEventListener("click", handleBudgetRemove);
  elements.themeToggle.addEventListener("click", toggleTheme);
  window.addEventListener("resize", debounce(renderChart, 120));
}

function handleAddTransaction(event) {
  event.preventDefault();
  clearErrors();

  const itemName = elements.itemName.value.trim();
  const amount = Number(elements.amount.value);
  const date = elements.date.value;
  const selectedCategory = elements.category.value;
  const customCategory = elements.customCategory.value.trim();
  const category = selectedCategory === "__custom__" ? customCategory : selectedCategory;

  let isValid = true;

  if (!itemName) {
    setError("itemName", "Item name is required.");
    isValid = false;
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    setError("amount", "Enter an amount greater than zero.");
    isValid = false;
  }

  if (!date) {
    setError("transactionDate", "Date is required.");
    isValid = false;
  }

  if (!selectedCategory) {
    setError("category", "Choose a category.");
    isValid = false;
  }

  if (selectedCategory === "__custom__" && !customCategory) {
    setError("customCategory", "Enter a custom category.");
    isValid = false;
  }

  if (!isValid) return;

  state.transactions.push({
    id: createId(),
    itemName,
    amount: Math.round(amount),
    category,
    date,
    createdAt: new Date().toISOString()
  });

  persistTransactions();
  elements.form.reset();
  elements.date.value = getToday();
  elements.customCategoryField.classList.add("hidden");
  state.monthFilter = date.slice(0, 7);
  elements.monthFilter.value = state.monthFilter;
  render();
  elements.itemName.focus();
}

function handleCategoryChange() {
  const isCustom = elements.category.value === "__custom__";
  elements.customCategoryField.classList.toggle("hidden", !isCustom);
  if (isCustom) {
    elements.customCategory.focus();
  } else {
    elements.customCategory.value = "";
    setError("customCategory", "");
  }
}

function handleListClick(event) {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) return;

  const id = deleteButton.dataset.deleteId;
  state.transactions = state.transactions.filter((transaction) => transaction.id !== id);
  persistTransactions();
  render();
}

function handleBudgetSave(event) {
  event.preventDefault();
  const value = Number(elements.budgetInput.value);

  if (!Number.isFinite(value) || value <= 0) {
    elements.budgetInput.focus();
    return;
  }

  state.budget = Math.round(value);
  localStorage.setItem(STORAGE_KEYS.budget, String(state.budget));
  renderBudget();
}

function handleBudgetRemove() {
  state.budget = 0;
  elements.budgetInput.value = "";
  localStorage.removeItem(STORAGE_KEYS.budget);
  renderBudget();
}

function render() {
  renderSummary();
  renderTransactions();
  renderChart();
  renderBudget();
}

function renderSummary() {
  const total = state.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const monthTransactions = getFilteredTransactions();
  const monthTotal = monthTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  elements.totalBalance.textContent = formatCurrency(total);
  elements.monthlyTotal.textContent = formatCurrency(monthTotal);
  elements.monthlyCount.textContent = `${monthTransactions.length} transaction${monthTransactions.length === 1 ? "" : "s"}`;
  elements.balanceStatus.textContent = state.transactions.length
    ? `${state.transactions.length} transaction${state.transactions.length === 1 ? "" : "s"} saved locally`
    : "No transactions yet";
}

function renderTransactions() {
  const transactions = sortTransactions(getFilteredTransactions());
  elements.list.replaceChildren();

  if (!transactions.length) {
    elements.list.appendChild(elements.emptyTemplate.content.cloneNode(true));
    return;
  }

  const fragment = document.createDocumentFragment();

  transactions.forEach((transaction) => {
    const article = document.createElement("article");
    article.className = "transaction-item";

    const main = document.createElement("div");
    main.className = "transaction-main";

    const topLine = document.createElement("div");
    topLine.className = "transaction-topline";

    const name = document.createElement("div");
    name.className = "transaction-name";
    name.textContent = transaction.itemName;

    const amount = document.createElement("div");
    amount.className = "transaction-amount";
    amount.textContent = formatCurrency(transaction.amount);

    topLine.append(name, amount);

    const meta = document.createElement("div");
    meta.className = "transaction-meta";

    const category = document.createElement("span");
    category.className = "category-badge";
    category.textContent = transaction.category;

    const date = document.createElement("span");
    date.textContent = formatDate(transaction.date);

    meta.append(category, date);
    main.append(topLine, meta);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.dataset.deleteId = transaction.id;
    deleteButton.setAttribute("aria-label", `Delete ${transaction.itemName}`);
    deleteButton.title = "Delete transaction";
    deleteButton.textContent = "×";

    article.append(main, deleteButton);
    fragment.appendChild(article);
  });

  elements.list.appendChild(fragment);
}

function renderChart() {
  const canvas = elements.chart;
  const context = canvas.getContext("2d");
  const transactions = getFilteredTransactions();
  const totalsByCategory = transactions.reduce((accumulator, transaction) => {
    accumulator[transaction.category] = (accumulator[transaction.category] || 0) + transaction.amount;
    return accumulator;
  }, {});

  const entries = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  const displaySize = Math.min(canvas.parentElement.clientWidth || 320, 340);
  const ratio = window.devicePixelRatio || 1;

  canvas.width = displaySize * ratio;
  canvas.height = displaySize * ratio;
  canvas.style.width = `${displaySize}px`;
  canvas.style.height = `${displaySize}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, displaySize, displaySize);
  elements.chartLegend.replaceChildren();

  if (!entries.length || total === 0) {
    elements.chartEmpty.classList.remove("hidden");
    canvas.classList.add("hidden");
    return;
  }

  elements.chartEmpty.classList.add("hidden");
  canvas.classList.remove("hidden");

  const center = displaySize / 2;
  const radius = displaySize * 0.39;
  let startAngle = -Math.PI / 2;

  entries.forEach(([category, value], index) => {
    const sliceAngle = (value / total) * Math.PI * 2;
    const endAngle = startAngle + sliceAngle;
    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, startAngle, endAngle);
    context.closePath();
    context.fillStyle = chartColors[index % chartColors.length];
    context.fill();
    startAngle = endAngle;
  });

  context.beginPath();
  context.arc(center, center, radius * 0.56, 0, Math.PI * 2);
  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
  context.fill();

  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--muted").trim();
  context.textAlign = "center";
  context.font = "700 12px Inter, system-ui, sans-serif";
  context.fillText("TOTAL", center, center - 8);

  context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
  context.font = "800 17px Inter, system-ui, sans-serif";
  context.fillText(shortCurrency(total), center, center + 18);

  const legendFragment = document.createDocumentFragment();
  entries.forEach(([category, value], index) => {
    const row = document.createElement("div");
    row.className = "legend-row";

    const dot = document.createElement("span");
    dot.className = "legend-dot";
    dot.style.backgroundColor = chartColors[index % chartColors.length];

    const label = document.createElement("span");
    const percentage = Math.round((value / total) * 100);
    label.textContent = `${category} · ${percentage}%`;

    const amount = document.createElement("strong");
    amount.textContent = formatCurrency(value);

    row.append(dot, label, amount);
    legendFragment.appendChild(row);
  });
  elements.chartLegend.appendChild(legendFragment);
}

function renderBudget() {
  const monthTotal = getFilteredTransactions().reduce((sum, transaction) => sum + transaction.amount, 0);
  const hasBudget = state.budget > 0;
  const progress = hasBudget ? (monthTotal / state.budget) * 100 : 0;
  const remaining = state.budget - monthTotal;

  elements.budgetDisplay.textContent = hasBudget ? formatCurrency(state.budget) : "Not set";
  elements.budgetProgress.style.width = `${Math.min(progress, 100)}%`;
  elements.budgetProgress.classList.toggle("warning", progress >= 75 && progress < 100);
  elements.budgetProgress.classList.toggle("danger", progress >= 100);
  elements.balanceCard.classList.toggle("over-limit", hasBudget && progress > 100);

  if (!hasBudget) {
    elements.budgetRemaining.textContent = "Set a limit below";
    elements.budgetMessage.textContent = "No monthly limit has been set.";
    return;
  }

  if (remaining >= 0) {
    elements.budgetRemaining.textContent = `${formatCurrency(remaining)} remaining`;
    elements.budgetMessage.textContent = `${Math.round(progress)}% of your monthly limit has been used.`;
  } else {
    elements.budgetRemaining.textContent = `${formatCurrency(Math.abs(remaining))} over limit`;
    elements.budgetMessage.textContent = "Warning: spending has exceeded the monthly limit.";
  }
}

function getFilteredTransactions() {
  if (!state.monthFilter) return [...state.transactions];
  return state.transactions.filter((transaction) => transaction.date.slice(0, 7) === state.monthFilter);
}

function sortTransactions(transactions) {
  return [...transactions].sort((a, b) => {
    switch (state.sortBy) {
      case "oldest":
        return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
      case "amount-high":
        return b.amount - a.amount;
      case "amount-low":
        return a.amount - b.amount;
      case "category":
        return a.category.localeCompare(b.category) || b.date.localeCompare(a.date);
      case "newest":
      default:
        return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
    }
  });
}

function setError(fieldName, message) {
  const input = document.getElementById(fieldName === "transactionDate" ? "transactionDate" : fieldName);
  const error = document.querySelector(`[data-error-for="${fieldName}"]`);
  if (input) input.classList.toggle("invalid", Boolean(message));
  if (error) error.textContent = message;
}

function clearErrors() {
  document.querySelectorAll(".error-message").forEach((element) => {
    element.textContent = "";
  });
  document.querySelectorAll(".invalid").forEach((element) => {
    element.classList.remove("invalid");
  });
}

function persistTransactions() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(state.transactions));
}

function applySavedTheme() {
  const savedTheme = localStorage.getItem(STORAGE_KEYS.theme);
  const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  setTheme(savedTheme || preferredTheme);
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  localStorage.setItem(STORAGE_KEYS.theme, nextTheme);
  renderChart();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const icon = elements.themeToggle.querySelector("span[aria-hidden='true']");
  const label = elements.themeToggle.querySelector(".button-label");
  const isDark = theme === "dark";
  icon.textContent = isDark ? "☀" : "☾";
  label.textContent = isDark ? "Light mode" : "Dark mode";
  elements.themeToggle.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function shortCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

function formatDate(dateString) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(`${dateString}T00:00:00`));
}

function getToday() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function getCurrentMonth() {
  return getToday().slice(0, 7);
}

function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function debounce(callback, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delay);
  };
}
