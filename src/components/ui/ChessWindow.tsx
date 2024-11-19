"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X, Minus, Maximize2 } from "lucide-react";

interface ChessWindowProps {
  onClose: () => void;
  isMobile: boolean;
}

type Piece = '♟' | '♙' | '♜' | '♖' | '♞' | '♘' | '♝' | '♗' | '♛' | '♕' | '♚' | '♔' | null;
type Position = { row: number; col: number };
type GameMode = 'human' | 'ai' | null;
type PlayerColor = 'white' | 'black' | null;
type DialogType = 'setup' | 'endgame' | null;
type Difficulty = 'easy' | 'hard' | null;

const isWhitePiece = (piece: Piece) => piece && '♙♖♘♗♕♔'.includes(piece);
const isBlackPiece = (piece: Piece) => piece && '♟♜♞♝♛♚'.includes(piece);
const isPawn = (piece: Piece) => piece === '♟' || piece === '♙';
const isRook = (piece: Piece) => piece === '♜' || piece === '♖';
const isKnight = (piece: Piece) => piece === '♞' || piece === '♘';
const isBishop = (piece: Piece) => piece === '♝' || piece === '♗';
const isQueen = (piece: Piece) => piece === '♛' || piece === '♕';
const isKing = (piece: Piece) => piece === '♚' || piece === '♔';

const evaluatePiece = (piece: Piece): number => {
  if (!piece) return 0;
  const values = {
    '♟': -1, '♙': 1,     // pawns
    '♜': -5, '♖': 5,     // rooks
    '♞': -3, '♘': 3,     // knights
    '♝': -3, '♗': 3,     // bishops
    '♛': -9, '♕': 9,     // queens
    '♚': -100, '♔': 100, // kings
  } as const;
  return values[piece as keyof typeof values];
};

const isValidMove = (from: Position, to: Position, piece: Piece, board: (Piece)[][]): boolean => {
  const dx = to.col - from.col;
  const dy = to.row - from.row;
  const isWhite = isWhitePiece(piece);

  // Check if destination has friendly piece
  if (board[to.row][to.col]) {
    const destIsWhite = isWhitePiece(board[to.row][to.col]);
    if (isWhite === destIsWhite) return false;
  }

  // Pawn movement
  if (isPawn(piece)) {
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;

    // Regular move
    if (dx === 0 && dy === direction && !board[to.row][to.col]) {
      return true;
    }
    // Initial double move
    if (dx === 0 && dy === 2 * direction && from.row === startRow && !board[to.row][to.col] && !board[from.row + direction][from.col]) {
      return true;
    }
    // Capture
    if (Math.abs(dx) === 1 && dy === direction && board[to.row][to.col]) {
      return true;
    }
    return false;
  }

  // Rook movement
  if (isRook(piece)) {
    if (dx !== 0 && dy !== 0) return false;
    return !hasObstaclesBetween(from, to, board);
  }

  // Knight movement
  if (isKnight(piece)) {
    return (Math.abs(dx) === 2 && Math.abs(dy) === 1) || (Math.abs(dx) === 1 && Math.abs(dy) === 2);
  }

  // Bishop movement
  if (isBishop(piece)) {
    if (Math.abs(dx) !== Math.abs(dy)) return false;
    return !hasObstaclesBetween(from, to, board);
  }

  // Queen movement
  if (isQueen(piece)) {
    if ((dx !== 0 && dy !== 0) && (Math.abs(dx) !== Math.abs(dy))) return false;
    return !hasObstaclesBetween(from, to, board);
  }

  // King movement
  if (isKing(piece)) {
    return Math.abs(dx) <= 1 && Math.abs(dy) <= 1;
  }

  return false;
};

const hasObstaclesBetween = (from: Position, to: Position, board: (Piece)[][]): boolean => {
  const dx = Math.sign(to.col - from.col);
  const dy = Math.sign(to.row - from.row);
  let x = from.col + dx;
  let y = from.row + dy;

  while (x !== to.col || y !== to.row) {
    if (board[y][x]) return true;
    x += dx;
    y += dy;
  }
  return false;
};

