# LITE Club Adviser Assessment Snapshot: Ms. Krizia Mae Genovia
**Academic Course & Project:** ITE-SAD (Systems Analysis and Design) | BSIT-31A  
**Target Organization:** League of Information Technology Enthusiasts (LITE)  
**Host Institution:** Pambayang Dalubhasaan ng Marilao (PDM) – College of Computer Studies (CCS)  
**Respondent:** Ms. Krizia Mae Genovia (Designated Faculty Club Adviser)  
**Response Timestamp:** September 17, 2026 at 18:12:38  
**Contact / Verified Account:** `kriziamaegenovia@gmail.com`  

---

## 1. RAW QUESTIONNAIRE RESPONSES

### SECTION 1: Personal Advances ("Abono") & Reimbursement Governance
1. **How often do you or student officers personally advance personal money ("abono") to fund urgent club expenses?**  
   * **Answer:** `Occasionally (only during big events like Club Week or Seminars)`

2. **When personal money is advanced for club activities, what is the ideal turnaround time for receiving a full cash reimbursement?**  
   * **Answer:** `Within 3 to 7 days`

3. **What is the most frustrating part of advancing personal funds?**  
   * **Answer:**  
     * `Misplaced, crumpled, or faded paper receipts`  
     * `Forgetting small out-of-pocket items (e.g., tricycle fares, emergency tape, rush prints)`  
     * `Lack of a clear, transparent list showing who is currently owed what`

4. **For small expenses where official commercial receipts are impossible to obtain, what proof is acceptable for reimbursement?**  
   * **Answer:** `A signed handwritten petty cash acknowledgment slip (amount, date, route/purpose)`

5. **Is there a maximum time limit (grace period) for submitting receipts or petty cash slips for reimbursement?**  
   * **Answer:** `Within 7 days after the activity`

6. **What is the spending limit where an officer or adviser MUST have formal prior written/chat approval before making an out-of-pocket purchase?**  
   * **Answer:** `Any expense above ₱1,000`

7. **If an approved reimbursement claim is larger than the liquid cash currently inside the cashbox, how should FinLITE handle it?**  
   * **Answer:** `Allow partial payout (pay ₱1,200 now, track the remaining ₱1,800 as pending until more dues are collected)`

---

### SECTION 2: Physical Cashbox Custody & Event Logistics
8. **Where should the physical small metal cashbox be stored when not in active use?**  
   * **Answer:** `PD'S room` *(Program Director's Room / Dr. Jovylyn Ortiz-Cesar's Office)*

9. **During weekend events or off-campus supply runs when the faculty room is closed, how should cash be handled?**  
   * **Answer:** `Cashbox stays in school; off-campus purchases must be funded via personal "abono" and reimbursed on Monday`

10. **What is the rule for Year-Level Representatives and Sub-Committees turning over collected cash to the Treasurer?**  
    * **Answer:** `Allowed to hold collections for up to 24–48 hours before turning over to the cashbox`

11. **Are Year-Level Representatives or Sub-Committee heads allowed to spend unremitted collections directly for emergency booth supplies?**  
    * **Answer:** `YES, provided they immediately submit an official receipt or slip for the deducted amount`

---

### SECTION 3: Digital Payments (GCash) & Fee Handling
12. **How are digital collections currently managed?**  
    * **Answer:** `Personal GCash of the Treasurer or on-duty officer`

13. **When GCash funds are cashed out, how should third-party withdrawal fees (₱15–₱20) be recorded?**  
    * **Answer:** `Recorded as an official club operating expense line item ("Bank / Cash-Out Fee")`

14. **Since cash-out outlets only dispense paper bills, how should leftover odd balances in GCash be treated?**  
    * **Answer:** `Transferred/settled via digital balance transfer to the Treasurer's personal account`

---

### SECTION 4: Merchandise, Dues, and Discrepancy Policies
15. **What is the official policy on deferred payments ("utang" or down payments) for merchandise?**  
    * **Answer:** `Strictly 100% upfront payment required before ordering or claiming`

16. **Have uncollected student balances or unpaid merchandise orders caused deficits or delayed final reports in past years?**  
    * **Answer:** `Yes, it has been a recurring headache to track and collect`

