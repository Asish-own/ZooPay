import express from 'express';
import { verifyAdmin } from '../middleware/auth.js';
import {
  getAdminDashboardStats,
  getAllUsers,
  toggleUserStatus,
  resetUserPassword,
  getAdminPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getAdminAccounts,
  createAccount,
  updateAccount,
  resetAccountUsageCount,
  deleteAccount,
  getPendingBuyVerifications,
  approveBuyVerification,
  rejectBuyVerification,
  getAdminWithdrawals,
  processWithdrawal,
  getSettings,
  updateSettings,
  getAuditLogs,
  resetAllSystemData,
  createBatchAutoBuyPlans
} from '../controllers/adminController.js';

const router = express.Router();

// Apply verifyAdmin middleware to all admin routes
router.use(verifyAdmin);

// Dashboard & System Operations
router.get('/dashboard-stats', getAdminDashboardStats);
router.post('/reset-all', resetAllSystemData);
router.post('/auto-buy/create-batch', createBatchAutoBuyPlans);

// User Management
router.get('/users', getAllUsers);
router.put('/users/:id/status', toggleUserStatus);
router.post('/users/:id/reset-password', resetUserPassword);

// Buy Plan CRUD
router.get('/plans', getAdminPlans);
router.post('/plans', createPlan);
router.put('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);

// Payment Accounts CRUD (Round-Robin)
router.get('/accounts', getAdminAccounts);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);
router.post('/accounts/:id/reset-counter', resetAccountUsageCount);
router.delete('/accounts/:id', deleteAccount);

// Buy Verification
router.get('/buy-verifications', getPendingBuyVerifications);
router.post('/buy-verifications/:id/approve', approveBuyVerification);
router.post('/buy-verifications/:id/reject', rejectBuyVerification);

// Withdrawal Management
router.get('/withdrawals', getAdminWithdrawals);
router.post('/withdrawals/:id/process', processWithdrawal);

// Bonus & System Settings
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// Audit Logs
router.get('/audit-logs', getAuditLogs);

export default router;
