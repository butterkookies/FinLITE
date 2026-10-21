# Rule: PDM CCS System Analysis and Design (IT31-SAD) Manuscript Specification

## Context & Authority
This rule governs all academic manuscript writing, section drafts, table formatting, and diagram documentation for the System Analysis and Design course (IT31-SAD) at Pambayang Dalubhasaan ng Marilao (PDM), College of Computer Studies (CCS).
Its structural blueprint, heading hierarchy, and styling conventions are directly derived from the institutional benchmark manuscript (*BICOBS Document.pdf*).

---

## 1. Document Structure & Hierarchy

### 1.1 Preliminaries (Roman Numerals: i – v)
* **Title Page (`i` - implicit/unnumbered on page)**:
  * Title in ALL CAPS, BOLD, centered: `[PROJECT ACRONYM]: [FULL PROJECT TITLE] FOR [BENEFICIARY/ORGANIZATION]`
  * Subtitle text:
    ```text
    A Project
    Presented to the Faculty of the
    College of Computer Studies
    Pambayang Dalubhasaan ng Marilao

    In Partial Fulfillment
    of the Requirements for the
    System Analysis and Design

    by
    [Author 1]
    [Author 2]
    ...

    [MONTH YEAR]
    ```
* **Table of Contents (`ii`)**:
  * Centered header: `TABLE OF CONTENTS`
  * Right-aligned page numbers. Sections: `PRELIMINARIES`, `CHAPTER 1 – INTRODUCTION`, `CHAPTER 2 – TECHNICAL BACKGROUND OF THE STUDY`, `REFERENCES`.
* **List of Tables (`iii`)**:
  * Columns: `Table` | `Title` | `Page`
  * Lists every table from the Data Dictionary.
* **List of Figures (`iv – v`)**:
  * Columns: `Figure` | `Title` | `Page`
  * Sequentially lists all system diagrams (Figures 1–8) and UI screen layouts (Figures 9+).

---

### 1.2 Chapter 1 – Introduction (Arabic Numerals: Pages 1–8)
* **Header**: `1. INTRODUCTION` (TOC lists as `CHAPTER 1 – INTRODUCTION`).
* **Chapter Introductory Preamble**: Concise narrative introducing what Chapter 1 covers.
* **1.1 Project Context**:
  * *Paragraph 1 (Executive Summary / Pitch)*: Proposed system name, type, target beneficiary, replacement of manual paper-based practices, core modules, and business value.
  * *Paragraph 2 (Beneficiary Background)*: Organization name, physical location, establishment history, registered owners/officers/advisers, operating hours, merchandise/services, and target community/clientele.
  * *Paragraphs 3+ (Existing Manual Workflows)*: Step-by-step breakdown of current customer journeys, service flows, payment collection, and manual ledger bookkeeping.
  * *Concluding Paragraphs (Operational Challenges / Problem Statement)*: Detailed enumeration of existing vulnerabilities (slow paper lookups, risk of lost/damaged columnar books, unrecorded rush-hour sales, arithmetic bottlenecks, and lack of central reports).
* **1.2 Objectives of the Study**:
  * `1.2.1 General Objectives`: Single overarching objective statement ("The general objectives of this study is to develop a [system type] for [beneficiary] that will improve current business processes...").
  * `1.2.2 Specific Objectives`: Numbered list (1 to N) of technical targets starting with active verbs:
    1. "To design..."
    2. "To create..."
    3. "To develop..."
    4. "To provide..."
* **1.3 Purpose and Description**:
  * Introductory sentence: *"The [System Name] for [Beneficiary] is beneficial to the following:"*
  * Numbered subsections per beneficiary group:
    * `1.3.1 [Target Entity / Beneficiary]`
    * `1.3.2 [Executive Roles / Owners / Advisers]`
    * `1.3.3 [Operational Staff / Officers / Treasurers]`
    * `1.3.4 [End Users / Customers / Students]`
    * `1.3.5 Proponents` (Hands-on engineering, full-stack development, API and relational database design skills)
    * `1.3.6 Future Proponents` (Academic reference and foundational guide for future researchers)
* **1.4 Scope and Delimitation of the Study**:
  * *Scope*: Comprehensive narrative of functional modules, role-based workflows, authentication security (e.g., bcrypt, OAuth/OTP), and transactional features.
  * *Delimitations*: Explicit boundaries and non-goals to maintain feasibility:
    * Single-tenant vs multi-tenant (exclusively for target client, not multi-tenant SaaS).
    * External API limitations (manual payment reference verification instead of automated gateway webhooks; manual courier/dispatch logistics).
    * Hardware limitations (web-based responsive terminal, browser printing instead of proprietary ESC/POS thermal serial drivers or automated cash drawers).
    * Excluded enterprise modules (e.g., payroll computation, human resources, full corporate double-entry accounting).
    * Report generation boundary (Consolidated Semester Club Week Reporting): Delimited to generating a consolidated whole-semester Club Week financial report (a dedicated configuration isolating all Club Week expenses across the term) alongside the comprehensive semester-end liquidation report, rather than isolated ad-hoc financial reports for every individual Club Week sub-event or booth.
  * *Technology Stack*: Narrative summarizing IDE (VS Code), Backend runtime/framework (Next.js / Node.js), Security/Auth, Frontend, and Database (PostgreSQL on Supabase with ACID transactions, triggers, connection pooling, and referential integrity).

