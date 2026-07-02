/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, LeaveType, CatatanCuti, LeaveRequest } from '../types';
import { FileText, Send, Calendar, MapPin, Phone, HelpCircle, Loader2, RefreshCw, Building2, Globe, AlertTriangle, ShieldCheck } from 'lucide-react';
import { getUsersDirect, saveLeaveDirect, triggerNotificationDirect, getLeavesDirect } from '../lib/firebaseDb';

interface LeaveFormProps {
  user: User;
  onSuccess: (newLeave?: any) => void;
  editRequest?: LeaveRequest;
  onCancelEdit?: () => void;
}

// Helper to compare unit_kerja flexibly and robustly (e.g., treating "Pusat - Biro Kepegawaian" and "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana" as identical)
const isSameUnit = (unitA: string, unitB: string): boolean => {
  if (!unitA || !unitB) return false;
  if (unitA === unitB) return true;
  
  const normalize = (s: string) => {
    let res = s.toLowerCase().replace(/\s+/g, '').replace(/[,.-]/g, '');
    if (res.includes("birokepegawaian")) {
      return "birokepegawaian";
    }
    return res;
  };
  
  return normalize(unitA) === normalize(unitB);
};

export default function LeaveForm({ user, onSuccess, editRequest, onCancelEdit }: LeaveFormProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [jenisCuti, setJenisCuti] = useState<LeaveType>('tahunan');
  const [alasan, setAlasan] = useState('');
  const [lamaHari, setLamaHari] = useState<number>(1);
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [alamatCuti, setAlamatCuti] = useState('');
  const [telepon, setTelepon] = useState('');
  const [verifikatorNip, setVerifikatorNip] = useState('');
  const [pimpinanNip, setPimpinanNip] = useState('');
  const [approvalScope, setApprovalScope] = useState<'internal' | 'external'>('internal');

  // Allowance stats states
  const [totalJatah, setTotalJatah] = useState<number>(12);
  const [approvedTahunan, setApprovedTahunan] = useState<number>(0);
  const [remainingTahunan, setRemainingTahunan] = useState<number>(12);

  // Catatan Cuti (Balances)
  const [catatanCuti, setCatatanCuti] = useState<CatatanCuti>({
    tahunan: { nMinus2: '-', nMinus1: '-', n: '12' },
    besar: '-',
    sakit: '-',
    melahirkan: '-',
    alasanPenting: '-',
    luarTanggungan: '-'
  });

  // Load existing leave data if editRequest is provided
  useEffect(() => {
    if (editRequest) {
      setJenisCuti(editRequest.jenisCuti);
      setAlasan(editRequest.alasan);
      setLamaHari(editRequest.lamaHari);
      setTanggalMulai(editRequest.tanggalMulai);
      setTanggalSelesai(editRequest.tanggalSelesai);
      setAlamatCuti(editRequest.alamatCuti);
      setTelepon(editRequest.telepon);
      setVerifikatorNip(editRequest.verifikatorNip || '');
      setPimpinanNip(editRequest.pimpinanNip || '');
      if (editRequest.catatanCuti) {
        setCatatanCuti(editRequest.catatanCuti);
      }
    }
  }, [editRequest]);

  // Fetch verifiers and leaders to populate select menus
  useEffect(() => {
    async function fetchUsers() {
      setIsLoadingUsers(true);
      try {
        const data = await getUsersDirect();
        setAllUsers(data);
        
        // Set sensible defaults if not editing
        const verifiers = data.filter((u: User) => u.role === 'verifikator');
        const leaders = data.filter((u: User) => u.role === 'pimpinan');
        
        if (!editRequest) {
          // Try to select verifiers in same department/unit if possible
          const sameDeptVerifier = verifiers.find((v: User) => v.unit_kerja === user.unit_kerja);
          if (sameDeptVerifier) {
            setVerifikatorNip(sameDeptVerifier.nip);
          } else if (verifiers.length > 0) {
            setVerifikatorNip(verifiers[0].nip);
          }

          const sameDeptLeader = leaders.find((l: User) => l.unit_kerja === user.unit_kerja);
          if (sameDeptLeader) {
            setPimpinanNip(sameDeptLeader.nip);
          } else if (leaders.length > 0) {
            setPimpinanNip(leaders[0].nip);
          }
        } else {
          setVerifikatorNip(editRequest.verifikatorNip || '');
          setPimpinanNip(editRequest.pimpinanNip || '');
        }
      } catch (err) {
        console.error("Error fetching officers:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    fetchUsers();
  }, [user, editRequest]);

  // Fetch and calculate remaining leave allowance
  useEffect(() => {
    async function fetchUserLeaves() {
      try {
        const leavesData = await getLeavesDirect(user.nip, 'pegawai');
        const approved = leavesData
          .filter(l => l.jenisCuti === 'tahunan' && l.status === 'disetujui')
          .reduce((sum, l) => sum + l.lamaHari, 0);
        setApprovedTahunan(approved);
        
        const jatah = user.jatah_cuti !== undefined ? user.jatah_cuti : 12;
        const sisa = Math.max(0, jatah - approved);
        setRemainingTahunan(sisa);
        setTotalJatah(jatah);
      } catch (err) {
        console.error("Error fetching user leaves in form:", err);
      }
    }
    fetchUserLeaves();
  }, [user]);

  // Automatically update selected verifikator and pimpinan based on approvalScope and lists
  useEffect(() => {
    if (allUsers.length === 0) return;

    const filteredVerif = allUsers.filter(u => {
      if (u.role !== 'verifikator') return false;
      if (approvalScope === 'internal') {
        return isSameUnit(u.unit_kerja, user.unit_kerja);
      }
      return true;
    });

    const filteredPimp = allUsers.filter(u => {
      if (u.role !== 'pimpinan') return false;
      if (approvalScope === 'internal') {
        return isSameUnit(u.unit_kerja, user.unit_kerja);
      }
      return true;
    });

    if (filteredVerif.length > 0) {
      const isValid = filteredVerif.some(v => v.nip === verifikatorNip);
      if (!isValid) {
        const sameUnit = filteredVerif.find(v => isSameUnit(v.unit_kerja, user.unit_kerja));
        setVerifikatorNip(sameUnit ? sameUnit.nip : filteredVerif[0].nip);
      }
    } else {
      setVerifikatorNip('');
    }

    if (filteredPimp.length > 0) {
      const isValid = filteredPimp.some(l => l.nip === pimpinanNip);
      if (!isValid) {
        const sameUnit = filteredPimp.find(l => isSameUnit(l.unit_kerja, user.unit_kerja));
        setPimpinanNip(sameUnit ? sameUnit.nip : filteredPimp[0].nip);
      }
    } else {
      setPimpinanNip('');
    }
  }, [approvalScope, allUsers, user.unit_kerja]);

  // Adjust catatanCuti fields based on selected jenisCuti as default guidance
  useEffect(() => {
    // If editing and the selected type matches the editRequest type, preserve the existing catatanCuti
    if (editRequest && jenisCuti === editRequest.jenisCuti && editRequest.catatanCuti) {
      setCatatanCuti(editRequest.catatanCuti);
      return;
    }
    // If they change leave type, set some demo/sensible default notes to help them
    const newCatatan = { ...catatanCuti };
    if (jenisCuti !== 'tahunan') {
      newCatatan.tahunan = { nMinus2: '-', nMinus1: '-', n: '-' };
    } else {
      newCatatan.tahunan = { nMinus2: '-', nMinus1: '-', n: remainingTahunan.toString() };
    }
    
    // Set active field based on selection
    newCatatan.besar = jenisCuti === 'besar' ? 'Tersedia' : '-';
    newCatatan.sakit = jenisCuti === 'sakit' ? 'Sakit Ringan/Sedang' : '-';
    newCatatan.melahirkan = jenisCuti === 'melahirkan' ? '3 Bulan' : '-';
    newCatatan.alasanPenting = jenisCuti === 'alasan_penting' ? 'Ada Keperluan Keluarga' : '-';
    newCatatan.luarTanggungan = jenisCuti === 'luar_tanggungan' ? 'Tersedia' : '-';

    setCatatanCuti(newCatatan);
  }, [jenisCuti, remainingTahunan, editRequest]);

          // Automatically calculate lamaHari from tanggalMulai and tanggalSelesai (excluding Saturdays and Sundays)
  useEffect(() => {
    if (tanggalMulai && tanggalSelesai) {
      const startParts = tanggalMulai.split('-').map(Number);
      const endParts = tanggalSelesai.split('-').map(Number);
      if (startParts.length === 3 && endParts.length === 3) {
        // Create dates in local timezone at midnight to avoid timezone/DST discrepancies
        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const endDate = new Date(endParts[0], endParts[1] - 1, endParts[2]);
        
        if (endDate >= startDate) {
          let workDaysCount = 0;
          const curDate = new Date(startDate.getTime());
          while (curDate <= endDate) {
            const dayOfWeek = curDate.getDay(); // 0 is Sunday, 6 is Saturday
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              workDaysCount++;
            }
            curDate.setDate(curDate.getDate() + 1);
          }

          setLamaHari(workDaysCount);
          
          if (jenisCuti === 'tahunan') {
            const updatedSisa = Math.max(0, remainingTahunan - workDaysCount);
            setCatatanCuti(prev => ({
                ...prev,
                tahunan: { ...prev.tahunan, n: updatedSisa.toString() }
            }));
          }
        } else {
          setLamaHari(0);
        }
      }
    }
  }, [tanggalMulai, tanggalSelesai, jenisCuti, remainingTahunan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user.signature) {
      setError("Anda belum mengatur Tanda Tangan Digital. Silakan atur tanda tangan Anda terlebih dahulu pada tombol profil di sudut kanan atas.");
      return;
    }

    const isVerifikator = user.role === 'verifikator';

    if (!alasan || !tanggalMulai || !tanggalSelesai || !alamatCuti || !telepon || (!isVerifikator && !verifikatorNip) || !pimpinanNip) {
      setError("Silakan isi semua kolom bertanda bintang (*).");
      return;
    }

    if (lamaHari <= 0) {
      setError("Jumlah hari cuti harus minimal 1 hari.");
      return;
    }

    setIsSubmitting(true);

    try {
      const activeVerif = isVerifikator ? null : allUsers.find(u => u.nip === verifikatorNip);
      const activePimp = allUsers.find(u => u.nip === pimpinanNip);

      const savedLeave: LeaveRequest = {
        id: editRequest ? editRequest.id : `cuti_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        nip: user.nip,
        nama: user.nama,
        jabatan: user.jabatan,
        unitKerja: user.unit_kerja,
        pangkatGol: user.pangkatGol || '-',
        jenisCuti,
        alasan,
        lamaHari,
        tanggalMulai,
        tanggalSelesai,
        alamatCuti,
        telepon,
        catatanCuti,
        status: isVerifikator ? 'menunggu_pimpinan' : 'menunggu_verifikasi',
        pemohonSignature: user.signature || '',
        
        verifikatorNip: isVerifikator ? '' : verifikatorNip,
        verifikatorNama: isVerifikator ? '' : (activeVerif?.nama || ''),
        verifikatorJabatan: isVerifikator ? '' : (activeVerif?.jabatan || ''),
        
        pimpinanNip,
        pimpinanNama: activePimp?.nama || '',
        pimpinanJabatan: activePimp?.jabatan || '',
        
        createdAt: editRequest ? editRequest.createdAt : new Date().toISOString()
      };

      await saveLeaveDirect(savedLeave);

      // Trigger notification for the appropriate recipient
      if (isVerifikator) {
        await triggerNotificationDirect(
          pimpinanNip,
          editRequest ? "Perbaikan Pengajuan Cuti (Verifikator)" : "Pengajuan Cuti Baru (Verifikator)",
          `${user.nama} mengajukan ${editRequest ? 'perbaikan ' : ''}cuti ${jenisCuti} selama ${lamaHari} hari dan membutuhkan persetujuan Anda.`
        );
      } else {
        await triggerNotificationDirect(
          verifikatorNip,
          editRequest ? "Perbaikan Pengajuan Cuti" : "Pengajuan Cuti Baru",
          `${user.nama} mengajukan ${editRequest ? 'perbaikan ' : ''}cuti ${jenisCuti} selama ${lamaHari} hari dan membutuhkan verifikasi Anda.`
        );
      }

      // Success
      onSuccess(savedLeave);
      
      // Reset form
      setAlasan('');
      setLamaHari(1);
      setTanggalMulai('');
      setTanggalSelesai('');
      setAlamatCuti('');
      setTelepon('');
    } catch (err: any) {
      setError(err.message || 'Koneksi ke server gagal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifiers = allUsers.filter(u => {
    if (u.role !== 'verifikator') return false;
    if (approvalScope === 'internal') {
      return isSameUnit(u.unit_kerja, user.unit_kerja);
    }
    return true;
  });

  const leaders = allUsers.filter(u => {
    if (u.role !== 'pimpinan') return false;
    if (approvalScope === 'internal') {
      return isSameUnit(u.unit_kerja, user.unit_kerja);
    }
    return true;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-100 flex-wrap gap-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-2xl ${editRequest ? 'bg-indigo-500/10 text-indigo-600' : 'bg-blue-500/10 text-blue-600'}`}>
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-slate-900">
              {editRequest ? 'Perbaikan Formulir Permintaan Cuti' : 'Formulir Permintaan & Pemberian Cuti'}
            </h3>
            <p className="text-xs text-slate-500">
              {editRequest 
                ? `Memperbaiki pengajuan cuti #${editRequest.id.split('_')[1] || editRequest.id} yang perlu perubahan` 
                : 'Isi formulir pengajuan cuti berjenjang sesuai format BASARNAS'}
            </p>
          </div>
        </div>
        {editRequest && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="px-4 py-2 text-xs font-bold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition-all"
          >
            Batal Perbaikan
          </button>
        )}
      </div>

      {!user.signature && (
        <div className="mb-6 p-5 bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl flex items-start space-x-3.5 shadow-sm shadow-rose-100/50">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-sm text-rose-900 mb-1">Tanda Tangan Digital Belum Diatur!</p>
            <p className="leading-relaxed text-rose-700 font-medium mb-2">
              Anda wajib mengunggah/menggambar tanda tangan digital Anda terlebih dahulu sebelum dapat mengisi dan mengajukan cuti. Hal ini diperlukan agar dokumen formulir cuti Anda sah secara resmi.
            </p>
            <p className="text-[11px] font-semibold text-rose-800">
              Silakan klik tombol profil di pojok kanan atas layar dan pilih "Atur Tanda Tangan" untuk memulai.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 text-slate-900">
        
        {/* I. DATA PEGAWAI */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">I</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">DATA PEGAWAI (Otomatis)</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Nama Pegawai</p>
              <p className="text-sm font-bold text-slate-800">{user.nama}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">NIP / Identitas</p>
              <p className="text-sm font-mono font-semibold text-slate-800">{user.nip}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Jabatan</p>
              <p className="text-sm font-medium text-slate-700">{user.jabatan}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Unit Kerja</p>
              <p className="text-sm font-medium text-slate-700">{user.unit_kerja}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Pangkat / Golongan</p>
              <p className="text-sm font-medium text-slate-700">{user.pangkatGol || 'Pengatur (II/c)'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase font-semibold text-slate-400">Eselon</p>
              <p className="text-sm font-medium text-slate-700">{user.eselon}</p>
            </div>
          </div>
        </div>

        {/* II. JENIS CUTI YANG DIAMBIL */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">II</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">JENIS CUTI YANG DIAMBIL *</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { id: 'tahunan', label: 'Cuti Tahunan' },
              { id: 'sakit', label: 'Cuti Sakit' },
              { id: 'alasan_penting', label: 'Cuti Karena Alasan Penting' },
              { id: 'besar', label: 'Cuti Besar' },
              { id: 'melahirkan', label: 'Cuti Melahirkan' },
              { id: 'luar_tanggungan', label: 'Cuti di Luar Tanggungan Negara' }
            ].map((type) => (
              <label
                key={type.id}
                className={`border rounded-2xl p-4 flex flex-col justify-between h-20 cursor-pointer transition-all ${
                  jenisCuti === type.id
                    ? 'border-blue-500 bg-blue-500/[0.04] ring-2 ring-blue-500/10'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-xs font-bold text-slate-800 leading-tight">{type.label}</span>
                <input
                  type="radio"
                  name="jenisCuti"
                  value={type.id}
                  checked={jenisCuti === type.id}
                  onChange={() => setJenisCuti(type.id as LeaveType)}
                  className="mt-2 text-blue-600 focus:ring-blue-500 border-slate-300 w-4 h-4"
                />
              </label>
            ))}
          </div>

          {jenisCuti === 'tahunan' && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-bold shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-900">Sisa Kuota Cuti Tahunan Anda</p>
                  <p className="text-[10px] text-blue-600 mt-0.5">
                    Jatah: <span className="font-semibold">{totalJatah} Hari</span> | Terpakai: <span className="font-semibold">{approvedTahunan} Hari</span>
                  </p>
                </div>
              </div>
              <div className="text-right self-stretch sm:self-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-100">
                <span className="text-[10px] sm:hidden text-blue-700 font-medium">Sisa Kuota:</span>
                <span className="text-sm font-extrabold text-blue-600 font-mono bg-white sm:bg-transparent px-3 py-1 sm:p-0 rounded-lg border sm:border-0 border-blue-200">{remainingTahunan} Hari</span>
              </div>
            </div>
          )}
        </div>

        {/* III. ALASAN CUTI */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">III</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">ALASAN CUTI *</h4>
          </div>
          <textarea
            required
            placeholder="Tuliskan alasan lengkap pengambilan cuti (misal: Liburan bareng keluarga, Menemani istri melahirkan, Kepentingan keluarga di kampung, dsb)"
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
          />
        </div>

        {/* IV. LAMANYA CUTI */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">IV</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">LAMANYA CUTI *</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Jumlah Hari Cuti * <span className="text-[10px] text-blue-600 font-medium">(Dihitung otomatis - Sabtu & Minggu tidak dihitung)</span>
              </label>
              <input
                type="number"
                required
                readOnly
                value={lamaHari}
                className="w-full px-4 py-3 bg-slate-100/80 border border-slate-200 rounded-2xl text-sm focus:outline-none text-slate-500 cursor-not-allowed font-medium font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal Mulai *</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={tanggalMulai}
                  onChange={(e) => setTanggalMulai(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tanggal Selesai *</label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={tanggalSelesai}
                  onChange={(e) => setTanggalSelesai(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>
          </div>

          {jenisCuti === 'tahunan' && lamaHari > remainingTahunan && (
            <div className="mt-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl flex items-start space-x-2.5 animate-in fade-in duration-200">
              <span className="text-base shrink-0 select-none">⚠️</span>
              <div>
                <span className="font-bold">Perhatian:</span> Jumlah hari cuti yang diajukan (<span className="font-semibold">{lamaHari} Hari</span>) melebihi sisa kuota Cuti Tahunan Anda (<span className="font-semibold">{remainingTahunan} Hari</span>). Pengajuan ini kemungkinan akan ditolak oleh verifikator atau pimpinan Anda.
              </div>
            </div>
          )}
        </div>

        {/* V. CATATAN CUTI */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">V</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">CATATAN CUTI (Sisa Kuota/Keterangan Cuti Saat Ini - Otomatis)</h4>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cuti Tahunan N-2 (Sisa)</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'tahunan'}
                  value={catatanCuti.tahunan.nMinus2}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    tahunan: { ...prev.tahunan, nMinus2: e.target.value }
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'tahunan'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cuti Tahunan N-1 (Sisa 2025)</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'tahunan'}
                  value={catatanCuti.tahunan.nMinus1}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    tahunan: { ...prev.tahunan, nMinus1: e.target.value }
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'tahunan'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cuti Tahunan N (Kuota Berjalan 2026)</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'tahunan'}
                  value={catatanCuti.tahunan.n}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    tahunan: { ...prev.tahunan, n: e.target.value }
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'tahunan'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-slate-200/50 pt-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Besar</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'besar'}
                  value={catatanCuti.besar}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    besar: e.target.value
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'besar'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Sakit</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'sakit'}
                  value={catatanCuti.sakit}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    sakit: e.target.value
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'sakit'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Melahirkan</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'melahirkan'}
                  value={catatanCuti.melahirkan}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    melahirkan: e.target.value
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'melahirkan'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Alasan Penting</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'alasan_penting'}
                  value={catatanCuti.alasanPenting}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    alasanPenting: e.target.value
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'alasan_penting'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Luar Tanggungan</label>
                <input
                  type="text"
                  readOnly={jenisCuti !== 'luar_tanggungan'}
                  value={catatanCuti.luarTanggungan}
                  onChange={(e) => setCatatanCuti(prev => ({
                    ...prev,
                    luarTanggungan: e.target.value
                  }))}
                  className={`w-full mt-1 px-3 py-1.5 rounded-xl text-xs focus:outline-none font-semibold transition-all ${
                    jenisCuti === 'luar_tanggungan'
                      ? 'bg-white border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800'
                      : 'bg-slate-100/60 border border-slate-200 text-slate-500 cursor-not-allowed font-medium'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* VI. ALAMAT SELAMA MENJALANKAN CUTI */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">VI</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">ALAMAT SELAMA MENJALANKAN CUTI & KONTAK *</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Alamat Lengkap Cuti *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Misal: Perum Griya Asri, Kabupaten Pemalang"
                  value={alamatCuti}
                  onChange={(e) => setAlamatCuti(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nomor Telepon Aktif *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="Misal: 0896-0393-3446"
                  value={telepon}
                  onChange={(e) => setTelepon(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* VII & VIII. ALUR PERSETUJUAN BERJENJANG */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">N</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">ALUR PERSETUJUAN BERJENJANG *</h4>
            </div>
            
            {/* Scope Switcher Segment */}
            <div className="flex bg-slate-100 border border-slate-200/80 p-0.5 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setApprovalScope('internal')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  approvalScope === 'internal'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Satu Unit Kerja ({user.unit_kerja})</span>
              </button>
              <button
                type="button"
                onClick={() => setApprovalScope('external')}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  approvalScope === 'external'
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200/20'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Lintas Unit Kerja</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-500/[0.02] border border-blue-500/10 p-5 rounded-2xl">
            {/* Direct Superior Select */}
            {user.role === 'verifikator' ? (
              <div className="bg-emerald-50 border border-emerald-150 p-5 rounded-2xl flex items-start space-x-3 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs font-semibold">
                  <p className="font-bold text-emerald-900 text-sm mb-1">Verifikator / Atasan Langsung Dilewati</p>
                  <p className="leading-relaxed text-emerald-700">
                    Sebagai Verifikator, pengajuan cuti Anda akan langsung diteruskan ke Pejabat Berwenang (Pimpinan) untuk persetujuan akhir tanpa melalui tahap verifikasi atasan langsung lagi.
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  1. Atasan Langsung (Verifikator) *
                </label>
                {isLoadingUsers ? (
                  <div className="flex items-center space-x-2 py-3 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Memuat daftar verifikator...</span>
                  </div>
                ) : verifiers.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl font-medium leading-relaxed">
                    Tidak ada Verifikator di unit kerja <span className="font-bold">{user.unit_kerja}</span>. Silakan gunakan tab <span className="font-bold">"Lintas Unit Kerja"</span> di atas.
                  </div>
                ) : (
                  <select
                    required
                    value={verifikatorNip}
                    onChange={(e) => setVerifikatorNip(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
                  >
                    <option value="">-- Pilih Atasan Langsung (Verifikator) --</option>
                    {verifiers.map((v) => (
                      <option key={v.nip} value={v.nip}>
                        {v.nama}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                  Atasan yang bertanggung jawab untuk memverifikasi kesesuaian administrasi, sisa cuti, dan kelayakan pengajuan sebelum diteruskan.
                </p>
              </div>
            )}

            {/* Authorizing Leader Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                2. Pejabat Berwenang (Pimpinan) *
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center space-x-2 py-3 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Memuat daftar pimpinan...</span>
                </div>
              ) : leaders.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] rounded-xl font-medium leading-relaxed">
                  Tidak ada Pimpinan di unit kerja <span className="font-bold">{user.unit_kerja}</span>. Silakan gunakan tab <span className="font-bold">"Lintas Unit Kerja"</span> di atas.
                </div>
              ) : (
                <select
                  required
                  value={pimpinanNip}
                  onChange={(e) => setPimpinanNip(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
                >
                  <option value="">-- Pilih Pejabat Berwenang (Pimpinan) --</option>
                  {leaders.map((l) => (
                    <option key={l.nip} value={l.nip}>
                      {l.nama}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Pimpinan Unit Kerja / Biro Kepegawaian yang memiliki wewenang hukum final untuk menyetujui, menolak, atau menangguhkan pemberian cuti.
              </p>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end items-center space-x-3 pt-4 border-t border-slate-100">
          {editRequest && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-3 text-sm font-semibold border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl transition-all"
            >
              Batal Perbaikan
            </button>
          )}
          <button
            id="submit-leave-btn"
            type="submit"
            disabled={isSubmitting || !user.signature}
            className={`px-6 py-3 text-sm font-semibold rounded-2xl shadow-lg transition-all flex items-center space-x-2 ${
              !user.signature
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/10 hover:shadow-xl'
            }`}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Mengirim...' : (editRequest ? 'Kirim Perbaikan Cuti' : 'Kirim Pengajuan Cuti')}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
