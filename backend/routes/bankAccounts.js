const express = require('express');
const { BankAccount } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();
const writeRoles = requireRole(['owner', 'manager']);
router.use(authenticateToken);

const publicShape = (a) => ({ id: a.id, bankName: a.bankName, accountNumber: a.accountNumber, accountName: a.accountName || '', isActive: a.isActive, sortOrder: a.sortOrder });

// GET /api/bank-accounts - the accounts a cashier can choose at checkout (managers can also ask for the hidden ones)
router.get('/', async (req, res) => {
  try {
    const all = req.query.all === '1' && ['owner', 'manager'].includes(req.user.role);
    const rows = await BankAccount.findAll({ where: all ? {} : { isActive: true }, order: [['sortOrder', 'ASC'], ['id', 'ASC']] });
    res.json({ message: 'Bank accounts retrieved successfully', bankAccounts: rows.map(publicShape) });
  } catch (error) {
    console.error('Get bank accounts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const rules = [
  { in: 'body', field: 'bankName', required: true, type: 'string', trim: true, maxLen: 100, minLen: 1 },
  { in: 'body', field: 'accountNumber', required: true, type: 'string', trim: true, maxLen: 30, minLen: 1 },
  { in: 'body', field: 'accountName', required: false, type: 'string', trim: true, maxLen: 150 },
  { in: 'body', field: 'isActive', required: false, type: 'boolean' },
];

router.post('/', writeRoles, validate(rules), async (req, res) => {
  try {
    const { bankName, accountNumber, accountName, isActive } = req.body;
    const last = await BankAccount.max('sortOrder');
    const created = await BankAccount.create({ bankName, accountNumber, accountName: accountName || '', isActive: isActive !== false, sortOrder: (Number.isFinite(last) ? last : -1) + 1 });
    res.status(201).json({ message: 'Bank account added', bankAccount: publicShape(created) });
  } catch (error) {
    console.error('Create bank account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.put('/:id', writeRoles, validate([{ in: 'params', field: 'id', required: true, type: 'integer', min: 1 }, ...rules.map((r) => ({ ...r, required: false }))]), async (req, res) => {
  try {
    const account = await BankAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'Bank account not found' });
    const { bankName, accountNumber, accountName, isActive } = req.body;
    await account.update({
      bankName: bankName || account.bankName,
      accountNumber: accountNumber || account.accountNumber,
      accountName: accountName !== undefined ? accountName : account.accountName,
      isActive: isActive !== undefined ? isActive : account.isActive,
    });
    res.json({ message: 'Bank account saved', bankAccount: publicShape(account) });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Receipts already printed keep their own copy of the details, so an account can be removed safely.
router.delete('/:id', writeRoles, async (req, res) => {
  try {
    const account = await BankAccount.findByPk(req.params.id);
    if (!account) return res.status(404).json({ message: 'Bank account not found' });
    await account.destroy();
    res.json({ message: 'Bank account removed' });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
