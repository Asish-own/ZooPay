import express from 'express';
import { verifyUser } from '../middleware/auth.js';
import {
  getAvailablePlans,
  initiateBuy,
  submitUTR,
  cancelBuy
} from '../controllers/buyController.js';
import {
  getUserUPIs,
  addUPI,
  editUPI,
  deleteUPI,
  requestWithdrawal,
  getBankProfile,
  saveBankProfile
} from '../controllers/withdrawController.js';
import {
  getDashboardSummary,
  getUserHistory,
  getReferralInfo,
  getNotifications,
  markNotificationRead,
  getContactInfo
} from '../controllers/userDashboardController.js';

const router = express.Router();

// Apply verifyUser middleware to all user routes
router.use(verifyUser);

// Dashboard
router.get('/dashboard', getDashboardSummary);

// Buy system
router.get('/plans', getAvailablePlans);
router.post('/buy/initiate', initiateBuy);
router.post('/buy/submit-utr', submitUTR);
router.post('/buy/cancel', cancelBuy);

// Sell / Withdrawal system & UPI Management
router.get('/bank-profile', getBankProfile);
router.put('/bank-profile', saveBankProfile);
router.get('/upi', getUserUPIs);
router.post('/upi', addUPI);
router.put('/upi/:id', editUPI);
router.delete('/upi/:id', deleteUPI);
router.post('/withdraw/request', requestWithdrawal);

// History, Referrals & Settings
router.get('/history', getUserHistory);
router.get('/referrals', getReferralInfo);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);
router.get('/contact', getContactInfo);

export default router;
