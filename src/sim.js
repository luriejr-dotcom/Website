// Market engine. Pure functions only: (state, action) -> new state.
//
// Model: one-factor (CAPM-style) market.
//   market daily return   r_m = (mu - sigma^2/2) dt + sigma sqrt(dt) Z      (geometric Brownian motion)
//   stock daily return    r_i = alpha_i dt + beta_i * r_m + idio_i sqrt(dt) Z_i
// So every stock moves with the market in proportion to its beta, plus its own noise.

export const START_CASH = 100000;
export const RF = 0.04; // risk-free rate used for Sharpe and alpha
export const INDEX_NAME = 'ERIE 100';
export const INDEX_BASE = 1000;

const DT = 1 / 252; // one trading day
const MU_M = 0.08; // market drift, per year
const SIG_M = 0.16; // market volatility, per year
const MAX_POINTS = 1500;
const HISTORY_DAYS = 126; // six months of history before the page loads

// All companies and tickers are fictional.
export const ASSETS = [
  { t: 'NVTR', name: 'Novaterra Power', sector: 'Utilities', beta: 0.55, idio: 0.15, alpha: 0.01, p0: 84 },
  { t: 'ORBD', name: 'Orbital Dynamics', sector: 'Aerospace', beta: 1.3, idio: 0.26, alpha: 0.02, p0: 142 },
  { t: 'QLDG', name: 'Quantum Ledger', sector: 'Fintech', beta: 1.55, idio: 0.34, alpha: 0.02, p0: 67 },
  { t: 'LKSH', name: 'Lakeshore Bancorp', sector: 'Financials', beta: 1.1, idio: 0.18, alpha: 0.0, p0: 46 },
  { t: 'MRDN', name: 'Meridian Health', sector: 'Healthcare', beta: 0.7, idio: 0.2, alpha: 0.015, p0: 118 },
  { t: 'FRGI', name: 'Forge Industrial', sector: 'Industrials', beta: 1.0, idio: 0.19, alpha: 0.005, p0: 93 },
  { t: 'PXLW', name: 'Pixelwave Media', sector: 'Media', beta: 1.2, idio: 0.28, alpha: 0.0, p0: 38 },
  { t: 'HRVF', name: 'Harvest Foods', sector: 'Staples', beta: 0.45, idio: 0.13, alpha: 0.01, p0: 57 },
];

export const COLORS = {
  NVTR: '#4cc9f0',
  ORBD: '#f4a261',
  QLDG: '#b388ff',
  LKSH: '#3ddc97',
  MRDN: '#ff6b8b',
  FRGI: '#ffd166',
  PXLW: '#5e8bff',
  HRVF: '#9bd65a',
  CASH: '#5a5f66',
};

// One-time events the user can fire. Returns are added to that day's move.
export const SHOCKS = {
  hike: {
    label: 'Rate hike',
    news: 'Surprise 50 bp rate hike. Growth names sell off, banks catch a bid.',
    market: -0.012,
    sector: { Fintech: -0.05, Media: -0.035, Aerospace: -0.025, Utilities: -0.025, Financials: 0.035 },
  },
  selloff: {
    label: 'Selloff',
    news: `Risk-off wave hits. ${INDEX_NAME} drops hard and high-beta names fall the most.`,
    market: -0.055,
  },
  rally: {
    label: 'Rally',
    news: `Soft inflation print sparks a broad rally in the ${INDEX_NAME}.`,
    market: 0.04,
  },
  beat: {
    label: 'Earnings beat',
    news: (a) => `${a.name} (${a.t}) beats earnings and raises guidance.`,
    move: 0.09,
  },
};

// Seeded random numbers (mulberry32). The seed lives in state so the
// reducer stays pure and the starting history is the same on every load.
function nextRand(seed) {
  const s = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return [s, ((t ^ (t >>> 14)) >>> 0) / 4294967296];
}

const last = (arr) => arr[arr.length - 1];
const cap = (arr) => (arr.length > MAX_POINTS ? arr.slice(-MAX_POINTS) : arr);

function equityOf(cash, holdings, prices) {
  let v = cash;
  for (const t in holdings) v += holdings[t].shares * last(prices[t]);
  return v;
}

