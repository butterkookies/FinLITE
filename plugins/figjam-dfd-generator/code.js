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
  // 1. CONTEXT DIAGRAM (LEVEL 0) - Placed at x: 0, y: 0
  // ========================================================
  const title1 = figma.createText();
  title1.x = -150;
  title1.y = -220;
  title1.characters = "FINLITE: CONTEXT DIAGRAM (LEVEL 0 DFD)";
  title1.fontSize = 24;
  createdNodes.push(title1);

  // Central Process Bubble
  const sys0 = createNode('ELLIPSE', "0.0\nExisting LITE Manual\nFinancial & Liquidation\nSystem", 0, 0, 240, 240, C_GREEN);

  // External Entities
  const entStudents = createNode('ROUNDED_RECTANGLE', "Students / Club Members", -380, -120, 200, 70, C_DARK);
  const entOfficers = createNode('ROUNDED_RECTANGLE', "LITE Executive Officers\n& Committees", -380, 150, 200, 70, C_DARK);
  const entAdvisers = createNode('ROUNDED_RECTANGLE', "Faculty Club Advisers", 320, -120, 200, 70, C_DARK);
  const entVendors = createNode('ROUNDED_RECTANGLE', "Suppliers & Vendors\n(Commercial & Informal)", 320, 150, 200, 70, C_DARK);
  const entAdmin = createNode('ROUNDED_RECTANGLE', "BSIT Program Director\n& CCS Dean", -30, 360, 220, 70, C_DARK);

  // Context Flows
  connect(entStudents, sys0, "Dues & merch payments");
  connect(sys0, entStudents, "Merch items & paper slips");

  connect(entOfficers, sys0, "Personal abono & receipts");
  connect(sys0, entOfficers, "Delayed reimbursement");

  connect(entAdvisers, sys0, "Advances & chat approvals");
  connect(sys0, entAdvisers, "Liquidated refunds");

  connect(sys0, entVendors, "Cash disbursements");
  connect(entVendors, sys0, "Receipts & fare slips");

  connect(sys0, entAdmin, "Printed liquidation report");
  connect(entAdmin, sys0, "Signed clearance / Rejections");

  // ========================================================
  // 2. DIAGRAM 0 (LEVEL 1 DFD) - Placed at x: 1200, y: 0
  // ========================================================
  const title2 = figma.createText();
  title2.x = 1100;
  title2.y = -220;
  title2.characters = "FINLITE: DIAGRAM 0 (LEVEL 1 DFD EXPLOSION)";
  title2.fontSize = 24;
  createdNodes.push(title2);

  // Entities
  const d0Students = createNode('ROUNDED_RECTANGLE', "Students / Payors", 800, -80, 180, 60, C_DARK);
  const d0Claimants = createNode('ROUNDED_RECTANGLE', "Faculty Advisers\n& Officers", 800, 200, 180, 60, C_DARK);
  const d0Vendors = createNode('ROUNDED_RECTANGLE', "Vendors & Drivers", 1300, 340, 180, 60, C_DARK);
  const d0Admin = createNode('ROUNDED_RECTANGLE', "BSIT Director\n& CCS Dean", 1900, 340, 180, 60, C_DARK);

  // Processes
  const p1 = createNode('ELLIPSE', "1.0\nFee Collection &\nGCash Pooling", 1100, -80, 170, 170, C_TEAL);
  const p2 = createNode('ELLIPSE', "2.0\nPersonal Advance\n(Abono) & Petty Pay", 1100, 150, 170, 170, C_TEAL);
  const p3 = createNode('ELLIPSE', "3.0\nEnd-of-Term Cash\nReconciliation", 1550, -20, 170, 170, C_TEAL);
  const p4 = createNode('ELLIPSE', "4.0\nReport Drafting &\n6-Tier Routing", 1750, 150, 170, 170, C_TEAL);

  // Data Stores
  const dsCashbox = createNode('ROUNDED_RECTANGLE', "D1: Small Metal Cashbox\n(Program Director's Room)", 1400, -160, 220, 60, C_STORE, C_STORE_TXT);
  const dsGcash = createNode('ROUNDED_RECTANGLE', "D2: Personal GCash Accounts\n(Treasurer / On-Duty Officer)", 1100, -230, 220, 60, C_STORE, C_STORE_TXT);
  const dsSlips = createNode('ROUNDED_RECTANGLE', "D3: Loose Paper Slips & Receipts\n(Folders / Envelopes)", 1450, 200, 220, 60, C_STORE, C_STORE_TXT);
  const dsDrafts = createNode('ROUNDED_RECTANGLE', "D4: Manual Excel & Word Drafts\n(Treasurer's Laptop)", 1800, -40, 220, 60, C_STORE, C_STORE_TXT);

  // Diagram 0 Connections
  connect(d0Students, p1, "Cash / GCash fees");
  connect(p1, dsCashbox, "Store physical cash");
  connect(p1, dsGcash, "Hold digital balance");
  connect(dsGcash, p1, "Cash-out (minus fee)");

  connect(d0Claimants, p2, "Advance personal funds");
  connect(p2, d0Vendors, "Disburse payment");
  connect(d0Vendors, p2, "ORs & fare slips");
  connect(p2, dsSlips, "Keep paper slips");
  connect(dsCashbox, p2, "Extract cash refund");
  connect(p2, d0Claimants, "Reimbursement");

  connect(dsCashbox, p3, "Extract bills & coins");
  connect(dsSlips, p3, "Retrieve slips");
  connect(p3, dsDrafts, "Tally math & log shortage");

  connect(dsDrafts, p4, "Compile table figures");
  connect(p4, d0Admin, "Printed bond paper");
  connect(d0Admin, p4, "Rejection loop");
  connect(d0Admin, dsDrafts, "Final clearance");

  // Zoom into view
  figma.viewport.scrollAndZoomIntoView(createdNodes);
  figma.notify("✅ FinLITE Context Diagram & Diagram 0 created successfully!");
  figma.closePlugin();
}

run();
