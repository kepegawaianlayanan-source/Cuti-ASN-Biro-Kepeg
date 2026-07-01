/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'pegawai' | 'verifikator' | 'pimpinan' | 'admin';

export interface UnitKerja {
  id: string;
  nama: string;
  kategori: 'Kantor Pusat' | 'KPP Kelas A' | 'KPP Kelas B';
}

export interface User {
  nip: string;
  nama: string;
  role: UserRole;
  unit_kerja: string;
  jabatan: string;
  eselon: string;
  password?: string;
  pangkatGol?: string; // added to match official leave PDF requirements
  signature?: string;  // base64 data URL signature
  jatah_cuti?: number; // annual leave quota
  nMinus1?: string;    // sisa cuti N-1
  nMinus2?: string;    // sisa cuti N-2
}

export type LeaveType = 'tahunan' | 'besar' | 'sakit' | 'melahirkan' | 'alasan_penting' | 'luar_tanggungan';

export type LeaveStatus = 
  | 'menunggu_verifikasi' 
  | 'menunggu_pimpinan' 
  | 'disetujui' 
  | 'ditolak' 
  | 'ditangguhkan' 
  | 'perubahan';

export interface CatatanCuti {
  tahunan: {
    nMinus2: string; // sisa cuti N-2
    nMinus1: string; // sisa cuti N-1 (2024)
    n: string;       // sisa cuti N (2025)
  };
  besar: string;
  sakit: string;
  melahirkan: string;
  alasanPenting: string;
  luarTanggungan: string;
}

export interface LeaveRequest {
  id: string;
  nip: string;
  nama: string;
  jabatan: string;
  unitKerja: string;
  pangkatGol: string;
  jenisCuti: LeaveType;
  alasan: string;
  lamaHari: number;
  tanggalMulai: string;
  tanggalSelesai: string;
  alamatCuti: string;
  telepon: string;
  
  // Catatan cuti
  catatanCuti: CatatanCuti;
  
  // Status of the approval pipeline
  status: LeaveStatus;
  
  // Verifikator (Atasan Langsung) stage
  verifikatorNip?: string;
  verifikatorNama?: string;
  verifikatorJabatan?: string;
  verifikatorStatus?: 'disetujui' | 'perubahan' | 'ditangguhkan' | 'ditolak';
  verifikatorNotes?: string;
  verifikatorDate?: string;
  
  // Pimpinan (Pejabat Berwenang) stage
  pimpinanNip?: string;
  pimpinanNama?: string;
  pimpinanJabatan?: string;
  pimpinanStatus?: 'disetujui' | 'perubahan' | 'ditangguhkan' | 'ditolak';
  pimpinanNotes?: string;
  pimpinanDate?: string;
  
  // Signatures
  pemohonSignature?: string;
  verifikatorSignature?: string;
  pimpinanSignature?: string;
  
  createdAt: string;
}

export interface Notification {
  id: string;
  nip: string; // target user NIP
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalSubmitted: number;
  totalPendingVerifikasi: number;
  totalPendingPimpinan: number;
  totalDisetujui: number;
  totalDitolak: number;
}
