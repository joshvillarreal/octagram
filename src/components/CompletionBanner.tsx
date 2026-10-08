export function CompletionBanner({ count }: { count: number }) {
  return <div className="completion-banner" role="status"><strong>Octagram complete!</strong><span>{count} / {count} words, all at once.</span></div>;
}
