# 2.2.2 Data Dictionary

The data dictionary contains the collection and description of data in the database. It comprises the field name, field type, required, key, and domain for all production entities conforming to Third Normal Form (3NF) and live PostgreSQL database specifications.

Table 1: Profiles
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the profile record. |
| auth_user_id | uuid | NO | UK | The foreign ID referencing auth.users in Supabase. |
| full_name | text | YES |  | The full display name of the user. |
| email | text | YES | UK | The verified email address of the user. |
| role | user_role | YES |  | The system role of the user ('admin', 'treasurer', 'auditor', 'adviser', 'member'). |
| avatar_url | text | NO |  | The profile photo or Google avatar URL. |
| created_at | timestamptz | YES |  | The date and time the profile was created. |
| updated_at | timestamptz | YES |  | The date and time the profile was last modified. |
| first_name | text | NO |  | The given / first name of the user. |
| last_name | text | NO |  | The family / last name of the user. |
| contact_number | text | NO |  | The primary contact telephone or mobile number. |
| auth_provider | text | YES |  | The primary authentication provider ('email' or 'google'). |
| status | text | YES |  | The account approval status ('pending', 'approved', 'rejected', 'suspended'). |
| approved_by | uuid | NO | FK | The administrator user ID who reviewed and approved the profile. |
| approved_at | timestamptz | NO |  | The date and time the user account was approved. |
| permissions | jsonb | NO |  | Granular JSON dictionary of custom feature overrides. |
| can_record_inflows | boolean | YES |  | Flag allowing inflow cash recording permissions. |
| can_record_outflows | boolean | YES |  | Flag allowing outflow cash disbursement permissions. |
| can_edit_transactions | boolean | YES |  | Flag allowing modification of existing transactions. |
| can_audit_transactions | boolean | YES |  | Flag allowing transaction audit review and flagging. |
| can_manage_debts | boolean | YES |  | Flag allowing debt and receivable management. |
| can_manage_advances | boolean | YES |  | Flag allowing out-of-pocket advance management. |
| can_reconcile_cash | boolean | YES |  | Flag allowing physical cashbox reconciliation. |
| can_generate_reports | boolean | YES |  | Flag allowing financial statement and report generation. |

Table 2: Registration_Requests
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the registration request. |
| first_name | text | YES |  | The first name of the applicant. |
| last_name | text | YES |  | The last name of the applicant. |
| username | text | YES | UK | The unique username identifier of the applicant. |
| email | text | YES | UK | The email address of the applicant. |
| contact_number | text | NO |  | The contact telephone or mobile number of the applicant. |
| auth_provider | text | YES |  | The initial sign-in method ('email' or 'google'). |
| google_id | text | NO |  | The Google subject identifier if authenticating via OAuth. |
| avatar_url | text | NO |  | The applicant avatar image URL. |
| status | text | YES |  | The review status ('pending', 'approved', 'rejected'). |
| rejection_reason | text | NO |  | Reason notes explaining application rejection if applicable. |
| requested_role | user_role | YES |  | The requested organization role ('treasurer', 'auditor', 'member', etc.). |
| reviewed_by | uuid | NO | FK | The user ID of the reviewing administrator or adviser. |
| reviewed_at | timestamptz | NO |  | The date and time the request was reviewed. |
| created_at | timestamptz | YES |  | The date and time the request was submitted. |
| updated_at | timestamptz | YES |  | The date and time the request was last updated. |
| approved_profile_id | uuid | NO | FK | The profile ID generated upon application approval. |
| email_verified_at | timestamptz | NO |  | The date and time the email was verified. |
| permissions | jsonb | NO |  | Granular JSON permissions assigned upon approval. |
| email_verified | boolean | YES |  | Flag indicating if email ownership was verified. |
| verification_code | text | NO |  | One-time registration email verification code. |
| verification_expires_at | timestamptz | NO |  | Expiration timestamp for the registration verification code. |

Table 3: Auth_Security_State
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| auth_user_id | uuid | YES | PK | The user ID referencing auth.users. |
| password_enroll_until | timestamptz | NO |  | Expiration timestamp for setting password. |
| google_link_until | timestamptz | NO |  | Expiration timestamp for linking Google account. |
| password_set_at | timestamptz | NO |  | The date and time password was set or enrolled. |
| google_linked_at | timestamptz | NO |  | The date and time Google identity was connected. |
| updated_at | timestamptz | YES |  | The date and time the security state was last updated. |

