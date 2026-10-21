# 2.2.2 Data Dictionary

The data dictionary contains the collection and description of data in the database. It comprises the field name, field type, required, key, and domain

Table 1: Profiles
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the profile record. |
| auth_user_id | uuid | YES | UK | The foreign ID referencing auth.users. |
| full_name | varchar(150) | YES | | The full name of the user. |
| email | varchar(255) | YES | UK | The email address of the user. |
| role | varchar(20) | YES | | The system role of the user. |
| status | varchar(20) | YES | | The account approval status. |
| can_record_inflows | boolean | YES | | Flag allowing inflow entry. |
| can_record_outflows | boolean | YES | | Flag allowing outflow entry. |
| can_edit_transactions | boolean | YES | | Flag allowing transaction edits. |
| can_audit_transactions | boolean | YES | | Flag allowing transaction audits. |
| can_manage_debts | boolean | YES | | Flag allowing debt management. |
| can_manage_advances | boolean | YES | | Flag allowing advance management. |
| can_reconcile_cash | boolean | YES | | Flag allowing cash reconciliation. |
| can_generate_reports | boolean | YES | | Flag allowing report generation. |
| avatar_url | text | NO | | The profile image URL. |
| created_at | timestamptz | YES | | The date and time registered. |
| updated_at | timestamptz | YES | | The date and time last modified. |

Table 2: Registration_Requests
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the request. |
| first_name | varchar(100) | YES | | The first name of the applicant. |
| last_name | varchar(100) | YES | | The last name of the applicant. |
| email | varchar(255) | YES | UK | The email address of the applicant. |
| contact_number | varchar(20) | NO | | The contact number of the applicant. |
| auth_provider | varchar(20) | YES | | The sign-in method ('email' or 'google'). |
| google_id | varchar(100) | NO | | The Google subject identifier. |
| avatar_url | text | NO | | The avatar photo URL. |
| status | varchar(20) | YES | | The approval status ('pending', 'approved', 'rejected'). |
| rejection_reason | text | NO | | The reason for application rejection. |
| requested_role | varchar(20) | YES | | The requested user role. |
| reviewed_by | uuid | NO | FK | The ID of the reviewing adviser. |
| reviewed_at | timestamptz | NO | | The date and time reviewed. |
| created_at | timestamptz | YES | | The date and time submitted. |
| updated_at | timestamptz | YES | | The date and time last modified. |

Table 3: Auth_Security_State
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| auth_user_id | uuid | YES | PK | The user ID referencing auth.users. |
| password_enroll_until | timestamptz | NO | | Expiration timestamp for setting password. |
| google_link_until | timestamptz | NO | | Expiration timestamp for linking Google. |
| password_set_at | timestamptz | NO | | The date and time password was set. |
| google_linked_at | timestamptz | NO | | The date and time Google was linked. |
| updated_at | timestamptz | YES | | The date and time last updated. |

Table 4: Email_Verification_OTPs
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the OTP record. |
| email | varchar(255) | YES | | The email address receiving the OTP. |
| code | varchar(6) | YES | | The 6-digit verification code. |
| purpose | varchar(30) | YES | | The purpose ('registration' or 'password_reset'). |
| expires_at | timestamptz | YES | | The expiration date and time. |
| used | boolean | YES | | Flag indicating if code was used. |
| created_at | timestamptz | YES | | The date and time code was created. |

Table 5: Semesters
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the semester record. |
| academic_year | varchar(20) | YES | | The academic school year. |
| semester | varchar(20) | YES | | The semester term name. |
| label | varchar(100) | YES | | The display label of the semester. |
| starting_cash_on_hand | decimal(12,2) | YES | | The opening cashbox balance. |
| is_active | boolean | YES | | Flag indicating the active semester. |
| created_at | timestamptz | YES | | The date and time created. |

Table 6: Semester_Signatories
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the signatory record. |
| academic_year | varchar(20) | YES | | The academic school year. |
| semester | varchar(20) | YES | | The semester term name. |
| role_key | varchar(50) | YES | | The role identifier of the signatory. |
| name | varchar(150) | YES | | The full name of the signatory. |
| position_title | varchar(150) | YES | | The official institutional title. |
| category | varchar(20) | YES | | The signatory tier ('OFFICER', 'ADVISER', 'ADMIN'). |
| sort_order | int | YES | | The display order on reports. |
| is_active | boolean | YES | | Flag indicating if signatory is active. |
| created_at | timestamptz | YES | | The date and time created. |
| updated_at | timestamptz | YES | | The date and time last updated. |

