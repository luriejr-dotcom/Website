import { useMemo, useState } from 'react';
import { LineChart, Sparkline, Donut } from './Charts.jsx';
import {
  ASSETS, COLORS, SHOCKS, INDEX_NAME, INDEX_BASE, START_CASH, RF,
  metrics, fmtDate, usd, pct,
} from './sim.js';

const RANGES = { '1M': 21, '3M': 63, '6M': 126, ALL: Infinity };
const SPEEDS = [1, 5, 20];
const last = (a) => a[a.length - 1];
const tone = (v) => (v >= 0 ? 'up' : 'down');

function RangeTabs({ value, onChange }) {
  return (
    <div className="tabs" role="group" aria-label="Chart range">
      {Object.keys(RANGES).map((r) => (
        <button key={r} className={r === value ? 'on' : ''} aria-pressed={r === value} onClick={() => onChange(r)}>{r}</button>
      ))}
    </div>
  );
}

function Ticket({ asset, price, cash, held, dispatch }) {
  const [qty, setQty] = useState('10');
  const q = Math.max(0, Math.floor(Number(qty) || 0));
  const maxBuy = Math.floor(cash / price);
  const canBuy = q > 0 && q <= maxBuy;
  const canSell = q > 0 && q <= held;
  const send = (side) => dispatch({ type: 'trade', side, t: asset.t, qty: q });

  return (
    <div className="panel ticket">
      <div className="panel-head"><h3>Order ticket</h3><span className="muted">Market order</span></div>
      <div className="ticket-name">
        <b>{asset.t}</b>
        <span className="muted">{asset.name}</span>
      </div>
      <label className="field">
        <span>Shares</span>
        <input type="number" min="1" step="1" inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)} />
      </label>
      <div className="quick">
        {[10, 50, 100].map((n) => <button key={n} onClick={() => setQty(String(n))}>{n}</button>)}
        <button onClick={() => setQty(String(Math.max(maxBuy, 0)))}>Max</button>
      </div>
      <dl className="kv">
        <div><dt>Price</dt><dd>{usd(price)}</dd></div>
        <div><dt>Order value</dt><dd>{usd(q * price)}</dd></div>
        <div><dt>Cash available</dt><dd>{usd(cash)}</dd></div>
        <div><dt>You hold</dt><dd>{held.toLocaleString()} sh</dd></div>
      </dl>
      <div className="ticket-btns">
        <button className="btn buy" disabled={!canBuy} onClick={() => send('buy')}>Buy</button>
        <button className="btn sell" disabled={!canSell} onClick={() => send('sell')}>Sell</button>
      </div>
      <p className="hint" aria-live="polite">
        {q === 0 ? 'Enter a share count.' : !canBuy && !canSell ? `Max buy is ${maxBuy.toLocaleString()} sh. You hold ${held.toLocaleString()}.`
          : !canBuy ? `Not enough cash to buy ${q.toLocaleString()} (max ${maxBuy.toLocaleString()}).`
          : !canSell ? `You only hold ${held.toLocaleString()} sh, so sell is off.` : 'Fills instantly at the current price. No fees.'}
      </p>
    </div>
  );
}

