'use client';

import { Home, FileText, Plus, Wallet, Sparkles, Bot, Lock } from 'lucide-react';

export default function BottomNav({
  canRecord = true,
  canReconcile = true,
  onOpenNewTx,
  onOpenDenominations,
  onOpenAI,
  onScrollToLedger,
}) {
  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t transition-colors duration-200 select-none no-print bg-white/95 dark:bg-[#09090b]/95 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_-4px_25px_rgba(0,0,0,0.8)]"
      style={{
        paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        paddingTop: '0.35rem',
      }}
    >
      <div className="max-w-md mx-auto px-4 flex items-center justify-between">
        
        {/* 1. Home / Dashboard */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center min-w-[52px] min-h-[48px] rounded-xl transition-[color,transform] duration-150 cursor-pointer active:scale-95 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
          title="Scroll to Top / Dashboard"
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] font-bold tracking-tight mt-0.5">Home</span>
        </button>

        {/* 2. Ledger Section Anchor */}
        <button
          type="button"
          onClick={() => {
            if (onScrollToLedger) {
              onScrollToLedger();
            } else {
              const el = document.getElementById('financial-ledger');
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="flex flex-col items-center justify-center min-w-[52px] min-h-[48px] rounded-xl transition-[color,transform] duration-150 cursor-pointer active:scale-95 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          title="Jump to Financial Ledger"
        >
          <FileText className="w-5 h-5 stroke-[2]" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">Ledger</span>
        </button>

        {/* 3. Center Elevated Action Pod (+ Record) */}
        <button
          type="button"
          onClick={canRecord ? onOpenNewTx : undefined}
          disabled={!canRecord}
          className={`-mt-5 w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-white dark:border-[#09090b] ${
            !canRecord
              ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 opacity-60 cursor-not-allowed select-none shadow-none'
              : 'shadow-lg transition-transform active:scale-90 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 dark:shadow-emerald-500/30'
          }`}
          title={!canRecord ? 'Recording restricted by Administrator' : 'Record New Transaction'}
        >
          {canRecord ? (
            <Plus className="w-6 h-6 stroke-[3]" />
          ) : (
            <div className="relative flex items-center justify-center">
              <Plus className="w-6 h-6 stroke-[2.5] opacity-40" />
              <Lock className="w-3.5 h-3.5 absolute -bottom-1 -right-1 text-amber-500 stroke-[2.5]" />
            </div>
          )}
        </button>

        {/* 4. Cashbox / Physical Count */}
        <button
          type="button"
          onClick={canReconcile ? onOpenDenominations : undefined}
          disabled={!canReconcile}
          className={`flex flex-col items-center justify-center min-w-[52px] min-h-[48px] rounded-xl transition-[color,transform] duration-150 ${
            !canReconcile
              ? 'opacity-50 cursor-not-allowed select-none text-zinc-400 dark:text-zinc-600'
              : 'cursor-pointer active:scale-95 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
          title={!canReconcile ? 'Cash reconciliation restricted by Administrator' : 'Open Cashbox & Denomination Audit'}
        >
          <div className="relative">
            <Wallet className="w-5 h-5 stroke-[2]" />
            {!canReconcile && (
              <Lock className="w-2.5 h-2.5 absolute -top-1 -right-1 text-amber-500 stroke-[2.5]" />
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-tight mt-0.5 flex items-center gap-0.5">
            Cash Box
            {!canReconcile && <Lock className="w-2 h-2 text-zinc-400" />}
          </span>
        </button>

        {/* 5. AI Co-Pilot */}
        <button
          type="button"
          onClick={onOpenAI}
          className="flex flex-col items-center justify-center min-w-[52px] min-h-[48px] rounded-xl transition-[color,transform] duration-150 cursor-pointer active:scale-95 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          title="Open AI Assistant"
        >
          <Bot className="w-5 h-5 stroke-[2] text-emerald-600 dark:text-emerald-400" />
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">AI</span>
        </button>

      </div>
    </nav>
  );
}
