"use client";
import { Component, Suspense, lazy, useState } from "react";
import type { ReactNode, ErrorInfo } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

interface ErrorBoundaryState {
  crashed: boolean;
}

class SplineErrorBoundary extends Component<{ children: ReactNode; className?: string }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { crashed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("SplineScene failed to load:", error, info);
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className={`w-full h-full flex items-center justify-center ${this.props.className ?? ""}`}>
          <div style={{ textAlign: "center", opacity: 0.35, color: "white" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✦</div>
            <div style={{ fontSize: "0.75rem" }}>3D scene unavailable</div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function SplineScene({ scene, className }: SplineSceneProps) {
  const [loaded, setLoaded] = useState(false);

  if (!loaded) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center ${className ?? ""}`}
        style={{
          background: "radial-gradient(ellipse at 60% 40%, rgba(99,102,241,0.18) 0%, transparent 70%), radial-gradient(ellipse at 30% 70%, rgba(139,92,246,0.12) 0%, transparent 60%)",
        }}
      >
        <button
          onClick={() => setLoaded(true)}
          style={{
            padding: "0.6rem 1.4rem",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.75)",
            fontSize: "0.8rem",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            letterSpacing: "0.04em",
          }}
        >
          Load 3D Scene
        </button>
      </div>
    );
  }

  return (
    <SplineErrorBoundary className={className}>
      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center">
            <span className="loader" />
          </div>
        }
      >
        <Spline scene={scene} className={className} />
      </Suspense>
    </SplineErrorBoundary>
  );
}
