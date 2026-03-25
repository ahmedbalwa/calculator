const display = document.getElementById('display');
const buttons = document.querySelectorAll('.btn');
const equals = document.getElementById('equals');
const clear = document.getElementById('clear');
const historyList = document.getElementById('history');
const modeToggle = document.getElementById('modeToggle');
const degRadToggle = document.getElementById('degRadToggle');
const memoryIndicator = document.getElementById('memoryIndicator');

let expression = '';
let memory = 0;
let isScientificMode = false;
let isDegrees = false;
let history = JSON.parse(localStorage.getItem('calcHistory')) || [];

// Show history
function showHistory() {
  historyList.innerHTML = '';
  history.slice(-10).forEach(item => { // Last 10 only
    const li = document.createElement('li');
    li.textContent = item;
    historyList.appendChild(li);
  });
}
showHistory();

// Toggle scientific mode
function toggleMode() {
  isScientificMode = !isScientificMode;
  document.querySelector('.sci-buttons').style.display = isScientificMode ? 'grid' : 'none';
  document.querySelector('.mem-buttons').style.display = isScientificMode ? 'grid' : 'none';
  modeToggle.textContent = isScientificMode ? 'Basic' : 'Sci';
}

// Toggle deg/rad
function toggleDegRad() {
  isDegrees = !isDegrees;
  degRadToggle.textContent = isDegrees ? 'Deg' : 'Rad';
}

// Update memory indicator
function updateMemoryIndicator() {
  memoryIndicator.textContent = memory !== 0 ? `M=${memory.toFixed(4)}` : '';
}

// Custom parser using Reverse Polish Notation (shunting-yard)
function parseAndEvaluate(expr) {
  const pi = Math.PI;
  const e = Math.E;
  const tokens = tokenize(expr);
  const output = [];
  const operators = [];

  function precedence(op) {
    return { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 }[op] || 0;
  }

  function applyOp() {
    const b = output.pop();
    const a = output.pop();
    const op = operators.pop();
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/': return b !== 0 ? a / b : NaN;
      case '%': return a % b;
      case '^': return Math.pow(a, b);
      default: return NaN;
    }
  }

  for (let token of tokens) {
    if (!isNaN(token) || token === 'π' || token === 'e') {
      output.push(token === 'π' ? pi : token === 'e' ? e : parseFloat(token));
    } else if (['sin', 'cos', 'tan', 'log', 'sqrt'].includes(token)) {
      operators.push(token);
    } else if ('+-*/%^()'.includes(token)) {
      while (operators.length && '()'.includes(operators[operators.length - 1]) === false &&
             precedence(operators[operators.length - 1]) >= precedence(token)) {
        output.push(applyOp());
      }
      if (token === ')') {
        while (operators[operators.length - 1] !== '(') {
          output.push(applyOp());
        }
        operators.pop(); // pop (
        if (operators.length && ['sin', 'cos', 'tan', 'log', 'sqrt'].includes(operators[operators.length - 1])) {
          const arg = output.pop();
          const fn = operators.pop();
          output.push(fn === 'sin' ? Math.sin(arg) : fn === 'cos' ? Math.cos(arg) :
                      fn === 'tan' ? Math.tan(arg) : fn === 'log' ? Math.log10(arg) :
                      fn === 'sqrt' ? Math.sqrt(arg) : NaN);
        }
      } else {
        operators.push(token);
      }
    }
  }
  while (operators.length) {
    output.push(applyOp());
  }
  const result = output.pop();
  return isNaN(result) ? 'Error' : Number(result.toFixed(10));
}

function tokenize(expr) {
  return expr.match(/sin|cos|tan|log|sqrt|\d+\.?\d*|\.\d+|π|e|[+\-*/%^()]/g) || [];
}

// Calculate
function calculate() {
  if (!expression) return;
  try {
    const result = parseAndEvaluate(expression);
    const record = expression + ' = ' + result;
    history.unshift(record);
    localStorage.setItem('calcHistory', JSON.stringify(history));
    showHistory();
    display.value = result;
    expression = result.toString();
  } catch {
    display.value = 'Error';
    expression = '';
  }
}

// Validate input
function isValidAppend(char) {
  const last = expression.slice(-1);
  if ('0123456789.'.includes(char)) {
    if (char === '.' && last === '.') return false;
    return true;
  }
  if ('+-*/%^()'.includes(char)) {
    if ('+-*/%^'.includes(last) && !')'.includes(last)) return false;
    return true;
  }
  return false;
}

// Button events
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const val = btn.textContent;
    if (isValidAppend(val)) {
      expression += val;
      display.value = expression;
    }
  });
});

equals.addEventListener('click', calculate);
clear.addEventListener('click', () => { expression = ''; display.value = ''; });
if (modeToggle) modeToggle.addEventListener('click', toggleMode);
if (degRadToggle) degRadToggle.addEventListener('click', toggleDegRad);

// Reset everything
function resetAll() {
  expression = '';
  display.value = '';
  memory = 0;
  history = [];
  localStorage.removeItem('calcHistory');
  showHistory();
  updateMemoryIndicator();
  isScientificMode = false;
  document.querySelector('.sci-buttons').style.display = 'none';
  document.querySelector('.mem-buttons').style.display = 'none';
  modeToggle.textContent = 'Sci';
  isDegrees = false;
  degRadToggle.style.display = 'none';
}
document.getElementById('reset').addEventListener('click', resetAll);

// Memory buttons (example)
document.addEventListener('click', (e) => {
  if (e.target.id === 'plusMem') { memory += parseFloat(expression || display.value) || 0; updateMemoryIndicator(); }
  if (e.target.id === 'minusMem') { memory -= parseFloat(expression || display.value) || 0; updateMemoryIndicator(); }
  if (e.target.id === 'recallMem') { expression = memory.toString(); display.value = expression; }
  if (e.target.id === 'clearMem') { memory = 0; updateMemoryIndicator(); }
  if (e.target.id === 'toggleSign') { expression = expression ? (-parseFloat(expression)).toString() : '-'; display.value = expression; }
  if (e.target.id === 'percent') { expression = (parseFloat(expression || 0) / 100).toString(); display.value = expression; }
  if (e.target.id === 'oneOverX') { const x = parseFloat(expression); expression = x ? (1/x).toString() : 'Error'; display.value = expression; }
});

// Keyboard support
document.addEventListener('keydown', (e) => {
  if ('0123456789+-*/%^().'.includes(e.key)) {
    if (isValidAppend(e.key)) {
      expression += e.key;
      display.value = expression;
    }
  } else if (e.key === 'Enter') calculate();
  else if (e.key === 'Escape') { expression = ''; display.value = ''; }
  else if (e.key === 'Backspace') { expression = expression.slice(0, -1); display.value = expression; }
  // Sci shortcuts: s=sin, c=cos etc.
  else if (e.key === 's') { expression += 'sin('; display.value = expression; }
  // Add more as needed
});

updateMemoryIndicator();
