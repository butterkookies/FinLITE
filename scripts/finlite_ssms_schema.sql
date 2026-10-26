-- ============================================================================
-- FinLITE Database Schema for Microsoft SQL Server / SSMS (SQL Server 2022)
-- Generated from docs/specs/DATA_DICTIONARY_18_TABLES.md (18 Canonical Tables)
-- ============================================================================

-- 1. Create and switch to database (Optional: modify DB name as needed)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'FinLITE_DB')
BEGIN
    CREATE DATABASE FinLITE_DB;
END
GO

USE FinLITE_DB;
GO

-- Set database owner to 'sa' to avoid SSMS Database Diagram permission issues
ALTER AUTHORIZATION ON DATABASE::FinLITE_DB TO [sa];
GO

-- ============================================================================
-- DROP EXISTING TABLES (Reverse Dependency Order)
-- ============================================================================
IF OBJECT_ID('dbo.Audit_Logs', 'U') IS NOT NULL DROP TABLE dbo.Audit_Logs;
IF OBJECT_ID('dbo.Cash_Reconciliation_Items', 'U') IS NOT NULL DROP TABLE dbo.Cash_Reconciliation_Items;
IF OBJECT_ID('dbo.Cash_Reconciliations', 'U') IS NOT NULL DROP TABLE dbo.Cash_Reconciliations;
IF OBJECT_ID('dbo.Denominations', 'U') IS NOT NULL DROP TABLE dbo.Denominations;
IF OBJECT_ID('dbo.Debt_Payments', 'U') IS NOT NULL DROP TABLE dbo.Debt_Payments;
IF OBJECT_ID('dbo.Debts_Receivables', 'U') IS NOT NULL DROP TABLE dbo.Debts_Receivables;
IF OBJECT_ID('dbo.Advance_Receipts', 'U') IS NOT NULL DROP TABLE dbo.Advance_Receipts;
IF OBJECT_ID('dbo.Advance_Disbursements', 'U') IS NOT NULL DROP TABLE dbo.Advance_Disbursements;
IF OBJECT_ID('dbo.Advances_Payable', 'U') IS NOT NULL DROP TABLE dbo.Advances_Payable;
IF OBJECT_ID('dbo.Transaction_Comments', 'U') IS NOT NULL DROP TABLE dbo.Transaction_Comments;
IF OBJECT_ID('dbo.Transaction_Receipts', 'U') IS NOT NULL DROP TABLE dbo.Transaction_Receipts;
IF OBJECT_ID('dbo.Transactions', 'U') IS NOT NULL DROP TABLE dbo.Transactions;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.Semester_Signatories', 'U') IS NOT NULL DROP TABLE dbo.Semester_Signatories;
IF OBJECT_ID('dbo.Semesters', 'U') IS NOT NULL DROP TABLE dbo.Semesters;
IF OBJECT_ID('dbo.Email_Verification_OTPs', 'U') IS NOT NULL DROP TABLE dbo.Email_Verification_OTPs;
IF OBJECT_ID('dbo.Auth_Security_State', 'U') IS NOT NULL DROP TABLE dbo.Auth_Security_State;
IF OBJECT_ID('dbo.Registration_Requests', 'U') IS NOT NULL DROP TABLE dbo.Registration_Requests;
IF OBJECT_ID('dbo.Profiles', 'U') IS NOT NULL DROP TABLE dbo.Profiles;
GO

-- ============================================================================
-- 1. Table: Profiles
-- ============================================================================
CREATE TABLE dbo.Profiles (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    auth_user_id UNIQUEIDENTIFIER NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    can_record_inflows BIT NOT NULL DEFAULT 0,
    can_record_outflows BIT NOT NULL DEFAULT 0,
    can_edit_transactions BIT NOT NULL DEFAULT 0,
    can_audit_transactions BIT NOT NULL DEFAULT 0,
    can_manage_debts BIT NOT NULL DEFAULT 0,
    can_manage_advances BIT NOT NULL DEFAULT 0,
    can_reconcile_cash BIT NOT NULL DEFAULT 0,
    can_generate_reports BIT NOT NULL DEFAULT 0,
    avatar_url NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Profiles PRIMARY KEY (id),
    CONSTRAINT UQ_Profiles_auth_user_id UNIQUE (auth_user_id),
    CONSTRAINT UQ_Profiles_email UNIQUE (email)
);
GO

