
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { POEM_DATABASE, INITIAL_TIME, MATCH_POINTS } from './constants';
import { TileData, GameStatus, PoemPair } from './types';
import Tile from './components/Tile';
import GeminiPanel, { ExplanationData } from './components/GeminiPanel';

interface Point {
  x: number;
  y: number;
}

const App: React.FC = () => {
  const [grid, setGrid] = useState<(TileData | null)[][]>([]);
  const [selectedTile, setSelectedTile] = useState<TileData | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [multiplier, setMultiplier] = useState(1);
  const [showMultiplier, setShowMultiplier] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState<PoemPair[]>([]);
  
  // Game progression state
  const [level, setLevel] = useState(1);
  const [usedPoemIds, setUsedPoemIds] = useState<Set<string>>(new Set());
  const [gridDimensions, setGridDimensions] = useState({ rows: 4, cols: 4 });

  // State for analysis
  const [selectedPoemForAnalysis, setSelectedPoemForAnalysis] = useState<string>('');
  const [explanationCache, setExplanationCache] = useState<Record<string, ExplanationData>>({});

  const [isProcessing, setIsProcessing] = useState(false);
  const [activePath, setActivePath] = useState<Point[] | null>(null);
  
  const autoMatchIdRef = useRef<Set<string>>(new Set());
  const gridRef = useRef<HTMLDivElement>(null);
  const multiplierTimeoutRef = useRef<number | null>(null);
  const shuffleTimeoutRef = useRef<number | null>(null);

  const getGridConfig = (currentLevel: number) => {
      // Level 1: 4x4 (8 pairs)
      // Level 2+: 4x5 (10 pairs)
      if (currentLevel === 1) {
          return { rows: 4, cols: 4, pairsNeeded: 8 };
      } else {
          return { rows: 5, cols: 4, pairsNeeded: 10 }; // 4 cols, 5 rows fits mobile vertical better
      }
  };

  const generateValidLayout = (tiles: TileData[], rows: number, cols: number): (TileData | null)[][] | null => {
    let attempts = 0;
    while (attempts < 200) {
      const shuffled = [...tiles];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      const tempGrid: (TileData | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
      let tileIdx = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (tileIdx < shuffled.length) {
            tempGrid[r][c] = { ...shuffled[tileIdx++], x: c, y: r };
          }
        }
      }

      let matchCount = 0;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const t = tempGrid[r][c];
          if (!t) continue;
          if (c + 1 < cols) {
            const right = tempGrid[r][c + 1];
            if (right && right.pairId === t.pairId && right.type !== t.type) matchCount++;
          }
          if (r + 1 < rows) {
            const down = tempGrid[r + 1][c];
            if (down && down.pairId === t.pairId && down.type !== t.type) matchCount++;
          }
        }
      }

      if (matchCount <= 2) {
        return tempGrid;
      }
      attempts++;
    }
    return null;
  };

  const initGame = useCallback((isNextLevel: boolean = false) => {
    let nextLevel = 1;
    let nextUsedIds = new Set<string>();
    let currentScore = 0;

    if (isNextLevel) {
        nextLevel = level + 1;
        nextUsedIds = new Set(usedPoemIds);
        currentScore = score;
    } else {
        // Full restart
        nextLevel = 1;
        nextUsedIds = new Set();
        currentScore = 0;
    }

    const config = getGridConfig(nextLevel);
    setGridDimensions({ rows: config.rows, cols: config.cols });
    setLevel(nextLevel);
    setScore(currentScore);

    // Filter available poems (not used previously)
    let availablePairs = POEM_DATABASE.filter(p => !nextUsedIds.has(p.id));

    // If we ran out of poems, maybe recycle old ones or just use what we have?
    // Game logic: if not enough for this level, just recycle ALL to keep playing
    if (availablePairs.length < config.pairsNeeded) {
        availablePairs = [...POEM_DATABASE];
        nextUsedIds.clear(); 
    }

    const selectedPairs = availablePairs.sort(() => 0.5 - Math.random()).slice(0, config.pairsNeeded);
    
    // Mark these as used
    selectedPairs.forEach(p => nextUsedIds.add(p.id));
    setUsedPoemIds(nextUsedIds);
    
    const tiles: TileData[] = [];
    selectedPairs.forEach((p, idx) => {
        tiles.push({ id: `u-${idx}-${Math.random()}`, text: p.upper, pairId: p.id, type: 'upper', isMatched: false, x: 0, y: 0 });
        tiles.push({ id: `l-${idx}-${Math.random()}`, text: p.lower, pairId: p.id, type: 'lower', isMatched: false, x: 0, y: 0 });
    });

    const finalGrid = generateValidLayout(tiles, config.rows, config.cols);

    if (!finalGrid) {
       const fallbackGrid: (TileData | null)[][] = Array(config.rows).fill(null).map(() => Array(config.cols).fill(null));
        let tileIdx = 0;
        for (let r = 0; r < config.rows; r++) {
            for (let c = 0; c < config.cols; c++) {
                if (tileIdx < tiles.length) {
                    fallbackGrid[r][c] = { ...tiles[tileIdx++], x: c, y: r };
                }
            }
        }
        setGrid(fallbackGrid);
    } else {
        setGrid(finalGrid);
    }

    setTimeLeft(INITIAL_TIME);
    setStatus('playing');
    setMultiplier(1);
    setShowMultiplier(false);
    setSelectedTile(null);
    setMatchedPairs([]); // Clear matched for THIS round
    setSelectedPoemForAnalysis('');
    autoMatchIdRef.current.clear();
  }, [level, score, usedPoemIds]);

  const performAutoShuffle = useCallback(() => {
    if (status !== 'playing') return;
    
    const currentTiles: TileData[] = [];
    grid.forEach(row => row.forEach(tile => {
      if (tile && !tile.isMatched) currentTiles.push(tile);
    }));

    if (currentTiles.length === 0) return;

    const newGrid = generateValidLayout(currentTiles, gridDimensions.rows, gridDimensions.cols);

    if (newGrid) {
        setGrid(newGrid);
        setSelectedTile(null);
    }
  }, [grid, status, gridDimensions]);

  useEffect(() => {
    if (status !== 'playing' || isProcessing || grid.length === 0) return;

    const checkForMoves = () => {
        const tiles: TileData[] = [];
        grid.forEach(row => row.forEach(t => { if (t && !t.isMatched) tiles.push(t); }));
        
        if (tiles.length === 0) return true; 

        for (let i = 0; i < tiles.length; i++) {
            for (let j = i + 1; j < tiles.length; j++) {
                const t1 = tiles[i];
                const t2 = tiles[j];
                if (t1.pairId === t2.pairId && t1.type !== t2.type) {
                     const path = findPathBFS({ x: t1.x, y: t1.y }, { x: t2.x, y: t2.y }, grid);
                     if (path) return true; 
                }
            }
        }
        return false; 
    };

    if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
    
    shuffleTimeoutRef.current = window.setTimeout(() => {
        const hasMoves = checkForMoves();
        if (!hasMoves) {
            performAutoShuffle();
        }
    }, 800); 

    return () => {
        if (shuffleTimeoutRef.current) clearTimeout(shuffleTimeoutRef.current);
    };
  }, [grid, isProcessing, status, performAutoShuffle]);

  useEffect(() => {
    let timer: number;
    if (status === 'playing' && timeLeft > 0) {
      timer = window.setInterval(() => {
        setTimeLeft(prev => Math.max(0, prev - 1));
      }, 1000);
    } else if (timeLeft === 0 && status === 'playing') {
      setStatus('gameOver');
    }
    return () => clearInterval(timer);
  }, [status, timeLeft]);

  useEffect(() => {
    if (status === 'playing' && matchedPairs.length > 0) {
        const totalPairs = (gridDimensions.rows * gridDimensions.cols) / 2;
        if (matchedPairs.length >= totalPairs) {
            setStatus('victory');
        }
    }
  }, [matchedPairs, status, gridDimensions]);


  const triggerMultiplierUI = (mult: number) => {
    setMultiplier(mult);
    setShowMultiplier(true);
    if (multiplierTimeoutRef.current) window.clearTimeout(multiplierTimeoutRef.current);
    multiplierTimeoutRef.current = window.setTimeout(() => {
      setShowMultiplier(false);
    }, 2000);
  };

  const findPathBFS = (start: Point, end: Point, currentGrid: (TileData | null)[][]): Point[] | null => {
    const dr = [-1, 0, 1, 0];
    const dc = [0, 1, 0, -1];
    const queue = [{ x: start.x, y: start.y, dir: -1, turns: 0, path: [start] }];
    const visited = new Map<string, number>();
    
    while (queue.length > 0) {
      queue.sort((a, b) => a.turns - b.turns);
      const curr = queue.shift()!;
      
      if (curr.x === end.x && curr.y === end.y) return curr.path;

      for (let i = 0; i < 4; i++) {
        const nx = curr.x + dc[i];
        const ny = curr.y + dr[i];
        
        if (nx < -1 || nx > gridDimensions.cols || ny < -1 || ny > gridDimensions.rows) continue;

        const isTarget = nx === end.x && ny === end.y;
        let isBlocked = false;
        if (nx >= 0 && nx < gridDimensions.cols && ny >= 0 && ny < gridDimensions.rows) {
          const tile = currentGrid[ny][nx];
          if (tile && !tile.isMatched && !isTarget) isBlocked = true;
        }
        if (isBlocked) continue;

        let newTurns = curr.turns;
        if (curr.dir !== -1 && curr.dir !== i) newTurns++;
        if (newTurns > 5) continue;

        const key = `${nx},${ny},${i}`;
        if (visited.has(key) && visited.get(key)! <= newTurns) continue;
        visited.set(key, newTurns);

        queue.push({ x: nx, y: ny, dir: i, turns: newTurns, path: [...curr.path, {x: nx, y: ny}] });
      }
    }
    return null;
  };

  const handleTileClick = async (tile: TileData) => {
    if (status !== 'playing' || isProcessing || tile.isMatched) return;
    if (!selectedTile) { setSelectedTile(tile); return; }
    if (selectedTile.id === tile.id) { setSelectedTile(null); return; }

    const path = findPathBFS({ x: selectedTile.x, y: selectedTile.y }, { x: tile.x, y: tile.y }, grid);
    const isPair = selectedTile.pairId === tile.pairId && selectedTile.type !== tile.type;
    
    if (path) {
      if (isPair) {
          setIsProcessing(true);
          setSelectedTile(null);
          
          await new Promise(r => setTimeout(r, 200));
          const newGrid = grid.map(row => row.map(t => (t && (t.id === tile.id || t.id === selectedTile.id)) ? { ...t, isMatched: true } : t));
          setScore(s => s + MATCH_POINTS);
          
          const poem = POEM_DATABASE.find(p => p.id === tile.pairId);
          if (poem) {
              setMatchedPairs(prev => [...prev, poem]);
          }
          
          setGrid(newGrid);
          setActivePath(null);

          await new Promise(r => setTimeout(r, 300)); 
          const finalGrid = await applyGravityAndChains(newGrid, 1);
          setGrid(finalGrid);
          setIsProcessing(false);
      } else {
          setTimeLeft(prev => Math.max(0, prev - 5));
          setSelectedTile(null);
      }
    } else {
      setSelectedTile(tile);
    }
  };

  const applyGravityAndChains = async (currentGrid: (TileData | null)[][], chainCount: number): Promise<(TileData | null)[][]> => {
    let nextGrid = currentGrid.map(row => row.map(t => t?.isMatched ? null : t));
    const movedIds = new Set<string>();

    for (let c = 0; c < gridDimensions.cols; c++) {
      let emptyRow = gridDimensions.rows - 1;
      for (let r = gridDimensions.rows - 1; r >= 0; r--) {
        if (nextGrid[r][c] !== null) {
          const tile = nextGrid[r][c]!;
          if (r !== emptyRow) {
              movedIds.add(tile.id);
              nextGrid[r][c] = null;
              nextGrid[emptyRow][c] = { ...tile, x: c, y: emptyRow };
          }
          emptyRow--;
        }
      }
    }
    setGrid([...nextGrid]);
    await new Promise(resolve => setTimeout(resolve, 300));

    const autoMatches: [TileData, TileData][] = [];
    const seen = new Set<string>();
    for (let r = 0; r < gridDimensions.rows; r++) {
      for (let c = 0; c < gridDimensions.cols; c++) {
        const t1 = nextGrid[r][c];
        if (!t1) continue;
        [[r + 1, c], [r, c + 1]].forEach(([nr, nc]) => {
          if (nr < gridDimensions.rows && nc < gridDimensions.cols) {
            const t2 = nextGrid[nr][nc];
            if (t2 && t1.pairId === t2.pairId && t1.type !== t2.type && !seen.has(t1.id) && !seen.has(t2.id)) {
                if (movedIds.has(t1.id) || movedIds.has(t2.id)) {
                    autoMatches.push([t1, t2]);
                    seen.add(t1.id); seen.add(t2.id);
                }
            }
          }
        });
      }
    }

    if (autoMatches.length > 0) {
      const newMult = Math.pow(2, chainCount);
      triggerMultiplierUI(newMult);
      
      const newMatchedPoems: PoemPair[] = [];
      const processedPairIds = new Set<string>();

      autoMatches.forEach(([t1, t2]) => {
        nextGrid[t1.y][t1.x] = { ...t1, isMatched: true };
        nextGrid[t2.y][t2.x] = { ...t2, isMatched: true };
        autoMatchIdRef.current.add(t1.id);
        autoMatchIdRef.current.add(t2.id);

        if (!processedPairIds.has(t1.pairId)) {
            const poem = POEM_DATABASE.find(p => p.id === t1.pairId);
            if (poem) {
                newMatchedPoems.push(poem);
                processedPairIds.add(t1.pairId);
            }
        }
      });
      
      setScore(s => s + MATCH_POINTS * newMult);
      
      if (newMatchedPoems.length > 0) {
          setMatchedPairs(prev => [...prev, ...newMatchedPoems]);
      }

      setGrid([...nextGrid]);
      await new Promise(resolve => setTimeout(resolve, 500)); 
      return applyGravityAndChains(nextGrid, chainCount + 1);
    }
    return nextGrid;
  };

  const handleCacheUpdate = (key: string, value: ExplanationData) => {
    setExplanationCache(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const renderResultScreen = () => (
    <div className="flex flex-col h-full bg-paper p-3 overflow-hidden relative">
        <div className="shrink-0 text-center mb-4 mt-2">
             <div className="text-4xl mb-1 animate-float inline-block">
                {status === 'victory' ? '🎐' : '🍂'}
             </div>
             <h2 className="text-xl font-black text-slate-800 mb-1">
                {status === 'victory' ? `第 ${level} 关完成` : '雅集未成'}
             </h2>
             <p className="text-xs text-slate-500 mb-3 font-serif">
                {status === 'victory' ? '更上一层楼' : '卷土重来未可知'}
             </p>
             <div className="inline-block px-5 py-1.5 bg-amber-50 rounded-lg border border-amber-200 mb-3">
                 <div className="text-[10px] text-amber-600 uppercase tracking-widest mb-0.5">累计得分</div>
                 <div className="text-2xl font-black text-amber-800 tabular-nums">{score}</div>
             </div>
             <div>
                <button 
                    onClick={() => initGame(status === 'victory')} 
                    className="px-6 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-full font-bold shadow-lg active:scale-95 transition-all text-sm tracking-widest"
                >
                    {status === 'victory' ? '再赏一局' : '重新挑战'}
                </button>
             </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white/60 rounded-xl border border-amber-100 shadow-sm overflow-hidden mb-safe">
            <div className="p-2 border-b border-amber-100 bg-amber-50/50 flex justify-between items-center shrink-0">
                <h3 className="font-bold text-amber-900 text-xs">本场诗集</h3>
                <span className="text-[10px] text-amber-600">{matchedPairs.length} 首</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-20">
                {matchedPairs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 text-xs">
                        <span>空空如也</span>
                    </div>
                ) : (
                    <div className="grid gap-2">
                        {matchedPairs.map((poem, i) => {
                            const poemKey = `${poem.upper}，${poem.lower}`;
                            return (
                                <div 
                                    key={i} 
                                    onClick={() => setSelectedPoemForAnalysis(poemKey)}
                                    style={{ animationDelay: `${i * 100}ms` }}
                                    className={`animate-slide-in p-2 rounded-lg border cursor-pointer transition-all active:scale-95
                                        ${selectedPoemForAnalysis === poemKey 
                                            ? 'bg-amber-100 border-amber-300 ring-1 ring-amber-300' 
                                            : 'bg-white border-slate-100 hover:border-amber-200'
                                        }`}
                                >
                                    <div className="flex flex-col items-center gap-0.5 text-center">
                                        <div className="font-bold text-slate-800 text-sm leading-tight">{poem.upper}</div>
                                        <div className="font-bold text-slate-800 text-sm leading-tight">{poem.lower}</div>
                                        <div className="text-[10px] text-slate-400 mt-1 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 100 + 300}ms` }}>—— {poem.author}《{poem.title}》</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
        
        <GeminiPanel 
            poemText={selectedPoemForAnalysis} 
            cachedData={explanationCache[selectedPoemForAnalysis]}
            onCacheUpdate={handleCacheUpdate}
            onClose={() => setSelectedPoemForAnalysis('')}
        />
    </div>
  );

  return (
    <div className="h-[100dvh] w-full max-w-[450px] mx-auto bg-paper overflow-hidden shadow-2xl border-x border-amber-100 font-serif">
      {status !== 'playing' && status !== 'idle' ? (
          renderResultScreen()
      ) : (
          <div className="h-full flex flex-col p-2 relative">
             <div className="flex items-center justify-between mb-2 bg-white/80 p-2 rounded-xl shadow-sm border border-amber-100 backdrop-blur-sm z-10 shrink-0">
                 <div className="flex items-center gap-2">
                     <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                     </div>
                     <div className="flex flex-col">
                         <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">倒计时</span>
                         <span className={`text-lg font-black tabular-nums leading-none ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>{timeLeft}</span>
                     </div>
                 </div>
                 
                 <div className="flex flex-col items-center">
                    <h1 className="text-base font-black text-amber-900 tracking-tight">雅韵消消乐</h1>
                    <span className="text-[9px] text-amber-600 font-bold tracking-widest uppercase">第 {level} 关</span>
                 </div>

                 <div className="flex items-center gap-2 text-right">
                     <div className="flex flex-col items-end">
                         <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">得分</span>
                         <span className="text-lg font-black text-amber-600 tabular-nums leading-none">{score}</span>
                     </div>
                 </div>
             </div>

             <div className="flex-1 min-h-0 flex flex-col justify-center">
                <div 
                    className={`w-full relative rounded-xl bg-slate-200/50 p-1 shadow-inner border border-slate-300/50 mx-auto transition-all duration-500 ease-out
                        ${gridDimensions.rows === 5 ? 'aspect-[4/5] max-h-[100%]' : 'aspect-square max-h-[85%]'}
                    `}
                    ref={gridRef}
                >
                    {status === 'idle' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-white/90 backdrop-blur-sm rounded-xl">
                            <div className="text-5xl mb-3 animate-float">🎋</div>
                            <h2 className="text-xl font-black mb-1 text-slate-800">雅韵流转</h2>
                            <p className="text-slate-500 mb-6 text-xs">寻觅古诗上下句，感悟千古风流</p>
                            <button onClick={() => initGame(false)} className="px-8 py-2.5 bg-amber-700 text-white rounded-full font-bold shadow-xl active:scale-95 transition-all text-base hover:bg-amber-800">
                                开启雅集
                            </button>
                        </div>
                    )}

                    <div className="grid-inner h-full w-full grid gap-2" style={{ gridTemplateColumns: `repeat(${gridDimensions.cols}, 1fr)`, gridTemplateRows: `repeat(${gridDimensions.rows}, 1fr)` }}>
                        {grid.map((row, r) => row.map((tile, c) => (
                            <Tile key={tile ? tile.id : `empty-${r}-${c}`} tile={tile} isSelected={selectedTile?.id === tile?.id} onClick={handleTileClick} isAutoMatched={tile ? autoMatchIdRef.current.has(tile.id) : false} />
                        )))}
                    </div>

                    {showMultiplier && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[100] animate-multiplier-pop">
                            <div className="px-3 py-1.5 bg-amber-600/95 text-white rounded-full text-xl font-black shadow-xl border border-white/50 backdrop-blur-sm">
                            连消 x{multiplier}
                            </div>
                        </div>
                    )}
                </div>
             </div>
             
             <div className="text-center mt-1.5 text-[9px] text-slate-400 font-bold tracking-[0.2em] uppercase opacity-40 shrink-0">
                Poetry Match · {gridDimensions.rows}x{gridDimensions.cols} Grid
             </div>
          </div>
      )}
    </div>
  );
};

export default App;