const isInCheck = (board: (Piece)[][], isWhiteKing: boolean): boolean => {
  // Find king position
  let kingPos: Position | null = null;
  const kingPiece = isWhiteKing ? '♔' : '♚';
  
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if (board[row][col] === kingPiece) {
        kingPos = { row, col };
        break;
      }
    }
    if (kingPos) break;
  }

  if (!kingPos) return false;

  // Check if any opponent piece can capture the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && isWhiteKing !== isWhitePiece(piece)) {
        if (isValidMove({ row, col }, kingPos, piece, board)) {
          return true;
        }
      }
    }
  }

  return false;
};

const getAllPossibleMoves = (board: (Piece)[][], isWhiteTurn: boolean) => {
  const moves: { from: Position; to: Position; score: number }[] = [];
  
  for (let fromRow = 0; fromRow < 8; fromRow++) {
    for (let fromCol = 0; fromCol < 8; fromCol++) {
      const piece = board[fromRow][fromCol];
      if (!piece || isWhitePiece(piece) !== isWhiteTurn) continue;

      for (let toRow = 0; toRow < 8; toRow++) {
        for (let toCol = 0; toCol < 8; toCol++) {
          if (isValidMove(
            { row: fromRow, col: fromCol },
            { row: toRow, col: toCol },
            piece,
            board
          )) {
            // Make temporary move
            const tempBoard = board.map(row => [...row]);
            const capturedPiece = tempBoard[toRow][toCol];
            tempBoard[toRow][toCol] = piece;
            tempBoard[fromRow][fromCol] = null;

            // Skip if move puts or leaves own king in check
            if (isInCheck(tempBoard, isWhiteTurn)) continue;

            // Evaluate move
            let score = capturedPiece ? evaluatePiece(capturedPiece) : 0;
            
            // Extra points for getting out of check
            if (isInCheck(board, isWhiteTurn) && !isInCheck(tempBoard, isWhiteTurn)) {
              score += 2; // Prioritize getting out of check
            }

            // Bonus for controlling center
            if (toRow >= 3 && toRow <= 4 && toCol >= 3 && toCol <= 4) {
              score += 0.5;
            }

            // Bonus for check
            if (isInCheck(tempBoard, !isWhiteTurn)) {
              score += 0.3;
            }

            moves.push({
              from: { row: fromRow, col: fromCol },
              to: { row: toRow, col: toCol },
              score: score
            });
          }
        }
      }
    }
  }
  
  return moves;
};

const makeAIMove = (board: (Piece)[][], isWhiteTurn: boolean, difficulty: Difficulty = 'easy') => {
  const possibleMoves = getAllPossibleMoves(board, isWhiteTurn);
  
  if (possibleMoves.length === 0) return null;

  if (difficulty === 'hard') {
    // In hard mode, look deeper and be more aggressive
    possibleMoves.forEach(move => {
      // Make temporary move
      const tempBoard = board.map(row => [...row]);
      const piece = tempBoard[move.from.row][move.from.col];
      tempBoard[move.to.row][move.to.col] = piece;
      tempBoard[move.from.row][move.from.col] = null;

      // Look ahead one move
      const opponentMoves = getAllPossibleMoves(tempBoard, !isWhiteTurn);
      const bestOpponentMove = opponentMoves.reduce((best, current) => 
        current.score > best.score ? current : best, 
        opponentMoves[0] || { score: -Infinity }
      );

      // Adjust score based on opponent's best move
      move.score -= (bestOpponentMove?.score || 0) * 0.5;

      // Additional strategic considerations for hard mode
      // Bonus for controlling center
      if (move.to.row >= 2 && move.to.row <= 5 && move.to.col >= 2 && move.to.col <= 5) {
        move.score += 1;
      }
      // Bonus for protecting king
      if (isKing(board[move.from.row][move.from.col])) {
        move.score -= 2; // Discourage moving king unless necessary
      }
      // Bonus for developing pieces early
      if (isWhiteTurn && move.from.row === 7 || !isWhiteTurn && move.from.row === 0) {
        move.score += 0.5;
      }
    });

    // Sort by score and pick from top 2 moves only
    possibleMoves.sort((a, b) => b.score - a.score);
    return possibleMoves[0]; // In hard mode, always pick the best move
  } else {
    // Easy mode - existing logic
    possibleMoves.sort((a, b) => b.score - a.score);
    const topMoves = possibleMoves.slice(0, Math.min(3, possibleMoves.length));
    return topMoves[Math.floor(Math.random() * topMoves.length)];
  }
};

