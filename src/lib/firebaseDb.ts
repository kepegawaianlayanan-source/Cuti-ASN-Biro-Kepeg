import { initializeApp, getApp, getApps } from "firebase/app";
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
import firebaseConfig from "../../firebase-applet-config.json";
import { User, UnitKerja, LeaveRequest, Notification } from "../types";

// Initialize Firebase client-side
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Connect to the correct, dedicated Firestore Database ID from configuration
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

// ==========================================
// 1. Users DB Functions
// ==========================================
export async function getUsersDirect(): Promise<User[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map(d => d.data() as User);
}

export async function getUserDirect(nip: string): Promise<User | null> {
  const dRef = doc(db, "users", String(nip));
  const snap = await getDoc(dRef);
  if (snap.exists()) {
    return snap.data() as User;
  }
  return null;
}

export async function saveUserDirect(user: User): Promise<void> {
  await setDoc(doc(db, "users", user.nip), user);
}

export async function deleteUserDirect(nip: string): Promise<void> {
  await deleteDoc(doc(db, "users", String(nip)));
}

// ==========================================
// 2. Units DB Functions
// ==========================================
export async function getUnitsDirect(): Promise<UnitKerja[]> {
  const snap = await getDocs(collection(db, "units"));
  return snap.docs.map(d => d.data() as UnitKerja);
}

export async function saveUnitDirect(unit: UnitKerja): Promise<void> {
  await setDoc(doc(db, "units", unit.id), unit);
}

export async function deleteUnitDirect(id: string): Promise<void> {
  await deleteDoc(doc(db, "units", String(id)));
}

// ==========================================
// 3. Leaves DB Functions
// ==========================================
export async function getLeavesDirect(nip?: string, role?: string): Promise<LeaveRequest[]> {
  const snap = await getDocs(collection(db, "leaves"));
  let list = snap.docs.map(d => d.data() as LeaveRequest);
  
  // Sort by createdAt descending
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (nip && role) {
    if (role === "pegawai") {
      return list.filter(l => l.nip === String(nip));
    } else if (role === "verifikator") {
      return list.filter(l => l.verifikatorNip?.trim() === String(nip).trim());
    } else if (role === "pimpinan") {
      return list.filter(l => l.pimpinanNip?.trim() === String(nip).trim());
    }
  }
  return list;
}

export async function saveLeaveDirect(leave: LeaveRequest): Promise<void> {
  await setDoc(doc(db, "leaves", leave.id), leave);
}

export async function deleteLeaveDirect(id: string): Promise<void> {
  await deleteDoc(doc(db, "leaves", String(id)));
}

// ==========================================
// 4. Notifications DB Functions
// ==========================================
export async function getNotificationsDirect(nip: string): Promise<Notification[]> {
  const snap = await getDocs(collection(db, "notifications"));
  let list = snap.docs.map(d => d.data() as Notification);
  
  // Sort by createdAt descending
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  return list.filter(n => n.nip === String(nip));
}

export async function saveNotificationDirect(notif: Notification): Promise<void> {
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
  const snap = await getDocs(collection(db, "notifications"));
  for (const d of snap.docs) {
    const notif = d.data() as Notification;
    if (notif.nip === String(nip) && !notif.isRead) {
      await updateDoc(doc(db, "notifications", d.id), { isRead: true });
    }
  }
}

// ==========================================
// 5. System Reset Function (Safely Clears Transactions only)
// ==========================================
export async function resetDatabaseDirect(): Promise<void> {
  try {
    // Clear all leaves
    const leavesSnap = await getDocs(collection(db, "leaves"));
    for (const d of leavesSnap.docs) {
      await deleteDoc(doc(db, "leaves", d.id));
    }

    // Clear all notifications
    const notificationsSnap = await getDocs(collection(db, "notifications"));
    for (const d of notificationsSnap.docs) {
      await deleteDoc(doc(db, "notifications", d.id));
    }
  } catch (err) {
    console.error("Error resetting database client-side:", err);
    throw err;
  }
}
