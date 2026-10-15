import { useState } from 'react';
import { convertSchema, sampleSchema } from './converter';

type Output = 'typescript' | 'zod';

export default function App() {
  const [source, setSource] = useState('');
  const [typescript, setTypescript] = useState('');
  const [zod, setZod] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function convert() {
    setError(''); setNotice(''); setTypescript(''); setZod('');
    try {
      const result = convertSchema(source);
      setTypescript(result.typescript); setZod(result.zod);
      setNotice(`Converted ${result.typeCount} GraphQL definitions successfully.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Conversion failed. Check the schema and try again.'); }
  }
  function clear() { setSource(''); setTypescript(''); setZod(''); setError(''); setNotice(''); }
  function loadSample() { setSource(sampleSchema); setTypescript(''); setZod(''); setError(''); setNotice('Sample schema loaded. Click Convert to generate output.'); }
  async function copy(kind: Output) {
    const value = kind === 'typescript' ? typescript : zod;
    if (!value) { setError('Convert a schema before copying output.'); return; }
    try { await navigator.clipboard.writeText(value); setNotice(`${kind === 'typescript' ? 'TypeScript' : 'Zod'} output copied to clipboard.`); setError(''); }
    catch { setError('Clipboard access was blocked. Select the output and copy it manually.'); }
  }
  function download(kind: Output) {
    const value = kind === 'typescript' ? typescript : zod;
    if (!value) { setError('Convert a schema before downloading output.'); return; }
    const blob = new Blob([value], { type: 'text/typescript;charset=utf-8' });
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a');
    anchor.href = url; anchor.download = kind === 'typescript' ? 'generated-types.ts' : 'generated-zod.ts';
    anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`${kind === 'typescript' ? 'TypeScript' : 'Zod'} file downloaded.`); setError('');
  }

  return <main className="page-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="Schema Studio home"><span className="brand-mark">{`{ }`}</span><span>Schema Studio</span></a><span className="privacy"><i /> Runs locally in your browser</span></header>
    <section className="intro" id="top"><div className="eyebrow"><span>DEVELOPER TOOL</span><span className="eyebrow-line" /></div>
      <h1>GraphQL Schema to<br className="desktop-break" /> <span>TypeScript + Zod</span> Converter</h1>
      <p>Turn GraphQL SDL into clear TypeScript types and ready-to-use Zod validators.<br className="desktop-break" /> Your schema stays right here in your browser.</p>
      <div className="feature-row"><span><b>01</b> Parse & validate</span><span><b>02</b> Generate both outputs</span><span><b>03</b> Copy or download</span></div>
    </section>
    <section className="workspace">
      <div className="input-panel panel">
        <div className="panel-head"><div><span className="step-label">STEP 01</span><h2>GraphQL schema</h2></div><span className="language-pill"><i /> SDL</span></div>
        <p className="panel-hint">Paste your schema definition language below to get started.</p>
        <div className="editor-wrap"><div className="editor-gutter" aria-hidden="true">{Array.from({ length: Math.max(source.split('\n').length, 1) }, (_, i) => <span key={i}>{i + 1}</span>)}</div><textarea aria-label="GraphQL schema input" spellCheck={false} value={source} onChange={event => setSource(event.target.value)} placeholder={'# Define your GraphQL schema here\n\ntype User {\n  id: ID!\n  name: String!\n}'} /></div>
        <div className="editor-footer"><span>{source.length.toLocaleString()} characters</span><div className="secondary-actions"><button className="text-button" onClick={loadSample}><span className="sample-icon">✦</span> Load sample</button><button className="text-button" onClick={clear}>Clear</button></div></div>
        <button className="convert-button" onClick={convert}><span>Convert schema</span><span className="arrow">→</span></button>
      </div>
      <div className="outputs">
        <OutputPanel title="TypeScript" subtitle="Interfaces & types" code={typescript} tag=".ts" onCopy={() => copy('typescript')} onDownload={() => download('typescript')} />
        <OutputPanel title="Zod schemas" subtitle="Validators & inferred types" code={zod} tag="ZOD" onCopy={() => copy('zod')} onDownload={() => download('zod')} />
      </div>
    </section>
    {(error || notice) && <div className={`message ${error ? 'error' : 'success'}`} role="status"><span>{error ? '!' : '✓'}</span>{error || notice}</div>}
    <footer className="bottom-note"><span className="lock">⌑</span><span><strong>Private by design.</strong> Parsing and conversion happen entirely on your device. Nothing is uploaded.</span><span className="footer-version">GRAPHQL SDL&nbsp; · &nbsp;TYPESCRIPT&nbsp; · &nbsp;ZOD</span></footer>
  </main>;
}

function OutputPanel({ title, subtitle, code, tag, onCopy, onDownload }: { title: string; subtitle: string; code: string; tag: string; onCopy: () => void; onDownload: () => void }) {
  return <section className="panel output-panel"><div className="panel-head"><div><span className="step-label">GENERATED OUTPUT</span><h2>{title}</h2></div><span className="language-pill output-tag">{tag}</span></div><p className="panel-hint">{subtitle}</p>
    <div className={`code-wrap ${code ? '' : 'empty'}`}><pre>{code || <span className="empty-state"><span className="empty-braces">{'{ }'}</span><span>Your generated {title} will appear here</span><small>Paste a schema and click Convert</small></span>}</pre></div>
    <div className="output-actions"><button className="copy-button" onClick={onCopy} title={`Copy ${title} output`}><span>▣</span> Copy</button><button className="download-button" onClick={onDownload}><span>↓</span> Download .ts</button></div>
  </section>;
}
