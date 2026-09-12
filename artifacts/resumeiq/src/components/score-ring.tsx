export function ScoreRing({ score, label, accent = false }: { score: number; label: string; accent?: boolean }) {
  const safeScore = Math.max(0, Math.min(100, score));
  return (
    <div
      className="relative grid h-[138px] w-[138px] place-items-center rounded-full"
      style={{ background: `conic-gradient(${accent ? 'hsl(var(--accent))' : 'hsl(var(--primary))'} ${safeScore * 3.6}deg, hsl(var(--secondary)) 0deg)` }}
      data-testid={`score-ring-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="grid h-[112px] w-[112px] place-items-center rounded-full bg-card text-center">
        <div>
          <div className="font-display text-[39px] leading-none tracking-[-0.06em]">{Math.round(safeScore)}</div>
          <div className="mt-1 font-mono-ui text-[9px] uppercase tracking-[0.13em] text-muted-foreground">{label}</div>
        </div>
      </div>
    </div>
  );
}