/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { User, LeaveRequest, Notification, LeaveStatus, LeaveType, UnitKerja } from "./src/types";

// Setup standard paths
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEAVES_FILE = path.join(DATA_DIR, "leaves.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const UNITS_FILE = path.join(DATA_DIR, "units.json");

// Ensure data directory exists safely
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn("Could not create data directory, might be a read-only filesystem:", err);
}

// Compact seeding data containing exactly all 44 civil servants as requested
const SEED_USERS: User[] = [
  {"nip": "1111", "nama": "Marsekal Madya Kusworo, S.E.", "role": "pimpinan", "unit_kerja": "Pusat - Kepala Basarnas", "jabatan": "Kepala Basarnas", "eselon": "Eselon 1", "password": "basarnas123", "pangkatGol": "Pembina Utama (IV/e)"},
  {"nip": "2222", "nama": "Drs. Abdul Haris, M.Si.", "role": "pimpinan", "unit_kerja": "Pusat - Sekretariat Utama", "jabatan": "Sekretaris Utama Basarnas", "eselon": "Eselon 1", "password": "basarnas123", "pangkatGol": "Pembina Utama (IV/e)"},
  {"nip": "2223", "nama": "Laksda Ribut Eko, S.E.", "role": "pimpinan", "unit_kerja": "Pusat - Deputi Operasi", "jabatan": "Deputi Operasi dan Kesiapsiagaan", "eselon": "Eselon 1", "password": "basarnas123", "pangkatGol": "Pembina Utama (IV/e)"},
  {"nip": "2224", "nama": "Drs. Heru Prasetyo", "role": "pimpinan", "unit_kerja": "Pusat - Deputi Bina Tenaga", "jabatan": "Deputi Bidang Bina Tenaga dan Potensi", "eselon": "Eselon 1", "password": "basarnas123", "pangkatGol": "Pembina Utama (IV/e)"},
  {"nip": "2225", "nama": "Ir. Bambang Sugiarto", "role": "pimpinan", "unit_kerja": "Pusat - Deputi Sarpras", "jabatan": "Deputi Sarana & Prasarana dan Siskom", "eselon": "Eselon 1", "password": "basarnas123", "pangkatGol": "Pembina Utama (IV/e)"},
  {"nip": "3333", "nama": "Brigjen Edy Prasetyo, M.H.", "role": "pimpinan", "unit_kerja": "Pusat - Biro Kepegawaian", "jabatan": "Kepala Biro Umum (Eselon 2)", "eselon": "Eselon 2", "password": "basarnas123", "pangkatGol": "Pembina Utama Muda (IV/c)"},
  {"nip": "4444", "nama": "Fazzli, S.A.P., M.Si.", "role": "pimpinan", "unit_kerja": "Kantor SAR Jakarta", "jabatan": "Kepala Kantor SAR Jakarta", "eselon": "Eselon 2", "password": "basarnas123", "pangkatGol": "Pembina Utama Muda (IV/c)"},
  {"nip": "5555", "nama": "Rian Hermawan, S.Kom.", "role": "verifikator", "unit_kerja": "Kantor SAR Jakarta", "jabatan": "Kasubag Umum & Kepegawaian Kantor SAR Jakarta", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "5556", "nama": "Siti Aminah, S.Sos.", "role": "verifikator", "unit_kerja": "Pusat - Biro Kepegawaian", "jabatan": "Analis Kepegawaian Muda Pusat", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "6666", "nama": "Budi Rescuer", "role": "pegawai", "unit_kerja": "Kantor SAR Jakarta", "jabatan": "Rescuer Mahir Kantor SAR Jakarta", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "6667", "nama": "Siska Ayu", "role": "pegawai", "unit_kerja": "Pusat - Sekretariat Utama", "jabatan": "Pengadministrasi Umum Pusat", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "7777", "nama": "Pranata Komputer Admin", "role": "admin", "unit_kerja": "Pusat - Biro Kepegawaian", "jabatan": "Admin Sistem Kepegawaian Utama", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "196610071994031001", "nama": "Drs. MOCHAMAD HERNANTO M.M.", "role": "pimpinan", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Kepala Biro Kepegawaian, Organisasi, dan Tata Laksana", "eselon": "Eselon 2", "password": "basarnas123", "pangkatGol": "Pembina Utama Muda (IV/c)"},
  {"nip": "197010201991031001", "nama": "EDI PURWANTO S.IP, MAP.", "role": "verifikator", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Madya", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pembina (IV/a)"},
  {"nip": "198505082008122002", "nama": "EMMA FURI NURFIANTI S.Psi", "role": "verifikator", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Madya", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pembina (IV/a)"},
  {"nip": "198304192009121004", "nama": "CECEP SUPRIYANTO S.H.", "role": "verifikator", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Madya", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pembina (IV/a)"},
  {"nip": "198602272010121002", "nama": "TRISNA RAMA FANNI LUBIS S.Kom., MBA", "role": "verifikator", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Madya", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pembina (IV/a)"},
  {"nip": "197809232009121002", "nama": "BOBBY WIDYANTO S.E.,M.M.", "role": "verifikator", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Madya", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pembina (IV/a)"},
  {"nip": "198303112009121004", "nama": "MUHAMMAD FAJAR HARTAKUSUMA S.Sos., M.AP.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "197106231993032002", "nama": "SRI HARTATI", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Arsiparis Penyelia", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198608232010122002", "nama": "HARINI KINANTI PRAMUDITA S.T.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198602112009122003", "nama": "DESI FEBRIANTI MONA PUTRI S.Kom.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "197905302006041001", "nama": "TOMAS KRISTYANTO S.T.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198512262009122006", "nama": "DHESTY AGUSTINA MAHARANY PUTRI S.Tr.A.P.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198110102009121006", "nama": "HENDRA SAPUTRA A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Penyelia", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198410212010122001", "nama": "OKTOVERA SYELLY S.IP., M.Soc.SC.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198508092008122001", "nama": "SISKA VERMINA A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Penyelia", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198611132008122001", "nama": "FATIMAH S.E.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "197807182009032002", "nama": "ITA KARINA S.E.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Penelaah Teknis Kebijakan", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198512132015031002", "nama": "ARIEF WIDIYANTO S.Kom.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Perencana Ahli Pertama", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata Muda (III/a)"},
  {"nip": "198611012019022001", "nama": "ELY HERAWATI S.Psi.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Muda", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198502172008122004", "nama": "FEBRY PUSPITASARI A.Md", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Penyelia", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata (III/c)"},
  {"nip": "198805182010122002", "nama": "MUTIA ARIANY A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Mahir", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata Muda Tingkat I (III/b)"},
  {"nip": "199304192019021002", "nama": "ADAM SETIAWAN S.A.P.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Sumber Daya Manusia Aparatur Ahli Pertama", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata Muda (III/a)"},
  {"nip": "198602082009121003", "nama": "SYARIFFUDIN A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pengelola Umum Operasional", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur Tingkat I (II/d)"},
  {"nip": "199208052025061003", "nama": "DION GALUH AGUS KUSUMA S.AP.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Analis Kebijakan Ahli Pertama", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata Muda (III/a)"},
  {"nip": "199708092025062004", "nama": "DISYA ZAFIRAH CITTA S.Psi.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Konselor SDM", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Penata Muda (III/a)"},
  {"nip": "199703052019022002", "nama": "LATIFAH RATANTRI A.Md.Sek.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Arsiparis Terampil", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "199301172022031001", "nama": "DERY GANTARA PRADANA A.Md.", "role": "admin", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Terampil", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "198811282022031001", "nama": "IMAM FIRMANSYAH A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Terampil", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "199406052025061004", "nama": "JUNI TRIANTO A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Terampil", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "200102282025061003", "nama": "DELFI NAUFAN KOTO A.Md.Kom.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Terampil", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "199807072025061007", "nama": "STEVEN BREMA PERANGIN-ANGIN A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Terampil", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"},
  {"nip": "199311212025061001", "nama": "CHAERUL JERY SETIADI A.Md.", "role": "pegawai", "unit_kerja": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "jabatan": "Pranata Sumber Daya Manusia Aparatur Terampil", "eselon": "Non-Eselon", "password": "basarnas123", "pangkatGol": "Pengatur (II/c)"}
];

/// Helper to read JSON database safely (as fallback)
function readDb<T>(filePath: string, defaultData: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  // If doesn't exist or errored, write and return default (only if Firebase is not active)
  if (!isFirebaseEnabled) {
    writeDb(filePath, defaultData);
  }
  return defaultData;
}

// Helper to write JSON database safely (as fallback)
function writeDb<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error);
  }
}

const SEED_UNITS: UnitKerja[] = [
  { "id": "1", "nama": "Pusat - Kepala Basarnas", "kategori": "Kantor Pusat" },
  { "id": "2", "nama": "Pusat - Sekretariat Utama", "kategori": "Kantor Pusat" },
  { "id": "3", "nama": "Pusat - Deputi Operasi", "kategori": "Kantor Pusat" },
  { "id": "4", "nama": "Pusat - Deputi Bina Tenaga", "kategori": "Kantor Pusat" },
  { "id": "5", "nama": "Pusat - Deputi Sarpras", "kategori": "Kantor Pusat" },
  { "id": "6", "nama": "Pusat - Biro Kepegawaian", "kategori": "Kantor Pusat" },
  { "id": "7", "nama": "Kantor SAR Jakarta", "kategori": "KPP Kelas A" },
  { "id": "8", "nama": "Pusat - Biro Kepegawaian, Organisasi, dan Tata Laksana", "kategori": "Kantor Pusat" }
];

// Initialize Firebase
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;
let isFirebaseEnabled = false;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const config = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));
    const app = initializeApp(config);
    db = getFirestore(app, config.firestoreDatabaseId || "(default)");
    isFirebaseEnabled = true;
    console.log("Firebase Firestore initialized successfully with database ID:", config.firestoreDatabaseId);
    
    // Auto-seed Firestore collections asynchronously if empty
    autoSeedFirestore();
  } catch (err) {
    console.error("Failed to initialize Firebase:", err);
  }
}

async function autoSeedFirestore(): Promise<void> {
  if (!isFirebaseEnabled) return;
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    if (usersSnap.empty) {
      console.log("Firestore users collection is empty. Auto-seeding default Basarnas users...");
      for (const user of SEED_USERS) {
        await setDoc(doc(db, "users", user.nip), user);
      }
      console.log("Firestore users auto-seeded!");
    }
    const unitsSnap = await getDocs(collection(db, "units"));
    if (unitsSnap.empty) {
      console.log("Firestore units collection is empty. Auto-seeding default Basarnas units...");
      for (const unit of SEED_UNITS) {
        await setDoc(doc(db, "units", unit.id), unit);
      }
      console.log("Firestore units auto-seeded!");
    }
  } catch (err) {
    console.error("Failed to auto-seed Firestore:", err);
  }
}

