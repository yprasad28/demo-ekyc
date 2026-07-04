"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Application {
  id: string;
  customerId: string;
  status: "PENDING" | "IN_PROGRESS" | "UNDER_REVIEW" | "APPROVED" | "REJECTED";
  currentStep: number;
  aadhaarName: string | null;
  aadhaarNumber: string | null;
  aadhaarDob: string | null;
  aadhaarGender: string | null;
  aadhaarAddress: string | null;
  aadhaarPhoto: string | null;
  panNumber: string | null;
  panName: string | null;
  panMatchScore: number | null;
  panStatus: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  customer: { id: string; mobile: string; email: string | null; };
  documents?: { id: string; type: string; fileUrl: string; fileName: string | null; uploadedAt: string; }[];
}

interface Stats {
  total: number; pending: number; inProgress: number;
  underReview: number; approved: number; rejected: number;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Application["status"] }) {
  const config = {
    PENDING:      { color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "schedule", label: "Pending" },
    IN_PROGRESS:  { color: "bg-blue-100 text-blue-700 border-blue-200",    icon: "pending",  label: "In Progress" },
    UNDER_REVIEW: { color: "bg-purple-100 text-purple-700 border-purple-200", icon: "search", label: "Under Review" },
    APPROVED:     { color: "bg-green-100 text-green-700 border-green-200",  icon: "check_circle", label: "Approved" },
    REJECTED:     { color: "bg-red-100 text-red-700 border-red-200",        icon: "cancel",   label: "Rejected" },
  };
  const c = config[status] || config.PENDING;
  return (
    <span className={`status-badge border ${c.color}`}>
      <span className="material-symbols-outlined text-[13px]" style={{fontVariationSettings:"'FILL' 1"}}>{c.icon}</span>
      {c.label}
    </span>
  );
}

