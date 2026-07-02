import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { LeaveRequest, LeaveType } from '../types';
import { 
  Calendar, Users, Search, Filter, Phone, MapPin, Building, 
  ChevronRight, CalendarDays, UserCheck, Inbox, RefreshCw 
} from 'lucide-react';

interface ActiveLeavesTodayProps {
  leaveRequests: LeaveRequest[];
  darkMode: boolean;
}

export default function ActiveLeavesToday({ leaveRequests, darkMode }: ActiveLeavesTodayProps) {
  // Get today's date in YYYY-MM-DD format based on local time
  const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('semua');
  const [selectedType, setSelectedType] = useState('semua');

  // Helper to format Indonesian dates beautifully
  const formatIndonesianDate = (dateString: string) => {
    if (!dateString) return '....';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getLeaveTypeLabel = (type: LeaveType) => {
    const map: Record<LeaveType, string> = {
      tahunan: 'Cuti Tahunan',
      besar: 'Cuti Besar',
      sakit: 'Cuti Sakit',
      melahirkan: 'Cuti Melahirkan',
      alasan_penting: 'Karena Alasan Penting',
      luar_tanggungan: 'Di Luar Tanggungan Negara'
    };
    return map[type] || type;
  };

  const getLeaveTypeStyle = (type: LeaveType) => {
    const styles: Record<LeaveType, string> = {
      tahunan: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50',
      besar: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/50',
      sakit: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
      melahirkan: 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-950/40 dark:text-pink-400 dark:border-pink-900/50',
      alasan_penting: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900/50',
      luar_tanggungan: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700/50'
    };
    return styles[type] || 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Extract all distinct units from approved leaves for filtering
  const distinctUnits = useMemo(() => {
    const units = new Set<string>();
    leaveRequests.forEach(req => {
      if (req.status === 'disetujui' && req.unitKerja) {
        units.add(req.unitKerja);
      }
    });
    return Array.from(units).sort();
  }, [leaveRequests]);

  // Filter leave requests that are active on the selected date
  const activeLeaves = useMemo(() => {
    if (!selectedDate) return [];

    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);

    return leaveRequests.filter((req) => {
      // 1. Must be approved (disetujui)
      if (req.status !== 'disetujui') return false;

      // 2. Must cover the selected date
      const startDate = new Date(req.tanggalMulai);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(req.tanggalSelesai);
      endDate.setHours(0, 0, 0, 0);

      const isDateMatch = targetDate >= startDate && targetDate <= endDate;
      if (!isDateMatch) return false;

      // 3. Search text match
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const nameMatch = req.nama.toLowerCase().includes(query);
        const nipMatch = req.nip.includes(query);
        const reasonMatch = req.alasan.toLowerCase().includes(query);
        if (!nameMatch && !nipMatch && !reasonMatch) return false;
      }

      // 4. Unit Kerja filter
      if (selectedUnit !== 'semua' && req.unitKerja !== selectedUnit) return false;

      // 5. Leave Type filter
      if (selectedType !== 'semua' && req.jenisCuti !== selectedType) return false;

      return true;
    });
  }, [leaveRequests, selectedDate, searchQuery, selectedUnit, selectedType]);

  // Quick Stats
  const stats = useMemo(() => {
    const counts = {
      tahunan: 0,
      sakit: 0,
      besar: 0,
      melahirkan: 0,
      alasan_penting: 0,
      luar_tanggungan: 0,
      total: activeLeaves.length
    };
    activeLeaves.forEach(req => {
      if (req.jenisCuti in counts) {
        counts[req.jenisCuti as keyof typeof counts]++;
      }
    });
    return counts;
  }, [activeLeaves]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedUnit('semua');
    setSelectedType('semua');
    setSelectedDate(getTodayString());
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-display font-black text-slate-800 dark:text-white">Pegawai Sedang Cuti</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Pantau siapa saja rekan kerja atau bawahan yang sedang melaksanakan cuti aktif hari ini untuk koordinasi tugas dan kelancaran operasional kantor.
            </p>
          </div>

          {/* Date Selector Dashboard Component */}
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">Pilih Tanggal Acuan</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono px-1">
                {formatIndonesianDate(selectedDate)}
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      {/* Filter and Stats Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left column: Filters */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-blue-500" />
              <span>Saring Pencarian</span>
            </h3>

            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Cari Pegawai / Alasan</label>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nama, NIP, Alasan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Unit Kerja Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Unit Kerja</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="semua">Semua Unit Kerja</option>
                {distinctUnits.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>

            {/* Leave Type Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Jenis Cuti</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none"
              >
                <option value="semua">Semua Jenis Cuti</option>
                <option value="tahunan">Cuti Tahunan</option>
                <option value="besar">Cuti Besar</option>
                <option value="sakit">Cuti Sakit</option>
                <option value="melahirkan">Cuti Melahirkan</option>
                <option value="alasan_penting">Karena Alasan Penting</option>
                <option value="luar_tanggungan">Di Luar Tanggungan Negara</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atur Ulang Pencarian</span>
            </button>
          </div>

          {/* Mini Stats widget */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
              <CalendarDays className="w-3.5 h-3.5 text-emerald-500" />
              <span>Statistik Cuti Hari Ini</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-500/10">
                <p className="text-[10px] font-bold text-slate-400">Total Cuti</p>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5">{stats.total}</p>
              </div>
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-50/10">
                <p className="text-[10px] font-bold text-slate-400">Tahunan</p>
                <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{stats.tahunan}</p>
              </div>
            </div>
            
            <div className="space-y-1.5 text-xs text-slate-500 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Cuti Sakit:</span>
                <span className="font-bold font-mono text-rose-600 dark:text-rose-400">{stats.sakit}</span>
              </div>
              <div className="flex justify-between">
                <span>Cuti Besar:</span>
                <span className="font-bold font-mono text-purple-600 dark:text-purple-400">{stats.besar}</span>
              </div>
              <div className="flex justify-between">
                <span>Melahirkan:</span>
                <span className="font-bold font-mono text-pink-600 dark:text-pink-400">{stats.melahirkan}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Results List */}
        <div className="lg:col-span-3 space-y-4">
          {activeLeaves.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[350px]"
            >
              <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 flex items-center justify-center text-slate-400">
                <Inbox className="w-8 h-8" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="font-display font-extrabold text-slate-800 dark:text-white text-sm">Tidak Ada Pegawai Yang Cuti</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pada tanggal {formatIndonesianDate(selectedDate)}, semua pegawai terdaftar hadir secara penuh atau tidak ada riwayat cuti aktif disetujui.
                </p>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeLeaves.map((req, idx) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-all space-y-4 relative overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">{req.nama}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP: {req.nip}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shrink-0 ${getLeaveTypeStyle(req.jenisCuti)}`}>
                      {getLeaveTypeLabel(req.jenisCuti)}
                    </span>
                  </div>

                  {/* Workplace info */}
                  <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 border-t border-b border-slate-100 dark:border-slate-800/80 py-3">
                    <div className="flex items-center space-x-2">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-semibold text-slate-700 dark:text-slate-300">{req.unitKerja}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{req.jabatan}</span>
                    </div>
                  </div>

                  {/* Period info */}
                  <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Masa Pelaksanaan Cuti</p>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                      <span>{req.tanggalMulai} s/d {req.tanggalSelesai}</span>
                      <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg text-[10px] font-mono">
                        {req.lamaHari} Hari Kerja
                      </span>
                    </div>
                  </div>

                  {/* Reason & Emergency Contact info */}
                  <div className="space-y-2 text-[11px] text-slate-500">
                    <div>
                      <span className="font-bold text-slate-400 block text-[9px] uppercase">Alasan Cuti:</span>
                      <p className="italic text-slate-600 dark:text-slate-300 mt-0.5 font-medium line-clamp-2">
                        "{req.alasan || '-'}"
                      </p>
                    </div>
                    <div className="pt-2 border-t border-slate-150/40 dark:border-slate-850 flex flex-wrap gap-x-4 gap-y-2">
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono text-[10px]">{req.telepon}</span>
                      </div>
                      <div className="flex items-center space-x-1 min-w-0 max-w-full">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate text-[10px]">{req.alamatCuti}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
