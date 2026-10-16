'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  MapPin, 
  Copy, 
  Check, 
  X, 
  Trash2, 
  Crosshair, 
  Sparkles, 
  Code, 
  Layers, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  MessageSquare,
  FileCode2,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// Known component to source file mapper for FinLITE codebase
const COMPONENT_FILE_MAP = {
  FloatingSidebar: 'components/layout/FloatingSidebar.jsx',
  BottomNav: 'components/layout/BottomNav.jsx',
  Navbar: 'components/layout/Navbar.jsx',
  TechWaveBackground: 'components/layout/TechWaveBackground.jsx',
  StatCards: 'components/dashboard/StatCards.jsx',
  TransactionTable: 'components/ledger/TransactionTable.jsx',
  NewTransactionModal: 'components/ledger/NewTransactionModal.jsx',
  DenominationCounter: 'components/reconciliation/DenominationCounter.jsx',
  AIChatDrawer: 'components/ai/AIChatDrawer.jsx',
  NewProposalModal: 'components/proposals/NewProposalModal.jsx',
  DocumentPreviewModal: 'components/reports/DocumentPreviewModal.jsx',
  NewSemesterModal: 'components/semesters/NewSemesterModal.jsx',
  AuditTrailDrawer: 'components/audit/AuditTrailDrawer.jsx',
  DebtsManagementModal: 'components/debts/DebtsManagementModal.jsx',
  AdvancesManagementModal: 'components/debts/AdvancesManagementModal.jsx',
  EditProfileModal: 'components/profile/EditProfileModal.jsx',
  Button: 'components/ui/Button.jsx',
  Card: 'components/ui/Card.jsx',
  Badge: 'components/ui/Badge.jsx',
  ThemeToggle: 'components/theme/ThemeToggle.jsx',
  Dashboard: 'app/page.jsx',
  AdminPage: 'app/admin/page.jsx',
  ProfilePage: 'app/profile/page.jsx',
  LoginPage: 'app/login/page.jsx',
  RegisterPage: 'app/register/page.jsx',
};

