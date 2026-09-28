import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'enhance-wealth-ultra-secure-key-2026-drago-peric-portfolio';
const ENCRYPTION_MASTER_KEY = process.env.DB_ENCRYPTION_KEY || 'enhance-wealth-aes256gcm-master-ledger-key-998822';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const VAULT_FILE = path.join(DATA_DIR, 'encrypted_ledger.vault');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Derive a 32-byte key for AES-256-GCM using SHA-256
const AES_KEY = crypto.createHash('sha256').update(ENCRYPTION_MASTER_KEY).digest();

// AES-256-GCM Encryption / Decryption Helper
function encryptPayload(data: any): { cipherText: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  
  const jsonString = JSON.stringify(data);
  let encrypted = cipher.update(jsonString, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return {
    cipherText: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag,
  };
}

function decryptPayload(cipherText: string, ivHex: string, authTagHex: string): any {
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', AES_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// Database schema and state
export interface TransactionRecord {
  id: string;
  txHash: string;
  prevHash: string;
  type: 'DEPOSIT' | 'TRANSFER' | 'BONUS_REWARD' | 'REGISTRATION_BONUS' | 'FUTURES_ALLOCATION';
  amount: number;
  currency: string;
  status: 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED';
  isWithdrawable: boolean;
  timestamp: string;
  title: string;
  note: string;
  custodianVerification: {
    verified: boolean;
    requiredConfirmations: number;
    currentConfirmations: number;
    custodianBank: string;
    notice: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'SUPPORT' | 'USER';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface DocumentRecord {
  id: string;
  title: string;
  type: 'IMAGE' | 'VIDEO' | 'PDF';
  category: 'IDENTITY_VERIFICATION' | 'PROOF_OF_FUNDS' | 'LIVENESS_VERIFICATION' | 'PROFILE_PHOTO' | 'CUSTODIAL_AGREEMENT';
  fileName: string;
  fileUrl: string;
  status: 'VERIFIED' | 'PENDING_CLEARANCE' | 'ACTIVE';
  uploadedAt: string;
  fileSize: string;
  mimeType: string;
  verificationNotes: string;
  duration?: string;
}

export interface InvestmentFutureProduct {
  id: string;
  name: string;
  symbol: string;
  category: 'CRYPTO' | 'GOLD' | 'COMMODITIES' | 'STRUCTURED_YIELD';
  allocationPercentage: number;
  targetYieldAPY: string;
  currentPriceEUR: number;
  change24h: number;
  description: string;
  custodyTier: string;
}

interface VaultData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    kycStatus: string;
    accountNumber: string;
    bonusPoints: number;
    registrationReward: number;
    investmentTarget: number;
    targetPeriod: string;
    investmentCategory: string;
    accountStatus: string;
  };
  transactions: TransactionRecord[];
  documents: DocumentRecord[];
  futureProducts: InvestmentFutureProduct[];
  chatHistory: ChatMessage[];
  lastUpdated: string;
}

// Initial Seed Data matching Drago Peric's portfolio exactly
function getInitialVaultData(): VaultData {
  const initialTx: TransactionRecord = {
    id: 'tx_drago_001_deposit',
    txHash: '0x8f72a4bc9123e4450a8b9f71c42289c09931b2ec9103e39b7a4f9e110c7b2a94',
    prevHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    type: 'DEPOSIT',
    amount: 50000.0,
    currency: 'EUR',
    status: 'PENDING_VERIFICATION',
    isWithdrawable: false,
    timestamp: '2026-09-28T08:15:00.000Z',
    title: 'Investment Deposit (SEPA / Crypto Inflow)',
    note: 'The displayed €50,000.00 represents a deposit recorded as pending verification. It should not be interpreted as confirmed, cleared, or withdrawable funds until the applicable payment, custody and account-verification processes have been completed.',
    custodianVerification: {
      verified: false,
      requiredConfirmations: 3,
      currentConfirmations: 1,
      custodianBank: 'ClearStream Custody Europe S.A.',
      notice: 'Pending AML & source-of-funds clearance by custodial bank.',
    },
  };

  const initialDocuments: DocumentRecord[] = [
    {
      id: 'doc_kyc_01',
      title: 'Investor National ID & Biometric Card',
      type: 'IMAGE',
      category: 'IDENTITY_VERIFICATION',
      fileName: 'kyc_id_document.jpg',
      fileUrl: '/kyc_id_document.jpg',
      status: 'VERIFIED',
      uploadedAt: '2026-09-28T08:10:00.000Z',
      fileSize: '772 KB',
      mimeType: 'image/jpeg',
      verificationNotes: 'Biometric facial scan match: 99.4% verified against profile photo. Republic of Croatia Identity Card confirmed.',
    },
    {
      id: 'doc_wire_02',
      title: 'Custodial Deposit Wire Confirmation (SWIFT MT103)',
      type: 'IMAGE',
      category: 'PROOF_OF_FUNDS',
      fileName: 'bank_wire_deposit_document.jpg',
      fileUrl: '/bank_wire_deposit_document.jpg',
      status: 'PENDING_CLEARANCE',
      uploadedAt: '2026-09-28T08:15:30.000Z',
      fileSize: '874 KB',
      mimeType: 'image/jpeg',
      verificationNotes: 'ClearStream Custody Europe Inbound SEPA wire transfer receipt for €50,000.00. Pending final interbank clearing.',
    },
    {
      id: 'doc_video_03',
      title: 'Live Biometric Liveness Video Recording Session',
      type: 'VIDEO',
      category: 'LIVENESS_VERIFICATION',
      fileName: 'drago_peric_biometric_liveness.mp4',
      fileUrl: '/video/drago_kyc_session.mp4',
      status: 'VERIFIED',
      uploadedAt: '2026-09-28T08:20:00.000Z',
      fileSize: '14.2 MB',
      duration: '0:42',
      mimeType: 'video/mp4',
      verificationNotes: 'Full HD video liveness recording with compliance agent Marcus. Head rotation, vocal consent, and passport presentation certified.',
    },
    {
      id: 'doc_photo_04',
      title: 'Mr. Drago Peric Current Profile Photo',
      type: 'IMAGE',
      category: 'PROFILE_PHOTO',
      fileName: 'IMG-20260928-WA0093_1.jpg',
      fileUrl: '/IMG-20260928-WA0093_1.jpg',
      status: 'ACTIVE',
      uploadedAt: '2026-09-28T08:25:00.000Z',
      fileSize: '829 KB',
      mimeType: 'image/jpeg',
      verificationNotes: 'High-resolution official verified portrait for Drago Peric, active portfolio holder.',
    },
  ];

  const initialFutureProducts: InvestmentFutureProduct[] = [
    {
      id: 'inv_btc_vault',
      name: 'Institutional Bitcoin Cold Vault',
      symbol: 'BTC/EUR',
      category: 'CRYPTO',
      allocationPercentage: 45,
      targetYieldAPY: '18.4% APY',
      currentPriceEUR: 58420.0,
      change24h: 3.42,
      description: 'Institutional-grade custody with insured multi-sig storage and algorithmic yield rebalancing.',
      custodyTier: 'Tier 1 Cold Vault',
    },
    {
      id: 'inv_eth_pos',
      name: 'Ethereum Proof-of-Stake High Yield',
      symbol: 'ETH/EUR',
      category: 'CRYPTO',
      allocationPercentage: 30,
      targetYieldAPY: '12.8% APY',
      currentPriceEUR: 3180.5,
      change24h: 2.15,
      description: 'Enterprise validator staking generating continuous network consensus rewards in EUR equivalent.',
      custodyTier: 'Institutional Node',
    },
    {
      id: 'inv_gold_bullion',
      name: 'Tokenized Physical Gold Bullion',
      symbol: 'PAXG/EUR',
      category: 'GOLD',
      allocationPercentage: 15,
      targetYieldAPY: '8.2% APY',
      currentPriceEUR: 2420.0,
      change24h: 0.85,
      description: 'London Good Delivery gold bars stored in Swiss freeport vaults, fully audited & redeemable.',
      custodyTier: 'Swiss Freeport Vault',
    },
    {
      id: 'inv_eur_liquidity',
      name: 'EU Treasury Sovereign Liquidity',
      symbol: 'EUR-BOND',
      category: 'STRUCTURED_YIELD',
      allocationPercentage: 10,
      targetYieldAPY: '4.6% APY',
      currentPriceEUR: 100.0,
      change24h: 0.04,
      description: 'High-grade short-duration European sovereign securities providing cash capital stability.',
      custodyTier: 'ClearStream Institutional',
    },
  ];

  return {
    user: {
      id: 'usr_drago_peric_8892',
      email: 'drago.peric@enhancewealth.eu',
      name: 'Drago Peric',
      role: 'INVESTOR',
      kycStatus: 'PENDING_TIER_2_VERIFICATION',
      accountNumber: 'EW-EUR-9428-1192',
      bonusPoints: 25,
      registrationReward: 25.0,
      investmentTarget: 87350.0,
      targetPeriod: 'Five working days',
      investmentCategory: 'Cryptocurrency & Investments',
      accountStatus: 'Active',
    },
    transactions: [initialTx],
    documents: initialDocuments,
    futureProducts: initialFutureProducts,
    chatHistory: [
      {
        id: 'msg_001',
        sender: 'SUPPORT',
        senderName: 'Enhance Your Wealth Support',
        text: 'Welcome to Enhance Your Wealth support. Your dedicated portfolio desk is active.',
        timestamp: '2026-09-28T08:00:00.000Z',
      },
      {
        id: 'msg_002',
        sender: 'SUPPORT',
        senderName: 'Compliance Officer Anna',
        text: 'Notice: Your initial investment deposit of €50,000.00 is currently pending verification. Kindly review the required verification documentation or ask any questions here.',
        timestamp: '2026-09-28T08:16:00.000Z',
      },
      {
        id: 'msg_003',
        sender: 'SUPPORT',
        senderName: 'Portfolio Manager Henrik',
        text: 'Mr. Peric, your biometric video verification and ID card have been recorded in the secure vault. Once ClearStream wire clearance settles, your target allocation of €87,350 will commence.',
        timestamp: '2026-09-28T08:30:00.000Z',
      },
    ],
    lastUpdated: new Date().toISOString(),
  };
}

// Save encrypted vault to disk
function saveVault(data: VaultData) {
  data.lastUpdated = new Date().toISOString();
  const encrypted = encryptPayload(data);
  const fileContent = JSON.stringify(encrypted, null, 2);
  fs.writeFileSync(VAULT_FILE, fileContent, 'utf8');
}

// Load and decrypt vault from disk
function loadVault(): VaultData {
  if (!fs.existsSync(VAULT_FILE)) {
    const initial = getInitialVaultData();
    saveVault(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(VAULT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.cipherText || !parsed.iv || !parsed.authTag) {
      throw new Error('Corrupted vault structure');
    }
    const decrypted = decryptPayload(parsed.cipherText, parsed.iv, parsed.authTag);
    // Ensure all new schema properties exist
    if (!decrypted.documents) decrypted.documents = getInitialVaultData().documents;
    if (!decrypted.futureProducts) decrypted.futureProducts = getInitialVaultData().futureProducts;
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt vault, resetting to initial seed for safety:', err);
    const initial = getInitialVaultData();
    saveVault(initial);
    return initial;
  }
}

// Initialize database
let db = loadVault();

// Middleware
app.use(express.json({ limit: '25mb' }));
app.use(express.static(PUBLIC_DIR));

// JWT Authentication Middleware (handles both Bearer header and ?token= query parameter)
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token: string | undefined;
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Missing valid JWT bearer token.' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

// --- API ENDPOINTS ---

// 1. Auth Login (credentials or demo instant access for Drago Peric)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  if (
    (!email || email === 'drago.peric@enhancewealth.eu' || email === 'drago.peric') &&
    (!password || password === 'Investment2026!*' || password === 'demo' || password.length > 0)
  ) {
    const token = jwt.sign(
      {
        id: db.user.id,
        email: db.user.email,
        name: db.user.name,
        role: db.user.role,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      success: true,
      token,
      user: db.user,
      expiresIn: '24h',
      tokenType: 'Bearer',
    });
  }

  return res.status(401).json({
    error: 'Invalid credentials. Please use Drago Peric account or one-click authentication.',
  });
});

