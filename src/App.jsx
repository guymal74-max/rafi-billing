import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, getDocs, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCJs6q4xrU-evPudWiQm3OgTXe3LZe3bsg",
    authDomain: "rafi-billing-709af.firebaseapp.com",
    projectId: "rafi-billing-709af",
    storageBucket: "rafi-billing-709af.firebasestorage.app",
    messagingSenderId: "285463487860",
    appId: "1:285463487860:web:8ee0975db8f7ae79e6f821"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION = 'projects';

export default function App() {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(true);

  const [projects, setProjects] = useState([]);
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ name: '', client: '', amount: '', status: 'פתוח', notes: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (user) loadProjects();
  }, [user]);

  async function loadProjects() {
    const snap = await getDocs(collection(db, COLLECTION));
    setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }

  async function handleAuth(e) {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleSave() {
    setSaving(true);
    const audit = { updatedBy: user.email, updatedAt: serverTimestamp() };
    if (selected) {
      await updateDoc(doc(db, COLLECTION, selected.id), { ...form, ...audit });
    } else {
      await addDoc(collection(db, COLLECTION), { ...form, ...audit, createdBy: user.email, createdAt: serverTimestamp() });
    }
    await loadProjects();
    setView('list');
    setSelected(null);
    setForm({ name: '', client: '', amount: '', status: 'פתוח', notes: '' });
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('למחוק פרויקט זה?')) return;
    await deleteDoc(doc(db, COLLECTION, id));
    await loadProjects();
  }

  function openEdit(p) {
    setSelected(p);
    setForm({ name: p.name, client: p.client, amount: p.amount, status: p.status, notes: p.notes || '' });
    setView('form');
  }

  function openNew() {
    setSelected(null);
    setForm({ name: '', client: '', amount: '', status: 'פתוח', notes: '' });
    setView('form');
  }

  const filtered = projects.filter(p =>
    (p.name || '').includes(search) ||
    (p.client || '').includes(search)
  );

  const total = projects.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">טוען...</div>;

  if (!user) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-6 text-blue-700">ניהול גבייה - קבוצת רפי שפירא</h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input className="w-full border rounded px-3 py-2" type="email" placeholder="אימייל" value={email} onChange={e => setEmail(e.target.value)} required />
          <input className="w-full border rounded px-3 py-2" type="password" placeholder="סיסמה" value={password} onChange={e => setPassword(e.target.value)} required />
          {authError && <p className="text-red-500 text-sm">{authError}</p>}
          <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700" type="submit">
            {authMode === 'login' ? 'כניסה' : 'הרשמה'}
          </button>
        </form>
        <button className="w-full text-center text-sm text-gray-500 mt-3" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
          {authMode === 'login' ? 'אין חשבון? הירשם' : 'יש חשבון? התחבר'}
        </button>
      </div>
    </div>
  );

  if (view === 'form') return (
    <div className="min-h-screen bg-gray-100 p-4" dir="rtl">
      <div className="max-w-lg mx-auto bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-bold mb-4">{selected ? 'עריכת פרויקט' : 'פרויקט חדש'}</h2>
        <div className="space-y-3">
          <input className="w-full border rounded px-3 py-2" placeholder="שם פרויקט" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="w-full border rounded px-3 py-2" placeholder="לקוח" value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
          <input className="w-full border rounded px-3 py-2" placeholder="סכום" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
          <select className="w-full border rounded px-3 py-2" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
            <option>פתוח</option>
            <option>שולם</option>
            <option>בהמתנה</option>
            <option>בוטל</option>
          </select>
          <textarea className="w-full border rounded px-3 py-2" placeholder="הערות" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex gap-3 mt-4">
          <button className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700" onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור'}
          </button>
          <button className="flex-1 bg-gray-200 py-2 rounded hover:bg-gray-300" onClick={() => setView('list')}>ביטול</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      <div className="bg-blue-700 text-white px-4 py-3 flex justify-between items-center">
        <h1 className="font-bold text-lg">ניהול גבייה - קבוצת רפי שפירא</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-80">{user.email}</span>
          <button className="text-sm bg-white text-blue-700 px-3 py-1 rounded" onClick={() => signOut(auth)}>יציאה</button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{projects.length}</div>
            <div className="text-sm text-gray-500">פרויקטים</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{projects.filter(p => p.status === 'שולם').length}</div>
            <div className="text-sm text-gray-500">שולמו</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-xl font-bold text-gray-700">₪{total.toLocaleString()}</div>
            <div className="text-sm text-gray-500">סה"כ</div>
          </div>
        </div>
        <div className="flex gap-3 mb-4">
          <input className="flex-1 border rounded px-3 py-2" placeholder="חיפוש לפי שם או לקוח..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={openNew}>+ פרויקט חדש</button>
        </div>
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-right">פרויקט</th>
                <th className="px-4 py-3 text-right">לקוח</th>
                <th className="px-4 py-3 text-right">סכום</th>
                <th className="px-4 py-3 text-right">סטטוס</th>
                <th className="px-4 py-3 text-right">עודכן ע"י</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3">{p.client}</td>
                  <td className="px-4 py-3">₪{(parseFloat(p.amount) || 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      p.status === 'שולם' ? 'bg-green-100 text-green-700' :
                      p.status === 'בהמתנה' ? 'bg-yellow-100 text-yellow-700' :
                      p.status === 'בוטל' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.updatedBy || p.createdBy || '-'}</td>
                  <td className="px-4 py-3 flex gap-2 justify-end">
                    <button className="text-blue-600 hover:underline" onClick={() => openEdit(p)}>עריכה</button>
                    <button className="text-red-500 hover:underline" onClick={() => handleDelete(p.id)}>מחיקה</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">אין פרויקטים להצגה</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