---

### 1.3 Chapter 2 – Technical Background of the Study (Pages 8–54)
* **Header**: `2. TECHNICAL BACKGROUND OF THE STUDY`
* **2.1. Project Analysis**:
  * `2.1.1 Data Flow Diagram`:
    * Mandatory intro definition: *"It shows the flow of the information that will be inputted, the output from the system, and where the data will be stored."*
    * **Figure 1. Context Diagram of Existing System** + descriptive paragraph detailing external entities and manual flows.
    * **Figure 2. Diagram 0 of Existing System** + descriptive paragraph detailing manual sub-processes (1.0, 2.0...) and physical data stores (D1, D2...).
    * **Figure 3. Context Diagram of [Proposed System]** + descriptive paragraph detailing system boundary, external actors, and automated flows.
    * **Figure 4. Diagram 0 of [Proposed System]** + descriptive paragraph detailing automated core processes and database entities as data stores.
    * **Figure 5. Diagram 1 of Process 1 of [Proposed System]** + descriptive paragraph detailing decomposition of Process 1.0 (e.g., authentication & account management).
  * `2.1.2 Use Case Diagram`:
    * **Figure 6. Use Case Diagram of [Proposed System]**
    * Numbered, standardized Use Case Specifications for every use case in the diagram:
      ```markdown
      X. [Use Case Title]
      X.1 Introduction: [Concise purpose and summary]
      X.2 Actor: [User roles involved]
      X.3 Pre-Condition: [Prerequisites required before trigger]
      X.4 Post-Condition: [Final system state upon completion]
      X.5 Basic Flow:
          X.5.1 The user...
          X.5.2 The system...
      X.6 Alternative Flow:
          X.6.1 If [condition], the system [remedy/prompt].
      ```
  * `2.1.3 Activity Diagram`:
    * **Figure 7. Activity Diagram of [Proposed System]** + descriptive narrative detailing concurrent operational domains (swimlanes) and eventual state synchronization.
* **2.2. Project Design**:
  * `2.2.1 Entity Relationship Diagram`:
    * Intro sentence: *"The entity relationship diagram shows the connection of primary keys and foreign keys of tables that are used in the [System Name]."*
    * **Figure 8. Entity Relationship Diagram** (Crow's Foot notation showing tables, attributes, PKs, FKs).
    * Explanatory paragraph describing relational tables, key associations, and referential integrity.
  * `2.2.2 Data Dictionary`:
    * Mandatory intro sentence: *"The data dictionary contains the collection and description of data in the database. It comprises the field name, field type, required, key, and domain"*
    * Separate table for each database entity (`Table X: [TableName]`).
    * Format:
      | Field | Type/Length | Required | Key | Domain |
      | :--- | :--- | :--- | :--- | :--- |
      | `id` | `int(11)` / `uuid` | `YES` | `PK` | The unique identifier of the record. |
    * `Required`: Must strictly be `YES` or `NO`.
    * `Key`: Must strictly be `PK`, `FK`, `UK`, or blank.
    * `Domain`: Concise plain-English explanation of field semantics, constraints, and valid ranges.
* **2.3. Project Structure**:
  * `2.3.1 Screen Layout/UI`:
    * Mandatory intro sentence: *"The project design shows the different forms that can be seen in the graphical user interface (GUI) of the system."*
    * Sequenced UI Figures (Figures 9 to N) covering all screens (Admin, Staff/Treasurer, User/Public).
    * Invariant two-part caption & writeup formula:
      ```markdown
      Figure X. [Screen / Module Title]
      This figure shows the [screen name / interface] of the [system/subsystem], [describing visual layout, cards, tables, search filters, and components]. Also here, the [role] can [describing interactive capabilities, buttons, inputs, form submissions, and exports].
      ```

---

### 1.4 References (Page 55)
* Header: `REFERENCES`
* Numbered IEEE/APA hybrid style citations (`[1]`, `[2]`), referencing local Capstone / SAD manuscripts from College of Computer Studies, Pambayang Dalubhasaan ng Marilao.

---

## 2. Invariant Rules for AI Agent Generation
1. **Never omit institutional framing sentences**: Always include the exact introductory sentences preceding the Data Flow Diagrams, Data Dictionary, and Screen Layout/UI sections.
2. **Standard Caption Positioning**: Figure captions are placed *below* diagrams and UI screenshots; Table captions are placed *above* data dictionary tables.
3. **Use Case Invariant**: All use case specifications must strictly follow the 6-point schema (`Introduction`, `Actor`, `Pre-Condition`, `Post-Condition`, `Basic Flow`, `Alternative Flow`).
4. **UI Description Formula**: Every UI screenshot description must conclude with the functional interactive sentence starting with `"Also here, the [role] can..."`.
5. **Data Dictionary Column Invariant**: Must strictly adhere to the 5 columns: `Field`, `Type/Length`, `Required`, `Key`, and `Domain`.
