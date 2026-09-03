export const styles = {
  container: "flex-1 overflow-auto p-3 md:p-6 pb-20 md:pb-28 bg-surface-sunken custom-scrollbar",
  wrapper: "space-y-8 w-full pb-16 md:pb-24",
  header:
    "flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-border-subtle pb-6 mb-2",
  headerSubtitleWrapper: "flex items-center gap-2 mb-2",
  headerSubtitleLeft: "text-[10px] font-normal tracking-widest text-primary uppercase",
  // `slate-300` tidak punya token setara; `content-subtle` (slate-400) yang
  // paling dekat. `text-border-*` tidak sah secara semantik — itu kosakata GARIS.
  headerSubtitleDot: "text-content-subtle",
  headerSubtitleRight: "text-[10px] font-medium text-content-muted italic",
  headerTitle: "text-3xl lg:text-4xl font-medium text-content tracking-tight leading-none mb-2",
  headerDescription: "text-content-muted font-medium text-sm tracking-wide max-w-2xl",
  healthCard:
    "flex items-center gap-4 bg-surface px-5 py-3 rounded-xl border border-border-subtle shadow-sm",
  healthProgress:
    "w-12 h-12 rounded-full border-4 border-primary/20 relative flex items-center justify-center shrink-0",
  healthLabelWrapper: "flex flex-col",
  healthLabelTop: "text-[10px] font-normal uppercase tracking-widest text-content-subtle",
  healthLabelBottom: "text-sm font-medium text-content-strong",
  statsGrid: "grid grid-cols-2 lg:grid-cols-4 gap-4",
  statCard:
    "bg-surface shadow-sm border border-border-faint/80 rounded-xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group",
  statCardRose:
    "bg-surface shadow-sm border border-danger/30 rounded-xl p-6 hover:shadow-md transition-shadow relative overflow-hidden group",
  statIconBackground:
    "absolute right-[-10px] bottom-[-10px] opacity-[0.03] transform group-hover:scale-110 transition-transform",
  statLabel:
    "text-[10px] font-normal uppercase tracking-widest text-content-subtle mb-4 flex items-center gap-2",
  statLabelRose:
    "text-[10px] font-normal uppercase tracking-widest text-danger-text mb-4 flex items-center gap-2",
  statValueWrapper: "flex items-end gap-2",
  statValue: "text-4xl font-medium text-content-strong leading-none",
  statValueRose: "text-4xl font-medium text-danger-text leading-none",
  statUnit: "text-xs font-medium text-content-subtle mb-1",
  statUnitRose: "text-xs font-medium text-danger-text mb-1",
  mainSection: "flex flex-col xl:flex-row gap-8 items-start",
  majorArea: "flex-1 w-full space-y-8",
  activeSprintCard:
    "bg-gradient-to-br from-slate-950 via-slate-900 to-primary-surface rounded-xl p-8 text-content-inverse relative overflow-hidden shadow-xl",
  activeSprintHeader:
    "relative z-10 flex flex-col md:flex-row gap-8 justify-between items-start md:items-center",
  // Kedua kartu di bawah MENUMPANG di atas `activeSprintCard` yang sengaja
  // bergradasi gelap di kedua mode. Lapisannya karena itu tetap berbasis PUTIH
  // transparan, bukan token `surface` — di mode gelap `surface` bernilai #121a2a,
  // sehingga lapisan dan garisnya akan gelap-di-atas-gelap alias hilang.
  activeSprintProgressCard:
    "bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 min-w-[240px] shadow-lg",
  burndownCard: "mt-8 bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 shadow-lg",
  chartGrid: "grid grid-cols-1 lg:grid-cols-2 gap-6",
  chartCard: "bg-surface shadow-sm border border-border-faint/80 rounded-xl p-6 flex flex-col",
  chartTitle:
    "text-[10px] font-normal uppercase tracking-widest text-content-strong flex items-center gap-2 mb-6",
  rightSidebar: "w-full xl:w-[380px] shrink-0 space-y-6",
  actionCard: "bg-surface shadow-sm border border-danger/30 rounded-xl p-6",
  actionCardSlate: "bg-surface shadow-sm border border-border-faint/80 rounded-xl p-6",
  // SENGAJA warna keras, BUKAN token. Kartu ini dirancang GELAP di kedua mode —
  // token `content-*` adalah kosakata TEKS, dan di mode gelap nilainya justru
  // terang (#e2e8f0), sehingga `text-content-inverse` di atasnya jadi tak terbaca.
  // Pemetaan otomatis sempat melakukan persis itu.
  darkCard:
    "bg-surface-inverse rounded-xl p-6 shadow-lg text-content-inverse relative overflow-hidden",
};
