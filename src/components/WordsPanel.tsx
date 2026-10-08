interface Props { words: string[]; total: number; colors?: Record<string, string[]>; highlightedWord?: string | null; onHighlightWord?: (word: string) => void }
export function WordsPanel({ words, total, colors = {}, highlightedWord, onHighlightWord }: Props) {
  return (
    <section className="words-panel" aria-labelledby="words-heading">
      <div className="section-heading"><h2 id="words-heading">Words</h2><span className="word-count" aria-live="polite" aria-atomic="true">{words.length}<span> / {total}</span></span></div>
      <div className="progress-track" aria-hidden="true"><div style={{ width: `${100 * words.length / total}%` }} /></div>
      <ul className="word-list">{words.map(word => <li key={word}><button type="button" className="word-route-button" aria-pressed={highlightedWord === word} aria-label={`Highlight ${word.toUpperCase()}`} onClick={() => onHighlightWord?.(word)}><span className="word-colors" aria-hidden="true">{(colors[word] ?? []).map(color => <span key={color} className="word-color" style={{ backgroundColor: color }} />)}</span>{word.toUpperCase()}</button></li>)}</ul>
    </section>
  );
}