// ─── Application Detail Modal ─────────────────────────────────────────────────
function ApplicationModal({
  app, onClose, onApprove, onReject
}: {
  app: Application;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const canAction = app.status === "UNDER_REVIEW" || app.status === "PENDING" || app.status === "IN_PROGRESS";

  const handleApprove = async () => {
    setActionLoading(true);
    await onApprove(app.id);
    setActionLoading(false);
    onClose();
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading(true);
    await onReject(app.id, rejectReason);
    setActionLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-lavender/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            {app.aadhaarPhoto ? (
              <img src={app.aadhaarPhoto} alt="Photo" className="w-10 h-10 rounded-full border-2 border-primary/20" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[20px]">person</span>
              </div>
            )}
            <div>
              <h3 className="font-bold text-on-surface">{app.aadhaarName || "Unknown"}</h3>
              <p className="text-xs text-on-surface-variant">+91 {app.customer.mobile}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={app.status} />
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Aadhaar Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-blue-600 text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>fingerprint</span>
              <h4 className="font-semibold text-sm text-on-surface">Aadhaar Details</h4>
              <span className="ml-auto text-[11px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Verified</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                { label: "Name", value: app.aadhaarName },
                { label: "DOB", value: app.aadhaarDob ? new Date(app.aadhaarDob).toLocaleDateString("en-IN") : null },
                { label: "Gender", value: app.aadhaarGender === "M" ? "Male" : app.aadhaarGender === "F" ? "Female" : null },
                { label: "Aadhaar No.", value: app.aadhaarNumber },
              ].map((r) => (
                <div key={r.label}>
                  <p className="text-[11px] font-semibold text-on-surface-variant uppercase">{r.label}</p>
                  <p className="font-medium text-on-surface">{r.value || "—"}</p>
                </div>
              ))}
              <div className="col-span-2">
                <p className="text-[11px] font-semibold text-on-surface-variant uppercase mb-1">Address</p>
                <p className="font-medium text-on-surface text-xs">{app.aadhaarAddress || "—"}</p>
              </div>
            </div>
          </div>

          {/* PAN Info */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-orange-600 text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>credit_card</span>
              <h4 className="font-semibold text-sm text-on-surface">PAN Details</h4>
              {app.panStatus === "ACTIVE" && (
                <span className="ml-auto text-[11px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Active</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm mb-3">
              {[
                { label: "PAN Number", value: app.panNumber },
                { label: "Name on PAN", value: app.panName },
                { label: "Status", value: app.panStatus },
                { label: "Type", value: app.panNumber ? "Individual" : null },
              ].map((r) => (
                <div key={r.label}>
                  <p className="text-[11px] font-semibold text-on-surface-variant uppercase">{r.label}</p>
                  <p className="font-medium text-on-surface">{r.value || "—"}</p>
                </div>
              ))}
            </div>
            {/* Name Match */}
            {app.panMatchScore !== null && (
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold text-on-surface-variant">Name Match Score</span>
                  <span className={`text-xs font-bold ${app.panMatchScore >= 60 ? "text-green-600" : "text-red-500"}`}>
                    {app.panMatchScore}% {app.panMatchScore >= 60 ? "✓" : "✗"}
                  </span>
                </div>
                <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${app.panMatchScore >= 80 ? "bg-green-500" : app.panMatchScore >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${app.panMatchScore}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Documents */}
          {app.documents && app.documents.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>folder_open</span>
                <h4 className="font-semibold text-sm text-on-surface">Uploaded Documents</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {app.documents.map((doc) => (
                  <a key={doc.id} href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-surface-container-lowest rounded-xl border border-outline-variant/20 hover:border-primary/30 hover:bg-lavender transition-all group">
                    <span className="material-symbols-outlined text-primary text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>description</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-on-surface">{doc.type}</p>
                      <p className="text-[11px] text-on-surface-variant truncate">{doc.fileName || "Document"}</p>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">open_in_new</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Rejection reason */}
          {app.rejectionReason && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
              <span className="material-symbols-outlined text-red-600 text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>cancel</span>
              <div>
                <p className="text-sm font-bold text-red-700">Rejection Reason</p>
                <p className="text-xs text-red-600 mt-1">{app.rejectionReason}</p>
              </div>
            </div>
          )}

          {/* Rejection input */}
          {showRejectModal && (
            <div className="p-4 bg-error-container rounded-xl border border-error/20">
              <p className="text-sm font-semibold text-on-error-container mb-2">Reason for rejection</p>
              <textarea
                className="w-full h-24 text-sm p-3 border border-outline-variant rounded-lg bg-white resize-none focus:outline-none focus:border-error"
                placeholder="Enter rejection reason (required)..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowRejectModal(false)} className="btn-secondary flex-1 text-sm h-10">Cancel</button>
                <button onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}
                  className="flex-1 h-10 bg-error text-on-error rounded-full text-sm font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50">
                  {actionLoading ? "..." : "Confirm Reject"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {canAction && !showRejectModal && (
          <div className="flex gap-3 px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low flex-shrink-0">
            <button onClick={() => setShowRejectModal(true)}
              className="flex-1 h-11 bg-error-container text-on-error-container rounded-full text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">cancel</span> Reject
            </button>
            <button onClick={handleApprove} disabled={actionLoading}
              className="flex-1 h-11 bg-primary text-on-primary rounded-full text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-primary-glow disabled:opacity-60">
              {actionLoading ? <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> : <><span className="material-symbols-outlined text-[18px]">check_circle</span> Approve</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminInfo, setAdminInfo] = useState<any>(null);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("admin_token");
    if (!token) { router.push("/admin/login"); return; }
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setApplications(data.applications);
      }
    } catch {}
    setLoading(false);
  }, [router]);

  useEffect(() => {
    const info = localStorage.getItem("admin_info");
    if (info) setAdminInfo(JSON.parse(info));
    fetchData();
    // Real-time polling every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem("admin_token");
    await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ action: "APPROVE" }),
    });
    await fetchData();
  };

  const handleReject = async (id: string, reason: string) => {
    const token = localStorage.getItem("admin_token");
    await fetch(`/api/admin/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ action: "REJECT", rejectionReason: reason }),
    });
    await fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_info");
    router.push("/admin/login");
  };

  const filteredApps = applications.filter(app => {
    const matchesFilter = activeFilter === "ALL" || app.status === activeFilter;
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      app.customer?.mobile?.includes(search) ||
      app.aadhaarName?.toLowerCase().includes(searchLower) ||
      app.panNumber?.toLowerCase().includes(searchLower) ||
      app.id.includes(search);
    return matchesFilter && matchesSearch;
  });

  const statCards = [
    { label: "Total", value: stats?.total ?? 0, icon: "people", color: "text-primary", bg: "bg-lavender" },
    { label: "Pending", value: stats?.pending ?? 0, icon: "schedule", color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Under Review", value: stats?.underReview ?? 0, icon: "search", color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Approved", value: stats?.approved ?? 0, icon: "check_circle", color: "text-green-600", bg: "bg-green-50" },
    { label: "Rejected", value: stats?.rejected ?? 0, icon: "cancel", color: "text-red-600", bg: "bg-red-50" },
  ];

  const filterTabs = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "IN_PROGRESS", label: "In Progress" },
    { key: "UNDER_REVIEW", label: "Under Review" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-surface-container-lowest border-r border-outline-variant/20 fixed top-0 left-0 h-full z-10">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-outline-variant/20">
          <div className="w-9 h-9 bg-primary-container rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>shield_person</span>
          </div>
          <span className="font-bold text-primary text-base">SecureKYC</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <div className="nav-item active">
            <span className="material-symbols-outlined text-[20px]">dashboard</span> Dashboard
          </div>
          <div className="nav-item">
            <span className="material-symbols-outlined text-[20px]">people</span> Applications
          </div>
          <div className="nav-item">
            <span className="material-symbols-outlined text-[20px]">history</span> Audit Logs
          </div>
          <div className="nav-item">
            <span className="material-symbols-outlined text-[20px]">settings</span> Settings
          </div>
        </nav>
        <div className="p-3 border-t border-outline-variant/20">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container transition-colors cursor-pointer" onClick={handleLogout}>
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[16px]">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate">{adminInfo?.name || "Admin"}</p>
              <p className="text-[10px] text-on-surface-variant">Logout</p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 glass-nav border-b border-outline-variant/20 flex items-center justify-between px-6 h-14">
          <div>
            <h1 className="font-bold text-base text-on-surface">KYC Admin Dashboard</h1>
            <p className="text-[11px] text-on-surface-variant">Real-time monitoring · Auto-refresh every 5s</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-soft" />
              Live
            </div>
            <Link href="/" className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors">View Site</Link>
            <button onClick={handleLogout} className="text-xs font-semibold text-on-surface-variant hover:text-error transition-colors">Logout</button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {statCards.map((s) => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-outline-variant/20 shadow-card hover-lift`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`material-symbols-outlined text-[22px] ${s.color}`} style={{fontVariationSettings:"'FILL' 1"}}>{s.icon}</span>
                  {loading && <span className="material-symbols-outlined text-[14px] text-on-surface-variant animate-spin">progress_activity</span>}
                </div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs font-medium text-on-surface-variant mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Applications Table */}
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/20 shadow-card overflow-hidden">
            {/* Table Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-outline-variant/20">
              <h2 className="font-bold text-sm text-on-surface">KYC Applications</h2>
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-on-surface-variant">search</span>
                <input
                  className="w-full h-9 pl-9 pr-3 border border-outline-variant rounded-xl text-sm bg-surface-container focus:outline-none focus:border-primary"
                  placeholder="Search by name, mobile, PAN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 px-4 py-2 border-b border-outline-variant/20 overflow-x-auto">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    activeFilter === tab.key
                      ? "bg-primary text-on-primary shadow-primary-glow"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {tab.label}
                  {tab.key !== "ALL" && (
                    <span className="ml-1 text-[10px] opacity-70">
                      ({applications.filter(a => a.status === tab.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-8 space-y-3">
                  {[1,2,3].map(i => <div key={i} className="skeleton h-12 rounded-xl" />)}
                </div>
              ) : filteredApps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[48px] mb-2 opacity-40">search_off</span>
                  <p className="text-sm font-medium">No applications found</p>
                  <p className="text-xs opacity-70">Try adjusting your filters</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-bold text-on-surface-variant uppercase tracking-wide bg-surface-container">
                      <th className="px-4 py-3">Applicant</th>
                      <th className="px-4 py-3">Mobile</th>
                      <th className="px-4 py-3">PAN</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Step</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map((app, i) => (
                      <tr key={app.id} className={`border-t border-outline-variant/10 hover:bg-lavender/40 transition-colors cursor-pointer ${i % 2 === 0 ? "" : "bg-surface-container/30"}`}
                        onClick={() => setSelectedApp(app)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {app.aadhaarPhoto ? (
                              <img src={app.aadhaarPhoto} alt="" className="w-7 h-7 rounded-full border border-border-input flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-primary text-[14px]">person</span>
                              </div>
                            )}
                            <span className="font-medium text-on-surface truncate max-w-[120px]">{app.aadhaarName || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">{app.customer?.mobile}</td>
                        <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{app.panNumber || "—"}</td>
                        <td className="px-4 py-3"><StatusBadge status={app.status} /></td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-on-surface-variant">{app.currentStep}/7</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant">
                          {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString("en-IN") : new Date(app.createdAt).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-lavender border border-border-input rounded-full text-xs font-semibold text-primary hover:bg-primary hover:text-on-primary transition-all"
                          >
                            <span className="material-symbols-outlined text-[14px]">open_in_full</span> Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="px-4 py-3 border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
              <span>Showing {filteredApps.length} of {applications.length} applications</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse-soft" />
                Auto-refreshing every 5s
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Application Detail Modal */}
      {selectedApp && (
        <ApplicationModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