Table 7: Categories
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the category record. |
| name | varchar(100) | YES | | The name of the category. |
| type | varchar(10) | YES | | The category type ('INFLOW' or 'OUTFLOW'). |
| description | text | NO | | The description of the category. |
| created_at | timestamptz | YES | | The date and time created. |

Table 8: Transactions
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the transaction record. |
| semester_id | uuid | YES | FK | The semester ID referencing Semesters. |
| title | varchar(255) | YES | | The title of the transaction. |
| description | text | NO | | The description of the transaction. |
| amount | decimal(12,2) | YES | | The monetary amount in pesos. |
| type | varchar(10) | YES | | The transaction type ('INFLOW' or 'OUTFLOW'). |
| payment_method | varchar(20) | YES | | The payment method ('CASH'). |
| category_id | uuid | NO | FK | The category ID referencing Categories. |
| logged_by | uuid | NO | FK | The user ID who encoded the entry. |
| transaction_date | date | YES | | The date of the transaction. |
| status | varchar(20) | YES | | The audit status ('PENDING', 'VERIFIED', 'REVISION_REQUIRED'). |
| audited_by | uuid | NO | FK | The auditor ID who verified the entry. |
| audited_at | timestamptz | NO | | The date and time audited. |
| is_reimbursement | boolean | YES | | Flag indicating advance reimbursement. |
| payer_name | varchar(150) | NO | | The name of the payer. |
| claimant_name | varchar(150) | NO | | The name of the reimbursement claimant. |
| notes | text | NO | | Additional transaction notes. |
| created_at | timestamptz | YES | | The date and time created. |
| updated_at | timestamptz | YES | | The date and time last updated. |

Table 9: Transaction_Receipts
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the receipt record. |
| transaction_id | uuid | YES | FK | The transaction ID referencing Transactions. |
| public_url | text | YES | | The public image URL of the receipt. |
| file_path | text | NO | | The file path in cloud storage. |
| file_name | varchar(255) | NO | | The original file name. |
| file_size | int | NO | | The file size in bytes. |
| mime_type | varchar(50) | NO | | The MIME type of the file. |
| sort_order | int | YES | | The display sequence number. |
| created_at | timestamptz | YES | | The date and time uploaded. |

Table 10: Transaction_Comments
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the comment record. |
| transaction_id | uuid | YES | FK | The transaction ID referencing Transactions. |
| author_id | uuid | NO | FK | The user ID of the comment author. |
| comment_text | text | YES | | The text content of the audit remark. |
| created_at | timestamptz | YES | | The date and time commented. |
| updated_at | timestamptz | YES | | The date and time last updated. |

Table 11: Advances_Payable
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the advance claim. |
| semester_id | uuid | YES | FK | The semester ID referencing Semesters. |
| claimant_name | varchar(150) | YES | | The name of the advance claimant. |
| claimant_contact | varchar(50) | NO | | The contact details of the claimant. |
| title | varchar(255) | YES | | The title of the advance claim. |
| category_id | uuid | NO | FK | The category ID referencing Categories. |
| event_name | varchar(150) | NO | | The name of the associated event. |
| total_amount | decimal(12,2) | YES | | The total advanced amount in pesos. |
| amount_reimbursed | decimal(12,2) | YES | | The total reimbursed amount. |
| status | varchar(25) | YES | | The settlement status ('UNPAID', 'PARTIALLY_REIMBURSED', 'SETTLED', 'CANCELLED'). |
| advance_date | date | YES | | The date of the advance. |
| notes | text | NO | | Additional notes for the claim. |
| created_by | uuid | NO | FK | The user ID who filed the claim. |
| created_at | timestamptz | YES | | The date and time created. |
| updated_at | timestamptz | YES | | The date and time last updated. |

Table 12: Advance_Disbursements
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the disbursement record. |
| advance_id | uuid | YES | FK | The advance ID referencing Advances_Payable. |
| transaction_id | uuid | NO | FK | The transaction ID referencing Transactions. |
| amount | decimal(12,2) | YES | | The disbursement amount in pesos. |
| payment_method | varchar(20) | YES | | The payment method ('CASH'). |
| disbursement_date | timestamptz | YES | | The date and time disbursed. |
| disbursed_by | uuid | NO | FK | The user ID who released the cash. |
| notes | text | NO | | Additional disbursement notes. |
| created_at | timestamptz | YES | | The date and time created. |

