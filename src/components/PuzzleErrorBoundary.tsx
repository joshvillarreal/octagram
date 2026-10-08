import { Component } from 'react';
import type { ReactNode } from 'react';

export class PuzzleErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <main className="page-shell"><h1>Octagram</h1><div className="error-banner" role="alert"><strong>Unable to start this puzzle.</strong><span>{this.state.error.message}</span></div><p>Check the pieces and solution constructions in the board JSON.</p></main>;
    return this.props.children;
  }
}
