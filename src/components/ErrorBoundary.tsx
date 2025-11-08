import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  err: Error | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null, errorCount: 0 };

  static getDerivedStateFromError(err: Error): State {
    return { err, errorCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    
    // Track error count
    this.setState(prev => ({
      errorCount: prev.errorCount + 1
    }));

    // Log to external service if needed
    if (typeof window !== 'undefined' && (window as any).posthog) {
      (window as any).posthog.capture('app_error', {
        error: error.message,
        stack: error.stack,
        info: errorInfo
      });
    }
  }

  handleRetry = () => {
    this.setState({ err: null, errorCount: 0 });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.err) {
      // Too many errors - suggest full reload
      if (this.state.errorCount > 3) {
        return (
          <div className="min-h-screen flex items-center justify-center p-6 bg-background">
            <div className="max-w-md w-full text-center space-y-6">
              <AlertTriangle className="w-16 h-16 text-destructive mx-auto" />
              <div>
                <h2 className="text-2xl font-bold mb-2">خطأ متكرر</h2>
                <p className="text-muted-foreground mb-6">
                  حدثت عدة أخطاء. يُنصح بإعادة تحميل الصفحة.
                </p>
                <button
                  onClick={this.handleReload}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  إعادة تحميل الصفحة
                </button>
              </div>
            </div>
          </div>
        );
      }

      // Single error - offer retry
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full space-y-6">
            <div className="flex items-start gap-4 p-6 rounded-xl border border-destructive/30 bg-destructive/5">
              <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg mb-1">حدث خطأ غير متوقع</h3>
                  <p className="text-sm text-muted-foreground">
                    نعتذر عن هذا الإزعاج. يمكنك المحاولة مرة أخرى.
                  </p>
                </div>
                
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    تفاصيل الخطأ التقنية
                  </summary>
                  <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto text-xs">
                    {String(this.state.err?.message || this.state.err)}
                  </pre>
                </details>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={this.handleRetry}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex-1"
                  >
                    إعادة المحاولة
                  </button>
                  <button
                    onClick={this.handleReload}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors flex-1"
                  >
                    إعادة التحميل
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
