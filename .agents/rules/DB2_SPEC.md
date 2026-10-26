# Rule: PDM CCS IT31-DB2 (Database System Management 2) Final Examination Specification

## Context & Authority
This rule governs all database architecture, schema migrations, backend API implementations, data integrity validations, normalization documentation, ERD diagrams, and defense preparation for the **Database System Management 2 (IT31-DB2)** course at Pambayang Dalubhasaan ng Marilao (PDM), College of Computer Studies (CCS).
* **Course**: IT31-DB2 – Database System Management 2
* **Instructor**: Harvey Blue Pardico
* **Approved DBMS Override**: PostgreSQL (via Supabase / Node.js backend) has been officially approved in place of MongoDB. All document-database instructions map directly to PostgreSQL relational tables, constraints, foreign keys, and indexes.

---

## 1. Core Technical Requirements

1. **Approved Problem Domain**:
   - Solves a clear record-management problem: FinLITE serves as the web-based Financial Assistant & Record-Keeping System for the League of Information Technology Enthusiasts (LITE).
2. **Schema & Relationships (Relational / 3NF)**:
   - Must use at least 3 meaningful and related tables (FinLITE maintains 18 normalized tables in PostgreSQL).
   - Reaches Third Normal Form (3NF) with correct functional dependencies, surrogate/primary keys, foreign key constraints, and minimal redundancy.
3. **Backend / API Separation & Operations**:
   - Backend API serves as the controlled intermediary between the web interface and PostgreSQL.
   - Complete CRUD operations (Create, Read, Update, Delete) implemented on main operational records (inflows, disbursements/expenses, cash counts, advances, reimbursements, officer accounts).
   - All operations must affect the live PostgreSQL database directly (no hard-coded, in-memory, or mock temporary data).
4. **Data Integrity, Validation & Security**:
   - Server-side validation on all incoming payload fields (data types, required values, bounds).
   - Duplicate prevention via unique constraints, unique composite indexes, and application-level checks.
   - Comprehensive error handling returning clear, useful error responses without leaking internal stack traces.
   - Strict credential security: Zero database credentials or secrets exposed to the client/browser.
   - Environment variables used for all connection strings and secrets, accompanied by a clean `.env.example`.
5. **Sample Data**:
   - Provide sufficient realistic seed/sample data to demonstrate all table relationships, constraints, foreign keys, queries, and CRUD workflows during live evaluation.

---

## 2. Required Submissions Checklist

Every deliverable below must be ready and verifiable for final submission:
- [ ] **Vercel Frontend URL**: Deployed and fully accessible web application for online instructor testing.
- [ ] **Live Backend/API URL & Endpoint List**: Operational backend endpoint URL with a concise catalogue/documentation of available endpoints and operations.
- [ ] **PostgreSQL Database Evidence**:
  - Full list of table names.
  - Representative records/data rows.
  - Validation rules, check constraints, foreign keys, and indexes.
  - Evidence of working live data state changes upon CRUD actions.
- [ ] **Logical ERD (PDF / Image format)**:
  - Readable entities/tables, attributes, primary/foreign keys.
  - Explicit relationships with verified cardinalities (1:1, 1:N, M:N).
- [ ] **Normalization Documentation (Unnormalized to 3NF)**:
  - Step-by-step transformation: UNF -> 1NF -> 2NF -> 3NF.
  - Relational mapping justification explaining decomposition choices and foreign key linkages.
- [ ] **Clean Source Code Repository / Archive**:
  - Complete codebase including safe `.env.example` (no live keys or secrets).
- [ ] **Live System Demonstration**:
  - Live walkthrough showing DB connection, CRUD execution, validation triggers, relational data handling, and deployed integration.

---

## 3. Evaluation Rubric & Scoring Guide

### Group / Application Grade (35 Points Total)

| Criteria | Pts | Standard / What is Expected | FinLITE Alignment |
| :--- | :---: | :--- | :--- |
| **Database Connection and Security** | 5 | Backend connects reliably to PostgreSQL DBMS in deployed environment. Connection settings use env variables; zero credentials exposed; connection failures handled gracefully. | Supabase PostgreSQL via connection pooling and server-side service keys / RLS; `.env.local` omitted from git; `.env.example` provided. |
| **Database Design and Normalization** | 5 | Logical design reaches 3NF with correct dependencies and minimal redundancy. Schema decomposition decisions are clearly justified. | 18 tables strictly normalized to 3NF; separation of transactional headers, line items, denominations, and audit logs. |
| **ERD Accuracy and Completeness** | 6 | ERD is readable, complete, and exactly matches the implemented PostgreSQL schema (entities, key attributes, PK/FK identifiers, correct cardinalities). | High-res ERD diagram and Mermaid specs aligned with Supabase migrations. |
| **Backend CRUD and Data Operations** | 6 | Create, read, update, delete operations work reliably through API and persist in PostgreSQL. Related records and multi-table queries operate correctly. | Server actions / API routes handling transactions, cash reconciliation, categories, and approvals with real-time DB persistence. |
| **Data Integrity Validation & Error Handling** | 4 | Server-side validation, proper PostgreSQL data types (UUID, numeric, timestamptz), required fields, duplicate controls/indexes, and clear error responses. | Zod / server-side validation schemas, check constraints (non-negative amounts), unique indexes, standard error toast responses. |
| **Deployment Integration** | 5 | Vercel frontend and live backend/DB work seamlessly together. Submitted URLs are publicly accessible and reliably perform operations. | Production deployment on Vercel connected to hosted Supabase PostgreSQL instance. |
| **Group Presentation & Demonstration** | 4 | Group delivers an organized presentation clearly showcasing connection, CRUD, validation, relationships, and end-to-end workflow. | Structured demo script and assigned speaking parts for all group members. |

### Individual Presentation Grade (15 Points Total)

| Criteria | Pts | Guide |
| :--- | :---: | :--- |
| **Participation and Role** | 5 | Actively presents and handles an assigned portion of the application and database explanation. |
| **Clarity and Organization** | 4 | Explains ideas in a clear, logical, and structured manner. |
| **Knowledge of the Application** | 3 | Demonstrates deep understanding of database schema, SQL queries, and features presented. |
| **Communication and Confidence** | 3 | Communicates clearly, professionally, and confidently during instructor Q&A. |

**Total Laboratory Score**: **50 Points** (Group: 35 pts + Individual: 15 pts).