const CATEGORIES = [
  { id: 'UI/UX', label: 'UI/UX Design', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  { id: 'Bug/Logic', label: 'Bug / Logic', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' },
  { id: 'Style/Layout', label: 'Style / Layout', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
  { id: 'Copywriting', label: 'Copy / Label', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
  { id: 'Refactor', label: 'Refactor', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
];

export default function DevPinInspector() {
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pins, setPins] = useState([]);
  const [activePin, setActivePin] = useState(null); // Currently open in modal for editing/creation
  const [hoveredElementInfo, setHoveredElementInfo] = useState(null);
  const [copiedState, setCopiedState] = useState(null); // 'single' | 'all' | null
  const hoverOutlineRef = useRef(null);

  // Check Developer Authorization
  useEffect(() => {
    setMounted(true);

    const checkAuth = async () => {
      // 1. Check development environment
      if (process.env.NODE_ENV === 'development') {
        setIsAuthorized(true);
        return;
      }

      // 2. Check local dev bypass flag
      if (typeof window !== 'undefined' && localStorage.getItem('finlite_dev_mode') === 'true') {
        setIsAuthorized(true);
        return;
      }

      // 3. Check current logged-in user email
      try {
        const supabase = createClient();
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          const email = session?.user?.email?.toLowerCase();
          if (email === 'geronimoandreijohn.pdm@gmail.com') {
            setIsAuthorized(true);
            return;
          }
        }
      } catch (_) {}

      // Fallback check from stored user in localStorage
      try {
        const cachedUser = localStorage.getItem('sb-auth-token') || localStorage.getItem('finlite_user');
        if (cachedUser && cachedUser.includes('geronimoandreijohn.pdm@gmail.com')) {
          setIsAuthorized(true);
        }
      } catch (_) {}
    };

    checkAuth();

    // Load saved pins from localStorage
    try {
      const saved = localStorage.getItem('finlite_dev_pins_v1');
      if (saved) {
        setPins(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  // Save pins to localStorage
  const savePinsToStorage = (updatedPins) => {
    setPins(updatedPins);
    try {
      localStorage.setItem('finlite_dev_pins_v1', JSON.stringify(updatedPins));
    } catch (_) {}
  };

  // Keyboard shortcut to toggle Dev Pin Mode: Alt + D or Ctrl + Shift + X
  useEffect(() => {
    if (!isAuthorized) return;

    const handleKeyDown = (e) => {
      if ((e.altKey && (e.key === 'd' || e.key === 'D')) || 
          (e.ctrlKey && e.shiftKey && (e.key === 'x' || e.key === 'X'))) {
        e.preventDefault();
        setIsEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAuthorized]);

  // Extract React component hierarchy from DOM element
  const introspectElement = useCallback((target) => {
    if (!target || target === document.body || target === document.documentElement) {
      return null;
    }

    // Traverse React Fiber
    const components = [];
    try {
      const fiberKey = Object.keys(target).find(k => 
        k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')
      );
      if (fiberKey) {
        let fiber = target[fiberKey];
        while (fiber && components.length < 5) {
          if (fiber.type && typeof fiber.type === 'function') {
            const name = fiber.type.displayName || fiber.type.name;
            if (name && !name.startsWith('_') && name !== 'Anonymous' && !components.includes(name)) {
              components.push(name);
            }
          }
          fiber = fiber.return;
        }
      }
    } catch (_) {}

    // Extract DOM metadata
    const tagName = target.tagName ? target.tagName.toLowerCase() : 'div';
    const id = target.id ? `#${target.id}` : '';
    const textSnippet = target.innerText ? target.innerText.replace(/\s+/g, ' ').trim().slice(0, 50) : '';
    const ariaLabel = target.getAttribute('aria-label') || '';
    const titleAttr = target.getAttribute('title') || '';
    
    // Generate CSS selector path
    let selector = tagName;
    if (id) {
      selector += id;
    } else if (target.className && typeof target.className === 'string') {
      const classList = target.className.split(/\s+/).filter(c => c && !c.includes(':') && !c.includes('/'));
      if (classList.length > 0) {
        selector += `.${classList[0]}`;
      }
    }

    // Determine target primary component and probable file
    const primaryComponent = components[0] || (id ? id : tagName);
    const probableFile = COMPONENT_FILE_MAP[primaryComponent] || (components[1] ? COMPONENT_FILE_MAP[components[1]] : null);

    return {
      primaryComponent,
      componentsTree: components,
      probableFile,
      tagName,
      id,
      textSnippet: textSnippet || ariaLabel || titleAttr,
      selector,
    };
  }, []);

  // Global Mouse Hover Inspector while Pin Mode is Enabled
  useEffect(() => {
    if (!isEnabled) {
      setHoveredElementInfo(null);
      return;
    }

    const handleMouseMove = (e) => {
      // Don't inspect our own dev tool UI
      if (e.target.closest('#finlite-dev-pin-container')) {
        setHoveredElementInfo(null);
        return;
      }

      const rect = e.target.getBoundingClientRect();
      const info = introspectElement(e.target);

      if (info) {
        setHoveredElementInfo({
          ...info,
          rect: {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
            width: rect.width,
            height: rect.height,
          },
          cursor: { x: e.clientX, y: e.clientY },
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [isEnabled, introspectElement]);

  // Handle Right Click or Click to Drop Pin
  useEffect(() => {
    if (!isAuthorized) return;

    const handleContextMenu = (e) => {
      // If Dev Pin Mode is ON, or user is holding Alt key on right-click
      if (isEnabled || e.altKey) {
        // Ignore clicks inside our own dev UI
        if (e.target.closest('#finlite-dev-pin-container')) return;

        e.preventDefault();
        e.stopPropagation();

        const rect = e.target.getBoundingClientRect();
        const info = introspectElement(e.target);

        // Position relative to viewport and page
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        const pageX = e.clientX + scrollX;
        const pageY = e.clientY + scrollY;

        // Relative percentages for responsive persistence
        const pctX = (e.clientX / window.innerWidth) * 100;
        const pctY = ((e.clientY + scrollY) / Math.max(document.body.scrollHeight, 1)) * 100;

        const newPin = {
          id: `pin-${Date.now()}`,
          number: pins.length + 1,
          route: window.location.pathname || '/',
          timestamp: new Date().toISOString(),
          category: 'UI/UX',
          task: '',
          coords: { pageX, pageY, pctX, pctY },
          target: info || {
            primaryComponent: 'Element',
            componentsTree: [],
            probableFile: null,
            tagName: e.target.tagName ? e.target.tagName.toLowerCase() : 'div',
            selector: e.target.tagName ? e.target.tagName.toLowerCase() : 'element',
            textSnippet: (e.target.innerText || '').slice(0, 40),
          },
        };

        setActivePin(newPin);
        // Automatically ensure pins are visible
        setShowPins(true);
      }
    };

    window.addEventListener('contextmenu', handleContextMenu, true);
    return () => window.removeEventListener('contextmenu', handleContextMenu, true);
  }, [isAuthorized, isEnabled, pins.length, introspectElement]);

  // Construct Structured AI Markdown Prompt from Pin
  const generatePrompt = (pin) => {
    const compName = pin.target?.primaryComponent ? `<${pin.target.primaryComponent} />` : 'UI Element';
    const tree = pin.target?.componentsTree?.length ? pin.target.componentsTree.join(' > ') : compName;
    const fileHint = pin.target?.probableFile ? `\`${pin.target.probableFile}\`` : 'Inspect corresponding component file';
    const elementDesc = pin.target?.tagName ? `<${pin.target.tagName}>` : 'element';
    const textDesc = pin.target?.textSnippet ? ` (Content preview: "${pin.target.textSnippet}")` : '';

    return `### 🎯 Targeted Frontend Modification Request
- **Page Route:** \`${pin.route}\`
- **Target Component:** ${compName}
- **Component Hierarchy:** \`${tree}\`
- **Probable Source File:** ${fileHint}
- **Target Element:** \`${elementDesc}\`${textDesc}
- **DOM Selector:** \`${pin.target?.selector || 'unknown'}\`
- **Category:** ${pin.category || 'UI/UX'}

**Expected Task / Required Changes:**
${pin.task.trim() || 'Specify requested modification or bugfix.'}

---
*Generated by FinLITE Dev Pin Inspector for pair-programming & @/grill-me session.*`;
  };

  // Construct Unified Multi-Pin Batch Prompt
  const generateBatchPrompt = () => {
    if (pins.length === 0) return '';
    
    let text = `# 🎯 FinLITE Frontend Targeted Review & Modification Tasks\n\n`;
    text += `Found **${pins.length}** pinned target(s) across the application:\n\n`;

    pins.forEach((pin, idx) => {
      const compName = pin.target?.primaryComponent ? `<${pin.target.primaryComponent} />` : 'UI Element';
      const fileHint = pin.target?.probableFile ? `\`${pin.target.probableFile}\`` : 'Check component file';
      text += `### [Pin #${idx + 1}] ${compName} (Route: \`${pin.route}\`)\n`;
      text += `- **Target File:** ${fileHint}\n`;
      text += `- **Element:** \`<${pin.target?.tagName || 'el'}>\` ${pin.target?.textSnippet ? `("${pin.target.textSnippet}")` : ''}\n`;
      text += `- **Category:** ${pin.category || 'UI/UX'}\n`;
      text += `- **Task / Expected Behavior:**\n  ${pin.task || 'No task description provided.'}\n\n`;
    });

    text += `---\n*Please review and implement these modifications systematically.*`;
    return text;
  };

  const handleCopySingle = async (pin) => {
    const prompt = generatePrompt(pin);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedState('single');
      setTimeout(() => setCopiedState(null), 2500);
    } catch (err) {
      console.error('Failed to copy prompt to clipboard:', err);
    }
  };

  const handleCopyAll = async () => {
    const prompt = generateBatchPrompt();
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedState('all');
      setTimeout(() => setCopiedState(null), 2500);
    } catch (err) {
      console.error('Failed to copy all pins prompt:', err);
    }
  };

  const handleSaveActivePin = () => {
    if (!activePin) return;
    const exists = pins.some(p => p.id === activePin.id);
    let updated;
    if (exists) {
      updated = pins.map(p => p.id === activePin.id ? activePin : p);
    } else {
      updated = [...pins, activePin];
    }
    savePinsToStorage(updated);
    setActivePin(null);
  };

  const handleDeletePin = (pinId) => {
    const updated = pins.filter(p => p.id !== pinId).map((p, idx) => ({ ...p, number: idx + 1 }));
    savePinsToStorage(updated);
    if (activePin?.id === pinId) {
      setActivePin(null);
    }
  };

  const handleClearAllPins = () => {
    if (window.confirm('Clear all pinned modifications on this project?')) {
      savePinsToStorage([]);
      setActivePin(null);
      setIsDrawerOpen(false);
    }
  };

  if (!mounted || !isAuthorized) {
    return null;
  }

  return createPortal(
    <div id="finlite-dev-pin-container" className="select-none font-sans no-print">
      
      {/* 1. HOVER OUTLINE & TOOLTIP (While Pin Mode is ON) */}
      {isEnabled && hoveredElementInfo && hoveredElementInfo.rect && (
        <>
          <div
            ref={hoverOutlineRef}
            className="fixed pointer-events-none z-[999990] border-2 border-emerald-500 bg-emerald-500/10 rounded transition-all duration-75 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            style={{
              top: hoveredElementInfo.rect.top - window.scrollY,
              left: hoveredElementInfo.rect.left - window.scrollX,
              width: hoveredElementInfo.rect.width,
              height: hoveredElementInfo.rect.height,
            }}
          />
          <div
            className="fixed pointer-events-none z-[999991] px-2.5 py-1 rounded-md bg-zinc-900/95 text-white border border-emerald-500/50 shadow-xl backdrop-blur-md text-[11px] font-mono flex items-center gap-1.5"
            style={{
              top: Math.max(10, hoveredElementInfo.cursor.y - 32),
              left: Math.min(window.innerWidth - 220, hoveredElementInfo.cursor.x + 12),
            }}
          >
            <Crosshair className="w-3 h-3 text-emerald-400 animate-spin" />
            <span className="font-bold text-emerald-400">
              {hoveredElementInfo.primaryComponent ? `<${hoveredElementInfo.primaryComponent}>` : hoveredElementInfo.tagName}
            </span>
            <span className="text-zinc-400 text-[10px]">
              (Right-click to pin)
            </span>
          </div>
        </>
      )}

      {/* 2. PERSISTENT PIN MARKERS ON THE CANVAS */}
      {showPins && pins.map((pin) => {
        // Only render pins for current route (or matching root)
        const isCurrentRoute = pin.route === (window.location.pathname || '/');
        if (!isCurrentRoute) return null;

        return (
          <div
            key={pin.id}
            onClick={() => setActivePin(pin)}
            title={`Pin #${pin.number}: ${pin.task || pin.target?.primaryComponent || 'Target'}`}
            className="absolute z-[999980] -translate-x-1/2 -translate-y-1/2 cursor-pointer group animate-bounce-subtle"
            style={{
              left: `${pin.coords.pageX}px`,
              top: `${pin.coords.pageY}px`,
            }}
          >
            <div className="relative flex items-center justify-center">
              <span className="absolute w-8 h-8 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-900 group-hover:scale-125 transition-transform duration-200">
                {pin.number}
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white dark:border-zinc-900" />
            </div>

            {/* Hover Tooltip Card */}
            <div className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 p-2 rounded-lg bg-zinc-950/95 border border-zinc-800 text-white shadow-2xl backdrop-blur-md pointer-events-none text-left z-50">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Pin #{pin.number} • {pin.category}
              </div>
              <div className="text-xs font-semibold truncate text-zinc-200 mt-0.5">
                {pin.target?.primaryComponent ? `<${pin.target.primaryComponent} />` : pin.target?.selector}
              </div>
              {pin.task && (
                <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                  {pin.task}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 3. FLOATING DEV PIN LAUNCHER PILL (Bottom Right) */}
      <div className="fixed bottom-4 right-4 z-[999995] flex items-center gap-2">
        
        {/* Active Pins Summary Badge */}
        {pins.length > 0 && (
          <button
            type="button"
            onClick={() => setIsDrawerOpen(prev => !prev)}
            className="h-9 px-3 rounded-xl border flex items-center gap-2 text-xs font-semibold shadow-lg backdrop-blur-xl transition-all cursor-pointer bg-white/95 dark:bg-zinc-900/95 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:scale-105 active:scale-95"
            title="Open Pinned Targets Drawer"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>{pins.length} Pin{pins.length > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Dev Mode Toggle Pill */}
        <div className="flex items-center rounded-xl p-1 border shadow-xl backdrop-blur-xl bg-white/95 dark:bg-zinc-900/95 border-zinc-200/90 dark:border-zinc-800/90 text-zinc-800 dark:text-zinc-200">
          <button
            type="button"
            onClick={() => setIsEnabled(prev => !prev)}
            className={`h-7 px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              isEnabled 
                ? 'bg-emerald-600 text-white shadow-sm' 
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
            }`}
            title="Toggle Dev Pin Mode (Alt + D / Right-click on elements)"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isEnabled ? 'animate-spin' : ''}`} />
            <span>{isEnabled ? 'Pin Mode: ON' : 'Dev Pins'}</span>
          </button>

          {/* Quick Visibility Eye */}
          {pins.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPins(prev => !prev)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer ml-1"
              title={showPins ? 'Hide Pinned Overlays' : 'Show Pinned Overlays'}
            >
              {showPins ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
            </button>
          )}

          {/* Batch Copy Prompt Button */}
          {pins.length > 0 && (
            <button
              type="button"
              onClick={handleCopyAll}
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer ml-1"
              title="Copy All Pins as Prompt for Antigravity & /grill-me"
            >
              {copiedState === 'all' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 4. PIN EDITOR & PROMPT GENERATOR MODAL */}
      {activePin && (
        <div 
          className="fixed inset-0 z-[999998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActivePin(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl p-5 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/20">
                  #{activePin.number}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    Targeted UI/UX Modification
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Route: <span className="font-mono text-emerald-600 dark:text-emerald-400">{activePin.route}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePin(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Target Inspection Metadata */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  <Code className="w-3 h-3 text-emerald-500" /> Component Target
                </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {activePin.target?.primaryComponent ? `<${activePin.target.primaryComponent} />` : 'Element'}
                </span>
              </div>

              {activePin.target?.probableFile && (
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <FileCode2 className="w-3 h-3 text-indigo-400" /> Source File
                  </span>
                  <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 truncate max-w-[260px]">
                    {activePin.target.probableFile}
                  </span>
                </div>
              )}

              {activePin.target?.textSnippet && (
                <div className="text-[11px] text-zinc-600 dark:text-zinc-300 italic pt-1 truncate">
                  Preview: &ldquo;{activePin.target.textSnippet}&rdquo;
                </div>
              )}
            </div>

            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Modification Category
              </label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActivePin({ ...activePin, category: cat.id })}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      activePin.category === cat.id 
                        ? `${cat.color} font-bold ring-1 ring-emerald-500/50` 
                        : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Description Textarea */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                <span>Task / Expected Modification</span>
                <span className="text-[10px] font-normal text-zinc-400">Used as prompt input</span>
              </label>
              <textarea
                rows={4}
                value={activePin.task}
                onChange={(e) => setActivePin({ ...activePin, task: e.target.value })}
                placeholder="e.g. Change that to 'Financial Report' instead of liquidation. Ensure onExportReport is hooked and verify button styling..."
                className="w-full p-3 rounded-xl border bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none font-sans"
                autoFocus
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-1.5">
                {pins.some(p => p.id === activePin.id) && (
                  <button
                    type="button"
                    onClick={() => handleDeletePin(activePin.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Delete this pin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                
                {/* Copy AI Prompt Button */}
                <button
                  type="button"
                  onClick={() => handleCopySingle(activePin)}
                  className="px-3 py-2 rounded-xl border flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                  title="Copy formatted markdown prompt for Antigravity & /grill-me"
                >
                  {copiedState === 'single' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copy AI Prompt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Save Pin Button */}
              <button
                type="button"
                onClick={handleSaveActivePin}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-transform active:scale-95 cursor-pointer shadow-md shadow-emerald-600/20"
              >
                Drop Pin (Save)
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. ALL PINS DRAWER */}
      {isDrawerOpen && (
        <div className="fixed inset-y-0 right-0 z-[999999] w-80 md:w-96 bg-white/95 dark:bg-[#09090b]/95 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-2xl flex flex-col p-4 space-y-4 animate-in slide-in-from-right duration-200">
          
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Active Pins ({pins.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pins List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
            {pins.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 space-y-2">
                <MapPin className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs">No pins placed yet.</p>
                <p className="text-[11px] text-zinc-500">Turn on Pin Mode and right-click on any UI element to mark changes.</p>
              </div>
            ) : (
              pins.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => setActivePin(pin)}
                  className="p-3 rounded-xl border bg-zinc-50/50 hover:bg-zinc-100/70 dark:bg-zinc-900/50 dark:hover:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80 transition-all cursor-pointer space-y-1.5 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      Pin #{pin.number} • {pin.category}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {pin.route}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
                    <span className="truncate">
                      {pin.target?.primaryComponent ? `<${pin.target.primaryComponent} />` : pin.target?.selector}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  {pin.target?.probableFile && (
                    <div className="text-[10px] font-mono text-indigo-500 dark:text-indigo-400 truncate">
                      {pin.target.probableFile}
                    </div>
                  )}

                  {pin.task ? (
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 line-clamp-2 bg-white dark:bg-zinc-950 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                      {pin.task}
                    </div>
                  ) : (
                    <div className="text-[10px] italic text-zinc-400">
                      Click to add task description...
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Drawer Actions */}
          {pins.length > 0 && (
            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              <button
                type="button"
                onClick={handleCopyAll}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                {copiedState === 'all' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied All Pins Prompt!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy All Pins as AI Prompt</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleClearAllPins}
                className="w-full py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer text-center"
              >
                Clear All Pins
              </button>
            </div>
          )}

        </div>
      )}

    </div>,
    document.body
  );
}
