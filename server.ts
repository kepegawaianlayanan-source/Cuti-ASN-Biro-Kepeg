/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { User, LeaveRequest, Notification, LeaveStatus, LeaveType, UnitKerja } from "./src/types";

// Setup standard paths
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEAVES_FILE = path.join(DATA_DIR, "leaves.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const UNITS_FILE = path.join(DATA_DIR, "units.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
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

// Helper to read JSON database safely
function readDb<T>(filePath: string, defaultData: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as T;
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  // If doesn't exist or errored, write and return default
  writeDb(filePath, defaultData);
  return defaultData;
}

// Helper to write JSON database safely
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

// Load databases
let users: User[] = readDb<User[]>(USERS_FILE, SEED_USERS);
let leaves: LeaveRequest[] = readDb<LeaveRequest[]>(LEAVES_FILE, []);
let notifications: Notification[] = readDb<Notification[]>(NOTIFICATIONS_FILE, []);
let units: UnitKerja[] = readDb<UnitKerja[]>(UNITS_FILE, SEED_UNITS);

// Real-time SSE Connection Clients
interface SSEClient {
  id: string;
  nip: string;
  res: express.Response;
}
let sseClients: SSEClient[] = [];

// Helper to trigger and store notifications
function sendNotification(nip: string, title: string, message: string) {
  const newNotification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    nip,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  
  notifications.unshift(newNotification);
  writeDb(NOTIFICATIONS_FILE, notifications);

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

  // Middleware for body parsing
  app.use(express.json());

  // ----------------------------------------------------
  // API Endpoints
  // ----------------------------------------------------

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", usersCount: users.length, leavesCount: leaves.length });
  });

  // 2. Fetch all users (NIP and metadata, passwords hidden for safety)
  app.get("/api/users", (req, res) => {
    const safeUsers = users.map(({ password, ...rest }) => rest);
    res.json(safeUsers);
  });

  // 2b. Unit Kerja CRUD Endpoints
  app.get("/api/units", (req, res) => {
    res.json(units);
  });

  app.post("/api/units", (req, res) => {
    const { nama, kategori } = req.body;
    if (!nama) {
      return res.status(400).json({ error: "Nama unit kerja harus diisi." });
    }
    const newUnit: UnitKerja = {
      id: String(Date.now()),
      nama,
      kategori: kategori || 'Kantor Pusat'
    };
    units.push(newUnit);
    writeDb(UNITS_FILE, units);
    res.status(201).json({ success: true, unit: newUnit, message: "Unit kerja berhasil ditambahkan." });
  });

  app.put("/api/units/:id", (req, res) => {
    const { id } = req.params;
    const { nama, kategori } = req.body;
    if (!nama) {
      return res.status(400).json({ error: "Nama unit kerja harus diisi." });
    }
    const index = units.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Unit kerja tidak ditemukan." });
    }
    units[index].nama = nama;
    if (kategori) {
      units[index].kategori = kategori;
    }
    writeDb(UNITS_FILE, units);
    res.json({ success: true, unit: units[index], message: "Unit kerja berhasil diperbarui." });
  });

  app.delete("/api/units/:id", (req, res) => {
    const { id } = req.params;
    const index = units.findIndex(u => u.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Unit kerja tidak ditemukan." });
    }
    const deletedUnit = units.splice(index, 1)[0];
    writeDb(UNITS_FILE, units);
    res.json({ success: true, unit: deletedUnit, message: "Unit kerja berhasil dihapus." });
  });

  // 2c. User Management Admin Endpoints
  app.post("/api/admin/users", (req, res) => {
    const { nip, nama, role, unit_kerja, jabatan, eselon, pangkatGol, password } = req.body;
    if (!nip || !nama || !role || !unit_kerja || !jabatan) {
      return res.status(400).json({ error: "Kolom NIP, Nama, Role, Unit Kerja, dan Jabatan wajib diisi." });
    }

    // Check if NIP already exists
    const exists = users.some(u => u.nip === String(nip));
    if (exists) {
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

    users.push(newUser);
    writeDb(USERS_FILE, users);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json({ success: true, user: safeUser, message: "Pegawai berhasil ditambahkan." });
  });

  app.put("/api/admin/users/:nip", (req, res) => {
    const { nip } = req.params;
    const { nama, role, unit_kerja, jabatan, eselon, pangkatGol, password } = req.body;

    const index = users.findIndex(u => u.nip === nip);
    if (index === -1) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    if (nama) users[index].nama = nama;
    if (role) users[index].role = role;
    if (unit_kerja) users[index].unit_kerja = unit_kerja;
    if (jabatan) users[index].jabatan = jabatan;
    if (eselon !== undefined) users[index].eselon = eselon;
    if (pangkatGol !== undefined) users[index].pangkatGol = pangkatGol;
    if (password) users[index].password = password;

    writeDb(USERS_FILE, users);

    const { password: _, ...safeUser } = users[index];
    res.json({ success: true, user: safeUser, message: "Data pegawai berhasil diperbarui." });
  });

  app.delete("/api/admin/users/:nip", (req, res) => {
    const { nip } = req.params;
    const index = users.findIndex(u => u.nip === nip);
    if (index === -1) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    const deletedUser = users.splice(index, 1)[0];
    writeDb(USERS_FILE, users);

    const { password: _, ...safeUser } = deletedUser;
    res.json({ success: true, user: safeUser, message: "Pegawai berhasil dihapus dari sistem." });
  });

  // 3. Authenticate User
  app.post("/api/auth/login", (req, res) => {
    const { nip, password } = req.body;
    
    if (!nip || !password) {
      return res.status(400).json({ error: "NIP dan Password harus diisi." });
    }

    const user = users.find(u => u.nip === String(nip));
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: "NIP atau Password salah." });
    }

    // Return authenticated user metadata safely
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  });

  // 4. Change Password
  app.post("/api/auth/change-password", (req, res) => {
    const { nip, oldPassword, newPassword } = req.body;

    if (!nip || !oldPassword || !newPassword) {
      return res.status(400).json({ error: "Semua field harus diisi." });
    }

    const userIndex = users.findIndex(u => u.nip === String(nip));
    
    if (userIndex === -1) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    if (users[userIndex].password !== oldPassword) {
      return res.status(400).json({ error: "Password lama salah." });
    }

    users[userIndex].password = newPassword;
    writeDb(USERS_FILE, users);

    res.json({ success: true, message: "Password berhasil diubah." });
  });

  // 4b. Update Digital Signature
  app.post("/api/user/update-signature", (req, res) => {
    const { nip, signature } = req.body;

    if (!nip || signature === undefined) {
      return res.status(400).json({ error: "NIP dan signature harus diisi." });
    }

    const userIndex = users.findIndex(u => u.nip === String(nip));
    if (userIndex === -1) {
      return res.status(404).json({ error: "Pegawai tidak ditemukan." });
    }

    users[userIndex].signature = signature;
    writeDb(USERS_FILE, users);

    // Return the updated user info safely
    const { password: _, ...safeUser } = users[userIndex];
    res.json({ success: true, user: safeUser, message: "Tanda tangan digital berhasil diperbarui." });
  });

  // 5. Submit Leave Request (Pengajuan Cuti)
  app.post("/api/leave/submit", (req, res) => {
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

    const user = users.find(u => u.nip === String(nip));
    if (!user) {
      return res.status(404).json({ error: "Pegawai pengaju tidak ditemukan." });
    }

    const verifikator = users.find(u => u.nip === String(verifikatorNip));
    if (!verifikator) {
      return res.status(404).json({ error: "Atasan / Verifikator tidak ditemukan." });
    }

    const pimpinan = users.find(u => u.nip === String(pimpinanNip));
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

    leaves.unshift(newRequest);
    writeDb(LEAVES_FILE, leaves);

    // Send real-time notification to Verifikator
    sendNotification(
      verifikator.nip, 
      "Pengajuan Cuti Baru", 
      `${user.nama} mengajukan cuti ${jenisCuti.replace("_", " ")} selama ${lamaHari} hari mulai tanggal ${tanggalMulai}.`
    );

    // Send notification to the submitter as a confirmation
    sendNotification(
      user.nip,
      "Pengajuan Cuti Terkirim",
      `Cuti Anda berhasil diajukan dan sedang menunggu verifikasi oleh ${verifikator.nama}.`
    );

    res.json({ success: true, leaveRequest: newRequest });
  });

  // 6. Fetch Leave Requests (Berjenjang: Sesuai NIP / Role)
  app.get("/api/leave/list", (req, res) => {
    const { nip, role } = req.query;

    if (!nip || !role) {
      return res.status(400).json({ error: "NIP dan Role diperlukan." });
    }

    const clientNip = String(nip);
    const clientRole = String(role);

    let filteredLeaves = [...leaves];

    if (clientRole === "pegawai") {
      // Employees only see their own requests
      filteredLeaves = leaves.filter(l => l.nip === clientNip);
    } else if (clientRole === "verifikator") {
      // Verifiers see:
      // 1. Requests pending their verifications
      // 2. Their own personal leave requests
      // 3. Requests they already actioned
      filteredLeaves = leaves.filter(l => l.verifikatorNip === clientNip || l.nip === clientNip);
    } else if (clientRole === "pimpinan") {
      // Leaders see:
      // 1. Requests that are approved by Verifikator (menunggu_pimpinan) and assigned to them
      // 2. All requests assigned to them for tracking
      // 3. Their own personal leave requests
      filteredLeaves = leaves.filter(l => l.pimpinanNip === clientNip || l.nip === clientNip);
    } else if (clientRole === "admin") {
      // Admins see everything for reports
      filteredLeaves = leaves;
    }

    res.json(filteredLeaves);
  });

  // 7. Action on Leave (Approve / Reject / Defer / Changes by Verifier or Leader)
  app.post("/api/leave/action", (req, res) => {
    const { leaveId, actorNip, actorRole, action, notes } = req.body;

    if (!leaveId || !actorNip || !actorRole || !action) {
      return res.status(400).json({ error: "Informasi action kurang lengkap." });
    }

    const leaveIndex = leaves.findIndex(l => l.id === leaveId);
    if (leaveIndex === -1) {
      return res.status(404).json({ error: "Pengajuan cuti tidak ditemukan." });
    }

    const leave = leaves[leaveIndex];
    const actor = users.find(u => u.nip === String(actorNip));
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
        sendNotification(
          leave.pimpinanNip!,
          "Verifikasi Cuti Selesai",
          `Pengajuan cuti ${leave.nama} telah diverifikasi oleh ${actor.nama} dan menunggu persetujuan Anda.`
        );

        // Notify pegawai
        sendNotification(
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
        sendNotification(
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
      sendNotification(
        leave.nip,
        `Keputusan Final Cuti: ${action.toUpperCase()}`,
        `Pengajuan cuti Anda telah '${action}' oleh Pimpinan ${actor.nama}. Catatan: "${notes || '-'}"`
      );

      // Notify verifikator
      sendNotification(
        leave.verifikatorNip!,
        "Keputusan Final Cuti",
        `Cuti atas nama ${leave.nama} yang Anda verifikasi telah '${action}' oleh Pimpinan ${actor.nama}.`
      );
    } else {
      return res.status(403).json({ error: "Role Anda tidak berwenang melakukan action ini." });
    }

    writeDb(LEAVES_FILE, leaves);
    res.json({ success: true, leaveRequest: leave });
  });

  // 8. Fetch Notifications
  app.get("/api/notifications", (req, res) => {
    const { nip } = req.query;
    if (!nip) {
      return res.status(400).json({ error: "NIP diperlukan." });
    }
    const userNotifs = notifications.filter(n => n.nip === String(nip));
    res.json(userNotifs);
  });

  // 9. Mark notifications as read
  app.post("/api/notifications/read", (req, res) => {
    const { nip } = req.body;
    if (!nip) {
      return res.status(400).json({ error: "NIP diperlukan." });
    }

    notifications.forEach(n => {
      if (n.nip === String(nip)) {
        n.isRead = true;
      }
    });

    writeDb(NOTIFICATIONS_FILE, notifications);
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
  app.get("/api/reports/stats", (req, res) => {
    const stats = {
      totalLeaves: leaves.length,
      tahunan: leaves.filter(l => l.jenisCuti === "tahunan").length,
      besar: leaves.filter(l => l.jenisCuti === "besar").length,
      sakit: leaves.filter(l => l.jenisCuti === "sakit").length,
      melahirkan: leaves.filter(l => l.jenisCuti === "melahirkan").length,
      alasanPenting: leaves.filter(l => l.jenisCuti === "alasan_penting").length,
      luarTanggungan: leaves.filter(l => l.jenisCuti === "luar_tanggungan").length,
      
      disetujui: leaves.filter(l => l.status === "disetujui").length,
      ditolak: leaves.filter(l => l.status === "ditolak").length,
      ditangguhkan: leaves.filter(l => l.status === "ditangguhkan").length,
      perubahan: leaves.filter(l => l.status === "perubahan").length,
      menungguVerifikasi: leaves.filter(l => l.status === "menunggu_verifikasi").length,
      menungguPimpinan: leaves.filter(l => l.status === "menunggu_pimpinan").length,
    };
    res.json(stats);
  });

  // 12. Reset Database (Useful for Demo / Admin purposes)
  app.post("/api/admin/reset", (req, res) => {
    const { key } = req.body;
    if (key === "basarnas_demo_reset") {
      users = JSON.parse(JSON.stringify(SEED_USERS));
      units = JSON.parse(JSON.stringify(SEED_UNITS));
      leaves = [];
      notifications = [];
      writeDb(USERS_FILE, users);
      writeDb(UNITS_FILE, units);
      writeDb(LEAVES_FILE, leaves);
      writeDb(NOTIFICATIONS_FILE, notifications);
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
