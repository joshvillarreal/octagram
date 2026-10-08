interface Props { words: string[]; total: number; colors?: Record<string, string[]> }
export function WordsPanel({ words, total, colors = {} }: Props) {
  return (
    <section className="words-panel" aria-labelledby="words-heading">
      <div className="section-heading"><h2 id="words-heading">Words</h2><span className="word-count" aria-live="polite" aria-atomic="true">{words.length}<span> / {total}</span></span></div>
      <div className="progress-track" aria-hidden="true"><div style={{ width: `${100 * words.length / total}%` }} /></div>
      <ul className="word-list">{words.map(word => <li key={word}><span className="word-colors" aria-hidden="true">{(colors[word] ?? []).map(color => <span key={color} className="word-color" style={{ backgroundColor: color }} />)}</span>{word.toUpperCase()}</li>)}</ul>
    </section>
  );
}
