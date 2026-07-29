import { type LeadRow, formatTimestamp, humanize } from "@/lib/crm/leads";
import { PIPELINE_STATUSES, type PipelineStatus } from "@/lib/crm/pipeline";

export interface AnnotatedLead {
  lead: LeadRow;
  status: PipelineStatus;
  source: "online" | "local" | "default";
  dateKey: string;
}

export interface ReportSummaryMetrics {
  reportTitle: string;
  dateRangeLabel: string;
  generatedAt: string;
  totalLeads: number;
  websiteLeadsCount: number;
  websiteLeadsPct: number;
  clientFormLeadsCount: number;
  clientFormLeadsPct: number;
  untouchedCount: number;
  untouchedPct: number;
  touchedCount: number;
  touchedPct: number;
  convertedCount: number;
  conversionRatePct: number;
  statusCounts: Record<PipelineStatus, number>;
  statusPcts: Record<PipelineStatus, number>;
  untouchedLeads: AnnotatedLead[];
  allLeads: AnnotatedLead[];
}

/**
 * Calculate comprehensive summary metrics, untouched leads, and counts for a set of annotated leads.
 */
export function calculateReportMetrics(
  leads: AnnotatedLead[],
  dateRangeLabel: string,
  reportTitle = "Sales Pipeline & Lead Performance Report"
): ReportSummaryMetrics {
  const totalLeads = leads.length;

  let websiteLeadsCount = 0;
  let clientFormLeadsCount = 0;

  const statusCounts: Record<PipelineStatus, number> = {
    new: 0,
    pending: 0,
    follow_up: 0,
    trial_requested: 0,
    hot_prospect: 0,
    future_prospect: 0,
    converted: 0,
    sale_rejected: 0,
  };

  const untouchedLeads: AnnotatedLead[] = [];

  for (const item of leads) {
    const src = item.lead.leadSource || "website";
    if (src === "client_form") {
      clientFormLeadsCount++;
    } else {
      websiteLeadsCount++;
    }

    if (item.status in statusCounts) {
      statusCounts[item.status]++;
    }

    // A lead is "untouched" if its status is still 'new' (no telecaller update)
    if (item.status === "new") {
      untouchedLeads.push(item);
    }
  }

  const websiteLeadsPct = totalLeads > 0 ? (websiteLeadsCount / totalLeads) * 100 : 0;
  const clientFormLeadsPct = totalLeads > 0 ? (clientFormLeadsCount / totalLeads) * 100 : 0;

  const untouchedCount = untouchedLeads.length;
  const untouchedPct = totalLeads > 0 ? (untouchedCount / totalLeads) * 100 : 0;
  const touchedCount = totalLeads - untouchedCount;
  const touchedPct = totalLeads > 0 ? (touchedCount / totalLeads) * 100 : 0;

  const convertedCount = statusCounts.converted || 0;
  const conversionRatePct = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

  const statusPcts: Record<PipelineStatus, number> = {
    new: 0,
    pending: 0,
    follow_up: 0,
    trial_requested: 0,
    hot_prospect: 0,
    future_prospect: 0,
    converted: 0,
    sale_rejected: 0,
  };

  for (const s of PIPELINE_STATUSES) {
    statusPcts[s.value] = totalLeads > 0 ? (statusCounts[s.value] / totalLeads) * 100 : 0;
  }

  return {
    reportTitle,
    dateRangeLabel,
    generatedAt: new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    totalLeads,
    websiteLeadsCount,
    websiteLeadsPct: Math.round(websiteLeadsPct * 10) / 10,
    clientFormLeadsCount,
    clientFormLeadsPct: Math.round(clientFormLeadsPct * 10) / 10,
    untouchedCount,
    untouchedPct: Math.round(untouchedPct * 10) / 10,
    touchedCount,
    touchedPct: Math.round(touchedPct * 10) / 10,
    convertedCount,
    conversionRatePct: Math.round(conversionRatePct * 10) / 10,
    statusCounts,
    statusPcts,
    untouchedLeads,
    allLeads: leads,
  };
}

/**
 * Generate a complete visual HTML report designed for print/PDF download.
 * Features Bhookr brand colors (#E31E24), logo, Power BI style KPI cards,
 * SVG Donut Chart, Status Progress Bars, Untouched Alert Section, and Data Table.
 */
