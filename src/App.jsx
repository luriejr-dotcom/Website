import { useEffect, useReducer, useState } from 'react';
import Simulator from './Simulator.jsx';
import { ASSETS, INDEX_NAME, createSim, reducer, pct } from './sim.js';
import { PROFILE, PHOTOS } from './profile.js';

const last = (a) => a[a.length - 1];

function Tape({ state }) {
  const items = [
    { t: INDEX_NAME, s: state.index },
    ...ASSETS.map((a) => ({ t: a.t, s: state.prices[a.t] })),
  ].map(({ t, s }) => ({ t, p: last(s), c: last(s) / s[s.length - 2] - 1 }));
  const run = (hidden) => (
    <div className="tape-run" aria-hidden={hidden}>
      {items.map((i) => (
        <span key={i.t}>
          <b>{i.t}</b> {i.p.toFixed(2)} <em className={i.c >= 0 ? 'up' : 'down'}>{pct(i.c)}</em>
        </span>
      ))}
    </div>
  );
  // Two copies side by side; the CSS slides them left by one copy's width, so it loops with no jump.
  return <div className="tape">{run(false)}{run(true)}</div>;
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, createSim);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [scrolled, setScrolled] = useState(false);

  // One tick = one trading day.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => dispatch({ type: 'tick' }), 1000 / speed);
    return () => clearInterval(id);
  }, [playing, speed]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const { links } = PROFILE;

  return (
    <>
      <header className={`nav ${scrolled ? 'solid' : ''}`}>
        <a href="#top" className="brand">{PROFILE.name.toUpperCase()} <span>/ MARKET LAB</span></a>
        <nav aria-label="Sections">
          <a href="#simulator">Simulator</a>
          <a href="#model">Model</a>
          <a href="#about">About</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero full" style={{ backgroundImage: `url(${PHOTOS.hero})` }}>
          <div className="shade" />
          <div className="hero-copy">
            <span className="eyebrow">A market simulator by a finance student</span>
            <h1>Run the market.<br />Manage the risk.</h1>
            <p>Eight stocks, one index, and a live portfolio tracker. Trade it, shock it with a rate hike, and watch what happens to Sharpe, beta and drawdown.</p>
            <div className="cta">
              <a className="btn-line" href="#simulator">Launch simulator</a>
              <a className="btn-ghost" href="#model">How it works</a>
            </div>
          </div>
          <Tape state={state} />
        </section>

        <section id="simulator" className="section">
          <div className="section-head">
            <span className="eyebrow">01 / Simulator</span>
            <h2>Trading desk</h2>
            <p>You start with a sample portfolio and six months of history. Each tick is one trading day.</p>
          </div>
          <Simulator state={state} dispatch={dispatch} playing={playing} setPlaying={setPlaying} speed={speed} setSpeed={setSpeed} />
        </section>

        <section id="model" className="full band" style={{ backgroundImage: `url(${PHOTOS.model})` }}>
          <div className="shade heavy" />
          <div className="band-copy">
            <span className="eyebrow">02 / Model</span>
            <h2>One factor drives it all</h2>
            <p className="formula">r<sub>i</sub> = α<sub>i</sub> + β<sub>i</sub> · r<sub>m</sub> + ε<sub>i</sub></p>
            <div className="cols">
              <div>
                <span className="num">01</span>
                <h3>Price engine</h3>
                <p>The index follows geometric Brownian motion with 8% drift and 16% volatility a year. Each stock's daily return is its beta times the market move, plus its own random noise.</p>
              </div>
              <div>
                <span className="num">02</span>
                <h3>Risk analytics</h3>
                <p>Volatility, Sharpe, beta, Jensen's alpha and max drawdown are recalculated from the portfolio's daily returns on every tick. No numbers are hard-coded.</p>
              </div>
              <div>
                <span className="num">03</span>
                <h3>Scenario shocks</h3>
                <p>A rate hike hits long-duration growth names and helps banks. A selloff scales with beta. It shows why two portfolios with the same return can carry very different risk.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="full band about" style={{ backgroundImage: `url(${PHOTOS.about})` }}>
          <div className="shade heavy" />
          <div className="band-copy">
            <span className="eyebrow">03 / About</span>
            <h2>{PROFILE.name}</h2>
            <p className="lead">{PROFILE.blurb}</p>
            <dl className="facts">
              {PROFILE.facts.map((f) => (
                <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>
              ))}
            </dl>
            <div className="cta">
              {links.linkedin && <a className="btn-line" href={links.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
              {links.email && <a className="btn-line" href={`mailto:${links.email}`}>Email me</a>}
              {links.resume && <a className="btn-ghost" href={links.resume} target="_blank" rel="noreferrer">Resume</a>}
              <a className="btn-ghost" href="#simulator">Back to the simulator</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <span>© {new Date().getFullYear()} {PROFILE.name}</span>
        <span>Simulated data. Fictional companies. Not investment advice.</span>
        <span>Photos from Unsplash</span>
      </footer>
    </>
  );
}
