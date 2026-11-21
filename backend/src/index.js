require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const walletRoutes = require('./routes/wallet');
const homesRoutes = require('./routes/homes');
const martRoutes = require('./routes/mart');
const transactionRoutes = require('./routes/transactions');
// Ecosystem additions
const merchantRoutes = require('./routes/merchant');
const ssoRoutes = require('./routes/sso');
const chamaRoutes = require('./routes/chama');
const requestRoutes = require('./routes/requests');
const scheduledRoutes = require('./routes/scheduled');
const rewardRoutes = require('./routes/rewards');
const accountRoutes = require('./routes/account');
const supportRoutes = require('./routes/support');
const { securityHeaders } = require('./lib/security');
const { runDue } = require('./lib/scheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Allowed browser origins (comma separated). Set CORS_ORIGINS on Render, for example
// https://h-pesa.vercel.app. Server-to-server calls (H-Fleet, H-Homes) send no Origin
// header, so they are not affected.
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
app.set('trust proxy', 1); // behind Render's proxy, so rate limits see the real client address
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '150kb' })); // room for a small profile picture

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/homes', homesRoutes);
app.use('/api/mart', martRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/sso', ssoRoutes);
app.use('/api/chama', chamaRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/scheduled', scheduledRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/support', supportRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'H-Pesa', jwtSecretSet: !!process.env.JWT_SECRET }));

module.exports = app;

if (require.main === module) {
  if (!process.env.JWT_SECRET) console.warn('WARNING: JWT_SECRET is not set. Set a long random value on Render before real users arrive.');
  app.listen(PORT, () => {
    console.log(`H-Pesa backend running on http://localhost:${PORT}`);
  });
  // Pays scheduled payments that are due. On hosts that sleep when idle (Render free),
  // also call POST /api/scheduled/run from a free cron service (see README).
  if (process.env.DISABLE_SCHEDULER !== '1') {
    setInterval(() => runDue().catch((e) => console.error('scheduler error', e.message)), 60 * 1000);
  }
}
