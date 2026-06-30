import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, X, Check, Landmark, AlertCircle, Trash } from 'lucide-react';
import { UnitKerja } from '../types';
import { 
  getUnitsDirect, 
  saveUnitDirect, 
  deleteUnitDirect 
} from '../lib/firebaseDb';

interface UnitKerjaManagementProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  onUnitsChange?: () => void;
}

type UnitKategori = 'Kantor Pusat' | 'KPP Kelas A' | 'KPP Kelas B';

export default function UnitKerjaManagement({ showToast, onUnitsChange }: UnitKerjaManagementProps) {
  const [units, setUnits] = useState<UnitKerja[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategoryFilter]);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [selectedUnit, setSelectedUnit] = useState<UnitKerja | null>(null);
  const [inputNama, setInputNama] = useState('');
  const [inputKategori, setInputKategori] = useState<UnitKategori>('Kantor Pusat');
  const [formError, setFormError] = useState<string | null>(null);

  // Custom Delete Confirm modal state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string, nama: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const data = await getUnitsDirect();
      setUnits(data);
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat unit kerja', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnits();
  }, []);

  const handleOpenAdd = () => {
    setModalMode('add');
    setSelectedUnit(null);
    setInputNama('');
    setInputKategori('Kantor Pusat');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (unit: UnitKerja) => {
    setModalMode('edit');
    setSelectedUnit(unit);
    setInputNama(unit.nama);
    setInputKategori(unit.kategori || 'Kantor Pusat');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNama.trim()) {
      setFormError('Nama unit kerja tidak boleh kosong.');
      return;
    }

    setIsLoading(true);
    try {
      const finalUnit: UnitKerja = {
        id: modalMode === 'add' ? `unit_${Date.now()}` : (selectedUnit?.id || `unit_${Date.now()}`),
        nama: inputNama.trim(),
        kategori: inputKategori
      };

      await saveUnitDirect(finalUnit);

      showToast('Berhasil menyimpan unit kerja.', 'success');
      setIsModalOpen(false);
      fetchUnits();
      if (onUnitsChange) onUnitsChange();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await deleteUnitDirect(deleteTarget.id);

      showToast('Unit kerja berhasil dihapus.', 'success');
      setDeleteTarget(null);
      fetchUnits();
      if (onUnitsChange) onUnitsChange();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUnits = units.filter(unit => {
    const matchesSearch = unit.nama.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryFilter === 'all' || unit.kategori === selectedCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredUnits.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUnits = filteredUnits.slice(indexOfFirstItem, indexOfLastItem);

  const getCategoryBadge = (kat: UnitKategori) => {
    switch (kat) {
      case 'Kantor Pusat':
        return <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg uppercase tracking-wider border border-blue-100">Kantor Pusat</span>;
      case 'KPP Kelas A':
        return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg uppercase tracking-wider border border-amber-100">KPP Kelas A</span>;
      case 'KPP Kelas B':
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg uppercase tracking-wider border border-slate-200">KPP Kelas B</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-lg">{kat || 'Lainnya'}</span>;
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            <span>Master Data Unit Kerja</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">Kelola daftar Unit Kerja BASARNAS untuk penempatan pegawai</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/10 hover:shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Unit Kerja</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Cari unit kerja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all placeholder:text-slate-400 text-slate-800"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-700"
          >
            <option value="all">Semua Kategori</option>
            <option value="Kantor Pusat">Kantor Pusat</option>
            <option value="KPP Kelas A">KPP Kelas A</option>
            <option value="KPP Kelas B">KPP Kelas B</option>
          </select>
        </div>
      </div>

      {/* Table display */}
      {isLoading && units.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium">Memuat data unit kerja...</span>
        </div>
      ) : filteredUnits.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <p className="text-xs text-slate-500 italic">Tidak ada data unit kerja ditemukan.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider text-[10px]">
                <th className="px-5 py-3.5 w-16 text-center">No</th>
                <th className="px-5 py-3.5">Nama Unit Kerja</th>
                <th className="px-5 py-3.5 w-44 text-center">Kategori</th>
                <th className="px-5 py-3.5 w-32 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {currentUnits.map((unit, idx) => (
                <tr key={unit.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3 text-center font-mono text-slate-400">{indexOfFirstItem + idx + 1}</td>
                  <td className="px-5 py-3 font-medium text-slate-900">{unit.nama}</td>
                  <td className="px-5 py-3 text-center">
                    {getCategoryBadge(unit.kategori as UnitKategori)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => handleOpenEdit(unit)}
                        className="p-1.5 bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-200 hover:border-blue-200 transition-all cursor-pointer"
                        title="Ubah Unit Kerja"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: unit.id, nama: unit.nama })}
                        className="p-1.5 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
                        title="Hapus Unit Kerja"
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
        {filteredUnits.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 pt-4 gap-4">
            <div className="flex items-center space-x-4">
              <div className="text-xs text-slate-500">
                Menampilkan <span className="font-semibold text-slate-800">{filteredUnits.length === 0 ? 0 : indexOfFirstItem + 1}</span> - <span className="font-semibold text-slate-800">{Math.min(indexOfLastItem, filteredUnits.length)}</span> dari <span className="font-semibold text-slate-800">{filteredUnits.length}</span> data unit kerja
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

      {/* CRUD Modal dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150 text-slate-950">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-bold text-slate-900 text-sm">
                {modalMode === 'add' ? 'Tambah Unit Kerja Baru' : 'Ubah Nama & Kategori Unit Kerja'}
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nama Unit Kerja</label>
                  <input
                    type="text"
                    value={inputNama}
                    onChange={(e) => setInputNama(e.target.value)}
                    placeholder="Contoh: Kantor SAR Surabaya"
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all text-slate-800 font-semibold"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kategori Unit</label>
                  <select
                    value={inputKategori}
                    onChange={(e) => setInputKategori(e.target.value as UnitKategori)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none bg-white text-slate-800 font-medium"
                    disabled={isLoading}
                  >
                    <option value="Kantor Pusat">Kantor Pusat</option>
                    <option value="KPP Kelas A">KPP Kelas A (Kantor Pencarian dan Pertolongan Kelas A)</option>
                    <option value="KPP Kelas B">KPP Kelas B (Kantor Pencarian dan Pertolongan Kelas B)</option>
                  </select>
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
                <h4 className="font-bold text-slate-900 text-sm">Hapus Unit Kerja?</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Apakah Anda yakin ingin menghapus unit kerja <span className="font-bold text-slate-850">"{deleteTarget.nama}"</span>?
                </p>
                <p className="text-[11px] text-red-600 bg-red-50/50 p-2.5 rounded-xl border border-red-100/50 leading-relaxed font-medium">
                  <strong>Perhatian:</strong> Pegawai yang saat ini terdaftar di unit ini mungkin akan kehilangan keselarasan penempatan unit kerja mereka.
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
                    <Trash className="w-3.5 h-3.5" />
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
