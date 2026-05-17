const PIECES = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

const FILES = "abcdefgh";
const RANKS = "12345678";

const PIECE_VALUES = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
const CAPTURE_SORT_ORDER = { Q: 0, R: 1, B: 2, N: 3, P: 4 };

function initialBoard() {
  return [
    ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
    ["bP", "bP", "bP", "bP", "bP", "bP", "bP", "bP"],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    [null, null, null, null, null, null, null, null],
    ["wP", "wP", "wP", "wP", "wP", "wP", "wP", "wP"],
    ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"],
  ];
}

function colorOf(piece) {
  if (!piece) return null;
  return piece[0] === "w" ? "white" : "black";
}

function typeOf(piece) {
  return piece ? piece[1] : null;
}

function pieceValue(piece) {
  return PIECE_VALUES[typeOf(piece)] ?? 0;
}

function getCapturedPiece(board, move) {
  if (move.enPassant) {
    const mover = board[move.from.rank][move.from.file];
    const capturedRank =
      colorOf(mover) === "white" ? move.to.rank + 1 : move.to.rank - 1;
    return board[capturedRank][move.to.file];
  }
  return board[move.to.rank][move.to.file];
}

function sortCaptured(pieces) {
  return [...pieces].sort(
    (a, b) => CAPTURE_SORT_ORDER[typeOf(a)] - CAPTURE_SORT_ORDER[typeOf(b)]
  );
}

function calcMaterial(capturedByWhite, capturedByBlack) {
  const whiteGain = capturedByWhite.reduce((sum, p) => sum + pieceValue(p), 0);
  const blackGain = capturedByBlack.reduce((sum, p) => sum + pieceValue(p), 0);
  const diff = whiteGain - blackGain;
  return { whiteGain, blackGain, diff };
}

function cloneBoard(board) {
  return board.map((row) => row.slice());
}

function squareToCoord(file, rank) {
  return { file, rank };
}

function inBounds(file, rank) {
  return file >= 0 && file < 8 && rank >= 0 && rank < 8;
}

function findKing(board, color) {
  const king = color === "white" ? "wK" : "bK";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      if (board[r][f] === king) return { file: f, rank: r };
    }
  }
  return null;
}

