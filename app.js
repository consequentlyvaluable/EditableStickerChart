const state = {
  childName: "",
  goal: "Earn 10 stars for a weekend treat",
  stickerSymbol: "⭐",
  stickerColor: "#ffcc00",
  rows: 6,
  columns: 5,
  tasks: [
    "Brush teeth",
    "Pack backpack",
    "Finish homework",
    "Put toys away",
    "Take a shower",
    "Lights out on time",
  ],
  stickers: new Set(),
};

const storageKey = "sticker-chart-settings";

const childNameInput = document.getElementById("childName");
const goalInput = document.getElementById("goal");
const stickerSymbolInput = document.getElementById("stickerSymbol");
const stickerColorInput = document.getElementById("stickerColor");
const rowsInput = document.getElementById("rows");
const columnsInput = document.getElementById("columns");
const addTaskBtn = document.getElementById("addTask");
const taskList = document.getElementById("taskList");
const taskTemplate = document.getElementById("taskTemplate");
const chartGrid = document.getElementById("chartGrid");
const taskLabels = document.getElementById("taskLabels");
const printBtn = document.getElementById("printBtn");
const clearBtn = document.getElementById("clearBtn");

const previewChild = document.getElementById("previewChild");
const previewGoal = document.getElementById("previewGoal");
const previewSticker = document.getElementById("previewSticker");
const chartTitle = document.getElementById("chartTitle");
const chartGoal = document.getElementById("chartGoal");

function loadFromStorage() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    Object.assign(state, parsed, {
      stickers: new Set(parsed.stickers || []),
    });
  } catch (error) {
    console.warn("Could not load saved chart", error);
  }
}

function saveToStorage() {
  const serializable = {
    ...state,
    stickers: Array.from(state.stickers),
  };
  localStorage.setItem(storageKey, JSON.stringify(serializable));
}

function createTaskItem(text = "") {
  const node = taskTemplate.content.firstElementChild.cloneNode(true);
  const input = node.querySelector(".task-input");
  const handle = node.querySelector(".drag-handle");
  node.draggable = true;

  node.addEventListener("dragstart", (event) => {
    if (node.dataset.dragAllowed !== "true") {
      event.preventDefault();
      return;
    }
    delete node.dataset.dragAllowed;
    node.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", "");
  });

  node.addEventListener("dragend", () => {
    node.classList.remove("dragging");
    syncTasksFromDOM();
    renderLabels();
    saveToStorage();
  });

  handle.addEventListener("keydown", (event) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      node.focus();
    }
  });

  handle.addEventListener("pointerdown", () => {
    node.dataset.dragAllowed = "true";
  });

  handle.addEventListener("pointerup", () => {
    delete node.dataset.dragAllowed;
  });

  handle.addEventListener("pointerleave", () => {
    delete node.dataset.dragAllowed;
  });

  input.value = text;
  input.addEventListener("input", () => {
    node.dataset.empty = input.value.trim() === "";
    syncTasksFromDOM();
    render();
  });
  node.querySelector(".remove-task").addEventListener("click", () => {
    node.remove();
    syncTasksFromDOM();
    render();
  });
  return node;
}

function syncTasksFromDOM() {
  const inputs = Array.from(taskList.querySelectorAll(".task-input"));
  state.tasks = inputs
    .map((input) => input.value.trim())
    .filter((value) => value.length > 0);
}

function renderTasks() {
  taskList.innerHTML = "";
  state.tasks.forEach((task) => {
    taskList.appendChild(createTaskItem(task));
  });
  if (state.tasks.length === 0) {
    taskList.appendChild(createTaskItem("Brush teeth"));
  }
}

function renderLabels() {
  taskLabels.innerHTML = "";
  const labels = state.tasks.slice(0, state.rows);
  labels.forEach((label) => {
    const pill = document.createElement("div");
    pill.className = "task-label";
    pill.textContent = label;
    taskLabels.appendChild(pill);
  });
}

