// FigJam Automated Diagram Generator for FinLITE
// Generates both Context Diagram (Level 0) and Diagram 0 (Level 1) directly on the canvas

async function run() {
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  const createdNodes = [];

  // Helper function to create shaped nodes
  function createNode(type, text, x, y, w, h, bg, fg = { r: 1, g: 1, b: 1 }) {
    const shape = figma.createShapeWithText();
    shape.shapeType = type; // 'ELLIPSE' or 'ROUNDED_RECTANGLE'
    shape.resize(w, h);
    shape.x = x;
    shape.y = y;
    shape.fills = [{ type: 'SOLID', color: bg }];
    shape.text.characters = text;
    shape.text.fills = [{ type: 'SOLID', color: fg }];
    createdNodes.push(shape);
    return shape;
  }

  // Helper function to create connector lines
  function connect(startNode, endNode, label = "") {
    const connector = figma.createConnector();
    connector.connectorStart = { endpointNodeId: startNode.id };
    connector.connectorEnd = { endpointNodeId: endNode.id };
    if (label) {
      connector.text.characters = label;
      connector.text.fills = [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }];
    }
    createdNodes.push(connector);
    return connector;
  }

  // Color Palette
  const C_DARK = { r: 0.12, g: 0.16, b: 0.23 };   // Slate #1E293B (Entities)
  const C_GREEN = { r: 0.02, g: 0.31, b: 0.23 };  // Emerald #064E3B (Processes)
  const C_TEAL = { r: 0.06, g: 0.46, b: 0.43 };   // Teal #0F766E (Sub-processes)
  const C_STORE = { r: 0.99, g: 0.95, b: 0.78 };  // Amber Cream #FEF3C7 (Data Stores)
  const C_STORE_TXT = { r: 0.47, g: 0.21, b: 0.06 };

  // ========================================================
  // 1. CONTEXT DIAGRAM (LEVEL 0) - Timeline Layout (LR Flow)
  // ========================================================
  const title1 = figma.createText();
  title1.x = -200;
  title1.y = -360;
  title1.characters = "FINLITE: CONTEXT DIAGRAM (CHRONOLOGICAL LIFECYCLE)";
  title1.fontSize = 24;
  createdNodes.push(title1);

  // Central Process Bubble (Center)
  const sys0 = createNode('ELLIPSE', "0.0\nExisting LITE Manual\nFinancial Management &\nReporting System", -120, -120, 240, 240, C_GREEN);

  // Phase 1: Inflow Sources (LEFT - Academic Term Inflows)
  const entStudents = createNode('ROUNDED_RECTANGLE', "Students & Event Participants", -660, -180, 250, 70, C_DARK);
  const entSellers = createNode('ROUNDED_RECTANGLE', "Student Sellers & Booth\nConcessionaires", -660, 60, 250, 70, C_DARK);

  // Phase 2: Operations & Reimbursements (CENTER TOP & BOTTOM)
  const entVendors = createNode('ROUNDED_RECTANGLE', "Suppliers & Stores\n(Commercial & Informal)", -125, -280, 250, 70, C_DARK);
  const entOfficers = createNode('ROUNDED_RECTANGLE', "LITE Executive Officers\n& Committees", -300, 240, 240, 70, C_DARK);
  const entAdvisers = createNode('ROUNDED_RECTANGLE', "Faculty Club Advisers", 40, 240, 240, 70, C_DARK);

  // Phase 3: Administrative Clearance (RIGHT - End of Semester)
  const entAdmin = createNode('ROUNDED_RECTANGLE', "BSIT Program Director\n& CCS Dean", 480, -35, 240, 70, C_DARK);

  // --- Phase 1 Inflow Connections (Left to Center) ---
  connect(entStudents, sys0, "Tournament & event registration fees");
  connect(entStudents, sys0, "Merchandise pre-order payments");

  connect(entSellers, sys0, "Booth rental fees ('arkila')");
  connect(entSellers, sys0, "Sales commission remittances");

  // --- Phase 2 Operations Connections (Center / Internal) ---
  connect(sys0, entVendors, "Disbursement cash payment");
  connect(entVendors, sys0, "Commercial sales invoices");
  connect(entVendors, sys0, "Handwritten fare and stall slips");

  connect(entOfficers, sys0, "Abono reimbursement claims");
  connect(entOfficers, sys0, "Official receipts & expense slips");
  connect(sys0, entOfficers, "Cash reimbursement payout");

  connect(entAdvisers, sys0, "Activity spending approvals");
  connect(entAdvisers, sys0, "Personal advance (abono) claims");
  connect(sys0, entAdvisers, "Cash reimbursement payout");
  connect(sys0, entAdvisers, "Draft financial report for review");

  // --- Phase 3 Clearance Connections (Center to Right) ---
  connect(sys0, entAdmin, "Printed multi-page financial report");
  connect(entAdmin, sys0, "Signed financial clearance");
  connect(entAdmin, sys0, "Report revision directive");

  // ========================================================
  // 2. DIAGRAM 0 (LEVEL 1 DFD) - Chronological Lifecycle Flow
  // ========================================================
  const title2 = figma.createText();
  title2.x = 1000;
  title2.y = -360;
  title2.characters = "FINLITE: DIAGRAM 0 (LEVEL 1 DFD - 4-PHASE CHRONOLOGICAL LIFECYCLE)";
  title2.fontSize = 24;
  createdNodes.push(title2);

  // Entities (Balanced with Context Diagram)
  const d0Students = createNode('ROUNDED_RECTANGLE', "Students & Event Participants", 900, -220, 220, 60, C_DARK);
  const d0Sellers = createNode('ROUNDED_RECTANGLE', "Student Sellers & Booth Concessionaires", 900, -110, 220, 60, C_DARK);
  const d0Vendors = createNode('ROUNDED_RECTANGLE', "Suppliers & Stores\n(Commercial & Informal)", 1250, 420, 220, 60, C_DARK);
  const d0Officers = createNode('ROUNDED_RECTANGLE', "LITE Executive Officers & Committees", 900, 110, 220, 60, C_DARK);
  const d0Advisers = createNode('ROUNDED_RECTANGLE', "Faculty Club Advisers", 900, 240, 220, 60, C_DARK);
  const d0Admin = createNode('ROUNDED_RECTANGLE', "BSIT Program Director & CCS Dean", 2350, 360, 220, 60, C_DARK);

  // Processes (4 Sequential Phases)
  const p1 = createNode('ELLIPSE', "1.0\nEvent, Merch &\nBooth Fee Collection", 1250, -180, 180, 180, C_TEAL);
  const p2 = createNode('ELLIPSE', "2.0\nPersonal Advance (Abono)\n& Petty Cash Disbursement", 1250, 140, 180, 180, C_TEAL);
  const p3 = createNode('ELLIPSE', "3.0\nEnd-of-Term Cash Count\n& Variance Reconciliation", 1700, -20, 180, 180, C_TEAL);
  const p4 = createNode('ELLIPSE', "4.0\nManual Financial Report\nDrafting & Routing", 2050, 180, 180, 180, C_TEAL);

  // Data Stores
  const dsCashbox = createNode('ROUNDED_RECTANGLE', "D1: Small Metal Cashbox\n(Program Director's Room)", 1650, -180, 230, 60, C_STORE, C_STORE_TXT);
  const dsGcash = createNode('ROUNDED_RECTANGLE', "D2: Personal GCash Accounts\n(Treasurer / On-Duty Officer)", 1225, -310, 230, 60, C_STORE, C_STORE_TXT);
  const dsSlips = createNode('ROUNDED_RECTANGLE', "D3: Loose Paper Receipts & Slips\n(Envelopes / Folders)", 1650, 260, 230, 60, C_STORE, C_STORE_TXT);
  const dsDrafts = createNode('ROUNDED_RECTANGLE', "D4: Manual Excel & Word Drafts\n(Treasurer's Laptop)", 2025, -20, 230, 60, C_STORE, C_STORE_TXT);

  // Phase 1 Connections (Collections & Inflows)
  connect(d0Students, p1, "Tournament and event registration fees");
  connect(d0Students, p1, "Merchandise pre-order payments");
  connect(d0Sellers, p1, "Booth rental fees ('arkila')");
  connect(d0Sellers, p1, "Sales commission remittances");

  connect(p1, dsCashbox, "Remit collected physical currency");
  connect(p1, dsGcash, "Record digital GCash wallet balance");
  connect(dsGcash, p1, "Liquidated cash remittance");

  // Phase 2 Connections (Abono & Operations)
  connect(d0Officers, p2, "Abono reimbursement claims");
  connect(d0Officers, p2, "Official receipts and expense slips");
  connect(p2, d0Officers, "Cash reimbursement payout");

  connect(d0Advisers, p2, "Activity spending approvals");
  connect(d0Advisers, p2, "Personal advance (abono) claims");
  connect(p2, d0Advisers, "Cash reimbursement payout");

  connect(p2, d0Vendors, "Disbursement cash payment");
  connect(d0Vendors, p2, "Commercial sales invoices");
  connect(d0Vendors, p2, "Handwritten fare and stall slips");

  connect(dsCashbox, p2, "Disburse cash for settlement");
  connect(p2, dsSlips, "Archive physical receipts and slips");

  // Phase 3 Connections (Audit & Reconciliation)
  connect(dsCashbox, p3, "Count physical bills and coins");
  connect(dsSlips, p3, "Retrieve paper receipts and expense slips");
  connect(p3, dsDrafts, "Tally book ledger records");
  connect(p3, dsDrafts, "Record allowable ₱161 shortage");

  // Phase 4 Connections (Financial Report & Clearance)
  connect(dsDrafts, p4, "Compile financial report data");
  connect(p4, d0Advisers, "Draft financial report for review");
  connect(d0Advisers, p4, "Financial report verification");
  connect(p4, d0Admin, "Printed multi-page financial report");
  connect(d0Admin, p4, "Report revision directive");
  connect(d0Admin, dsDrafts, "Signed financial clearance");

  // Zoom into view
  figma.viewport.scrollAndZoomIntoView(createdNodes);
  figma.notify("✅ FinLITE Context Diagram & Diagram 0 created successfully!");
  figma.closePlugin();
}

run();
