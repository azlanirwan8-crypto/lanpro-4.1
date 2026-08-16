export const styles = {
  container:
    "flex flex-col bg-surface dark:bg-surface-inverse rounded-md border border-subtle/80 dark:border-border-inverse shadow-xs font-sans relative flex-1 min-h-[500px] overflow-hidden",
  toolbar:
    "flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-subtle/80 bg-slate-50/50 dark:bg-slate-800/30 shrink-0",
  searchWrapper: "relative group",
  searchInput:
    "pl-9 pr-4 py-2 bg-surface dark:bg-slate-950 border border-border-subtle dark:border-border-inverse rounded-md text-xs font-medium text-content-body dark:text-content-inverse-muted w-full sm:w-64 placeholder:font-normal placeholder:text-content-subtle focus:ring-1 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-2xs",
  filterPill:
    "px-2.5 py-1 bg-indigo-500/10 dark:bg-indigo-950/20 text-primary dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900 rounded-md text-[10px] font-medium uppercase tracking-tight shadow-2xs",
  filterPillAmber:
    "px-2.5 py-1 bg-amber-500/10 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 rounded-md text-[10px] font-medium uppercase tracking-tight shadow-2xs",
  tableWrapper:
    "overflow-auto w-full custom-scrollbar relative flex-1 min-h-0 max-h-[calc(100vh-220px)]",
  table: "w-full text-left border-collapse flex-none",
  tableHeader:
    "bg-primary-surface/5 dark:bg-slate-950/50 border-b border-primary/15 sticky top-0 z-10 shadow-2xs",
  tableHeaderCell:
    "group relative px-4 py-3 text-[11px] font-semibold text-primary dark:text-content-subtle uppercase tracking-wider border-r border-primary/10 dark:border-border-inverse",
  tableRow:
    "group hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-all duration-150 cursor-default border-b border-border-faint dark:border-border-inverse",
  selectedTableRow: "bg-primary-surface/5 dark:bg-primary-surface/20",
  inlineAddRow:
    "bg-surface dark:bg-surface-inverse group/inline-add animate-in fade-in slide-in-from-top-1 duration-200 relative overflow-visible",
  inlineAddBorderedCell:
    "p-0 border-r border-slate-100/50 dark:border-border-inverse relative border-y-2 border-primary",
  inlineAddInput:
    "w-full bg-transparent border-none text-xs font-medium text-content-strong dark:text-content-inverse-strong placeholder:text-content-subtle focus:ring-0 outline-none",
};