// Minimax Algorithm with Alpha-Beta Pruning
const minimax = (
  board: (Piece)[][],
  depth: number,
  isMaximizing: boolean,
  isWhiteTurn: boolean,
  alpha: number,
  beta: number
): number => {
  if (depth === 0) {
    // Evaluate the board at the current state
    return board.reduce((score, row) =>
      score +
      row.reduce((rowScore, piece) => rowScore + evaluatePiece(piece), 0),
      0
    );
  }

  const possibleMoves = getAllPossibleMoves(board, isWhiteTurn);

  if (possibleMoves.length === 0) {
    // No moves available
    return isInCheck(board, isWhiteTurn) ? (isMaximizing ? -Infinity : Infinity) : 0;
  }

  let bestScore = isMaximizing ? -Infinity : Infinity;

  for (const move of possibleMoves) {
    // Make the move temporarily
    const tempBoard = board.map((row) => [...row]);
    const piece = tempBoard[move.from.row][move.from.col];
    tempBoard[move.to.row][move.to.col] = piece;
    tempBoard[move.from.row][move.from.col] = null;

    // Recurse into the next depth
    const score = minimax(
      tempBoard,
      depth - 1,
      !isMaximizing,
      !isWhiteTurn,
      alpha,
      beta
    );

    if (isMaximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }

    if (beta <= alpha) {
      break; // Alpha-beta pruning
    }
  }

  return bestScore;
};

