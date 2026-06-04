import './styles.css';

// -------------------- Генератор уникальных ID --------------------
function generateCardId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

const DEFAULT_COLUMNS = [
  {
    id: 'todo',
    title: 'TODO',
    cards: [
      { id: generateCardId(), text: 'Welcome to Trello!' },
      { id: generateCardId(), text: 'This is a card.' },
      { id: generateCardId(), text: 'Click on a card to see what\'s behind it.' },
      { id: generateCardId(), text: 'You can attach pictures and files...' }
    ]
  },
  {
    id: 'in-progress',
    title: 'IN PROGRESS',
    cards: [
      { id: generateCardId(), text: 'Drag people onto a card to indicate that they\'re responsible for it.' },
      { id: generateCardId(), text: 'Use color-coded labels for organization' },
      { id: generateCardId(), text: 'Make as many lists as you need!' },
      { id: generateCardId(), text: 'Finished with a card? Archive it.' },
      { id: generateCardId(), text: 'Try dragging cards anywhere.' }
    ]
  },
  {
    id: 'done',
    title: 'DONE',
    cards: [
      { id: generateCardId(), text: 'To learn more tricks, check out the guide.' },
      { id: generateCardId(), text: 'Use as many boards as you want. We\'ll make more!' },
      { id: generateCardId(), text: 'Want to use keyboard shortcuts? We have them!' },
      { id: generateCardId(), text: 'Want updates on new features?' }
    ]
  }
];

function migrateOldData(saved) {
  if (Array.isArray(saved) && saved.length > 0 && saved[0].cards && typeof saved[0].cards[0] === 'string') {
    console.log('Migrating old data format...');
    return saved.map(column => ({
      ...column,
      cards: column.cards.map(text => ({ id: generateCardId(), text }))
    }));
  }
  return saved;
}

function loadState() {
  const saved = localStorage.getItem('trello-board');
  if (!saved) {
    saveState(DEFAULT_COLUMNS);
    return JSON.parse(JSON.stringify(DEFAULT_COLUMNS));
  }
  const parsed = JSON.parse(saved);
  const migrated = migrateOldData(parsed);
  const withIds = migrated.map(column => ({
    ...column,
    cards: column.cards.map(card => {
      if (typeof card === 'string') {
        return { id: generateCardId(), text: card };
      }
      if (!card.id) {
        return { ...card, id: generateCardId() };
      }
      return card;
    })
  }));
  return withIds;
}

function saveState(columns) { 
  localStorage.setItem('trello-board', JSON.stringify(columns)); 
}

let drag = {
  active: false,
  startColumnId: null,
  startCardId: null,
  startCardText: null,
  clone: null,
  placeholder: null,
  targetColumnId: null,
  targetIndex: null,
  offsetX: 0, offsetY: 0,
  originalCard: null
};

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
    column.cards.forEach((card, idx) => {
      const cardElem = createCard(card, column.id, idx);
      cardsContainer.appendChild(cardElem);
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

function createCard(card, columnId, index) {
  const cardDiv = document.createElement('div');
  cardDiv.className = 'card';
  cardDiv.textContent = card.text;
  cardDiv.dataset.cardId = card.id;
  cardDiv.dataset.columnId = columnId;
  cardDiv.dataset.cardIndex = index;
  
  const del = document.createElement('span');
  del.textContent = '✖';
  del.className = 'delete-card';
  del.onclick = (e) => {
    e.stopPropagation();
    const cols = loadState();
    const col = cols.find(c => c.id === columnId);
    if (col) {
      const cardIndex = col.cards.findIndex(c => c.id === card.id);
      if (cardIndex !== -1) col.cards.splice(cardIndex, 1);
      saveState(cols);
      renderBoard(cols);
    }
  };
  cardDiv.appendChild(del);
  cardDiv.addEventListener('mousedown', onMouseDown);
  return cardDiv;
}

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
      if (target) {
        const newCard = { id: generateCardId(), text: newText };
        target.cards.push(newCard);
        saveState(cols);
        renderBoard(cols);
      }
    }
    finish();
  };
  addBtn.onclick = addCard;
  cancelBtn.onclick = finish;
  textarea.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addCard(); } };
  textarea.focus();
}

function onMouseDown(e) {
  if (e.target.classList.contains('delete-card')) return;
  const card = e.target.closest('.card');
  if (!card) return;
  e.preventDefault();
  
  const cardId = card.dataset.cardId;
  const columnId = card.dataset.columnId;
  const columns = loadState();
  const column = columns.find(c => c.id === columnId);
  if (!column) return;
  const cardObj = column.cards.find(c => c.id === cardId);
  if (!cardObj) return;
  
  drag.active = true;
  drag.startColumnId = columnId;
  drag.startCardId = cardId;
  drag.startCardText = cardObj.text;
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
  
  if (drag.originalCard) {
    drag.originalCard.style.opacity = '';
    drag.originalCard.style.visibility = '';
  }
  
  if (drag.targetColumnId && drag.targetIndex !== null && drag.startCardId) {
    let cols = loadState();
    const fromCol = cols.find(c => c.id === drag.startColumnId);
    if (!fromCol) {
      cleanupDrag();
      renderBoard(loadState());
      return;
    }
    const fromIndex = fromCol.cards.findIndex(c => c.id === drag.startCardId);
    if (fromIndex === -1) {
      cleanupDrag();
      renderBoard(loadState());
      return;
    }
    const [movedCard] = fromCol.cards.splice(fromIndex, 1);
    const toCol = cols.find(c => c.id === drag.targetColumnId);
    if (!toCol) {
      cleanupDrag();
      renderBoard(loadState());
      return;
    }
    let finalIndex = drag.targetIndex;
    if (drag.startColumnId === drag.targetColumnId && fromIndex < drag.targetIndex) finalIndex--;
    finalIndex = Math.min(finalIndex, toCol.cards.length);
    toCol.cards.splice(finalIndex, 0, movedCard);
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
  drag.startCardId = null;
  drag.startCardText = null;
  drag.targetColumnId = null;
  drag.targetIndex = null;
  drag.clone = null;
  drag.originalCard = null;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
}

renderBoard(loadState());