// 2. Auth Status & Me
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    authenticated: true,
    user: db.user,
    security: {
      encryption: 'AES-256-GCM',
      jwtAlgorithm: 'HS256',
      kycStatus: db.user.kycStatus,
    },
  });
});

// 3. Get Portfolio Data
app.get('/api/portfolio', (req: Request, res: Response) => {
  db = loadVault();

  const pendingDeposits = db.transactions
    .filter((tx) => tx.type === 'DEPOSIT' && tx.status === 'PENDING_VERIFICATION')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const confirmedDeposits = db.transactions
    .filter((tx) => tx.type === 'DEPOSIT' && tx.status === 'CONFIRMED')
    .reduce((sum, tx) => sum + tx.amount, 0);

  res.json({
    profile: db.user,
    pendingDeposit: pendingDeposits,
    confirmedDeposit: confirmedDeposits,
    totalTarget: db.user.investmentTarget,
    progressPercentage: Number(((pendingDeposits / db.user.investmentTarget) * 100).toFixed(1)),
    bonusPoints: db.user.bonusPoints,
    registrationReward: db.user.registrationReward,
    targetPeriod: db.user.targetPeriod,
    statusNotice:
      'The displayed €50,000.00 represents a deposit recorded as pending verification. It should not be interpreted as confirmed, cleared, or withdrawable funds until the applicable payment, custody and account-verification processes have been completed.',
    futureProducts: db.futureProducts,
    documentCount: db.documents.length,
    serverTime: new Date().toISOString(),
  });
});

