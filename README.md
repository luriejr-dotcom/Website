# Market Lab

A market simulator and portfolio tracker. Portfolio piece for finance interviews.

- Eight fictional stocks and one index, driven by a one-factor model (each stock's return = beta x market return + its own noise).
- Paper trading with a sample starting portfolio and $100,000.
- Live risk stats: volatility, Sharpe, beta, Jensen's alpha, max drawdown.
- Scenario buttons: rate hike, selloff, rally, earnings beat.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5174

## Edit your info

Everything personal (bio, facts, LinkedIn/email/resume links, photos) is in `src/profile.js`.
The model's numbers (betas, volatility, drift, shocks) are at the top of `src/sim.js`.

## Put it online for free (GitHub Pages)

1. Create a free GitHub repo and push this folder to the `main` branch.
2. In the repo: Settings > Pages > Source > **GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and publishes on every push.

`npm run build` also makes a plain `dist` folder you can drag onto Netlify or Vercel's free tier.

## Talking points

- **Why one factor?** It's CAPM in code. Beta decides how much of the market's move each stock takes on, so a selloff hurts high-beta names most.
- **Why does the rate hike hit some sectors and help others?** Growth stocks' cash flows are further out, so a higher discount rate cuts their value more. Banks earn more on loans.
- **Sharpe vs return.** Two portfolios can have the same return with very different volatility. Sharpe shows return per unit of risk.
- **Alpha.** Return left over after what beta alone would explain. In this sim it's mostly luck, which is its own lesson.

Design influence: SpaceX's site (full-bleed photos, uppercase type, outlined buttons) and components browsed on 21st.dev. All code is original. Photos are from Unsplash.