Table 13: Advance_Receipts
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the receipt record. |
| advance_id | uuid | YES | FK | The advance ID referencing Advances_Payable. |
| public_url | text | YES | | The public image URL of the receipt. |
| sort_order | int | YES | | The display sequence number. |
| created_at | timestamptz | YES | | The date and time uploaded. |

Table 14: Debts_Receivables
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the receivable record. |
| semester_id | uuid | YES | FK | The semester ID referencing Semesters. |
| debtor_name | varchar(150) | YES | | The full name of the debtor. |
| debtor_contact | varchar(50) | NO | | The contact details of the debtor. |
| title | varchar(255) | YES | | The description of items ordered. |
| total_amount | decimal(12,2) | YES | | The total debt amount in pesos. |
| amount_paid | decimal(12,2) | YES | | The total amount paid to date. |
| status | varchar(20) | YES | | The settlement status ('UNPAID', 'PARTIALLY_PAID', 'SETTLED', 'CANCELLED'). |
| due_date | date | NO | | The due date for payment. |
| notes | text | NO | | Additional receivable notes. |
| created_by | uuid | NO | FK | The user ID who logged the order. |
| created_at | timestamptz | YES | | The date and time created. |
| updated_at | timestamptz | YES | | The date and time last updated. |

Table 15: Debt_Payments
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the payment record. |
| debt_id | uuid | YES | FK | The debt ID referencing Debts_Receivables. |
| transaction_id | uuid | NO | FK | The transaction ID referencing Transactions. |
| amount | decimal(12,2) | YES | | The payment amount in pesos. |
| payment_method | varchar(20) | YES | | The payment method ('CASH'). |
| payment_date | timestamptz | YES | | The date and time paid. |
| received_by | uuid | NO | FK | The user ID who received the cash. |
| notes | text | NO | | Additional payment notes. |
| created_at | timestamptz | YES | | The date and time created. |

Table 16: Denominations
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the denomination. |
| code | varchar(30) | YES | UK | The unique denomination code. |
| label | varchar(50) | YES | | The display label of the currency. |
| currency_type | varchar(10) | YES | | The currency type ('BILL' or 'COIN'). |
| face_value | decimal(12,2) | YES | | The face value in pesos. |
| display_order | int | YES | | The display order on keypad. |
| is_active | boolean | YES | | Flag indicating if actively counted. |
| created_at | timestamptz | YES | | The date and time created. |

Table 17: Cash_Reconciliations
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the reconciliation session. |
| semester_id | uuid | YES | FK | The semester ID referencing Semesters. |
| reconciliation_date | timestamptz | YES | | The date and time of reconciliation. |
| counted_by | uuid | NO | FK | The user ID who counted cash. |
| verified_by | uuid | NO | FK | The user ID who verified count. |
| physical_total | decimal(12,2) | YES | | The total physical cash counted. |
| ledger_cash_balance | decimal(12,2) | YES | | The theoretical ledger balance. |
| variance_amount | decimal(12,2) | YES | | The variance difference amount. |
| variance_status | varchar(20) | YES | | The status ('BALANCED', 'SHORTAGE', 'OVERAGE'). |
| notes | text | NO | | General reconciliation remarks. |
| adviser_approval_notes | text | NO | | Adviser shortage justification notes. |
| status | varchar(20) | YES | | The session status ('DRAFT', 'SUBMITTED', 'VERIFIED'). |
| created_at | timestamptz | YES | | The date and time created. |

Table 18: Cash_Reconciliation_Items
| Field | Type/Length | Required | Key | Domain |
| :--- | :--- | :--- | :--- | :--- |
| id | uuid | YES | PK | The unique ID of the item count. |
| reconciliation_id | uuid | YES | FK | The session ID referencing Cash_Reconciliations. |
| denomination_id | uuid | YES | FK | The denomination ID referencing Denominations. |
| quantity | int | YES | | The piece-count quantity. |
| subtotal | decimal(12,2) | YES | | The calculated currency subtotal. |
| created_at | timestamptz | YES | | The date and time recorded. |
