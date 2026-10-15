export default function TechWaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden select-none transition-colors duration-300 bg-white dark:bg-[#09090b]"
    >
      {/* Light Mode ambient glow */}
      <div className="dark:hidden absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-50/50 to-transparent rounded-full blur-3xl opacity-50" />
      {/* Dark Mode ambient glow */}
      <div className="hidden dark:block absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-b from-emerald-950/30 to-transparent rounded-full blur-3xl opacity-40" />
    </div>
  );
}
