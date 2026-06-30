import { initializeApp, getApp, getApps } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  updateDoc,
  query,
  where,
  orderBy
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { User, UnitKerja, LeaveRequest, Notification } from "../types";

// Initialize Firebase client-side
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Seed data to initialize Firestore directly from client if empty
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

// Seed databases if empty
export async function verifyAndSeedDb(): Promise<void> {
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    if (usersSnap.empty) {
      console.log("Firestore 'users' is empty client-side. Initializing seed data...");
      for (const u of SEED_USERS) {
        await setDoc(doc(db, "users", u.nip), u);
      }
    }

    const unitsSnap = await getDocs(collection(db, "units"));
    if (unitsSnap.empty) {
      console.log("Firestore 'units' is empty client-side. Initializing seed data...");
      for (const un of SEED_UNITS) {
        await setDoc(doc(db, "units", un.id), un);
      }
    }
  } catch (err) {
    console.error("Error auto-seeding client-side:", err);
  }
}

// ==========================================
// 1. Users DB Functions
// ==========================================
export async function getUsersDirect(): Promise<User[]> {
  await verifyAndSeedDb();
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => d.data() as User);
}

export async function getUserDirect(nip: string): Promise<User | null> {
  await verifyAndSeedDb();
  const dRef = doc(db, "users", String(nip));
  const snap = await getDoc(dRef);
  if (snap.exists()) {
    return snap.data() as User;
  }
  // Fallback to local SEED list
  return SEED_USERS.find(u => u.nip === String(nip)) || null;
}

export async function saveUserDirect(user: User): Promise<void> {
  await verifyAndSeedDb();
  await setDoc(doc(db, "users", user.nip), user);
}

export async function deleteUserDirect(nip: string): Promise<void> {
  await verifyAndSeedDb();
  await deleteDoc(doc(db, "users", String(nip)));
}

// ==========================================
// 2. Units DB Functions
// ==========================================
export async function getUnitsDirect(): Promise<UnitKerja[]> {
  await verifyAndSeedDb();
  const snap = await getDocs(collection(db, "units"));
  return snap.docs.map(d => d.data() as UnitKerja);
}

export async function saveUnitDirect(unit: UnitKerja): Promise<void> {
  await verifyAndSeedDb();
  await setDoc(doc(db, "units", unit.id), unit);
}

export async function deleteUnitDirect(id: string): Promise<void> {
  await verifyAndSeedDb();
  await deleteDoc(doc(db, "units", String(id)));
}

// ==========================================
// 3. Leaves DB Functions
// ==========================================
export async function getLeavesDirect(nip?: string, role?: string): Promise<LeaveRequest[]> {
  await verifyAndSeedDb();
  const snap = await getDocs(collection(db, "leaves"));
  let list = snap.docs.map(d => d.data() as LeaveRequest);
  
  // Sort by createdAt descending
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (nip && role) {
    if (role === "pegawai") {
      return list.filter(l => l.nip === String(nip));
    } else if (role === "verifikator") {
      // Verifikators can view leaves from their unit or that are pending
      return list;
    } else if (role === "pimpinan") {
      // Pimpinan can view all leaves
      return list;
    }
  }
  return list;
}

export async function saveLeaveDirect(leave: LeaveRequest): Promise<void> {
  await verifyAndSeedDb();
  await setDoc(doc(db, "leaves", leave.id), leave);
}

export async function deleteLeaveDirect(id: string): Promise<void> {
  await verifyAndSeedDb();
  await deleteDoc(doc(db, "leaves", String(id)));
}

// ==========================================
// 4. Notifications DB Functions
// ==========================================
export async function getNotificationsDirect(nip: string): Promise<Notification[]> {
  await verifyAndSeedDb();
  const snap = await getDocs(collection(db, "notifications"));
  let list = snap.docs.map(d => d.data() as Notification);
  
  // Sort by createdAt descending
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return list.filter(n => n.nip === String(nip));
}

export async function saveNotificationDirect(notif: Notification): Promise<void> {
  await verifyAndSeedDb();
  await setDoc(doc(db, "notifications", notif.id), notif);
}

export async function triggerNotificationDirect(nip: string, title: string, message: string): Promise<Notification> {
  const newNotif: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    nip: String(nip),
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  await saveNotificationDirect(newNotif);
  return newNotif;
}

export async function markAllNotificationsAsReadDirect(nip: string): Promise<void> {
  await verifyAndSeedDb();
  const snap = await getDocs(collection(db, "notifications"));
  for (const d of snap.docs) {
    const notif = d.data() as Notification;
    if (notif.nip === String(nip) && !notif.isRead) {
      await updateDoc(doc(db, "notifications", d.id), { isRead: true });
    }
  }
}

// ==========================================
// 5. System Reset Function
// ==========================================
export async function resetDatabaseDirect(): Promise<void> {
  // Reset all collections to their seed values
  try {
    // 1. Delete users and re-write
    const usersSnap = await getDocs(collection(db, "users"));
    for (const d of usersSnap.docs) {
      await deleteDoc(doc(db, "users", d.id));
    }
    for (const u of SEED_USERS) {
      await setDoc(doc(db, "users", u.nip), u);
    }

    // 2. Delete units and re-write
    const unitsSnap = await getDocs(collection(db, "units"));
    for (const d of unitsSnap.docs) {
      await deleteDoc(doc(db, "units", d.id));
    }
    for (const un of SEED_UNITS) {
      await setDoc(doc(db, "units", un.id), un);
    }

    // 3. Clear leaves
    const leavesSnap = await getDocs(collection(db, "leaves"));
    for (const d of leavesSnap.docs) {
      await deleteDoc(doc(db, "leaves", d.id));
    }

    // 4. Clear notifications
    const notificationsSnap = await getDocs(collection(db, "notifications"));
    for (const d of notificationsSnap.docs) {
      await deleteDoc(doc(db, "notifications", d.id));
    }
  } catch (err) {
    console.error("Error resetting database client-side:", err);
    throw err;
  }
}