// Fetch all users
async function getAllUsers(): Promise<User[]> {
  if (!isFirebaseEnabled) return readDb<User[]>(USERS_FILE, SEED_USERS);
  try {
    const snapshot = await getDocs(collection(db, "users"));
    return snapshot.docs.map(doc => doc.data() as User);
  } catch (err) {
    console.error("Error fetching users from Firebase:", err);
    return readDb<User[]>(USERS_FILE, SEED_USERS);
  }
}

// Fetch single user
async function getUser(nip: string): Promise<User | null> {
  if (!isFirebaseEnabled) {
    const uList = readDb<User[]>(USERS_FILE, SEED_USERS);
    return uList.find(u => u.nip === String(nip)) || null;
  }
  try {
    const docRef = doc(db, "users", String(nip));
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as User;
    }
    // Fallback if not found in Firestore yet
    const uList = readDb<User[]>(USERS_FILE, SEED_USERS);
    return uList.find(u => u.nip === String(nip)) || null;
  } catch (err) {
    console.error("Error fetching user from Firebase:", err);
    const uList = readDb<User[]>(USERS_FILE, SEED_USERS);
    return uList.find(u => u.nip === String(nip)) || null;
  }
}

// Save or update user
async function saveUser(user: User): Promise<void> {
  if (!isFirebaseEnabled) {
    const uList = readDb<User[]>(USERS_FILE, SEED_USERS);
    const idx = uList.findIndex(u => u.nip === user.nip);
    if (idx !== -1) uList[idx] = user;
    else uList.push(user);
    writeDb(USERS_FILE, uList);
    return;
  }
  try {
    await setDoc(doc(db, "users", user.nip), user);
  } catch (err) {
    console.error("Error saving user to Firebase:", err);
  }
}

