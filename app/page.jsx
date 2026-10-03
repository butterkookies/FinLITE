'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import StatCards from '@/components/dashboard/StatCards';
import TransactionTable from '@/components/ledger/TransactionTable';
import NewTransactionModal from '@/components/ledger/NewTransactionModal';
import DenominationCounter from '@/components/reconciliation/DenominationCounter';
import AIChatDrawer from '@/components/ai/AIChatDrawer';
import NewProposalModal from '@/components/proposals/NewProposalModal';
import DocumentPreviewModal from '@/components/reports/DocumentPreviewModal';
import NewSemesterModal from '@/components/semesters/NewSemesterModal';
import ModuleErrorBoundary from '@/components/common/ModuleErrorBoundary';
import { createClient } from '@/lib/supabase/client';
import { isSuperAdminEmail } from '@/lib/config/admin';
import { toCentavos, fromCentavos } from '@/lib/utils/currency';

const DEFAULT_SEMESTERS = [
  { id: 'sem-26-27-1', academicYear: '2026-2027', semester: '1st Sem', label: 'AY 2026–2027 • 1st Sem', isActive: true },
  { id: 'sem-25-26-2', academicYear: '2025-2026', semester: '2nd Sem', label: 'AY 2025–2026 • 2nd Sem', isActive: false },
];