Table 4: Email_Verification_OTPs
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the OTP record. |
| email | text | YES |  | The email address receiving the OTP. |
| code | text | YES |  | The 6-digit numeric verification OTP code. |
| purpose | text | YES |  | The purpose of the OTP ('registration' or 'password_reset'). |
| expires_at | timestamptz | YES |  | The expiration date and time of the OTP. |
| used | boolean | YES |  | Flag indicating if the OTP code has been redeemed. |
| created_at | timestamptz | YES |  | The date and time the OTP code was generated. |

Table 5: Semesters
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the semester term record. |
| academic_year | text | YES | UK | The academic school year (e.g., '2026-2027'). |
| semester | text | YES | UK | The semester term name (e.g., '1st Semester', '2nd Semester'). |
| label | text | YES |  | The descriptive display label of the academic term. |
| starting_cash_on_hand | decimal(12,2) | YES |  | The opening physical cashbox float balance in pesos. |
| starting_gcash_balance | decimal(12,2) | YES |  | The opening GCash digital wallet balance in pesos. |
| is_active | boolean | YES |  | Flag designating the currently active fiscal term. |
| created_at | timestamptz | YES |  | The date and time the semester term was created. |

Table 6: Semester_Signatories
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the semester signatory record. |
| academic_year | text | YES | UK | The academic school year for the signatory group. |
| semester | text | YES | UK | The semester term for the signatory group. |
| role_key | text | YES | UK | The standardized role key (e.g., 'treasurer', 'president', 'adviser'). |
| name | text | YES |  | The full official name of the designated signatory officer. |
| position_title | text | YES |  | The official title printed on reports (e.g., 'LITE Treasurer'). |
| category | text | YES |  | Signatory level ('OFFICER', 'ADMINISTRATION', 'FACULTY'). |
| sort_order | int | YES |  | Display sorting sequence in generated financial reports. |
| is_active | boolean | YES |  | Flag indicating if the signatory is currently active. |
| created_at | timestamptz | YES |  | The date and time the signatory was created. |
| updated_at | timestamptz | YES |  | The date and time the signatory was last modified. |
| semester_id | uuid | NO | FK | The semester ID referencing Semesters. |

Table 7: Categories
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the category record. |
| name | text | YES |  | The name of the revenue or expenditure category. |
| type | transaction_type | YES |  | The category transaction classification ('INFLOW' or 'OUTFLOW'). |
| description | text | NO |  | Detailed description of allowable items in category. |
| created_at | timestamptz | YES |  | The date and time the category was created. |

Table 8: Transactions
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the transaction record. |
| title | text | YES |  | The title or summary of the financial transaction. |
| description | text | NO |  | Detailed itemized description of the transaction. |
| amount | decimal(12,2) | YES |  | The monetary amount in pesos. |
| type | transaction_type | YES |  | The flow direction ('INFLOW' or 'OUTFLOW'). |
| payment_method | payment_method | YES |  | The payment method used ('CASH' or 'GCASH'). |
| category_id | uuid | YES | FK | The category ID referencing Categories. |
| logged_by | uuid | NO | FK | The user ID who originally entered the transaction. |
| transaction_date | date | YES |  | The date the transaction took place. |
| receipt_notes | text | NO |  | Additional annotations regarding attached physical receipts. |
| is_reimbursement | boolean | YES |  | Flag indicating if outlay is subject to personal reimbursement. |
| reimbursement_recipient | text | NO |  | Legacy recipient name for advance reimbursements. |
| status | transaction_status | YES |  | Audit status ('PENDING_AUDIT', 'COMPLETED', 'FLAGGED'). |
| event_name | text | NO |  | The related student event or club project name. |
| created_at | timestamptz | YES |  | The date and time the transaction was recorded. |
| updated_at | timestamptz | YES |  | The date and time the transaction was last updated. |
| semester_id | uuid | YES | FK | The semester ID referencing Semesters. |
| audited_by | uuid | NO | FK | The auditor ID who verified or flagged the transaction. |
| audited_at | timestamptz | NO |  | The date and time the audit was completed. |
| payer_name | varchar(150) | NO |  | Name of the student or entity paying funds (for inflows). |
| claimant_name | varchar(150) | NO |  | Authorized officer claiming reimbursement payout. |
| notes | text | NO |  | Auditor remarks, revision directives, or general notes. |
| advanced_by_name | text | NO |  | Original out-of-pocket payer name when claimed by proxy. |
| archived_at | timestamptz | NO |  | Timestamp when the transaction was voided and archived. |
| archived_by | uuid | NO | FK | Officer ID who voided or archived the transaction. |
| void_reason | text | NO |  | Auditor-compliant justification explaining why transaction was voided. |