17. **If the physical cash count in the cashbox is LOWER than the computed ledger balance during audit, what is the governing rule?**  
    * **Answer:** `All spending and activities must freeze until the discrepancy is traced and resolved`

18. **If the physical cash count in the cashbox is HIGHER than the computed ledger balance, how should this be recorded?**  
    * **Answer:** `Retained in the cashbox as an unrecorded emergency petty cash buffer`

---

### SECTION 5: Approval Governance, Revisions & Annual Turnover
19. **For high-level system approvals, what is the approval requirement?**  
    * **Answer:** `BOTH Club Advisers must jointly approve (Dual Sign-Off)`

20. **If the BSIT Program Director or CCS Dean returns a printed liquidation report for revision, how should FinLITE handle corrections?**  
    * **Answer:** `Unlock the existing report so officers can fix the specific line item and re-export immediately`

21. **At the end of the academic year, if the organization has legitimate unpaid reimbursement claims, what is the turnover policy?**  
    * **Answer:** `The unpaid balance carries over to the next academic year as a certified "Accounts Payable" liability to be paid from next term's dues`

22. **In what format do you prefer the final liquidation report to be reviewed and submitted?**  
    * **Answer:** `Digital draft review first (via FinLITE web preview or DOCX share), followed by physical printing for final wet-ink signatures`

---

### SECTION 6: Adviser Feedback & Priority Feature Request
23. **What is the #1 recurring problem or pet peeve you have experienced regarding LITE financial reports or liquidation?**  
    * **Direct Quote:** `"Late submission of receipts"`

24. **Do you have any specific suggestions or features you would love to see in FinLITE?**  
    * **Direct Quote:** `"The system can identify the name of the person who paid in advance under and who is requesting for reimbursement"`

---

## 2. DERIVED INSTITUTIONAL POLICIES FOR FINLITE SYSTEM ARCHITECTURE

| Architectural Component | Baseline Policy Certified by Ms. Genovia | System Mechanism in FinLITE |
| :--- | :--- | :--- |
| **Cashbox Storage & Security** | Stored inside locked drawer in the **Program Director's (PD's) Room**. Never leaves campus. | System assumes zero off-campus physical cashbox transit; all weekend runs logged as Abono advances. |
| **Abono Spending Limits** | **₱1,000.00** ceiling for unauthorized advances. **7-day** receipt submission cutoff. | Input validation modal warns when expense > ₱1,000 without attached adviser endorsement; flags stale receipts older than 7 days. |
| **Claimant Identification** | Explicit identification of person who advanced funds and claimant requesting payout. | Dedicated `claimant_name` and `reimbursement_recipient` database fields on all Accounts Payable records. |
| **Partial Payout State Machine** | Partial disbursements permitted when liquid cash in box is below claim total. | Status workflow: `[Submitted] -> [Under Review] -> [Partially Reimbursed] -> [Fully Settled]`. |
| **GCash Fee Absorption** | ₱15–₱20 withdrawal fees absorbed as organizational operating expenses. | Explicit `"Bank / Cash-Out Fee"` line item automatically calculated upon GCash withdrawal reconciliation. |
| **Merchandise Release Rule** | Strictly 100% upfront payment (no promissory notes or partial releases). | Merchandise module locks item release until payment status is confirmed `PAID_FULL`. |
| **Cash Variance Protocol** | Discrepancies trigger an immediate spending and activity freeze. Overages retained as cashbox emergency buffer. | Denomination Counter UI triggers visual freeze warning on unexplained variances; allows overage buffer allocation. |
| **Governance Approval Gate** | **Dual Sign-Off (Multisig 2-of-2)** required from both Club Advisers. | High-level operations require digital endorsements from both Ms. Jatulan and Ms. Genovia. |
| **Annual Turnover Liability** | Legitimate unpaid abono carries over to next academic year as Accounts Payable. | Turnover engine carries forward net cash surplus and active Accounts Payable liabilities into next term's opening ledger. |
| **Routing Rejection Recovery** | Unlocks report for immediate in-place correction and 1-click re-export. | Document state switches from `LOCKED_REVIEW` back to `EDITABLE_DRAFT` upon administrative revision request. |
