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

const isWhitePiece = (piece: Piece) => piece && '♙♖♘♗♕♔'.includes(piece);
const isBlackPiece = (piece: Piece) => piece && '♟♜♞♝♛♚'.includes(piece);
const isPawn = (piece: Piece) => piece === '♟' || piece === '♙';
const isRook = (piece: Piece) => piece === '♜' || piece === '♖';
const isKnight = (piece: Piece) => piece === '♞' || piece === '♘';
const isBishop = (piece: Piece) => piece === '♝' || piece === '♗';
const isQueen = (piece: Piece) => piece === '♛' || piece === '♕';
const isKing = (piece: Piece) => piece === '♚' || piece === '♔';

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
  const [capturedPieces, setCapturedPieces] = useState<{ white: Piece[], black: Piece[] }>({
    white: [],
    black: []
  });
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [playerColor, setPlayerColor] = useState<PlayerColor>(null);
  const [showDialog, setShowDialog] = useState<DialogType>('setup');

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
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight - 100 });
    }
  }, [isMobile]);

  const handleMouseDown = (e: React.MouseEvent) => {
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

  const isCheckmate = (board: (Piece)[][], isWhiteKing: boolean): boolean => {
    if (!isInCheck(board, isWhiteKing)) return false;

    for (let fromRow = 0; fromRow < 8; fromRow++) {
      for (let fromCol = 0; fromCol < 8; fromCol++) {
        const piece = board[fromRow][fromCol];
        if (!piece) continue;
        
        if (isWhiteKing === isWhitePiece(piece)) {
          for (let toRow = 0; toRow < 8; toRow++) {
            for (let toCol = 0; toCol < 8; toCol++) {
              if (isValidMove({ row: fromRow, col: fromCol }, { row: toRow, col: toCol }, piece, board)) {
                const tempBoard = board.map(row => [...row]);
                tempBoard[toRow][toCol] = piece;
                tempBoard[fromRow][fromCol] = null;
                
                if (!isInCheck(tempBoard, isWhiteKing)) {
                  return false;
                }
              }
            }
          }
        }
      }
    }
    
    return true;
  };

  const handleSquareClick = (row: number, col: number) => {
    if (!selectedPiece) {
      // Selecting a piece
      const piece = board[row][col];
      if (!piece) return;
      
      // Check if the selected piece belongs to the current player
      const pieceIsWhite = isWhitePiece(piece);
      if ((isWhiteTurn && !pieceIsWhite) || (!isWhiteTurn && pieceIsWhite)) {
        return; // Can't select opponent's pieces
      }
      
      setSelectedPiece({ row, col });
    } else {
      // Moving a piece
      const piece = board[selectedPiece.row][selectedPiece.col];
      if (!piece) return;

      // If clicking the same piece, deselect it
      if (selectedPiece.row === row && selectedPiece.col === col) {
        setSelectedPiece(null);
        return;
      }

      // If clicking another piece of the same color, select that piece instead
      const targetPiece = board[row][col];
      if (targetPiece && isWhitePiece(targetPiece) === isWhitePiece(piece)) {
        setSelectedPiece({ row, col });
        return;
      }

      if (isValidMove(selectedPiece, { row, col }, piece, board)) {
        const newBoard = [...board.map(row => [...row])];
        
        // Handle captures
        const capturedPiece = newBoard[row][col];
        if (capturedPiece) {
          setCapturedPieces(prev => {
            const isWhiteCaptured = isWhitePiece(capturedPiece);
            return {
              white: isWhiteCaptured ? [...prev.white, capturedPiece] : prev.white,
              black: isWhiteCaptured ? prev.black : [...prev.black, capturedPiece]
            };
          });
        }

        // Make the move
        newBoard[row][col] = piece;
        newBoard[selectedPiece.row][selectedPiece.col] = null;

        // Check if the move puts own king in check
        const isWhite = isWhitePiece(piece);
        if (isInCheck(newBoard, isWhite)) {
          setSelectedPiece(null);
          return;
        }

        // Update board and check game state
        setBoard(newBoard);
        const opponentIsWhite = !isWhite;
        
        if (isCheckmate(newBoard, opponentIsWhite)) {
          setGameState('checkmate');
        } else if (isInCheck(newBoard, opponentIsWhite)) {
          setGameState('check');
        } else {
          setGameState('playing');
        }
        
        setIsWhiteTurn(!isWhiteTurn);
        setSelectedPiece(null);
      } else {
        setSelectedPiece(null); // Deselect piece if move is invalid
      }
    }
  };

  const resetGame = () => {
    setBoard(initializeBoard());
    setIsWhiteTurn(true);
    setGameState('playing');
    setCapturedPieces({ white: [], black: [] });
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

  const handleGameStart = (mode: GameMode, color: PlayerColor) => {
    setGameMode(mode);
    setPlayerColor(color);
    setShowDialog(null);
  };

  return (
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
        <div className="flex justify-between mb-2 text-sm">
          <div>Captured Black: {capturedPieces.black.join(' ')}</div>
          <div>Captured White: {capturedPieces.white.join(' ')}</div>
        </div>
        <div className="grid grid-cols-8 gap-0 max-w-[400px] mx-auto">
          {board.map((row, rowIndex) => (
            row.map((piece, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={`
                  w-full pb-[100%] relative border border-[#0FFD20] cursor-pointer
                  ${((rowIndex + colIndex) % 2 === 0) ? 'bg-black' : 'bg-[#0FFD20] bg-opacity-20'}
                  ${selectedPiece?.row === rowIndex && selectedPiece?.col === colIndex ? 'bg-[#0FFD20] bg-opacity-40' : ''}
                  hover:bg-[#0FFD20] hover:bg-opacity-30
                `}
                onClick={() => handleSquareClick(rowIndex, colIndex)}
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
                  )}
                  
                  <button
                    className={`w-full p-2 border border-[#0FFD20] hover:bg-[#0FFD20] hover:text-black transition-colors
                      ${(!gameMode || (gameMode === 'ai' && !playerColor)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (gameMode && (gameMode === 'human' || playerColor)) {
                        handleGameStart(gameMode, playerColor);
                      }
                    }}
                    disabled={!gameMode || (gameMode === 'ai' && !playerColor)}
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
  );
} 