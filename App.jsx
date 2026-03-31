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
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURATION ---
const GOAL_KM = 6000;
const STEP_TO_KM = 0.00072;
const PIN_HASH = 'f32f613fca81c87052af842eaac5585812d884030a3af1e1cd2d06863d79ad1c';

// WŁASNA KONFIGURACJA
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
  // Automatyczne wykrywanie środowiska (Canvas vs Twój własny serwer)
  const configToUse =
    typeof __firebase_config !== 'undefined'
      ? JSON.parse(__firebase_config)
      : MY_FIREBASE_CONFIG;
  app = initializeApp(configToUse);
  auth = getAuth(app);
  db = getFirestore(app);
  appIdStr = typeof __app_id !== 'undefined' ? __app_id : 'my-sports-app-v1';
} catch (e) {
  console.error('Błąd inicjalizacji Firebase:', e);
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
      'bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 active:scale-95',
    outline:
      'border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 active:scale-95',
    ghost:
      'text-slate-600 hover:text-blue-600 hover:bg-slate-100 p-2 active:scale-95',
    danger:
      'border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 active:scale-95',
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
              placeholder="Wpisz PIN"
              autoFocus
              className={`w-full text-center text-2xl tracking-[0.5em] border-2 rounded-xl px-4 py-3 outline-none transition-colors ${
                error
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-slate-200 focus:border-blue-500 text-slate-900'
              }`}
            />
            {error && (
              <p className="text-xs text-red-500 mt-2">Nieprawidłowy PIN. Spróbuj ponownie.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={pin.length === 0}
            className="w-full bg-blue-600 text-white font-medium py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Wejdź
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

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState(null);
  const [newUserName, setNewUserName] = useState('');
  const [editingUser, setEditingUser] = useState(null);

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
        console.error('Błąd logowania:', e);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    // Nasłuchiwanie zmian w bazie danych na żywo (Real-time sync)
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
      (docSnap) => {
        if (docSnap.exists()) {
          setData(docSnap.data());
        }
        setIsCloudLoading(false);
      },
      (err) => {
        console.error('Błąd pobierania bazy:', err);
        setIsCloudLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  // Własna funkcja aktualizująca stan lokalnie ORAZ w bazie Firestore
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
          console.error('Błąd zapisu w tle:', err)
        );
      }
      return newData;
    });
  };

  // --- DATA OPERATIONS ---
  const addUser = (e) => {
    e.preventDefault();
    if (!newUserName.trim()) return;
    const newUser = {
      id: Date.now().toString(),
      name: newUserName.trim(),
      order: data.users.length,
    };
    setDataSync((prev) => ({ ...prev, users: [...prev.users, newUser] }));
    setNewUserName('');
  };

  const removeUser = (id) => {
    if (window.confirm('Usunąć użytkownika i wszystkie jego wpisy?')) {
      setDataSync((prev) => ({
        users: prev.users.filter((u) => u.id !== id),
        entries: prev.entries.filter((e) => e.userId !== id),
      }));
    }
  };

  const moveUser = (index, direction) => {
    setDataSync((prev) => {
      const newUsers = [...prev.users].sort((a, b) => a.order - b.order);
      if (direction === 'up' && index > 0) {
        [newUsers[index - 1].order, newUsers[index].order] = [
          newUsers[index].order,
          newUsers[index - 1].order,
        ];
      } else if (direction === 'down' && index < newUsers.length - 1) {
        [newUsers[index + 1].order, newUsers[index].order] = [
          newUsers[index].order,
          newUsers[index + 1].order,
        ];
      }
      return { ...prev, users: newUsers };
    });
  };

  // --- CALCULATIONS ---
  const stats = useMemo(() => {
    let globalBike = 0,
      globalRun = 0,
      globalWalk = 0,
      globalTotal = 0;
    const userStats = {};

    data.users.forEach((u) => {
      userStats[u.id] = { bike: 0, run: 0, walk: 0, total: 0 };
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
      }

      userStats[entry.userId].total += kmValue;
      globalTotal += kmValue;
    });

    return { globalBike, globalRun, globalWalk, globalTotal, userStats };
  }, [data]);

  const progressPercent = Math.min((stats.globalTotal / GOAL_KM) * 100, 100);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-blue-200 selection:text-slate-900 pb-20 md:pb-0">
      {!pinVerified && <PinScreen onSuccess={() => setPinVerified(true)} />}
      <header className="sticky top-0 z-10 shadow-md">
        <div className="bg-white px-4 py-3 flex justify-between items-center border-b border-slate-100">
          <img
            src="https://raw.githubusercontent.com/dankostecki/siepomaga/refs/heads/main/cmc-markets-log.png"
            alt="CMC Markets"
            className="h-8 w-auto"
          />
          <Button
            variant="ghost"
            className="text-slate-800 hover:text-blue-600 hover:bg-slate-100 relative"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Menu className="w-6 h-6" />
            {user && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-white"></span>
            )}
          </Button>
        </div>
        <div className="bg-[#111827] px-4 py-2.5">
          <h1 className="text-sm font-semibold tracking-wide text-white flex items-center gap-2">
            <div className="w-1.5 h-5 bg-blue-500 rounded-full"></div>
            SiePomaga Charity Challenge
          </h1>
        </div>
      </header>

      <div className="px-4 py-6 max-w-5xl w-full mx-auto">
        <div className="flex justify-between items-end mb-2 text-sm font-semibold text-slate-700">
          <span>Postęp wyzwania</span>
          <span className="text-2xl font-bold text-slate-900">
            {formatKm(stats.globalTotal)}{' '}
            <span className="text-slate-500 text-sm font-normal">/ {GOAL_KM} KM</span>
          </span>
        </div>
        <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-1000 ease-out"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-400">
            {isCloudLoading ? 'Łączenie z bazą...' : 'Połączono z chmurą'}
          </span>
          <span className="text-xs text-slate-400">
            pozostało <span className="font-medium text-slate-500">{formatKm(GOAL_KM - stats.globalTotal)} km</span>
          </span>
        </div>
      </div>

      <main className="flex-1 px-4 max-w-5xl w-full mx-auto overflow-hidden">
        {/* Mobile: card list */}
        <div className="md:hidden space-y-3">
          {data.users.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-500">
              {isCloudLoading
                ? 'Wczytywanie bazy danych...'
                : 'Brak załogi. Dodaj użytkowników w menu.'}
            </div>
          ) : (
            [...data.users]
              .sort((a, b) => a.order - b.order)
              .map((user) => (
                <div
                  key={user.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 cursor-pointer active:bg-blue-50 transition-colors"
                  onClick={() => setActiveUserId(user.id)}
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
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                        <Bike className="w-3.5 h-3.5" /> Rower
                      </div>
                      <div className="font-medium text-slate-700">
                        {formatKm(stats.userStats[user.id]?.bike)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                        <Activity className="w-3.5 h-3.5" /> Bieg
                      </div>
                      <div className="font-medium text-slate-700">
                        {formatKm(stats.userStats[user.id]?.run)}
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                        <Footprints className="w-3.5 h-3.5" /> Spacer
                      </div>
                      <div className="font-medium text-slate-700">
                        {formatKm(stats.userStats[user.id]?.walk)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
          )}
          {data.users.length > 0 && (
            <div className="bg-[#111827] rounded-xl p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold">Suma</span>
                <span className="text-xl font-bold">{formatKm(stats.globalTotal)} km</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Bike className="w-3.5 h-3.5" /> Rower
                  </div>
                  <div className="font-medium">{formatKm(stats.globalBike)}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Activity className="w-3.5 h-3.5" /> Bieg
                  </div>
                  <div className="font-medium">{formatKm(stats.globalRun)}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-2">
                  <div className="flex items-center justify-center gap-1 text-slate-400 mb-1">
                    <Footprints className="w-3.5 h-3.5" /> Spacer
                  </div>
                  <div className="font-medium">{formatKm(stats.globalWalk)}</div>
                </div>
              </div>
            </div>
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
                  <Bike className="inline w-4 h-4 mr-1" /> Rower
                </th>
                <th className="p-4 text-right border-l border-slate-200">
                  <Activity className="inline w-4 h-4 mr-1" /> Bieg
                </th>
                <th className="p-4 text-right border-l border-slate-200">
                  <Footprints className="inline w-4 h-4 mr-1" /> Spacer
                </th>
                <th className="p-4 text-right font-bold text-blue-600 border-l border-slate-200">
                  Suma (KM)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500">
                    {isCloudLoading
                      ? 'Wczytywanie bazy danych...'
                      : 'Brak załogi. Dodaj użytkowników w menu.'}
                  </td>
                </tr>
              ) : (
                [...data.users]
                  .sort((a, b) => a.order - b.order)
                  .map((user, index) => {
                    const isEven = index % 2 === 0;
                    const rowBgClass = isEven ? 'bg-white' : 'bg-[#f8fbff]';
                    const hoverClass = 'hover:bg-blue-50 cursor-pointer';

                    return (
                      <tr
                        key={user.id}
                        className={`group transition-colors ${rowBgClass} ${hoverClass}`}
                        onClick={() => setActiveUserId(user.id)}
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
                  Suma
                </td>
                <td className="p-4 text-right">{formatKm(stats.globalBike)}</td>
                <td className="p-4 text-right border-l border-slate-700">
                  {formatKm(stats.globalRun)}
                </td>
                <td className="p-4 text-right border-l border-slate-700">
                  {formatKm(stats.globalWalk)}
                </td>
                <td className="p-4 text-right text-xl text-white font-bold border-l border-slate-700">
                  {formatKm(stats.globalTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </main>

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
            Zarządzanie załogą
          </h2>
          <Button variant="ghost" onClick={() => setIsDrawerOpen(false)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <form onSubmit={addUser} className="mb-8">
            <label className="block text-sm font-medium text-slate-600 mb-2">
              Dodaj członka
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="np. Jan K."
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none px-3 py-2 text-slate-900 placeholder:text-slate-400"
                maxLength={25}
              />
              <Button
                type="submit"
                variant="primary"
                className="px-3 py-2 rounded-md"
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {[...data.users]
              .sort((a, b) => a.order - b.order)
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
                    <Button
                      variant="ghost"
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => setEditingUser(user)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeUser(user.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
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
                Edycja
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
                  Imię / Nazwa
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
                Zapisz zmiany
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
          setData={setDataSync} // Używamy synchronizatora Firestore
        />
      )}
    </div>
  );
}

// --- SUBCOMPONENT: ACTIVITY MODAL ---
function ActivityModal({ userId, user, onClose, data, setData }) {
  const [type, setType] = useState('bike');
  const [value, setValue] = useState('');

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
      message: 'Zapisać zmiany?',
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
      return `${entry.value} kroków (${formatKm(entry.value * STEP_TO_KM)} KM)`;
    }
    return `${entry.value} KM`;
  };

  const getTypeIcon = (t) => {
    if (t === 'bike') return <Bike className="w-5 h-5" />;
    if (t === 'run') return <Activity className="w-5 h-5" />;
    return <Footprints className="w-5 h-5" />;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-50 w-full max-w-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-slate-800 bg-[#111827] text-white shadow-lg shrink-0">
          <h2 className="font-semibold text-lg flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
            Dziennik:{' '}
            <span className="text-blue-400 font-normal">{user?.name}</span>
          </h2>
          <Button
            variant="ghost"
            className="text-slate-300 hover:text-white hover:bg-slate-800"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-12 sm:pb-6">
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm text-slate-500 mb-4 font-semibold uppercase tracking-wider">
              Nowy Wpis
            </h3>
            <form onSubmit={handleSaveNew} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {['bike', 'run', 'walk'].map((t) => (
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
                    <span className="mt-2 text-sm">
                      {t === 'bike' ? 'Rower' : t === 'run' ? 'Bieg' : 'Spacer'}
                    </span>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Ilość {type === 'walk' ? 'kroków' : 'kilometrów'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-4 text-2xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center"
                  placeholder="0"
                />
              </div>

              {type === 'walk' && value > 0 && (
                <div className="text-center text-sm text-blue-600 font-semibold bg-blue-50 py-2 rounded-lg">
                  = {formatKm(value * STEP_TO_KM)} KM
                </div>
              )}

              <Button type="submit" className="w-full py-3.5 text-lg shadow-sm">
                Zapisz dane
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full py-3.5 text-lg mt-2 bg-white"
                onClick={onClose}
              >
                Zakończ
              </Button>
            </form>
          </section>

          <section>
            <h3 className="text-sm text-slate-500 mb-4 font-semibold uppercase tracking-wider flex items-center justify-between px-1">
              <span>Historia Wpisów</span>
              <span className="text-slate-400 font-normal normal-case">
                {userEntries.length} akcji
              </span>
            </h3>

            <div className="space-y-3">
              {userEntries.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-8 border border-dashed border-slate-300 rounded-xl bg-white">
                  Brak historii.
                </p>
              ) : (
                userEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                  >
                    {editingId === entry.id ? (
                      <form onSubmit={requestSaveEdit} className="space-y-4">
                        <div className="flex gap-2">
                          {['bike', 'run', 'walk'].map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setEditType(t)}
                              className={`flex-1 p-2 rounded-lg border font-medium transition-colors ${
                                editType === t
                                  ? 'bg-blue-50 text-blue-700 border-blue-500'
                                  : 'bg-white text-slate-500 border-slate-200'
                              }`}
                            >
                              <div className="flex justify-center">
                                {getTypeIcon(t)}
                              </div>
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg p-3 text-xl font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-center"
                        />
                        {confirmAction?.type === 'EDIT' ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex flex-col items-center gap-3">
                            <span className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />{' '}
                              {confirmAction.message}
                            </span>
                            <div className="flex gap-2 w-full">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 bg-white"
                                onClick={() => setConfirmAction(null)}
                              >
                                Anuluj
                              </Button>
                              <Button
                                type="button"
                                variant="primary"
                                className="flex-1"
                                onClick={confirmAction.onConfirm}
                              >
                                Zapisz
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                setEditingId(null);
                                setConfirmAction(null);
                              }}
                            >
                              Anuluj
                            </Button>
                            <Button
                              type="submit"
                              variant="primary"
                              className="flex-1"
                            >
                              Gotowe
                            </Button>
                          </div>
                        )}
                      </form>
                    ) : (
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
                              {new Date(entry.timestamp).toLocaleString(
                                'pl-PL'
                              )}
                            </div>
                          </div>
                        </div>

                        {confirmAction?.type === 'DELETE' &&
                        confirmAction?.entryId === entry.id ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex flex-col items-center gap-2 absolute right-4 left-4 sm:static sm:w-auto z-10 shadow-md sm:shadow-none">
                            <span className="text-sm font-semibold text-red-700 flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4" /> Usunąć?
                            </span>
                            <div className="flex gap-2 w-full">
                              <Button
                                type="button"
                                variant="outline"
                                className="flex-1 text-xs py-2 bg-white border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => setConfirmAction(null)}
                              >
                                Nie
                              </Button>
                              <Button
                                type="button"
                                variant="danger"
                                className="flex-1 text-xs py-2"
                                onClick={confirmAction.onConfirm}
                              >
                                Tak
                              </Button>
                            </div>
                          </div>
                        ) : (
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
                                      entries: prev.entries.filter(
                                        (e) => e.id !== entry.id
                                      ),
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
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
