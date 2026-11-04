export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded-xl bg-secondary/60" />
          <div className="h-4 w-80 rounded-lg bg-secondary/40" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-secondary/60" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-28 rounded-2xl bg-card border border-border/60" />
        <div className="h-28 rounded-2xl bg-card border border-border/60" />
        <div className="h-28 rounded-2xl bg-card border border-border/60" />
        <div className="h-28 rounded-2xl bg-card border border-border/60" />
      </div>

      <div className="h-96 rounded-2xl bg-card border border-border/60" />
    </div>
  );
}