function isSquareAttacked(board, file, rank, attackerColor, enPassantTarget) {
  const pawn = attackerColor === "white" ? "wP" : "bP";
  const pawnFromRank = attackerColor === "white" ? rank + 1 : rank - 1;

  for (const df of [-1, 1]) {
    const pf = file + df;
    if (inBounds(pf, pawnFromRank) && board[pawnFromRank][pf] === pawn) return true;
  }

  if (enPassantTarget && enPassantTarget.file === file && enPassantTarget.rank === rank) {
    for (const df of [-1, 1]) {
      const pf = file + df;
      if (inBounds(pf, pawnFromRank) && board[pawnFromRank][pf] === pawn) return true;
    }
  }

  const knightOffsets = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1],
  ];
  const knight = attackerColor === "white" ? "wN" : "bN";
  for (const [df, dr] of knightOffsets) {
    const nf = file + df;
    const nr = rank + dr;
    if (inBounds(nf, nr) && board[nr][nf] === knight) return true;
  }

  const kingOffsets = [
    [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
  ];
  const king = attackerColor === "white" ? "wK" : "bK";
  for (const [df, dr] of kingOffsets) {
    const kf = file + df;
    const kr = rank + dr;
    if (inBounds(kf, kr) && board[kr][kf] === king) return true;
  }

  const rookDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  const bishopDirs = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const rook = attackerColor === "white" ? "wR" : "bR";
  const bishop = attackerColor === "white" ? "wB" : "bB";
  const queen = attackerColor === "white" ? "wQ" : "bQ";

  for (const [df, dr] of rookDirs) {
    let f = file + df;
    let r = rank + dr;
    while (inBounds(f, r)) {
      const p = board[r][f];
      if (p) {
        if (p === rook || p === queen) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  for (const [df, dr] of bishopDirs) {
    let f = file + df;
    let r = rank + dr;
    while (inBounds(f, r)) {
      const p = board[r][f];
      if (p) {
        if (p === bishop || p === queen) return true;
        break;
      }
      f += df;
      r += dr;
    }
  }

  return false;
}

function isInCheck(board, color, enPassantTarget) {
  const king = findKing(board, color);
  if (!king) return false;
  const attacker = color === "white" ? "black" : "white";
  return isSquareAttacked(board, king.file, king.rank, attacker, enPassantTarget);
}

function applyMove(board, move) {
  const next = cloneBoard(board);
  const piece = next[move.from.rank][move.from.file];
  next[move.from.rank][move.from.file] = null;

  if (move.enPassant) {
    next[move.from.rank][move.to.file] = null;
  }

  next[move.to.rank][move.to.file] = move.promotion
    ? (piece[0] === "w" ? "w" : "b") + move.promotion
    : piece;

  if (move.castle === "K") {
    next[move.to.rank][5] = next[move.to.rank][7];
    next[move.to.rank][7] = null;
  } else if (move.castle === "Q") {
    next[move.to.rank][3] = next[move.to.rank][0];
    next[move.to.rank][0] = null;
  }

  return next;
}

function pseudoLegalMoves(board, file, rank, state) {
  const piece = board[rank][file];
  if (!piece) return [];

  const color = colorOf(piece);
  const type = typeOf(piece);
  const moves = [];
  const ep = state.enPassantTarget;

  const add = (toFile, toRank, extra = {}) => {
    if (!inBounds(toFile, toRank)) return;
    const target = board[toRank][toFile];
    if (target && colorOf(target) === color) return;
    moves.push({
      from: { file, rank },
      to: { file: toFile, rank: toRank },
      ...extra,
    });
  };

  const slide = (dirs) => {
    for (const [df, dr] of dirs) {
      let f = file + df;
      let r = rank + dr;
      while (inBounds(f, r)) {
        const target = board[r][f];
        if (!target) {
          add(f, r);
        } else {
          if (colorOf(target) !== color) add(f, r);
          break;
        }
        f += df;
        r += dr;
      }
    }
  };

  if (type === "P") {
    const dir = color === "white" ? -1 : 1;
    const startRank = color === "white" ? 6 : 1;
    const promoRank = color === "white" ? 0 : 7;

    const oneRank = rank + dir;
    if (inBounds(file, oneRank) && !board[oneRank][file]) {
      if (oneRank === promoRank) {
        for (const promo of ["Q", "R", "B", "N"]) {
          add(file, oneRank, { promotion: promo });
        }
      } else {
        add(file, oneRank);
        if (rank === startRank) {
          const twoRank = rank + 2 * dir;
          if (!board[twoRank][file]) add(file, twoRank);
        }
      }
    }

    for (const df of [-1, 1]) {
      const cf = file + df;
      const cr = rank + dir;
      if (!inBounds(cf, cr)) continue;
      const target = board[cr][cf];
      if (target && colorOf(target) !== color) {
        if (cr === promoRank) {
          for (const promo of ["Q", "R", "B", "N"]) {
            add(cf, cr, { promotion: promo });
          }
        } else {
          add(cf, cr);
        }
      } else if (ep && ep.file === cf && ep.rank === cr) {
        add(cf, cr, { enPassant: true });
      }
    }
  } else if (type === "N") {
    for (const [df, dr] of [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ]) {
      add(file + df, rank + dr);
    }
  } else if (type === "B") {
    slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  } else if (type === "R") {
    slide([[0, 1], [0, -1], [1, 0], [-1, 0]]);
  } else if (type === "Q") {
    slide([
      [0, 1], [0, -1], [1, 0], [-1, 0],
      [1, 1], [1, -1], [-1, 1], [-1, -1],
    ]);
  } else if (type === "K") {
    for (const [df, dr] of [
      [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1],
    ]) {
      add(file + df, rank + dr);
    }

    if (color === "white" ? state.castling.white : state.castling.black) {
      const rights = color === "white" ? state.castling.white : state.castling.black;
      const homeRank = color === "white" ? 7 : 0;

      const attacker = color === "white" ? "black" : "white";
      const inCheck = isInCheck(board, color, ep);

      if (rank === homeRank && file === 4 && rights.K && !inCheck) {
        if (
          !board[homeRank][5] && !board[homeRank][6] &&
          board[homeRank][7] === (color === "white" ? "wR" : "bR") &&
          !isSquareAttacked(board, 4, homeRank, attacker, ep) &&
          !isSquareAttacked(board, 5, homeRank, attacker, ep) &&
          !isSquareAttacked(board, 6, homeRank, attacker, ep)
        ) {
          moves.push({
            from: { file, rank },
            to: { file: 6, rank: homeRank },
            castle: "K",
          });
        }
      }

      if (rank === homeRank && file === 4 && rights.Q && !inCheck) {
        if (
          !board[homeRank][1] && !board[homeRank][2] && !board[homeRank][3] &&
          board[homeRank][0] === (color === "white" ? "wR" : "bR") &&
          !isSquareAttacked(board, 4, homeRank, attacker, ep) &&
          !isSquareAttacked(board, 3, homeRank, attacker, ep) &&
          !isSquareAttacked(board, 2, homeRank, attacker, ep)
        ) {
          moves.push({
            from: { file, rank },
            to: { file: 2, rank: homeRank },
            castle: "Q",
          });
        }
      }
    }
  }

  return moves;
}

function filterLegal(board, moves, color, state) {
  return moves.filter((move) => {
    const next = applyMove(board, move);
    let ep = state.enPassantTarget;
    if (typeOf(board[move.from.rank][move.from.file]) === "P") {
      const movedTwo = Math.abs(move.to.rank - move.from.rank) === 2;
      if (movedTwo) {
        ep = {
          file: move.to.file,
          rank: (move.from.rank + move.to.rank) / 2,
        };
      } else {
        ep = null;
      }
    } else {
      ep = state.enPassantTarget;
    }
    return !isInCheck(next, color, ep);
  });
}

function allLegalMoves(board, color, state) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && colorOf(piece) === color) {
        const pseudo = pseudoLegalMoves(board, f, r, state);
        const legal = filterLegal(board, pseudo, color, state);
        moves.push(...legal);
      }
    }
  }
  return moves;
}