-- ============================================================================
-- 2. Table: Registration_Requests
-- ============================================================================
CREATE TABLE dbo.Registration_Requests (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NULL,
    auth_provider VARCHAR(20) NOT NULL,
    google_id VARCHAR(100) NULL,
    avatar_url NVARCHAR(MAX) NULL,
    status VARCHAR(20) NOT NULL,
    rejection_reason NVARCHAR(MAX) NULL,
    requested_role VARCHAR(20) NOT NULL,
    reviewed_by UNIQUEIDENTIFIER NULL,
    reviewed_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Registration_Requests PRIMARY KEY (id),
    CONSTRAINT UQ_Registration_Requests_email UNIQUE (email),
    CONSTRAINT FK_Registration_Requests_Profiles FOREIGN KEY (reviewed_by) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 3. Table: Auth_Security_State
-- ============================================================================
CREATE TABLE dbo.Auth_Security_State (
    auth_user_id UNIQUEIDENTIFIER NOT NULL,
    profile_id UNIQUEIDENTIFIER NULL,
    password_enroll_until DATETIME2 NULL,
    google_link_until DATETIME2 NULL,
    password_set_at DATETIME2 NULL,
    google_linked_at DATETIME2 NULL,
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Auth_Security_State PRIMARY KEY (auth_user_id),
    CONSTRAINT FK_Auth_Security_State_Profiles_ID FOREIGN KEY (profile_id) REFERENCES dbo.Profiles(id) ON DELETE CASCADE
);
GO

-- ============================================================================
-- 4. Table: Email_Verification_OTPs
-- ============================================================================
CREATE TABLE dbo.Email_Verification_OTPs (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    profile_id UNIQUEIDENTIFIER NULL,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    used BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Email_Verification_OTPs PRIMARY KEY (id),
    CONSTRAINT FK_Email_Verification_OTPs_Profiles_ID FOREIGN KEY (profile_id) REFERENCES dbo.Profiles(id) ON DELETE CASCADE
);
GO

-- ============================================================================
-- 5. Table: Semesters
-- ============================================================================
CREATE TABLE dbo.Semesters (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    label VARCHAR(100) NOT NULL,
    starting_cash_on_hand DECIMAL(12,2) NOT NULL,
    is_active BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Semesters PRIMARY KEY (id)
);
GO

-- ============================================================================
-- 6. Table: Semester_Signatories
-- ============================================================================
CREATE TABLE dbo.Semester_Signatories (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    role_key VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    position_title VARCHAR(150) NOT NULL,
    category VARCHAR(20) NOT NULL,
    sort_order INT NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Semester_Signatories PRIMARY KEY (id)
);
GO

-- ============================================================================
-- 7. Table: Categories
-- ============================================================================
CREATE TABLE dbo.Categories (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(10) NOT NULL,
    description NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Categories PRIMARY KEY (id)
);
GO

-- ============================================================================
-- 8. Table: Denominations
-- ============================================================================
CREATE TABLE dbo.Denominations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    code VARCHAR(30) NOT NULL,
    label VARCHAR(50) NOT NULL,
    currency_type VARCHAR(10) NOT NULL,
    face_value DECIMAL(12,2) NOT NULL,
    display_order INT NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Denominations PRIMARY KEY (id),
    CONSTRAINT UQ_Denominations_code UNIQUE (code)
);
GO

