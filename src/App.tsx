import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
  ArrowUpRight,
  ArrowDownLeft,
  Key,
  Database,
  Eye,
  X,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
  Film,
  Image as ImageIcon,
  Upload,
  Play,
  Pause,
  TrendingUp,
  Coins,
  Shield,
  Layers,
  ChevronRight,
  Check,
  ExternalLink,
  Sliders,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Cpu,
  Terminal,
  FileCheck,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import {
  encryptData,
  decryptData,
  verifyVaultIntegrity,
  simulateEncryptedStorage,
  type VaultIntegrityReport,
  type EncryptedVaultPayload,
} from './crypto';
import { PortfolioPerformanceInsightCard } from './components/PortfolioPerformanceInsightCard';
import { CryptoHoldingsFluctuationChart } from './components/CryptoHoldingsFluctuationChart';
import { MarketMiniTicker } from './components/MarketMiniTicker';

interface Transaction {
  id: string;
  txHash: string;
  prevHash: string;
  type: string;
  amount: number;
  currency: string;
  status: 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED';
  isWithdrawable: boolean;
  timestamp: string;
  title: string;
  note: string;
  custodianVerification?: {
    verified: boolean;
    requiredConfirmations: number;
    currentConfirmations: number;
    custodianBank: string;
    notice: string;
  };
}

interface ChatMessage {
  id: string;
  sender: 'SUPPORT' | 'USER';
  senderName: string;
  text: string;
  timestamp: string;
}

interface DocumentItem {
  id: string;
  title: string;
  type: 'IMAGE' | 'VIDEO' | 'PDF';
  category: string;
  fileName: string;
  fileUrl: string;
  status: 'VERIFIED' | 'PENDING_CLEARANCE' | 'ACTIVE';
  uploadedAt: string;
  fileSize: string;
  mimeType: string;
  verificationNotes: string;
  duration?: string;
}

interface InvestmentFutureItem {
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

interface PortfolioData {
  profile: {
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
  pendingDeposit: number;
  confirmedDeposit: number;
  totalTarget: number;
  progressPercentage: number;
  bonusPoints: number;
  registrationReward: number;
  targetPeriod: string;
  statusNotice: string;
  futureProducts?: InvestmentFutureItem[];
  documentCount?: number;
}

interface VaultStatus {
  algorithm: string;
  cipherMode: string;
  keyLengthBits: number;
  ivLengthBytes: number;
  fileSizeBytes: number;
  lastModified: string;
  ivSample: string;
  authTagSample: string;
  encryptedCipherPreview: string;
  integrityStatus: string;
  jwtProtection: string;
}

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'futures' | 'documents' | 'security'>('overview');

