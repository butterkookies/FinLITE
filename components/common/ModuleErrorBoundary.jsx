'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ModuleErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[${this.props.moduleName || 'Module'}] Error Boundary caught error:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 sm:p-5 my-2 bg-white dark:bg-[#121214] rounded-2xl border border-black/[0.08] dark:border-zinc-800 shadow-xs text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-zinc-800/80 border border-black/[0.06] dark:border-zinc-700/60 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-950 dark:text-zinc-100 text-xs sm:text-sm tracking-tight">
                {this.props.moduleName || 'Feature'} Temporarily Paused
              </h4>
              <p className="text-gray-500 dark:text-zinc-400 mt-0.5 leading-relaxed text-[11px] sm:text-xs">
                A localized error occurred inside this module. All other FinLITE ledger operations and financial balances remain active and safe.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="h-8 inline-flex items-center gap-1.5 px-3 bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 active:bg-gray-100 dark:active:bg-zinc-600 border border-black/[0.08] dark:border-zinc-700 rounded-xl font-semibold text-gray-800 dark:text-zinc-200 transition-colors shadow-2xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-gray-600 dark:text-zinc-400" />
                  <span>Reload Module</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