// Delete user
async function deleteUserDb(nip: string): Promise<void> {
  if (!isFirebaseEnabled) {
    let uList = readDb<User[]>(USERS_FILE, SEED_USERS);
    uList = uList.filter(u => u.nip !== nip);
    writeDb(USERS_FILE, uList);
    return;
  }
  try {
    await deleteDoc(doc(db, "users", nip));
  } catch (err) {
    console.error("Error deleting user from Firebase:", err);
  }
}

// Fetch all units
async function getAllUnits(): Promise<UnitKerja[]> {
  if (!isFirebaseEnabled) return readDb<UnitKerja[]>(UNITS_FILE, SEED_UNITS);
  try {
    const snapshot = await getDocs(collection(db, "units"));
    return snapshot.docs.map(doc => doc.data() as UnitKerja);
  } catch (err) {
    console.error("Error fetching units from Firebase:", err);
    return readDb<UnitKerja[]>(UNITS_FILE, SEED_UNITS);
  }
}

// Save or update unit
async function saveUnit(unit: UnitKerja): Promise<void> {
  if (!isFirebaseEnabled) {
    const uList = readDb<UnitKerja[]>(UNITS_FILE, SEED_UNITS);
    const idx = uList.findIndex(u => u.id === unit.id);
    if (idx !== -1) uList[idx] = unit;
    else uList.push(unit);
    writeDb(UNITS_FILE, uList);
    return;
  }
  try {
    await setDoc(doc(db, "units", unit.id), unit);
  } catch (err) {
    console.error("Error saving unit to Firebase:", err);
  }
}

// Delete unit
async function deleteUnitDb(id: string): Promise<void> {
  if (!isFirebaseEnabled) {
    let uList = readDb<UnitKerja[]>(UNITS_FILE, SEED_UNITS);
    uList = uList.filter(u => u.id !== id);
    writeDb(UNITS_FILE, uList);
    return;
  }
  try {
    await deleteDoc(doc(db, "units", id));
  } catch (err) {
    console.error("Error deleting unit from Firebase:", err);
  }
}

// Fetch all leave requests
async function getAllLeaves(): Promise<LeaveRequest[]> {
  if (!isFirebaseEnabled) return readDb<LeaveRequest[]>(LEAVES_FILE, []);
  try {
    const snapshot = await getDocs(collection(db, "leaves"));
    const list = snapshot.docs.map(doc => doc.data() as LeaveRequest);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error fetching leaves from Firebase:", err);
    return readDb<LeaveRequest[]>(LEAVES_FILE, []);
  }
}

// Fetch single leave request
async function getLeave(id: string): Promise<LeaveRequest | null> {
  if (!isFirebaseEnabled) {
    const list = readDb<LeaveRequest[]>(LEAVES_FILE, []);
    return list.find(l => l.id === id) || null;
  }
  try {
    const docSnap = await getDoc(doc(db, "leaves", id));
    if (docSnap.exists()) {
      return docSnap.data() as LeaveRequest;
    }
    // Fallback
    const list = readDb<LeaveRequest[]>(LEAVES_FILE, []);
    return list.find(l => l.id === id) || null;
  } catch (err) {
    console.error("Error fetching leave from Firebase:", err);
    const list = readDb<LeaveRequest[]>(LEAVES_FILE, []);
    return list.find(l => l.id === id) || null;
  }
}

// Save or update leave request
async function saveLeave(leave: LeaveRequest): Promise<void> {
  if (!isFirebaseEnabled) {
    const list = readDb<LeaveRequest[]>(LEAVES_FILE, []);
    const idx = list.findIndex(l => l.id === leave.id);
    if (idx !== -1) list[idx] = leave;
    else list.unshift(leave);
    writeDb(LEAVES_FILE, list);
    return;
  }
  try {
    await setDoc(doc(db, "leaves", leave.id), leave);
  } catch (err) {
    console.error("Error saving leave to Firebase:", err);
  }
}