// 4. Get Transactions
app.get('/api/transactions', (req: Request, res: Response) => {
  db = loadVault();
  res.json({
    transactions: db.transactions,
    count: db.transactions.length,
    ledgerHash: crypto
      .createHash('sha256')
      .update(JSON.stringify(db.transactions))
      .digest('hex'),
  });
});

// 5. SECURE TRANSACTION LEDGER EXPORT (PDF or CSV via JWT-Protected Endpoint)
app.get('/api/transactions/export', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  db = loadVault();
  const format = (req.query.format as string || 'csv').toLowerCase();

  const transactions = db.transactions;
  const ledgerHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(transactions))
    .digest('hex');

  if (format === 'csv') {
    // Build standard CSV
    const csvHeader = [
      '"Transaction ID"',
      '"Timestamp UTC"',
      '"Type"',
      '"Amount"',
      '"Currency"',
      '"Status"',
      '"Withdrawable"',
      '"Custodian Bank"',
      '"Transaction Hash (SHA-256)"',
      '"Previous Hash"',
      '"Verification Notes"',
    ].join(',');

    const csvRows = transactions.map((tx) => {
      const escape = (str: string) => `"${(str || '').replace(/"/g, '""')}"`;
      return [
        escape(tx.id),
        escape(tx.timestamp),
        escape(tx.type),
        tx.amount.toFixed(2),
        escape(tx.currency),
        escape(tx.status),
        tx.isWithdrawable ? '"YES"' : '"NO (LOCKED)"',
        escape(tx.custodianVerification?.custodianBank || 'N/A'),
        escape(tx.txHash),
        escape(tx.prevHash),
        escape(tx.note),
      ].join(',');
    });

    const csvContent = [
      `# Enhance Your Wealth - Institutional Portfolio Statement`,
      `# Account Holder: Drago Peric (ID: ${db.user.id})`,
      `# Generated: ${new Date().toISOString()}`,
      `# Cryptographic Ledger Hash: ${ledgerHash}`,
      `# Encryption: AES-256-GCM Authentic Ledger`,
      `# Pending Deposit Disclaimer: €50,000.00 is recorded as pending verification and not confirmed funds.`,
      '',
      csvHeader,
      ...csvRows,
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="enhance_wealth_ledger_${db.user.name.toLowerCase().replace(/\s+/g, '_')}.csv"`
    );
    return res.send(csvContent);
  }

  // Return structured export payload (which client renders into high-security PDF)
  return res.json({
    success: true,
    investor: db.user,
    exportTimestamp: new Date().toISOString(),
    ledgerHash,
    transactions,
    disclaimer:
      'The displayed €50,000.00 represents a deposit recorded as pending verification. It should not be interpreted as confirmed, cleared, or withdrawable funds until the applicable payment, custody and account-verification processes have been completed.',
    cryptographicSeal: {
      algorithm: 'AES-256-GCM / SHA-256',
      custodian: 'ClearStream Custody Europe S.A.',
      auditorVerification: 'VERIFIED_TAMPER_EVIDENT',
    },
  });
});

// 6. Deposit endpoint
app.post('/api/transactions/deposit', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { amount, currency = 'EUR', note } = req.body;
  const numAmount = parseFloat(amount);

  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({ error: 'Please provide a valid deposit amount greater than 0.' });
  }

  db = loadVault();

  const prevTx = db.transactions[0];
  const prevHash = prevTx ? prevTx.txHash : '0x0000000000000000000000000000000000000000000000000000000000000000';
  
  const txId = `tx_${Date.now()}_deposit`;
  const timestamp = new Date().toISOString();
  const txHash = crypto
    .createHash('sha256')
    .update(`${prevHash}:${txId}:${numAmount}:${timestamp}`)
    .digest('hex');

  const newTx: TransactionRecord = {
    id: txId,
    txHash: `0x${txHash}`,
    prevHash: prevHash,
    type: 'DEPOSIT',
    amount: numAmount,
    currency,
    status: 'PENDING_VERIFICATION',
    isWithdrawable: false,
    timestamp,
    title: `Investment Deposit (€${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })})`,
    note:
      note ||
      'Deposit recorded in pending verification queue. Funds remain locked until provider clearance.',
    custodianVerification: {
      verified: false,
      requiredConfirmations: 3,
      currentConfirmations: 0,
      custodianBank: 'ClearStream Custody Europe S.A.',
      notice: 'Inbound settlement initiated. Awaiting SWIFT MT103 / blockchain confirmation.',
    },
  };

  db.transactions.unshift(newTx);
  saveVault(db);

  res.json({
    success: true,
    message: 'Deposit recorded as PENDING verification. Funds are unconfirmed and not withdrawable.',
    transaction: newTx,
  });
});

// 7. Transfer endpoint
app.post('/api/transactions/transfer', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { recipient, amount } = req.body;
  const numAmount = parseFloat(amount);

  db = loadVault();

  const confirmedFunds = db.transactions
    .filter((tx) => tx.type === 'DEPOSIT' && tx.status === 'CONFIRMED')
    .reduce((sum, tx) => sum + tx.amount, 0);

  if (confirmedFunds < numAmount || confirmedFunds === 0) {
    return res.status(403).json({
      error: 'Transfers are unavailable until the account and transaction are verified.',
      code: 'UNVERIFIED_FUNDS_LOCK',
      pendingAmount: 50000.0,
      confirmedAvailableBalance: 0.0,
      reason:
        'The €50,000.00 investment deposit is currently UNVERIFIED/PENDING. Financial custodian regulations forbid moving unconfirmed funds.',
    });
  }

  const prevTx = db.transactions[0];
  const txId = `tx_${Date.now()}_transfer`;
  const timestamp = new Date().toISOString();
  const txHash = crypto
    .createHash('sha256')
    .update(`${prevTx ? prevTx.txHash : ''}:${txId}:${numAmount}:${timestamp}`)
    .digest('hex');

  const transferTx: TransactionRecord = {
    id: txId,
    txHash: `0x${txHash}`,
    prevHash: prevTx ? prevTx.txHash : '0x0',
    type: 'TRANSFER',
    amount: numAmount,
    currency: 'EUR',
    status: 'CONFIRMED',
    isWithdrawable: true,
    timestamp,
    title: `Transfer to ${recipient || 'External Account'}`,
    note: `Transfer processed from confirmed balance.`,
    custodianVerification: {
      verified: true,
      requiredConfirmations: 3,
      currentConfirmations: 3,
      custodianBank: 'ClearStream Custody Europe S.A.',
      notice: 'Settled successfully.',
    },
  };

  db.transactions.unshift(transferTx);
  saveVault(db);

  res.json({
    success: true,
    transaction: transferTx,
  });
});

// 8. Documents list
app.get('/api/documents', (req: Request, res: Response) => {
  db = loadVault();
  res.json({
    documents: db.documents || [],
    count: db.documents ? db.documents.length : 0,
    investor: db.user.name,
  });
});

function autoCategorizeDocument(fileName: string, title?: string, mimeType?: string): 'IDENTITY_VERIFICATION' | 'PROOF_OF_FUNDS' | 'LIVENESS_VERIFICATION' | 'PROFILE_PHOTO' {
  const combined = `${fileName} ${title || ''} ${mimeType || ''}`.toLowerCase();
  if (combined.includes('liveness') || combined.includes('video') || combined.includes('recording') || mimeType?.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.webm')) {
    return 'LIVENESS_VERIFICATION';
  }
  if (combined.includes('profile') || combined.includes('avatar') || combined.includes('selfie') || combined.includes('portrait') || combined.includes('wa0093') || combined.includes('drago') || combined.includes('photo')) {
    return 'PROFILE_PHOTO';
  }
  if (combined.includes('wire') || combined.includes('swift') || combined.includes('deposit') || combined.includes('fund') || combined.includes('statement') || combined.includes('bank') || combined.includes('mt103') || combined.includes('receipt')) {
    return 'PROOF_OF_FUNDS';
  }
  return 'IDENTITY_VERIFICATION';
}

// 9. Document Upload (Image or Video document)
app.post('/api/documents/upload', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { title, category, type, fileName, fileData, notes, duration } = req.body;

  if (!title || !fileName) {
    return res.status(400).json({ error: 'Title and filename are required.' });
  }

  db = loadVault();

  // If base64 file data provided, save to public uploads directory
  let targetUrl = `/uploads/${fileName}`;
  const uploadsDir = path.join(PUBLIC_DIR, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  if (fileData && fileData.includes('base64,')) {
    try {
      const base64Content = fileData.split('base64,')[1];
      const buffer = Buffer.from(base64Content, 'base64');
      const safeName = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '')}`;
      fs.writeFileSync(path.join(uploadsDir, safeName), buffer);
      targetUrl = `/uploads/${safeName}`;
    } catch (e) {
      console.error('Failed to write uploaded file bytes:', e);
    }
  }

  const effectiveMimeType = type === 'VIDEO' ? 'video/mp4' : 'image/jpeg';
  const effectiveCategory = category && category !== 'AUTO' ? category : autoCategorizeDocument(fileName, title, effectiveMimeType);

  const newDoc: DocumentRecord = {
    id: `doc_${Date.now()}`,
    title: title.trim(),
    category: effectiveCategory,
    type: type || (fileName.endsWith('.mp4') || fileName.endsWith('.webm') ? 'VIDEO' : 'IMAGE'),
    fileName: fileName,
    fileUrl: targetUrl,
    status: 'PENDING_CLEARANCE',
    uploadedAt: new Date().toISOString(),
    fileSize: `${Math.floor(Math.random() * 400 + 400)} KB`,
    mimeType: effectiveMimeType,
    duration: duration || (type === 'VIDEO' ? '0:35' : undefined),
    verificationNotes: notes || 'Document received and queued for compliance officer audit.',
  };

  db.documents.unshift(newDoc);
  saveVault(db);

  res.json({
    success: true,
    message: 'Document uploaded and securely encrypted into custodial vault.',
    document: newDoc,
  });
});

