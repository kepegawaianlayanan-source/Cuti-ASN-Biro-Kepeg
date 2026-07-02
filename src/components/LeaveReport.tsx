/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LeaveRequest } from '../types';
import { Printer, X, Download, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';

interface LeaveReportProps {
  leave: LeaveRequest;
  onClose: () => void;
}

export default function LeaveReport({ leave, onClose }: LeaveReportProps) {
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

  // Helper to compare unit_kerja and pimpinanJabatan flexibly
  const isSameUnit = (unitA: string, unitB: string): boolean => {
    if (!unitA || !unitB) return false;
    
    // Normalize and split into significant words (ignoring small words)
    const getWords = (s: string) => s.toLowerCase().replace(/[,.-]/g, '').split(/\s+/).filter(w => w.length > 3);
    
    const wordsA = getWords(unitA);
    const wordsB = getWords(unitB);
    
    // Check if they share at least one significant word (like 'Operasi', 'Kepegawaian')
    return wordsA.some(word => wordsB.includes(word));
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (leave?.id) {
      // Use just the document ID (ID Berkas) as QR Code content
      QRCode.toDataURL(leave.id, {
        margin: 1,
        width: 150,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
      .then(url => {
        setQrCodeUrl(url);
      })
      .catch(err => {
        console.error('Gagal membuat QR Code verifikasi:', err);
      });
    }
  }, [leave?.id]);

  const isPemohonTtdKosong = !leave.pemohonSignature;
  const isVerifikatorTtdKosong = !!(leave.verifikatorStatus && !leave.verifikatorSignature);
  const isPimpinanTtdKosong = !!(leave.pimpinanStatus && !leave.pimpinanSignature);

  const hasEmptySignature = isPemohonTtdKosong || isVerifikatorTtdKosong || isPimpinanTtdKosong;

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    window.print();
  };

  const handleDownloadPDF = async (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById('printable-content');
    if (!element) return;
    
    setIsDownloading(true);
    
    try {
      // Small timeout to let UI settle
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get exact dimensions of the printable content
      const width = element.offsetWidth || 794;
      const height = element.offsetHeight || 1123;
      
      const dataUrl = await toPng(element, {
        width: width,
        height: height,
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
          boxShadow: 'none',
          border: 'none',
          margin: '0',
        }
      });
      
      const pdf = new jsPDF('p', 'mm', [215, 330]);
      const pdfWidth = 215;
      const pdfHeight = 330;
      
      // Add image scaled exactly to fit the F4 page boundaries (215mm x 330mm)
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Formulir_Cuti_${leave.nama.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Gagal mengunduh PDF:', error);
      alert('Gagal mengunduh PDF. Silakan coba klik tombol "Cetak Formulir (F4)" lalu pilih opsi "Simpan sebagai PDF" di browser Anda.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Helper to check and mark chosen leave type
  const isSelectedCuti = (type: string) => {
    return leave.jenisCuti === type ? '√' : '';
  };

  // Helper to mark approval boxes
  const isVerifikatorStatus = (status: string) => {
    return leave.verifikatorStatus === status ? '√' : '';
  };

  const displayUnit = leave.unitKerja.includes("Biro Kepegawaian") ? "Biro Kepegawaian, Organisasi, dan Tata Laksana" : (leave.unitKerja.startsWith("Pusat - ") ? leave.unitKerja.substring(8) : leave.unitKerja);

  const isPimpinanStatus = (status: string) => {
    return leave.pimpinanStatus === status ? '√' : '';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-start overflow-y-auto p-4 lg:p-8 no-print">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden my-4">
        
        {/* Modal Controls Bar */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-100 no-print">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-xs font-semibold text-slate-500">Pratinjau Formulir Resmi Cuti (A4)</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className={`px-4 py-2 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 ${
                isDownloading 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10 hover:shadow-lg'
              }`}
            >
              {isDownloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh PDF</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Formulir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Alert Banner if Signature is Empty */}
        {hasEmptySignature && (
          <div className="mx-6 mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start space-x-3 no-print">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800">
              <p className="font-bold mb-1">Perhatian: Tanda Tangan Belum Lengkap!</p>
              <p className="mb-2 text-rose-700">Formulir ini belum sah karena dokumen belum ditandatangani:</p>
              <ul className="list-disc pl-4 space-y-1 font-semibold text-rose-800">
                {isPemohonTtdKosong && (
                  <li>Tanda tangan Pemohon ({leave.nama}) masih kosong</li>
                )}
                {isVerifikatorTtdKosong && (
                  <li>Tanda tangan Atasan Langsung / Verifikator ({leave.verifikatorNama || 'Verifikator'}) masih kosong</li>
                )}
                {isPimpinanTtdKosong && (
                  <li>Tanda tangan Pimpinan / Kepala Biro ({leave.pimpinanNama || 'Pimpinan'}) masih kosong</li>
                )}
              </ul>
              <p className="mt-2.5 text-[11px] text-rose-600 font-normal">Silakan lengkapi tanda tangan digital terlebih dahulu sebelum mengunduh atau mencetak dokumen agar dokumen dinyatakan sah secara hukum.</p>
            </div>
          </div>
        )}

        {/* Outer Scroll Area inside Modal for Preview */}
        <div className="p-6 md:p-12 overflow-x-auto bg-slate-100/50 flex justify-center no-print">
          <div id="printable-content" className="bg-white p-8 border border-slate-300 shadow-lg print-container relative" style={{ width: '215mm', minHeight: '330mm', color: '#000000', fontFamily: 'sans-serif' }}>
            
            {/* QR Code Verification Badge (Top Right) */}
            {qrCodeUrl && (
              <div className="absolute top-8 right-8 flex flex-col items-center border border-black p-1 bg-white text-center rounded-md" style={{ width: '72px' }}>
                <img src={qrCodeUrl} alt="E-Verify QR Code" className="w-[62px] h-[62px]" />
                <span className="text-[6px] font-bold text-slate-800 tracking-wider mt-0.5">E-VERIFIKASI</span>
                <span className="text-[5px] text-slate-500 font-mono">DOKUMEN ASLI</span>
              </div>
            )}

            {/* REAL PRINT VIEW INJECTED HERE */}
            <div className="text-black text-xs leading-normal">
              

              {/* To Section */}
              <div className="mb-6 text-xs text-left max-w-lg">
                <p>
                  Yth. {leave.pimpinanJabatan?.split('(')[0]} 
                  {isSameUnit(leave.unitKerja, leave.pimpinanJabatan || '')
                    ? ` melalui ${leave.verifikatorJabatan?.split(' (')[0] || 'Analis SDMA Ahli Madya'}` 
                    : ''
                  }
                </p>
                <p>Di Tempat</p>
              </div>

              {/* Title Header */}
              <div className="text-center mb-6">
                <h3 className="font-bold text-sm tracking-wide border-b-2 border-black inline-block pb-0.5 uppercase">
                  FORMULIR PERMINTAAN DAN PEMBERIAN CUTI
                </h3>
              </div>

              {/* I. DATA PEGAWAI */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th colSpan={4} className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">I. DATA PEGAWAI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5 font-bold w-1/6">Nama</td>
                    <td className="border border-black px-2 py-1.5 w-2/6">{leave.nama}</td>
                    <td className="border border-black px-2 py-1.5 font-bold w-1/6">NIP</td>
                    <td className="border border-black px-2 py-1.5 w-2/6 font-mono">{leave.nip}</td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5 font-bold">Jabatan</td>
                    <td className="border border-black px-2 py-1.5 text-[11px]">{leave.jabatan}</td>
                    <td className="border border-black px-2 py-1.5 font-bold">Pangkat/Gol</td>
                    <td className="border border-black px-2 py-1.5">{leave.pangkatGol}</td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5 font-bold">Unit Kerja</td>
                    <td colSpan={3} className="border border-black px-2 py-1.5">{displayUnit}</td>
                  </tr>
                </tbody>
              </table>

              {/* II. JENIS CUTI YANG DIAMBIL */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th colSpan={4} className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">II. JENIS CUTI YANG DIAMBIL **</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5 w-[45%]">1. Cuti Tahunan</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold w-[5%]">{isSelectedCuti('tahunan')}</td>
                    <td className="border border-black px-2 py-1.5 w-[45%]">4. Cuti Besar</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold w-[5%]">{isSelectedCuti('besar')}</td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5">2. Cuti Sakit</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold">{isSelectedCuti('sakit')}</td>
                    <td className="border border-black px-2 py-1.5">5. Cuti Melahirkan</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold">{isSelectedCuti('melahirkan')}</td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5">3. Cuti Karena Alasan Penting</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold">{isSelectedCuti('alasan_penting')}</td>
                    <td className="border border-black px-2 py-1.5">6. Cuti di Luar Tanggungan Negara</td>
                    <td className="border border-black px-2 py-1.5 text-center font-bold">{isSelectedCuti('luar_tanggungan')}</td>
                  </tr>
                </tbody>
              </table>

              {/* III. ALASAN CUTI */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">III. ALASAN CUTI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black px-2 py-3 text-slate-800 italic">
                      {leave.alasan}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* IV. LAMANYA CUTI */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th colSpan={4} className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">IV. LAMANYA CUTI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5 font-bold w-1/4">Lamanya Cuti</td>
                    <td className="border border-black px-2 py-1.5 w-1/4">{leave.lamaHari} hari</td>
                    <td className="border border-black px-2 py-1.5 font-bold w-1/4">Mulai Tanggal</td>
                    <td className="border border-black px-2 py-1.5 w-1/4">
                      {formatIndonesianDate(leave.tanggalMulai)} s.d {formatIndonesianDate(leave.tanggalSelesai)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* V. CATATAN CUTI */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th colSpan={5} className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">V. CATATAN CUTI ***</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-black bg-slate-50 font-bold">
                    <td colSpan={3} className="border border-black px-2 py-1 text-center w-1/2">1. CUTI TAHUNAN</td>
                    <td colSpan={2} className="border border-black px-2 py-1 w-1/2">2. CUTI BESAR: <span className="font-normal">{leave.catatanCuti.besar}</span></td>
                  </tr>
                  <tr className="border border-black text-center">
                    <td className="border border-black px-2 py-1 w-1/6 font-semibold">Tahun</td>
                    <td className="border border-black px-2 py-1 w-1/6 font-semibold">Sisa</td>
                    <td className="border border-black px-2 py-1 w-1/6 font-semibold">Keterangan</td>
                    <td colSpan={2} className="border border-black px-2 py-1 text-left w-1/2 font-bold">3. CUTI SAKIT: <span className="font-normal">{leave.catatanCuti.sakit}</span></td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1 text-center">N-2</td>
                    <td className="border border-black px-2 py-1 text-center">{leave.catatanCuti.tahunan.nMinus2}</td>
                    <td className="border border-black px-2 py-1 text-center">-</td>
                    <td colSpan={2} className="border border-black px-2 py-1 font-bold">4. CUTI MELAHIRKAN: <span className="font-normal">{leave.catatanCuti.melahirkan}</span></td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1 text-center">N-1 (2025)</td>
                    <td className="border border-black px-2 py-1 text-center">{leave.catatanCuti.tahunan.nMinus1}</td>
                    <td className="border border-black px-2 py-1 text-center">-</td>
                    <td colSpan={2} className="border border-black px-2 py-1 font-bold">5. CUTI KARENA ALASAN PENTING: <span className="font-normal">{leave.catatanCuti.alasanPenting}</span></td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1 text-center font-bold">N (2026)</td>
                    <td className="border border-black px-2 py-1 text-center font-bold">{leave.catatanCuti.tahunan.n}</td>
                    <td className="border border-black px-2 py-1 text-center">-</td>
                    <td colSpan={2} className="border border-black px-2 py-1 font-bold">6. CUTI DI LUAR TANGGUNGAN NEGARA: <span className="font-normal">{leave.catatanCuti.luarTanggungan}</span></td>
                  </tr>
                </tbody>
              </table>

              {/* VI. ALAMAT SELAMA MENJALANKAN CUTI */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th colSpan={2} className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">VI. ALAMAT SELAMA MENJALANKAN CUTI</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black px-3 py-3 w-1/2 align-top">
                      <p className="font-semibold mb-1">Alamat Cuti:</p>
                      <p className="text-slate-800">{leave.alamatCuti}</p>
                      
                      <p className="font-semibold mt-4 mb-1">Telepon/HP:</p>
                      <p className="text-slate-800 font-mono">{leave.telepon}</p>
                    </td>
                    <td className="border border-black px-4 py-3 w-1/2 text-center align-top relative">
                      <p className="mb-1 text-[10px]">Hormat Saya,</p>
                      <div className="h-16 flex items-center justify-center mb-1">
                        {leave.pemohonSignature ? (
                          <img 
                            src={leave.pemohonSignature} 
                            alt="Tanda Tangan Pemohon" 
                            className="max-h-16 max-w-[140px] object-contain" 
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="text-slate-300 italic text-[8px] border border-dashed border-slate-200 px-2 py-1 rounded">[Belum Ditandatangani]</div>
                        )}
                      </div>
                      <p className="font-bold underline uppercase text-[10px]">{leave.nama}</p>
                      <p className="font-mono text-[9px]">NIP. {leave.nip}</p>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* VII. PERTIMBANGAN ATASAN LANGSUNG */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th colSpan={5} className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">VII. PERTIMBANGAN ATASAN LANGSUNG **</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-1/12">DISETUJUI</td>
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-1/12">PERUBAHAN</td>
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-1/12">DITANGGUHKAN</td>
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-[15%]">TIDAK DISETUJUI</td>
                    <td className="border border-black px-4 py-2 text-center align-top w-[55%] relative">
                      <p className="text-xs mb-1 font-bold text-slate-500 uppercase tracking-wide">{leave.verifikatorJabatan?.split(' (')[0] || 'Analis SDMA Ahli Madya'}</p>
                      
                      {/* Approved details */}
                      {leave.verifikatorStatus ? (
                        <div className="my-1 p-1 bg-slate-50 border border-black/10 rounded text-left">
                          <p className="text-[9px] font-bold">Keputusan: <span className="capitalize">{leave.verifikatorStatus}</span></p>
                          <p className="text-[8px] truncate">Catatan: {leave.verifikatorNotes || '-'}</p>
                        </div>
                      ) : (
                        <div className="my-3 text-slate-400 italic text-[9px]">[Belum Diverifikasi]</div>
                      )}

                      <div className="h-12 flex items-center justify-center my-1">
                        {leave.verifikatorSignature ? (
                          <img 
                            src={leave.verifikatorSignature} 
                            alt="Tanda Tangan Verifikator" 
                            className="max-h-12 max-w-[140px] object-contain" 
                            referrerPolicy="no-referrer"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          leave.verifikatorStatus && <div className="text-slate-300 italic text-[8px]">[Telah Diverifikasi]</div>
                        )}
                      </div>
 
                      <p className="font-bold underline mt-0.5">{leave.verifikatorNama || 'CECEP SUPRIYANTO, S.H.'}</p>
                      <p className="font-mono text-[9px]">NIP. {leave.verifikatorNip || '198304192009121004'}</p>
                    </td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isVerifikatorStatus('disetujui')}</td>
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isVerifikatorStatus('perubahan')}</td>
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isVerifikatorStatus('ditangguhkan')}</td>
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isVerifikatorStatus('ditolak')}</td>
                    <td className="border border-black px-2 py-1 text-[9px] italic text-slate-400">
                      * Status terakhir: {leave.verifikatorDate ? `Verifikasi pada ${leave.verifikatorDate}` : 'Menunggu tindakan'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* VIII. PERTIMBANGAN PEJABAT YANG BERWENANG */}
              <table className="w-full border-collapse border border-black mb-4 text-left">
                <thead>
                  <tr>
                    <th colSpan={5} className="border border-black bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase">VIII. PERTIMBANGAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI **</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-black">
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-1/12">DISETUJUI</td>
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-1/12">PERUBAHAN</td>
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-1/12">DITANGGUHKAN</td>
                    <td className="border border-black px-2 py-1.5 text-center font-semibold text-[10px] w-[15%]">TIDAK DISETUJUI</td>
                    <td className="border border-black px-4 py-2 text-center align-top w-[55%] relative">
                      <p className="text-xs mb-1 font-bold text-slate-500 uppercase tracking-wide">{leave.pimpinanJabatan || 'Kepala Biro'}</p>
                      
                      {/* Approved details */}
                      {leave.pimpinanStatus ? (
                        <div className="my-1 p-1 bg-slate-50 border border-black/10 rounded text-left">
                          <p className="text-[9px] font-bold">Keputusan Final: <span className="capitalize">{leave.pimpinanStatus}</span></p>
                          <p className="text-[8px] truncate">Catatan: {leave.pimpinanNotes || '-'}</p>
                        </div>
                      ) : (
                        <div className="my-3 text-slate-400 italic text-[9px]">[Belum Ditandatangani]</div>
                      )}

                      <div className="h-12 flex items-center justify-center my-1">
                        {leave.pimpinanSignature ? (
                          <img 
                            src={leave.pimpinanSignature} 
                            alt="Tanda Tangan Pimpinan" 
                            className="max-h-12 max-w-[140px] object-contain" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          leave.pimpinanStatus && <div className="text-slate-300 italic text-[8px]">[Telah Disetujui]</div>
                        )}
                      </div>
 
                      <p className="font-bold underline mt-0.5">{leave.pimpinanNama || 'Drs. MOCHAMAD HERNANTO M.M.'}</p>
                      <p className="font-mono text-[9px]">NIP. {leave.pimpinanNip || '196610071994031001'}</p>
                    </td>
                  </tr>
                  <tr className="border border-black">
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isPimpinanStatus('disetujui')}</td>
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isPimpinanStatus('perubahan')}</td>
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isPimpinanStatus('ditangguhkan')}</td>
                    <td className="border border-black text-center font-bold px-1 py-2 text-sm">{isPimpinanStatus('ditolak')}</td>
                    <td className="border border-black px-2 py-1 text-[9px] italic text-slate-400">
                      * Status terakhir: {leave.pimpinanDate ? `Keputusan pada ${leave.pimpinanDate}` : 'Menunggu verifikasi atasan'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Footnote notes matching official copy exactly */}
              <div className="text-[9px] text-slate-500 leading-tight space-y-0.5 mt-4">
                <p>Catatan:</p>
                <p>* Coret yang tidak diperlukan | ** Pilih salah satu dengan memberikan tanda centang (√)</p>
                <p>*** Diisi oleh pejabat yang menangani bidang kepegawaian sebelum PNS mengajukan cuti</p>
                <p>**** Diberikan tanda centang dan alasannya | N = Cuti tahun berjalan</p>
              </div>

            </div>

          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-t border-slate-100 no-print">
          <div className="text-[10px] text-slate-400">
            Formulir digenerate otomatis berbasis data digital berjenjang &bull; BASARNAS
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
          >
            Tutup Pratinjau
          </button>
        </div>

      </div>

      {/* REAL PRINT-ONLY INJECTED SECTION */}
      {/* This section will ONLY show when printing because of our src/index.css media print query! */}
      <div id="printable-content" className="hidden print:block bg-white p-6 w-full text-black relative" style={{ fontFamily: 'sans-serif' }}>
        
        {/* QR Code Verification Badge (Top Right for Print Mode) */}
        {qrCodeUrl && (
          <div className="absolute top-6 right-6 flex flex-col items-center border border-black p-1 bg-white text-center rounded-md" style={{ width: '72px' }}>
            <img src={qrCodeUrl} alt="E-Verify QR Code" className="w-[62px] h-[62px]" />
            <span className="text-[6px] font-bold text-slate-800 tracking-wider mt-0.5">E-VERIFIKASI</span>
            <span className="text-[5px] text-slate-500 font-mono">DOKUMEN ASLI</span>
          </div>
        )}

        <div className="text-black text-[11px] leading-normal">
          

          {/* To Section */}
          <div className="mb-6 text-[11px] text-left max-w-lg">
            <p>
              Yth. {leave.pimpinanJabatan?.split('(')[0]} 
              {isSameUnit(leave.unitKerja, leave.pimpinanJabatan || '')
                ? ` melalui ${leave.verifikatorJabatan?.split(' (')[0] || 'Analis SDMA Ahli Madya'}` 
                : ''
              }
            </p>
            <p>Di Tempat</p>
          </div>

          {/* Title Header */}
          <div className="text-center mb-6">
            <h3 className="font-bold text-xs tracking-wide border-b-2 border-black inline-block pb-0.5 uppercase">
              FORMULIR PERMINTAAN DAN PEMBERIAN CUTI
            </h3>
          </div>

          {/* I. DATA PEGAWAI */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th colSpan={4} className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">I. DATA PEGAWAI</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-black">
                <td className="border border-black px-2 py-1 font-bold w-1/6">Nama</td>
                <td className="border border-black px-2 py-1 w-2/6">{leave.nama}</td>
                <td className="border border-black px-2 py-1 font-bold w-1/6">NIP</td>
                <td className="border border-black px-2 py-1 w-2/6 font-mono">{leave.nip}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-2 py-1 font-bold">Jabatan</td>
                <td className="border border-black px-2 py-1">{leave.jabatan}</td>
                <td className="border border-black px-2 py-1 font-bold">Pangkat/Gol</td>
                <td className="border border-black px-2 py-1">{leave.pangkatGol}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-2 py-1 font-bold">Unit Kerja</td>
                <td colSpan={3} className="border border-black px-2 py-1">{displayUnit}</td>
              </tr>
            </tbody>
          </table>

          {/* II. JENIS CUTI YANG DIAMBIL */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th colSpan={4} className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">II. JENIS CUTI YANG DIAMBIL **</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-black">
                <td className="border border-black px-2 py-1 w-[45%]">1. Cuti Tahunan</td>
                <td className="border border-black px-2 py-1 text-center font-bold w-[5%]">{isSelectedCuti('tahunan')}</td>
                <td className="border border-black px-2 py-1 w-[45%]">4. Cuti Besar</td>
                <td className="border border-black px-2 py-1 text-center font-bold w-[5%]">{isSelectedCuti('besar')}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-2 py-1">2. Cuti Sakit</td>
                <td className="border border-black px-2 py-1 text-center font-bold">{isSelectedCuti('sakit')}</td>
                <td className="border border-black px-2 py-1">5. Cuti Melahirkan</td>
                <td className="border border-black px-2 py-1 text-center font-bold">{isSelectedCuti('melahirkan')}</td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-2 py-1">3. Cuti Karena Alasan Penting</td>
                <td className="border border-black px-2 py-1 text-center font-bold">{isSelectedCuti('alasan_penting')}</td>
                <td className="border border-black px-2 py-1">6. Cuti di Luar Tanggungan Negara</td>
                <td className="border border-black px-2 py-1 text-center font-bold">{isSelectedCuti('luar_tanggungan')}</td>
              </tr>
            </tbody>
          </table>

          {/* III. ALASAN CUTI */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">III. ALASAN CUTI</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black px-2 py-2 italic">
                  {leave.alasan}
                </td>
              </tr>
            </tbody>
          </table>

          {/* IV. LAMANYA CUTI */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th colSpan={4} className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">IV. LAMANYA CUTI</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-black">
                <td className="border border-black px-2 py-1 font-bold w-1/4">Lamanya Cuti</td>
                <td className="border border-black px-2 py-1 w-1/4">{leave.lamaHari} hari</td>
                <td className="border border-black px-2 py-1 font-bold w-1/4">Mulai Tanggal</td>
                <td className="border border-black px-2 py-1 w-1/4">
                  {formatIndonesianDate(leave.tanggalMulai)} s.d {formatIndonesianDate(leave.tanggalSelesai)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* V. CATATAN CUTI */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th colSpan={5} className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">V. CATATAN CUTI ***</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-black font-bold">
                <td colSpan={3} className="border border-black px-2 py-0.5 text-center w-1/2">1. CUTI TAHUNAN</td>
                <td colSpan={2} className="border border-black px-2 py-0.5 w-1/2">2. CUTI BESAR: <span className="font-normal">{leave.catatanCuti.besar}</span></td>
              </tr>
              <tr className="border border-black text-center">
                <td className="border border-black px-2 py-0.5 w-1/6 font-semibold">Tahun</td>
                <td className="border border-black px-2 py-0.5 w-1/6 font-semibold">Sisa</td>
                <td className="border border-black px-2 py-0.5 w-1/6 font-semibold">Keterangan</td>
                <td colSpan={2} className="border border-black px-2 py-0.5 text-left w-1/2 font-bold">3. CUTI SAKIT: <span className="font-normal">{leave.catatanCuti.sakit}</span></td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-2 py-0.5 text-center">N-2</td>
                <td className="border border-black px-2 py-0.5 text-center">{leave.catatanCuti.tahunan.nMinus2}</td>
                <td className="border border-black px-2 py-0.5 text-center">-</td>
                <td colSpan={2} className="border border-black px-2 py-0.5 font-bold">4. CUTI MELAHIRKAN: <span className="font-normal">{leave.catatanCuti.melahirkan}</span></td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-2 py-0.5 text-center">N-1 (2025)</td>
                <td className="border border-black px-2 py-0.5 text-center">{leave.catatanCuti.tahunan.nMinus1}</td>
                <td className="border border-black px-2 py-0.5 text-center">-</td>
                <td colSpan={2} className="border border-black px-2 py-0.5 font-bold">5. CUTI KARENA ALASAN PENTING: <span className="font-normal">{leave.catatanCuti.alasanPenting}</span></td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black px-2 py-0.5 text-center font-bold">N (2026)</td>
                <td className="border border-black px-2 py-0.5 text-center font-bold">{leave.catatanCuti.tahunan.n}</td>
                <td className="border border-black px-2 py-0.5 text-center">-</td>
                <td colSpan={2} className="border border-black px-2 py-0.5 font-bold">6. CUTI DI LUAR TANGGUNGAN NEGARA: <span className="font-normal">{leave.catatanCuti.luarTanggungan}</span></td>
              </tr>
            </tbody>
          </table>

          {/* VI. ALAMAT SELAMA MENJALANKAN CUTI */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th colSpan={2} className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">VI. ALAMAT SELAMA MENJALANKAN CUTI</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-black">
                <td className="border border-black px-3 py-2 w-1/2 align-top">
                  <p className="font-semibold mb-0.5">Alamat Cuti:</p>
                  <p>{leave.alamatCuti}</p>
                  
                  <p className="font-semibold mt-2 mb-0.5">Telepon/HP:</p>
                  <p className="font-mono">{leave.telepon}</p>
                </td>
                <td className="border border-black px-4 py-2 w-1/2 text-center align-top relative">
                  <p className="mb-1 text-[10px]">Hormat Saya,</p>
                  <div className="h-16 flex items-center justify-center mb-1">
                    {leave.pemohonSignature ? (
                      <img 
                        src={leave.pemohonSignature} 
                        alt="Tanda Tangan Pemohon" 
                        className="max-h-16 max-w-[140px] object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-slate-300 italic text-[8px] border border-dashed border-slate-200 px-2 py-1 rounded">[Belum Ditandatangani]</div>
                    )}
                  </div>
                  <p className="font-bold underline uppercase text-[10px]">{leave.nama}</p>
                  <p className="font-mono text-[9px]">NIP. {leave.nip}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* VII. PERTIMBANGAN ATASAN LANGSUNG */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th colSpan={5} className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">VII. PERTIMBANGAN ATASAN LANGSUNG **</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-black">
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-1/12">DISETUJUI</td>
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-1/12">PERUBAHAN</td>
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-1/12">DITANGGUHKAN</td>
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-[15%]">TIDAK DISETUJUI</td>
                <td className="border border-black px-4 py-1.5 text-center align-top w-[55%] relative">
                  <p className="text-[10px] mb-0.5 font-bold uppercase">{leave.verifikatorJabatan?.split(' (')[0] || 'Analis SDMA Ahli Madya'}</p>
                  
                  {leave.verifikatorStatus ? (
                    <div className="my-1 p-1 bg-slate-50 border border-black/10 rounded text-left">
                      <p className="text-[9px] font-bold">Keputusan: <span className="capitalize">{leave.verifikatorStatus}</span></p>
                      <p className="text-[8px] truncate">Catatan: {leave.verifikatorNotes || '-'}</p>
                    </div>
                  ) : (
                    <div className="my-3 text-slate-400 italic text-[9px]">[Belum Diverifikasi]</div>
                  )}

                  <div className="h-12 flex items-center justify-center my-1">
                    {leave.verifikatorSignature ? (
                      <img 
                        src={leave.verifikatorSignature} 
                        alt="Tanda Tangan Verifikator" 
                        className="max-h-12 max-w-[140px] object-contain" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      leave.verifikatorStatus && <div className="text-slate-300 italic text-[8px]">[Telah Diverifikasi]</div>
                    )}
                  </div>

                  <p className="font-bold underline mt-0.5">{leave.verifikatorNama || 'CECEP SUPRIYANTO, S.H.'}</p>
                  <p className="font-mono text-[9px]">NIP. {leave.verifikatorNip || '198304192009121004'}</p>
                </td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isVerifikatorStatus('disetujui')}</td>
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isVerifikatorStatus('perubahan')}</td>
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isVerifikatorStatus('ditangguhkan')}</td>
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isVerifikatorStatus('ditolak')}</td>
                <td className="border border-black px-2 py-0.5 text-[8px] italic text-slate-400">
                  {leave.verifikatorDate ? `Verifikasi: ${leave.verifikatorDate}` : 'Menunggu tindakan'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* VIII. PERTIMBANGAN PEJABAT YANG BERWENANG */}
          <table className="w-full border-collapse border border-black mb-3 text-left">
            <thead>
              <tr>
                <th colSpan={5} className="border border-black bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase">VIII. PERTIMBANGAN PEJABAT YANG BERWENANG MEMBERIKAN CUTI **</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-black">
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-1/12">DISETUJUI</td>
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-1/12">PERUBAHAN</td>
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-1/12">DITANGGUHKAN</td>
                <td className="border border-black px-1 py-1 text-center font-semibold text-[9px] w-[15%]">TIDAK DISETUJUI</td>
                <td className="border border-black px-4 py-1.5 text-center align-top w-[55%] relative">
                  <p className="text-[10px] mb-0.5 font-bold uppercase">{leave.pimpinanJabatan || 'Kepala Biro'}</p>
                  
                  {leave.pimpinanStatus ? (
                    <div className="my-1 p-1 bg-slate-50 border border-black/10 rounded text-left">
                      <p className="text-[9px] font-bold">Keputusan Final: <span className="capitalize">{leave.pimpinanStatus}</span></p>
                      <p className="text-[8px] truncate">Catatan: {leave.pimpinanNotes || '-'}</p>
                    </div>
                  ) : (
                    <div className="my-3 text-slate-400 italic text-[9px]">[Belum Ditandatangani]</div>
                  )}

                  <div className="h-12 flex items-center justify-center my-1">
                    {leave.pimpinanSignature ? (
                      <img 
                        src={leave.pimpinanSignature} 
                        alt="Tanda Tangan Pimpinan" 
                        className="max-h-12 max-w-[140px] object-contain" 
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      leave.pimpinanStatus && <div className="text-slate-300 italic text-[8px]">[Telah Disetujui]</div>
                    )}
                  </div>

                  <p className="font-bold underline mt-0.5">{leave.pimpinanNama || 'Drs. MOCHAMAD HERNANTO M.M.'}</p>
                  <p className="font-mono text-[9px]">NIP. {leave.pimpinanNip || '196610071994031001'}</p>
                </td>
              </tr>
              <tr className="border border-black">
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isPimpinanStatus('disetujui')}</td>
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isPimpinanStatus('perubahan')}</td>
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isPimpinanStatus('ditangguhkan')}</td>
                <td className="border border-black text-center font-bold px-1 py-1 text-xs">{isPimpinanStatus('ditolak')}</td>
                <td className="border border-black px-2 py-0.5 text-[8px] italic text-slate-400">
                  {leave.pimpinanDate ? `Keputusan: ${leave.pimpinanDate}` : 'Menunggu verifikasi'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footnote notes */}
          <div className="text-[8px] text-slate-500 leading-tight space-y-0.5 mt-2">
            <p>Catatan:</p>
            <p>* Coret yang tidak diperlukan | ** Pilih salah satu dengan memberikan tanda centang (√)</p>
            <p>*** Diisi oleh pejabat yang menangani bidang kepegawaian sebelum PNS mengajukan cuti</p>
            <p>**** Diberikan tanda centang dan alasannya | N = Cuti tahun berjalan</p>
          </div>

        </div>
      </div>

    </div>
  );
}