function computeStateAfterMove(board, move, state) {
  const piece = board[move.from.rank][move.from.file];
  const color = colorOf(piece);
  const nextBoard = applyMove(board, move);

  const castling = {
    white: { ...state.castling.white },
    black: { ...state.castling.black },
  };

  if (piece === "wK") castling.white = { K: false, Q: false };
  if (piece === "bK") castling.black = { K: false, Q: false };
  if (piece === "wR" && move.from.file === 0) castling.white.Q = false;
  if (piece === "wR" && move.from.file === 7) castling.white.K = false;
  if (piece === "bR" && move.from.file === 0) castling.black.Q = false;
  if (piece === "bR" && move.from.file === 7) castling.black.K = false;
  if (move.to.file === 0) {
    if (color === "white") castling.black.Q = false;
    else castling.white.Q = false;
  }
  if (move.to.file === 7) {
    if (color === "white") castling.black.K = false;
    else castling.white.K = false;
  }

  let enPassantTarget = null;
  if (typeOf(piece) === "P" && Math.abs(move.to.rank - move.from.rank) === 2) {
    enPassantTarget = {
      file: move.to.file,
      rank: (move.from.rank + move.to.rank) / 2,
    };
  }

  const halfmove =
    typeOf(piece) === "P" || board[move.to.rank][move.to.file]
      ? 0
      : state.halfmoveClock + 1;

  const captured = getCapturedPiece(board, move);
  const capturedByWhite = [...(state.capturedByWhite || [])];
  const capturedByBlack = [...(state.capturedByBlack || [])];
  if (captured) {
    if (color === "white") capturedByWhite.push(captured);
    else capturedByBlack.push(captured);
  }

  return {
    board: nextBoard,
    turn: color === "white" ? "black" : "white",
    castling,
    enPassantTarget,
    halfmoveClock: halfmove,
    fullmoveNumber: color === "black" ? state.fullmoveNumber + 1 : state.fullmoveNumber,
    lastMove: move,
    capturedByWhite,
    capturedByBlack,
  };
}

