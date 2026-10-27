/**
 * Componente que gestiona la cuadrícula interactiva de 3x2 de la portería.
 */
class GoalGrid {
  constructor(containerElement, onCellSelect) {
    this.container = containerElement;
    this.onCellSelect = onCellSelect;
    this.selectedCell = null;
    this.currentRole = 'shooter'; // 'shooter' | 'keeper'
    this.interactive = false;
    this.cells = [];

    this.cellLabels = [
      ['Escuadra Izq.', 'Arriba Centro', 'Escuadra Dcha.'],
      ['Raso Izquierda', 'Raso Centro', 'Raso Derecha']
    ];

    this.init();
  }

  init() {
    this.container.innerHTML = '';
    this.cells = [];

    for (let r = 0; r < 2; r++) {
      this.cells[r] = [];
      for (let c = 0; c < 3; c++) {
        const cell = document.createElement('div');
        cell.className = 'goal-cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('role', 'button');
        cell.setAttribute('tabindex', '0');
        cell.setAttribute('aria-label', `Zona ${this.cellLabels[r][c]}`);

        cell.innerHTML = `
          <div class="cell-inner">
            <div class="cell-marker"></div>
          </div>
        `;

        cell.addEventListener('click', () => this.handleCellClick(r, c));
        cell.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.handleCellClick(r, c);
          }
        });

        this.container.appendChild(cell);
        this.cells[r][c] = cell;
      }
    }
  }

  handleCellClick(row, col) {
    if (!this.interactive) return;

    this.selectCell(row, col);
    if (window.soundEngine) {
      window.soundEngine.playSelect();
    }
    if (typeof this.onCellSelect === 'function') {
      this.onCellSelect(row, col);
    }
  }

  selectCell(row, col) {
    this.clearSelection();
    this.selectedCell = { row, col };
    const cell = this.cells[row][col];
    if (cell) {
      cell.classList.add('selected');
      cell.classList.add(this.currentRole === 'shooter' ? 'as-shooter' : 'as-keeper');
    }
  }

  clearSelection() {
    this.selectedCell = null;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        this.cells[r][c].classList.remove('selected', 'as-shooter', 'as-keeper', 'revealed-ball', 'revealed-gloves', 'cell-goal', 'cell-saved');
      }
    }
  }

  enable(role = 'shooter') {
    this.interactive = true;
    this.currentRole = role;
    this.container.classList.remove('disabled');
    this.container.classList.add('interactive');
    this.container.dataset.role = role;
  }

  disable() {
    this.interactive = false;
    this.container.classList.add('disabled');
    this.container.classList.remove('interactive');
  }

  getCellElement(row, col) {
    if (this.cells[row] && this.cells[row][col]) {
      return this.cells[row][col];
    }
    return null;
  }

  getCellCoordinates(row, col) {
    const cell = this.getCellElement(row, col);
    if (!cell) return null;
    const rect = cell.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top + rect.height / 2 - containerRect.top,
      width: rect.width,
      height: rect.height,
      rect
    };
  }

  revealResolution(shooterCoords, keeperCoords, isGoal) {
    // Destacar las casillas tras la animación
    const shooterCell = this.getCellElement(shooterCoords.row, shooterCoords.col);
    const keeperCell = this.getCellElement(keeperCoords.row, keeperCoords.col);

    if (shooterCell) {
      shooterCell.classList.add('revealed-ball');
      shooterCell.classList.add(isGoal ? 'cell-goal' : 'cell-saved');
    }

    if (keeperCell) {
      keeperCell.classList.add('revealed-gloves');
      if (!isGoal) {
        keeperCell.classList.add('cell-saved');
      }
    }
  }
}

window.GoalGrid = GoalGrid;
