import db from './db.js';

let intervalTimer = null;

export function startAutoPlanEngine() {
  if (intervalTimer) {
    clearInterval(intervalTimer);
  }

  console.log('Starting Auto Buy Plan Generator engine (Every 30 seconds)...');

  // Run initial check
  generateRandomPlan();

  // Run every 30 seconds
  intervalTimer = setInterval(() => {
    generateRandomPlan();
  }, 30000);
}

function generateRandomPlan() {
  try {
    // 1. Fetch system settings
    const settingsRows = db.prepare(`SELECT key, value FROM system_settings`).all();
    const settings = {};
    settingsRows.forEach(s => { settings[s.key] = s.value; });

    const enabled = settings.auto_buy_enabled !== 'false';
    if (!enabled) {
      return;
    }

    const minAmount = parseFloat(settings.auto_buy_min_amount) || 100;
    const maxAmount = parseFloat(settings.auto_buy_max_amount) || 500;
    const defaultBonus = parseFloat(settings.buy_bonus_percent) || 3.0;

    if (minAmount > maxAmount) {
      return;
    }

    // Generate random amount rounded to steps of 10 (e.g., 120, 250, 370, 490)
    const step = 10;
    const minStep = Math.ceil(minAmount / step);
    const maxStep = Math.floor(maxAmount / step);
    const randomStep = Math.floor(Math.random() * (maxStep - minStep + 1)) + minStep;
    const randomAmount = randomStep * step;

    // Check if an AVAILABLE plan with this exact amount already exists
    const existingPlan = db.prepare(`
      SELECT id FROM plans WHERE amount = ? AND status = 'AVAILABLE'
    `).get(randomAmount);

    if (!existingPlan) {
      db.prepare(`
        INSERT INTO plans (amount, bonus_percentage, status)
        VALUES (?, ?, 'AVAILABLE')
      `).run(randomAmount, defaultBonus);

      console.log(`[Auto-Plan Generator] Created new ₹${randomAmount} buy plan (${defaultBonus}% bonus).`);
    }

    // Keep pool clean by deleting old unreferenced AVAILABLE plans
    db.prepare(`
      DELETE FROM plans
      WHERE status = 'AVAILABLE'
        AND id NOT IN (SELECT id FROM plans WHERE status = 'AVAILABLE' ORDER BY created_at DESC LIMIT 25)
        AND id NOT IN (SELECT DISTINCT plan_id FROM buy_transactions WHERE plan_id IS NOT NULL)
    `).run();

  } catch (err) {
    console.error('[Auto-Plan Generator] Error:', err);
  }
}
