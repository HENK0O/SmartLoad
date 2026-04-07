"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-red-500/10">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {this.state.error?.message || "Une erreur inattendue s'est produite."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-white"
              style={{
                background: "linear-gradient(135deg, hsl(142 71% 45%), hsl(142 71% 35%))",
              }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