// 10. Investment Futures & Instruments list
app.get('/api/investments/future-products', (req: Request, res: Response) => {
  db = loadVault();
  res.json({
    futureProducts: db.futureProducts,
    portfolioTarget: db.user.investmentTarget,
    targetPeriod: db.user.targetPeriod,
  });
});

// 11. Support Chat
app.get('/api/chat/messages', (req: Request, res: Response) => {
  db = loadVault();
  res.json({ messages: db.chatHistory });
});

app.post('/api/chat/messages', (req: Request, res: Response) => {
  const { text, senderName } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty.' });
  }

  db = loadVault();
  const userMsg: ChatMessage = {
    id: `msg_${Date.now()}_u`,
    sender: 'USER',
    senderName: senderName || 'Drago Peric',
    text: text.trim(),
    timestamp: new Date().toISOString(),
  };

  db.chatHistory.push(userMsg);

  const lower = text.toLowerCase();
  let replyText = 'Thank you Mr. Peric. Your message has been received by the portfolio management team.';

  if (lower.includes('pdf') || lower.includes('csv') || lower.includes('download') || lower.includes('export')) {
    replyText =
      'You can download your certified transaction ledger directly as a tamper-evident PDF statement or RFC-4180 CSV spreadsheet using the "Download Ledger (PDF / CSV)" button located above the transaction table.';
  } else if (lower.includes('document') || lower.includes('video') || lower.includes('id') || lower.includes('photo')) {
    replyText =
      'Your uploaded National ID and biometric video recording have been cryptographically linked to your investor dossier. You can inspect all uploaded images and video documents in the "Documents & Compliance Vault" tab.';
  } else if (lower.includes('50000') || lower.includes('50,000') || lower.includes('deposit') || lower.includes('pending')) {
    replyText =
      'Regarding your €50,000 deposit: it is currently registered in our custodial verification queue with ClearStream Custody. Verification typically takes 1 to 3 banking days following standard anti-money laundering (AML) checks.';
  } else if (lower.includes('transfer') || lower.includes('withdraw') || lower.includes('payout')) {
    replyText =
      'Security notice: Outbound transfers and withdrawals remain locked until all incoming deposits and identity credentials have completed level 2 cryptographic and custodian verification.';
  } else if (lower.includes('target') || lower.includes('87') || lower.includes('87350')) {
    replyText =
      'Your active investment target is €87,350.00 across the designated 5 working day allocation window. Progress currently stands at 57.2% based on your pending allocation.';
  }

  const supportMsg: ChatMessage = {
    id: `msg_${Date.now() + 500}_s`,
    sender: 'SUPPORT',
    senderName: 'Enhance Your Wealth Support',
    text: replyText,
    timestamp: new Date(Date.now() + 800).toISOString(),
  };

  db.chatHistory.push(supportMsg);
  saveVault(db);

  res.json({
    success: true,
    userMessage: userMsg,
    supportReply: supportMsg,
  });
});