// Delete leave request
async function deleteLeaveDb(id: string): Promise<void> {
  if (!isFirebaseEnabled) {
    let list = readDb<LeaveRequest[]>(LEAVES_FILE, []);
    list = list.filter(l => l.id !== id);
    writeDb(LEAVES_FILE, list);
    return;
  }
  try {
    await deleteDoc(doc(db, "leaves", id));
  } catch (err) {
    console.error("Error deleting leave from Firebase:", err);
  }
}

// Fetch notifications for NIP
async function getNotificationsForNip(nip: string): Promise<Notification[]> {
  if (!isFirebaseEnabled) {
    const list = readDb<Notification[]>(NOTIFICATIONS_FILE, []);
    return list.filter(n => n.nip === String(nip));
  }
  try {
    const snapshot = await getDocs(collection(db, "notifications"));
    const list = snapshot.docs.map(doc => doc.data() as Notification);
    return list
      .filter(n => n.nip === String(nip))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error("Error fetching notifications from Firebase:", err);
    const list = readDb<Notification[]>(NOTIFICATIONS_FILE, []);
    return list.filter(n => n.nip === String(nip));
  }
}

// Save notification
async function saveNotificationDb(notif: Notification): Promise<void> {
  if (!isFirebaseEnabled) {
    const list = readDb<Notification[]>(NOTIFICATIONS_FILE, []);
    list.unshift(notif);
    writeDb(NOTIFICATIONS_FILE, list);
    return;
  }
  try {
    await setDoc(doc(db, "notifications", notif.id), notif);
  } catch (err) {
    console.error("Error saving notification to Firebase:", err);
  }
}

// Mark notifications as read
async function markAllNotificationsAsRead(nip: string): Promise<void> {
  if (!isFirebaseEnabled) {
    const list = readDb<Notification[]>(NOTIFICATIONS_FILE, []);
    list.forEach(n => {
      if (n.nip === String(nip)) {
        n.isRead = true;
      }
    });
    writeDb(NOTIFICATIONS_FILE, list);
    return;
  }
  try {
    const snapshot = await getDocs(collection(db, "notifications"));
    for (const d of snapshot.docs) {
      const n = d.data() as Notification;
      if (n.nip === String(nip) && !n.isRead) {
        await updateDoc(doc(db, "notifications", n.id), { isRead: true });
      }
    }
  } catch (err) {
    console.error("Error marking notifications as read in Firebase:", err);
  }
}

// Real-time SSE Connection Clients
interface SSEClient {
  id: string;
  nip: string;
  res: express.Response;
}
let sseClients: SSEClient[] = [];

