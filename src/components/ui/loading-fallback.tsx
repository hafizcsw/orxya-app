export function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}

export function ComponentLoadingFallback() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="space-y-3 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground text-xs">يتم التحميل...</p>
      </div>
    </div>
  );
}
