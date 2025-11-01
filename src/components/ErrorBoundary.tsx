import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  err: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.err) {
      return (
        <div className="card border border-destructive/30 bg-red-50 dark:bg-red-950 p-4">
          <div className="font-semibold mb-2">حدث خطأ غير متوقع</div>
          <pre className="text-sm opacity-80 overflow-auto">
            {String(this.state.err?.message || this.state.err)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
