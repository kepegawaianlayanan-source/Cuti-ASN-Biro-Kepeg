import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Check, Users, AlertCircle, Key, ShieldCheck } from 'lucide-react';
import { User, UserRole, UnitKerja } from '../types';
import { 
  getUsersDirect, 
  getUnitsDirect, 
  getUserDirect, 
  saveUserDirect, 
  deleteUserDirect 
} from '../lib/firebaseDb';

interface UserManagementProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  onUsersChange?: () => void;
}

export default function UserManagement({ showToast, onUsersChange }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<UnitKerja[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedRoleFilter, selectedUnitFilter]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form Fields
  const [nip, setNip] = useState('');
  const [nama, setNama] = useState('');
  const [role, setRole] = useState<UserRole>('pegawai');
  const [unitKerja, setUnitKerja] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [pangkatGol, setPangkatGol] = useState('');
  const [eselon, setEselon] = useState('Non-Eselon');
  const [password, setPassword] = useState('basarnas123');
  const [formError, setFormError] = useState<string | null>(null);

  // Custom Delete confirm modal states
  const [deleteTarget, setDeleteTarget] = useState<{ nip: string, nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsersAndUnits = async () => {
    setIsLoading(true);
    try {
      const [usersData, unitsData] = await Promise.all([
        getUsersDirect(),
        getUnitsDirect()
      ]);

      setUsers(usersData);
      setUnits(unitsData);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndUnits();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedUser(null);
    setNip('');
    setNama('');
    setRole('pegawai');
    setUnitKerja(units.length > 0 ? units[0].nama : '');
    setJabatan('');
    setPangkatGol('');
    setEselon('Non-Eselon');
    setPassword('basarnas123');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setNip(user.nip);
    setNama(user.nama);
    setRole(user.role);
    setUnitKerja(user.unit_kerja);
    setJabatan(user.jabatan);
    setPangkatGol(user.pangkatGol || '');
    setEselon(user.eselon || 'Non-Eselon');
    setPassword(''); // keep blank to not change password unless typed
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nip.trim() || !nama.trim() || !unitKerja || !jabatan.trim()) {
      setFormError('Kolom NIP, Nama, Unit Kerja, dan Jabatan wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      let finalUser: User;
      
      if (modalMode === 'add') {
        const existing = await getUserDirect(nip.trim());
        if (existing) {
          throw new Error('Pegawai dengan NIP tersebut sudah terdaftar.');
        }
        finalUser = {
          nip: nip.trim(),
          nama: nama.trim(),
          role,
          unit_kerja: unitKerja,
          jabatan: jabatan.trim(),
          pangkatGol: pangkatGol.trim(),
          eselon,
          password: password.trim() || 'basarnas123'
        };
      } else {
        const existing = await getUserDirect(selectedUser?.nip || '');
        if (!existing) {
          throw new Error('Pegawai tidak ditemukan.');
        }
        finalUser = {
          ...existing,
          nip: nip.trim(),
          nama: nama.trim(),
          role,
          unit_kerja: unitKerja,
          jabatan: jabatan.trim(),
          pangkatGol: pangkatGol.trim(),
          eselon,
        };
        if (password.trim()) {
          finalUser.password = password.trim();
        }
      }

      await saveUserDirect(finalUser);

      showToast('Data pegawai berhasil disimpan.', 'success');
      setIsModalOpen(false);
      fetchUsersAndUnits();
      if (onUsersChange) onUsersChange();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (userNip: string, userNama: string) => {
    if (userNip === '7777') {
      showToast('NIP Admin Sistem utama tidak dapat dihapus demi keamanan.', 'error');
      return;
    }
    setDeleteTarget({ nip: userNip, nama: userNama });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteUserDirect(deleteTarget.nip);

      showToast('Pegawai berhasil dihapus.', 'success');
      setDeleteTarget(null);
      fetchUsersAndUnits();
      if (onUsersChange) onUsersChange();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const normalizeUnitName = (name: string): string => {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/^pusat\s*-\s*/, '')
      .trim();
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = 
      u.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.nip.includes(searchQuery) ||
      u.jabatan.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.unit_kerja.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchUnit = selectedUnitFilter === 'all' || normalizeUnitName(u.unit_kerja) === normalizeUnitName(selectedUnitFilter);
    
    return matchSearch && matchRole && matchUnit;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-md uppercase">Admin</span>;
      case 'pimpinan':
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-md uppercase">Pimpinan</span>;
      case 'verifikator':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md uppercase">Verifikator</span>;
      default:
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md uppercase">Pegawai</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Manajemen User Pegawai</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Daftar akun pegawai, pangkat/golongan, unit kerja, dan level otorisasi</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pegawai Baru</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari berdasarkan NIP, nama, jabatan, atau unit kerja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={selectedUnitFilter}
            onChange={(e) => setSelectedUnitFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-700"
          >
            <option value="all">Semua Unit Kerja</option>
            {units.map((u) => (
              <option key={u.id} value={u.nama}>{u.nama}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-48">
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-700"
          >
            <option value="all">Semua Level / Role</option>
            <option value="pegawai">Role: Pegawai</option>
            <option value="verifikator">Role: Verifikator</option>
            <option value="pimpinan">Role: Pimpinan</option>
            <option value="admin">Role: Admin</option>
          </select>
        </div>
      </div>

      {/* Users table list */}
      {isLoading && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium">Memuat data pegawai...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <p className="text-xs text-slate-500 italic">Tidak ada pegawai yang sesuai dengan filter pencarian.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="px-4 py-3.5 text-center">NIP</th>
                <th className="px-4 py-3.5">Nama Pegawai</th>
                <th className="px-4 py-3.5">Golongan & Jabatan</th>
                <th className="px-4 py-3.5">Unit Kerja</th>
                <th className="px-4 py-3.5 text-center">Role</th>
                <th className="px-4 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentUsers.map((u) => (
                <tr key={u.nip} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-mono font-bold text-slate-600">{u.nip}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{u.nama}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Eselon: {u.eselon || 'Non-Eselon'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{u.jabatan}</p>
                    {u.pangkatGol && (
                      <p className="text-[10px] font-mono text-blue-600 font-semibold bg-blue-50 inline-block px-1.5 py-0.5 rounded-md mt-0.5">{u.pangkatGol}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{u.unit_kerja}</td>
                  <td className="px-4 py-3 text-center">{getRoleBadge(u.role)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                        title="Edit Pegawai"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(u.nip, u.nama)}
                        className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
                        title="Hapus Pegawai"
                        disabled={u.nip === '7777'}
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
        {filteredUsers.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-xs text-slate-500">
                Menampilkan <span className="font-semibold text-slate-800">{filteredUsers.length === 0 ? 0 : indexOfFirstItem + 1}</span> - <span className="font-semibold text-slate-800">{Math.min(indexOfLastItem, filteredUsers.length)}</span> dari <span className="font-semibold text-slate-800">{filteredUsers.length}</span> data pegawai
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

      {/* Save / Edit user modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">
                {modalMode === 'add' ? 'Tambah Pegawai Baru' : 'Edit Biodata Pegawai'}
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* NIP */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nomor Induk Pegawai (NIP)</label>
                    <input
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="Contoh: 199406052025061004"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-slate-800 font-mono"
                      disabled={modalMode === 'edit' || isLoading}
                    />
                  </div>

                  {/* Nama */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Lengkap & Gelar</label>
                    <input
                      type="text"
                      value={nama}
                      onChange={(e) => setNama(e.target.value)}
                      placeholder="Contoh: Juni Trianto, A.Md."
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-slate-800 font-semibold"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Role */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Role Otorisasi</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-medium"
                      disabled={isLoading}
                    >
                      <option value="pegawai">Pegawai</option>
                      <option value="verifikator">Verifikator</option>
                      <option value="pimpinan">Pimpinan</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {/* Unit Kerja */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unit Kerja</label>
                    <select
                      value={unitKerja}
                      onChange={(e) => setUnitKerja(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-medium"
                      disabled={isLoading}
                    >
                      <option value="" disabled>-- Pilih Unit Kerja --</option>
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.nama}>
                          {unit.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Jabatan */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jabatan</label>
                    <input
                      type="text"
                      value={jabatan}
                      onChange={(e) => setJabatan(e.target.value)}
                      placeholder="Contoh: Pranata SDM Aparatur Terampil"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-slate-800"
                      disabled={isLoading}
                    />
                  </div>

                  {/* Pangkat / Golongan */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pangkat & Golongan</label>
                    <input
                      type="text"
                      value={pangkatGol}
                      onChange={(e) => setPangkatGol(e.target.value)}
                      placeholder="Contoh: Pengatur (II/c) atau Pembina (IV/a)"
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-slate-800"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Eselon */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Eselon (Opsional)</label>
                    <select
                      value={eselon}
                      onChange={(e) => setEselon(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800"
                      disabled={isLoading}
                    >
                      <option value="Non-Eselon">Non-Eselon</option>
                      <option value="Eselon 1">Eselon 1</option>
                      <option value="Eselon 2">Eselon 2</option>
                      <option value="Eselon 3">Eselon 3</option>
                      <option value="Eselon 4">Eselon 4</option>
                    </select>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {modalMode === 'add' ? 'Password Akun' : 'Ganti Password (Biarkan kosong jika tidak diubah)'}
                    </label>
                    <input
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={modalMode === 'add' ? 'Default: basarnas123' : 'Ketik password baru jika ingin mengubah'}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-slate-800 font-mono"
                      disabled={isLoading}
                    />
                  </div>
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
                      <span>Simpan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950">
            <div className="px-6 py-5 flex items-start space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-2xl shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="font-bold text-slate-900 text-sm">Hapus Pegawai dari Sistem?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus pegawai <span className="font-bold text-slate-800">"{deleteTarget.nama}"</span> (NIP: {deleteTarget.nip})?
                </p>
                <p className="text-[11px] text-red-600 bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 leading-relaxed font-medium">
                  <strong>Perhatian:</strong> Semua data pengajuan dan riwayat cuti pegawai ini mungkin tidak dapat terverifikasi dengan benar setelah akun dihapus.
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