function renderGrid() {
  chartGrid.innerHTML = "";
  chartGrid.style.gridTemplateColumns = `repeat(${state.columns}, minmax(80px, 1fr))`;
  chartGrid.style.setProperty("--sticker-color", state.stickerColor);

  const totalCells = state.rows * state.columns;
  for (let index = 0; index < totalCells; index += 1) {
    const row = Math.floor(index / state.columns);
    const column = index % state.columns;
    const key = `${row}-${column}`;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "chart-cell";
    cell.dataset.key = key;
    cell.setAttribute("aria-label", `Row ${row + 1}, column ${column + 1}`);

    if (state.stickers.has(key)) {
      cell.classList.add("filled");
      cell.textContent = state.stickerSymbol || "⭐";
    } else {
      cell.textContent = "";
    }

    cell.addEventListener("click", () => toggleSticker(key, cell));
    chartGrid.appendChild(cell);
  }
}

function toggleSticker(key, element) {
  if (state.stickers.has(key)) {
    state.stickers.delete(key);
    element.classList.remove("filled");
    element.textContent = "";
  } else {
    state.stickers.add(key);
    element.classList.add("filled");
    element.textContent = state.stickerSymbol || "⭐";
  }
  saveToStorage();
}

function renderPreview() {
  previewChild.textContent = state.childName || "Your child";
  previewGoal.textContent = state.goal || "Earn 10 stars for a weekend treat";
  previewSticker.textContent = state.stickerSymbol || "⭐";
  previewSticker.style.color = state.stickerColor;
  chartTitle.textContent = `${state.childName || "Your child"}'s chart`;
  chartGoal.textContent = state.goal || "Celebrate with a small reward after filling the chart.";
}

function render() {
  renderTasks();
  renderLabels();
  renderGrid();
  renderPreview();
  saveToStorage();
}

function attachEvents() {
  childNameInput.addEventListener("input", (event) => {
    state.childName = event.target.value;
    renderPreview();
    saveToStorage();
  });

  goalInput.addEventListener("input", (event) => {
    state.goal = event.target.value;
    renderPreview();
    saveToStorage();
  });

  stickerSymbolInput.addEventListener("input", (event) => {
    state.stickerSymbol = event.target.value.trim() || "⭐";
    renderPreview();
    renderGrid();
    saveToStorage();
  });

  stickerColorInput.addEventListener("input", (event) => {
    state.stickerColor = event.target.value;
    renderPreview();
    renderGrid();
    saveToStorage();
  });

  rowsInput.addEventListener("input", (event) => {
    const value = clampNumber(event.target.value, 3, 12);
    state.rows = value;
    rowsInput.value = value;
    render();
  });

  columnsInput.addEventListener("input", (event) => {
    const value = clampNumber(event.target.value, 3, 10);
    state.columns = value;
    columnsInput.value = value;
    render();
  });

  addTaskBtn.addEventListener("click", () => {
    taskList.appendChild(createTaskItem(""));
  });

  taskList.addEventListener("dragover", (event) => {
    const dragged = taskList.querySelector(".task-item.dragging");
    if (!dragged) return;
    event.preventDefault();
    const afterElement = getDragAfterElement(taskList, event.clientY);
    if (afterElement === null) {
      taskList.appendChild(dragged);
    } else {
      taskList.insertBefore(dragged, afterElement);
    }
  });

  taskList.addEventListener("blur", (event) => {
    if (event.target.classList.contains("task-input")) {
      syncTasksFromDOM();
      renderLabels();
      saveToStorage();
    }
  }, true);

  clearBtn.addEventListener("click", () => {
    state.stickers.clear();
    renderGrid();
    saveToStorage();
  });

  printBtn.addEventListener("click", () => window.print());
}

function getDragAfterElement(container, y) {
  const siblings = [...container.querySelectorAll(".task-item:not(.dragging)")];
  return siblings.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    { offset: Number.NEGATIVE_INFINITY, element: null }
  ).element;
}

function clampNumber(value, min, max) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function init() {
  loadFromStorage();
  childNameInput.value = state.childName;
  goalInput.value = state.goal;
  stickerSymbolInput.value = state.stickerSymbol;
  stickerColorInput.value = state.stickerColor;
  rowsInput.value = state.rows;
  columnsInput.value = state.columns;

  render();
  attachEvents();
}

init();
