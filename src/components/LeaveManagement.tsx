import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Check, FileText, AlertCircle, Calendar, MapPin, Phone, RefreshCw, UserCheck, CheckCircle2, XCircle, Info, Landmark } from 'lucide-react';
import { User, LeaveRequest, LeaveType, LeaveStatus, CatatanCuti, UnitKerja } from '../types';

interface LeaveManagementProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  onLeavesChange?: () => void;
}

export default function LeaveManagement({ showToast, onLeavesChange }: LeaveManagementProps) {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<UnitKerja[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedTypeFilter, selectedStatusFilter, selectedUnitFilter]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);

  // Form Fields for Admin Inputting Leave
  const [selectedNip, setSelectedNip] = useState('');
  const [jenisCuti, setJenisCuti] = useState<LeaveType>('tahunan');
  const [alasan, setAlasan] = useState('');
  const [lamaHari, setLamaHari] = useState<number>(1);
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [alamatCuti, setAlamatCuti] = useState('');
  const [telepon, setTelepon] = useState('');
  const [verifikatorNip, setVerifikatorNip] = useState('');
  const [pimpinanNip, setPimpinanNip] = useState('');
  const [leaveStatus, setLeaveStatus] = useState<LeaveStatus>('menunggu_verifikasi');
  const [verifikatorNotes, setVerifikatorNotes] = useState('Disetujui oleh Admin');
  const [pimpinanNotes, setPimpinanNotes] = useState('Disetujui oleh Admin');
  const [formError, setFormError] = useState<string | null>(null);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, nama: string, jenis: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchLeavesAndUsers = async () => {
    setIsLoading(true);
    try {
      // Admin gets all leaves using role=admin & some nip
      const [leavesRes, usersRes, unitsRes] = await Promise.all([
        fetch('/api/leave/list?nip=7777&role=admin'),
        fetch('/api/users'),
        fetch('/api/units')
      ]);

      if (!leavesRes.ok) throw new Error('Gagal memuat daftar cuti.');
      if (!usersRes.ok) throw new Error('Gagal memuat data pegawai.');
      if (!unitsRes.ok) throw new Error('Gagal memuat data unit kerja.');

      const leavesData = await leavesRes.json();
      const usersData = await usersRes.json();
      const unitsData = await unitsRes.json();

      setLeaves(leavesData);
      setUsers(usersData);
      setUnits(unitsData);

      // Set default employee selection in form
      if (usersData.length > 0) {
        // Select first non-admin if possible
        const nonAdmin = usersData.find((u: User) => u.role !== 'admin');
        setSelectedNip(nonAdmin ? nonAdmin.nip : usersData[0].nip);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeavesAndUsers();
  }, []);

  // Set default verifiers and pimpinan based on selected employee
  useEffect(() => {
    if (!selectedNip || users.length === 0) return;
    const selectedUser = users.find(u => u.nip === selectedNip);
    if (!selectedUser) return;

    const verifiers = users.filter(u => u.role === 'verifikator');
    const leaders = users.filter(u => u.role === 'pimpinan');

    // Try to auto-select verifier & leader in same department/unit
    const sameDeptVerifier = verifiers.find(v => v.unit_kerja === selectedUser.unit_kerja);
    if (sameDeptVerifier) {
      setVerifikatorNip(sameDeptVerifier.nip);
    } else if (verifiers.length > 0) {
      setVerifikatorNip(verifiers[0].nip);
    } else {
      setVerifikatorNip('');
    }

    const sameDeptLeader = leaders.find(l => l.unit_kerja === selectedUser.unit_kerja);
    if (sameDeptLeader) {
      setPimpinanNip(sameDeptLeader.nip);
    } else if (leaders.length > 0) {
      setPimpinanNip(leaders[0].nip);
    } else {
      setPimpinanNip('');
    }
  }, [selectedNip, users]);

  // Automatically calculate lamaHari from tanggalMulai and tanggalSelesai
  useEffect(() => {
    if (tanggalMulai && tanggalSelesai) {
      const startParts = tanggalMulai.split('-').map(Number);
      const endParts = tanggalSelesai.split('-').map(Number);
      if (startParts.length === 3 && endParts.length === 3) {
        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        
        if (endDate >= startDate) {
          const diffTime = endDate.getTime() - startDate.getTime();
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
          setLamaHari(diffDays);
        } else {
          setLamaHari(1);
        }
      }
    }
  }, [tanggalMulai, tanggalSelesai]);

  const handleOpenAdd = () => {
    setFormError(null);
    setAlasan('');
    setTanggalMulai('');
    setTanggalSelesai('');
    setLamaHari(1);
    setAlamatCuti('');
    setTelepon('');
    setLeaveStatus('menunggu_verifikasi');
    setVerifikatorNotes('Disetujui oleh Admin');
    setPimpinanNotes('Disetujui oleh Admin');
    
    if (users.length > 0) {
      const nonAdmin = users.find(u => u.role !== 'admin');
      setSelectedNip(nonAdmin ? nonAdmin.nip : users[0].nip);
    }
    
    setIsModalOpen(true);
  };

  const handleSaveLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedNip || !alasan.trim() || !tanggalMulai || !tanggalSelesai || !alamatCuti.trim() || !telepon.trim() || !verifikatorNip || !pimpinanNip) {
      setFormError('Silakan lengkapi semua kolom wajib.');
      return;
    }

    setIsLoading(true);
    try {
      // Build default catatanCuti
      const catatan: CatatanCuti = {
        tahunan: { nMinus2: '-', nMinus1: '-', n: jenisCuti === 'tahunan' ? '12' : '-' },
        besar: jenisCuti === 'besar' ? 'Tersedia' : '-',
        sakit: jenisCuti === 'sakit' ? 'Sakit' : '-',
        melahirkan: jenisCuti === 'melahirkan' ? '3 Bulan' : '-',
        alasanPenting: jenisCuti === 'alasan_penting' ? 'Penting' : '-',
        luarTanggungan: jenisCuti === 'luar_tanggungan' ? 'Tersedia' : '-'
      };

      const payload = {
        nip: selectedNip,
        jenisCuti,
        alasan: alasan.trim(),
        lamaHari,
        tanggalMulai,
        tanggalSelesai,
        alamatCuti: alamatCuti.trim(),
        telepon: telepon.trim(),
        verifikatorNip,
        pimpinanNip,
        catatanCuti: catatan,
        status: leaveStatus,
        verifikatorNotes: (leaveStatus === 'disetujui' || leaveStatus === 'menunggu_pimpinan') ? verifikatorNotes : undefined,
        pimpinanNotes: leaveStatus === 'disetujui' ? pimpinanNotes : undefined
      };

      const res = await fetch('/api/admin/leave/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan sistem.');

      showToast(data.message || 'Data cuti berhasil diinput oleh Admin.', 'success');
      setIsModalOpen(false);
      fetchLeavesAndUsers();
      if (onLeavesChange) onLeavesChange();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (leave: LeaveRequest) => {
    setDeleteTarget({
      id: leave.id,
      nama: leave.nama,
      jenis: leave.jenisCuti
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/leave/${deleteTarget.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menghapus pengajuan.');

      showToast(data.message || 'Pengajuan cuti berhasil dihapus.', 'success');
      setDeleteTarget(null);
      fetchLeavesAndUsers();
      if (onLeavesChange) onLeavesChange();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'disetujui':
        return <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold rounded-lg uppercase border border-green-100">Disetujui</span>;
      case 'ditolak':
        return <span className="px-2.5 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-lg uppercase border border-red-100">Ditolak</span>;
      case 'menunggu_pimpinan':
        return <span className="px-2.5 py-1 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-lg uppercase border border-purple-100">Menunggu Pimpinan</span>;
      case 'menunggu_verifikasi':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg uppercase border border-amber-100">Menunggu Verifikasi</span>;
      case 'ditangguhkan':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg uppercase border border-slate-200">Ditangguhkan</span>;
      case 'perubahan':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg uppercase border border-blue-100">Perubahan</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg">{status}</span>;
    }
  };

  const formatLeaveType = (type: LeaveType) => {
    switch (type) {
      case 'tahunan': return 'Cuti Tahunan';
      case 'besar': return 'Cuti Besar';
      case 'sakit': return 'Cuti Sakit';
      case 'melahirkan': return 'Cuti Melahirkan';
      case 'alasan_penting': return 'Cuti Karena Alasan Penting';
      case 'luar_tanggungan': return 'Cuti di Luar Tanggungan Negara';
      default: return type;
    }
  };

  const normalizeUnitName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/^pusat\s*-\s*/, '')
      .trim();
  };

  const filteredLeaves = leaves.filter(l => {
    const matchesSearch = 
      l.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.nip.includes(searchQuery) ||
      l.alasan.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedTypeFilter === 'all' || l.jenisCuti === selectedTypeFilter;
    const matchesStatus = selectedStatusFilter === 'all' || l.status === selectedStatusFilter;
    const matchesUnit = selectedUnitFilter === 'all' || normalizeUnitName(l.unitKerja) === normalizeUnitName(selectedUnitFilter);

    return matchesSearch && matchesType && matchesStatus && matchesUnit;
  });

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeaves = filteredLeaves.slice(indexOfFirstItem, indexOfLastItem);

  const activeEmployees = users.filter(u => u.role !== 'admin');
  const verifiers = users.filter(u => u.role === 'verifikator');
  const leaders = users.filter(u => u.role === 'pimpinan');

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Manajemen Pengajuan Cuti (Admin)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Daftar global, input manual data cuti, serta penataan riwayat cuti pegawai</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Input Cuti Pegawai</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan nama, NIP, atau alasan cuti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>
        <div>
          <select
            value={selectedUnitFilter}
            onChange={(e) => setSelectedUnitFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-700 font-semibold"
          >
            <option value="all">Semua Unit Kerja</option>
            {units.map((u) => (
              <option key={u.id} value={u.nama}>{u.nama}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-700"
          >
            <option value="all">Semua Jenis Cuti</option>
            <option value="tahunan">Cuti Tahunan</option>
            <option value="besar">Cuti Besar</option>
            <option value="sakit">Cuti Sakit</option>
            <option value="melahirkan">Cuti Melahirkan</option>
            <option value="alasan_penting">Alasan Penting</option>
            <option value="luar_tanggungan">Luar Tanggungan Negara</option>
          </select>
        </div>
        <div>
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-700"
          >
            <option value="all">Semua Status</option>
            <option value="menunggu_verifikasi">Menunggu Verifikasi</option>
            <option value="menunggu_pimpinan">Menunggu Pimpinan</option>
            <option value="disetujui">Disetujui</option>
            <option value="ditolak">Ditolak</option>
          </select>
        </div>
      </div>

      {/* Table Display */}
      {isLoading && leaves.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium">Memuat data pengajuan cuti...</span>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <p className="text-xs text-slate-500 italic">Tidak ada pengajuan cuti ditemukan.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3.5">Nama & NIP Pegawai</th>
                <th className="px-4 py-3.5">Jenis Cuti</th>
                <th className="px-4 py-3.5">Masa Cuti (Hari)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{leave.nama}</p>
                    <p className="text-[10px] text-slate-400 font-mono font-medium">{leave.nip}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{formatLeaveType(leave.jenisCuti)}</p>
                    <p className="text-[10px] text-slate-400 italic truncate max-w-[200px]" title={leave.alasan}>
                      "{leave.alasan}"
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{leave.lamaHari} Hari</p>
                    <p className="text-[10px] text-slate-400 font-medium">{leave.tanggalMulai} s/d {leave.tanggalSelesai}</p>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getStatusBadge(leave.status)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedLeave(leave);
                          setIsDetailOpen(true);
                        }}
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                        title="Lihat Detail Cuti"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(leave)}
                        className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
                        title="Hapus Pengajuan Cuti"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {filteredLeaves.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-xs text-slate-500">
                Menampilkan <span className="font-semibold text-slate-800">{filteredLeaves.length === 0 ? 0 : indexOfFirstItem + 1}</span> - <span className="font-semibold text-slate-800">{Math.min(indexOfLastItem, filteredLeaves.length)}</span> dari <span className="font-semibold text-slate-800">{filteredLeaves.length}</span> data pengajuan cuti
              </div>
              <div className="hidden sm:flex items-center space-x-1 text-xs text-slate-500">
                <span className="text-slate-400">|</span>
                <span className="ml-2">Baris per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-1.5 py-0.5 border border-slate-200 rounded-md bg-white text-slate-700 focus:outline-none text-[11px]"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  if (
                    totalPages > 6 &&
                    page !== 1 &&
                    page !== totalPages &&
                    Math.abs(page - currentPage) > 1
                  ) {
                    if (page === 2 && currentPage > 3) {
                      return <span key={page} className="px-1 text-slate-400">...</span>;
                    }
                    if (page === totalPages - 1 && currentPage < totalPages - 2) {
                      return <span key={page} className="px-1 text-slate-400">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10'
                          : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </div>
        )}
        </>
      )}

      {/* INPUT LEAVE MODAL DIALOG */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">
                Input Pengajuan Cuti Pegawai (Admin)
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLeave}>
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs text-slate-800">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Pegawai */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pilih Pegawai *</label>
                    <select
                      value={selectedNip}
                      onChange={(e) => setSelectedNip(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-semibold"
                      disabled={isLoading}
                    >
                      <option value="" disabled>-- Pilih Pegawai --</option>
                      {activeEmployees.map(emp => (
                        <option key={emp.nip} value={emp.nip}>
                          {emp.nama} (NIP: {emp.nip}) - {emp.unit_kerja}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Jenis Cuti */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jenis Cuti *</label>
                    <select
                      value={jenisCuti}
                      onChange={(e) => setJenisCuti(e.target.value as LeaveType)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-medium"
                      disabled={isLoading}
                    >
                      <option value="tahunan">Cuti Tahunan</option>
                      <option value="besar">Cuti Besar</option>
                      <option value="sakit">Cuti Sakit</option>
                      <option value="melahirkan">Cuti Melahirkan</option>
                      <option value="alasan_penting">Cuti Karena Alasan Penting</option>
                      <option value="luar_tanggungan">Cuti Di Luar Tanggungan Negara</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Tanggal Mulai */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Mulai *</label>
                    <input
                      type="date"
                      value={tanggalMulai}
                      onChange={(e) => setTanggalMulai(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-slate-800"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Tanggal Selesai */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tanggal Selesai *</label>
                    <input
                      type="date"
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-slate-800"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Lama Hari (Calculated) */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Lama Cuti (Hari)</label>
                    <div className="w-full px-3 py-2 border border-slate-100 bg-slate-50 rounded-xl text-slate-800 font-mono font-bold text-center">
                      {lamaHari} Hari Kerja
                    </div>
                  </div>
                </div>

                {/* Alasan */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alasan Cuti *</label>
                  <input
                    type="text"
                    value={alasan}
                    onChange={(e) => setAlasan(e.target.value)}
                    placeholder="Contoh: Menghadiri wisuda anak / Liburan keluarga"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-slate-800"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Alamat Cuti */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Alamat Selama Cuti *</label>
                    <input
                      type="text"
                      value={alamatCuti}
                      onChange={(e) => setAlamatCuti(e.target.value)}
                      placeholder="Contoh: Jl. Diponegoro No. 12, Surabaya"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-slate-800"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Telepon */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nomor Telepon / WA *</label>
                    <input
                      type="text"
                      value={telepon}
                      onChange={(e) => setTelepon(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-slate-800 font-mono"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  {/* Verifikator */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Atasan Langsung (Verifikator) *</label>
                    <select
                      value={verifikatorNip}
                      onChange={(e) => setVerifikatorNip(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-semibold"
                      disabled={isLoading}
                    >
                      <option value="" disabled>-- Pilih Verifikator --</option>
                      {verifiers.map(v => (
                        <option key={v.nip} value={v.nip}>
                          {v.nama} - {v.jabatan}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Pimpinan */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pimpinan Berwenang (Persetujuan) *</label>
                    <select
                      value={pimpinanNip}
                      onChange={(e) => setPimpinanNip(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-semibold"
                      disabled={isLoading}
                    >
                      <option value="" disabled>-- Pilih Pimpinan --</option>
                      {leaders.map(l => (
                        <option key={l.nip} value={l.nip}>
                          {l.nama} - {l.jabatan}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 space-y-3 pt-3 mt-2">
                  <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">Pengaturan Status Instan (Admin Bypass)</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Choose Status */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Set Status Cuti</label>
                      <select
                        value={leaveStatus}
                        onChange={(e) => setLeaveStatus(e.target.value as LeaveStatus)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-bold"
                        disabled={isLoading}
                      >
                        <option value="menunggu_verifikasi">🔴 Menunggu Verifikasi</option>
                        <option value="menunggu_pimpinan">🟣 Menunggu Persetujuan Pimpinan</option>
                        <option value="disetujui">🟢 Disetujui (Selesai/Bypass)</option>
                        <option value="ditolak">⚫ Ditolak</option>
                      </select>
                    </div>

                    {/* Conditional Notes based on status */}
                    {(leaveStatus === 'disetujui' || leaveStatus === 'menunggu_pimpinan') && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Catatan Verifikasi</label>
                        <input
                          type="text"
                          value={verifikatorNotes}
                          onChange={(e) => setVerifikatorNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-slate-800 font-semibold"
                          placeholder="Contoh: Sesuai kuota cuti tahunan"
                        />
                      </div>
                    )}
                  </div>

                  {leaveStatus === 'disetujui' && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Catatan Persetujuan Pimpinan</label>
                      <input
                        type="text"
                        value={pimpinanNotes}
                        onChange={(e) => setPimpinanNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none text-slate-800 font-semibold"
                        placeholder="Contoh: Disetujui, silakan delegasikan tugas kerja."
                      />
                    </div>
                  )}
                </div>

              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  disabled={isLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/10 flex items-center space-x-1 cursor-pointer"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Cuti</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL DIALOG */}
      {isDetailOpen && selectedLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">
                Detail Pengajuan Cuti Pegawai
              </h4>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-slate-800 max-h-[70vh] overflow-y-auto">
              {/* Pegawai Info */}
              <div className="flex items-start space-x-3.5 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-slate-900 text-sm">{selectedLeave.nama}</h5>
                  <p className="text-[10px] text-slate-400 mt-0.5">NIP: {selectedLeave.nip} • {selectedLeave.pangkatGol}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">{selectedLeave.jabatan} • {selectedLeave.unitKerja}</p>
                </div>
              </div>

              {/* Leave Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jenis Cuti</span>
                  <span className="font-bold text-slate-800">{formatLeaveType(selectedLeave.jenisCuti)}</span>
                </div>
                <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Pengajuan</span>
                  <div>{getStatusBadge(selectedLeave.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Durasi</span>
                  <span className="font-bold text-slate-900">{selectedLeave.lamaHari} Hari Kerja</span>
                </div>
                <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Masa Cuti</span>
                  <span className="font-semibold text-slate-800">{selectedLeave.tanggalMulai} s/d {selectedLeave.tanggalSelesai}</span>
                </div>
              </div>

              {/* Alasan */}
              <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alasan Pengajuan</span>
                <p className="font-medium text-slate-800 italic">"{selectedLeave.alasan}"</p>
              </div>

              {/* Kontak & Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50 flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Alamat Selama Cuti</span>
                    <span className="font-medium text-slate-800">{selectedLeave.alamatCuti}</span>
                  </div>
                </div>
                <div className="space-y-1 p-3 bg-slate-50/50 rounded-xl border border-slate-100/50 flex items-start space-x-2">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nomor Telepon</span>
                    <span className="font-mono font-medium text-slate-800">{selectedLeave.telepon}</span>
                  </div>
                </div>
              </div>

              {/* Approval Stages */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tahapan Verifikasi Berjenjang</span>
                
                {/* Verifikator */}
                <div className="p-3 bg-slate-50/30 rounded-xl border border-slate-100 flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800">1. Verifikator (Atasan Langsung)</p>
                    <p className="text-[10px] text-slate-400 font-medium">{selectedLeave.verifikatorNama} ({selectedLeave.verifikatorNip})</p>
                    {selectedLeave.verifikatorNotes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 mt-1.5 italic">
                        "{selectedLeave.verifikatorNotes}"
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      {selectedLeave.verifikatorStatus || 'Menunggu'}
                    </span>
                    {selectedLeave.verifikatorDate && (
                      <p className="text-[9px] text-slate-400 mt-1">{selectedLeave.verifikatorDate}</p>
                    )}
                  </div>
                </div>

                {/* Pimpinan */}
                <div className="p-3 bg-slate-50/30 rounded-xl border border-slate-100 flex items-start justify-between">
                  <div>
                    <p className="font-bold text-slate-800">2. Pimpinan (Pejabat Berwenang)</p>
                    <p className="text-[10px] text-slate-400 font-medium">{selectedLeave.pimpinanNama} ({selectedLeave.pimpinanNip})</p>
                    {selectedLeave.pimpinanNotes && (
                      <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 mt-1.5 italic">
                        "{selectedLeave.pimpinanNotes}"
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700">
                      {selectedLeave.pimpinanStatus || 'Menunggu'}
                    </span>
                    {selectedLeave.pimpinanDate && (
                      <p className="text-[9px] text-slate-400 mt-1">{selectedLeave.pimpinanDate}</p>
                    )}
                  </div>
                </div>

              </div>

            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/10 cursor-pointer"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION DIALOG */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950">
            <div className="px-6 py-5 flex items-start space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-bold text-slate-900 text-sm">Hapus Pengajuan Cuti?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus data pengajuan cuti <span className="font-bold text-slate-800">"{formatLeaveType(deleteTarget.jenis as LeaveType)}"</span> atas nama <span className="font-bold text-slate-900">"{deleteTarget.nama}"</span>?
                </p>
                <p className="text-[11px] text-red-600 bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 leading-relaxed font-medium">
                  <strong>Perhatian:</strong> Penghapusan ini bersifat permanen dan tidak dapat dibatalkan. Riwayat data pegawai bersangkutan akan terhapus secara fisik dari database.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center space-x-1.5 cursor-pointer"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <span>Menghapus...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