function initialState() {
  return {
    board: initialBoard(),
    turn: "white",
    castling: {
      white: { K: true, Q: true },
      black: { K: true, Q: true },
    },
    enPassantTarget: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    lastMove: null,
    gameOver: null,
    capturedByWhite: [],
    capturedByBlack: [],
  };
}

function moveToAlgebraic(move, board, state) {
  const piece = board[move.from.rank][move.from.file];
  const type = typeOf(piece);
  const capture = board[move.to.rank][move.to.file] || move.enPassant;

  if (move.castle === "K") return "O-O";
  if (move.castle === "Q") return "O-O-O";

  let notation = "";
  if (type !== "P") {
    notation = type;
    if (type === "N" || type === "B" || type === "R" || type === "Q") {
      notation += FILES[move.from.file];
    }
  } else if (capture) {
    notation = FILES[move.from.file] + "x";
  }

  if (type !== "P" && capture) notation += "x";
  notation += FILES[move.to.file] + RANKS[7 - move.to.rank];
  if (move.promotion) notation += "=" + move.promotion;

  const next = computeStateAfterMove(board, move, state);
  if (isInCheck(next.board, next.turn, next.enPassantTarget)) {
    const replies = allLegalMoves(next.board, next.turn, next);
    notation += replies.length === 0 ? "#" : "+";
  }

  return notation;
}

class ChessGame {
  constructor() {
    this.history = [];
    this.reset();
    this.selected = null;
    this.legalTargets = [];
    this.flipped = false;
    this.pendingPromotion = null;
  }

  reset() {
    this.state = initialState();
    this.history = [];
    this.selected = null;
    this.legalTargets = [];
    this.pendingPromotion = null;
    this.updateGameOver();
  }

  currentState() {
    return this.history.length
      ? this.history[this.history.length - 1]
      : this.state;
  }

  updateGameOver() {
    const s = this.currentState();
    const moves = allLegalMoves(s.board, s.turn, s);
    const inCheck = isInCheck(s.board, s.turn, s.enPassantTarget);

    if (moves.length === 0) {
      s.gameOver = inCheck ? "checkmate" : "stalemate";
    } else {
      s.gameOver = null;
    }
  }

  getLegalMovesFor(file, rank) {
    const s = this.currentState();
    const piece = s.board[rank][file];
    if (!piece || colorOf(piece) !== s.turn) return [];
    const pseudo = pseudoLegalMoves(s.board, file, rank, s);
    return filterLegal(s.board, pseudo, s.turn, s);
  }

  select(file, rank) {
    const s = this.currentState();
    if (s.gameOver || this.pendingPromotion) return;

    const moves = this.getLegalMovesFor(file, rank);
    if (moves.length > 0) {
      this.selected = { file, rank };
      this.legalTargets = moves;
      return;
    }

    this.clearSelection();
  }

  clearSelection() {
    this.selected = null;
    this.legalTargets = [];
  }

  tryMove(toFile, toRank) {
    const s = this.currentState();
    if (s.gameOver || this.pendingPromotion) return false;

    const candidates = this.legalTargets.filter(
      (m) => m.to.file === toFile && m.to.rank === toRank
    );

    if (candidates.length === 0) {
      const piece = s.board[toRank][toFile];
      if (piece && colorOf(piece) === s.turn) {
        this.select(toFile, toRank);
      } else {
        this.clearSelection();
      }
      return false;
    }

    const promoMoves = candidates.filter((m) => m.promotion);
    if (promoMoves.length > 0) {
      this.pendingPromotion = { from: promoMoves[0].from, to: promoMoves[0].to };
      return "promotion";
    }

    this.commitMove(candidates[0]);
    return true;
  }

  promote(pieceType) {
    if (!this.pendingPromotion) return;
    const move = {
      from: this.pendingPromotion.from,
      to: this.pendingPromotion.to,
      promotion: pieceType,
    };
    this.pendingPromotion = null;
    this.commitMove(move);
  }

