/**
 * Gaya sidebar. Menggunakan token semantik `sidebar-*` yang responsif terhadap
 * mode terang (Dark Navy #111c43) dan mode gelap (Clean Dark Charcoal #121a2a)
 * sesuai standar desain Velzon asli.
 */
export const styles = {
  aside:
    "fixed inset-y-0 left-0 z-50 transform md:translate-x-0 md:static bg-sidebar-surface border-r border-sidebar-border flex flex-col transition-all duration-300 text-sidebar-text select-none",
  asideMobileOpen: "translate-x-0 shadow-2xl",
  asideMobileClosed: "-translate-x-full",
  asideCollapsed: "md:w-20",
  asideExpanded: "md:w-64",
  collapseButton:
    "hidden md:absolute md:flex items-center justify-center -right-3 top-6 bg-sidebar-surface border border-sidebar-border rounded-full p-1.5 min-w-8 min-h-8 text-sidebar-text hover:text-sidebar-text-active shadow-md z-10 hover:scale-110 transition-transform cursor-pointer",
  logoWrapper: "p-5 flex items-center shrink-0 border-b border-sidebar-border",
  logoIcon:
    "w-8 h-8 bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 rounded-md flex items-center justify-center shrink-0 shadow-md",
  logoText: "font-medium text-2xl tracking-widest text-sidebar-text-active uppercase font-sans",
  nav: "flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar py-3",
  sectionLabelWrapper: "flex items-center justify-between mb-1.5 px-3 mt-5 group",
  sectionLabel: "text-[11px] font-semibold text-sidebar-title uppercase tracking-wider",
  newButton:
    "p-2 min-w-9 min-h-9 justify-center text-xs text-sidebar-text hover:text-sidebar-text-active hover:bg-sidebar-item-hover rounded transition-all flex items-center gap-1",
  projectButton: "w-full flex items-center py-2.5 min-h-11 rounded-md transition-all text-xs",
  projectButtonSelected: "bg-sidebar-item-active text-sidebar-text-active font-medium shadow-xs",
  projectButtonDefault:
    "text-sidebar-text hover:bg-sidebar-item-hover hover:text-sidebar-text-active",
  indicator: "w-2 h-2 rounded-full shrink-0",
  demoWrapper: "px-2 py-4",
  demoButton:
    "w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-sidebar-border bg-sidebar-item-hover text-sidebar-text hover:bg-sidebar-item-active hover:text-sidebar-text-active transition-all shadow-sm",
};
