import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Send, XCircle, Settings as SettingsIcon } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PinGate from '../components/ui/PinGate';
import { getSmsConfig, setSmsConfig, isSmsConfigured, sendSms, testSmsConnection, loadSmsConfigFromDb } from '../lib/smsService';
import { getReminderSettings, setReminderSettings, syncReminderSettingsToDb, loadReminderSettingsFromDb, type ReminderTiming } from '../lib/reminderSettings';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'sms' | 'podsjetnici' | 'korisnik';

export default function Settings() {
  const { user } = useAuth();
  const [tab, setTab] = useState<SettingsTab>('sms');

  // SMS
  const [apiKey, setApiKey] = useState('');
  const [senderName, setSenderName] = useState('');
  const [email, setEmail] = useState('');
  const [configSaved, setConfigSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testText] = useState("Test poruka iz MOA sistema");
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Podsjetnici
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>('dan_termina');
  const [reminderVrijeme, setReminderVrijeme] = useState('08:00');
  const [reminderSaved, setReminderSaved] = useState(false);

  const configured = isSmsConfigured();

  useEffect(() => {
    const config = getSmsConfig();
    setApiKey(config.apiKey);
    setSenderName(config.senderName);
    setEmail(config.email);
    const rs = getReminderSettings();
    setReminderEnabled(rs.enabled);
    setReminderTiming(rs.timing);
    setReminderVrijeme(rs.vrijeme);

    (async () => {
      const loaded = await loadSmsConfigFromDb();
      if (loaded) {
        const fresh = getSmsConfig();
        setApiKey(fresh.apiKey);
        setSenderName(fresh.senderName);
        setEmail(fresh.email);
      }
      const db = await loadReminderSettingsFromDb();
      if (db) { setReminderEnabled(db.enabled); setReminderTiming(db.timing); setReminderVrijeme(db.vrijeme); setReminderSettings(db); }
    })();
  }, []);

  function handleSaveConfig() {
    setSmsConfig(apiKey, senderName, email);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  }

  async function handleTestConnection() {
    setTesting(true); setTestResult(null);
    setTestResult(await testSmsConnection());
    setTesting(false);
  }

  async function handleSendTestSms() {
    if (!testPhone) return;
    setSendingTest(true); setTestSendResult(null);
    setTestSendResult(await sendSms(testPhone, testText));
    setSendingTest(false);
  }

  async function handleSaveReminders() {
    const s = { enabled: reminderEnabled, timing: reminderTiming, vrijeme: reminderVrijeme };
    setReminderSettings(s);
    await syncReminderSettingsToDb(s);
    setReminderSaved(true);
    setTimeout(() => setReminderSaved(false), 3000);
  }

  return (
    <PinGate title="Podesavanja">
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Podesavanja</h2>
          <p className="text-sm text-gray-500 mt-1">SMS, podsjetnici i sistemska konfiguracija</p>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6">
          {([
            { key: 'sms' as const, label: 'SMS konfiguracija' },
            { key: 'podsjetnici' as const, label: 'Podsjetnici' },
            { key: 'korisnik' as const, label: 'Korisnik' },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'sms' && (
          <div className="space-y-6">
            {configured ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <p className="text-sm text-green-800">SMS konfigurisan. Sender: <strong>{getSmsConfig().senderName}</strong></p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2">
                <SettingsIcon size={18} className="text-amber-600" />
                <p className="text-sm text-amber-800">SMS nije konfigurisan.</p>
              </div>
            )}
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">SMS API</h3>
              <div className="space-y-4 max-w-md">
                <Input label="API kljuc *" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API kljuc" />
                <Input label="Sender Name *" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="MOA" />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <div className="flex gap-2">
                  <Button onClick={handleSaveConfig} disabled={!apiKey || !senderName}>Sacuvaj</Button>
                  <Button variant="secondary" onClick={handleTestConnection} disabled={!apiKey || testing}>
                    {testing ? <Loader2 size={16} className="animate-spin" /> : 'Test konekcije'}
                  </Button>
                </div>
                {configSaved && <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={16} /> Sacuvano</div>}
                {testResult && <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>{testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}{testResult.success ? 'Konekcija OK!' : `Greska: ${testResult.error}`}</div>}
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Test SMS</h3>
              <div className="space-y-4 max-w-md">
                <Input label="Telefon *" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+38269..." />
                <Button onClick={handleSendTestSms} disabled={!testPhone || !configured || sendingTest}>
                  {sendingTest ? <><Loader2 size={16} className="animate-spin" /> Saljem...</> : <><Send size={16} /> Posalji test</>}
                </Button>
                {testSendResult && <div className={`flex items-center gap-2 text-sm ${testSendResult.success ? 'text-green-600' : 'text-red-600'}`}>{testSendResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}{testSendResult.success ? 'Poslano!' : `Greska: ${testSendResult.error}`}</div>}
              </div>
            </Card>
          </div>
        )}

        {tab === 'podsjetnici' && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Automatski SMS podsjetnici</h3>
            <div className="space-y-4 max-w-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Omoguci automatske podsjetnike</p>
                  <p className="text-xs text-gray-400">SMS se salje automatski</p>
                </div>
                <button onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reminderEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kada slati</label>
                <select value={reminderTiming} onChange={(e) => setReminderTiming(e.target.value as ReminderTiming)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="dan_termina">Na dan termina</option>
                  <option value="dan_prije">Dan prije termina</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vrijeme slanja</label>
                <input type="time" value={reminderVrijeme} onChange={(e) => setReminderVrijeme(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveReminders}>Sacuvaj</Button>
                {reminderSaved && <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle size={16} /> Sacuvano</span>}
              </div>
            </div>
          </Card>
        )}

        {tab === 'korisnik' && (
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Trenutni korisnik</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-lg">
                {user?.ime?.charAt(0)}{user?.prezime?.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.ime} {user?.prezime}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <p className="text-xs text-primary-600 font-medium uppercase">{user?.uloga}</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </PinGate>
  );
}
