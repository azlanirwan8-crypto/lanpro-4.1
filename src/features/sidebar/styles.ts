/**
 * Gaya sidebar. Sidebar adalah permukaan BERMEREK yang gelap di KEDUA mode
 * (`bg-primary-surface` = #405189 tetap), jadi seluruh teks di atasnya memakai
 * kosakata INVERSE — bukan `content-*` yang gelap, dan bukan hex mentah.
 *
 * Hex yang dulu dipakai:
 *   #abb9e8 -> content-inverse-muted   teks menu biasa; terukur rasio 3.93
 *   #878a99 -> content-inverse-muted   label bagian; terukur rasio 2.22
 *   #364574 -> border-inverse          garis pemisah
 * Ketiganya di bawah ambang 4.5, diukur pada sesi login sungguhan dalam mode
 * gelap — bukan diperkirakan dari kode.
 */
export const styles = {
  aside:
    "fixed inset-y-0 left-0 z-50 transform md:translate-x-0 md:static bg-primary-surface border-r border-inverse flex flex-col transition-all duration-300 text-content-inverse-muted select-none",
  asideMobileOpen: "translate-x-0 shadow-2xl",
  asideMobileClosed: "-translate-x-full",
  asideCollapsed: "md:w-20",
  asideExpanded: "md:w-64",
  collapseButton:
    "hidden md:absolute md:flex items-center justify-center -right-3 top-6 bg-border-inverse border border-content-inverse/20 rounded-full p-1.5 min-w-8 min-h-8 text-content-inverse-muted hover:text-content-inverse shadow-md z-10 hover:scale-110 transition-transform cursor-pointer",
  logoWrapper: "p-5 flex items-center shrink-0 border-b border-inverse/70",
  logoIcon:
    "w-8 h-8 bg-gradient-to-tr from-indigo-500 via-blue-500 to-cyan-400 rounded-md flex items-center justify-center shrink-0 shadow-md",
  logoText: "font-medium text-2xl tracking-widest text-content-inverse uppercase font-sans",
  nav: "flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar py-3",
  sectionLabelWrapper: "flex items-center justify-between mb-1.5 px-3 mt-5 group",
  sectionLabel: "text-[11px] font-medium text-content-inverse-muted uppercase tracking-wider",
  newButton:
    "p-2 min-w-9 min-h-9 justify-center text-xs text-content-inverse-muted hover:text-content-inverse hover:bg-content-inverse/10 rounded transition-all flex items-center gap-1",
  projectButton: "w-full flex items-center py-2.5 min-h-11 rounded-md transition-all text-sm",
  projectButtonSelected:
    "bg-border-inverse text-content-inverse font-medium shadow-sm border-l-3 border-amber-400",
  projectButtonDefault:
    "text-content-inverse-muted hover:bg-content-inverse/5 hover:text-content-inverse",
  indicator: "w-2 h-2 rounded-full shrink-0",
  demoWrapper: "px-2 py-4",
  demoButton:
    "w-full flex items-center justify-between gap-2 p-3 rounded-xl border border-blue-400/20 bg-white/5 text-blue-200 hover:bg-content-inverse/10 hover:text-content-inverse transition-all shadow-sm",
};
