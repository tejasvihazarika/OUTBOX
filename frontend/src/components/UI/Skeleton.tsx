import React from 'react';

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between p-4 bg-[#131926]/50 rounded-xl animate-pulse">
          <div className="flex items-center gap-4 w-1/3">
            <div className="w-8 h-8 rounded-full bg-slate-800" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-800 rounded w-3/4" />
              <div className="h-3 bg-slate-800/60 rounded w-1/2" />
            </div>
          </div>
          <div className="h-4 bg-slate-800 rounded w-1/4" />
          <div className="h-4 bg-slate-800 rounded w-1/6" />
          <div className="h-6 bg-slate-800 rounded-full w-20" />
        </div>
      ))}
    </div>
  );
};