function step(s, shockKey, ticker) {
  let seed = s.seed;
  const u = () => {
    const [ns, v] = nextRand(seed);
    seed = ns;
    return v;
  };
  // Box-Muller: turns two uniform numbers into one standard normal draw.
  const z = () => Math.sqrt(-2 * Math.log(1 - u())) * Math.cos(2 * Math.PI * u());

  const shock = shockKey ? SHOCKS[shockKey] : null;
  let rm = (MU_M - 0.5 * SIG_M * SIG_M) * DT + SIG_M * Math.sqrt(DT) * z();
  if (shock?.market) rm += shock.market;

  const prices = {};
  for (const a of ASSETS) {
    let r = a.alpha * DT + a.beta * rm + a.idio * Math.sqrt(DT) * z();
    if (shock?.sector?.[a.sector]) r += shock.sector[a.sector];
    if (shock?.move && a.t === ticker) r += shock.move;
    prices[a.t] = cap([...s.prices[a.t], last(s.prices[a.t]) * Math.exp(r)]);
  }
  const index = cap([...s.index, last(s.index) * Math.exp(rm)]);
  const day = s.day + 1;

  let news = s.news;
  if (shock) {
    const asset = ASSETS.find((a) => a.t === ticker);
    const text = typeof shock.news === 'function' ? shock.news(asset) : shock.news;
    news = [{ day, text }, ...s.news].slice(0, 6);
  }

  return {
    ...s,
    seed,
    day,
    prices,
    index,
    news,
    equity: cap([...s.equity, equityOf(s.cash, s.holdings, prices)]),
  };
}

function trade(s, side, t, qty) {
  qty = Math.floor(qty);
  if (!(qty > 0) || !s.prices[t]) return s;
  const price = last(s.prices[t]);
  const cur = s.holdings[t] || { shares: 0, cost: 0 };
  const holdings = { ...s.holdings };
  let cash = s.cash;

  if (side === 'buy') {
    if (qty * price > cash + 1e-9) return s;
    cash -= qty * price;
    holdings[t] = { shares: cur.shares + qty, cost: (cur.cost * cur.shares + qty * price) / (cur.shares + qty) };
  } else {
    if (qty > cur.shares) return s;
    cash += qty * price;
    if (cur.shares - qty === 0) delete holdings[t];
    else holdings[t] = { shares: cur.shares - qty, cost: cur.cost };
  }
  return {
    ...s,
    cash,
    holdings,
    trades: [{ day: s.day, side, t, qty, price }, ...s.trades].slice(0, 30),
  };
}

export function createSim(seed = 49) {
  const prices = {};
  for (const a of ASSETS) prices[a.t] = [a.p0];
  let s = {
    seed,
    day: 0,
    prices,
    index: [INDEX_BASE],
    cash: START_CASH,
    holdings: {},
    equity: [START_CASH],
    trades: [],
    news: [],
  };
  // Sample starting portfolio so the tracker has something to show.
  for (const [t, qty] of [['NVTR', 150], ['ORBD', 60], ['LKSH', 200], ['MRDN', 80], ['QLDG', 100]]) {
    s = trade(s, 'buy', t, qty);
  }
  for (let i = 0; i < HISTORY_DAYS; i++) s = step(s);
  return s;
}

export function reducer(state, action) {
  switch (action.type) {
    case 'tick':
      return step(state);
    case 'shock':
      return step(state, action.kind, action.ticker);
    case 'trade':
      return trade(state, action.side, action.t, action.qty);
    case 'reset':
      return createSim();
    default:
      return state;
  }
}

// ---------- analytics ----------

const mean = (a) => a.reduce((x, y) => x + y, 0) / (a.length || 1);
const rets = (a) => a.slice(1).map((v, i) => v / a[i] - 1);

export function metrics(equity, index) {
  const n = Math.min(equity.length, index.length);
  const rp = rets(equity.slice(-n));
  const rm = rets(index.slice(-n));
  const mp = mean(rp);
  const mm = mean(rm);
  let varP = 0, varM = 0, cov = 0;
  for (let i = 0; i < rp.length; i++) {
    varP += (rp[i] - mp) ** 2;
    varM += (rm[i] - mm) ** 2;
    cov += (rp[i] - mp) * (rm[i] - mm);
  }
  const d = Math.max(1, rp.length - 1);
  varP /= d; varM /= d; cov /= d;

  const vol = Math.sqrt(varP * 252);
  const annP = mp * 252;
  const annM = mm * 252;
  const beta = varM > 0 ? cov / varM : 0;

  let peak = -Infinity, maxDD = 0;
  for (const v of equity) {
    peak = Math.max(peak, v);
    maxDD = Math.min(maxDD, v / peak - 1);
  }

  return {
    totalReturn: last(equity) / START_CASH - 1,
    benchReturn: last(index) / INDEX_BASE - 1,
    vol,
    sharpe: vol > 0 ? (annP - RF) / vol : 0,
    beta,
    alpha: annP - (RF + beta * (annM - RF)), // Jensen's alpha
    maxDD,
  };
}

// Day number -> calendar date, skipping weekends.
const START_DATE = new Date(2026, 4, 11); // a Monday
export function simDate(day) {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + Math.floor(day / 5) * 7 + (day % 5));
  return d;
}
export const fmtDate = (day) =>
  simDate(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const usd = (v, dp = 2) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: dp, maximumFractionDigits: dp });
export const pct = (v, dp = 2) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(dp)}%`;