export default function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentRole, setCurrentRole] = useState('treasurer');
  const [transactions, setTransactions] = useState([]);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isDenomOpen, setIsDenomOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isProposalOpen, setIsProposalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [latestReconciliation, setLatestReconciliation] = useState(null);

  // Multi-Semester State Management
  const [semesters, setSemesters] = useState(DEFAULT_SEMESTERS);
  const [currentSemester, setCurrentSemester] = useState(DEFAULT_SEMESTERS[0]);
  const [isNewSemesterOpen, setIsNewSemesterOpen] = useState(false);

  const supabase = createClient();

  // Load user profile, semesters & transactions from Supabase on mount
  useEffect(() => {
    async function loadData() {
      if (!supabase) {
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // 1. Load Current User & Profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const email = user.email?.toLowerCase();
          const isSuperAdmin = isSuperAdminEmail(email);

          let { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('auth_user_id', user.id)
            .maybeSingle();

          if (!profile && email) {
            const { data: profileByEmail } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .maybeSingle();
            profile = profileByEmail;
          }

          if (profile) {
            setUserProfile(profile);
            setCurrentRole(isSuperAdmin ? 'admin' : (profile.role || 'member'));
          } else if (isSuperAdmin) {
            setUserProfile({
              email,
              full_name: user.user_metadata?.full_name || 'Andrei John Geronimo',
              role: 'admin',
              status: 'approved',
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            });
            setCurrentRole('admin');
          }
        }

        // 2. Load Semesters from Supabase
        let activeSemestersList = DEFAULT_SEMESTERS;
        try {
          const { data: semData, error: semError } = await supabase
            .from('semesters')
            .select('*')
            .order('academic_year', { ascending: false });

          if (!semError && semData && semData.length > 0) {
            activeSemestersList = semData.map((s) => ({
              id: s.id,
              academicYear: s.academic_year,
              semester: s.semester,
              label: s.label,
              isActive: s.is_active,
            }));
            setSemesters(activeSemestersList);
          }
        } catch (semErr) {
          console.warn('Semesters load notice:', semErr);
        }

        // Determine active semester: localStorage first, then active in DB, then fallback to first entry
        const savedSemId = typeof window !== 'undefined' ? localStorage.getItem('finlite_active_semester_id') : null;
        const matchedSemester = activeSemestersList.find((s) => s.id === savedSemId || `${s.academicYear}-${s.semester}` === savedSemId)
          || activeSemestersList.find((s) => s.isActive)
          || activeSemestersList[0];

        if (matchedSemester) {
          setCurrentSemester(matchedSemester);
        }

        // 3. Load Transactions
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .order('transaction_date', { ascending: false });

        if (error) {
          console.warn('Supabase fetch failed:', error.message);
          setTransactions([]);
        } else {
          setIsDbConnected(true);
          setTransactions(data || []);
        }

        // 4. Load Latest Cash Reconciliation from Supabase
        try {
          const { data: reconData, error: reconError } = await supabase
            .from('cash_reconciliations')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!reconError && reconData) {
            setLatestReconciliation(reconData);
            if (typeof window !== 'undefined') {
              try { localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(reconData)); } catch (_) {}
            }
          } else {
            const cached = typeof window !== 'undefined' ? localStorage.getItem('finlite_latest_reconciliation') : null;
            if (cached) {
              try { setLatestReconciliation(JSON.parse(cached)); } catch (_) {}
            }
          }
        } catch (reconErr) {
          console.warn('Reconciliation fetch note:', reconErr);
        }
      } catch (err) {
        console.error('Database connection error:', err);
        setTransactions([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Filter transactions strictly for the active semester
  const activeTransactions = transactions.filter((tx) => {
    const txAY = tx.academic_year || '2025-2026';
    const txSem = tx.semester || '2nd Sem';
    return txAY === currentSemester.academicYear && txSem === currentSemester.semester;
  });

  // Recalculate summary totals atomically with precision centavo math
  const calculateSummary = (txs) => {
    let inflows_c = 0;
    let outflows_c = 0;
    let cash_c = 0;
    let gcash_c = 0;
    let pending_reimbursements_c = 0;

    txs.forEach((tx) => {
      const amt_c = toCentavos(Number(tx.amount) || 0);

      if (tx.type === 'INFLOW') {
        inflows_c += amt_c;
        if (tx.payment_method === 'CASH') cash_c += amt_c;
        if (tx.payment_method === 'GCASH') gcash_c += amt_c;
      } else if (tx.type === 'OUTFLOW') {
        // Pending reimbursements do not deduct cash yet until disbursed
        if (tx.is_reimbursement && tx.status === 'PENDING_REIMBURSEMENT') {
          pending_reimbursements_c += amt_c;
        } else {
          outflows_c += amt_c;
          if (tx.payment_method === 'CASH') cash_c -= amt_c;
          if (tx.payment_method === 'GCASH') gcash_c -= amt_c;
        }
      }
    });

    return {
      total_inflows: fromCentavos(inflows_c),
      total_outflows: fromCentavos(outflows_c),
      cash_on_hand: fromCentavos(cash_c),
      gcash_balance: fromCentavos(gcash_c),
      pending_reimbursements: fromCentavos(pending_reimbursements_c),
    };
  };

  const summary = calculateSummary(activeTransactions);

  const handleSaveTransaction = async (newTx) => {
    const tempId = `tx-${Date.now()}`;
    const optimisticReceiptUrls = Array.isArray(newTx.receipt_urls) && newTx.receipt_urls.length > 0
      ? newTx.receipt_urls
      : (newTx.receipt_url ? [newTx.receipt_url] : []);

    const optimisticTx = {
      ...newTx,
      id: tempId,
      receipt_urls: optimisticReceiptUrls,
      receipt_url: optimisticReceiptUrls[0] || null,
      academic_year: newTx.academic_year || currentSemester.academicYear,
      semester: newTx.semester || currentSemester.semester,
    };
    setTransactions((prev) => [optimisticTx, ...prev]);

    if (supabase) {
      try {
        const uploadedReceiptUrls = [];

        // Upload any files passed in newTx.receiptFiles (up to 3)
        if (Array.isArray(newTx.receiptFiles) && newTx.receiptFiles.length > 0) {
          for (const file of newTx.receiptFiles.slice(0, 3)) {
            try {
              const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
              const filePath = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
              const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, file, {
                  cacheControl: '3600',
                  upsert: false,
                });

              if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage
                  .from('receipts')
                  .getPublicUrl(filePath);
                uploadedReceiptUrls.push(publicUrl);
              } else {
                console.error('Storage upload error:', uploadError.message);
              }
            } catch (storageErr) {
              console.warn('Storage upload note:', storageErr?.message);
            }
          }
        } else if (newTx.receiptFile) {
          try {
            const fileExt = newTx.receiptFile.name ? newTx.receiptFile.name.split('.').pop() : 'jpg';
            const filePath = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from('receipts')
              .upload(filePath, newTx.receiptFile, {
                cacheControl: '3600',
                upsert: false,
              });

            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);
              uploadedReceiptUrls.push(publicUrl);
            } else {
              console.error('Storage upload error:', uploadError.message);
            }
          } catch (storageErr) {
            console.warn('Storage upload note:', storageErr?.message);
          }
        } else if (Array.isArray(newTx.receipt_urls) && newTx.receipt_urls.length > 0) {
          uploadedReceiptUrls.push(...newTx.receipt_urls.filter((u) => !u.startsWith('blob:')));
        } else if (newTx.receipt_url && !newTx.receipt_url.startsWith('blob:')) {
          uploadedReceiptUrls.push(newTx.receipt_url);
        }

        const payload = {
          title: newTx.title,
          description: newTx.description || null,
          amount: parseFloat(newTx.amount),
          type: newTx.type,
          payment_method: newTx.payment_method,
          category_name: newTx.category_name || null,
          transaction_date: newTx.transaction_date || new Date().toISOString().split('T')[0],
          is_reimbursement: Boolean(newTx.is_reimbursement),
          reimbursement_recipient: newTx.is_reimbursement ? newTx.reimbursement_recipient : null,
          receipt_url: uploadedReceiptUrls[0] || null,
          receipt_urls: uploadedReceiptUrls,
          status: newTx.status || 'COMPLETED',
          event_name: newTx.event_name || null,
          academic_year: optimisticTx.academic_year,
          semester: optimisticTx.semester,
        };

        const { data, error } = await supabase
          .from('transactions')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Supabase transaction insert failed:', error);
        } else if (data) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === tempId ? {
              ...data,
              category_name: data.category_name || newTx.category_name,
              receipt_url: data.receipt_url || uploadedReceiptUrls[0] || null,
              receipt_urls: (Array.isArray(data.receipt_urls) && data.receipt_urls.length > 0) ? data.receipt_urls : uploadedReceiptUrls,
              academic_year: optimisticTx.academic_year,
              semester: optimisticTx.semester
            } : t))
          );
        }
      } catch (err) {
        console.error('Failed to save transaction to database:', err);
      }
    }
  };

  // Handler for attaching additional receipts to an existing transaction (Post-Entry)
  const handleAttachReceipt = async (transactionId, newReceiptFiles) => {
    if (!newReceiptFiles || newReceiptFiles.length === 0) {
      return { success: false, error: 'No files provided.' };
    }

    const targetTx = transactions.find((t) => t.id === transactionId);
    if (!targetTx) {
      return { success: false, error: 'Transaction not found.' };
    }

    const existingUrls = Array.isArray(targetTx.receipt_urls) && targetTx.receipt_urls.length > 0
      ? targetTx.receipt_urls
      : (targetTx.receipt_url ? [targetTx.receipt_url] : []);

    const remainingSlots = Math.max(0, 3 - existingUrls.length);
    const filesToUpload = newReceiptFiles.slice(0, remainingSlots);

    if (filesToUpload.length === 0) {
      return { success: false, error: 'Maximum limit of 3 receipts already reached.' };
    }

    const uploadedUrls = [];
    if (supabase) {
      for (const file of filesToUpload) {
        try {
          const fileExt = file.name ? file.name.split('.').pop() : 'jpg';
          const filePath = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(filePath, file, { cacheControl: '3600', upsert: false });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('receipts')
              .getPublicUrl(filePath);
            uploadedUrls.push(publicUrl);
          } else {
            console.error('Storage upload error:', uploadError.message);
          }
        } catch (storageErr) {
          console.warn('Storage upload error:', storageErr);
        }
      }
    } else {
      // Local fallback
      for (const file of filesToUpload) {
        uploadedUrls.push(URL.createObjectURL(file));
      }
    }

    const combinedUrls = [...existingUrls, ...uploadedUrls].slice(0, 3);

    // Update DB if Supabase is connected
    if (supabase && typeof transactionId === 'string' && !transactionId.startsWith('tx-')) {
      try {
        const { error: updateError } = await supabase
          .from('transactions')
          .update({
            receipt_urls: combinedUrls,
            receipt_url: combinedUrls[0] || null,
          })
          .eq('id', transactionId);

        if (updateError) {
          console.error('Failed to update transaction receipts in Supabase:', updateError);
          return { success: false, error: updateError.message };
        }
      } catch (err) {
        console.error('Attach receipt error:', err);
        return { success: false, error: err.message };
      }
    }

    // Optimistically update local state
    setTransactions((prev) =>
      prev.map((t) => (t.id === transactionId ? {
        ...t,
        receipt_urls: combinedUrls,
        receipt_url: combinedUrls[0] || null,
      } : t))
    );

    return { success: true, urls: combinedUrls };
  };

  // Handler for starting a new semester with carry-over rollover balance
  const handleStartSemester = async ({ academicYear, semester, label, rolloverCash, rolloverGcash, previousTermLabel }) => {
    const newSemObj = {
      id: `sem-${academicYear.replace(/[^0-9]/g, '')}-${semester.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      academicYear,
      semester,
      label,
      isActive: true,
    };

    setSemesters((prev) => [newSemObj, ...prev.filter((s) => s.academicYear !== academicYear || s.semester !== semester)]);
    setCurrentSemester(newSemObj);
    if (typeof window !== 'undefined') {
      localStorage.setItem('finlite_active_semester_id', newSemObj.id);
    }

    if (supabase) {
      try {
        await supabase.from('semesters').update({ is_active: false }).neq('academic_year', 'none');
        await supabase.from('semesters').upsert([{
          academic_year: academicYear,
          semester: semester,
          label: label,
          is_active: true,
          starting_cash_on_hand: parseFloat(rolloverCash) || 0,
          starting_gcash_balance: parseFloat(rolloverGcash) || 0,
        }], { onConflict: 'academic_year,semester' });
      } catch (semErr) {
        console.warn('Failed to persist semester to Supabase:', semErr);
      }
    }

    // If rollover cash is requested, record an official Beginning Balance Inflow
    if (rolloverCash > 0) {
      await handleSaveTransaction({
        title: `Beginning Cash on Hand (Rolled over from ${previousTermLabel})`,
        description: `Official starting balance forwarded from the verified ending cashbox of ${previousTermLabel}`,
        amount: rolloverCash,
        type: 'INFLOW',
        payment_method: 'CASH',
        category_name: 'Initial Budget Rollover',
        transaction_date: new Date().toISOString().split('T')[0],
        academic_year: academicYear,
        semester: semester,
        event_name: 'Semester Opening Turnover',
        status: 'COMPLETED',
      });
    }

    if (rolloverGcash > 0) {
      await handleSaveTransaction({
        title: `Beginning GCash Balance (Forwarded from ${previousTermLabel})`,
        description: `Starting electronic funds forwarded from ${previousTermLabel}`,
        amount: rolloverGcash,
        type: 'INFLOW',
        payment_method: 'GCASH',
        category_name: 'Initial Budget Rollover',
        transaction_date: new Date().toISOString().split('T')[0],
        academic_year: academicYear,
        semester: semester,
        event_name: 'Semester Opening Turnover',
        status: 'COMPLETED',
      });
    }
  };

  const handleDeclareShortage = async ({ amount, notes }) => {
    const shortageTx = {
      title: 'Declared Cash Shortage (Adviser Approved)',
      description: notes || 'Discrepancy identified during physical cash count audit',
      amount: parseFloat(amount),
      type: 'OUTFLOW',
      payment_method: 'CASH',
      category_name: 'Cash Shortage Discrepancy',
      transaction_date: new Date().toISOString().split('T')[0],
      academic_year: currentSemester.academicYear,
      semester: currentSemester.semester,
      is_reimbursement: false,
      event_name: 'Cash Count Audit',
      status: 'COMPLETED',
    };

    const tempId = `tx-${Date.now()}`;
    setTransactions((prev) => [{ ...shortageTx, id: tempId }, ...prev]);

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([{
            title: shortageTx.title,
            description: shortageTx.description,
            amount: shortageTx.amount,
            type: shortageTx.type,
            payment_method: shortageTx.payment_method,
            transaction_date: shortageTx.transaction_date,
            academic_year: shortageTx.academic_year,
            semester: shortageTx.semester,
            is_reimbursement: false,
            status: 'COMPLETED',
            event_name: shortageTx.event_name,
          }])
          .select()
          .single();

        if (!error && data) {
          setTransactions((prev) => prev.map((t) => (t.id === tempId ? data : t)));
        }
      } catch (err) {
        console.error('Failed to log shortage to database:', err);
      }
    }
  };

  const handleSaveAuditCount = async (audit) => {
    const payload = {
      bills_1000: audit.counts.bills_1000 || 0,
      bills_500: audit.counts.bills_500 || 0,
      bills_200: audit.counts.bills_200 || 0,
      bills_100: audit.counts.bills_100 || 0,
      bills_50: audit.counts.bills_50 || 0,
      bills_20: audit.counts.bills_20 || 0,
      coins_20: audit.counts.coins_20 || 0,
      coins_10: audit.counts.coins_10 || 0,
      coins_5: audit.counts.coins_5 || 0,
      coins_1: audit.counts.coins_1 || 0,
      coins_cents: audit.counts.coins_cents || 0,
      physical_total: audit.physicalTotal,
      ledger_cash_balance: audit.ledgerCashBalance,
      variance_amount: audit.variance,
      variance_status: audit.status,
      notes: audit.notes || null,
      academic_year: currentSemester?.academicYear || '2025-2026',
      semester: currentSemester?.semester || '1st',
      counted_by: userProfile?.id || currentUser?.id || null,
      created_at: new Date().toISOString(),
    };

    // 1. Instant optimistic state update
    setLatestReconciliation(payload);

    // 2. Persist to localStorage for immediate resilience on reload
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(payload));
      } catch (_) {}
    }

    // 3. Persist to Supabase Database
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('cash_reconciliations')
        .insert([payload])
        .select()
        .single();

      if (error) {
        console.error('Failed to save audit count to Supabase:', error.message);
      } else if (data) {
        setLatestReconciliation(data);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('finlite_latest_reconciliation', JSON.stringify(data));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.error('Failed to save audit count to database:', err);
    }
  };

  const handleOpenLiquidationPreview = () => {
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    setPreviewData({
      type: 'LIQUIDATION',
      eventName: `${currentSemester.label} Financial Operations`,
      activityTitle: `${currentSemester.label} Financial Operations`,
      transmittalDate: formattedDate,
      academicYear: currentSemester.academicYear,
      semester: currentSemester.semester,
      summary,
      transactions: activeTransactions,
      remarks: 'All transactions recorded conform with the 7-day receipt submission policy and dual club adviser audit verification.',
      signatories: {
        preparedBy: 'ANDREI JOHN P. GERONIMO',
        preparedRole: 'LITE Treasurer',
        reviewedBy: 'CHRISTIAN REY C. KASILAG',
        reviewedRole: 'LITE Auditor',
        notedBy: 'EMANUEL MALBAROSA',
        notedRole: 'LITE President',
        adviser1: 'MS. KIMBERLY DAWN JATULAN',
        adviser2: 'MS. KRIZIA MAE GENOVIA',
        adviserRole: 'LITE Club Advisers',
        directorName: 'JOVYLYN ORTIZ-CESAR, MBA, MSIT',
        directorRole: 'Program Director, BSIT',
        deanName: 'DR. EMRAIDA MARIE M. MANUCOM',
        deanRole: 'Dean, College of Computer Studies',
      },
    });
    setIsPreviewOpen(true);
  };

  const handleOpenProposalPreview = (proposalPayload) => {
    setPreviewData(proposalPayload);
    setIsPreviewOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8faf9]">
      
      {/* Top Navigation */}
      <ModuleErrorBoundary moduleName="Navigation Bar">
        <Navbar
          currentRole={currentRole}
          userProfile={userProfile}
          currentUser={currentUser}
          onOpenAI={() => setIsAIOpen(true)}
          onOpenDenominations={() => setIsDenomOpen(true)}
          currentSemester={currentSemester}
          semesters={semesters}
          onSelectSemester={(semId) => {
            const found = semesters.find((s) => s.id === semId || `${s.academicYear}-${s.semester}` === semId);
            if (found) {
              setCurrentSemester(found);
              if (typeof window !== 'undefined') {
                localStorage.setItem('finlite_active_semester_id', found.id);
              }
            }
          }}
          onOpenNewSemester={() => setIsNewSemesterOpen(true)}
        />
      </ModuleErrorBoundary>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {/* KPI Metric Cards */}
        <ModuleErrorBoundary moduleName="Financial Overview">
          <StatCards
            summary={summary}
            onOpenDenominations={() => setIsDenomOpen(true)}
          />
        </ModuleErrorBoundary>

        {/* Ledger & Transaction Table */}
        <ModuleErrorBoundary moduleName="Financial Ledger">
          <TransactionTable
            transactions={activeTransactions}
            onNewTransaction={() => setIsNewTxOpen(true)}
            onExportReport={handleOpenLiquidationPreview}
            onNewProposal={() => setIsProposalOpen(true)}
            onAttachReceipt={handleAttachReceipt}
            currentRole={currentRole}
            isDbConnected={isDbConnected}
          />
        </ModuleErrorBoundary>

      </main>

      {/* Modals & Slide-overs */}
      <ModuleErrorBoundary moduleName="Semester Management">
        <NewSemesterModal
          isOpen={isNewSemesterOpen}
          onClose={() => setIsNewSemesterOpen(false)}
          currentSemester={currentSemester}
          currentSummary={summary}
          onStartSemester={handleStartSemester}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="Transaction Entry">
        <NewTransactionModal
          isOpen={isNewTxOpen}
          onClose={() => setIsNewTxOpen(false)}
          onSave={handleSaveTransaction}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="Proposal Generator">
        <NewProposalModal
          isOpen={isProposalOpen}
          onClose={() => setIsProposalOpen(false)}
          onOpenPreview={handleOpenProposalPreview}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="Document Preview">
        {isPreviewOpen && previewData && (
          <DocumentPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            documentData={previewData}
          />
        )}
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="Cash Reconciliation">
        <DenominationCounter
          isOpen={isDenomOpen}
          onClose={() => setIsDenomOpen(false)}
          ledgerCashBalance={summary.cash_on_hand}
          onDeclareShortage={handleDeclareShortage}
          onSaveCount={handleSaveAuditCount}
          currentRole={currentRole}
          latestReconciliation={latestReconciliation}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="AI Co-Pilot">
        <AIChatDrawer
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
          summary={summary}
          transactions={activeTransactions}
        />
      </ModuleErrorBoundary>

    </div>
  );
}