-- ============================================================================
-- 9. Table: Transactions
-- ============================================================================
CREATE TABLE dbo.Transactions (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    semester_id UNIQUEIDENTIFIER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NULL,
    amount DECIMAL(12,2) NOT NULL,
    type VARCHAR(10) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    category_id UNIQUEIDENTIFIER NULL,
    logged_by UNIQUEIDENTIFIER NULL,
    transaction_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    audited_by UNIQUEIDENTIFIER NULL,
    audited_at DATETIME2 NULL,
    is_reimbursement BIT NOT NULL DEFAULT 0,
    payer_name VARCHAR(150) NULL,
    claimant_name VARCHAR(150) NULL,
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Transactions PRIMARY KEY (id),
    CONSTRAINT FK_Transactions_Semesters FOREIGN KEY (semester_id) REFERENCES dbo.Semesters(id),
    CONSTRAINT FK_Transactions_Categories FOREIGN KEY (category_id) REFERENCES dbo.Categories(id),
    CONSTRAINT FK_Transactions_LoggedBy FOREIGN KEY (logged_by) REFERENCES dbo.Profiles(id),
    CONSTRAINT FK_Transactions_AuditedBy FOREIGN KEY (audited_by) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 10. Table: Transaction_Receipts
-- ============================================================================
CREATE TABLE dbo.Transaction_Receipts (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    transaction_id UNIQUEIDENTIFIER NOT NULL,
    public_url NVARCHAR(MAX) NOT NULL,
    file_path NVARCHAR(MAX) NULL,
    file_name VARCHAR(255) NULL,
    file_size INT NULL,
    mime_type VARCHAR(50) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Transaction_Receipts PRIMARY KEY (id),
    CONSTRAINT FK_Transaction_Receipts_Transactions FOREIGN KEY (transaction_id) REFERENCES dbo.Transactions(id) ON DELETE CASCADE
);
GO

-- ============================================================================
-- 11. Table: Transaction_Comments
-- ============================================================================
CREATE TABLE dbo.Transaction_Comments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    transaction_id UNIQUEIDENTIFIER NOT NULL,
    author_id UNIQUEIDENTIFIER NULL,
    comment_text NVARCHAR(MAX) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Transaction_Comments PRIMARY KEY (id),
    CONSTRAINT FK_Transaction_Comments_Transactions FOREIGN KEY (transaction_id) REFERENCES dbo.Transactions(id) ON DELETE CASCADE,
    CONSTRAINT FK_Transaction_Comments_Profiles FOREIGN KEY (author_id) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 12. Table: Advances_Payable
-- ============================================================================
CREATE TABLE dbo.Advances_Payable (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    semester_id UNIQUEIDENTIFIER NOT NULL,
    claimant_name VARCHAR(150) NOT NULL,
    claimant_contact VARCHAR(50) NULL,
    title VARCHAR(255) NOT NULL,
    category_id UNIQUEIDENTIFIER NULL,
    event_name VARCHAR(150) NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_reimbursed DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(25) NOT NULL,
    advance_date DATE NOT NULL,
    notes NVARCHAR(MAX) NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Advances_Payable PRIMARY KEY (id),
    CONSTRAINT FK_Advances_Payable_Semesters FOREIGN KEY (semester_id) REFERENCES dbo.Semesters(id),
    CONSTRAINT FK_Advances_Payable_Categories FOREIGN KEY (category_id) REFERENCES dbo.Categories(id),
    CONSTRAINT FK_Advances_Payable_Profiles FOREIGN KEY (created_by) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 13. Table: Advance_Disbursements
-- ============================================================================
CREATE TABLE dbo.Advance_Disbursements (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    advance_id UNIQUEIDENTIFIER NOT NULL,
    transaction_id UNIQUEIDENTIFIER NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    disbursement_date DATETIME2 NOT NULL,
    disbursed_by UNIQUEIDENTIFIER NULL,
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Advance_Disbursements PRIMARY KEY (id),
    CONSTRAINT FK_Advance_Disbursements_Advances FOREIGN KEY (advance_id) REFERENCES dbo.Advances_Payable(id),
    CONSTRAINT FK_Advance_Disbursements_Transactions FOREIGN KEY (transaction_id) REFERENCES dbo.Transactions(id),
    CONSTRAINT FK_Advance_Disbursements_Profiles FOREIGN KEY (disbursed_by) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 14. Table: Advance_Receipts
-- ============================================================================
CREATE TABLE dbo.Advance_Receipts (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    advance_id UNIQUEIDENTIFIER NOT NULL,
    public_url NVARCHAR(MAX) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Advance_Receipts PRIMARY KEY (id),
    CONSTRAINT FK_Advance_Receipts_Advances FOREIGN KEY (advance_id) REFERENCES dbo.Advances_Payable(id) ON DELETE CASCADE
);
GO

-- ============================================================================
-- 15. Table: Debts_Receivables
-- ============================================================================
CREATE TABLE dbo.Debts_Receivables (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    semester_id UNIQUEIDENTIFIER NOT NULL,
    debtor_name VARCHAR(150) NOT NULL,
    debtor_contact VARCHAR(50) NULL,
    title VARCHAR(255) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL,
    due_date DATE NULL,
    notes NVARCHAR(MAX) NULL,
    created_by UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Debts_Receivables PRIMARY KEY (id),
    CONSTRAINT FK_Debts_Receivables_Semesters FOREIGN KEY (semester_id) REFERENCES dbo.Semesters(id),
    CONSTRAINT FK_Debts_Receivables_Profiles FOREIGN KEY (created_by) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 16. Table: Debt_Payments
-- ============================================================================
CREATE TABLE dbo.Debt_Payments (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    debt_id UNIQUEIDENTIFIER NOT NULL,
    transaction_id UNIQUEIDENTIFIER NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_date DATETIME2 NOT NULL,
    received_by UNIQUEIDENTIFIER NULL,
    notes NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Debt_Payments PRIMARY KEY (id),
    CONSTRAINT FK_Debt_Payments_Debts FOREIGN KEY (debt_id) REFERENCES dbo.Debts_Receivables(id),
    CONSTRAINT FK_Debt_Payments_Transactions FOREIGN KEY (transaction_id) REFERENCES dbo.Transactions(id),
    CONSTRAINT FK_Debt_Payments_Profiles FOREIGN KEY (received_by) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 17. Table: Cash_Reconciliations
-- ============================================================================
CREATE TABLE dbo.Cash_Reconciliations (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    semester_id UNIQUEIDENTIFIER NOT NULL,
    reconciliation_date DATETIME2 NOT NULL,
    counted_by UNIQUEIDENTIFIER NULL,
    verified_by UNIQUEIDENTIFIER NULL,
    physical_total DECIMAL(12,2) NOT NULL,
    ledger_cash_balance DECIMAL(12,2) NOT NULL,
    variance_amount DECIMAL(12,2) NOT NULL,
    variance_status VARCHAR(20) NOT NULL,
    notes NVARCHAR(MAX) NULL,
    adviser_approval_notes NVARCHAR(MAX) NULL,
    status VARCHAR(20) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Cash_Reconciliations PRIMARY KEY (id),
    CONSTRAINT FK_Cash_Reconciliations_Semesters FOREIGN KEY (semester_id) REFERENCES dbo.Semesters(id),
    CONSTRAINT FK_Cash_Reconciliations_CountedBy FOREIGN KEY (counted_by) REFERENCES dbo.Profiles(id),
    CONSTRAINT FK_Cash_Reconciliations_VerifiedBy FOREIGN KEY (verified_by) REFERENCES dbo.Profiles(id)
);
GO

-- ============================================================================
-- 18. Table: Cash_Reconciliation_Items
-- ============================================================================
CREATE TABLE dbo.Cash_Reconciliation_Items (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    reconciliation_id UNIQUEIDENTIFIER NOT NULL,
    denomination_id UNIQUEIDENTIFIER NOT NULL,
    quantity INT NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Cash_Reconciliation_Items PRIMARY KEY (id),
    CONSTRAINT FK_Cash_Reconciliation_Items_Reconciliations FOREIGN KEY (reconciliation_id) REFERENCES dbo.Cash_Reconciliations(id) ON DELETE CASCADE,
    CONSTRAINT FK_Cash_Reconciliation_Items_Denominations FOREIGN KEY (denomination_id) REFERENCES dbo.Denominations(id)
);
GO

-- ============================================================================
-- 19. Table: Audit_Logs (DFD Level 1 Db 6 — Immutable Financial Audit Trail)
-- ============================================================================
CREATE TABLE dbo.Audit_Logs (
    id UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NULL,
    details NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    CONSTRAINT PK_Audit_Logs PRIMARY KEY (id),
    CONSTRAINT FK_Audit_Logs_Profiles FOREIGN KEY (user_id) REFERENCES dbo.Profiles(id) ON DELETE SET NULL
);
GO