export function generateReportHtml(metrics: ReportSummaryMetrics, staffRole = "Admin"): string {
  const {
    reportTitle,
    dateRangeLabel,
    generatedAt,
    totalLeads,
    websiteLeadsCount,
    websiteLeadsPct,
    clientFormLeadsCount,
    clientFormLeadsPct,
    untouchedCount,
    untouchedPct,
    touchedCount,
    touchedPct,
    convertedCount,
    conversionRatePct,
    statusCounts,
    untouchedLeads,
    allLeads,
  } = metrics;

  // Donut chart stroke math (Circumference = 2 * PI * R, R=40 -> ~251.3)
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const webStroke = (websiteLeadsPct / 100) * circumference;
  const formStroke = (clientFormLeadsPct / 100) * circumference;

  const statusList = [
    { key: "pending", label: "Pending", count: statusCounts.pending, color: "#f59e0b", bg: "#fef3c7" },
    { key: "follow_up", label: "Follow-up", count: statusCounts.follow_up, color: "#4f46e5", bg: "#e0e7ff" },
    { key: "trial_requested", label: "Trial Requested", count: statusCounts.trial_requested, color: "#9333ea", bg: "#f3e8ff" },
    { key: "hot_prospect", label: "Hot Prospect", count: statusCounts.hot_prospect, color: "#ea580c", bg: "#ffedd5" },
    { key: "future_prospect", label: "Future Prospect", count: statusCounts.future_prospect, color: "#0d9488", bg: "#ccfbf1" },
    { key: "converted", label: "Converted", count: statusCounts.converted, color: "#16a34a", bg: "#dcfce7" },
    { key: "sale_rejected", label: "Rejected", count: statusCounts.sale_rejected, color: "#dc2626", bg: "#fee2e2" },
    { key: "new", label: "Untouched (New)", count: statusCounts.new, color: "#0284c7", bg: "#e0f2fe" },
  ];

  const statusProgressBarsHtml = statusList
    .map((s) => {
      const pct = totalLeads > 0 ? Math.round((s.count / totalLeads) * 100) : 0;
      return `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; color: #374151; margin-bottom: 4px;">
          <span>${s.label}</span>
          <span>${s.count} leads (${pct}%)</span>
        </div>
        <div style="height: 10px; width: 100%; background-color: #f3f4f6; border-radius: 9999px; overflow: hidden;">
          <div style="height: 100%; width: ${pct}%; background-color: ${s.color}; border-radius: 9999px; transition: width 0.3s;"></div>
        </div>
      </div>
    `;
    })
    .join("");

  const untouchedRowsHtml = untouchedLeads
    .map(
      (item, idx) => `
    <tr>
      <td style="font-weight: 700; color: #dc2626;">${idx + 1}</td>
      <td><strong>${item.lead.name || "—"}</strong></td>
      <td>${item.lead.email || "—"}</td>
      <td>${item.lead.phoneNumber || "—"}</td>
      <td>
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: ${
          item.lead.leadSource === "client_form" ? "#f3e8ff" : "#e0f2fe"
        }; color: ${item.lead.leadSource === "client_form" ? "#7e22ce" : "#0369a1"};">
          ${item.lead.leadSource === "client_form" ? "📑 Client Form" : "🌐 Website Lead"}
        </span>
      </td>
      <td>${formatTimestamp(item.lead.timestamp)}</td>
      <td><span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; background-color: #fee2e2; color: #b91c1c;">UNTOUCHED</span></td>
    </tr>
  `
    )
    .join("");

  const allRowsHtml = allLeads
    .map((item, idx) => {
      const isUntouched = item.status === "new";
      return `
    <tr style="${isUntouched ? "background-color: #fff1f2;" : ""}">
      <td>${idx + 1}</td>
      <td><strong>${item.lead.name || "—"}</strong></td>
      <td>${item.lead.email || "—"}</td>
      <td>${item.lead.phoneNumber || "—"}</td>
      <td>
        <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; background-color: ${
          item.lead.leadSource === "client_form" ? "#f3e8ff" : "#f1f5f9"
        }; color: ${item.lead.leadSource === "client_form" ? "#6b21a8" : "#475569"};">
          ${item.lead.leadSource === "client_form" ? "📑 Client Form" : "🌐 Website"}
        </span>
      </td>
      <td>${humanize(item.lead.subscriptionType) || "—"}${item.lead.plan ? ` (${item.lead.plan})` : ""}</td>
      <td>${formatTimestamp(item.lead.timestamp)}</td>
      <td>
        <span class="status-badge status-${item.status}">
          ${item.status.replace("_", " ").toUpperCase()}
        </span>
      </td>
    </tr>
  `;
    })
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BHOOKR - ${reportTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background-color: #ffffff;
      margin: 0;
      padding: 30px;
      font-size: 12px;
      line-height: 1.5;
    }

    .no-print-bar {
      background-color: #1e293b;
      color: #ffffff;
      padding: 12px 20px;
      margin: -30px -30px 25px -30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .btn-print {
      background-color: #E31E24;
      color: white;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }

    .btn-print:hover {
      background-color: #c8161b;
    }

    /* Header & Branding */
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #E31E24;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .brand-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }

    .brand-fallback {
      background-color: #E31E24;
      color: white;
      font-weight: 900;
      font-size: 20px;
      padding: 6px 14px;
      border-radius: 8px;
      letter-spacing: -0.5px;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.5px;
      margin: 0;
      line-height: 1.1;
    }

    .brand-subtitle {
      font-size: 12px;
      color: #6b7280;
      font-weight: 600;
      margin-top: 3px;
    }

    .meta-card {
      text-align: right;
      font-size: 11px;
      color: #4b5563;
      background: #f8fafc;
      padding: 10px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }

    .meta-card strong {
      color: #0f172a;
    }

    .section-heading {
      font-size: 14px;
      font-weight: 800;
      color: #111827;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 24px;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-heading::before {
      content: "";
      display: inline-block;
      width: 4px;
      height: 14px;
      background-color: #E31E24;
      border-radius: 2px;
    }

    /* Power BI Style KPI Cards Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      position: relative;
      overflow: hidden;
    }

    .kpi-card::top {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
    }

    .kpi-red { border-top: 4px solid #E31E24; }
    .kpi-amber { border-top: 4px solid #f59e0b; background-color: #fffbeb; }
    .kpi-green { border-top: 4px solid #16a34a; }
    .kpi-blue { border-top: 4px solid #2563eb; }

    .kpi-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      margin-bottom: 6px;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 800;
      color: #111827;
      line-height: 1;
    }

    .kpi-sub {
      font-size: 11px;
      font-weight: 600;
      color: #4b5563;
      margin-top: 6px;
    }

    /* Diagrams Split Section */
    .diagrams-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 18px;
      margin-bottom: 24px;
    }

    .diagram-box {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .diagram-title {
      font-size: 12px;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f3f4f6;
      padding-bottom: 8px;
    }

    /* Donut Chart Styling */
    .donut-wrapper {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 16px;
      padding: 10px 0;
    }

    .donut-legend {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 600;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    /* Alert Banner for Untouched Leads */
    .alert-banner {
      background-color: #fef2f2;
      border: 1.5px solid #fca5a5;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }

    .alert-icon {
      font-size: 20px;
      line-height: 1;
    }

    .alert-content h4 {
      margin: 0 0 4px 0;
      color: #991b1b;
      font-size: 13px;
      font-weight: 800;
    }

    .alert-content p {
      margin: 0;
      color: #7f1d1d;
      font-size: 11px;
    }

    /* Data Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 11px;
    }

    th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e2e8f0;
      padding: 10px 10px;
      text-align: left;
    }

    td {
      padding: 9px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: middle;
    }

    tr:nth-child(even) td {
      background-color: #f8fafc/50;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .status-new { background-color: #e0f2fe; color: #0369a1; }
    .status-pending { background-color: #fef3c7; color: #b45309; }
    .status-follow_up { background-color: #e0e7ff; color: #3730a3; }
    .status-trial_requested { background-color: #f3e8ff; color: #6b21a8; }
    .status-hot_prospect { background-color: #ffedd5; color: #c2410c; }
    .status-future_prospect { background-color: #ccfbf1; color: #0f766e; }
    .status-converted { background-color: #dcfce7; color: #15803d; }
    .status-sale_rejected { background-color: #fee2e2; color: #b91c1c; }

    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #9ca3af;
    }

    @media print {
      body {
        padding: 0;
        margin: 15px;
        background: #ffffff;
      }
      .no-print-bar {
        display: none !important;
      }
      .kpi-card, .diagram-box, .alert-banner {
        box-shadow: none;
        break-inside: avoid;
      }
      table {
        page-break-inside: auto;
      }
      tr {
        page-break-inside: avoid;
      }
      thead {
        display: table-header-group;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div>
      <span style="font-weight: 700; color: #f8fafc;">📄 Download / Save PDF Report</span>
      <span style="font-size: 11px; opacity: 0.8; margin-left: 10px;">Click 'Save as PDF' in the destination menu when printing</span>
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <!-- Header Banner -->
  <div class="header-container">
    <div class="brand-group">
      <img src="/headerlogo.png" alt="BHOOKR" class="brand-logo" onerror="this.style.display='none'; document.getElementById('brand-fb').style.display='inline-block';" />
      <div id="brand-fb" class="brand-fallback" style="display:none;">BHOOKR</div>
      <div>
        <h1 class="brand-title">BHOOKR <span style="color:#E31E24;">CRM</span></h1>
        <div class="brand-subtitle">Sales & Telecaller Lead Intelligence Report</div>
      </div>
    </div>
    <div class="meta-card">
      <div><strong>Report Scope:</strong> ${dateRangeLabel}</div>
      <div><strong>Generated:</strong> ${generatedAt}</div>
      <div><strong>Role:</strong> ${staffRole}</div>
    </div>
  </div>

  <!-- Power BI Style KPI Grid -->
  <div class="kpi-grid">
    <div class="kpi-card kpi-red">
      <div class="kpi-title">Total Captured Leads</div>
      <div class="kpi-value">${totalLeads}</div>
      <div class="kpi-sub">${websiteLeadsCount} Website · ${clientFormLeadsCount} Form</div>
    </div>

    <div class="kpi-card ${untouchedCount > 0 ? "kpi-amber" : "kpi-green"}">
      <div class="kpi-title">Untouched Leads</div>
      <div class="kpi-value" style="color: ${untouchedCount > 0 ? "#b45309" : "#16a34a"};">${untouchedCount}</div>
      <div class="kpi-sub">${untouchedPct}% of total leads need call</div>
    </div>

    <div class="kpi-card kpi-green">
      <div class="kpi-title">Converted Deals</div>
      <div class="kpi-value" style="color: #16a34a;">${convertedCount}</div>
      <div class="kpi-sub">${conversionRatePct}% conversion rate</div>
    </div>

    <div class="kpi-card kpi-blue">
      <div class="kpi-title">Telecaller Action Rate</div>
      <div class="kpi-value" style="color: #2563eb;">${touchedPct}%</div>
      <div class="kpi-sub">${touchedCount} leads touched & updated</div>
    </div>
  </div>

  <!-- Diagrams Section -->
  <div class="diagrams-grid">
    <!-- Lead Source Donut Diagram -->
    <div class="diagram-box">
      <div class="diagram-title">
        <span>🌐 Lead Source Distribution</span>
        <span style="font-size: 10px; font-weight: 500; color: #6b7280;">Power BI Chart</span>
      </div>
      <div class="donut-wrapper">
        <svg width="120" height="120" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#e2e8f0" stroke-width="14" />
          <!-- Website Leads Stroke (Blue) -->
          <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#2563eb" stroke-width="14"
                  stroke-dasharray="${webStroke} ${circumference}" stroke-dashoffset="0"
                  transform="rotate(-90 50 50)" />
          <!-- Client Form Stroke (Purple) -->
          <circle cx="50" cy="50" r="${radius}" fill="transparent" stroke="#9333ea" stroke-width="14"
                  stroke-dasharray="${formStroke} ${circumference}" stroke-dashoffset="-${webStroke}"
                  transform="rotate(-90 50 50)" />
          <text x="50%" y="46%" text-anchor="middle" font-size="16" font-weight="800" fill="#111827">${totalLeads}</text>
          <text x="50%" y="62%" text-anchor="middle" font-size="8" font-weight="700" fill="#6b7280">TOTAL LEADS</text>
        </svg>
        <div class="donut-legend">
          <div class="legend-item">
            <div class="legend-dot" style="background-color: #2563eb;"></div>
            <div>
              <div style="color: #111827;">Website Leads</div>
              <div style="color: #6b7280; font-size: 10px;">${websiteLeadsCount} leads (${websiteLeadsPct}%)</div>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background-color: #9333ea;"></div>
            <div>
              <div style="color: #111827;">Client Form Leads</div>
              <div style="color: #6b7280; font-size: 10px;">${clientFormLeadsCount} leads (${clientFormLeadsPct}%)</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Pipeline Funnel Status Progress Bars -->
    <div class="diagram-box">
      <div class="diagram-title">
        <span>📊 Pipeline Status Breakdown</span>
        <span style="font-size: 10px; font-weight: 500; color: #6b7280;">Real-time Pipeline</span>
      </div>
      ${statusProgressBarsHtml}
    </div>
  </div>

  <!-- Untouched Leads Alert Section -->
  ${
    untouchedCount > 0
      ? `
    <div class="alert-banner">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <h4>Untouched Leads Alert (${untouchedCount} Leads)</h4>
        <p>The following ${untouchedCount} lead(s) were captured in this report period but have <strong>NOT been contacted or updated</strong> by any telecaller yet. Please follow up on these leads immediately.</p>
      </div>
    </div>

    <div class="section-heading">Untouched Leads Action List</div>
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 22%;">Name</th>
          <th style="width: 22%;">Email</th>
          <th style="width: 15%;">Phone</th>
          <th style="width: 15%;">Source</th>
          <th style="width: 13%;">Received Time</th>
          <th style="width: 8%;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${untouchedRowsHtml}
      </tbody>
    </table>
    `
      : `
    <div class="alert-banner" style="background-color: #f0fdf4; border-color: #86efac;">
      <div class="alert-icon">✅</div>
      <div class="alert-content">
        <h4 style="color: #166534;">All Leads Touched!</h4>
        <p style="color: #15803d;">Great work! Every lead captured during this report period has been reviewed and updated in the pipeline by your staff.</p>
      </div>
    </div>
    `
  }

  <!-- Complete Leads Table -->
  <div class="section-heading">All Leads Log (${allLeads.length} Total)</div>
  <table>
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 20%;">Name</th>
        <th style="width: 20%;">Email</th>
        <th style="width: 14%;">Phone</th>
        <th style="width: 12%;">Source</th>
        <th style="width: 14%;">Plan Interest</th>
        <th style="width: 10%;">Captured</th>
        <th style="width: 6%;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${allRowsHtml}
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div>BHOOKR CRM System &copy; ${new Date().getFullYear()} — Confidential Internal Report</div>
    <div>Page 1 of 1</div>
  </div>

  <script>
    window.onload = function() {
      // Small timeout to allow images/fonts to render before print dialog
      setTimeout(function() {
        window.print();
      }, 600);
    };
  </script>
</body>
</html>
  `;
}

/**
 * Generate a formatted CSV content string containing summary metrics,
 * untouched leads, and all leads for Excel export.
 */
export function generateReportCsv(metrics: ReportSummaryMetrics): string {
  const lines: string[] = [];

  lines.push(`BHOOKR CRM - SALES & LEAD INTELLIGENCE REPORT`);
  lines.push(`Report Scope,${metrics.dateRangeLabel}`);
  lines.push(`Generated At,${metrics.generatedAt}`);
  lines.push(``);

  lines.push(`1. EXECUTIVE SUMMARY`);
  lines.push(`Metric,Value`);
  lines.push(`Total Leads Captured,${metrics.totalLeads}`);
  lines.push(`Website Leads,${metrics.websiteLeadsCount} (${metrics.websiteLeadsPct}%)`);
  lines.push(`Client Form Leads,${metrics.clientFormLeadsCount} (${metrics.clientFormLeadsPct}%)`);
  lines.push(`Untouched Leads (Not contacted),${metrics.untouchedCount} (${metrics.untouchedPct}%)`);
  lines.push(`Touched & Worked Leads,${metrics.touchedCount} (${metrics.touchedPct}%)`);
  lines.push(`Converted Deals,${metrics.convertedCount} (${metrics.conversionRatePct}%)`);
  lines.push(``);

  lines.push(`2. PIPELINE STATUS BREAKDOWN`);
  lines.push(`Status,Count,Percentage`);
  for (const s of PIPELINE_STATUSES) {
    const c = metrics.statusCounts[s.value] || 0;
    const pct = metrics.statusPcts[s.value] || 0;
    lines.push(`"${s.label}",${c},${pct.toFixed(1)}%`);
  }
  lines.push(``);

  if (metrics.untouchedLeads.length > 0) {
    lines.push(`3. UNTOUCHED LEADS (NEEDS TELECALLER ATTENTION)`);
    lines.push(`No.,Name,Email,Phone,Source,Captured Timestamp`);
    metrics.untouchedLeads.forEach((item, idx) => {
      lines.push(
        `${idx + 1},"${item.lead.name || ""}","${item.lead.email || ""}","${item.lead.phoneNumber || ""}","${
          item.lead.leadSource || "website"
        }","${formatTimestamp(item.lead.timestamp)}"`
      );
    });
    lines.push(``);
  }

  lines.push(`4. ALL LEADS DETAILED DATA`);
  lines.push(`No.,Name,Email,Phone,Source,Plan Interest,Captured Timestamp,Status`);
  metrics.allLeads.forEach((item, idx) => {
    lines.push(
      `${idx + 1},"${item.lead.name || ""}","${item.lead.email || ""}","${item.lead.phoneNumber || ""}","${
        item.lead.leadSource || "website"
      }","${item.lead.subscriptionType || ""}","${formatTimestamp(item.lead.timestamp)}","${item.status}"`
    );
  });

  return lines.join("\n");
}