export default function Simulator({ state, dispatch, playing, setPlaying, speed, setSpeed }) {
  const [sel, setSel] = useState('ORBD');
  const [range, setRange] = useState('3M');
  const [perfRange, setPerfRange] = useState('6M');

  const asset = ASSETS.find((a) => a.t === sel);
  const series = state.prices[sel];
  const price = last(series);
  const held = state.holdings[sel]?.shares || 0;

  const cut = (arr, r) => (RANGES[r] === Infinity ? arr : arr.slice(-(RANGES[r] + 1)));
  const labelsFor = (len) => Array.from({ length: len }, (_, i) => fmtDate(state.day - (len - 1 - i)));

  const view = cut(series, range);
  const rangeChg = last(view) / view[0] - 1;

  const equity = last(state.equity);
  const prevEquity = state.equity[state.equity.length - 2] ?? equity;
  const m = useMemo(() => metrics(state.equity, state.index), [state.equity, state.index]);

  const perfEq = cut(state.equity, perfRange);
  const perfIdxRaw = cut(state.index, perfRange);
  // Benchmark = "what if the same money had been in the index", rebased to the window start.
  const perfBench = perfIdxRaw.map((v) => (v / perfIdxRaw[0]) * perfEq[0]);

  const rows = Object.entries(state.holdings)
    .map(([t, h]) => {
      const p = last(state.prices[t]);
      return { t, ...h, price: p, value: h.shares * p, pl: (p - h.cost) * h.shares, plPct: p / h.cost - 1 };
    })
    .sort((a, b) => b.value - a.value);

  const parts = [
    ...rows.map((r) => ({ label: r.t, value: r.value, color: COLORS[r.t] })),
    { label: 'Cash', value: state.cash, color: COLORS.CASH },
  ].filter((p) => p.value > 0.005);

  const idxChg = last(state.index) / state.index[state.index.length - 2] - 1;

  return (
    <div className="sim">
      {/* controls */}
      <div className="bar">
        <div className="bar-left">
          <span className={`live ${playing ? 'on' : ''}`}><i />{playing ? 'Live' : 'Paused'}</span>
          <span className="bar-date">{fmtDate(state.day)} <em>Day {state.day}</em></span>
          <span className="bar-idx">{INDEX_NAME} <b>{last(state.index).toFixed(2)}</b> <span className={tone(idxChg)}>{pct(idxChg)}</span></span>
        </div>
        <div className="bar-right">
          <button className="chip solid" onClick={() => setPlaying(!playing)}>{playing ? 'Pause' : 'Play'}</button>
          <div className="tabs" role="group" aria-label="Simulation speed">
            {SPEEDS.map((s) => (
              <button key={s} className={s === speed ? 'on' : ''} aria-pressed={s === speed} onClick={() => setSpeed(s)}>{s}x</button>
            ))}
          </div>
          <button className="chip" onClick={() => dispatch({ type: 'reset' })}>Reset</button>
        </div>
      </div>

      <div className="shockbar">
        <span className="eyebrow">Fire a scenario</span>
        {Object.entries(SHOCKS).map(([k, s]) => (
          <button key={k} className="chip" onClick={() => dispatch({ type: 'shock', kind: k, ticker: sel })}>
            {s.label}{k === 'beat' ? ` (${sel})` : ''}
          </button>
        ))}
        <span className="wire" aria-live="polite">
          {state.news[0] ? <><b>{fmtDate(state.news[0].day)}</b> {state.news[0].text}</> : 'No events yet. Markets are drifting on their own.'}
        </span>
      </div>

      {/* headline stats */}
      <div className="stats">
        <div>
          <span className="eyebrow">Portfolio value</span>
          <strong>{usd(equity)}</strong>
          <span className="sub"><span className={tone(equity - prevEquity)}>{usd(equity - prevEquity)}</span> today</span>
          <Sparkline data={state.equity.slice(-60)} color="#fff" width={120} height={28} />
        </div>
        <div>
          <span className="eyebrow">Total return</span>
          <strong className={tone(m.totalReturn)}>{pct(m.totalReturn)}</strong>
          <span className="sub">{INDEX_NAME} {pct(m.benchReturn)}</span>
          <span className="sub">{m.totalReturn >= m.benchReturn ? 'Ahead of' : 'Behind'} benchmark by {Math.abs((m.totalReturn - m.benchReturn) * 100).toFixed(2)} pts</span>
        </div>
        <div>
          <span className="eyebrow">Sharpe ratio</span>
          <strong>{m.sharpe.toFixed(2)}</strong>
          <span className="sub">Volatility {(m.vol * 100).toFixed(1)}% a year</span>
          <span className="sub">Risk-free {(RF * 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="eyebrow">Max drawdown</span>
          <strong className="down">{(m.maxDD * 100).toFixed(2)}%</strong>
          <span className="sub">Beta {m.beta.toFixed(2)} vs {INDEX_NAME}</span>
          <span className="sub">Alpha <span className={tone(m.alpha)}>{pct(m.alpha, 1)}</span> a year</span>
        </div>
      </div>

      {/* market + chart + ticket */}
      <div className="grid g-a">
        <div className="panel watch">
          <div className="panel-head"><h3>Market</h3><span className="muted">1D</span></div>
          <ul>
            {ASSETS.map((a) => {
              const s = state.prices[a.t];
              const p = last(s);
              const chg = p / s[s.length - 2] - 1;
              return (
                <li key={a.t}>
                  <button className={a.t === sel ? 'on' : ''} onClick={() => setSel(a.t)} aria-pressed={a.t === sel}>
                    <span className="w-id"><b>{a.t}</b><small>{a.sector}</small></span>
                    <Sparkline data={s.slice(-30)} color={s[s.length - 1] >= s[Math.max(0, s.length - 30)] ? '#3ddc97' : '#ff5c5c'} width={56} height={20} />
                    <span className="w-px"><b>{p.toFixed(2)}</b><small className={tone(chg)}>{pct(chg)}</small></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">{asset.name} · {asset.sector} · Beta {asset.beta.toFixed(2)}</span>
              <div className="big">
                {usd(price)}
                <span className={`pill ${tone(rangeChg)}`}>{rangeChg >= 0 ? '▲' : '▼'} {Math.abs(rangeChg * 100).toFixed(2)}% <small>{range}</small></span>
              </div>
            </div>
            <RangeTabs value={range} onChange={setRange} />
          </div>
          <LineChart
            series={[{ label: asset.t, color: COLORS[sel], data: view, fill: true }]}
            labels={labelsFor(view.length)} height={300} fmt={(v) => v.toFixed(2)} />
        </div>

        <Ticket asset={asset} price={price} cash={state.cash} held={held} dispatch={dispatch} />
      </div>

      {/* performance + allocation */}
      <div className="grid g-b">
        <div className="panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">Portfolio vs benchmark</span>
              <div className="legend">
                <span><i style={{ background: '#fff' }} />Portfolio</span>
                <span><i className="dash" />{INDEX_NAME} (same starting value)</span>
              </div>
            </div>
            <RangeTabs value={perfRange} onChange={setPerfRange} />
          </div>
          <LineChart
            series={[
              { label: 'Portfolio', color: '#ffffff', data: perfEq, fill: true },
              { label: INDEX_NAME, color: '#8a9099', data: perfBench, dashed: true },
            ]}
            labels={labelsFor(perfEq.length)} height={260} fmt={(v) => `$${(v / 1000).toFixed(1)}k`} />
        </div>

        <div className="panel alloc">
          <div className="panel-head"><h3>Allocation</h3><span className="muted">{parts.length - (state.cash > 0.005 ? 1 : 0)} positions</span></div>
          <div className="alloc-body">
            <Donut parts={parts} centerTop="Total" centerMain={`$${(equity / 1000).toFixed(1)}k`} />
            <ul className="alloc-list">
              {parts.map((p) => (
                <li key={p.label}>
                  <i style={{ background: p.color }} />
                  <span>{p.label}</span>
                  <b>{((p.value / equity) * 100).toFixed(1)}%</b>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* holdings + log */}
      <div className="grid g-b">
        <div className="panel">
          <div className="panel-head"><h3>Holdings</h3><span className="muted">Cash {usd(state.cash)}</span></div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Ticker</th><th>Shares</th><th>Avg cost</th><th>Price</th><th>Value</th><th>P&amp;L</th><th>Weight</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan="7" className="empty">No positions. Pick a stock and buy some shares.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.t} onClick={() => setSel(r.t)} className={r.t === sel ? 'on' : ''}>
                    <td><i className="dot" style={{ background: COLORS[r.t] }} /><b>{r.t}</b></td>
                    <td>{r.shares.toLocaleString()}</td>
                    <td>{usd(r.cost)}</td>
                    <td>{usd(r.price)}</td>
                    <td>{usd(r.value, 0)}</td>
                    <td className={tone(r.pl)}>{usd(r.pl, 0)} <small>{pct(r.plPct, 1)}</small></td>
                    <td>{((r.value / equity) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel log">
          <div className="panel-head"><h3>Trade log</h3><span className="muted">Started with {usd(START_CASH, 0)}</span></div>
          <ul>
            {state.trades.slice(0, 7).map((t, i) => (
              <li key={`${t.day}-${i}`}>
                <span className={`side ${t.side}`}>{t.side}</span>
                <span><b>{t.qty.toLocaleString()} {t.t}</b> @ {usd(t.price)}</span>
                <span className="muted">{fmtDate(t.day)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="disclaimer">
        All companies, tickers and prices here are made up and generated by the model below. The {INDEX_NAME} starts at {INDEX_BASE.toLocaleString()}. Nothing on this page is investment advice.
      </p>
    </div>
  );
}
