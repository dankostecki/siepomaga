import React, { useState, useEffect, useMemo } from 'react';
import {
  Menu,
  Plus,
  X,
  ChevronUp,
  ChevronDown,
  Trash2,
  Edit2,
  Activity,
  Bike,
  Footprints,
  AlertTriangle,
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- CUSTOM ICON: ROLLER SKATE ---
const RollerSkateIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 17h14" />
    <circle cx="8" cy="20" r="1.5" />
    <circle cx="16" cy="20" r="1.5" />
    <path d="M5 17V9a2 2 0 0 1 2-2h3.5L15 14h3a1 1 0 0 1 1 1v2" />
    <path d="M10 7V5" />
  </svg>
);

// --- CONFIGURATION ---
const GOAL_KM = 6000;
const STEP_TO_KM = 0.00072;
const PIN_HASH = 'f32f613fca81c87052af842eaac5585812d884030a3af1e1cd2d06863d79ad1c';

// CUSTOM CONFIGURATION
const MY_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAwbBh-n-PeolpVTXIn9olXDduvJ5u4Lmo',
  authDomain: 'siepomagacmc.firebaseapp.com',
  projectId: 'siepomagacmc',
  storageBucket: 'siepomagacmc.firebasestorage.app',
  messagingSenderId: '602991751883',
  appId: '1:602991751883:web:c6272aa966539865ec614e',
};

let app, auth, db, appIdStr;
try {
  // Auto-detect environment (Canvas vs self-hosted)
  const configToUse =
    typeof __firebase_config !== 'undefined'
      ? JSON.parse(__firebase_config)
      : MY_FIREBASE_CONFIG;
  app = initializeApp(configToUse);
  auth = getAuth(app);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
  appIdStr = typeof __app_id !== 'undefined' ? __app_id : 'my-sports-app-v1';
} catch (e) {
  console.error('Firebase init error:', e);
}

