export function CompletionBanner({ onPlayAgain = () => window.location.reload() }: { onPlayAgain?: () => void }) {
  return <div className="completion-banner" role="status">
    <svg className="completion-frame" viewBox="0 0 300 140" preserveAspectRatio="none" aria-hidden="true">
      <path className="completion-frame-outer" d="M18 1H282L299 18V122L282 139H18L1 122V18Z" vectorEffect="non-scaling-stroke" />
      <path className="completion-frame-inner" d="M22 7H278L293 22V118L278 133H22L7 118V22Z" vectorEffect="non-scaling-stroke" />
    </svg>
    <strong>You’ve got it!</strong>
    <button type="button" className="text-button" onClick={onPlayAgain}>Play again</button>
  </div>;
}
