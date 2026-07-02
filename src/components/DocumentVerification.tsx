/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { LeaveRequest } from '../types';
import { ShieldCheck, ShieldAlert, Check, Landmark, Calendar, User, Phone, MapPin, FileText, ArrowRight } from 'lucide-react';
import { db } from '../lib/firebaseDb';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

interface DocumentVerificationProps {
  verifyId: string;
  onGoToLogin: () => void;
}

export default function DocumentVerification({ verifyId, onGoToLogin }: DocumentVerificationProps) {
  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyDoc() {
      try {
        // Coba ambil dokumen secara langsung dengan ID utuh
        const docRef = doc(db, 'leaves', verifyId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setLeave(snap.data() as LeaveRequest);
        } else {
          // Jika tidak ditemukan langsung (misalnya user hanya memasukkan 13 digit angka saja),
          // cari di seluruh data cuti yang memiliki kecocokan ID
          const querySnap = await getDocs(collection(db, 'leaves'));
          const foundDoc = querySnap.docs.find(d => {
            const dataId = d.id;
            // Cocokkan jika ID sama persis, atau jika ID dipisah dengan '_' mengandung angka verifyId
            return dataId === verifyId || 
                   dataId.includes(verifyId) || 
                   (dataId.split('_')[1] && dataId.split('_')[1] === verifyId);
          });

          if (foundDoc) {
            setLeave(foundDoc.data() as LeaveRequest);
          } else {
            throw new Error('Dokumen cuti tidak ditemukan atau kode verifikasi salah.');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Gagal memverifikasi dokumen.');
      } finally {
        setLoading(false);
      }
    }
    verifyDoc();
  }, [verifyId]);

  // Format dates in Indonesian style (e.g., 30 September 2025)
  const formatIndonesianDate = (dateString: string) => {
    if (!dateString) return '....';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      tahunan: 'Cuti Tahunan',
      besar: 'Cuti Besar',
      sakit: 'Cuti Sakit',
      melahirkan: 'Cuti Melahirkan',
      alasan_penting: 'Karena Alasan Penting',
      luar_tanggungan: 'Di Luar Tanggungan Negara'
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-600">Menghubungkan ke Server BASARNAS...</p>
          <p className="text-xs text-slate-400">Sedang memverifikasi tanda tangan digital berjenjang</p>
        </div>
      </div>
    );
  }

  if (error || !leave) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
        <div className="bg-white rounded-3xl border border-red-100 shadow-2xl p-8 max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center border border-red-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Verifikasi Gagal</h2>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider font-semibold">TANDA TANGAN TIDAK VALID</p>
            <p className="text-sm text-slate-600 mt-4 leading-relaxed bg-red-50/50 p-4 rounded-2xl border border-red-50">
              {error || 'Sistem tidak dapat menemukan rekod pengajuan cuti dengan ID berkas tersebut.'}
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col space-y-2">
            <button
              onClick={onGoToLogin}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition-all shadow-md flex items-center justify-center space-x-1.5"
            >
              <span>Kembali ke Portal Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isApproved = leave.status === 'disetujui';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8 font-sans">
      
      {/* Top Brand Bar */}
      <div className="max-w-3xl w-full mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 text-white font-black px-2.5 py-1 rounded-lg text-[10px] tracking-tight">
            BASARNAS
          </div>
          <div>
            <h1 className="text-xs font-bold text-slate-900">E-Verifikasi Cuti ASN</h1>
            <p className="text-[8px] text-slate-400 font-medium">Badan Nasional Pencarian dan Pertolongan</p>
          </div>
        </div>
        <button
          onClick={onGoToLogin}
          className="text-xs text-blue-600 hover:text-blue-700 font-bold bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm"
        >
          Masuk Portal
        </button>
      </div>

      {/* Main Verification Card */}
      <div className="max-w-3xl w-full mx-auto bg-white rounded-3xl border border-slate-200/80 shadow-2xl overflow-hidden">
        
        {/* Verification Status Banner */}
        <div className={`px-6 py-8 text-center text-white relative overflow-hidden ${
          isApproved 
            ? 'bg-gradient-to-r from-emerald-600 to-teal-700' 
            : 'bg-gradient-to-r from-amber-500 to-orange-600'
        }`}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:2rem_2rem] opacity-30"></div>
          <div className="relative z-10 flex flex-col items-center space-y-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 border-white/30 shadow-lg ${
              isApproved ? 'bg-emerald-500/30' : 'bg-amber-500/30'
            }`}>
              {isApproved ? <ShieldCheck className="w-8 h-8 text-white" /> : <ShieldAlert className="w-8 h-8 text-white" />}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {isApproved ? 'DOKUMEN ASLI & VALID' : 'DOKUMEN BELUM/TIDAK DISETUJUI'}
              </h2>
              <p className="text-xs text-white/80 font-mono mt-1 font-semibold uppercase tracking-widest">
                ID Berkas: {leave.id}
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* I. DATA PEGAWAI */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <User className="w-4 h-4 text-slate-500" />
              <span>I. Profil Pegawai Pengaju</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Nama Lengkap</p>
                <p className="font-bold text-slate-800">{leave.nama}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">NIP Pegawai</p>
                <p className="font-bold text-slate-800 font-mono">{leave.nip}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Pangkat / Golongan</p>
                <p className="font-bold text-slate-800">{leave.pangkatGol}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Unit Kerja</p>
                <p className="font-bold text-slate-800">{leave.unitKerja}</p>
              </div>
              <div colSpan={2} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 md:col-span-2">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Jabatan Struktural / Fungsional</p>
                <p className="font-bold text-slate-800">{leave.jabatan}</p>
              </div>
            </div>
          </div>

          {/* II. DETAIL CUTI */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>II. Detail Permohonan Cuti</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Jenis Cuti</p>
                <p className="font-bold text-slate-800">{getLeaveTypeLabel(leave.jenisCuti)}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Lamanya Cuti</p>
                <p className="font-bold text-slate-800">{leave.lamaHari} Hari Kerja</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Periode Pelaksanaan</p>
                <p className="font-bold text-slate-800 leading-tight">
                  {formatIndonesianDate(leave.tanggalMulai)} <span className="font-normal text-[10px] block text-slate-400">s.d</span> {formatIndonesianDate(leave.tanggalSelesai)}
                </p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 md:col-span-3">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Alasan Mengajukan Cuti</p>
                <p className="text-slate-700 italic font-medium">&ldquo;{leave.alasan}&rdquo;</p>
              </div>
            </div>
          </div>

          {/* III. ALAMAT & HUBUNGAN */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span>III. Alamat & Kontak Selama Cuti</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Alamat Menjalankan Cuti</p>
                <p className="font-bold text-slate-800 leading-relaxed">{leave.alamatCuti}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase">Nomor Telepon / HP</p>
                <p className="font-bold text-slate-800 font-mono flex items-center space-x-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{leave.telepon}</span>
                </p>
              </div>
            </div>
          </div>

          {/* IV. APPROVAL BERJENJANG DIGITAL */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-slate-100 pb-2">
              <Landmark className="w-4 h-4 text-slate-500" />
              <span>IV. Persetujuan Berjenjang Digital</span>
            </h3>
            <div className="space-y-4">
              
              {/* Atasan Langsung */}
              <div className="p-5 border border-slate-200/60 rounded-3xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                <div className="space-y-1.5">
                  <span className="bg-blue-100 text-blue-800 font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wide">
                    Verifikator Berkas (Atasan Langsung)
                  </span>
                  <p className="font-bold text-slate-800">{leave.verifikatorNama || 'CECEP SUPRIYANTO, S.H.'}</p>
                  <p className="text-[10px] text-slate-500">NIP: {leave.verifikatorNip || '198304192009121004'} &bull; {leave.verifikatorJabatan?.split(' (')[0] || 'Analis SDMA Ahli Madya'}</p>
                  
                  {leave.verifikatorStatus ? (
                    <div className="mt-2 text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      <span className="font-bold text-emerald-600">Keputusan: Telah Diverifikasi ({leave.verifikatorStatus})</span>
                      <p className="text-slate-400 mt-0.5">Catatan: {leave.verifikatorNotes || '-'}</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">Tanggal: {leave.verifikatorDate || '-'}</p>
                    </div>
                  ) : (
                    <p className="text-amber-600 font-bold italic text-[10px] mt-1">Status: Menunggu Tindakan Verifikator</p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-center justify-center p-2 bg-white rounded-2xl border border-slate-100 shadow-sm w-36 h-20">
                  {leave.verifikatorSignature ? (
                    <img src={leave.verifikatorSignature} alt="Signature" className="max-h-12 max-w-[120px] object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    leave.verifikatorStatus ? <span className="text-[10px] text-slate-300 italic">Signed Electronically</span> : <span className="text-[10px] text-slate-300 italic">[Belum TTD]</span>
                  )}
                </div>
              </div>

              {/* Pejabat yang Berwenang (Pimpinan) */}
              <div className="p-5 border border-slate-200/60 rounded-3xl bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                <div className="space-y-1.5">
                  <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-2 py-0.5 rounded uppercase tracking-wide">
                    Pejabat yang Berwenang (Pimpinan)
                  </span>
                  <p className="font-bold text-slate-800">{leave.pimpinanNama || 'Drs. MOCHAMAD HERNANTO M.M.'}</p>
                  <p className="text-[10px] text-slate-500">NIP: {leave.pimpinanNip || '196610071994031001'} &bull; {leave.pimpinanJabatan || 'Kepala Biro'}</p>
                  
                  {leave.pimpinanStatus ? (
                    <div className="mt-2 text-[10px] text-slate-600 bg-white p-2 rounded-xl border border-slate-100">
                      <span className={`font-bold ${leave.pimpinanStatus === 'disetujui' ? 'text-emerald-600' : 'text-red-600'}`}>
                        Keputusan Final: {leave.pimpinanStatus === 'disetujui' ? 'DISETUJUI (APPROVED)' : leave.pimpinanStatus.toUpperCase()}
                      </span>
                      <p className="text-slate-400 mt-0.5">Catatan: {leave.pimpinanNotes || '-'}</p>
                      <p className="text-slate-400 text-[9px] mt-0.5">Tanggal: {leave.pimpinanDate || '-'}</p>
                    </div>
                  ) : (
                    <p className="text-amber-600 font-bold italic text-[10px] mt-1">Status: Menunggu Keputusan Pimpinan</p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col items-center justify-center p-2 bg-white rounded-2xl border border-slate-100 shadow-sm w-36 h-20">
                  {leave.pimpinanSignature ? (
                    <img src={leave.pimpinanSignature} alt="Signature" className="max-h-12 max-w-[120px] object-contain" referrerPolicy="no-referrer" />
                  ) : (
                    leave.pimpinanStatus ? <span className="text-[10px] text-slate-300 italic">Signed Electronically</span> : <span className="text-[10px] text-slate-300 italic">[Belum TTD]</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Legal Footnote */}
          <div className="pt-6 border-t border-slate-100 text-center space-y-2">
            <div className="flex justify-center items-center space-x-1.5 text-[10px] text-slate-400 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="uppercase tracking-wider">DOKUMEN TERVERIFIKASI OLEH SISTEM KAMI</span>
            </div>
          </div>

        </div>
      </div>

      {/* Footer copyright */}
      <div className="max-w-3xl w-full mx-auto text-center mt-8 pb-12 text-[10px] text-slate-400 font-medium">
        &copy; {new Date().getFullYear()} Biro Kepegawaian, Organisasi, dan Tata Laksana. All rights reserved.
      </div>

    </div>
  );
}
