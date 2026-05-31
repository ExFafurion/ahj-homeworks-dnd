import './styles.css';

// -------------------- Данные по умолчанию --------------------
const DEFAULT_COLUMNS = [
  {
    id: 'todo',
    title: 'TODO',
    cards: [
      'Welcome to Trello!',
      'This is a card.',
      'Click on a card to see what\'s behind it.',
      'You can attach pictures and files...'
    ]
  },
  {
    id: 'in-progress',
    title: 'IN PROGRESS',
    cards: [
      'Drag people onto a card to indicate that they\'re responsible for it.',
      'Use color-coded labels for organization',
      'Make as many lists as you need!',
      'Finished with a card? Archive it.',
      'Try dragging cards anywhere.'
    ]
  },
  {
    id: 'done',
    title: 'DONE',
    cards: [
      'To learn more tricks, check out the guide.',
      'Use as many boards as you want. We\'ll make more!',
      'Want to use keyboard shortcuts? We have them!',
      'Want updates on new features?'
    ]
  }
];

// localStorage
function loadState() {
  const saved = localStorage.getItem('trello-board');
  return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
}
function saveState(columns) { localStorage.setItem('trello-board', JSON.stringify(columns)); }

// Глобальные переменные DnD
let drag = {
  active: false,
  startColumnId: null,
  startCardIndex: null,
  startCardText: null,
  clone: null,
  placeholder: null,
  targetColumnId: null,
  targetIndex: null,
  offsetX: 0, offsetY: 0,
  originalCard: null
};

// Рендер доски
function renderBoard(columns) {
  const board = document.getElementById('board');
  board.innerHTML = '';
  columns.forEach(column => {
    const colDiv = document.createElement('div');
    colDiv.className = 'column';
    colDiv.dataset.columnId = column.id;
    const header = document.createElement('div');
    header.className = 'column-header';
    header.textContent = column.title;
    colDiv.appendChild(header);
    const cardsContainer = document.createElement('div');
    cardsContainer.className = 'cards-list';
    column.cards.forEach((text, idx) => {
      const card = createCard(text, column.id, idx);
      cardsContainer.appendChild(card);
    });
    colDiv.appendChild(cardsContainer);
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Add another card';
    addBtn.className = 'add-card-btn';
    addBtn.onclick = (e) => { e.stopPropagation(); showAddForm(colDiv, column.id); };
    colDiv.appendChild(addBtn);
    board.appendChild(colDiv);
  });
}

function createCard(text, columnId, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.textContent = text;
  card.dataset.columnId = columnId;
  card.dataset.cardIndex = index;
  const del = document.createElement('span');
  del.textContent = '✖';
  del.className = 'delete-card';
  del.onclick = (e) => {
    e.stopPropagation();
    const cols = loadState();
    const col = cols.find(c => c.id === columnId);
    col.cards.splice(index, 1);
    saveState(cols);
    renderBoard(cols);
  };
  card.appendChild(del);
  card.addEventListener('mousedown', onMouseDown);
  return card;
}

// Добавление карточки
function showAddForm(columnDiv, columnId) {
  if (columnDiv.querySelector('.card-input-container')) return;
  const container = document.createElement('div');
  container.className = 'card-input-container';
  const textarea = document.createElement('textarea');
  textarea.rows = 2;
  textarea.className = 'card-input';
  textarea.placeholder = 'Enter a title for this card...';
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add Card';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.className = 'cancel';
  actions.appendChild(addBtn);
  actions.appendChild(cancelBtn);
  container.appendChild(textarea);
  container.appendChild(actions);
  const addButton = columnDiv.querySelector('.add-card-btn');
  columnDiv.insertBefore(container, addButton);
  const finish = () => container.remove();
  const addCard = () => {
    const newText = textarea.value.trim();
    if (newText) {
      const cols = loadState();
      const target = cols.find(c => c.id === columnId);
      target.cards.push(newText);
      saveState(cols);
      renderBoard(cols);
    }
    finish();
  };
  addBtn.onclick = addCard;
  cancelBtn.onclick = finish;
  textarea.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(); } };
  textarea.focus();
}