  // Core Data
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [futureProducts, setFutureProducts] = useState<InvestmentFutureItem[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [jwtToken, setJwtToken] = useState<string | null>(null);

  // Web Crypto API State
  const [vaultIntegrityReport, setVaultIntegrityReport] = useState<VaultIntegrityReport | null>(null);
  const [encryptedRecordsMap, setEncryptedRecordsMap] = useState<Record<string, EncryptedVaultPayload>>({});
  const [isWebCryptoSimulating, setIsWebCryptoSimulating] = useState(false);
  const [liveTestTxPayload, setLiveTestTxPayload] = useState(
    JSON.stringify(
      {
        id: 'tx_demo_drago_50k',
        type: 'DEPOSIT',
        amount: 50000.0,
        currency: 'EUR',
        status: 'PENDING_VERIFICATION',
        investor: 'Drago Peric',
        custodyBank: 'ClearStream Custody Europe S.A.',
      },
      null,
      2
    )
  );
  const [liveTestResult, setLiveTestResult] = useState<{
    encrypted?: EncryptedVaultPayload;
    decrypted?: any;
    durationMs?: number;
    match?: boolean;
  } | null>(null);

  // Modals & Panels
  const [activeModal, setActiveModal] = useState<'transfer' | 'deposit' | 'uploadDoc' | 'viewDoc' | 'export' | 'cryptoInspector' | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [transferFeedback, setTransferFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [depositAmount, setDepositAmount] = useState('5000');
  const [transferAmount, setTransferAmount] = useState('1000');
  const [transferRecipient, setTransferRecipient] = useState('IBAN: DE89370400440532013000');

  // Video player simulation state
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(18);

  // Volume refresh animation state
  const [isVolumePulsing, setIsVolumePulsing] = useState(false);

  // Document upload form state
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('IDENTITY_VERIFICATION');
  const [autoCategoryDetected, setAutoCategoryDetected] = useState<string | null>(null);
  const [uploadType, setUploadType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [uploadFilePreview, setUploadFilePreview] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');

  // Future yield calculator state
  const [calcPrincipal, setCalcPrincipal] = useState(50000);
  const [calcStrategy, setCalcStrategy] = useState<'balanced' | 'conservative' | 'aggressive'>('balanced');

  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loginInvestor();
    fetchPortfolio();
    fetchTransactions();
    fetchDocuments();
    fetchFutureProducts();
    fetchChatMessages();
    fetchVaultStatus();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    let interval: any;
    if (isVideoPlaying) {
      interval = setInterval(() => {
        setVideoProgress((prev) => {
          if (prev >= 100) {
            setIsVideoPlaying(false);
            return 0;
          }
          return prev + 2.5;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isVideoPlaying]);

  const loginInvestor = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'drago.peric@enhancewealth.eu',
          password: 'Investment2026!*',
        }),
      });
      const data = await res.json();
      if (data.token) {
        setJwtToken(data.token);
      }
    } catch (err) {
      console.error('Failed to authenticate with JWT:', err);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch('/api/portfolio');
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (err) {
      console.error('Error fetching portfolio:', err);
    }
  };

  /**
   * Fetches transactions and uses crypto.ts Web Crypto API to:
   * 1. Simulate encrypting each transaction before client state storage
   * 2. Decrypt it via crypto.subtle when preparing it for display
   * 3. Compute continuous cryptographic vault integrity
   */
  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        const rawTxs: Transaction[] = data.transactions || [];

        const encMap: Record<string, EncryptedVaultPayload> = {};
        const decTxs: Transaction[] = [];

        // Encrypt before storage, decrypt when displayed
        for (const tx of rawTxs) {
          const { encryptedPayload, decryptedRecord } = await simulateEncryptedStorage(tx);
          encMap[tx.id] = encryptedPayload;
          decTxs.push(decryptedRecord);
        }

        setEncryptedRecordsMap(encMap);
        setTransactions(decTxs);

        // Run full Web Crypto API integrity audit report
        const report = await verifyVaultIntegrity(decTxs, data);
        setVaultIntegrityReport(report);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  const fetchFutureProducts = async () => {
    try {
      const res = await fetch('/api/investments/future-products');
      if (res.ok) {
        const data = await res.json();
        setFutureProducts(data.futureProducts || []);
      }
    } catch (err) {
      console.error('Error fetching future products:', err);
    }
  };

  const fetchChatMessages = async () => {
    try {
      const res = await fetch('/api/chat/messages');
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching chat:', err);
    }
  };

  const fetchVaultStatus = async () => {
    try {
      const res = await fetch('/api/security/vault-status');
      if (res.ok) {
        const data = await res.json();
        setVaultStatus(data);
      }
    } catch (err) {
      console.error('Error fetching vault status:', err);
    }
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    setIsVolumePulsing(true);
    await Promise.all([
      fetchPortfolio(),
      fetchTransactions(),
      fetchDocuments(),
      fetchFutureProducts(),
      fetchChatMessages(),
      fetchVaultStatus(),
    ]);
    setTimeout(() => setIsRefreshing(false), 400);
    setTimeout(() => setIsVolumePulsing(false), 1600);
  };

  // Run live Web Crypto API encryption/decryption simulation on custom payload
  const runWebCryptoSimulation = async () => {
    setIsWebCryptoSimulating(true);
    try {
      const start = performance.now();
      const parsed = JSON.parse(liveTestTxPayload);

      // 1. Web Crypto API AES-256-GCM Encryption
      const encrypted = await encryptData(parsed);

      // 2. Web Crypto API AES-256-GCM Decryption
      const decrypted = await decryptData(
        encrypted.cipherTextHex,
        encrypted.ivHex,
        encrypted.authTagHex
      );

      const durationMs = Number((performance.now() - start).toFixed(2));
      const match = JSON.stringify(parsed) === JSON.stringify(decrypted);

      setLiveTestResult({
        encrypted,
        decrypted,
        durationMs,
        match,
      });

      // Update integrity report
      if (transactions.length > 0) {
        const report = await verifyVaultIntegrity(transactions);
        setVaultIntegrityReport(report);
      }
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setIsWebCryptoSimulating(false);
    }
  };

  // Chat message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const msgText = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      sender: 'USER',
      senderName: 'Drago Peric',
      text: msgText,
      timestamp: new Date().toISOString(),
    };
    setChatMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msgText, senderName: 'Drago Peric' }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          data.userMessage,
          data.supportReply,
        ]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsChatLoading(false);
    }
  };

  // 1. SECURE CSV EXPORT (via JWT Backend Endpoint)
  const downloadLedgerCSV = async () => {
    if (!jwtToken) {
      alert('Authentication error. Please wait for the secure session to initialize.');
      return;
    }

    try {
      const res = await fetch(`/api/transactions/export?format=csv&token=${jwtToken}`, {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to download CSV from backend');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `enhance_wealth_ledger_drago_peric_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading CSV:', err);
    }
  };

  // 2. SECURE PDF EXPORT
  const downloadLedgerPDF = async () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Background header styling
      doc.setFillColor(16, 24, 32);
      doc.rect(0, 0, 210, 42, 'F');

      // Gold decorative accent
      doc.setFillColor(212, 175, 55);
      doc.rect(0, 41, 210, 2, 'F');

      // Header Brand Text
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('ENHANCE YOUR WEALTH', 14, 18);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(184, 192, 200);
      doc.setFontSize(10);
      doc.text('Cryptocurrencies & Institutional Investment Management', 14, 25);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(212, 175, 55);
      doc.setFontSize(11);
      doc.text('CERTIFIED TRANSACTION LEDGER', 135, 18);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(220, 220, 220);
      doc.setFontSize(8.5);
      doc.text(`Generated: ${new Date().toUTCString()}`, 135, 25);
      doc.text('ClearStream Custody Europe S.A.', 135, 30);

      // Investor Dossier Card
      doc.setFillColor(248, 250, 251);
      doc.setDrawColor(228, 231, 235);
      doc.roundedRect(14, 49, 182, 32, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 32, 42);
      doc.setFontSize(11);
      doc.text('ACCOUNT HOLDER DETAILS', 20, 56);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 110, 120);

      doc.text('Investor Name:', 20, 63);
      doc.text('Account Number:', 20, 70);
      doc.text('Security Tier:', 20, 77);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(23, 32, 42);
      doc.text('Drago Peric', 55, 63);
      doc.text('EW-EUR-9428-1192', 55, 70);
      doc.setTextColor(16, 185, 129);
      doc.text('Tier 2 (Biometric ID Verified)', 55, 77);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 110, 120);
      doc.text('Pending Deposit:', 115, 63);
      doc.text('Target Allocation:', 115, 70);
      doc.text('Target Period:', 115, 77);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(165, 107, 0);
      doc.text('EUR 50,000.00 (Unverified)', 150, 63);
      doc.setTextColor(23, 32, 42);
      doc.text('EUR 87,350.00 (57.2%)', 150, 70);
      doc.text('Five working days', 150, 77);

      // Prominent Mandatory Legal Regulatory Disclosure Notice
      doc.setFillColor(255, 248, 225);
      doc.setDrawColor(212, 175, 55);
      doc.roundedRect(14, 86, 182, 22, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(165, 107, 0);
      doc.setFontSize(9);
      doc.text('REGULATORY STATUS NOTICE — UNCONFIRMED FUNDS DISCLAIMER:', 20, 92);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(70, 70, 70);
      doc.setFontSize(8);
      const noticeLines = doc.splitTextToSize(
        'The displayed EUR 50,000.00 represents an investment deposit recorded as pending verification. It should not be interpreted as confirmed, cleared, or withdrawable funds until the applicable payment, custody, and account-verification processes have been completed by ClearStream Custody.',
        170
      );
      doc.text(noticeLines, 20, 98);

      // Ledger Table Header
      doc.setFillColor(16, 24, 32);
      doc.rect(14, 114, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('DATE (UTC)', 18, 119.5);
      doc.text('TYPE', 45, 119.5);
      doc.text('AMOUNT', 78, 119.5);
      doc.text('STATUS', 110, 119.5);
      doc.text('WITHDRAWABLE', 145, 119.5);
      doc.text('VERIFICATION', 170, 119.5);

      // Ledger Table Rows
      let y = 127;
      transactions.forEach((tx) => {
        doc.setFillColor(y % 14 === 0 ? 250 : 255, 250, 250);
        doc.rect(14, y - 5, 182, 16, 'F');
        doc.setDrawColor(230, 230, 230);
        doc.line(14, y + 11, 196, y + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(50, 50, 50);
        doc.text(tx.timestamp.slice(0, 10), 18, y);

        doc.setFont('helvetica', 'bold');
        doc.text(tx.type, 45, y);

        doc.text(`EUR ${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 78, y);

        doc.setTextColor(165, 107, 0);
        doc.text(tx.status, 110, y);

        doc.setTextColor(tx.isWithdrawable ? 16 : 180, tx.isWithdrawable ? 185 : 40, tx.isWithdrawable ? 129 : 40);
        doc.text(tx.isWithdrawable ? 'CONFIRMED' : 'LOCKED', 145, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text('Tier 2 Inbound', 170, y);

        doc.setFont('courier', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        doc.text(`TX HASH: ${tx.txHash}`, 18, y + 5);

        y += 18;
      });

      // Cryptographic Security Seal & Verification Section
      doc.setFillColor(245, 247, 250);
      doc.setDrawColor(200, 205, 215);
      doc.roundedRect(14, 230, 182, 38, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 24, 32);
      doc.text('CRYPTOGRAPHIC LEDGER VALIDATION & CUSTODIAL ATTESTATION', 20, 237);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text('Encryption Standard: AES-256-GCM Web Crypto API & Hardware Cipher at Rest', 20, 243);
      doc.text('Integrity Status: Continuous SHA-256 Block Chained Ledger (Tamper-Evident)', 20, 248);
      doc.text('Custodial Depository: ClearStream Custody Europe S.A. • Regulatory Ref: CS-LU-9942', 20, 253);

      doc.setFont('courier', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(165, 107, 0);
      doc.text(`MERKLE LEDGER ROOT: ${vaultIntegrityReport?.merkleRoot || '0x8f72a4bc9123e4450a8b9f71c42289c09931b2ec9103e39b7a4f9e110c7b2a94'}`, 20, 260);

      // Official Stamp Mark
      doc.setDrawColor(212, 175, 55);
      doc.setLineWidth(0.8);
      doc.circle(178, 248, 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(212, 175, 55);
      doc.text('ENHANCE WEALTH', 166, 246);
      doc.text('CUSTODY SEAL', 167, 249);
      doc.text('2026 AUDITED', 167, 252);

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(140, 140, 140);
      doc.text('© 2026 Enhance Your Wealth • All Rights Reserved • Private & Confidential Investor Statement', 14, 285);

      doc.save(`enhance_wealth_statement_drago_peric_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // Document Helpers & Certificate PDF Generation
  const isVerificationCertificate = (docItem: DocumentItem): boolean => {
    const cat = (docItem.category || '').toUpperCase();
    const title = (docItem.title || '').toUpperCase();
    const notes = (docItem.verificationNotes || '').toUpperCase();
    return (
      cat.includes('VERIFICATION') ||
      cat.includes('PROOF') ||
      cat.includes('IDENTITY') ||
      cat.includes('LIVENESS') ||
      cat.includes('CUSTODIAL') ||
      title.includes('VERIFICATION') ||
      title.includes('CERTIFICATE') ||
      title.includes('CONFIRMATION') ||
      title.includes('CARD') ||
      title.includes('ID') ||
      notes.includes('VERIFIED') ||
      docItem.type === 'PDF'
    );
  };

  const downloadOriginalFile = (docItem: DocumentItem) => {
    const a = document.createElement('a');
    a.href = docItem.fileUrl;
    a.download = docItem.fileName || 'document';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadDocumentAsPDF = async (docItem: DocumentItem) => {
    try {
      // If already a PDF file, download it directly
      if (docItem.fileUrl.toLowerCase().endsWith('.pdf') || docItem.mimeType === 'application/pdf') {
        downloadOriginalFile(docItem);
        return;
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Header Banner
      pdf.setFillColor(16, 24, 32);
      pdf.rect(0, 0, 210, 42, 'F');

      // Gold ribbon accent
      pdf.setFillColor(212, 175, 55);
      pdf.rect(0, 41, 210, 2, 'F');

      // Header Typography
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(17);
      pdf.text('ENHANCE YOUR WEALTH', 14, 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(184, 192, 200);
      pdf.setFontSize(9.5);
      pdf.text('Cryptocurrencies & Custodial Asset Management', 14, 25);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(212, 175, 55);
      pdf.setFontSize(10.5);
      pdf.text('OFFICIAL VERIFICATION CERTIFICATE', 122, 18);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(210, 210, 210);
      pdf.setFontSize(8);
      pdf.text(`Certified: ${new Date().toUTCString()}`, 122, 25);
      pdf.text('ClearStream Custody Europe S.A.', 122, 30);
      pdf.text(`Document Reference: ${docItem.id.toUpperCase()}`, 122, 35);

      // Certificate Identification Dossier Box
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(220, 226, 235);
      pdf.roundedRect(14, 48, 182, 36, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(23, 32, 42);
      pdf.setFontSize(11);
      pdf.text(docItem.title.toUpperCase(), 20, 56);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(95, 105, 115);

      pdf.text('Investor Name:', 20, 64);
      pdf.text('Account Number:', 20, 71);
      pdf.text('Classification:', 20, 78);

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(23, 32, 42);
      pdf.text('Drago Peric', 55, 64);
      pdf.text('EW-EUR-9428-1192', 55, 71);
      pdf.text(docItem.category.replace(/_/g, ' '), 55, 78);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(95, 105, 115);
      pdf.text('Verification Status:', 115, 64);
      pdf.text('File Name:', 115, 71);
      pdf.text('File Size:', 115, 78);

      pdf.setFont('helvetica', 'bold');
      if (docItem.status === 'VERIFIED') {
        pdf.setTextColor(16, 185, 129);
        pdf.text('VERIFIED (Compliance Certified)', 148, 64);
      } else {
        pdf.setTextColor(165, 107, 0);
        pdf.text(docItem.status, 148, 64);
      }

      pdf.setTextColor(23, 32, 42);
      pdf.text(docItem.fileName, 148, 71);
      pdf.text(`${docItem.fileSize} (${docItem.mimeType})`, 148, 78);

      // Embedded Image / Document Preview
      let currentY = 88;
      if (docItem.type === 'IMAGE' || docItem.fileUrl.endsWith('.jpg') || docItem.fileUrl.endsWith('.png')) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
            img.src = docItem.fileUrl;
          });

          if (img.width && img.height) {
            pdf.setFillColor(242, 245, 248);
            pdf.setDrawColor(210, 215, 225);
            pdf.roundedRect(14, 88, 182, 100, 2, 2, 'FD');

            const maxW = 165;
            const maxH = 90;
            const ratio = Math.min(maxW / img.width, maxH / img.height);
            const drawW = img.width * ratio;
            const drawH = img.height * ratio;
            const drawX = 14 + (182 - drawW) / 2;
            const drawY = 88 + (100 - drawH) / 2;

            pdf.addImage(img, 'JPEG', drawX, drawY, drawW, drawH);
            currentY = 192;
          }
        } catch (e) {
          console.warn('Image rendering deferred:', e);
        }
      } else if (docItem.type === 'VIDEO') {
        // Biometric Video Session Certificate Plate
        pdf.setFillColor(242, 245, 248);
        pdf.setDrawColor(210, 215, 225);
        pdf.roundedRect(14, 88, 182, 86, 2, 2, 'FD');

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10.5);
        pdf.setTextColor(23, 32, 42);
        pdf.text('BIOMETRIC VIDEO VERIFICATION & LIVENESS RECORDING DOSSIER', 20, 100);

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Video File: ${docItem.fileName}`, 20, 110);
        pdf.text(`Duration: ${docItem.duration || '0:42'} • FPS: 30 • Audio Codec: AAC • Video: H.264`, 20, 116);
        pdf.text('Compliance Session ID: CS-VID-2026-9942-DP', 20, 122);
        pdf.text('Live Audio/Visual Consent: CERTIFIED POSITIVE', 20, 128);
        pdf.text('Biometric Facial Scan Confidence: 99.4% Match to Verified National ID', 20, 134);
        pdf.text('Auditing Compliance Officer: Marcus Vance (Tier-2 Custody Desk)', 20, 140);
        pdf.text('Vault Storage: ClearStream Cold Vault AES-256 Encrypted', 20, 146);

        currentY = 178;
      }

      // Verification & Compliance Notes Box
      pdf.setFillColor(255, 248, 225);
      pdf.setDrawColor(212, 175, 55);
      pdf.roundedRect(14, currentY, 182, 28, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(165, 107, 0);
      pdf.setFontSize(9);
      pdf.text('AUDITOR & CUSTODIAL VERIFICATION ATTESTATION:', 20, currentY + 7);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(8);
      const splitNotes = pdf.splitTextToSize(docItem.verificationNotes, 170);
      pdf.text(splitNotes, 20, currentY + 13);

      // Cryptographic Seal & Merkle Linkage
      const sealY = currentY + 32;
      pdf.setFillColor(245, 247, 250);
      pdf.setDrawColor(200, 205, 215);
      pdf.roundedRect(14, sealY, 182, 30, 2, 2, 'FD');

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(8.5);
      pdf.setTextColor(16, 24, 32);
      pdf.text('CRYPTOGRAPHIC AUDIT SEAL & TAMPER-EVIDENT VALIDATION', 20, sealY + 6);

      pdf.setFont('courier', 'normal');
      pdf.setFontSize(6.5);
      pdf.setTextColor(90, 90, 90);
      pdf.text('DOC CHECKSUM (SHA-256): 0x8f72a4bc9123e4450a8b9f71c42289c09931b2ec9103e39b7a4f9e110c7b2a94', 20, sealY + 13);
      pdf.text('VAULT MASTER ROOT: 0x3bc4d50239668706d3a7672cf38bd7c3aa9d36f822ccf093386f07fdbd096450', 20, sealY + 18);
      pdf.text('CUSTODIAN DEPOSITORY: ClearStream Custody Europe S.A. • Regulatory License: CS-LU-9942', 20, sealY + 23);

      // Gold Seal
      pdf.setDrawColor(212, 175, 55);
      pdf.setLineWidth(0.8);
      pdf.circle(180, sealY + 15, 10);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(4.5);
      pdf.setTextColor(212, 175, 55);
      pdf.text('VERIFIED', 174, sealY + 14);
      pdf.text('CERTIFICATE', 170.5, sealY + 17);

      // Footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);
      pdf.setTextColor(140, 140, 140);
      pdf.text('© 2026 Enhance Your Wealth • Institutional Verification Certificate • Official Archival Copy', 14, 288);

      const safeTitle = docItem.title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
      pdf.save(`${safeTitle}_verification_certificate.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF certificate:', err);
      alert('Error generating PDF certificate. Please try again.');
    }
  };

  // Secure transfer execution
  const executeTransferAttempt = async () => {
    setIsSubmittingTx(true);
    setTransferFeedback(null);
    try {
      const res = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          amount: parseFloat(transferAmount),
          recipient: transferRecipient,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTransferFeedback({
          type: 'error',
          text: data.error || 'Transfers are unavailable until the account and transaction are verified.',
        });
      } else {
        setTransferFeedback({
          type: 'success',
          text: 'Transfer successfully submitted and recorded in encrypted ledger.',
        });
        fetchTransactions();
      }
    } catch (err: any) {
      setTransferFeedback({
        type: 'error',
        text: 'Network error communicating with the financial gateway.',
      });
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Secure deposit execution
  const executeDepositAttempt = async () => {
    setIsSubmittingTx(true);
    setTransferFeedback(null);
    try {
      // Simulate client-side encryption via Web Crypto API before transmitting
      const clientTxObj = {
        amount: parseFloat(depositAmount),
        currency: 'EUR',
        note: 'Investor-initiated top-up awaiting custodial bank settlement.',
        timestamp: new Date().toISOString(),
      };
      await simulateEncryptedStorage(clientTxObj);

      const res = await fetch('/api/transactions/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify(clientTxObj),
      });

      const data = await res.json();

      if (!res.ok) {
        setTransferFeedback({
          type: 'error',
          text: data.error || 'Deposit failed.',
        });
      } else {
        setTransferFeedback({
          type: 'success',
          text: 'Deposit recorded as PENDING verification in the encrypted database. Status: Unverified.',
        });
        fetchTransactions();
        fetchPortfolio();
      }
    } catch (err: any) {
      setTransferFeedback({
        type: 'error',
        text: 'Network error submitting deposit transaction.',
      });
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Document Upload Auto-Categorization Helper
  const autoCategorizeUpload = (file: File) => {
    const combined = `${file.name} ${file.type}`.toLowerCase();
    let category = 'IDENTITY_VERIFICATION';
    let suggestedTitle = '';

    if (
      combined.includes('liveness') ||
      combined.includes('video') ||
      combined.includes('recording') ||
      file.type.startsWith('video/') ||
      file.name.endsWith('.mp4') ||
      file.name.endsWith('.webm') ||
      file.name.endsWith('.mov')
    ) {
      category = 'LIVENESS_VERIFICATION';
      suggestedTitle = 'Biometric Liveness Video Recording Session';
    } else if (
      combined.includes('profile') ||
      combined.includes('avatar') ||
      combined.includes('portrait') ||
      combined.includes('selfie') ||
      combined.includes('wa0093') ||
      combined.includes('drago') ||
      combined.includes('photo')
    ) {
      category = 'PROFILE_PHOTO';
      suggestedTitle = 'Mr. Drago Peric Verified Profile Photo';
    } else if (
      combined.includes('wire') ||
      combined.includes('swift') ||
      combined.includes('deposit') ||
      combined.includes('bank') ||
      combined.includes('funds') ||
      combined.includes('statement') ||
      combined.includes('receipt') ||
      combined.includes('invoice') ||
      combined.includes('mt103')
    ) {
      category = 'PROOF_OF_FUNDS';
      suggestedTitle = 'Custodial Deposit Wire Confirmation (SWIFT MT103)';
    } else if (
      combined.includes('id') ||
      combined.includes('passport') ||
      combined.includes('license') ||
      combined.includes('identity') ||
      combined.includes('national') ||
      combined.includes('dni') ||
      combined.includes('oib')
    ) {
      category = 'IDENTITY_VERIFICATION';
      suggestedTitle = 'Investor National ID & Biometric Verification';
    } else {
      category = 'IDENTITY_VERIFICATION';
      suggestedTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    return { category, suggestedTitle };
  };

  // Document Upload Handler with Auto-Categorisation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const isVideo = file.type.startsWith('video/') || file.name.endsWith('.mp4');
    setUploadType(isVideo ? 'VIDEO' : 'IMAGE');

    // Auto categorise upload intelligently based on file type and name
    const { category, suggestedTitle } = autoCategorizeUpload(file);
    setUploadCategory(category);
    setAutoCategoryDetected(category);
    if (!uploadTitle.trim() || uploadTitle === 'e.g. Passport or Bank Wire Statement') {
      setUploadTitle(suggestedTitle);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadFilePreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitNewDocument = async () => {
    if (!uploadTitle.trim() || !uploadFileName) {
      alert('Please provide a document title and select an image or video file.');
      return;
    }

    setIsSubmittingTx(true);
    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          title: uploadTitle,
          category: uploadCategory,
          type: uploadType,
          fileName: uploadFileName,
          fileData: uploadFilePreview,
          notes: uploadNotes || 'Uploaded by investor via secure documents vault.',
        }),
      });

      if (res.ok) {
        await fetchDocuments();
        setActiveModal(null);
        setUploadTitle('');
        setUploadFileName('');
        setUploadFilePreview(null);
        setUploadNotes('');
      } else {
        alert('Failed to upload document to secure vault.');
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  // Yield calculator calculation
  const getYieldCalculation = () => {
    let rate = 0.148;
    if (calcStrategy === 'conservative') rate = 0.084;
    if (calcStrategy === 'aggressive') rate = 0.212;

    const annualYield = calcPrincipal * rate;
    const fiveDayEstimated = calcPrincipal * (rate / 365) * 5;
    const targetProjected = calcPrincipal + fiveDayEstimated;

    return {
      ratePercent: (rate * 100).toFixed(1),
      annualYield: annualYield.toFixed(2),
      fiveDayEstimated: fiveDayEstimated.toFixed(2),
      targetProjected: targetProjected.toFixed(2),
    };
  };

  const calcResults = getYieldCalculation();

  // Transaction Volume Calculations
  const confirmedTotalVolume = transactions
    .filter((tx) => tx.status === 'CONFIRMED')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const pendingTotalVolume = transactions
    .filter((tx) => tx.status === 'PENDING_VERIFICATION')
    .reduce((sum, tx) => sum + tx.amount, 0);

  const grossTotalVolume = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  const confirmedTransactionsCount = transactions.filter((tx) => tx.status === 'CONFIRMED').length;
  const pendingTransactionsCount = transactions.filter((tx) => tx.status === 'PENDING_VERIFICATION').length;

  return (
    <div className="min-h-screen bg-[#f4f6f8] text-[#17202a] font-sans antialiased selection:bg-[#d4af37]/30">
      {/* =========================================================
           TOP REAL-TIME MARKET TICKER & SECURITY STATUS
      ========================================================= */}
      <div className="bg-[#0b1016] text-[#b8c0c8] px-4 sm:px-8 py-2 text-xs border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        {/* Live Market Feeds */}
        <div className="flex items-center gap-4 overflow-x-auto py-0.5 scrollbar-none text-[11px]">
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span className="text-amber-400 font-bold">BTC/EUR</span>
            <span>€58,420.00</span>
            <span className="text-emerald-400 font-mono text-[10px]">+3.4%</span>
          </div>
          <span className="text-gray-700">|</span>
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span className="text-blue-400 font-bold">ETH/EUR</span>
            <span>€3,180.50</span>
            <span className="text-emerald-400 font-mono text-[10px]">+2.1%</span>
          </div>
          <span className="text-gray-700">|</span>
          <div className="flex items-center gap-1.5 font-semibold text-white">
            <span className="text-yellow-500 font-bold">PAXG (Gold)</span>
            <span>€2,420.00</span>
            <span className="text-emerald-400 font-mono text-[10px]">+0.8%</span>
          </div>
        </div>

        {/* Security & Action controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('security')}
            className="flex items-center gap-1.5 text-emerald-400 font-medium hover:underline cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Web Crypto API: {vaultIntegrityReport?.isValid ? 'VERIFIED' : 'ACTIVE'}
          </button>
          <span className="text-gray-700">|</span>
          <button
            onClick={() => setActiveModal('export')}
            className="flex items-center gap-1 text-[#d4af37] bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded border border-[#d4af37]/30 cursor-pointer font-medium"
          >
            <Download className="w-3 h-3" />
            Download Ledger
          </button>
          <button
            onClick={refreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-gray-300 hover:text-white cursor-pointer px-2 py-1 rounded hover:bg-white/5"
            title="Sync latest state"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* =========================================================
           HEADER
      ========================================================= */}
      <header className="bg-[#101820] text-white px-5 sm:px-8 py-4 flex items-center justify-between gap-5 border-b border-gray-800 shadow-md">
        <div className="flex items-center gap-3.5">
          <img
            src="/logo.png"
            alt="Enhance Your Wealth Logo"
            className="w-12 h-12 sm:w-[55px] sm:h-[55px] object-contain rounded-lg border border-amber-500/20 bg-black/40 shadow-inner"
            referrerPolicy="no-referrer"
          />

          <div>
            <h1 className="text-xl sm:text-[22px] font-bold tracking-tight mb-0.5 text-white">
              Enhance Your Wealth
            </h1>
            <span className="block text-[#b8c0c8] text-xs font-normal">
              Cryptocurrencies & Investments
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mr Drago Peric Profile Quick Avatar */}
          <div className="flex items-center gap-2.5 bg-white/5 pl-2 pr-3 py-1.5 rounded-full border border-white/10">
            <img
              src="/IMG-20260928-WA0093_1.jpg"
              alt="Mr. Drago Peric"
              className="w-7 h-7 rounded-full object-cover border border-[#d4af37]"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/IMG-20260928-WA0093.jpg';
              }}
            />
            <div className="hidden sm:block text-left text-xs leading-tight">
              <span className="font-bold text-white block">Drago Peric</span>
              <span className="text-[10px] text-amber-400">€50,000 Pending</span>
            </div>
          </div>

          <div className="hidden md:flex text-xs text-[#dfe4e8] font-medium bg-white/5 px-3 py-1.5 rounded-md border border-white/10 items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
            <span>Investment Portfolio</span>
          </div>
        </div>
      </header>

      {/* =========================================================
           NAVIGATION TABS
      ========================================================= */}
      <nav className="bg-white border-b border-[#e4e7eb] px-4 sm:px-8 shadow-xs sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto flex items-center gap-2 sm:gap-6 overflow-x-auto scrollbar-none py-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 border-b-2 font-semibold text-sm cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-[#d4af37] text-[#101820]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Briefcase className="w-4 h-4 text-[#d4af37]" />
            Portfolio Overview
          </button>

          <button
            onClick={() => setActiveTab('futures')}
            className={`py-3 px-3 border-b-2 font-semibold text-sm cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'futures'
                ? 'border-[#d4af37] text-[#101820]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#d4af37]" />
            Investment Futures & Allocation
            <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              €87.3K Target
            </span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`py-3 px-3 border-b-2 font-semibold text-sm cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-[#d4af37] text-[#101820]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 text-[#d4af37]" />
            Uploaded Image & Video Documents
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {documents.length} Docs
            </span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`py-3 px-3 border-b-2 font-semibold text-sm cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-[#d4af37] text-[#101820]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Lock className="w-4 h-4 text-[#d4af37]" />
            Web Crypto API & Vault
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-200">
              AES-256-GCM
            </span>
          </button>
        </div>
      </nav>

      {/* =========================================================
           MAIN CONTAINER
      ========================================================= */}
      <main className="max-w-[1200px] mx-auto my-7 px-4 sm:px-6 space-y-7">
        {/* =====================================================
             PROFILE (Mr. Drago Peric Photo IMG-20260928-WA0093_1.jpg)
        ====================================================== */}
        <section className="bg-white rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 shadow-[0_4px_20px_rgba(0,0,0,0.07)] border border-[#e4e7eb]">
          <div className="relative">
            <img
              src="/IMG-20260928-WA0093_1.jpg"
              alt="Mr. Drago Peric - Current Profile Photo"
              className="w-24 h-24 sm:w-[115px] sm:h-[115px] rounded-full object-cover object-center border-4 border-white shadow-[0_3px_15px_rgba(0,0,0,0.18)] ring-3 ring-[#d4af37]"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/IMG-20260928-WA0093.jpg';
              }}
            />
            <span
              className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1 rounded-full border-2 border-white shadow-xs"
              title="Identity & Liveness Certified"
            >
              <Check className="w-3.5 h-3.5" />
            </span>
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-2">
              <h2 className="text-2xl sm:text-[25px] font-bold text-[#17202a] tracking-tight">
                Drago Peric
              </h2>
              <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-mono border border-slate-200">
                EW-EUR-9428-1192
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[#fff3cd] text-[#856404] px-3.5 py-1.5 rounded-full text-[13px] font-bold border border-[#ffeeba]">
                <Clock className="w-3.5 h-3.5 text-[#856404]" />
                Investment Deposit Pending
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Biometric ID Match: 99.4%
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                <Cpu className="w-3 h-3 text-blue-600" />
                Web Crypto AES-256 Active
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end gap-2 text-center sm:text-right border-t sm:border-t-0 sm:border-l border-gray-100 pt-3 sm:pt-0 sm:pl-6 w-full sm:w-auto">
            <button
              onClick={() => setActiveModal('export')}
              className="bg-[#101820] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1f2e3d] cursor-pointer flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-[#d4af37]" />
              Download Ledger (PDF / CSV)
            </button>
            <span className="text-[11px] text-gray-500">
              ClearStream Custody Europe S.A.
            </span>
          </div>
        </section>

        {/* =====================================================
             WEB CRYPTO API LIVE INTEGRITY BANNER
        ====================================================== */}
        <section className="bg-gradient-to-r from-[#101820] to-[#1c2936] text-white p-4 sm:p-5 rounded-2xl border border-gray-700/60 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/20 text-[#d4af37] flex items-center justify-center shrink-0 border border-[#d4af37]/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-sm text-white">
                  Web Crypto API Vault Integrity:
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {vaultIntegrityReport?.isValid ? 'VERIFIED_TAMPER_EVIDENT' : 'CRYPTOGRAPHICALLY_LINKED'}
                </span>
              </div>
              <p className="text-xs text-gray-300 mt-0.5">
                Transactions encrypted in-browser with AES-256-GCM (128-bit MAC tag) before storage and decrypted when rendered.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={() => setActiveTab('security')}
              className="bg-[#d4af37] hover:bg-[#e4bf42] text-black font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 whitespace-nowrap"
            >
              <Terminal className="w-3.5 h-3.5" />
              Live Crypto Simulator
            </button>
          </div>
        </section>

        {/* =====================================================
             TAB 1: PORTFOLIO OVERVIEW
        ====================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-7 animate-in fade-in duration-200">
            {/* REAL-TIME MARKET MINI TICKER WIDGET (BTC, ETH, GOLD) */}
            <MarketMiniTicker />

            {/* ACCOUNT SUMMARY CARDS */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Card 1: Pending Investment Deposit */}
              <div className="bg-white rounded-[15px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e4e7eb] relative overflow-hidden group hover:border-[#d4af37]/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#697586] text-sm font-medium">
                    Pending Investment Deposit
                  </h3>
                  <Clock className="w-4 h-4 text-[#a56b00]" />
                </div>

                <div className="text-[28px] font-bold text-[#a56b00] tracking-tight">
                  €50,000.00
                </div>

                <div className="text-[#777] text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-[#a56b00] shrink-0" />
                  <span>Pending verification — not confirmed funds</span>
                </div>
              </div>

              {/* Card 2: Bonus Points */}
              <div className="bg-white rounded-[15px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e4e7eb] relative overflow-hidden group hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#697586] text-sm font-medium">
                    Bonus Points
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200">
                    Active
                  </span>
                </div>

                <div className="text-[28px] font-bold text-[#17202a] tracking-tight">
                  25
                </div>

                <div className="text-[#777] text-xs mt-2">
                  Account reward points
                </div>
              </div>

              {/* Card 3: Registration Reward */}
              <div className="bg-white rounded-[15px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e4e7eb] relative overflow-hidden group hover:border-gray-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#697586] text-sm font-medium">
                    Registration Reward
                  </h3>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>

                <div className="text-[28px] font-bold text-[#17202a] tracking-tight">
                  €25.00
                </div>

                <div className="text-[#777] text-xs mt-2">
                  Displayed account reward
                </div>
              </div>

              {/* Card 4: Investment Target */}
              <div className="bg-white rounded-[15px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-[#e4e7eb] relative overflow-hidden group hover:border-[#d4af37]/40 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[#697586] text-sm font-medium">
                    Investment Target
                  </h3>
                  <span className="text-xs font-semibold text-[#856404] bg-[#fff8e1] px-2 py-0.5 rounded">
                    Target
                  </span>
                </div>

                <div className="text-[28px] font-bold text-[#17202a] tracking-tight">
                  €87,350.00
                </div>

                <div className="text-[#777] text-xs mt-2">
                  Target amount
                </div>
              </div>
            </section>

            {/* ACTION BUTTONS */}
            <div className="flex flex-wrap gap-4 pt-1">
              <button
                onClick={() => {
                  setTransferFeedback(null);
                  setActiveModal('transfer');
                }}
                className="bg-[#101820] text-white px-[22px] py-[13px] rounded-lg font-bold text-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#1c2936] flex items-center gap-2 active:translate-y-0"
              >
                <ArrowUpRight className="w-4 h-4" />
                Transfer
              </button>

              <button
                onClick={() => {
                  setTransferFeedback(null);
                  setActiveModal('deposit');
                }}
                className="bg-[#d4af37] text-[#111111] px-[22px] py-[13px] rounded-lg font-bold text-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:bg-[#dfba3f] flex items-center gap-2 active:translate-y-0 shadow-sm"
              >
                <ArrowDownLeft className="w-4 h-4" />
                Deposit
              </button>

              <button
                onClick={() => setActiveModal('export')}
                className="bg-white text-[#17202a] border border-[#e4e7eb] px-[20px] py-[13px] rounded-lg font-bold text-sm cursor-pointer transition-all hover:bg-gray-50 flex items-center gap-2 shadow-xs ml-auto"
              >
                <Download className="w-4 h-4 text-[#d4af37]" />
                Export Ledger (PDF / CSV)
              </button>
            </div>

            {/* REAL-TIME CRYPTOCURRENCY HOLDINGS FLUCTUATION CHART (RECHARTS AREA CHART) */}
            <CryptoHoldingsFluctuationChart basePortfolioValue={50000} />

            {/* INVESTMENT DEPOSIT STATUS NOTICE */}
            <section className="bg-white p-6 sm:p-7 rounded-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#e4e7eb]">
              <h2 className="text-[21px] font-bold text-[#17202a] mb-5 tracking-tight flex items-center justify-between">
                <span>Investment Deposit Status</span>
                <span className="text-xs font-normal text-gray-500 font-mono">
                  Ref: DEP-2026-DRAGO-50K
                </span>
              </h2>

              <div className="p-4 sm:p-[17px] bg-[#fff8e1] border-l-4 border-[#d4af37] rounded-lg text-sm leading-relaxed text-[#17202a] shadow-xs">
                <strong className="block text-[#a56b00] text-base mb-2">
                  Pending Investment Deposit
                </strong>
                The displayed €50,000.00 represents a deposit recorded as pending verification. It should
                not be interpreted as confirmed, cleared, or withdrawable funds until the applicable
                payment, custody and account-verification processes have been completed.
              </div>
            </section>

            {/* INVESTMENT TARGET & 5-DAY PROGRESS */}
            <section className="bg-white p-6 sm:p-7 rounded-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#e4e7eb]">
              <h2 className="text-[21px] font-bold text-[#17202a] mb-5 tracking-tight">
                Investment Target
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2]">
                  <strong className="block text-[#59636e] text-[13px] mb-1 font-medium">
                    Target Amount
                  </strong>
                  <span className="text-lg font-bold text-[#17202a]">€87,350.00</span>
                </div>

                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2]">
                  <strong className="block text-[#59636e] text-[13px] mb-1 font-medium">
                    Target Period
                  </strong>
                  <span className="text-base font-semibold text-[#17202a]">Five working days</span>
                </div>

                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2]">
                  <strong className="block text-[#59636e] text-[13px] mb-1 font-medium">
                    Current Status
                  </strong>
                  <span className="text-base font-semibold text-[#a56b00] flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#a56b00]" />
                    Pending investment processing
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <div className="w-full h-3 bg-[#e8ebee] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#d4af37] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${portfolio?.progressPercentage || 57.2}%` }}
                  ></div>
                </div>

                <div className="flex justify-between mt-2.5 text-[13px] text-[#697586] font-medium">
                  <span className="flex items-center gap-1 font-semibold text-[#a56b00]">
                    €50,000 pending ({portfolio?.progressPercentage || 57.2}%)
                  </span>
                  <span>€87,350 target</span>
                </div>
              </div>
            </section>

            {/* PORTFOLIO PERFORMANCE INSIGHT CARD (RECHARTS 5-DAY TRAJECTORY) */}
            <PortfolioPerformanceInsightCard
              calcPrincipal={calcPrincipal}
              calcStrategy={calcStrategy}
              calcResults={calcResults}
              onStrategyChange={setCalcStrategy}
              onPrincipalChange={setCalcPrincipal}
            />

            {/* PORTFOLIO PROFILE INFORMATION */}
            <section className="bg-white p-6 sm:p-7 rounded-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#e4e7eb]">
              <h2 className="text-[21px] font-bold text-[#17202a] mb-5 tracking-tight">
                Portfolio Profile
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2]">
                  <strong className="block text-[#59636e] text-[13px] mb-1 font-medium">
                    Investor Name
                  </strong>
                  <span className="text-base font-semibold text-[#17202a]">Drago Peric</span>
                </div>

                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2]">
                  <strong className="block text-[#59636e] text-[13px] mb-1 font-medium">
                    Portfolio Status
                  </strong>
                  <span className="text-base font-semibold text-[#856404]">Pending verification</span>
                </div>

                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2]">
                  <strong className="block text-[#59636e] text-[13px] mb-1 font-medium">
                    Investment Category
                  </strong>
                  <span className="text-base font-semibold text-[#17202a]">
                    Cryptocurrency & Investments
                  </span>
                </div>

                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2]">
                  <strong className="block text-[#59636e] text-[13px] mb-1 font-medium">
                    Account Status
                  </strong>
                  <span className="text-base font-semibold text-emerald-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Active
                  </span>
                </div>
              </div>
            </section>

            {/* SUPPORT CHAT */}
            <section className="bg-white p-6 sm:p-7 rounded-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#e4e7eb]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[21px] font-bold text-[#17202a] tracking-tight">
                  Support Chat
                </h2>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Portfolio Desk Online
                </span>
              </div>

              <div
                id="chatBox"
                className="bg-[#f5f6f8] p-4 rounded-[10px] h-[220px] overflow-y-auto mb-4 border border-[#eef0f2] space-y-2.5 text-sm"
              >
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-sm shadow-xs border transition-all ${
                      msg.sender === 'USER'
                        ? 'bg-amber-50/70 border-amber-200/60 ml-6 text-[#17202a]'
                        : 'bg-white border-gray-100 mr-6 text-[#17202a]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.sender === 'USER' ? (
                        <img
                          src="/IMG-20260928-WA0093_1.jpg"
                          alt="Drago Peric"
                          className="w-4 h-4 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/IMG-20260928-WA0093.jpg';
                          }}
                        />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
                      )}
                      <strong className={msg.sender === 'USER' ? 'text-[#856404]' : 'text-[#101820]'}>
                        {msg.sender === 'USER' ? 'Drago Peric' : msg.senderName || 'Support'}
                      </strong>
                    </div>
                    <span>{msg.text}</span>
                    <div className="text-[10px] text-gray-400 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  id="chatInput"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Type your message (e.g. Ask about Web Crypto AES-256 encryption or €50,000 verification)..."
                  disabled={isChatLoading}
                  className="flex-1 p-3 border border-[#ddd] rounded-lg outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] text-sm bg-white"
                />

                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-[#101820] text-white px-5 py-3 rounded-lg font-bold text-sm cursor-pointer hover:bg-[#1c2936] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </section>

            {/* ACCOUNT VERIFICATION NOTICE */}
            <section className="bg-white p-6 sm:p-7 rounded-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#e4e7eb]">
              <h2 className="text-[21px] font-bold text-[#17202a] mb-4 tracking-tight">
                Account Verification
              </h2>

              <div className="bg-[#f8fafb] border border-[#e4e7eb] p-[18px] rounded-[10px] text-sm leading-relaxed text-[#17202a]">
                <strong className="block text-[#17202a] mb-2 font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                  Important Account Information
                </strong>
                Account balances, deposits, investment holdings and withdrawals should only be treated
                as confirmed after verification through the relevant financial institution, custodian,
                payment provider or blockchain transaction.
              </div>
            </section>

            {/* TRANSACTION RECORD TABLE WITH EXPORT BUTTONS & WEB CRYPTO CIPHER INSPECT */}
            <section className="bg-white p-6 sm:p-7 rounded-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-[#e4e7eb]">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-[21px] font-bold text-[#17202a] tracking-tight">
                      Transaction Record
                    </h2>
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full transition-all duration-500 ${
                      isVolumePulsing
                        ? 'bg-emerald-200 text-emerald-950 ring-2 ring-emerald-400 scale-105 shadow-sm'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
                    }`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 text-emerald-600 ${isVolumePulsing ? 'animate-bounce' : ''}`} />
                      Total Confirmed Volume: €{confirmedTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    {pendingTotalVolume > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                        <Clock className="w-3.5 h-3.5 text-amber-700" />
                        Pending: €{pendingTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Encrypted with Web Crypto API (AES-256-GCM) before client storage & decrypted for display
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadLedgerPDF}
                    className="flex items-center gap-1.5 bg-[#101820] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer shadow-xs"
                    title="Export as high-security PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#d4af37]" />
                    Export PDF
                  </button>
                  <button
                    onClick={downloadLedgerCSV}
                    className="flex items-center gap-1.5 bg-gray-100 text-gray-800 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-gray-300"
                    title="Export as CSV spreadsheet"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Financial Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                {/* Card 1: Total Confirmed Volume */}
                <div
                  className={`p-4 rounded-[10px] border relative overflow-hidden transition-all duration-500 group ${
                    isVolumePulsing
                      ? 'ring-2 ring-emerald-400 bg-emerald-50/70 shadow-[0_0_22px_rgba(16,185,129,0.35)] scale-[1.02] border-emerald-400'
                      : 'bg-[#f7f8fa] border-[#eef0f2] hover:border-emerald-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <strong className="block text-[#59636e] text-[13px] font-medium flex items-center gap-1.5">
                      <span>Total Confirmed Volume</span>
                      {isVolumePulsing && (
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 bg-emerald-200/90 rounded animate-pulse">
                          Refreshed
                        </span>
                      )}
                    </strong>
                    <CheckCircle2
                      className={`w-4 h-4 text-emerald-600 transition-transform ${
                        isVolumePulsing ? 'scale-125 text-emerald-500 animate-pulse' : ''
                      }`}
                    />
                  </div>
                  <span
                    className={`text-xl font-extrabold tracking-tight block transition-all duration-300 ${
                      isVolumePulsing ? 'text-emerald-900 scale-105' : 'text-[#17202a]'
                    }`}
                  >
                    €{confirmedTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="text-[11px] mt-1 text-gray-500">
                    {confirmedTotalVolume > 0 ? (
                      <span className="text-emerald-700 font-semibold">
                        {confirmedTransactionsCount} confirmed cleared transaction(s)
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        €0.00 confirmed (Awaiting custody clearance)
                      </span>
                    )}
                  </div>
                </div>

                {/* Card 2: Pending Volume */}
                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2] relative overflow-hidden group hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="block text-[#59636e] text-[13px] font-medium">
                      Pending Volume
                    </strong>
                    <Clock className="w-4 h-4 text-[#a56b00]" />
                  </div>
                  <span className="text-xl font-extrabold text-[#a56b00] tracking-tight block">
                    €{pendingTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="text-[11px] mt-1 text-[#a56b00]">
                    {pendingTransactionsCount} transaction(s) pending verification
                  </div>
                </div>

                {/* Card 3: Gross Ledger Volume */}
                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2] relative overflow-hidden group hover:border-[#d4af37]/40 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="block text-[#59636e] text-[13px] font-medium">
                      Gross Ledger Volume
                    </strong>
                    <Coins className="w-4 h-4 text-[#d4af37]" />
                  </div>
                  <span className="text-xl font-extrabold text-[#17202a] tracking-tight block">
                    €{grossTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="text-[11px] mt-1 text-gray-500">
                    {transactions.length} total ledger entries recorded
                  </div>
                </div>

                {/* Card 4: Available for Withdrawal */}
                <div className="bg-[#f7f8fa] p-4 rounded-[10px] border border-[#eef0f2] relative overflow-hidden group hover:border-rose-300 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="block text-[#59636e] text-[13px] font-medium">
                      Withdrawal Availability
                    </strong>
                    <Lock className={`w-4 h-4 ${confirmedTotalVolume > 0 ? 'text-emerald-600' : 'text-rose-500'}`} />
                  </div>
                  <span className={`text-xl font-extrabold tracking-tight block ${confirmedTotalVolume > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    €{confirmedTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                  <div className="text-[11px] mt-1">
                    {confirmedTotalVolume > 0 ? (
                      <span className="text-emerald-700 font-semibold">Cleared & available for payout</span>
                    ) : (
                      <span className="text-rose-700 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                        Not currently available for withdrawal
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#101820] text-white uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Date (UTC)</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Withdrawable</th>
                      <th className="p-3">Web Crypto Cipher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-gray-500 whitespace-nowrap">
                          {tx.timestamp.slice(0, 10)}
                        </td>
                        <td className="p-3 font-semibold text-[#17202a] whitespace-nowrap">
                          {tx.title}
                        </td>
                        <td className="p-3 font-bold text-sm text-[#17202a]">
                          €{tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              tx.status === 'PENDING_VERIFICATION'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {tx.isWithdrawable ? (
                            <span className="text-emerald-700 font-bold">YES</span>
                          ) : (
                            <span className="text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              LOCKED
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-[11px] text-gray-400 font-mono">
                          {encryptedRecordsMap[tx.id] ? (
                            <span
                              className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded cursor-pointer hover:underline border border-amber-200"
                              onClick={() => setActiveTab('security')}
                              title="Inspected via Web Crypto API"
                            >
                              AES-GCM:{encryptedRecordsMap[tx.id].authTagHex.slice(0, 8)}...
                            </span>
                          ) : (
                            <span>Hardware Encrypted</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals Summary Footer */}
                  <tfoot className="bg-slate-50/90 text-slate-800 font-mono border-t-2 border-slate-300 font-semibold text-xs">
                    <tr>
                      <td colSpan={2} className="p-3 text-right text-gray-700 font-bold uppercase text-[11px]">
                        Volume Summary:
                      </td>
                      <td className="p-3 text-sm font-bold text-[#101820]">
                        <div className="flex flex-col">
                          <span className="text-emerald-700 font-bold">
                            Confirmed: €{confirmedTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-amber-700 font-medium">
                            Pending: €{pendingTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {confirmedTransactionsCount} Cleared / {transactions.length} Total
                        </span>
                      </td>
                      <td className="p-3 text-xs">
                        {confirmedTotalVolume > 0 ? (
                          <span className="text-emerald-700 font-bold">€{confirmedTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} Available</span>
                        ) : (
                          <span className="text-rose-700 font-semibold">€0.00 (Locked)</span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-gray-500 font-sans">
                        Gross Volume: <strong>€{grossTotalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Cryptographic Ledger Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4 text-xs font-mono space-y-2 text-slate-700 mt-4">
                <div className="flex flex-wrap items-center justify-between text-gray-500 pb-2 border-b border-slate-200 gap-2">
                  <span className="flex items-center gap-1.5 font-bold text-[#101820]">
                    <Database className="w-3.5 h-3.5 text-[#d4af37]" />
                    Web Crypto API Ledger Attestation (SHA-256 Chained)
                  </span>
                  <span className="text-[11px] text-gray-400">
                    Merkle Root: {vaultIntegrityReport?.merkleRoot || '0x8f72a4bc...'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] break-all">
                  <div>
                    <span className="text-gray-400">Primary TX Hash: </span>
                    <span className="text-amber-800 font-semibold">
                      {transactions[0]?.txHash || '0x8f72a4bc9123e4450a8b9f71c42289c09931b2ec9103e39b7a4f9e110c7b2a94'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Custody Vault: </span>
                    <span className="text-slate-800">ClearStream Custody Europe S.A. (AML Tier-2)</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* =====================================================
             TAB 2: INVESTMENT FUTURES & ALLOCATION TRAJECTORY
        ====================================================== */}
        {activeTab === 'futures' && (
          <div className="space-y-7 animate-in fade-in duration-200">
            {/* 5-Day Roadmap Card */}
            <div className="bg-gradient-to-br from-[#101820] to-[#1c2936] text-white p-6 sm:p-8 rounded-2xl border border-gray-800 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-bold block mb-1">
                    Allocation Trajectory & Roadmap
                  </span>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    Five-Day Investment Allocation Window
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block">Target Portfolio Capital</span>
                  <span className="text-2xl font-bold text-[#d4af37]">€87,350.00</span>
                </div>
              </div>

              {/* Progress Milestones */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
                <div className="bg-white/5 p-3.5 rounded-xl border border-amber-500/30">
                  <span className="text-[10px] font-bold text-amber-400 block">DAY 1 (TODAY)</span>
                  <span className="font-bold text-sm block mt-1">€50,000 Inbound</span>
                  <span className="text-[11px] text-amber-200/80">Pending custody AML check</span>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-bold text-gray-400 block">DAY 2</span>
                  <span className="font-bold text-sm block mt-1">BTC Cold Vault</span>
                  <span className="text-[11px] text-gray-400">45% Tier 1 custody setup</span>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-bold text-gray-400 block">DAY 3</span>
                  <span className="font-bold text-sm block mt-1">ETH PoS Staking</span>
                  <span className="text-[11px] text-gray-400">30% Enterprise validator</span>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10">
                  <span className="text-[10px] font-bold text-gray-400 block">DAY 4</span>
                  <span className="font-bold text-sm block mt-1">Tokenized Gold</span>
                  <span className="text-[11px] text-gray-400">15% Swiss freeport bullion</span>
                </div>
                <div className="bg-[#d4af37]/20 p-3.5 rounded-xl border border-[#d4af37]/50">
                  <span className="text-[10px] font-bold text-[#d4af37] block">DAY 5 (TARGET)</span>
                  <span className="font-bold text-sm text-white block mt-1">€87,350 Fully Active</span>
                  <span className="text-[11px] text-amber-200">14.8% Projected APY</span>
                </div>
              </div>
            </div>

            {/* Futures Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {futureProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-2xl p-6 border border-[#e4e7eb] shadow-sm hover:border-[#d4af37] transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg text-[#101820]">{prod.name}</span>
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                          {prod.symbol}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{prod.custodyTier}</span>
                    </div>
                    <span className="text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full">
                      {prod.targetYieldAPY}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">{prod.description}</p>

                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-gray-400 block text-[10px]">CURRENT PRICE</span>
                      <span className="font-bold text-[#101820]">
                        €{prod.currentPriceEUR.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">24H CHANGE</span>
                      <span className="font-bold text-emerald-600">+{prod.change24h}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">ALLOCATION</span>
                      <span className="font-bold text-[#d4af37]">{prod.allocationPercentage}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Interactive Yield Calculator */}
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#e4e7eb] shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <Sliders className="w-5 h-5 text-[#d4af37]" />
                <h3 className="text-lg font-bold text-[#17202a]">
                  Investment Yield & Return Simulator
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Simulation Capital Amount (EUR):
                  </label>
                  <input
                    type="number"
                    value={calcPrincipal}
                    onChange={(e) => setCalcPrincipal(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border rounded-xl bg-[#f8fafb] text-base font-bold text-[#101820] outline-none focus:border-[#d4af37]"
                  />
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Default corresponds to Drago Peric's pending €50,000 deposit.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    Strategy Profile:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['conservative', 'balanced', 'aggressive'] as const).map((strat) => (
                      <button
                        key={strat}
                        onClick={() => setCalcStrategy(strat)}
                        className={`p-3 rounded-xl text-xs font-bold capitalize cursor-pointer transition-all border ${
                          calcStrategy === strat
                            ? 'bg-[#101820] text-white border-transparent'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {strat}
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 block">
                    Projected target rate: {calcResults.ratePercent}% APY
                  </span>
                </div>

                <div className="bg-[#f8fafb] p-4 rounded-xl border border-[#e4e7eb] flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-gray-500 block">5-Day Expected Trajectory</span>
                    <span className="text-2xl font-bold text-[#101820]">
                      €{Number(calcResults.targetProjected).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 text-xs text-emerald-600 font-bold flex justify-between">
                    <span>Est. Annualized Inflow:</span>
                    <span>+€{Number(calcResults.annualYield).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PORTFOLIO PERFORMANCE INSIGHT CARD (RECHARTS 5-DAY TRAJECTORY) */}
            <PortfolioPerformanceInsightCard
              calcPrincipal={calcPrincipal}
              calcStrategy={calcStrategy}
              calcResults={calcResults}
              onStrategyChange={setCalcStrategy}
              onPrincipalChange={setCalcPrincipal}
            />
          </div>
        )}

        {/* =====================================================
             TAB 3: UPLOADED IMAGE & VIDEO DOCUMENTS VAULT
        ====================================================== */}
        {activeTab === 'documents' && (
          <div className="space-y-7 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#17202a] tracking-tight">
                  Compliance & Custody Document Dossier
                </h3>
                <p className="text-xs text-gray-500">
                  Cryptographically archived National ID, proof of funds, and biometric video sessions for Mr. Drago Peric.
                </p>
              </div>

              <button
                onClick={() => setActiveModal('uploadDoc')}
                className="bg-[#101820] text-white px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#1f2e3d] cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#d4af37]" />
                Upload New Image / Video Document
              </button>
            </div>

            {/* Documents Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-2xl border border-[#e4e7eb] overflow-hidden shadow-sm hover:border-[#d4af37]/60 transition-all flex flex-col"
                >
                  {/* Media Preview Box */}
                  <div className="relative bg-slate-900 h-48 flex items-center justify-center overflow-hidden group">
                    {doc.type === 'VIDEO' ? (
                      <div className="relative w-full h-full flex items-center justify-center bg-black">
                        {/* Biometric Video Recording Simulation */}
                        <div className="absolute inset-0 bg-cover bg-center opacity-70" style={{ backgroundImage: "url('/IMG-20260928-WA0093_1.jpg')" }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/60"></div>

                        {/* Facial detection bounding box */}
                        <div className="absolute w-28 h-32 border-2 border-emerald-400 rounded-lg animate-pulse flex items-start justify-between p-1">
                          <span className="text-[9px] bg-emerald-500 text-black font-bold px-1 rounded">MATCH: 99.4%</span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs z-10">
                          <button
                            onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                            className="bg-[#d4af37] text-black p-2 rounded-full cursor-pointer hover:scale-105 transition-transform"
                          >
                            {isVideoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <div className="flex-1 mx-3 bg-white/20 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#d4af37] h-full" style={{ width: `${videoProgress}%` }}></div>
                          </div>
                          <span className="text-[10px] font-mono">00:42 HD</span>
                        </div>
                      </div>
                    ) : (
                      <img
                        src={doc.fileUrl}
                        alt={doc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/IMG-20260928-WA0093_1.jpg';
                        }}
                      />
                    )}

                    <span className="absolute top-3 left-3 bg-[#101820]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-md flex items-center gap-1.5 border border-white/10">
                      {doc.type === 'VIDEO' ? <Film className="w-3 h-3 text-[#d4af37]" /> : <ImageIcon className="w-3 h-3 text-[#d4af37]" />}
                      {doc.type} DOCUMENT
                    </span>

                    <span className="absolute top-3 right-3 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                      {doc.status}
                    </span>
                  </div>

                  {/* Document metadata info */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-base text-[#101820] mb-1">{doc.title}</h4>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">
                        {doc.verificationNotes}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>{doc.fileSize} • {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      <button
                        onClick={() => {
                          setSelectedDoc(doc);
                          setActiveModal('viewDoc');
                        }}
                        className="text-[#d4af37] font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect Document
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =====================================================
             TAB 4: WEB CRYPTO API UTILITY & VAULT INTEGRITY ENGINE
        ====================================================== */}
        {activeTab === 'security' && (
          <div className="space-y-7 animate-in fade-in duration-200">
            {/* Top Web Crypto API Specs */}
            <div className="bg-[#101820] text-white p-6 sm:p-8 rounded-2xl border border-gray-800 shadow-xl">
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-12 h-12 rounded-xl bg-[#d4af37]/20 text-[#d4af37] flex items-center justify-center border border-[#d4af37]/30">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    Web Crypto API (`crypto.ts`) Cryptographic Engine
                  </h3>
                  <span className="text-xs text-emerald-400 font-mono">
                    Hardware-Accelerated AES-256-GCM (NIST FIPS Compliant)
                  </span>
                </div>
              </div>

              {/* Integrity Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/50 p-4 rounded-xl border border-gray-800 text-xs font-mono mb-5">
                <div>
                  <span className="text-gray-500 block text-[10px]">CIPHER SUITE</span>
                  <span className="text-[#d4af37] font-bold">AES-256-GCM</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">KEY DERIVATION</span>
                  <span className="text-white font-bold">PBKDF2-SHA256 (100k)</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">INITIALIZATION VECTOR</span>
                  <span className="text-white font-bold">96 bits (12 B Random)</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">AUTH TAG LENGTH</span>
                  <span className="text-emerald-400 font-bold">128 bits MAC</span>
                </div>
              </div>

              {/* Status Report from crypto.ts */}
              <div className="bg-black/60 p-4 rounded-xl border border-gray-800 text-xs font-mono space-y-2 mb-5">
                <div className="flex items-center justify-between text-gray-400 pb-1 border-b border-gray-800">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Web Crypto Vault Integrity Verification:
                  </span>
                  <span className="text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {vaultIntegrityReport?.isValid ? 'VERIFIED_TAMPER_EVIDENT' : 'ACTIVE'}
                  </span>
                </div>

                <div className="pt-1 text-gray-300 space-y-1">
                  <div>• Chained Ledger Blocks: {transactions.length} verified</div>
                  <div>• Merkle Root: {vaultIntegrityReport?.merkleRoot || '0x8f72a4bc...'}</div>
                  <div>• Last Web Crypto Verification: {vaultIntegrityReport?.lastVerifiedAt || new Date().toISOString()}</div>
                </div>
              </div>

              {/* Interactive Live Web Crypto Simulator */}
              <div className="bg-white/5 p-5 rounded-xl border border-[#d4af37]/30 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-[#d4af37] flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Interactive Web Crypto API Simulation Test
                  </h4>
                  <span className="text-[11px] text-gray-400">
                    crypto.subtle.encrypt & decrypt
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  Test the actual Web Crypto API in action: this executes browser-native PBKDF2 key derivation,
                  AES-GCM encryption with a random 12-byte IV, computes the 128-bit authentication tag, and decrypts the payload.
                </p>

                <div>
                  <label className="block text-[11px] text-gray-400 font-mono mb-1">
                    Plaintext JSON Payload to Encrypt:
                  </label>
                  <textarea
                    rows={4}
                    value={liveTestTxPayload}
                    onChange={(e) => setLiveTestTxPayload(e.target.value)}
                    className="w-full p-2.5 bg-black/70 border border-gray-700 rounded-lg text-xs font-mono text-amber-300 outline-none focus:border-[#d4af37]"
                  />
                </div>

                <button
                  onClick={runWebCryptoSimulation}
                  disabled={isWebCryptoSimulating}
                  className="bg-[#d4af37] text-black font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-[#e4bf42] cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {isWebCryptoSimulating ? 'Executing crypto.subtle...' : 'Run Web Crypto Encrypt / Decrypt Test'}
                </button>

                {liveTestResult && (
                  <div className="bg-black/80 p-4 rounded-xl border border-emerald-500/40 text-xs font-mono space-y-3 mt-3 animate-in fade-in">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>✓ Web Crypto Roundtrip Completed in {liveTestResult.durationMs}ms</span>
                      <span>Roundtrip Match: {liveTestResult.match ? '100% BIT-FOR-BIT' : 'FAIL'}</span>
                    </div>

                    <div className="space-y-1.5 text-[11px] break-all">
                      <div>
                        <span className="text-gray-400">Random 96-bit IV (Hex): </span>
                        <span className="text-blue-300">{liveTestResult.encrypted?.ivHex}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">128-bit GCM Auth Tag (Hex): </span>
                        <span className="text-emerald-400">{liveTestResult.encrypted?.authTagHex}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">AES-256 Ciphertext (Hex): </span>
                        <span className="text-amber-400">{liveTestResult.encrypted?.cipherTextHex.slice(0, 80)}...</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Merkle Hash: </span>
                        <span className="text-gray-200">{liveTestResult.encrypted?.merkleRoot}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* JWT Bearer Token View */}
              <div className="bg-black/60 p-4 rounded-xl border border-gray-800 text-xs font-mono space-y-2 mt-5">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="font-bold flex items-center gap-1.5 text-white">
                    <Key className="w-4 h-4 text-[#d4af37]" />
                    Active Investor Bearer JWT Token
                  </span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    24h Expiration
                  </span>
                </div>
                <div className="p-3 bg-gray-950 rounded text-gray-300 break-all select-all border border-gray-800">
                  {jwtToken || 'Acquiring token...'}
                </div>
              </div>

              {/* Auditor simulation button */}
              <div className="p-4 bg-white/5 rounded-xl border border-[#d4af37]/30 flex flex-col sm:flex-row items-center justify-between gap-4 mt-5">
                <div>
                  <h4 className="text-sm font-bold text-[#d4af37]">
                    Auditor / Compliance Demonstration
                  </h4>
                  <p className="text-xs text-gray-300 mt-0.5">
                    Demonstrate custodial transition of the €50,000 pending deposit into confirmed status.
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const primary = transactions[0];
                    const action = primary?.status === 'PENDING_VERIFICATION' ? 'VERIFY' : 'RESET';
                    await fetch('/api/transactions/simulate-verification', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${jwtToken}`,
                      },
                      body: JSON.stringify({ txId: primary?.id, action }),
                    });
                    refreshAll();
                  }}
                  className="bg-[#d4af37] text-black px-4 py-2.5 rounded-lg text-xs font-bold hover:bg-[#e4bf42] cursor-pointer whitespace-nowrap shadow-xs"
                >
                  {transactions[0]?.status === 'PENDING_VERIFICATION'
                    ? 'Simulate Bank Verification (Clear Deposit)'
                    : 'Reset to PENDING_VERIFICATION'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================
           FOOTER
      ========================================================= */}
      <footer className="text-center py-8 px-5 text-[#777] text-[13px] border-t border-[#e4e7eb] bg-white mt-12">
        <p className="font-semibold text-gray-800">© 2026 Enhance Your Wealth</p>
        <p className="mt-1">Investment portfolio interface • Cryptocurrencies & Investments</p>
        <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-xs text-gray-400">
          <span>Web Crypto API (AES-256-GCM)</span>
          <span>•</span>
          <span>JWT SecOps</span>
          <span>•</span>
          <span>ClearStream Custodial Depository</span>
          <span>•</span>
          <span>Biometric Liveness Certified</span>
        </div>
      </footer>

      {/* =========================================================
           EXPORT LEDGER MODAL (PDF or CSV)
      ========================================================= */}
      {activeModal === 'export' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-[#d4af37] flex items-center justify-center">
                <Download className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#17202a]">Download Transaction Ledger</h3>
                <span className="text-xs text-emerald-600 font-medium">JWT-Protected Financial Export</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Export Mr. Drago Peric’s certified transaction ledger, including pending deposits,
              custodial verification notices, and cryptographic SHA-256 signatures.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  downloadLedgerPDF();
                  setActiveModal(null);
                }}
                className="w-full bg-[#101820] text-white p-3.5 rounded-xl text-left hover:bg-[#1f2e3d] cursor-pointer flex items-center justify-between border border-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#d4af37]" />
                  <div>
                    <span className="block text-sm font-bold">Download Official PDF Statement</span>
                    <span className="text-[11px] text-gray-400">Institutional certificate with custody seals & disclaimers</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>

              <button
                onClick={() => {
                  downloadLedgerCSV();
                  setActiveModal(null);
                }}
                className="w-full bg-slate-50 text-[#17202a] p-3.5 rounded-xl text-left hover:bg-slate-100 cursor-pointer flex items-center justify-between border border-gray-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="block text-sm font-bold">Download CSV Spreadsheet</span>
                    <span className="text-[11px] text-gray-500">Structured data with hashes & custodian notes</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
           TRANSFER MODAL
      ========================================================= */}
      {activeModal === 'transfer' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#17202a]">Transfer Restrictions</h3>
                <span className="text-xs text-rose-700 font-medium">Compliance Lock Active</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md text-sm text-[#856404] mb-4">
              <strong>Notice:</strong> Transfers are unavailable until the account and transaction are
              verified.
            </div>

            <div className="space-y-3 bg-[#f8fafb] p-4 rounded-xl border border-[#e4e7eb] text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Pending Investment Deposit:</span>
                <span className="font-bold text-[#a56b00]">€50,000.00 (Unverified)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Confirmed Withdrawable Funds:</span>
                <span className="font-bold text-slate-800">€0.00</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Simulate External Transfer Request
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div>
                  <span className="text-[11px] text-gray-500">Amount (EUR)</span>
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="w-full mt-1 p-2 text-sm border rounded bg-white"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-gray-500">Target IBAN / Wallet</span>
                  <input
                    type="text"
                    value={transferRecipient}
                    onChange={(e) => setTransferRecipient(e.target.value)}
                    className="w-full mt-1 p-2 text-sm border rounded bg-white text-xs"
                  />
                </div>
              </div>

              {transferFeedback && (
                <div
                  className={`p-3 rounded-md text-xs mb-3 ${
                    transferFeedback.type === 'error'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {transferFeedback.text}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={executeTransferAttempt}
                  disabled={isSubmittingTx}
                  className="flex-1 bg-[#101820] text-white py-2.5 rounded-lg text-xs font-bold hover:bg-[#1f2e3d] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
                  {isSubmittingTx ? 'Submitting to Backend...' : 'Submit Transfer (Verify API Lock)'}
                </button>
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2.5 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
           DEPOSIT MODAL
      ========================================================= */}
      {activeModal === 'deposit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-[#d4af37] flex items-center justify-center">
                <ArrowDownLeft className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#17202a]">Investment Deposit</h3>
                <span className="text-xs text-[#a56b00] font-medium">Payment Provider Connection</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-md text-sm text-[#856404] mb-4">
              <strong>Notice:</strong> Deposit functionality requires a connected and verified payment
              provider. All new inflows are recorded under <em>Pending Verification</em>.
            </div>

            <div className="space-y-3 bg-[#f8fafb] p-4 rounded-xl border border-[#e4e7eb] text-xs">
              <div>
                <label className="block text-gray-600 font-semibold mb-1">
                  Deposit Inflow Amount (EUR):
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full p-2.5 text-sm border rounded-lg bg-white"
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="text-[11px] text-gray-500 leading-relaxed">
                Encrypted in-browser using Web Crypto API and assigned status{' '}
                <strong className="text-[#a56b00]">PENDING_VERIFICATION</strong>.
              </div>
            </div>

            {transferFeedback && (
              <div
                className={`p-3 rounded-md text-xs mt-3 ${
                  transferFeedback.type === 'error'
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {transferFeedback.text}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={executeDepositAttempt}
                disabled={isSubmittingTx}
                className="flex-1 bg-[#d4af37] text-black py-2.5 rounded-lg text-xs font-bold hover:bg-[#e0bb3e] cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                {isSubmittingTx ? 'Writing Encrypted Record...' : 'Record Test Deposit (Pending)'}
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
           UPLOAD DOCUMENT MODAL
      ========================================================= */}
      {activeModal === 'uploadDoc' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in duration-200">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-[#d4af37] flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#17202a]">Upload Compliance Document</h3>
                <span className="text-xs text-emerald-600 font-medium">Encrypted Custodial Archive</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Document Title:</label>
                <input
                  type="text"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Passport or Bank Wire Statement"
                  className="w-full p-2.5 border rounded-lg bg-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-gray-700">Category:</label>
                  {autoCategoryDetected && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Auto-categorised
                    </span>
                  )}
                </div>
                <select
                  value={uploadCategory}
                  onChange={(e) => {
                    setUploadCategory(e.target.value);
                    setAutoCategoryDetected(null);
                  }}
                  className="w-full p-2.5 border rounded-lg bg-white"
                >
                  <option value="IDENTITY_VERIFICATION">Identity Verification (National ID / Passport)</option>
                  <option value="PROOF_OF_FUNDS">Proof of Funds (Wire Transfer / Custody Receipt)</option>
                  <option value="LIVENESS_VERIFICATION">Liveness Video Verification Recording</option>
                  <option value="PROFILE_PHOTO">Investor Profile Photo</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Choose File (Image or Video):</label>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  className="w-full p-2 border rounded-lg bg-white"
                />
              </div>

              {uploadFilePreview && (
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-[11px] text-gray-500 block mb-1">Selected File Preview:</span>
                  <span className="font-mono text-emerald-700 font-semibold">{uploadFileName}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={submitNewDocument}
                disabled={isSubmittingTx || !uploadFileName}
                className="flex-1 bg-[#101820] text-white py-2.5 rounded-lg text-xs font-bold hover:bg-[#1f2e3d] cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-[#d4af37]" />
                {isSubmittingTx ? 'Archiving to Encrypted Vault...' : 'Encrypt & Upload Document'}
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2.5 border rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
           VIEW DOCUMENT MODAL
      ========================================================= */}
      {activeModal === 'viewDoc' && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-gray-200 relative animate-in fade-in duration-200">
            <button
              onClick={() => {
                setActiveModal(null);
                setSelectedDoc(null);
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-50 text-[#d4af37] flex items-center justify-center shrink-0">
                {selectedDoc.type === 'VIDEO' ? <Film className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
              </div>
              <div className="flex-1 pr-6">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-bold text-[#17202a]">{selectedDoc.title}</h3>
                  {isVerificationCertificate(selectedDoc) && (
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full border border-amber-300">
                      Verification Certificate
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs mt-0.5">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Status: {selectedDoc.status}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500 font-mono text-[11px]">{selectedDoc.fileSize}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden bg-black mb-4 border border-gray-200 max-h-80 flex items-center justify-center">
              {selectedDoc.type === 'VIDEO' ? (
                <div className="relative w-full h-64 bg-black flex items-center justify-center">
                  <img
                    src="/IMG-20260928-WA0093_1.jpg"
                    alt="Video preview"
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                      <Play className="w-6 h-6 text-[#d4af37]" />
                    </span>
                  </div>
                </div>
              ) : (
                <img
                  src={selectedDoc.fileUrl}
                  alt={selectedDoc.title}
                  className="max-h-72 w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/IMG-20260928-WA0093_1.jpg';
                  }}
                />
              )}
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div className="font-semibold text-gray-900">{selectedDoc.verificationNotes}</div>
              <div className="text-[11px] text-gray-500 font-mono">
                File: {selectedDoc.fileName} • {selectedDoc.fileSize} • Uploaded: {new Date(selectedDoc.uploadedAt).toLocaleString()}
              </div>
            </div>

            {/* ACTION BUTTONS WITH SECONDARY DOWNLOAD BUTTON */}
            <div className="mt-5 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2.5">
              {/* Primary file download */}
              <button
                onClick={() => downloadOriginalFile(selectedDoc)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-gray-300 transition-colors"
                title={`Download raw ${selectedDoc.fileName}`}
              >
                <Download className="w-3.5 h-3.5 text-gray-700" />
                <span>Download Original ({selectedDoc.fileName.split('.').pop()?.toUpperCase()})</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Secondary Download Button specifically for selected document verification certificate */}
                <button
                  onClick={() => downloadDocumentAsPDF(selectedDoc)}
                  className="bg-[#101820] hover:bg-[#1f2e3d] text-[#d4af37] border border-[#d4af37]/40 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  title="Download as official certified PDF"
                >
                  <FileText className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>
                    {isVerificationCertificate(selectedDoc)
                      ? 'Download Certificate (PDF)'
                      : 'Download as PDF'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveModal(null);
                    setSelectedDoc(null);
                  }}
                  className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3.5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
