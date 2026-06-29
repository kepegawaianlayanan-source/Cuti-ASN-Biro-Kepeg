/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Notification } from '../types';
import { Bell, BellOff, CheckCheck, Inbox, ShieldAlert, Clock, X } from 'lucide-react';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClear: () => void;
}

export default function NotificationCenter({ notifications, onMarkAllAsRead, onClear }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="relative z-40 text-slate-900 no-print">
      {/* Bell Button with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl transition-all shadow-sm focus:outline-none"
        title="Pemberitahuan Real-Time"
      >
        <Bell className={`w-5 h-5 text-slate-700 ${unreadCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 border-2 border-white text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          {/* Backdrop screen lock for dismissal */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl border border-slate-200 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 bg-slate-50 border-b border-slate-100">
              <div>
                <h4 className="font-display font-bold text-sm text-slate-900">Notifikasi Real-Time</h4>
                <p className="text-[10px] text-slate-500">Alur pengajuan & persetujuan cuti</p>
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      onMarkAllAsRead();
                    }}
                    className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
                    title="Tandai semua dibaca"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notification Stream */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                  <Inbox className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-xs font-semibold">Belum ada notifikasi</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Setiap perubahan alur cuti akan muncul di sini</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 flex items-start space-x-3 transition-colors ${
                      notif.isRead ? 'bg-white' : 'bg-amber-500/[0.02] border-l-2 border-amber-500'
                    }`}
                  >
                    <div className="p-1.5 bg-amber-500/10 text-amber-600 rounded-xl shrink-0 mt-0.5">
                      <Bell className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-start">
                        <h5 className={`text-xs font-bold leading-tight truncate ${notif.isRead ? 'text-slate-700' : 'text-slate-900'}`}>
                          {notif.title}
                        </h5>
                        <span className="text-[9px] text-slate-400 font-medium shrink-0 ml-1.5 flex items-center">
                          <Clock className="w-2.5 h-2.5 mr-0.5" />
                          {formatTimeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed break-words">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Clear All */}
            {notifications.length > 0 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => {
                    onClear();
                    setIsOpen(false);
                  }}
                  className="text-xs font-bold text-red-500 hover:text-red-600 transition-all"
                >
                  Hapus Semua Riwayat
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
