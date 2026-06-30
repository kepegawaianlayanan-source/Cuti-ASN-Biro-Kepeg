/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, LeaveType, CatatanCuti, LeaveRequest } from '../types';
import { FileText, Send, Calendar, MapPin, Phone, HelpCircle, Loader2, RefreshCw } from 'lucide-react';
import { getUsersDirect, saveLeaveDirect, triggerNotificationDirect } from '../lib/firebaseDb';

interface LeaveFormProps {
  user: User;
  onSuccess: (newLeave?: any) => void;
}

export default function LeaveForm({ user, onSuccess }: LeaveFormProps) {
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

  // Catatan Cuti (Balances)
  const [catatanCuti, setCatatanCuti] = useState<CatatanCuti>({
    tahunan: { nMinus2: '-', nMinus1: '-', n: '12' },
    besar: '-',
    sakit: '-',
    melahirkan: '-',
    alasanPenting: '-',
    luarTanggungan: '-'
  });

  // Fetch verifiers and leaders to populate select menus
  useEffect(() => {
    async function fetchUsers() {
      setIsLoadingUsers(true);
      try {
        const data = await getUsersDirect();
        setAllUsers(data);
        
        // Set sensible defaults
        const verifiers = data.filter((u: User) => u.role === 'verifikator');
        const leaders = data.filter((u: User) => u.role === 'pimpinan');
        
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
      } catch (err) {
        console.error("Error fetching officers:", err);
      } finally {
        setIsLoadingUsers(false);
      }
    }
    fetchUsers();
  }, [user]);

  // Adjust catatanCuti fields based on selected jenisCuti as default guidance
  useEffect(() => {
    // If they change leave type, set some demo/sensible default notes to help them
    const newCatatan = { ...catatanCuti };
    if (jenisCuti !== 'tahunan') {
      newCatatan.tahunan = { nMinus2: '-', nMinus1: '-', n: '-' };
    } else {
      newCatatan.tahunan = { nMinus2: '-', nMinus1: '-', n: '12' };
    }
    
    // Set active field based on selection
    newCatatan.besar = jenisCuti === 'besar' ? 'Tersedia' : '-';
    newCatatan.sakit = jenisCuti === 'sakit' ? 'Sakit Ringan/Sedang' : '-';
    newCatatan.melahirkan = jenisCuti === 'melahirkan' ? '3 Bulan' : '-';
    newCatatan.alasanPenting = jenisCuti === 'alasan_penting' ? 'Ada Keperluan Keluarga' : '-';
    newCatatan.luarTanggungan = jenisCuti === 'luar_tanggungan' ? 'Tersedia' : '-';

    setCatatanCuti(newCatatan);
  }, [jenisCuti]);

  // Automatically calculate lamaHari from tanggalMulai and tanggalSelesai
  useEffect(() => {
    if (tanggalMulai && tanggalSelesai) {
      const startParts = tanggalMulai.split('-').map(Number);
      const endParts = tanggalSelesai.split('-').map(Number);
      if (startParts.length === 3 && endParts.length === 3) {
        // Create dates in local timezone at midnight to avoid timezone/DST discrepancies
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!alasan || !tanggalMulai || !tanggalSelesai || !alamatCuti || !telepon || !verifikatorNip || !pimpinanNip) {
      setError("Silakan isi semua kolom bertanda bintang (*).");
      return;
    }

    if (lamaHari <= 0) {
      setError("Jumlah hari cuti harus minimal 1 hari.");
      return;
    }

    setIsSubmitting(true);

    try {
      const activeVerif = allUsers.find(u => u.nip === verifikatorNip);
      const activePimp = allUsers.find(u => u.nip === pimpinanNip);

      const newLeave: LeaveRequest = {
        id: `cuti_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
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
        status: 'menunggu_verifikasi',
        pemohonSignature: user.signature || '',
        
        verifikatorNip,
        verifikatorNama: activeVerif?.nama || '',
        verifikatorJabatan: activeVerif?.jabatan || '',
        
        pimpinanNip,
        pimpinanNama: activePimp?.nama || '',
        pimpinanJabatan: activePimp?.jabatan || '',
        
        createdAt: new Date().toISOString()
      };

      await saveLeaveDirect(newLeave);

      // Trigger notification for verifikator
      await triggerNotificationDirect(
        verifikatorNip,
        "Pengajuan Cuti Baru",
        `${user.nama} mengajukan cuti ${jenisCuti} selama ${lamaHari} hari dan membutuhkan verifikasi Anda.`
      );

      // Success
      onSuccess(newLeave);
      
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

  const verifiers = allUsers.filter(u => u.role === 'verifikator');
  const leaders = allUsers.filter(u => u.role === 'pimpinan');

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6 pb-6 border-b border-slate-100">
        <div className="p-3 bg-blue-500/10 text-blue-600 rounded-2xl">
          <FileText className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-slate-900">Formulir Permintaan & Pemberian Cuti</h3>
          <p className="text-xs text-slate-500">Isi formulir pengajuan cuti berjenjang sesuai format BASARNAS</p>
        </div>
      </div>

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
                Jumlah Hari Cuti * <span className="text-[10px] text-blue-600 font-medium">(Dihitung otomatis)</span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={lamaHari}
                onChange={(e) => setLamaHari(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
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
        </div>

        {/* V. CATATAN CUTI */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">V</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">CATATAN CUTI (Sisa Kuota/Keterangan Cuti Saat Ini)</h4>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cuti Tahunan N-2 (Sisa)</label>
                <input
                  type="text"
                  value={catatanCuti.tahunan.nMinus2}
                  onChange={(e) => setCatatanCuti({
                    ...catatanCuti,
                    tahunan: { ...catatanCuti.tahunan, nMinus2: e.target.value }
                  })}
                  placeholder="-"
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cuti Tahunan N-1 (Sisa 2024)</label>
                <input
                  type="text"
                  value={catatanCuti.tahunan.nMinus1}
                  onChange={(e) => setCatatanCuti({
                    ...catatanCuti,
                    tahunan: { ...catatanCuti.tahunan, nMinus1: e.target.value }
                  })}
                  placeholder="-"
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Cuti Tahunan N (Kuota Berjalan 2025)</label>
                <input
                  type="text"
                  value={catatanCuti.tahunan.n}
                  onChange={(e) => setCatatanCuti({
                    ...catatanCuti,
                    tahunan: { ...catatanCuti.tahunan, n: e.target.value }
                  })}
                  placeholder="12"
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t border-slate-200/50 pt-3">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Besar</label>
                <input
                  type="text"
                  value={catatanCuti.besar}
                  onChange={(e) => setCatatanCuti({ ...catatanCuti, besar: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Sakit</label>
                <input
                  type="text"
                  value={catatanCuti.sakit}
                  onChange={(e) => setCatatanCuti({ ...catatanCuti, sakit: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Melahirkan</label>
                <input
                  type="text"
                  value={catatanCuti.melahirkan}
                  onChange={(e) => setCatatanCuti({ ...catatanCuti, melahirkan: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Cuti Alasan Penting</label>
                <input
                  type="text"
                  value={catatanCuti.alasanPenting}
                  onChange={(e) => setCatatanCuti({ ...catatanCuti, alasanPenting: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase">Luar Tanggungan</label>
                <input
                  type="text"
                  value={catatanCuti.luarTanggungan}
                  onChange={(e) => setCatatanCuti({ ...catatanCuti, luarTanggungan: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-800"
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
          <div className="flex items-center space-x-2 mb-4">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">N</span>
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600">ALUR PERSETUJUAN BERJENJANG *</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-blue-500/[0.02] border border-blue-500/10 p-5 rounded-2xl">
            {/* Direct Superior Select */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                1. Atasan Langsung (Verifikator) *
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center space-x-2 py-3 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Memuat daftar verifikator...</span>
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
                      {v.nama} - {v.jabatan.split(' (E')[0]} ({v.nip})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                Atasan yang bertanggung jawab untuk memverifikasi kesesuaian administrasi, sisa cuti, dan kelayakan pengajuan sebelum diteruskan.
              </p>
            </div>

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
                      {l.nama} - {l.jabatan} ({l.nip})
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
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            id="submit-leave-btn"
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-2xl shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>{isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan Cuti'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
