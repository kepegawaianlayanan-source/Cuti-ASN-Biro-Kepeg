/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LeaveRequest, LeaveType, LeaveStatus } from '../types';
import { BarChart3, Filter, Search, Calendar, Landmark, CheckCircle2, AlertCircle, RefreshCw, FileSpreadsheet, Eye, Plus } from 'lucide-react';

interface StatsReportsProps {
  leaveRequests: LeaveRequest[];
  onViewRequest: (leave: LeaveRequest) => void;
  // Google Sheets integration props
  googleUser: any;
  googleToken: string | null;
  spreadsheetId: string | null;
  isGoogleLoading: boolean;
  onConnectGoogle: () => Promise<void>;
  onDisconnectGoogle: () => Promise<void>;
  onCreateSpreadsheet: () => Promise<void>;
  onSyncAll: () => Promise<void>;
}

export default function StatsReports({ 
  leaveRequests, 
  onViewRequest,
  googleUser,
  googleToken,
  spreadsheetId,
  isGoogleLoading,
  onConnectGoogle,
  onDisconnectGoogle,
  onCreateSpreadsheet,
  onSyncAll
}: StatsReportsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ----------------------------------------------------
  // Statistics Calculations
  // ----------------------------------------------------
  const total = leaveRequests.length;
  const approved = leaveRequests.filter(r => r.status === 'disetujui').length;
  const pendingVerif = leaveRequests.filter(r => r.status === 'menunggu_verifikasi').length;
  const pendingPimpinan = leaveRequests.filter(r => r.status === 'menunggu_pimpinan').length;
  const rejected = leaveRequests.filter(r => r.status === 'ditolak').length;
  const deferred = leaveRequests.filter(r => r.status === 'ditangguhkan').length;
  const changes = leaveRequests.filter(r => r.status === 'perubahan').length;

  // Leave Type Distribution
  const typeCounts = leaveRequests.reduce((acc, curr) => {
    acc[curr.jenisCuti] = (acc[curr.jenisCuti] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Unit Kerja Distribution
  const unitCounts = leaveRequests.reduce((acc, curr) => {
    acc[curr.unitKerja] = (acc[curr.unitKerja] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Unique Units for filter
  const uniqueUnits = Array.from(new Set(leaveRequests.map(r => r.unitKerja)));

  // Filter application
  const filteredRequests = leaveRequests.filter(req => {
    const matchesSearch = req.nama.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.nip.includes(searchTerm);
    const matchesUnit = filterUnit ? req.unitKerja === filterUnit : true;
    const matchesType = filterType ? req.jenisCuti === filterType : true;
    const matchesStatus = filterStatus ? req.status === filterStatus : true;
    return matchesSearch && matchesUnit && matchesType && matchesStatus;
  });

  const getStatusBadge = (status: LeaveStatus) => {
    const badges: Record<LeaveStatus, React.ReactNode> = {
      menunggu_verifikasi: <span className="px-2.5 py-1 text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-200/50 rounded-full">Menunggu Verifikasi Atasan</span>,
      menunggu_pimpinan: <span className="px-2.5 py-1 text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-200/50 rounded-full">Menunggu Approval Pimpinan</span>,
      disetujui: <span className="px-2.5 py-1 text-xs font-bold bg-green-500/10 text-green-600 border border-green-200/50 rounded-full">Disetujui</span>,
      ditolak: <span className="px-2.5 py-1 text-xs font-bold bg-red-500/10 text-red-600 border border-red-200/50 rounded-full">Ditolak</span>,
      ditangguhkan: <span className="px-2.5 py-1 text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-200/50 rounded-full">Ditangguhkan</span>,
      perubahan: <span className="px-2.5 py-1 text-xs font-bold bg-indigo-500/10 text-indigo-600 border border-indigo-200/50 rounded-full">Perlu Perubahan</span>
    };
    return badges[status] || <span>{status}</span>;
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    const labels: Record<LeaveType, string> = {
      tahunan: 'Cuti Tahunan',
      besar: 'Cuti Besar',
      sakit: 'Cuti Sakit',
      melahirkan: 'Cuti Melahirkan',
      alasan_penting: 'Alasan Penting',
      luar_tanggungan: 'Luar Tanggungan'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Bento Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Submitted */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL PENGAJUAN</span>
            <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"><BarChart3 className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-slate-950">{total}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Berkas cuti terdaftar</p>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">DISETUJUI (FINAL)</span>
            <span className="p-1.5 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-green-600">{approved}</h3>
            <p className="text-[10px] text-slate-500 mt-1">
              {total > 0 ? `${Math.round((approved / total) * 100)}%` : '0%'} Tingkat approval
            </p>
          </div>
        </div>

        {/* Pending Verifikator */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PROSES ATASAN</span>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><RefreshCw className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-amber-600">{pendingVerif}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Menunggu verifikasi atasan</p>
          </div>
        </div>

        {/* Pending Pimpinan */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PROSES PIMPINAN</span>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><AlertCircle className="w-4 h-4" /></span>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-display font-bold text-blue-600">{pendingPimpinan}</h3>
            <p className="text-[10px] text-slate-500 mt-1">Menunggu tanda tangan kepala</p>
          </div>
        </div>

      </div>

      {/* 2. Visual Distributions with Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Leave Type Chart (Custom pure CSS representation) */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Distribusi Jenis Cuti</h4>
          <div className="space-y-3">
            {[
              { type: 'tahunan', label: 'Cuti Tahunan', color: 'bg-amber-500' },
              { type: 'sakit', label: 'Cuti Sakit', color: 'bg-red-500' },
              { type: 'alasan_penting', label: 'Alasan Penting', color: 'bg-indigo-500' },
              { type: 'besar', label: 'Cuti Besar', color: 'bg-purple-500' },
              { type: 'melahirkan', label: 'Cuti Melahirkan', color: 'bg-pink-500' },
              { type: 'luar_tanggungan', label: 'Luar Tanggungan', color: 'bg-slate-400' }
            ].map(item => {
              const count = typeCounts[item.type] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-semibold text-slate-900">{count} berkas ({Math.round(percent)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Unit Kerja Insights */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Beban Pengajuan per Unit Kerja</h4>
            <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
              {Object.keys(unitCounts).length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">Belum ada pengajuan masuk</p>
              ) : (
                Object.entries(unitCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([unit, count]) => {
                    const percent = total > 0 ? (count / total) * 100 : 0;
                    return (
                      <div key={unit} className="flex items-center justify-between text-xs border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-slate-800 truncate">{unit}</p>
                          <p className="text-[10px] text-slate-400">Tingkat pengajuan: {Math.round(percent)}%</p>
                        </div>
                        <span className="px-2 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg text-[10px] shrink-0">
                          {count} Berkas
                        </span>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4 mt-4 flex justify-between items-center text-[11px] text-slate-400">
            <span>Dihitung secara real-time dari seluruh Unit Kerja</span>
            <span className="font-mono text-[10px]">Data update: OK</span>
          </div>
        </div>

      </div>

      {/* Google Sheets Integration Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-display font-bold text-slate-800 text-sm">Sinkronisasi Real-time Google Sheets</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                Secara otomatis mencatat setiap pengajuan, verifikasi, dan keputusan persetujuan cuti langsung ke Google Spreadsheet Anda secara real-time.
              </p>
              {spreadsheetId && (
                <div className="mt-2.5 flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-semibold text-emerald-600">Terhubung ke Spreadsheet:</span>
                  <a 
                    href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="text-xs text-blue-600 hover:text-blue-700 underline font-mono font-medium truncate max-w-[250px]"
                    title="Buka Google Sheet"
                  >
                    Buka Spreadsheet Kepegawaian ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="w-full lg:w-auto shrink-0 flex flex-wrap gap-2.5">
            {!googleToken ? (
              <button
                onClick={onConnectGoogle}
                disabled={isGoogleLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/10 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                    <path d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.76-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.57 1.21 15.69 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"/>
                  </svg>
                )}
                <span>Hubungkan Akun Google</span>
              </button>
            ) : (
              <>
                {!spreadsheetId ? (
                  <button
                    onClick={onCreateSpreadsheet}
                    disabled={isGoogleLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    <span>Buat Spreadsheet Baru</span>
                  </button>
                ) : (
                  <button
                    onClick={onSyncAll}
                    disabled={isGoogleLoading}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span>Sinkronkan Ulang Semua Data</span>
                  </button>
                )}
                <button
                  onClick={onDisconnectGoogle}
                  disabled={isGoogleLoading}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center cursor-pointer"
                >
                  Putuskan
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Filter and Tabular Database View */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        {/* Filters Panel */}
        <div className="p-5 bg-slate-50/50 border-b border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h4 className="font-display font-bold text-slate-800 flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              <span>Rekapitulasi Berkas Cuti Kepegawaian</span>
            </h4>
            <span className="text-[10px] bg-blue-500/10 text-blue-600 font-bold px-3 py-1 rounded-full border border-blue-500/20">
              {filteredRequests.length} dari {total} data ditampilkan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Cari nama atau NIP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
            </div>

            {/* Filter Unit */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Landmark className="w-4 h-4" />
              </span>
              <select
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="">Semua Unit Kerja</option>
                {uniqueUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Filter Cuti */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Calendar className="w-4 h-4" />
              </span>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="">Semua Jenis Cuti</option>
                <option value="tahunan">Cuti Tahunan</option>
                <option value="besar">Cuti Besar</option>
                <option value="sakit">Cuti Sakit</option>
                <option value="melahirkan">Cuti Melahirkan</option>
                <option value="alasan_penting">Alasan Penting</option>
                <option value="luar_tanggungan">Luar Tanggungan</option>
              </select>
            </div>

            {/* Filter Status */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-4 h-4" />
              </span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="">Semua Status Approval</option>
                <option value="menunggu_verifikasi">Menunggu Verifikasi Atasan</option>
                <option value="menunggu_pimpinan">Menunggu Approval Pimpinan</option>
                <option value="disetujui">Disetujui</option>
                <option value="ditolak">Ditolak</option>
                <option value="ditangguhkan">Ditangguhkan</option>
                <option value="perubahan">Perlu Perubahan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Database Table */}
        <div className="overflow-x-auto text-slate-900">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-6 py-4">Pegawai (NIP)</th>
                <th className="px-6 py-4">Unit Kerja</th>
                <th className="px-6 py-4">Jenis Cuti</th>
                <th className="px-6 py-4 text-center">Durasi</th>
                <th className="px-6 py-4">Tanggal Mulai</th>
                <th className="px-6 py-4">Status Approval</th>
                <th className="px-6 py-4 text-center">Formulir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 italic">
                    Tidak ada berkas cuti yang cocok dengan filter aktif
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{req.nama}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP: {req.nip}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600 truncate max-w-[200px]" title={req.unitKerja}>
                      {req.unitKerja}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {getLeaveTypeLabel(req.jenisCuti)}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-800">
                      {req.lamaHari} hari
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-medium">
                      {new Date(req.tanggalMulai).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(req.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => onViewRequest(req)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-700 text-slate-700 font-bold rounded-lg transition-all flex items-center space-x-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Pratinjau / Print</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
