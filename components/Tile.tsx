
import React from 'react';
import { TileData } from '../types';

interface TileProps {
  tile: TileData | null;
  isSelected: boolean;
  onClick: (tile: TileData) => void;
  isAutoMatched?: boolean;
}

const Tile: React.FC<TileProps> = ({ tile, isSelected, onClick, isAutoMatched }) => {
  if (!tile) {
    return <div className="h-full w-full opacity-0 pointer-events-none" />; 
  }

  return (
    <div
      onClick={() => onClick(tile)}
      style={{
        transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
      className={`
        relative flex items-center justify-center h-full w-full
        cursor-pointer transform border-[0.5px] border-slate-100
        ${isSelected ? 'z-30 bg-amber-50 shadow-[inset_0_0_4px_rgba(180,83,9,0.2)]' : 'bg-white'}
        ${tile.isMatched ? 'scale-110 opacity-0 rotate-12 z-40' : 'scale-100 opacity-100'}
        ${isAutoMatched ? 'animate-pulse bg-amber-50' : ''}
        overflow-hidden
      `}
    >
      {/* 消除时的墨迹喷溅效果 */}
      {tile.isMatched && (
        <div className="absolute inset-0 bg-slate-900 rounded-full animate-ink pointer-events-none" />
      )}

      {/* 诗句文本：适配 4x4 大网格 */}
      <div 
        className={`text-center font-bold tracking-tight leading-snug transition-colors duration-300
          ${tile.isMatched ? 'text-amber-600' : 'text-slate-800'}
        `} 
        style={{ fontSize: '15px', writingMode: 'vertical-rl', padding: '2px' }}
      >
        {tile.text}
      </div>
      
      {/* 选中指示器：更细的边框 */}
      {isSelected && (
        <div className="absolute inset-0 border-[2px] border-amber-600 rounded-sm pointer-events-none" />
      )}
    </div>
  );
};

export default Tile;