// Helper to trigger and store notifications
async function sendNotification(nip: string, title: string, message: string) {
  const newNotification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    nip: String(nip),
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  await saveNotificationDb(newNotification);

  // Broadcast to active SSE clients for this user NIP
  sseClients.forEach((client) => {
    if (client.nip === nip) {
      try {
        client.res.write(`data: ${JSON.stringify(newNotification)}\n\n`);
      } catch (err) {
        console.error(`Failed to send SSE notification to NIP ${nip}:`, err);
      }
    }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Seed Firestore if empty on startup
  if (isFirebaseEnabled && db) {
    try {
      const usersSnap = await getDocs(collection(db, "users"));
      if (usersSnap.empty) {
        console.log("Firestore 'users' collection is empty. Seeding SEED_USERS...");
        for (const user of SEED_USERS) {
          await setDoc(doc(db, "users", user.nip), user);
        }
        console.log("Successfully seeded users to Firestore.");
      }
      const unitsSnap = await getDocs(collection(db, "units"));
      if (unitsSnap.empty) {
        console.log("Firestore 'units' collection is empty. Seeding SEED_UNITS...");
        for (const unit of SEED_UNITS) {
          await setDoc(doc(db, "units", unit.id), unit);
        }
        console.log("Successfully seeded units to Firestore.");
      }
    } catch (e) {
      console.error("Error seeding Firestore on startup:", e);
    }
  }

  // Middleware for body parsing
  app.use(express.json());

  // ----------------------------------------------------
  // API Endpoints
  // ----------------------------------------------------

  // 1. Health check
  app.get("/api/health", async (req, res) => {
    const uList = await getAllUsers();
    const lList = await getAllLeaves();
    res.json({ status: "ok", usersCount: uList.length, leavesCount: lList.length });
  });

  // 2. Fetch all users (NIP and metadata, passwords hidden for safety)
  app.get("/api/users", async (req, res) => {
    const uList = await getAllUsers();
    const safeUsers = uList.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  });

  // 2b. Unit Kerja CRUD Endpoints
  app.get("/api/units", async (req, res) => {
    const unList = await getAllUnits();
    res.json(unList);
  });

  app.post("/api/units", async (req, res) => {
    const { nama, kategori } = req.body;
    if (!nama) {
      return res.status(400).json({ error: "Nama unit kerja harus diisi." });
    }
    const newUnit: UnitKerja = {
      id: String(Date.now()),
      nama,
      kategori: kategori || 'Kantor Pusat'
    };
    await saveUnit(newUnit);
    res.status(201).json({ success: true, unit: newUnit, message: "Unit kerja berhasil ditambahkan." });
  });

  app.put("/api/units/:id", async (req, res) => {
    const { id } = req.params;
    const { nama, kategori } = req.body;
    if (!nama) {
      return res.status(400).json({ error: "Nama unit kerja harus diisi." });
    }
    const unList = await getAllUnits();
    const existing = unList.find(u => u.id === id);
    if (!existing) {
      return res.status(404).json({ error: "Unit kerja tidak ditemukan." });
    }
    existing.nama = nama;
    if (kategori) {
      existing.kategori = kategori;
    }
    await saveUnit(existing);
    res.json({ success: true, unit: existing, message: "Unit kerja berhasil diperbarui." });
  });

  app.delete("/api/units/:id", async (req, res) => {
    const { id } = req.params;
    const unList = await getAllUnits();
    const existing = unList.find(u => u.id === id);
    if (!existing) {
      return res.status(404).json({ error: "Unit kerja tidak ditemukan." });
    }
    await deleteUnitDb(id);
    res.json({ success: true, unit: existing, message: "Unit kerja berhasil dihapus." });
  });

  // 2c. User Management Admin Endpoints
  app.post("/api/admin/users", async (req, res) => {
    const { nip, nama, role, unit_kerja, jabatan, eselon, pangkatGol, password } = req.body;
    if (!nip || !nama || !role || !unit_kerja || !jabatan) {
      return res.status(400).json({ error: "Kolom NIP, Nama, Role, Unit Kerja, dan Jabatan wajib diisi." });
    }

    const existing = await getUser(String(nip));
    if (existing) {
      return res.status(400).json({ error: "Pegawai dengan NIP ini sudah terdaftar." });
    }

    const newUser: User = {
      nip: String(nip),
      nama,
      role,
      unit_kerja,
      jabatan,
      eselon: eselon || "Non-Eselon",
      pangkatGol: pangkatGol || "",
      password: password || "basarnas123",
      signature: ""
    };

    await saveUser(newUser);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ success: true, user: safeUser, message: "Pegawai berhasil ditambahkan." });
  });

  app.put("/api/admin/users/:nip", async (req, res) => {
    const { nip } = req.params;
    const { nama, role, unit_kerja, jabatan, eselon, pangkatGol, password } = req.body;

    const user = await getUser(nip);
    if (!user) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    if (nama) user.nama = nama;
    if (role) user.role = role;
    if (unit_kerja) user.unit_kerja = unit_kerja;
    if (jabatan) user.jabatan = jabatan;
    if (eselon !== undefined) user.eselon = eselon;
    if (pangkatGol !== undefined) user.pangkatGol = pangkatGol;
    if (password) user.password = password;

    await saveUser(user);

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, message: "Data pegawai berhasil diperbarui." });
  });

  app.delete("/api/admin/users/:nip", async (req, res) => {
    const { nip } = req.params;
    const user = await getUser(nip);
    if (!user) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    await deleteUserDb(nip);

    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, message: "Pegawai berhasil dihapus dari sistem." });
  });

  // 2d. Leave Management Admin Delete Endpoint
  app.delete("/api/admin/leave/:id", async (req, res) => {
    const { id } = req.params;
    const leave = await getLeave(id);
    if (!leave) {
      return res.status(404).json({ error: "Pengajuan cuti tidak ditemukan." });
    }
    await deleteLeaveDb(id);
    res.json({ success: true, leave, message: "Pengajuan cuti berhasil dihapus dari sistem." });
  });

  // 2e. Leave Management Admin Direct Submit Endpoint
  app.post("/api/admin/leave/submit", async (req, res) => {
    const { 
      nip, 
      jenisCuti, 
      alasan, 
      lamaHari, 
      tanggalMulai, 
      tanggalSelesai, 
      alamatCuti, 
      telepon,
      verifikatorNip,
      pimpinanNip,
      catatanCuti,
      status,
      verifikatorNotes,
      pimpinanNotes
    } = req.body;

    if (!nip || !jenisCuti || !alasan || !lamaHari || !tanggalMulai || !tanggalSelesai || !alamatCuti || !telepon || !verifikatorNip || !pimpinanNip) {
      return res.status(400).json({ error: "Formulir pengajuan belum lengkap." });
    }

    const user = await getUser(String(nip));
    if (!user) {
      return res.status(404).json({ error: "Pegawai pengaju tidak ditemukan." });
    }

    const verifikator = await getUser(String(verifikatorNip));
    if (!verifikator) {
      return res.status(404).json({ error: "Atasan / Verifikator tidak ditemukan." });
    }

    const pimpinan = await getUser(String(pimpinanNip));
    if (!pimpinan) {
      return res.status(404).json({ error: "Pimpinan yang berwenang tidak ditemukan." });
    }

    const actionDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const finalStatus = status || "menunggu_verifikasi";

    const newRequest: LeaveRequest = {
      id: `cuti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nip: user.nip,
      nama: user.nama,
      jabatan: user.jabatan,
      unitKerja: user.unit_kerja,
      pangkatGol: user.pangkatGol || "Penata (III/c)",
      jenisCuti,
      alasan,
      lamaHari: Number(lamaHari),
      tanggalMulai,
      tanggalSelesai,
      alamatCuti,
      telepon,
      catatanCuti: catatanCuti || {
        tahunan: { nMinus2: "-", nMinus1: "-", n: "12" },
        besar: "-",
        sakit: "-",
        melahirkan: "-",
        alasanPenting: "-",
        luarTanggungan: "-"
      },
      status: finalStatus,
      
      verifikatorNip: verifikator.nip,
      verifikatorNama: verifikator.nama,
      verifikatorJabatan: verifikator.jabatan,
      verifikatorStatus: (finalStatus === "disetujui" || finalStatus === "menunggu_pimpinan") ? "disetujui" : (finalStatus === "ditolak" ? "ditolak" : undefined),
      verifikatorNotes: verifikatorNotes || ((finalStatus === "disetujui" || finalStatus === "menunggu_pimpinan") ? "Disetujui oleh Admin" : undefined),
      verifikatorDate: (finalStatus === "disetujui" || finalStatus === "menunggu_pimpinan") ? actionDate : undefined,
      verifikatorSignature: (finalStatus === "disetujui" || finalStatus === "menunggu_pimpinan") ? (verifikator.signature || "placeholder") : undefined,

      pimpinanNip: pimpinan.nip,
      pimpinanNama: pimpinan.nama,
      pimpinanJabatan: pimpinan.jabatan,
      pimpinanStatus: finalStatus === "disetujui" ? "disetujui" : (finalStatus === "ditolak" ? "ditolak" : undefined),
      pimpinanNotes: pimpinanNotes || (finalStatus === "disetujui" ? "Disetujui oleh Admin" : undefined),
      pimpinanDate: finalStatus === "disetujui" ? actionDate : undefined,
      pimpinanSignature: finalStatus === "disetujui" ? (pimpinan.signature || "placeholder") : undefined,

      pemohonSignature: user.signature || "placeholder",
      createdAt: new Date().toISOString()
    };

    await saveLeave(newRequest);

    // Send notifications
    await sendNotification(
      user.nip,
      "Cuti Diinput oleh Admin",
      `Data cuti Anda telah diinput oleh Admin dengan status: ${finalStatus.replace("_", " ")}.`
    );

    if (finalStatus === "menunggu_verifikasi") {
      await sendNotification(
        verifikator.nip,
        "Pengajuan Cuti Baru",
        `${user.nama} memiliki pengajuan cuti baru yang diinput oleh Admin dan memerlukan verifikasi Anda.`
      );
    } else if (finalStatus === "menunggu_pimpinan") {
      await sendNotification(
        pimpinan.nip,
        "Persetujuan Cuti Baru",
        `${user.nama} memiliki pengajuan cuti baru yang telah diverifikasi dan menunggu persetujuan Anda.`
      );
    }

    res.json({ success: true, leaveRequest: newRequest, message: "Pengajuan cuti berhasil diinput oleh Admin." });
  });

  // 3. Authenticate User
  app.post("/api/auth/login", async (req, res) => {
    const { nip, password } = req.body;
    
    if (!nip || !password) {
      return res.status(400).json({ error: "NIP dan Password harus diisi." });
    }

    const user = await getUser(String(nip));
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "NIP atau Password salah." });
    }

    // Return authenticated user metadata safely
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  });

  // 4. Change Password
  app.post("/api/auth/change-password", async (req, res) => {
    const { nip, oldPassword, newPassword } = req.body;

    if (!nip || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Semua field harus diisi." });
    }

    const user = await getUser(String(nip));
    
    if (!user) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    if (user.password !== oldPassword) {
      return res.status(400).json({ error: "Password lama salah." });
    }

    user.password = newPassword;
    await saveUser(user);

    res.json({ success: true, message: "Password berhasil diubah." });
  });

  // 4b. Update Digital Signature
  app.post("/api/user/update-signature", async (req, res) => {
    const { nip, signature } = req.body;

    if (!nip || signature === undefined) {
      return res.status(400).json({ error: "NIP dan signature harus diisi." });
    }

    const user = await getUser(String(nip));
    if (!user) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    user.signature = signature;
    await saveUser(user);

    // Return the updated user info safely
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, message: "Tanda tangan digital berhasil diperbarui." });
  });

  // 5. Submit Leave Request (Pengajuan Cuti)
  app.post("/api/leave/submit", async (req, res) => {
    const { 
      nip, 
      jenisCuti, 
      alasan, 
      lamaHari, 
      tanggalMulai, 
      tanggalSelesai, 
      alamatCuti, 
      telepon,
      verifikatorNip,
      pimpinanNip,
      catatanCuti
    } = req.body;

    if (!nip || !jenisCuti || !alasan || !lamaHari || !tanggalMulai || !tanggalSelesai || !alamatCuti || !telepon || !verifikatorNip || !pimpinanNip) {
      return res.status(400).json({ error: "Formulir pengajuan belum lengkap." });
    }

    const user = await getUser(String(nip));
    if (!user) {
      return res.status(404).json({ error: "Pegawai pengaju tidak ditemukan." });
    }

    const verifikator = await getUser(String(verifikatorNip));
    if (!verifikator) {
      return res.status(404).json({ error: "Atasan / Verifikator tidak ditemukan." });
    }

    const pimpinan = await getUser(String(pimpinanNip));
    if (!pimpinan) {
      return res.status(404).json({ error: "Pimpinan yang berwenang tidak ditemukan." });
    }

    const newRequest: LeaveRequest = {
      id: `cuti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      nip: user.nip,
      nama: user.nama,
      jabatan: user.jabatan,
      unitKerja: user.unit_kerja,
      pangkatGol: user.pangkatGol || "Penata (III/c)",
      jenisCuti,
      alasan,
      lamaHari: Number(lamaHari),
      tanggalMulai,
      tanggalSelesai,
      alamatCuti,
      telepon,
      catatanCuti: catatanCuti || {
        tahunan: { nMinus2: "-", nMinus1: "-", n: "12" },
        besar: "-",
        sakit: "-",
        melahirkan: "-",
        alasanPenting: "-",
        luarTanggungan: "-"
      },
      status: "menunggu_verifikasi",
      verifikatorNip: verifikator.nip,
      verifikatorNama: verifikator.nama,
      verifikatorJabatan: verifikator.jabatan,
      pimpinanNip: pimpinan.nip,
      pimpinanNama: pimpinan.nama,
      pimpinanJabatan: pimpinan.jabatan,
      pemohonSignature: user.signature || "",
      createdAt: new Date().toISOString()
    };

    await saveLeave(newRequest);

    // Send real-time notification to Verifikator
    await sendNotification(
      verifikator.nip, 
      "Pengajuan Cuti Baru", 
      `${user.nama} mengajukan cuti ${jenisCuti.replace("_", " ")} selama ${lamaHari} hari mulai tanggal ${tanggalMulai}.`
    );

    // Send notification to the submitter as a confirmation
    await sendNotification(
      user.nip,
      "Pengajuan Cuti Terkirim",
      `Cuti Anda berhasil diajukan dan sedang menunggu verifikasi oleh ${verifikator.nama}.`
    );

    res.json({ success: true, leaveRequest: newRequest });
  });

  // 6. Fetch Leave Requests (Berjenjang: Sesuai NIP / Role)
  app.get("/api/leave/list", async (req, res) => {
    const { nip, role } = req.query;

    if (!nip || !role) {
      return res.status(400).json({ error: "NIP dan Role diperlukan." });
    }

    const clientNip = String(nip);
    const clientRole = String(role);

    const leavesList = await getAllLeaves();
    let filteredLeaves = [...leavesList];

    if (clientRole === "pegawai") {
      // Employees only see their own requests
      filteredLeaves = leavesList.filter(l => l.nip === clientNip);
    } else if (clientRole === "verifikator") {
      // Verifiers see:
      // 1. Requests pending their verifications
      // 2. Their own personal leave requests
      // 3. Requests they already actioned
      filteredLeaves = leavesList.filter(l => l.verifikatorNip === clientNip || l.nip === clientNip);
    } else if (clientRole === "pimpinan") {
      // Leaders see:
      // 1. Requests that are approved by Verifikator (menunggu_pimpinan) and assigned to them
      // 2. All requests assigned to them for tracking
      // 3. Their own personal leave requests
      filteredLeaves = leavesList.filter(l => l.pimpinanNip === clientNip || l.nip === clientNip);
    } else if (clientRole === "admin") {
      // Admins see everything for reports
      filteredLeaves = leavesList;
    }

    res.json(filteredLeaves);
  });

  // 7. Action on Leave (Approve / Reject / Defer / Changes by Verifier or Leader)
  app.post("/api/leave/action", async (req, res) => {
    const { leaveId, actorNip, actorRole, action, notes } = req.body;

    if (!leaveId || !actorNip || !actorRole || !action) {
      return res.status(400).json({ error: "Informasi action kurang lengkap." });
    }

    const leave = await getLeave(leaveId);
    if (!leave) {
      return res.status(404).json({ error: "Pengajuan cuti tidak ditemukan." });
    }

    const actor = await getUser(String(actorNip));
    if (!actor) {
      return res.status(404).json({ error: "Pelaku persetujuan tidak ditemukan." });
    }

    const formattedActionDate = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    if (actorRole === "verifikator") {
      if (leave.verifikatorNip !== actor.nip) {
        return res.status(403).json({ error: "Anda tidak berwenang memverifikasi pengajuan ini." });
      }

      leave.verifikatorStatus = action;
      leave.verifikatorNotes = notes || "-";
      leave.verifikatorDate = formattedActionDate;
      leave.verifikatorSignature = actor.signature || "";

      if (action === "disetujui") {
        leave.status = "menunggu_pimpinan";
        
        // Notify pimpinan
        await sendNotification(
          leave.pimpinanNip!,
          "Verifikasi Cuti Selesai",
          `Pengajuan cuti ${leave.nama} telah diverifikasi oleh ${actor.nama} and menunggu persetujuan Anda.`
        );

        // Notify pegawai
        await sendNotification(
          leave.nip,
          "Pengajuan Cuti Diverifikasi",
          `Cuti Anda telah disetujui/diverifikasi oleh Atasan ${actor.nama}. Sekarang menunggu persetujuan Pimpinan ${leave.pimpinanNama}.`
        );
      } else {
        // rejected, deferred, or requested changes
        const statusMap: Record<string, LeaveStatus> = {
          ditolak: "ditolak",
          ditangguhkan: "ditangguhkan",
          perubahan: "perubahan"
        };
        leave.status = statusMap[action] || "ditolak";

        // Notify pegawai
        await sendNotification(
          leave.nip,
          `Pengajuan Cuti ${action.toUpperCase()}`,
          `Pengajuan cuti Anda telah ditandai sebagai '${action}' oleh Atasan ${actor.nama} dengan catatan: "${notes || '-'}"`
        );
      }

    } else if (actorRole === "pimpinan") {
      if (leave.pimpinanNip !== actor.nip) {
        return res.status(403).json({ error: "Anda tidak berwenang memberikan persetujuan pada pengajuan ini." });
      }

      leave.pimpinanStatus = action;
      leave.pimpinanNotes = notes || "-";
      leave.pimpinanDate = formattedActionDate;
      leave.pimpinanSignature = actor.signature || "";

      // Final statuses
      const statusMap: Record<string, LeaveStatus> = {
        disetujui: "disetujui",
        ditolak: "ditolak",
        ditangguhkan: "ditangguhkan",
        perubahan: "perubahan"
      };
      leave.status = statusMap[action] || "ditolak";

      // Notify pegawai
      await sendNotification(
        leave.nip,
        `Keputusan Final Cuti: ${action.toUpperCase()}`,
        `Pengajuan cuti Anda telah '${action}' oleh Pimpinan ${actor.nama}. Catatan: "${notes || '-'}"`
      );

      // Notify verifikator
      await sendNotification(
        leave.verifikatorNip!,
        "Keputusan Final Cuti",
        `Cuti atas nama ${leave.nama} yang Anda verifikasi telah '${action}' oleh Pimpinan ${actor.nama}.`
      );
    } else {
      return res.status(403).json({ error: "Role Anda tidak berwenang melakukan action ini." });
    }

    await saveLeave(leave);
    res.json({ success: true, leaveRequest: leave });
  });

  // 8. Fetch Notifications
  app.get("/api/notifications", async (req, res) => {
    const { nip } = req.query;
    if (!nip) {
      return res.status(400).json({ error: "NIP diperlukan." });
    }
    const userNotifs = await getNotificationsForNip(String(nip));
    res.json(userNotifs);
  });

  // 9. Mark notifications as read
  app.post("/api/notifications/read", async (req, res) => {
    const { nip } = req.body;
    if (!nip) {
      return res.status(400).json({ error: "NIP diperlukan." });
    }

    await markAllNotificationsAsRead(String(nip));
    res.json({ success: true });
  });

  // 10. SSE endpoint for real-time notifications streaming
  app.get("/api/notifications/stream", (req, res) => {
    const { nip } = req.query;
    if (!nip) {
      return res.status(400).json({ error: "NIP diperlukan." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const clientNip = String(nip);
    const clientId = `${clientNip}_${Date.now()}`;

    // Register active client
    const newClient: SSEClient = { id: clientId, nip: clientNip, res };
    sseClients.push(newClient);

    // Keep connection alive by sending comments periodically
    const keepAliveTimer = setInterval(() => {
      res.write(": keep-alive\n\n");
    }, 30000);

    req.on("close", () => {
      clearInterval(keepAliveTimer);
      sseClients = sseClients.filter(c => c.id !== clientId);
    });
  });

  // 11. Generate Stats for Dashboard Report
  app.get("/api/reports/stats", async (req, res) => {
    const leavesList = await getAllLeaves();
    const stats = {
      totalLeaves: leavesList.length,
      tahunan: leavesList.filter(l => l.jenisCuti === "tahunan").length,
      besar: leavesList.filter(l => l.jenisCuti === "besar").length,
      sakit: leavesList.filter(l => l.jenisCuti === "sakit").length,
      melahirkan: leavesList.filter(l => l.jenisCuti === "melahirkan").length,
      alasanPenting: leavesList.filter(l => l.jenisCuti === "alasan_penting").length,
      luarTanggungan: leavesList.filter(l => l.jenisCuti === "luar_tanggungan").length,
      
      disetujui: leavesList.filter(l => l.status === "disetujui").length,
      ditolak: leavesList.filter(l => l.status === "ditolak").length,
      ditangguhkan: leavesList.filter(l => l.status === "ditangguhkan").length,
      perubahan: leavesList.filter(l => l.status === "perubahan").length,
      menungguVerifikasi: leavesList.filter(l => l.status === "menunggu_verifikasi").length,
      menungguPimpinan: leavesList.filter(l => l.status === "menunggu_pimpinan").length,
    };
    res.json(stats);
  });

  // 11b. Public Verification Endpoint for QR Code scans
  app.get("/api/leave/verify/:id", async (req, res) => {
    const { id } = req.params;
    const leave = await getLeave(id);
    if (!leave) {
      return res.status(404).json({ error: "Dokumen cuti tidak ditemukan." });
    }
    res.json(leave);
  });

  // 12. Reset Database (Useful for Demo / Admin purposes)
  app.post("/api/admin/reset", async (req, res) => {
    const { key } = req.body;
    if (key === "basarnas_demo_reset") {
      if (isFirebaseEnabled && db) {
        try {
          // Clear and seed Firestore
          const usersCol = collection(db, "users");
          const usersSnap = await getDocs(usersCol);
          for (const d of usersSnap.docs) {
            await deleteDoc(doc(db, "users", d.id));
          }
          for (const user of SEED_USERS) {
            await setDoc(doc(db, "users", user.nip), user);
          }

          const unitsCol = collection(db, "units");
          const unitsSnap = await getDocs(unitsCol);
          for (const d of unitsSnap.docs) {
            await deleteDoc(doc(db, "units", d.id));
          }
          for (const unit of SEED_UNITS) {
            await setDoc(doc(db, "units", unit.id), unit);
          }

          const leavesCol = collection(db, "leaves");
          const leavesSnap = await getDocs(leavesCol);
          for (const d of leavesSnap.docs) {
            await deleteDoc(doc(db, "leaves", d.id));
          }

          const notifsCol = collection(db, "notifications");
          const notifsSnap = await getDocs(notifsCol);
          for (const d of notifsSnap.docs) {
            await deleteDoc(doc(db, "notifications", d.id));
          }

          console.log("Firestore successfully reset!");
        } catch (err) {
          console.error("Error resetting Firestore database:", err);
          return res.status(500).json({ error: "Gagal mereset database cloud." });
        }
      } else {
        // Local files reset
        writeDb(USERS_FILE, SEED_USERS);
        writeDb(UNITS_FILE, SEED_UNITS);
        writeDb(LEAVES_FILE, []);
        writeDb(NOTIFICATIONS_FILE, []);
      }
      return res.json({ success: true, message: "Sistem berhasil di-reset ke data bawaan." });
    }
    res.status(403).json({ error: "Kunci otorisasi tidak valid." });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