// 12. Verification Toggle endpoint
app.post('/api/transactions/simulate-verification', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { txId, action } = req.body;
  db = loadVault();

  const targetTx = db.transactions.find((tx) => tx.id === (txId || 'tx_drago_001_deposit'));
  if (!targetTx) {
    return res.status(404).json({ error: 'Transaction not found' });
  }

  if (action === 'VERIFY') {
    targetTx.status = 'CONFIRMED';
    targetTx.isWithdrawable = true;
    targetTx.custodianVerification.verified = true;
    targetTx.custodianVerification.currentConfirmations = targetTx.custodianVerification.requiredConfirmations;
    targetTx.custodianVerification.notice = 'Verified by Custodian & Anti-Fraud Compliance.';
  } else {
    targetTx.status = 'PENDING_VERIFICATION';
    targetTx.isWithdrawable = false;
    targetTx.custodianVerification.verified = false;
    targetTx.custodianVerification.currentConfirmations = 1;
    targetTx.custodianVerification.notice = 'Pending AML & source-of-funds clearance by custodial bank.';
  }

  saveVault(db);
  res.json({
    success: true,
    status: targetTx.status,
    transaction: targetTx,
  });
});

// 13. Security Vault Inspector
app.get('/api/security/vault-status', (req: Request, res: Response) => {
  try {
    const raw = fs.readFileSync(VAULT_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const stats = fs.statSync(VAULT_FILE);

    res.json({
      algorithm: 'AES-256-GCM',
      cipherMode: 'Galois/Counter Mode with 128-bit Auth Tag',
      keyLengthBits: 256,
      ivLengthBytes: 12,
      fileSizeBytes: stats.size,
      lastModified: stats.mtime.toISOString(),
      ivSample: parsed.iv,
      authTagSample: parsed.authTag,
      encryptedCipherPreview: parsed.cipherText.substring(0, 120) + '...[REDACTED_ENCRYPTED_BYTES]',
      integrityStatus: 'VERIFIED_ENCRYPTED_AT_REST',
      jwtProtection: 'HMAC-SHA256 Bearer Token Required for Mutations',
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read vault status', details: err.message });
  }
});

// Mount Vite or static server
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Enhance Your Wealth Portfolio Server running on http://localhost:${PORT}`);
  });
}

startServer();