Table 9: Transaction_Receipts
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the receipt image record. |
| transaction_id | uuid | YES | FK | The transaction ID referencing Transactions. |
| storage_path | text | NO |  | Internal Supabase Storage bucket object path. |
| public_url | text | YES |  | Public CDN or signed URL for viewing the receipt. |
| file_name | text | NO |  | Original uploaded file name. |
| file_size_bytes | int | NO |  | Exact attachment size in bytes. |
| mime_type | text | NO |  | MIME content type ('image/jpeg', 'image/png', 'application/pdf'). |
| sort_order | int | YES | UK | Display sequence order when multiple receipts are attached. |
| uploaded_by | uuid | NO | FK | Officer ID who uploaded the receipt image. |
| created_at | timestamptz | YES |  | The date and time the receipt was uploaded. |
| file_path | text | NO |  | Legacy file path string. |
| file_size | int | NO |  | Legacy file size value in bytes. |

Table 10: Transaction_Comments
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the comment record. |
| transaction_id | uuid | YES | FK | The transaction ID referencing Transactions. |
| user_id | uuid | YES | FK | User ID of the commenter referencing Profiles. |
| comment | text | YES |  | The body text of the auditor remarks or transaction comment. |
| created_at | timestamptz | YES |  | The date and time the comment was posted. |
| updated_at | timestamptz | YES |  | The date and time the comment was last modified. |
| author_id | uuid | NO | FK | Legacy author profile reference. |
| comment_text | text | NO |  | Legacy comment text representation. |
| content | text | NO |  | Synchronized comment content column for query backwards compatibility. |

Table 11: Advances_Payable
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the advance payable record. |
| semester_id | text | YES |  | The semester term key or identifier. |
| claimant_name | text | YES |  | Authorized officer claiming reimbursement payout. |
| claimant_contact | text | NO |  | Contact telephone or mobile number of claimant. |
| title | text | YES |  | Title or event description of the advance outlay. |
| category_id | uuid | NO | FK | The category ID referencing Categories. |
| event_name | text | NO |  | The related club event or project name. |
| total_amount | decimal(12,2) | YES |  | The total advance obligation in pesos. |
| amount_reimbursed | decimal(12,2) | YES |  | Total cumulative amount reimbursed to date. |
| status | advance_status | YES |  | Settlement status ('UNPAID', 'PARTIALLY_REIMBURSED', 'SETTLED', 'CANCELLED'). |
| advance_date | date | YES |  | Date the out-of-pocket expense was incurred. |
| notes | text | NO |  | Additional reimbursement terms or notes. |
| created_by | uuid | NO | FK | The user ID who recorded the advance payable. |
| created_at | timestamptz | YES |  | The date and time the advance was recorded. |
| updated_at | timestamptz | YES |  | The date and time the advance was last updated. |
| advanced_by_name | text | NO |  | Original out-of-pocket payer name when claimed by proxy. |

Table 12: Advance_Disbursements
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the disbursement payout record. |
| advance_id | uuid | YES | FK | The advance payable ID referencing Advances_Payable. |
| transaction_id | uuid | NO | FK | Ledger transaction ID referencing Transactions. |
| amount | decimal(12,2) | YES |  | Disbursed payout amount in pesos. |
| payment_method | payment_method | YES |  | Disbursement payment method ('CASH' or 'GCASH'). |
| disbursement_date | timestamptz | YES |  | Date and time the reimbursement cash was handed over. |
| disbursed_by | uuid | NO | FK | Officer ID who disbursed the reimbursement funds. |
| notes | text | NO |  | Disbursement receipt notes or claimant acknowledgments. |
| created_at | timestamptz | YES |  | The date and time the disbursement was logged. |

Table 13: Advance_Receipts
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the advance receipt record. |
| advance_id | uuid | YES | FK | The advance ID referencing Advances_Payable. |
| public_url | text | YES |  | Public storage URL of the reimbursement receipt. |
| sort_order | int | YES |  | Display sequence number. |
| created_at | timestamptz | YES |  | The date and time the receipt was uploaded. |

Table 14: Debts_Receivables
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the receivable record. |
| semester_id | text | YES |  | The semester term key or identifier. |
| debtor_name | text | YES |  | Full name of the debtor (e.g., student buyer). |
| debtor_contact | text | NO |  | Contact telephone or mobile number of debtor. |
| title | text | YES |  | Description of items ordered or merchandise sold. |
| total_amount | decimal(12,2) | YES |  | Total receivable amount in pesos. |
| amount_paid | decimal(12,2) | YES |  | Total amount paid to date in pesos. |
| status | debt_status | YES |  | Settlement status ('UNPAID', 'PARTIALLY_PAID', 'SETTLED', 'CANCELLED'). |
| due_date | date | NO |  | Agreed due date for debt settlement. |
| notes | text | NO |  | Additional receivable notes or payment terms. |
| created_by | uuid | NO | FK | User ID who recorded the receivable. |
| created_at | timestamptz | YES |  | The date and time the receivable was recorded. |
| updated_at | timestamptz | YES |  | The date and time the receivable was last updated. |

