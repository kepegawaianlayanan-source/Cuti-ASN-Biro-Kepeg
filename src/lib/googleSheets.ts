/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LeaveRequest } from '../types';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace scopes
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else {
        // Since Firebase doesn't persist the Google OAuth Access Token across reloads, 
        // the user will need to re-authenticate if the in-memory token is lost.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Gagal mendapatkan token akses dari Google Sign-In.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error Google Sign-In:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Get current access token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Logout
export const logoutGoogle = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

// Format Leave Request into Sheet Row Array
const formatLeaveRow = (leave: LeaveRequest): string[] => {
  return [
    leave.id || '',
    leave.nip || '',
    leave.nama || '',
    leave.jabatan || '',
    leave.unitKerja || '',
    (leave.jenisCuti || '').replace('_', ' ').toUpperCase(),
    leave.alasan || '',
    String(leave.lamaHari || 1),
    leave.tanggalMulai || '',
    leave.tanggalSelesai || '',
    leave.alamatCuti || '',
    leave.telepon || '',
    (leave.status || '').replace('_', ' ').toUpperCase(),
    leave.verifikatorNama || '',
    (leave.verifikatorStatus || 'MENUNGGU').toUpperCase(),
    leave.verifikatorNotes || '-',
    leave.pimpinanNama || '',
    (leave.pimpinanStatus || 'MENUNGGU').toUpperCase(),
    leave.pimpinanNotes || '-',
    leave.createdAt ? new Date(leave.createdAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')
  ];
};

const HEADERS = [
  "ID Cuti", 
  "NIP", 
  "Nama Pegawai", 
  "Jabatan", 
  "Unit Kerja", 
  "Jenis Cuti", 
  "Alasan Cuti", 
  "Lama Hari", 
  "Tanggal Mulai", 
  "Tanggal Selesai", 
  "Alamat Cuti", 
  "No. Telepon", 
  "Status Pengajuan", 
  "Atasan Langsung (Verifikator)", 
  "Status Verifikator", 
  "Catatan Verifikator", 
  "Pejabat Berwenang (Pimpinan)", 
  "Status Pimpinan", 
  "Catatan Pimpinan", 
  "Tanggal Pengajuan"
];

// Initialize Spreadsheet headers
export const initializeSheetHeaders = async (spreadsheetId: string, accessToken: string): Promise<boolean> => {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:T1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [HEADERS]
        })
      }
    );
    return response.ok;
  } catch (error) {
    console.error('Error initializing sheet headers:', error);
    return false;
  }
};

// Create a new Spreadsheet on Google Drive
export const createSpreadsheet = async (accessToken: string): Promise<string> => {
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Rekapitulasi Cuti Kepegawaian BASARNAS',
        mimeType: 'application/vnd.google-apps.spreadsheet'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Gagal membuat spreadsheet.');
    }

    const data = await response.json();
    const spreadsheetId = data.id;

    // Set up headers
    await initializeSheetHeaders(spreadsheetId, accessToken);
    return spreadsheetId;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
};

// Sync single leave request (Insert or Update if exists)
export const syncSingleLeave = async (
  leave: LeaveRequest, 
  accessToken: string, 
  spreadsheetId: string
): Promise<boolean> => {
  try {
    // 1. Fetch column A to find if ID already exists
    const getRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A:A`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    let existingIds: string[][] = [];
    if (getRes.ok) {
      const data = await getRes.json();
      existingIds = data.values || [];
    } else {
      // If the sheet doesn't exist or isn't initialized, let's initialize headers
      await initializeSheetHeaders(spreadsheetId, accessToken);
    }

    const rowData = formatLeaveRow(leave);

    // Find if ID matches
    let rowIndex = -1;
    for (let i = 0; i < existingIds.length; i++) {
      if (existingIds[i][0] === leave.id) {
        rowIndex = i + 1; // 1-indexed row number
        break;
      }
    }

    if (rowIndex !== -1) {
      // Update existing row
      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A${rowIndex}:T${rowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [rowData]
          })
        }
      );
      return updateRes.ok;
    } else {
      // Append new row
      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [rowData]
          })
        }
      );
      return appendRes.ok;
    }
  } catch (error) {
    console.error(`Gagal menyinkronkan data cuti ID ${leave.id}:`, error);
    return false;
  }
};

// Sync all leave requests at once
export const syncAllLeaves = async (
  leaves: LeaveRequest[], 
  accessToken: string, 
  spreadsheetId: string
): Promise<{ success: boolean; count: number }> => {
  try {
    // First, clear sheet and write headers again to refresh completely
    await initializeSheetHeaders(spreadsheetId, accessToken);
    
    if (leaves.length === 0) {
      return { success: true, count: 0 };
    }

    const values = leaves.map(formatLeaveRow);
    
    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A2:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: values
        })
      }
    );

    return { success: appendRes.ok, count: leaves.length };
  } catch (error) {
    console.error('Error syncAllLeaves:', error);
    return { success: false, count: 0 };
  }
};