// --- HELPER COMPONENTS ---
const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyle =
    'font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center gap-2 rounded-md';
  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 active:scale-95 active:bg-blue-800',
    outline:
      'border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 active:scale-95 active:bg-slate-100',
    ghost:
      'text-slate-600 hover:text-blue-600 hover:bg-slate-100 p-2 active:scale-95 active:bg-slate-200',
    danger:
      'border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 active:scale-95 active:bg-red-100',
  };
  return (
    <button
      onClick={onClick}
      className={`${baseStyle} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const formatKm = (value) => {
  return Number(value).toFixed(2);
};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// --- PIN SCREEN ---
function PinScreen({ onSuccess }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hash = await sha256(pin);
    if (hash === PIN_HASH) {
      localStorage.setItem('cmcPinVerified', 'true');
      onSuccess();
    } else {
      setError(true);
      setShaking(true);
      setPin('');
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div
        className={`bg-white rounded-2xl shadow-2xl p-8 w-full max-w-xs mx-4 text-center ${shaking ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
        style={shaking ? { animation: 'shake 0.4s ease-in-out' } : {}}
      >
        <div className="mb-6">
          <div className="w-12 h-12 bg-[#111827] rounded-xl mx-auto flex items-center justify-center mb-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">CMC Markets</h2>
          <p className="text-sm text-slate-500 mt-1">SiePomaga Charity Challenge</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={20}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(false); }}
              placeholder="Enter PIN"
              autoFocus
              className={`w-full text-center text-2xl tracking-[0.5em] border-2 rounded-xl px-4 py-3 outline-none transition-colors ${
                error
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-slate-200 focus:border-blue-500 text-slate-900'
              }`}
            />
            {error && (
              <p className="text-xs text-red-500 mt-2">Incorrect PIN. Try again.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={pin.length === 0}
            className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enter
          </button>
        </form>
      </div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
export default function App() {
  const [pinVerified, setPinVerified] = useState(
    () => localStorage.getItem('cmcPinVerified') === 'true'
  );
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ users: [], entries: [] });
  const [isCloudLoading, setIsCloudLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState(null);
  const [newUserName, setNewUserName] = useState('');
  const [editingUser, setEditingUser] = useState(null);

  // --- IDENTITY & ACCESS CONTROL ---
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cmcCurrentUser') || 'null'); }
    catch { return null; }
  });
  const [isAdmin, setIsAdmin] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [identityTarget, setIdentityTarget] = useState(null);
  const [addUserError, setAddUserError] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);

  // --- LOCAL ORDER (per-device, stored in localStorage) ---
  const [localOrder, setLocalOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cmcUserOrder') || '[]'); }
    catch { return []; }
  });

  const saveLocalOrder = (order) => {
    setLocalOrder(order);
    localStorage.setItem('cmcUserOrder', JSON.stringify(order));
  };

  const saveCurrentUser = (user) => {
    setCurrentUser(user);
    localStorage.setItem('cmcCurrentUser', JSON.stringify(user));
  };

  const handleRowClick = (userId) => {
    if (!currentUser) {
      setIdentityTarget(userId);
    } else {
      setActiveUserId(userId);
    }
  };

  // When Firebase adds users not yet in local order, append them
  useEffect(() => {
    const known = new Set(localOrder);
    const newIds = data.users.filter(u => !known.has(u.id)).map(u => u.id);
    if (newIds.length > 0) saveLocalOrder([...localOrder, ...newIds]);
  }, [data.users]);

  // Users sorted by local preference
  const sortedUsers = useMemo(() => {
    const map = Object.fromEntries(data.users.map(u => [u.id, u]));
    const ordered = localOrder.map(id => map[id]).filter(Boolean);
    const extra = data.users.filter(u => !localOrder.includes(u.id));
    return [...ordered, ...extra];
  }, [data.users, localOrder]);

  // --- NETWORK CONNECTIVITY ---
  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // --- FIREBASE AUTH & SYNC ---
  useEffect(() => {
    if (!auth) return;
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (e) {
        console.error('Auth error:', e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    // Real-time database listener
    const docRef = doc(
      db,
      'artifacts',
      appIdStr,
      'public',
      'data',
      'sportsAppData',
      'mainDatabase'
    );
    const unsubscribe = onSnapshot(
      docRef,
      { includeMetadataChanges: true },
      (docSnap) => {
        if (docSnap.exists()) {
          setData(docSnap.data());
        }
        setHasPendingWrites(docSnap.metadata.hasPendingWrites);
        setIsCloudLoading(false);
      },
      (err) => {
        console.error('Database fetch error:', err);
        setIsCloudLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Update local state and sync to Firestore
  const setDataSync = (updater) => {
    setData((prev) => {
      const newData = typeof updater === 'function' ? updater(prev) : updater;
      if (auth?.currentUser && db) {
        const docRef = doc(
          db,
          'artifacts',
          appIdStr,
          'public',
          'data',
          'sportsAppData',
          'mainDatabase'
        );
        setDoc(docRef, newData).catch((err) =>
          console.error('Background write error:', err)
        );
      }
      return newData;
    });
  };

  // --- DATA OPERATIONS ---
  const addUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const duplicate = data.users.some(
      (u) => u.name.toLowerCase() === newUserName.trim().toLowerCase()
    );
    if (duplicate) {
      setAddUserError('A user with this name already exists.');
      return;
    }
    setAddUserError('');
    const newUser = {
      id: Date.now().toString(),
      name: newUserName.trim(),
    };
    setDataSync((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    saveLocalOrder([newUser.id, ...localOrder]);
    setNewUserName('');
    // Auto-identify as the newly added user (only if not already identified)
    if (!currentUser) saveCurrentUser(newUser);
  };

  const removeUser = (id) => {
    if (window.confirm('Delete this user and all their entries?')) {
      setDataSync((prev) => ({
        users: prev.users.filter((u) => u.id !== id),
        entries: prev.entries.filter((e) => e.userId !== id),
      }));
      saveLocalOrder(localOrder.filter((uid) => uid !== id));
    }
  };

  const moveUser = (index, direction) => {
    const newOrder = sortedUsers.map((u) => u.id);
    if (direction === 'up' && index > 0) {
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    } else if (direction === 'down' && index < newOrder.length - 1) {
      [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    }
    saveLocalOrder(newOrder);
  };

  // --- CALCULATIONS ---
  const stats = useMemo(() => {
    let globalBike = 0,
      globalRun = 0,
      globalWalk = 0,
      globalRollerblade = 0,
      globalTotal = 0;
    const userStats = {};

    data.users.forEach((u) => {
      userStats[u.id] = { bike: 0, run: 0, walk: 0, rollerblade: 0, total: 0 };
    });

    data.entries.forEach((entry) => {
      if (!userStats[entry.userId]) return;

      let kmValue = 0;
      if (entry.type === 'walk') {
        kmValue = entry.value * STEP_TO_KM;
        userStats[entry.userId].walk += kmValue;
        globalWalk += kmValue;
      } else if (entry.type === 'bike') {
        kmValue = Number(entry.value);
        userStats[entry.userId].bike += kmValue;
        globalBike += kmValue;
      } else if (entry.type === 'run') {
        kmValue = Number(entry.value);
        userStats[entry.userId].run += kmValue;
        globalRun += kmValue;
      } else if (entry.type === 'rollerblade') {
        kmValue = Number(entry.value);
        userStats[entry.userId].rollerblade += kmValue;
        globalRollerblade += kmValue;
      }

      userStats[entry.userId].total += kmValue;
      globalTotal += kmValue;
    });

    return { globalBike, globalRun, globalWalk, globalRollerblade, globalTotal, userStats };
  }, [data]);

  const progressPercent = Math.min((stats.globalTotal / GOAL_KM) * 100, 100);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-blue-200 selection:text-slate-900 pb-16 md:pb-0">
      {!pinVerified && <PinScreen onSuccess={() => {
        setPinVerified(true);
        if (!localStorage.getItem('cmcWelcomeSeen')) {
          setShowWelcome(true);
        }
      }} />}
      <header className="sticky top-0 z-20 shadow-md">
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
            <img
              src="https://raw.githubusercontent.com/dankostecki/siepomaga/refs/heads/main/cmc-markets-log.png"
              alt="CMC Markets"
              className="h-8 w-auto"
            />
            <div className="w-0.5 h-6 bg-blue-500 rounded-full shrink-0"></div>
            <span className="text-sm font-semibold text-slate-800 flex-1">SiePomaga Charity Challenge</span>
            <Button
              variant="ghost"
              className="text-slate-800 hover:text-blue-600 hover:bg-slate-100"
              onClick={() => setIsDrawerOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </div>
        <div className="bg-[#111827]">
          <div className="max-w-5xl mx-auto px-4 pt-2.5 pb-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-semibold text-white">
                {formatKm(stats.globalTotal)}{' '}
                <span className="text-slate-400 font-normal">/ {GOAL_KM} KM</span>
              </span>
              <span className="text-xs text-slate-400">
                remaining <span className="font-medium text-slate-300">{formatKm(GOAL_KM - stats.globalTotal)} km</span>
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-1000 ease-out rounded-full"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="bg-amber-500 text-white text-xs text-center py-2 px-4 shrink-0">
          No connection — entries will sync when back online
        </div>
      )}

      <main className="flex-1 px-4 max-w-5xl w-full mx-auto overflow-x-hidden mt-4">
        {/* Mobile: card list */}
        <div className="md:hidden space-y-3">
          {data.users.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-500">
              {isCloudLoading
                ? 'Loading database...'
                : 'No team members. Add users from the menu.'}
            </div>
          ) : (
            sortedUsers
              .map((user) => (
                <div
                  key={user.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 cursor-pointer active:bg-blue-50 transition-colors"
                  onClick={() => handleRowClick(user.id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 font-semibold text-blue-700">
                      <Plus className="w-3.5 h-3.5 text-blue-400" />
                      {user.name}
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {formatKm(stats.userStats[user.id]?.total)} km
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                        <Bike className="w-3.5 h-3.5" /> Cycling
                      </div>
                      <div className="font-medium text-slate-700">
                        {formatKm(stats.userStats[user.id]?.bike)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                        <Activity className="w-3.5 h-3.5" /> Running
                      </div>
                      <div className="font-medium text-slate-700">
                        {formatKm(stats.userStats[user.id]?.run)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                        <Footprints className="w-3.5 h-3.5" /> Walking
                      </div>
                      <div className="font-medium text-slate-700">
                        {formatKm(stats.userStats[user.id]?.walk)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                        <RollerSkateIcon className="w-3.5 h-3.5" /> Skating
                      </div>
                      <div className="font-medium text-slate-700">
                        {formatKm(stats.userStats[user.id]?.rollerblade)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-4 sticky left-0 z-10 bg-slate-50 border-r border-slate-200">
                  CMC MARKETS TEAM
                </th>
                <th className="p-4 text-right">
                  <Bike className="inline w-4 h-4 mr-1" /> Cycling
                </th>
                <th className="p-4 text-right border-l border-slate-200">
                  <Activity className="inline w-4 h-4 mr-1" /> Running
                </th>
                <th className="p-4 text-right border-l border-slate-200">
                  <Footprints className="inline w-4 h-4 mr-1" /> Walking
                </th>
                <th className="p-4 text-right border-l border-slate-200">
                  <RollerSkateIcon className="inline w-4 h-4 mr-1" /> Skating
                </th>
                <th className="p-4 text-right font-bold text-blue-600 border-l border-slate-200">
                  Total (KM)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    {isCloudLoading
                      ? 'Loading database...'
                      : 'No team members. Add users from the menu.'}
                  </td>
                </tr>
              ) : (
                sortedUsers
                  .map((user, index) => {
                    const isEven = index % 2 === 0;
                    const rowBgClass = isEven ? 'bg-white' : 'bg-[#f8fbff]';
                    const hoverClass = 'hover:bg-blue-50 cursor-pointer';

                    return (
                      <tr
                        key={user.id}
                        className={`group transition-colors ${rowBgClass} ${hoverClass}`}
                        onClick={() => handleRowClick(user.id)}
                      >
                        <td
                          className={`p-4 sticky left-0 z-10 border-r border-slate-200 font-semibold text-blue-700 transition-colors ${rowBgClass} group-hover:bg-blue-50 group-hover:text-blue-800`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600" />
                            {user.name}
                          </div>
                        </td>
                        <td className="p-4 text-right text-slate-600">
                          {formatKm(stats.userStats[user.id]?.bike)}
                        </td>
                        <td className="p-4 text-right text-slate-600 border-l border-slate-200">
                          {formatKm(stats.userStats[user.id]?.run)}
                        </td>
                        <td className="p-4 text-right text-slate-600 border-l border-slate-200">
                          {formatKm(stats.userStats[user.id]?.walk)}
                        </td>
                        <td className="p-4 text-right text-slate-600 border-l border-slate-200">
                          {formatKm(stats.userStats[user.id]?.rollerblade)}
                        </td>
                        <td className="p-4 text-right font-bold text-blue-600 text-lg border-l border-slate-200">
                          {formatKm(stats.userStats[user.id]?.total)}
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
            <tfoot className="bg-[#111827] font-semibold text-white">
              <tr>
                <td className="p-4 sticky left-0 z-10 bg-[#111827] border-r border-slate-700 text-white">
                  Total
                </td>
                <td className="p-4 text-right">{formatKm(stats.globalBike)}</td>
                <td className="p-4 text-right border-l border-slate-700">
                  {formatKm(stats.globalRun)}
                </td>
                <td className="p-4 text-right border-l border-slate-700">
                  {formatKm(stats.globalWalk)}
                </td>
                <td className="p-4 text-right border-l border-slate-700">
                  {formatKm(stats.globalRollerblade)}
                </td>
                <td className="p-4 text-right text-xl text-white font-bold border-l border-slate-700">
                  {formatKm(stats.globalTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>

      {/* MOBILE BOTTOM BAR */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#111827] border-t border-slate-700">
        <div className="max-w-5xl mx-auto px-4 py-2">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="flex flex-col items-center gap-0.5">
              <Bike className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-medium">{formatKm(stats.globalBike)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-medium">{formatKm(stats.globalRun)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <Footprints className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-medium">{formatKm(stats.globalWalk)}</span>
            </div>
            <div className="flex flex-col items-center gap-0.5">
              <RollerSkateIcon className="w-4 h-4 text-blue-400" />
              <span className="text-slate-300 font-medium">{formatKm(stats.globalRollerblade)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* DRAWER MENU (USERS) */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-300 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 bottom-0 w-80 max-w-[85vw] bg-white border-l border-slate-200 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800 text-lg">
            Team Management
          </h2>
          <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {/* Current user identity */}
          <div className="mb-5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            {currentUser ? (
              <div>
                <p className="text-xs text-blue-500 font-medium">Logged in as</p>
                <p className="text-sm font-semibold text-blue-800">{currentUser.name}</p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Tap a row to identify yourself and log entries.
              </p>
            )}
          </div>

          {!currentUser && (
            <form onSubmit={addUser} className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Add yourself
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  value={newUserName}
                  onChange={(e) => { setNewUserName(e.target.value); setAddUserError(''); }}
                  className={`flex-1 bg-white border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-3 py-2 text-slate-900 placeholder:text-slate-400 ${addUserError ? 'border-red-400' : 'border-slate-300'}`}
                  maxLength={25}
                />
                <Button type="submit" variant="primary" className="px-3 py-2 rounded-md">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              {addUserError && (
                <p className="text-xs text-red-500 mt-1">{addUserError}</p>
              )}
            </form>
          )}
          {isAdmin && (
            <form onSubmit={addUser} className="mb-6">
              <label className="block text-sm font-medium text-slate-600 mb-2">
                Add member
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. John D."
                  value={newUserName}
                  onChange={(e) => { setNewUserName(e.target.value); setAddUserError(''); }}
                  className={`flex-1 bg-white border rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-3 py-2 text-slate-900 placeholder:text-slate-400 ${addUserError ? 'border-red-400' : 'border-slate-300'}`}
                  maxLength={25}
                />
                <Button type="submit" variant="primary" className="px-3 py-2 rounded-md">
                  <Plus className="w-5 h-5" />
                </Button>
              </div>
              {addUserError && (
                <p className="text-xs text-red-500 mt-1">{addUserError}</p>
              )}
            </form>
          )}

          <div className="space-y-2">
            {sortedUsers
              .map((user, index, arr) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white shadow-sm"
                >
                  <span className="font-medium text-slate-800 truncate max-w-[100px]">
                    {user.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="p-1 text-slate-400 hover:text-slate-700"
                      disabled={index === 0}
                      onClick={() => moveUser(index, 'up')}
                    >
                      <ChevronUp className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="p-1 text-slate-400 hover:text-slate-700"
                      disabled={index === arr.length - 1}
                      onClick={() => moveUser(index, 'down')}
                    >
                      <ChevronDown className="w-5 h-5" />
                    </Button>
                    {(isAdmin || currentUser?.id === user.id) && (
                      <Button
                        variant="ghost"
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => setEditingUser(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost"
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => removeUser(user.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
        <div className="border-t border-slate-200 shrink-0">
          <div className="px-4 py-3 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full animate-pulse ${
              isCloudLoading ? 'bg-slate-400' :
              !isOnline ? 'bg-red-500' :
              hasPendingWrites ? 'bg-amber-400' :
              'bg-blue-500'
            }`}></span>
            <span className="text-xs text-slate-500 flex-1">
              {isCloudLoading ? 'Connecting...' :
               !isOnline ? 'Offline' :
               hasPendingWrites ? 'Syncing...' :
               'Connected to cloud'}
            </span>
            {isAdmin ? (
              <button
                className="text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-200 rounded px-2 py-1 hover:bg-amber-100 transition-colors"
                onClick={() => setIsAdmin(false)}
              >
                Exit Admin
              </button>
            ) : (
              <button
                className="text-xs text-slate-400 hover:text-blue-600 transition-colors"
                onClick={() => setShowAdminPin(true)}
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setEditingUser(null);
          }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#111827] p-4 text-white flex justify-between items-center">
              <h2 className="font-semibold flex items-center gap-3">
                <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>{' '}
                Edit
              </h2>
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800 p-1"
                onClick={() => setEditingUser(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!editingUser.name.trim()) return;
                setDataSync((prev) => ({
                  ...prev,
                  users: prev.users.map((u) =>
                    u.id === editingUser.id
                      ? { ...u, name: editingUser.name.trim() }
                      : u
                  ),
                }));
                setEditingUser(null);
              }}
              className="p-5 space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-900"
                  autoFocus
                  maxLength={25}
                />
              </div>
              <Button type="submit" className="w-full py-2.5">
                Save changes
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ACTIVITY MODAL */}
      {activeUserId && (
        <ActivityModal
          userId={activeUserId}
          user={data.users.find((u) => u.id === activeUserId)}
          onClose={() => setActiveUserId(null)}
          data={data}
          setData={setDataSync}
          currentUser={currentUser}
          isAdmin={isAdmin}
        />
      )}

      {/* WELCOME MODAL */}
      {showWelcome && (
        <WelcomeModal onClose={() => {
          localStorage.setItem('cmcWelcomeSeen', 'true');
          setShowWelcome(false);
        }} />
      )}

      {/* ADMIN PIN POPUP */}
      {showAdminPin && (
        <AdminPinPopup
          onSuccess={() => { setIsAdmin(true); setShowAdminPin(false); }}
          onClose={() => setShowAdminPin(false)}
        />
      )}

      {/* IDENTITY POPUP */}
      {identityTarget !== null && (
        <IdentityPopup
          users={data.users}
          onIdentify={(user) => {
            saveCurrentUser(user);
            setIdentityTarget(null);
            setActiveUserId(identityTarget);
          }}
          onClose={() => setIdentityTarget(null)}
        />
      )}
    </div>
  );
}

// --- SUBCOMPONENT: WELCOME MODAL ---
function WelcomeModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-[#111827] p-5 text-white text-center">
          <div className="w-10 h-10 bg-blue-500 rounded-xl mx-auto flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-lg font-semibold">Welcome to the Challenge!</h2>
          <p className="text-slate-400 text-sm mt-1">CMC Markets · SiePomaga</p>
        </div>
        <div className="p-6 space-y-4 text-sm text-slate-600">
          <div className="flex gap-3">
            <span className="text-blue-500 font-bold shrink-0">1.</span>
            <span>Tap your name on the leaderboard to log cycling, running, or walking km.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-500 font-bold shrink-0">2.</span>
            <span>First choose an activity type — then the input field will appear.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-500 font-bold shrink-0">3.</span>
            <span>Your entries are saved to the cloud and visible to everyone in the team.</span>
          </div>
          <div className="flex gap-3">
            <span className="text-blue-500 font-bold shrink-0">4.</span>
            <span>On a new device? Tap your row and identify yourself to keep logging.</span>
          </div>
        </div>
        <div className="px-6 pb-6">
          <button
            className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors"
            onClick={onClose}
          >
            Let's go!
          </button>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENT: ADMIN PIN POPUP ---
function AdminPinPopup({ onSuccess, onClose }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hash = await sha256(pin);
    if (hash === PIN_HASH) {
      onSuccess();
    } else {
      setError(true);
      setShaking(true);
      setPin('');
      setTimeout(() => setShaking(false), 500);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 ${shaking ? 'animate-[shake_0.4s_ease-in-out]' : ''}`}
        style={shaking ? { animation: 'shake 0.4s ease-in-out' } : {}}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-800">Admin Access</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            maxLength={20}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(false); }}
            placeholder="Enter admin PIN"
            autoFocus
            className={`w-full text-center text-xl tracking-[0.4em] border-2 rounded-xl px-4 py-3 outline-none transition-colors ${
              error ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 focus:border-blue-500 text-slate-900'
            }`}
          />
          {error && <p className="text-xs text-red-500 text-center">Incorrect PIN.</p>}
          <button
            type="submit"
            disabled={pin.length === 0}
            className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

// --- SUBCOMPONENT: IDENTITY POPUP ---
function IdentityPopup({ users, onIdentify, onClose }) {
  const [query, setQuery] = useState('');

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-[#111827] p-4 text-white flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
            Who are you?
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          <p className="text-sm text-slate-500 mb-3">
            Select your name to identify this device and start logging entries.
          </p>
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-500"
          />
          <div className="max-h-60 overflow-y-auto space-y-1.5">
            {filtered.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">No match found.</p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-colors font-medium text-slate-800 text-sm"
                  onClick={() => onIdentify(u)}
                >
                  {u.name}
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUBCOMPONENT: ACTIVITY MODAL ---
function ActivityModal({ userId, user, onClose, data, setData, currentUser, isAdmin }) {
  const [type, setType] = useState('bike');
  const [value, setValue] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const canEdit = isAdmin || currentUser?.id === userId;
  useEffect(() => { requestAnimationFrame(() => setIsVisible(true)); }, []);

  const handleClose = () => {
    // Auto-save if there's a valid unsaved value
    if (canEdit && value && !isNaN(value) && Number(value) > 0) {
      setData((prev) => ({
        ...prev,
        entries: [
          { id: Date.now().toString(), userId, type, value: Number(value), timestamp: Date.now() },
          ...prev.entries,
        ],
      }));
    }
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [editType, setEditType] = useState('bike');
  const [confirmAction, setConfirmAction] = useState(null);

  const userEntries = data.entries
    .filter((e) => e.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const handleSaveNew = (e) => {
    e.preventDefault();
    if (!value || isNaN(value) || value <= 0) return;

    const newEntry = {
      id: Date.now().toString(),
      userId,
      type,
      value: Number(value),
      timestamp: Date.now(),
    };

    setData((prev) => ({ ...prev, entries: [newEntry, ...prev.entries] }));
    setValue('');
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditValue(entry.value);
    setEditType(entry.type);
    setConfirmAction(null);
  };

  const requestSaveEdit = (e) => {
    e.preventDefault();
    if (!editValue || isNaN(editValue) || editValue <= 0) return;
    setConfirmAction({
      type: 'EDIT',
      message: 'Save changes?',
      onConfirm: () => {
        setData((prev) => ({
          ...prev,
          entries: prev.entries.map((entry) =>
            entry.id === editingId
              ? { ...entry, type: editType, value: Number(editValue) }
              : entry
          ),
        }));
        setEditingId(null);
        setConfirmAction(null);
      },
    });
  };

  const renderHistoryItemValue = (entry) => {
    if (entry.type === 'walk') {
      return `${entry.value} steps (${formatKm(entry.value * STEP_TO_KM)} KM)`;
    }
    return `${entry.value} KM`;
  };

  const getTypeIcon = (t) => {
    if (t === 'bike') return <Bike className="w-5 h-5" />;
    if (t === 'run') return <Activity className="w-5 h-5" />;
    if (t === 'rollerblade') return <RollerSkateIcon className="w-5 h-5" />;
    return <Footprints className="w-5 h-5" />;
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className={`bg-slate-50 w-full max-w-2xl sm:rounded-xl shadow-2xl flex flex-col h-full sm:h-auto sm:max-h-[85vh] overflow-hidden transition-transform duration-300 ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-[#111827] text-white shadow-lg shrink-0">
          <h2 className="font-semibold text-lg flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            Activity Log:{' '}
            <span className="text-blue-400 font-normal">{user?.name}</span>
          </h2>
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={handleClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Form — fixed, never scrolls */}
        <div className="shrink-0 p-4 border-b border-slate-200">
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            {canEdit ? (
              <>
                <h3 className="text-sm text-slate-500 mb-4 font-semibold uppercase tracking-wider">
                  New Entry
                </h3>
                <form onSubmit={handleSaveNew} className="space-y-4">
                  <div className="grid grid-cols-4 gap-2">
                    {['bike', 'run', 'walk', 'rollerblade'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex flex-col items-center justify-center p-3 rounded-lg border font-medium transition-colors ${
                          type === t
                            ? 'bg-blue-50 text-blue-700 border-blue-500 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                        }`}
                      >
                        {getTypeIcon(t)}
                        <span className="mt-2 text-xs">
                          {t === 'bike' ? 'Cycling' : t === 'run' ? 'Running' : t === 'walk' ? 'Walking' : 'Skating'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      {type === 'walk' ? 'Number of steps' : 'Kilometers'}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      min="0"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-4 text-2xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center"
                      placeholder={type === 'walk' ? 'e.g. 8000 — tap Save or Done' : 'e.g. 15.5 — tap Save or Done'}
                    />
                  </div>

                  {type === 'walk' && value > 0 && (
                    <div className="text-center text-sm text-blue-600 font-semibold bg-blue-50 py-2 rounded-lg">
                      = {formatKm(value * STEP_TO_KM)} KM
                    </div>
                  )}

                  <Button type="submit" className="w-full py-3.5 text-lg shadow-sm">
                    Save data
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full py-3.5 text-lg bg-slate-100 hover:bg-slate-200 border-slate-300"
                    onClick={handleClose}
                  >
                    {value && !isNaN(value) && Number(value) > 0 ? 'Save & Close' : 'Done'}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-sm text-slate-500">
                  Viewing <span className="font-semibold text-slate-700">{user?.name}</span>'s activity.
                </p>
                <p className="text-xs text-slate-400 mt-1">You can only add entries to your own account.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 w-full py-3 bg-white"
                  onClick={handleClose}
                >
                  Close
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* History — scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <section>
            <h3 className="text-sm text-slate-500 mb-4 font-semibold uppercase tracking-wider flex items-center justify-between px-1">
              <span>Entry History</span>
              <span className="text-slate-400 font-normal normal-case">
                {userEntries.length} entries
              </span>
            </h3>

            <div className="space-y-3">
              {userEntries.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8 border border-dashed border-slate-300 rounded-xl bg-white">
                  No entries yet.
                </p>
              ) : (
                userEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-blue-600">
                          {getTypeIcon(entry.type)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-lg">
                            {renderHistoryItemValue(entry)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(entry.timestamp).toLocaleString('en-GB')}
                          </div>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => startEdit(entry)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() =>
                              setConfirmAction({
                                type: 'DELETE',
                                entryId: entry.id,
                                onConfirm: () => {
                                  setData((prev) => ({
                                    ...prev,
                                    entries: prev.entries.filter((e) => e.id !== entry.id),
                                  }));
                                  setConfirmAction(null);
                                },
                              })
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Edit popup */}
        {editingId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Edit entry</h3>
              <form onSubmit={requestSaveEdit} className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {['bike', 'run', 'walk', 'rollerblade'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEditType(t)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border font-medium transition-colors ${
                        editType === t
                          ? 'bg-blue-50 text-blue-700 border-blue-500'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      {getTypeIcon(t)}
                      <span className="mt-1 text-xs">
                        {t === 'bike' ? 'Cycling' : t === 'run' ? 'Running' : t === 'walk' ? 'Walking' : 'Skating'}
                      </span>
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-4 text-2xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center"
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { setEditingId(null); setConfirmAction(null); }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" className="flex-1">
                    Save
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete confirm popup */}
        {confirmAction?.type === 'DELETE' && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-2 text-red-600 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Delete entry?</span>
              </div>
              <p className="text-slate-500 text-sm mb-6">This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
                <Button variant="danger" className="flex-1" onClick={confirmAction.onConfirm}>
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit save confirm popup */}
        {confirmAction?.type === 'EDIT' && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center gap-2 text-blue-700 mb-6">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">{confirmAction.message}</span>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setConfirmAction(null)}>
                  Cancel
                </Button>
                <Button variant="primary" className="flex-1" onClick={confirmAction.onConfirm}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