Table 15: Debt_Payments
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the debt payment record. |
| debt_id | uuid | YES | FK | The debt ID referencing Debts_Receivables. |
| transaction_id | uuid | NO | FK | Ledger transaction ID referencing Transactions. |
| amount | decimal(12,2) | YES |  | Payment installment amount in pesos. |
| payment_method | payment_method | YES |  | Payment method ('CASH' or 'GCASH'). |
| payment_date | timestamptz | YES |  | Date and time payment was received. |
| received_by | uuid | NO | FK | User ID who collected and received the cash. |
| notes | text | NO |  | Collection receipt notes or acknowledgment. |
| created_at | timestamptz | YES |  | The date and time the payment was logged. |

Table 16: Denominations
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the currency denomination. |
| code | text | YES | UK | Unique denomination code (e.g., 'PHP_1000', 'PHP_500'). |
| label | text | YES |  | Display label of the currency (e.g., '₱1,000 Bill'). |
| currency_type | text | YES |  | Currency format ('BILL' or 'COIN'). |
| face_value | decimal(12,2) | YES |  | Nominal face value in pesos. |
| display_order | int | YES |  | Display sorting order on physical cashbox keypad. |
| is_active | boolean | YES |  | Flag indicating if actively counted in reconciliation. |
| created_at | timestamptz | YES |  | The date and time the denomination was created. |

Table 17: Cash_Reconciliations
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the cash reconciliation audit session. |
| reconciliation_date | timestamptz | YES |  | Date and time physical cashbox count took place. |
| counted_by | uuid | NO | FK | User ID of the treasurer who counted the physical cash. |
| verified_by | uuid | NO | FK | User ID of the auditor or officer who witnessed the count. |
| physical_total | decimal(12,2) | YES |  | Total calculated physical cash counted in pesos. |
| ledger_cash_balance | decimal(12,2) | YES |  | Theoretical cashbook balance recorded in the ledger. |
| variance_amount | decimal(12,2) | YES |  | Variance discrepancy difference (Physical - Ledger). |
| variance_status | text | YES |  | Discrepancy classification ('BALANCED', 'SHORTAGE', 'OVERAGE'). |
| notes | text | NO |  | General remarks from counting officers. |
| adviser_approval_notes | text | NO |  | Adviser shortage justification notes. |
| status | text | YES |  | Session status ('DRAFT', 'SUBMITTED', 'VERIFIED'). |
| created_at | timestamptz | YES |  | The date and time the reconciliation session was recorded. |
| semester_id | uuid | NO | FK | The semester ID referencing Semesters. |
| approval_status | variance_approval_status | YES |  | Adviser review workflow state ('BALANCED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'). |
| adviser_decision_by | uuid | NO | FK | Adviser user ID who approved or rejected the variance. |
| adviser_decision_at | timestamptz | NO |  | Date and time the adviser decided on the variance. |
| adviser_notes | text | NO |  | Official remarks or directives written by the reviewing adviser. |

Table 18: Cash_Reconciliation_Items
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the denomination count item. |
| reconciliation_id | uuid | YES | FK | Session ID referencing Cash_Reconciliations. |
| denomination_id | uuid | YES | FK | Denomination ID referencing Denominations. |
| quantity | int | YES |  | Piece count quantity of the denomination. |
| subtotal | decimal(12,2) | YES |  | Calculated subtotal for this denomination in pesos. |
| created_at | timestamptz | YES |  | The date and time the piece count was recorded. |

Table 19: Audit_Logs (Supplemental Audit Trail)
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the immutable audit event log. |
| user_id | uuid | NO | FK | The user profile ID who initiated the financial event. |
| action | text | YES |  | High-level action verb ('AUTH_LOGIN', 'TRANSACTION_VOID', 'VARIANCE_DECISION', etc.). |
| entity_type | text | YES |  | Relational domain of the target record ('transaction', 'auth_session', 'cash_box'). |
| entity_id | text | NO |  | Business record UUID or unique key affected. |
| details | jsonb | NO |  | JSON snapshot of previous/current diffs, client IP address, and role metadata. |
| created_at | timestamptz | YES |  | The immutable timestamp when the audit log entry was committed. |
