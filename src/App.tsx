/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { User, LeaveRequest, Notification, LeaveStatus, LeaveType } from './types';
import LoginForm from './components/LoginForm';
import LeaveForm from './components/LeaveForm';
import LeaveReport from './components/LeaveReport';
import StatsReports from './components/StatsReports';
import NotificationCenter from './components/NotificationCenter';
import SignatureModal from './components/SignatureModal';
import UnitKerjaManagement from './components/UnitKerjaManagement';
import UserManagement from './components/UserManagement';
import LeaveManagement from './components/LeaveManagement';
import { 
  initAuth, 
  googleSignIn, 
  logoutGoogle, 
  createSpreadsheet, 
  syncSingleLeave, 
  syncAllLeaves 
} from './lib/googleSheets';
import { 
  FileText, LogOut, KeyRound, CheckCircle2, AlertCircle, RefreshCw, Clock, 
  User as UserIcon, Plus, Eye, Check, X, Building, Phone, Calendar, Landmark,
  Shield, Inbox, FileCheck, HelpCircle, PenTool, Users
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  
  // Modals / Overlays
  const [activeRequestForPrint, setActiveRequestForPrint] = useState<LeaveRequest | null>(null);
  const [selectedRequestForAction, setSelectedRequestForAction] = useState<LeaveRequest | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Password Modal Fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Approval action notes
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Admin Reset Field
  const [isAdminResetting, setIsAdminResetting] = useState(false);

  // SSE EventSource reference
  const sseSourceRef = useRef<EventSource | null>(null);

  // Google Sheets Integration States
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Check for saved spreadsheet ID and setup Google Auth
  useEffect(() => {
    const savedSheetId = localStorage.getItem('basarnas_spreadsheet_id');
    if (savedSheetId) {
      setSpreadsheetId(savedSheetId);
    }

    const unsubscribe = initAuth(
      (gUser, token) => {
        setGoogleUser(gUser);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Load user session on load
  useEffect(() => {
    const cached = localStorage.getItem('basarnas_user');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem('basarnas_user');
      }
    }
  }, []);

  // Fetch leave list and notifications periodically for real-time dashboard status updates
  useEffect(() => {
    if (!user) return;

    fetchLeaves();
    fetchNotifications();

    // Establish real-time notification via SSE (Server-Sent Events)
    const eventSource = new EventSource(`/api/notifications/stream?nip=${user.nip}`);
    sseSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        // Prepend new notification to state
        setNotifications((prev) => [newNotif, ...prev]);
        // Trigger visual toast
        showToast(`Notifikasi Baru: ${newNotif.title}`, 'success');
        // Refresh leaves automatically in case a status change triggered the notification
        fetchLeaves();
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = () => {
      console.warn("SSE connection interrupted. Falling back to active HTTP polling.");
    };

    // Standard HTTP polling interval (every 4 seconds) to catch updates instantly
    const pollInterval = setInterval(() => {
      fetchLeaves();
      fetchNotifications();
    }, 4000);

    return () => {
      if (sseSourceRef.current) {
        sseSourceRef.current.close();
      }
      clearInterval(pollInterval);
    };
  }, [user]);

  const fetchLeaves = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/leave/list?nip=${user.nip}&role=${user.role}`);
      if (res.ok) {
        const data = await res.json();
        setLeaveRequests(data);
      }
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/notifications?nip=${user.nip}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('basarnas_user', JSON.stringify(loggedInUser));
    
    // Set appropriate initial tab depending on role
    if (loggedInUser.role === 'admin') {
      setActiveTab('rekapitulasi');
    } else if (loggedInUser.role === 'verifikator') {
      setActiveTab('persetujuan');
    } else if (loggedInUser.role === 'pimpinan') {
      setActiveTab('persetujuan');
    } else {
      setActiveTab('dashboard');
    }
    
    if (!loggedInUser.signature && loggedInUser.role !== 'admin') {
      setIsSignatureModalOpen(true);
      showToast(`Selamat datang, ${loggedInUser.nama}. Silakan lengkapi tanda tangan digital Anda untuk keperluan dokumen cuti.`, 'success');
    } else {
      showToast(`Selamat datang, ${loggedInUser.nama}`, 'success');
    }
  };

  const handleSignatureSave = async (signatureDataUrl: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/user/update-signature', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: user.nip,
          signature: signatureDataUrl
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan tanda tangan');
      }
      
      const updatedUser = { ...user, signature: signatureDataUrl };
      setUser(updatedUser);
      localStorage.setItem('basarnas_user', JSON.stringify(updatedUser));
      
      showToast("Tanda tangan digital berhasil diperbarui!", "success");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Gagal menyimpan tanda tangan.", "error");
      throw err;
    }
  };

  const handleLogout = () => {
    if (sseSourceRef.current) {
      sseSourceRef.current.close();
    }
    setUser(null);
    localStorage.removeItem('basarnas_user');
    setLeaveRequests([]);
    setNotifications([]);
    showToast("Berhasil keluar dari sistem.", "success");
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleMarkNotificationsRead = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip: user.nip }),
      });
      if (res.ok) {
        // Optimistically update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearNotifications = async () => {
    // For simplicity, local clear works
    setNotifications([]);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Sandi baru dan konfirmasi sandi tidak cocok.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Sandi baru minimal berukuran 6 karakter.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nip: user?.nip,
          oldPassword,
          newPassword
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengubah sandi');
      }

      showToast("Kata sandi berhasil diperbarui!", 'success');
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Koneksi terganggu.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Process approval action (approve, reject, defer, require change)
  const handleApprovalAction = async (action: 'disetujui' | 'perubahan' | 'ditangguhkan' | 'ditolak') => {
    if (!selectedRequestForAction || !user) return;

    setIsActionLoading(true);
    try {
      const res = await fetch('/api/leave/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaveId: selectedRequestForAction.id,
          actorNip: user.nip,
          actorRole: user.role,
          action,
          notes: approvalNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan keputusan.');
      }

      showToast(`Keputusan '${action}' berhasil disimpan!`, 'success');
      setSelectedRequestForAction(null);
      setApprovalNotes('');
      fetchLeaves();

      // Auto sync status update if Google is connected
      if (googleToken && spreadsheetId && data.leaveRequest) {
        syncSingleLeave(data.leaveRequest, googleToken, spreadsheetId)
          .then((ok) => {
            if (ok) {
              showToast("Status cuti diperbarui di Google Sheets!", 'success');
            }
          });
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal melakukan action.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Google Sheets Action Handlers
  const handleConnectGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showToast("Berhasil terhubung dengan Google!", "success");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menghubungkan Google.", "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsGoogleLoading(true);
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
      showToast("Berhasil memutuskan sambungan Google.", "success");
    } catch (err: any) {
      showToast("Gagal memutuskan sambungan Google.", "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleCreateSpreadsheet = async () => {
    if (!googleToken) {
      showToast("Silakan hubungkan akun Google terlebih dahulu.", "error");
      return;
    }
    setIsGoogleLoading(true);
    try {
      const id = await createSpreadsheet(googleToken);
      if (id) {
        setSpreadsheetId(id);
        localStorage.setItem('basarnas_spreadsheet_id', id);
        showToast("Spreadsheet baru berhasil dibuat dan ditautkan!", "success");
        
        // Sync existing leaves immediately to fully populate
        if (leaveRequests.length > 0) {
          const syncRes = await syncAllLeaves(leaveRequests, googleToken, id);
          if (syncRes.success) {
            showToast(`Berhasil menyinkronkan ${syncRes.count} data cuti ke Google Sheets!`, "success");
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || "Gagal membuat spreadsheet.", "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!googleToken || !spreadsheetId) {
      showToast("Google Sheets belum terhubung.", "error");
      return;
    }
    setIsGoogleLoading(true);
    try {
      const result = await syncAllLeaves(leaveRequests, googleToken, spreadsheetId);
      if (result.success) {
        showToast(`Sinkronisasi sukses! ${result.count} data berhasil disalin ke Google Sheets.`, "success");
      } else {
        showToast("Sinkronisasi gagal. Pastikan Spreadsheet dapat diakses.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal melakukan sinkronisasi.", "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Reset System Data
  const handleResetSystem = async () => {
    const confirmed = window.confirm("Apakah Anda yakin ingin me-reset seluruh database sistem ke pengaturan bawaan? Seluruh data cuti akan dihapus.");
    if (!confirmed) return;

    setIsAdminResetting(true);
    try {
      const res = await fetch('/api/admin/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'basarnas_demo_reset' })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message, 'success');
        fetchLeaves();
        fetchNotifications();
      } else {
        showToast(data.error || 'Reset gagal', 'error');
      }
    } catch (err) {
      showToast('Koneksi terganggu.', 'error');
    } finally {
      setIsAdminResetting(false);
    }
  };

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  // ----------------------------------------------------
  // List Filters & Render Categorization
  // ----------------------------------------------------

  // Leaves needing current logged-in user action (berjenjang pipeline)
  const pendingRequestsForMe = leaveRequests.filter((req) => {
    if (user.role === 'verifikator') {
      return req.verifikatorNip === user.nip && req.status === 'menunggu_verifikasi';
    }
    if (user.role === 'pimpinan') {
      return req.pimpinanNip === user.nip && req.status === 'menunggu_pimpinan';
    }
    return false;
  });

  // Approved leave requests history
  const actionedRequestsByMe = leaveRequests.filter((req) => {
    if (user.role === 'verifikator') {
      return req.verifikatorNip === user.nip && req.status !== 'menunggu_verifikasi';
    }
    if (user.role === 'pimpinan') {
      return req.pimpinanNip === user.nip && req.status !== 'menunggu_pimpinan';
    }
    return false;
  });

  const getStatusLabelAndStyle = (status: LeaveStatus) => {
    const map: Record<LeaveStatus, { text: string; css: string }> = {
      menunggu_verifikasi: { text: 'Menunggu Verifikasi Atasan', css: 'bg-amber-100 text-amber-800 border-amber-200' },
      menunggu_pimpinan: { text: 'Menunggu Approval Pimpinan', css: 'bg-blue-100 text-blue-800 border-blue-200' },
      disetujui: { text: 'Disetujui', css: 'bg-green-100 text-green-800 border-green-200' },
      ditolak: { text: 'Ditolak', css: 'bg-red-100 text-red-800 border-red-200' },
      ditangguhkan: { text: 'Ditangguhkan', css: 'bg-purple-100 text-purple-800 border-purple-200' },
      perubahan: { text: 'Perlu Perubahan', css: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    };
    return map[status] || { text: status, css: 'bg-slate-100 text-slate-800' };
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    const map: Record<LeaveType, string> = {
      tahunan: 'Cuti Tahunan',
      besar: 'Cuti Besar',
      sakit: 'Cuti Sakit',
      melahirkan: 'Cuti Melahirkan',
      alasan_penting: 'Karena Alasan Penting',
      luar_tanggungan: 'Di Luar Tanggungan Negara'
    };
    return map[type] || type;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Dynamic Visual Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-300 no-print">
          <span className={`w-2.5 h-2.5 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-30 shadow-sm no-print">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-white font-black px-3 py-1.5 rounded-xl text-xs tracking-tight shadow-md shadow-blue-600/10">
            BASARNAS
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">Aplikasi Cuti ASN</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Badan Nasional Pencarian dan Pertolongan</p>
          </div>
        </div>

        {/* User profile details and SSE notification center */}
        <div className="flex items-center space-x-4">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-slate-900">{user.nama}</p>
            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{user.role} &bull; {user.nip}</p>
          </div>

          <div className="flex items-center space-x-2">
            {/* Real-time Notification Center */}
            <NotificationCenter 
              notifications={notifications}
              onMarkAllAsRead={handleMarkNotificationsRead}
              onClear={handleClearNotifications}
            />

            {/* Digital Signature Trigger */}
            {user && user.role !== 'admin' && (
              <button
                onClick={() => setIsSignatureModalOpen(true)}
                className={`p-2.5 rounded-2xl transition-all shadow-sm focus:outline-none flex items-center justify-center border cursor-pointer ${
                  user.signature 
                    ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-600' 
                    : 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-600 animate-pulse'
                }`}
                title={user.signature ? "Kelola Tanda Tangan Digital (Sudah Terpasang)" : "Atur Tanda Tangan Digital (Belum Terpasang!)"}
              >
                <PenTool className="w-5 h-5" />
              </button>
            )}

            {/* Change Password Trigger */}
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl transition-all shadow-sm focus:outline-none cursor-pointer"
              title="Ubah Sandi Pegawai"
            >
              <KeyRound className="w-5 h-5 text-slate-700" />
            </button>

            {/* Logout Trigger */}
            <button
              onClick={handleLogout}
              className="p-2.5 bg-red-50 border border-red-200/50 hover:bg-red-100 rounded-2xl transition-all shadow-sm focus:outline-none text-red-600 cursor-pointer"
              title="Keluar dari Sistem"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Application Inner Body Grid */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Left Side Navigation Panel */}
        <nav className="md:w-64 bg-slate-900 border-r border-slate-800 p-5 space-y-1.5 shrink-0 no-print flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="px-1 py-1 mb-4">
              <div className="flex items-center space-x-2 p-3 bg-slate-800/40 border border-slate-800 rounded-2xl">
                <div className="p-2 bg-blue-600 text-white rounded-xl">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{user.nama.split(',')[0]}</p>
                  <p className="text-[9px] text-slate-400 font-mono truncate">{user.nip}</p>
                </div>
              </div>
            </div>

            {/* Nav Item: Submitter Dashboard */}
            {user.role !== 'admin' && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Landmark className="w-4 h-4" />
                <span>Dashboard Cuti Saya</span>
              </button>
            )}

            {/* Nav Item: Submit Leave Form */}
            {user.role !== 'admin' && (
              <button
                onClick={() => setActiveTab('pengajuan')}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all ${
                  activeTab === 'pengajuan'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Pengajuan Cuti Baru</span>
              </button>
            )}

            {/* Nav Item: Hierarchical approvals queue */}
            {(user.role === 'verifikator' || user.role === 'pimpinan') && (
              <button
                onClick={() => setActiveTab('persetujuan')}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all relative ${
                  activeTab === 'persetujuan'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="flex-1">Persetujuan Berjenjang</span>
                {pendingRequestsForMe.length > 0 && (
                  <span className="bg-red-500 text-white font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {pendingRequestsForMe.length}
                  </span>
                )}
              </button>
            )}

            {/* Nav Item: Perekapan Data (Automatic Reports) */}
            {(user.role === 'pimpinan' || user.role === 'admin') && (
              <button
                onClick={() => setActiveTab('rekapitulasi')}
                className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all ${
                  activeTab === 'rekapitulasi'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Perekapan Data (Laporan)</span>
              </button>
            )}

            {/* Administrative actions for Demo review */}
            {user.role === 'admin' && (
              <div className="pt-6 border-t border-slate-800 mt-6 space-y-2">
                <span className="px-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Sistem Admin</span>
                
                <button
                  onClick={() => setActiveTab('unit_kerja')}
                  className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all ${
                    activeTab === 'unit_kerja'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span>Master Unit Kerja</span>
                </button>

                <button
                  onClick={() => setActiveTab('manajemen_user')}
                  className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all ${
                    activeTab === 'manajemen_user'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Manajemen User Pegawai</span>
                </button>

                <button
                  onClick={() => setActiveTab('manajemen_cuti')}
                  className={`w-full text-left px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center space-x-3 transition-all ${
                    activeTab === 'manajemen_cuti'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Manajemen Cuti Pegawai</span>
                </button>

                <button
                  onClick={handleResetSystem}
                  disabled={isAdminResetting}
                  className="w-full text-left px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/20 hover:text-red-300 flex items-center space-x-3 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isAdminResetting ? 'animate-spin' : ''}`} />
                  <span>Reset Database Demo</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Help card inside sidebar */}
          <div className="pt-6 hidden md:block">
            <div className="p-4 bg-slate-800/30 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
              <h5 className="font-bold text-slate-200 flex items-center space-x-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Uji Coba Berjenjang</span>
              </h5>
              <p className="leading-relaxed">
                Anda bisa membuka <strong>tab browser baru</strong> dan login menggunakan demo verifikator atau pimpinan untuk menguji persetujuan berjenjang langsung.
              </p>
            </div>
          </div>

        </nav>

        {/* Right Content Area */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto no-print">
          
          {/* TAB 1: DASHBOARD CUTI SAYA */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Welcome card */}
              <div className="bg-slate-900 text-white p-6 rounded-3xl relative overflow-hidden bg-radial from-slate-800 to-slate-950 border border-slate-800">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-20"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white tracking-tight">Halo, {user.nama}</h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-lg leading-relaxed">
                      Selamat datang di Sistem Informasi Pengajuan Cuti Berjenjang BASARNAS. Status approval cuti Anda terupdate secara instan di bawah ini.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('pengajuan')}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 hover:shadow-lg transition-all flex items-center space-x-1.5 shrink-0 self-start md:self-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ajukan Cuti</span>
                  </button>
                </div>
              </div>

              {/* Personal Leave History */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-display font-bold text-slate-800 text-sm">Riwayat Pengajuan Cuti Anda</h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Updates Aktif</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">ID Berkas</th>
                        <th className="px-6 py-4">Jenis Cuti</th>
                        <th className="px-6 py-4 text-center">Lama Hari</th>
                        <th className="px-6 py-4">Tanggal Pelaksanaan</th>
                        <th className="px-6 py-4">Status Pengajuan</th>
                        <th className="px-6 py-4 text-center">Aksi Formulir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-900">
                      {leaveRequests.filter(r => r.nip === user.nip).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                            Belum ada riwayat pengajuan cuti yang terdaftar.
                          </td>
                        </tr>
                      ) : (
                        leaveRequests
                          .filter(r => r.nip === user.nip)
                          .map((req) => {
                            const badge = getStatusLabelAndStyle(req.status);
                            return (
                              <tr key={req.id} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-slate-500">
                                  {req.id.split('_')[1] || req.id}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800">{getLeaveTypeLabel(req.jenisCuti)}</p>
                                  <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{req.alasan}</p>
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-slate-800">
                                  {req.lamaHari} Hari
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                  {new Date(req.tanggalMulai).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short'
                                  })} - {new Date(req.tanggalSelesai).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric'
                                  })}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-start gap-1">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.css}`}>
                                      {badge.text}
                                    </span>
                                    {/* Sub-text notes depending on state */}
                                    {req.status === 'menunggu_verifikasi' && (
                                      <span className="text-[9px] text-slate-400 italic">Verifikator: {req.verifikatorNama}</span>
                                    )}
                                    {req.status === 'menunggu_pimpinan' && (
                                      <span className="text-[9px] text-slate-400 italic">Pimpinan: {req.pimpinanNama}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  <button
                                    onClick={() => setActiveRequestForPrint(req)}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold rounded-lg transition-all flex items-center space-x-1 mx-auto"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Lihat & Cetak</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PENGAJUAN CUTI BARU */}
          {activeTab === 'pengajuan' && (
            <LeaveForm 
              user={user} 
              onSuccess={(newLeave) => {
                showToast("Pengajuan cuti berhasil terkirim dan disimpan!", 'success');
                setActiveTab('dashboard');
                // Auto sync if Google is connected
                if (googleToken && spreadsheetId && newLeave) {
                  syncSingleLeave(newLeave, googleToken, spreadsheetId)
                    .then((ok) => {
                      if (ok) {
                        showToast("Sinkronisasi otomatis ke Google Sheets sukses!", 'success');
                      }
                    });
                }
              }} 
            />
          )}

          {/* TAB 3: PERSETUJUAN BERJENJANG (VERIFIKATOR & PIMPINAN ONLY) */}
          {activeTab === 'persetujuan' && (
            <div className="space-y-6">
              
              {/* Intro Title */}
              <div>
                <h3 className="font-display font-bold text-slate-900 text-lg">Persetujuan Berjenjang Kepegawaian</h3>
                <p className="text-xs text-slate-500 mt-1">Daftar berkas pengajuan cuti yang memerlukan keputusan dan validasi Anda.</p>
              </div>

              {/* Waiting list table */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Antrean Berkas Tertunda</h4>
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-1 rounded-full animate-pulse">
                    {pendingRequestsForMe.length} Berkas
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Pengaju / NIP</th>
                        <th className="px-6 py-4">Unit Kerja</th>
                        <th className="px-6 py-4">Jenis Cuti</th>
                        <th className="px-6 py-4 text-center">Lama Hari</th>
                        <th className="px-6 py-4">Periode</th>
                        <th className="px-6 py-4 text-center">Keputusan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-900">
                      {pendingRequestsForMe.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                            Selamat! Tidak ada berkas tertunda dalam antrean Anda saat ini.
                          </td>
                        </tr>
                      ) : (
                        pendingRequestsForMe.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-bold text-slate-800">{req.nama}</p>
                              <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP: {req.nip} &bull; {req.pangkatGol}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]" title={req.unitKerja}>
                              {req.unitKerja}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-700">
                              {getLeaveTypeLabel(req.jenisCuti)}
                              <p className="text-[10px] text-slate-400 font-normal truncate max-w-[180px]">Alasan: {req.alasan}</p>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-slate-800">
                              {req.lamaHari} hari
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {new Date(req.tanggalMulai).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short'
                              })} - {new Date(req.tanggalSelesai).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedRequestForAction(req);
                                    setApprovalNotes('');
                                  }}
                                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-all"
                                >
                                  Tinjau & Putuskan
                                </button>
                                <button
                                  onClick={() => setActiveRequestForPrint(req)}
                                  className="p-1.5 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded-lg transition-all"
                                  title="Pratinjau Berkas"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Already actioned requests history by this verifier/leader */}
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Riwayat Tindakan Persetujuan Anda</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/30 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="px-6 py-4">Nama Pengaju</th>
                        <th className="px-6 py-4">Jenis Cuti</th>
                        <th className="px-6 py-4 text-center">Lama Hari</th>
                        <th className="px-6 py-4">Keputusan Anda</th>
                        <th className="px-6 py-4">Catatan Keputusan</th>
                        <th className="px-6 py-4 text-center">Formulir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs text-slate-900">
                      {actionedRequestsByMe.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-slate-400 italic">
                            Belum ada riwayat berkas yang Anda setujui atau tolak.
                          </td>
                        </tr>
                      ) : (
                        actionedRequestsByMe.map((req) => {
                          const decision = user.role === 'verifikator' ? req.verifikatorStatus : req.pimpinanStatus;
                          const actionDate = user.role === 'verifikator' ? req.verifikatorDate : req.pimpinanDate;
                          const notes = user.role === 'verifikator' ? req.verifikatorNotes : req.pimpinanNotes;
                          
                          return (
                            <tr key={req.id} className="hover:bg-slate-50/30 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-bold text-slate-800">{req.nama}</p>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP: {req.nip}</p>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-700">
                                {getLeaveTypeLabel(req.jenisCuti)}
                              </td>
                              <td className="px-6 py-4 text-center font-bold text-slate-800">
                                {req.lamaHari} Hari
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex flex-col items-start">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                    decision === 'disetujui' 
                                      ? 'bg-green-100 text-green-800 border border-green-200' 
                                      : 'bg-red-100 text-red-800 border border-red-200'
                                  }`}>
                                    {decision}
                                  </span>
                                  <span className="text-[8px] text-slate-400 mt-0.5">{actionDate}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-600 truncate max-w-[180px]" title={notes}>
                                {notes || '-'}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => setActiveRequestForPrint(req)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-bold rounded-lg transition-all flex items-center space-x-1 mx-auto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: REKAPITULASI LAPORAN OTOMATIS (PIMPINAN & ADMIN ONLY) */}
          {activeTab === 'rekapitulasi' && (
            <StatsReports 
              leaveRequests={leaveRequests} 
              onViewRequest={(req) => setActiveRequestForPrint(req)}
              googleUser={googleUser}
              googleToken={googleToken}
              spreadsheetId={spreadsheetId}
              isGoogleLoading={isGoogleLoading}
              onConnectGoogle={handleConnectGoogle}
              onDisconnectGoogle={handleDisconnectGoogle}
              onCreateSpreadsheet={handleCreateSpreadsheet}
              onSyncAll={handleSyncAll}
            />
          )}

          {/* TAB 5: MASTER UNIT KERJA CRUD (ADMIN ONLY) */}
          {activeTab === 'unit_kerja' && user?.role === 'admin' && (
            <UnitKerjaManagement showToast={showToast} />
          )}

          {/* TAB 6: USER MANAGEMENT (ADMIN ONLY) */}
          {activeTab === 'manajemen_user' && user?.role === 'admin' && (
            <UserManagement showToast={showToast} />
          )}

          {/* TAB 7: LEAVE MANAGEMENT (ADMIN ONLY) */}
          {activeTab === 'manajemen_cuti' && user?.role === 'admin' && (
            <LeaveManagement showToast={showToast} onLeavesChange={fetchLeaves} />
          )}

        </main>
      </div>

      {/* ----------------------------------------------------
          OVERLAY MODAL 1: PREVIEW / PRINT FORMULIR RESMI
      ---------------------------------------------------- */}
      {activeRequestForPrint && (
        <LeaveReport 
          leave={activeRequestForPrint} 
          onClose={() => setActiveRequestForPrint(null)} 
        />
      )}

      {/* ----------------------------------------------------
          OVERLAY MODAL 2: PERSUTUJUAN ACTION DRAWER (ATASAN / PIMPINAN)
      ---------------------------------------------------- */}
      {selectedRequestForAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-slate-900 no-print">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-display font-bold text-slate-900">Validasi Pengajuan Cuti</h4>
                <p className="text-[10px] text-slate-500">Evaluasi berkas atas nama {selectedRequestForAction.nama}</p>
              </div>
              <button 
                onClick={() => setSelectedRequestForAction(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Request Summary details inside Drawer */}
            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                <div className="grid grid-cols-2 text-xs">
                  <span className="text-slate-400 font-semibold">Nama Pengaju</span>
                  <span className="font-bold text-slate-800 text-right">{selectedRequestForAction.nama}</span>
                </div>
                <div className="grid grid-cols-2 text-xs border-t border-slate-200/50 pt-2">
                  <span className="text-slate-400 font-semibold">Jenis Cuti</span>
                  <span className="font-bold text-slate-800 text-right">{getLeaveTypeLabel(selectedRequestForAction.jenisCuti)}</span>
                </div>
                <div className="grid grid-cols-2 text-xs border-t border-slate-200/50 pt-2">
                  <span className="text-slate-400 font-semibold">Durasi</span>
                  <span className="font-bold text-slate-800 text-right">{selectedRequestForAction.lamaHari} Hari</span>
                </div>
                <div className="grid grid-cols-2 text-xs border-t border-slate-200/50 pt-2">
                  <span className="text-slate-400 font-semibold">Alasan</span>
                  <span className="font-bold text-slate-700 text-right italic">&ldquo;{selectedRequestForAction.alasan}&rdquo;</span>
                </div>
              </div>

              {/* Decision Notes textarea */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Tulis Catatan / Pertimbangan Keputusan
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Misal: Disetujui karena kuota memadai, atau tuliskan alasan penangguhan/penolakan..."
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-800"
                />
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                
                {/* 1. Setujui */}
                <button
                  onClick={() => handleApprovalAction('disetujui')}
                  disabled={isActionLoading}
                  className="py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-green-600/10"
                >
                  <Check className="w-4 h-4" />
                  <span>Setujui (Approve)</span>
                </button>

                {/* 2. Tolak */}
                <button
                  onClick={() => handleApprovalAction('ditolak')}
                  disabled={isActionLoading}
                  className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-red-600/10"
                >
                  <X className="w-4 h-4" />
                  <span>Tolak (Reject)</span>
                </button>

                {/* 3. Tangguhkan */}
                <button
                  onClick={() => handleApprovalAction('ditangguhkan')}
                  disabled={isActionLoading}
                  className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-purple-600/10"
                >
                  <Clock className="w-4 h-4" />
                  <span>Tangguhkan (Defer)</span>
                </button>

                {/* 4. Perubahan */}
                <button
                  onClick={() => handleApprovalAction('perubahan')}
                  disabled={isActionLoading}
                  className="py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md shadow-indigo-600/10"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Minta Perubahan</span>
                </button>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          OVERLAY MODAL 3: UBAH PASSWORD MODAL
      ---------------------------------------------------- */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-slate-900 no-print">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h4 className="font-display font-bold text-slate-900">Ubah Kata Sandi Pegawai</h4>
                <p className="text-[10px] text-slate-500">Amankan kredensial login sistem cuti Anda</p>
              </div>
              <button 
                onClick={() => setIsPasswordModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Password edit form */}
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                  {passwordError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Kata Sandi Lama *</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan sandi lama"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Kata Sandi Baru *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide">Konfirmasi Kata Sandi Baru *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi sandi baru"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-slate-800"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                >
                  {passwordLoading ? 'Memperbarui...' : 'Simpan Sandi Baru'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Signature Configuration Modal */}
      {user && isSignatureModalOpen && (
        <SignatureModal
          user={user}
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          onSave={handleSignatureSave}
        />
      )}

    </div>
  );
}