// Drag & Drop
function onMouseDown(e) {
  if (e.target.classList.contains('delete-card')) return;
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  const columnId = card.dataset.columnId;
  const cardIndex = parseInt(card.dataset.cardIndex, 10);
  const columns = loadState();
  const column = columns.find(c => c.id === columnId);
  if (!column || !column.cards[cardIndex]) return;
  drag.active = true;
  drag.startColumnId = columnId;
  drag.startCardIndex = cardIndex;
  drag.startCardText = column.cards[cardIndex];
  drag.originalCard = card;
  const rect = card.getBoundingClientRect();
  drag.offsetX = e.clientX - rect.left;
  drag.offsetY = e.clientY - rect.top;
  drag.clone = card.cloneNode(true);
  drag.clone.classList.add('drag-clone');
  drag.clone.style.width = `${rect.width}px`;
  drag.clone.style.left = `${e.clientX - drag.offsetX}px`;
  drag.clone.style.top = `${e.clientY - drag.offsetY}px`;
  document.body.appendChild(drag.clone);
  card.style.opacity = '0';
  card.style.visibility = 'hidden';
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e) {
  if (!drag.active) return;
  if (drag.clone) {
    drag.clone.style.left = `${e.clientX - drag.offsetX}px`;
    drag.clone.style.top = `${e.clientY - drag.offsetY}px`;
  }
  // Находим колонку под курсором
  let targetCol = null;
  const elem = document.elementsFromPoint(e.clientX, e.clientY);
  for (let el of elem) {
    targetCol = el.closest('.column');
    if (targetCol) break;
  }
  if (!targetCol) {
    removePlaceholder();
    drag.targetColumnId = null;
    drag.targetIndex = null;
    return;
  }
  const targetColId = targetCol.dataset.columnId;
  const cardsContainer = targetCol.querySelector('.cards-list');
  const cards = Array.from(cardsContainer.querySelectorAll('.card:not([style*="visibility: hidden"])'));
  let insertIndex = cards.length;
  for (let i = 0; i < cards.length; i++) {
    const rect = cards[i].getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      insertIndex = i;
      break;
    }
  }
  if (drag.targetColumnId === targetColId && drag.targetIndex === insertIndex) return;
  removePlaceholder();
  drag.targetColumnId = targetColId;
  drag.targetIndex = insertIndex;
  drag.placeholder = document.createElement('div');
  drag.placeholder.className = 'placeholder';
  drag.placeholder.style.height = '70px';
  if (insertIndex >= cardsContainer.children.length) {
    cardsContainer.appendChild(drag.placeholder);
  } else {
    cardsContainer.insertBefore(drag.placeholder, cardsContainer.children[insertIndex]);
  }
}

function removePlaceholder() {
  if (drag.placeholder && drag.placeholder.parentNode) drag.placeholder.remove();
  drag.placeholder = null;
}

function onMouseUp() {
  if (!drag.active) { cleanupDrag(); return; }
  // Восстанавливаем оригинал
  if (drag.originalCard) {
    drag.originalCard.style.opacity = '';
    drag.originalCard.style.visibility = '';
  }
  // Перемещение
  if (drag.targetColumnId && drag.targetIndex !== null && drag.startColumnId && drag.startCardText) {
    let cols = loadState();
    const fromCol = cols.find(c => c.id === drag.startColumnId);
    const fromIdx = fromCol.cards.indexOf(drag.startCardText);
    if (fromIdx !== -1) fromCol.cards.splice(fromIdx, 1);
    const toCol = cols.find(c => c.id === drag.targetColumnId);
    let finalIndex = drag.targetIndex;
    if (drag.startColumnId === drag.targetColumnId && fromIdx < drag.targetIndex) finalIndex--;
    finalIndex = Math.min(finalIndex, toCol.cards.length);
    toCol.cards.splice(finalIndex, 0, drag.startCardText);
    saveState(cols);
    renderBoard(cols);
  } else {
    renderBoard(loadState());
  }
  cleanupDrag();
}

function cleanupDrag() {
  if (drag.clone) drag.clone.remove();
  removePlaceholder();
  drag.active = false;
  drag.startColumnId = null;
  drag.startCardIndex = null;
  drag.startCardText = null;
  drag.targetColumnId = null;
  drag.targetIndex = null;
  drag.clone = null;
  drag.originalCard = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

// Старт
renderBoard(loadState());