  commitMove(move) {
    const s = this.currentState();
    const notation = moveToAlgebraic(move, s.board, s);
    const next = computeStateAfterMove(s.board, move, s);
    next.gameOver = null;

    this.history.push({
      ...next,
      notation,
      gameOver: null,
    });

    this.state = this.history[this.history.length - 1];
    this.updateGameOver();
    this.clearSelection();
  }

  undo() {
    if (this.history.length === 0) return;
    this.history.pop();
    if (this.history.length === 0) {
      this.state = initialState();
    } else {
      this.state = this.history[this.history.length - 1];
    }
    this.clearSelection();
    this.pendingPromotion = null;
    this.updateGameOver();
  }
}

const game = new ChessGame();

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const moveListEl = document.getElementById("move-list");
const promotionModal = document.getElementById("promotion-modal");
const promotionChoices = document.getElementById("promotion-choices");
const capturedTopPiecesEl = document.getElementById("captured-top-pieces");
const capturedBottomPiecesEl = document.getElementById("captured-bottom-pieces");
const materialTopEl = document.getElementById("material-top");
const materialBottomEl = document.getElementById("material-bottom");
const materialSummaryEl = document.getElementById("material-summary");

// White's view: rank 8 at top, rank 1 at bottom, a-file on the left.
function displayRank(row) {
  return game.flipped ? 7 - row : row;
}

function displayFile(col) {
  return game.flipped ? 7 - col : col;
}

function renderBoard() {
  const s = game.currentState();
  boardEl.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const rank = displayRank(row);
      const file = displayFile(col);
      const isLight = row % 2 !== col % 2;
      const square = document.createElement("button");
      square.type = "button";
      square.className = `square ${isLight ? "light" : "dark"}`;
      square.dataset.file = file;
      square.dataset.rank = rank;

      if (
        game.selected &&
        game.selected.file === file &&
        game.selected.rank === rank
      ) {
        square.classList.add("selected");
      }

      const isLegal = game.legalTargets.some(
        (m) => m.to.file === file && m.to.rank === rank
      );
      if (isLegal) {
        square.classList.add("highlight");
        const target = s.board[rank][file];
        if (target || game.legalTargets.find(
          (m) => m.to.file === file && m.to.rank === rank && m.enPassant
        )) {
          square.classList.add("capture");
        }
      }

      if (s.lastMove) {
        const { from, to } = s.lastMove;
        if (
          (from.file === file && from.rank === rank) ||
          (to.file === file && to.rank === rank)
        ) {
          square.classList.add("last-move");
        }
      }

      const king = findKing(s.board, s.turn);
      if (
        king &&
        king.file === file &&
        king.rank === rank &&
        isInCheck(s.board, s.turn, s.enPassantTarget)
      ) {
        square.classList.add("in-check");
      }

      const piece = s.board[rank][file];
      if (piece) {
        const span = document.createElement("span");
        span.className = `piece ${colorOf(piece)}`;
        span.textContent = PIECES[piece];
        span.setAttribute("aria-label", `${colorOf(piece)} ${typeOf(piece)}`);
        square.appendChild(span);
      }

      if (col === 0) {
        const rankLabel = document.createElement("span");
        rankLabel.className = "coord rank";
        rankLabel.textContent = RANKS[7 - rank];
        square.appendChild(rankLabel);
      }
      if (row === 7) {
        const fileLabel = document.createElement("span");
        fileLabel.className = "coord file";
        fileLabel.textContent = FILES[file];
        square.appendChild(fileLabel);
      }

      square.addEventListener("click", () => onSquareClick(file, rank));
      boardEl.appendChild(square);
    }
  }
}

function renderStatus() {
  const s = game.currentState();
  statusEl.className = "status";

  if (s.gameOver === "checkmate") {
    const winner = s.turn === "white" ? "Black" : "White";
    statusEl.textContent = `Checkmate — ${winner} wins`;
    statusEl.classList.add("game-over");
    return;
  }
  if (s.gameOver === "stalemate") {
    statusEl.textContent = "Stalemate — draw";
    statusEl.classList.add("game-over");
    return;
  }

  const inCheck = isInCheck(s.board, s.turn, s.enPassantTarget);
  const turnLabel = s.turn === "white" ? "White" : "Black";
  statusEl.textContent = inCheck ? `${turnLabel} to move — Check!` : `${turnLabel} to move`;
  if (inCheck) statusEl.classList.add("check");
}