const makeExtremelyHardAIMove = (
  board: (Piece)[][],
  isWhiteTurn: boolean
): { from: Position; to: Position } | null => {
  const possibleMoves = getAllPossibleMoves(board, isWhiteTurn);

  if (possibleMoves.length === 0) return null;

  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of possibleMoves) {
    // Make the move temporarily
    const tempBoard = board.map((row) => [...row]);
    const piece = tempBoard[move.from.row][move.from.col];
    tempBoard[move.to.row][move.to.col] = piece;
    tempBoard[move.from.row][move.from.col] = null;

    // Evaluate the move using minimax
    const score = minimax(tempBoard, 3, false, !isWhiteTurn, -Infinity, Infinity);

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

export default function ChessWindow({ onClose, isMobile }: ChessWindowProps) {
  const [position, setPosition] = useState({ x: 100, y: 50 });
  const [size, setSize] = useState({ width: 400, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const [board, setBoard] = useState(initializeBoard());
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);
  const [gameState, setGameState] = useState<'playing' | 'check' | 'checkmate' | 'stalemate'>('playing');
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [playerColor, setPlayerColor] = useState<PlayerColor>(null);
  const [showDialog, setShowDialog] = useState<DialogType>('setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(null);

  useEffect(() => {
    // Add touch feedback styles
    const style = document.createElement('style');
    style.textContent = `
      .touch-feedback {
        background-color: rgba(15, 253, 32, 0.4) !important;
        transition: background-color 0.2s;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  function initializeBoard() {
    const initialBoard = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Set up pawns
    for (let i = 0; i < 8; i++) {
      initialBoard[1][i] = '♟'; // black pawns
      initialBoard[6][i] = '♙'; // white pawns
    }
    
    // Set up other pieces
    const backRow = ['♜', '♞', '♝', '♛', '♚', '♝', '♞', '♜'];
    const frontRow = ['♖', '♘', '♗', '♕', '♔', '♗', '♘', '♖'];
    
    for (let i = 0; i < 8; i++) {
      initialBoard[0][i] = backRow[i];  // black pieces
      initialBoard[7][i] = frontRow[i]; // white pieces
    }
    
    return initialBoard;
  }

  useEffect(() => {
    if (isMobile) {
      setPosition({
        x: window.innerWidth * 0.05,  // 5% from left
        y: window.innerHeight * 0.1   // 10% from top
      });
      setSize({
        width: window.innerWidth * 0.9,
        height: window.innerHeight * 0.8
      });
    }
  }, [isMobile]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return; // Disable for mobile
    if (windowRef.current) {
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const isCheckmate = (board: (Piece)[][], isWhiteKing: boolean): boolean => {
    // First verify the king is in check
    if (!isInCheck(board, isWhiteKing)) return false;

    // Try every possible move for every piece of the current player
    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = board[fromRow][fromCol];
        // Make sure we're only checking moves for the current player's pieces
        if (!piece || (isWhiteKing !== isWhitePiece(piece))) continue;

        // Try all possible destinations
        for (let toRow = 0; toRow < 8; toRow++) {
          for (let toCol = 0; toCol < 8; toCol++) {
            // Skip if it's the same position
            if (fromRow === toRow && fromCol === toCol) continue;

            if (isValidMove({ row: fromRow, col: fromCol }, { row: toRow, col: toCol }, piece, board)) {
              // Make temporary move
              const tempBoard = board.map(row => [...row]);
              tempBoard[toRow][toCol] = piece;
              tempBoard[fromRow][fromCol] = null;

              // If this move gets out of check, it's not checkmate
              if (!isInCheck(tempBoard, isWhiteKing)) {
                return false;
              }
            }
          }
        }
      }
    }

    // If we've tried all moves and none get us out of check, it's checkmate
    return true;
  };

  const handleSquareClick = (row: number, col: number) => {
    // Add touch feedback for mobile
    if (isMobile) {
      const square = document.querySelector(`[data-position="${row}-${col}"]`);
      if (square) {
        square.classList.add('touch-feedback');
        setTimeout(() => square.classList.remove('touch-feedback'), 200);
      }
    }

    if (!selectedPiece) {
      const piece = board[row][col];
      if (!piece) return;
      
      const pieceIsWhite = isWhitePiece(piece);
      if ((isWhiteTurn && !pieceIsWhite) || (!isWhiteTurn && pieceIsWhite)) {
        return;
      }
      
      setSelectedPiece({ row, col });
    } else {
      const piece = board[selectedPiece.row][selectedPiece.col];
      if (!piece) return;

      if (selectedPiece.row === row && selectedPiece.col === col) {
        setSelectedPiece(null);
        return;
      }

      const targetPiece = board[row][col];
      if (targetPiece && isWhitePiece(targetPiece) === isWhitePiece(piece)) {
        setSelectedPiece({ row, col });
        return;
      }

      if (isValidMove(selectedPiece, { row, col }, piece, board)) {
        const newBoard = [...board.map(row => [...row])];
        
        newBoard[row][col] = piece;
        newBoard[selectedPiece.row][selectedPiece.col] = null;

        const isWhite = isWhitePiece(piece);
        if (isWhite !== null && isInCheck(newBoard, isWhite)) {
          setSelectedPiece(null);
          return;
        }

        // Update board first
        setBoard(newBoard);
        
        // Check opponent's position (important: we check the opponent's king here)
        const opponentIsWhite = !isWhite;
        
        // Check for checkmate first, then check
        if (isCheckmate(newBoard, opponentIsWhite)) {
          setGameState('checkmate');
          setTimeout(() => {
            setShowDialog('endgame');
          }, 1500);
        } else if (isInCheck(newBoard, opponentIsWhite)) {
          setGameState('check');
        } else {
          setGameState('playing');
        }
        
        setIsWhiteTurn(!isWhiteTurn);
        setSelectedPiece(null);
      } else {
        setSelectedPiece(null);
      }
    }
  };

  const resetGame = () => {
    setBoard(initializeBoard());
    setIsWhiteTurn(true);
    setGameState('playing');
    setSelectedPiece(null);
    setShowDialog('setup');
  };

  useEffect(() => {
    if (gameState === 'checkmate') {
      setTimeout(() => {
        setShowDialog('endgame');
      }, 1500); // Show dialog 1.5s after checkmate to let player see the final position
    }
  }, [gameState]);

  const handleGameStart = (mode: GameMode, color: PlayerColor, diff: Difficulty = 'easy') => {
    setGameMode(mode);
    setPlayerColor(color);
    setDifficulty(diff);
    setBoard(initializeBoard());
    setIsWhiteTurn(true);
    setGameState('playing');
    setShowDialog(null);

    if (mode === 'ai' && color === 'black') {
      setTimeout(() => {
        const aiMove = makeAIMove(initializeBoard(), true, diff);
        if (aiMove) {
          const { from, to } = aiMove;
          const newBoard = [...initializeBoard()];
          const piece = newBoard[from.row][from.col];
          
          if (piece) {
            newBoard[to.row][to.col] = piece;
            newBoard[from.row][from.col] = null;
            setBoard(newBoard);
            setIsWhiteTurn(false);
          }
        }
      }, 500);
    }
  };

  useEffect(() => {
    if (
      gameMode === 'ai' && 
      gameState !== 'checkmate' && 
      playerColor && 
      showDialog === null
    ) {
      const isAITurn = playerColor === 'white' ? !isWhiteTurn : isWhiteTurn;
      
      if (isAITurn) {
        const timeoutId = setTimeout(() => {
          let aiMove: { from: Position; to: Position } | null = null;

          if (difficulty === 'hard') {
            aiMove = makeExtremelyHardAIMove(board, isWhiteTurn);
          } else {
            aiMove = makeAIMove(board, isWhiteTurn, difficulty);
          }
          
          if (aiMove) {
            const { from, to } = aiMove;
            const piece = board[from.row][from.col];
            
            if (piece) {
              const newBoard = [...board.map(row => [...row])];
              
              newBoard[to.row][to.col] = piece;
              newBoard[from.row][from.col] = null;

              // Update board first
              setBoard(newBoard);

              // Check opponent's king (the player's king)
              const opponentIsWhite = !isWhitePiece(piece);
              
              // Check for checkmate first
              if (isCheckmate(newBoard, opponentIsWhite)) {
                setGameState('checkmate');
                setTimeout(() => {
                  setShowDialog('endgame');
                }, 1500);
              } else if (isInCheck(newBoard, opponentIsWhite)) {
                setGameState('check');
              } else {
                setGameState('playing');
              }
              
              setIsWhiteTurn(!isWhiteTurn);
            }
          }
        }, 500);

        return () => clearTimeout(timeoutId);
      }
    }
  }, [gameMode, playerColor, isWhiteTurn, board, gameState, showDialog, difficulty]);

  const BackToTerminalButton = () => {
    if (!isMobile) return null;
    
    return (
      <button
        onClick={onClose}
        className="fixed bottom-20 left-1/2 transform -translate-x-1/2 
                   bg-black border border-[#0FFD20] text-[#0FFD20] 
                   px-6 py-2 shadow-lg hover:bg-[#0FFD20] hover:text-black 
                   transition-colors z-50"
        style={{ boxShadow: "0 0 10px #0FFD20" }}
      >
        Back to Terminal
      </button>
    );
  };

  return (
    <>
      <div
        ref={windowRef}
        className="absolute bg-black border border-[#0FFD20] shadow-lg z-50"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: `${size.width}px`,
          height: `${size.height}px`,
          boxShadow: "0 0 10px #0FFD20",
        }}
      >
        <div
          className="flex justify-between items-center p-1 border-b border-[#0FFD20] cursor-move"
          onMouseDown={handleMouseDown}
        >
          <span className="text-xs uppercase">MλTRIX CHESS</span>
          <div className="flex space-x-1">
            <button className="text-[#0FFD20] hover:text-white">
              <Minus size={12} />
            </button>
            <button className="text-[#0FFD20] hover:text-white">
              <Maximize2 size={12} />
            </button>
            <button
              className="text-[#0FFD20] hover:text-white"
              onClick={onClose}
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="text-center mb-4 text-[#0FFD20] text-lg font-bold">
            {gameState === 'checkmate' 
              ? `Checkmate! ${isWhiteTurn ? "Black" : "White"} Wins!` 
              : gameState === 'check' 
                ? (isWhiteTurn ? "Black in Check!" : "White in Check!") 
                : `${isWhiteTurn ? "White" : "Black"}'s Turn`}
          </div>
          <div className="grid grid-cols-8 gap-0 max-w-[400px] mx-auto">
            {board.map((row, rowIndex) => (
              row.map((piece, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  data-position={`${rowIndex}-${colIndex}`}
                  className={`
                    w-full pb-[100%] relative border border-[#0FFD20] cursor-pointer
                    ${((rowIndex + colIndex) % 2 === 0) ? 'bg-black' : 'bg-[#0FFD20] bg-opacity-20'}
                    ${selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex ? 'bg-[#0FFD20] bg-opacity-40' : ''}
                    hover:bg-[#0FFD20] hover:bg-opacity-30
                    active:bg-[#0FFD20] active:bg-opacity-40
                    touch-feedback:bg-[#0FFD20] touch-feedback:bg-opacity-40
                  `}
                  onClick={() => handleSquareClick(rowIndex, colIndex)}
                  onTouchStart={(e) => {
                    e.preventDefault(); // Prevent double-firing with click event
                    handleSquareClick(rowIndex, colIndex);
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-4xl select-none">
                    {piece}
                  </div>
                </div>
              ))
            ))}
          </div>
        </div>
        
        {/* Game Setup/End Dialog */}
        {showDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
            <div className="bg-black border border-[#0FFD20] p-6 shadow-lg max-w-sm w-full mx-4">
              {showDialog === 'setup' ? (
                <>
                  <h2 className="text-[#0FFD20] text-xl font-bold mb-6 text-center">
                    MλTRIX CHESS
                  </h2>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <p className="text-[#0FFD20] text-sm mb-2">Select Game Mode:</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          className={`p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:bg-opacity-20 transition-colors
                            ${gameMode === 'human' ? 'bg-[#0FFD20] bg-opacity-20' : ''}`}
                          onClick={() => setGameMode('human')}
                        >
                          Human vs Human
                        </button>
                        <button
                          className={`p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:bg-opacity-20 transition-colors
                            ${gameMode === 'ai' ? 'bg-[#0FFD20] bg-opacity-20' : ''}`}
                          onClick={() => setGameMode('ai')}
                        >
                          Play vs AI
                        </button>
                      </div>
                    </div>
                    
                    {gameMode === 'ai' && (
                      <>
                        <div className="space-y-3">
                          <p className="text-[#0FFD20] text-sm mb-2">Select Difficulty:</p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              className={`p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:bg-opacity-20 transition-colors
                                ${difficulty === 'easy' ? 'bg-[#0FFD20] bg-opacity-20' : ''}`}
                              onClick={() => setDifficulty('easy')}
                            >
                              Easy Mode
                            </button>
                            <button
                              className={`p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:bg-opacity-20 transition-colors
                                ${difficulty === 'hard' ? 'bg-[#0FFD20] bg-opacity-20' : ''}`}
                              onClick={() => setDifficulty('hard')}
                            >
                              Hard Mode
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-[#0FFD20] text-sm mb-2">Select Your Color:</p>
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              className={`p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:bg-opacity-20 transition-colors
                                ${playerColor === 'white' ? 'bg-[#0FFD20] bg-opacity-20' : ''}`}
                              onClick={() => setPlayerColor('white')}
                            >
                              White ♔
                            </button>
                            <button
                              className={`p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:bg-opacity-20 transition-colors
                                ${playerColor === 'black' ? 'bg-[#0FFD20] bg-opacity-20' : ''}`}
                              onClick={() => setPlayerColor('black')}
                            >
                              Black ♚
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <button
                      className={`w-full p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:text-black transition-colors
                        ${(!gameMode || (gameMode === 'ai' && (!playerColor || !difficulty))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        if (gameMode && (gameMode === 'human' || (playerColor && difficulty))) {
                          handleGameStart(gameMode, playerColor, difficulty);
                        }
                      }}
                      disabled={!gameMode || (gameMode === 'ai' && (!playerColor || !difficulty))}
                    >
                      Start Game
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-[#0FFD20] text-xl font-bold mb-6 text-center">
                    Game Over
                  </h2>
                  <p className="text-[#0FFD20] text-center mb-6">
                    {isWhiteTurn ? "Black" : "White"} Wins!
                  </p>
                  <div className="space-y-3">
                    <button
                      className="w-full p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:text-black transition-colors"
                      onClick={resetGame}
                    >
                      Play Again
                    </button>
                    <button
                      className="w-full p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:text-black transition-colors"
                      onClick={onClose}
                    >
                      Exit
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
      <BackToTerminalButton />
    </>
  );
} 