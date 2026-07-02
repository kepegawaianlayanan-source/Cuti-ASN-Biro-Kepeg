/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { LogIn, KeyRound, ShieldAlert, Users, Info, ShieldCheck } from 'lucide-react';
import { getUserDirect } from '../lib/firebaseDb';

interface LoginFormProps {
  onLoginSuccess: (user: User) => void;
  onVerifyCode?: (code: string) => void;
}

export default function LoginForm({ onLoginSuccess, onVerifyCode }: LoginFormProps) {
  const [nip, setNip] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<UserRole>('pegawai');

  const [showVerifySection, setShowVerifySection] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyInput.trim()) {
      setVerifyError('Harap masukkan ID Berkas.');
      return;
    }
    if (onVerifyCode) {
      onVerifyCode(verifyInput.trim());
    }
  };

  // Shortlisted users for quick-demo switching
  const demoUsers: { role: UserRole; nip: string; nama: string; jabatan: string; dept: string }[] = [
    { role: 'pegawai', nip: '199406052025061004', nama: 'Juni Trianto, A.Md.', jabatan: 'Pranata SDM Aparatur Terampil', dept: 'Biro Kepegawaian, Organisasi, dan Tata Laksana' },
    { role: 'pegawai', nip: '6666', nama: 'Budi Rescuer', jabatan: 'Rescuer Mahir', dept: 'Kantor SAR Jakarta' },
    { role: 'verifikator', nip: '198304192009121004', nama: 'Cecep Supriyanto S.H.', jabatan: 'Analis SDM Aparatur Ahli Madya', dept: 'Biro Kepegawaian, Organisasi, dan Tata Laksana' },
    { role: 'verifikator', nip: '5555', nama: 'Rian Hermawan, S.Kom.', jabatan: 'Kasubag Umum & Kepegawaian', dept: 'Kantor SAR Jakarta' },
    { role: 'pimpinan', nip: '196610071994031001', nama: 'Drs. MOCHAMAD HERNANTO M.M.', jabatan: 'Kepala Biro Kepegawaian, Organisasi, dan Tata Laksana', dept: 'Biro Kepegawaian, Organisasi, dan Tata Laksana' },
    { role: 'pimpinan', nip: '1111', nama: 'Marsekal Madya Kusworo, S.E.', jabatan: 'Kepala Basarnas', dept: 'Pusat - Kepala Basarnas' },
    { role: 'admin', nip: '7777', nama: 'Pranata Komputer Admin', jabatan: 'Admin Sistem Kepegawaian Utama', dept: 'Biro Kepegawaian, Organisasi, dan Tata Laksana' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip || !password) {
      setError('NIP dan password harus diisi.');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const user = await getUserDirect(nip.trim());
      if (!user) {
        throw new Error('Pegawai dengan NIP tersebut tidak ditemukan.');
      }
      if (user.password !== password) {
        throw new Error('Kata sandi salah.');
      }

      // Return authenticated user metadata safely
      const { password: _, ...safeUser } = user;
      onLoginSuccess(safeUser as User);
    } catch (err: any) {
      setError(err.message || 'Koneksi ke database gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoNip: string) => {
    setNip(demoNip);
    setPassword('basarnas123'); // seed password is identical for all accounts
    
    setIsLoading(true);
    setError(null);

    try {
      const user = await getUserDirect(demoNip);
      if (!user) {
        throw new Error('Pegawai demo tidak ditemukan.');
      }
      if (user.password !== 'basarnas123') {
        throw new Error('Sandi pegawai demo telah diubah.');
      }

      const { password: _, ...safeUser } = user;
      onLoginSuccess(safeUser as User);
    } catch (err: any) {
      setError(err.message || 'Koneksi ke database gagal.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-container" className="flex flex-col lg:flex-row min-h-screen bg-slate-50">
      {/* Visual Left Banner */}
      <div className="flex flex-col justify-between lg:w-1/2 bg-slate-900 p-8 lg:p-16 text-white bg-radial from-slate-800 to-slate-950 border-r border-slate-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
        
        <div className="relative z-10 flex items-center space-x-3">
          <div className="bg-blue-600 text-white p-2.5 rounded-xl font-bold tracking-tight text-xl shadow-lg shadow-blue-600/20">
            BASARNAS
          </div>
          <div>
            <h1 className="font-display font-bold text-lg tracking-tight leading-none text-white">Sistem Cuti Berjenjang</h1>
            <p className="text-xs text-slate-400">Badan Nasional Pencarian dan Pertolongan</p>
          </div>
        </div>

        <div className="relative z-10 my-12 lg:my-auto">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full">
            Aplikasi Internal Kepegawaian
          </span>
          <h2 className="text-3xl lg:text-5xl font-display font-bold tracking-tight text-white mt-4 leading-tight">
            Kemudahan Pengajuan <br />
            <span className="text-blue-400">& Persetujuan Cuti</span> ASN
          </h2>
          <p className="text-slate-300 mt-4 text-sm max-w-md leading-relaxed">
            Sistem pengajuan cuti digital dengan alur verifikasi langsung ke atasan (atasan langsung) hingga persetujuan final oleh kepala unit atau pimpinan lembaga, lengkap dengan laporan otomatis dan cetak PDF formulir resmi.
          </p>
        </div>

        <div className="relative z-10 text-xs text-slate-500 border-t border-slate-800 pt-6 flex justify-between items-center">
          <span>&copy; {new Date().getFullYear()} Biro Kepegawaian, Organisasi, dan Tata Laksana. All rights reserved.</span>
          <span className="text-slate-400 font-mono">v1.1.0</span>
        </div>
      </div>

      {/* Authentication and Quick Demo Form Right Column */}
      <div className="flex flex-col justify-center items-center lg:w-1/2 p-6 lg:p-16">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100 p-8">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Selamat Datang</h2>
            <p className="text-sm text-slate-500 mt-1">Silakan masuk dengan NIP dan Password Anda</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl flex items-start space-x-2 animate-pulse">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="nip" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Nomor Induk Pegawai (NIP)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  id="nip"
                  type="text"
                  required
                  placeholder="Masukkan NIP Anda"
                  value={nip}
                  onChange={(e) => setNip(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 text-slate-900"
                />
              </div>
              <div className="text-right mt-1.5">
                <p className="text-xs text-slate-400 italic">Kata sandi standar seluruh pegawai: <span className="font-mono text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded">basarnas123</span></p>
              </div>
            </div>

            <button
              id="login-btn"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-2xl shadow-lg shadow-slate-900/10 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-slate-900/20 disabled:opacity-50 text-sm flex items-center justify-center space-x-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Memproses...' : 'Masuk ke Sistem'}</span>
            </button>
          </form>

          {/* Public Verification Menu Toggle */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center">
            {!showVerifySection ? (
              <button
                type="button"
                onClick={() => setShowVerifySection(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 border border-blue-100 px-4 py-2.5 rounded-2xl transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>E-Verifikasi Keabsahan Berkas Cuti</span>
              </button>
            ) : (
              <form onSubmit={handleVerifySubmit} className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl p-4 text-left space-y-3 relative overflow-hidden animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">Cek Berkas Cuti</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowVerifySection(false);
                      setVerifyInput('');
                      setVerifyError(null);
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
                  >
                    Tutup
                  </button>
                </div>
                
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Masukkan 13 digit <strong>ID Berkas</strong> (dari QR Code atau riwayat cuti) untuk memverifikasi keaslian dokumen cuti ASN.
                </p>

                <div className="flex space-x-2">
                  <input
                    type="text"
                    maxLength={20}
                    placeholder="Contoh: 1782960614065"
                    value={verifyInput}
                    onChange={(e) => {
                      setVerifyInput(e.target.value.replace(/\D/g, ''));
                      setVerifyError(null);
                    }}
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all"
                  >
                    Periksa
                  </button>
                </div>
                {verifyError && (
                  <p className="text-[10px] font-semibold text-red-600 animate-pulse">{verifyError}</p>
                )}
              </form>
            )}
          </div>

          {/* DEMO ACCOUNTS QUICK SWITCHER SECTION */}
          <div className="mt-8 border-t border-slate-100 pt-6">
            <div className="flex items-center space-x-2 mb-4 text-slate-700">
              <Info className="w-4.5 h-4.5 text-blue-500 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider">Demo Quick Login (Klik untuk Masuk)</span>
            </div>

            {/* Tabs for Roles in Demo */}
            <div className="flex border-b border-slate-100 mb-3 bg-slate-50 p-1 rounded-xl">
              {(['pegawai', 'verifikator', 'pimpinan', 'admin'] as UserRole[]).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveTab(role)}
                  className={`flex-1 py-1.5 text-xs font-semibold capitalize rounded-lg transition-all ${
                    activeTab === role
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>

            {/* List of demo users filtered by active tab */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {demoUsers
                .filter((du) => du.role === activeTab)
                .map((du) => (
                  <button
                    key={du.nip}
                    type="button"
                    onClick={() => handleDemoLogin(du.nip)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 hover:bg-blue-50/20 transition-all flex justify-between items-center group"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-slate-800 group-hover:text-slate-950 truncate">{du.nama}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 truncate">{du.jabatan}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">NIP: {du.nip} &bull; {du.dept.split(' - ')[1] || du.dept}</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg shrink-0 group-hover:bg-blue-100/50 transition-all">
                      Masuk &rarr;
                    </span>
                  </button>
                ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