function renderCapturedPieces(container, pieces) {
  container.innerHTML = "";
  for (const piece of sortCaptured(pieces)) {
    const span = document.createElement("span");
    span.className = `captured-piece ${colorOf(piece)}`;
    span.textContent = PIECES[piece];
    span.title = typeOf(piece);
    container.appendChild(span);
  }
}

function renderMaterialAdvantage(el, points) {
  if (points > 0) {
    el.textContent = `+${points}`;
    el.hidden = false;
  } else {
    el.textContent = "";
    el.hidden = true;
  }
}

function renderCaptured() {
  const s = game.currentState();
  const { whiteGain, blackGain, diff } = calcMaterial(
    s.capturedByWhite || [],
    s.capturedByBlack || []
  );

  const topPieces = game.flipped ? s.capturedByWhite : s.capturedByBlack;
  const bottomPieces = game.flipped ? s.capturedByBlack : s.capturedByWhite;

  renderCapturedPieces(capturedTopPiecesEl, topPieces);
  renderCapturedPieces(capturedBottomPiecesEl, bottomPieces);

  const topAdvantage = game.flipped ? Math.max(diff, 0) : Math.max(-diff, 0);
  const bottomAdvantage = game.flipped ? Math.max(-diff, 0) : Math.max(diff, 0);

  renderMaterialAdvantage(materialTopEl, topAdvantage);
  renderMaterialAdvantage(materialBottomEl, bottomAdvantage);

  if (diff === 0) {
    materialSummaryEl.textContent = "Material: even";
  } else if (diff > 0) {
    materialSummaryEl.textContent = `White leads by +${diff} (${whiteGain} vs ${blackGain} captured)`;
  } else {
    materialSummaryEl.textContent = `Black leads by +${-diff} (${blackGain} vs ${whiteGain} captured)`;
  }
}

function renderMoveList() {
  moveListEl.innerHTML = "";
  const entries = [];

  for (let i = 0; i < game.history.length; i++) {
    const { notation } = game.history[i];
    const moveNum = Math.floor(i / 2) + 1;
    if (i % 2 === 0) {
      entries.push({ num: moveNum, white: notation, black: null });
    } else {
      entries[entries.length - 1].black = notation;
    }
  }

  for (const entry of entries) {
    const li = document.createElement("li");
    li.textContent = entry.black
      ? `${entry.num}. ${entry.white} ${entry.black}`
      : `${entry.num}. ${entry.white}`;
    moveListEl.appendChild(li);
  }

  moveListEl.scrollTop = moveListEl.scrollHeight;
}

function showPromotionModal() {
  const s = game.currentState();
  const color = s.turn;
  const prefix = color === "white" ? "w" : "b";
  promotionChoices.innerHTML = "";

  for (const type of ["Q", "R", "B", "N"]) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `piece-${color}`;
    btn.textContent = PIECES[prefix + type];
    btn.addEventListener("click", () => {
      promotionModal.classList.add("hidden");
      game.promote(type);
      render();
    });
    promotionChoices.appendChild(btn);
  }

  promotionModal.classList.remove("hidden");
}

function onSquareClick(file, rank) {
  if (game.selected) {
    const result = game.tryMove(file, rank);
    if (result === "promotion") {
      showPromotionModal();
      renderBoard();
      return;
    }
  } else {
    game.select(file, rank);
  }
  render();
}

function render() {
  renderBoard();
  renderCaptured();
  renderStatus();
  renderMoveList();
  document.getElementById("undo").disabled = game.history.length === 0;
}

document.getElementById("new-game").addEventListener("click", () => {
  promotionModal.classList.add("hidden");
  game.reset();
  render();
});

document.getElementById("flip-board").addEventListener("click", () => {
  game.flipped = !game.flipped;
  render();
});

document.getElementById("undo").addEventListener("click", () => {
  promotionModal.classList.add("hidden");
  game.undo();
  render();
});

render();
