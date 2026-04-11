import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Send, XCircle, Settings as SettingsIcon, MessageSquare, Bell, User as UserIcon, Smartphone, FileText } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import PinGate from '../components/ui/PinGate';
import { getSmsConfig, setSmsConfig, isSmsConfigured, sendSms, testSmsConnection, loadSmsConfigFromDb, syncSmsConfigToDb } from '../lib/smsService';
import {
  getOmniConfig, setOmniConfig, isOmniConfigured, testOmniConnection, sendTestOmniMessage,
  loadOmniConfigFromDb, syncOmniConfigToDb, type ChannelMode,
} from '../lib/omniService';
import { getReminderSettings, setReminderSettings, syncReminderSettingsToDb, loadReminderSettingsFromDb, type ReminderTiming } from '../lib/reminderSettings';
import {
  DEFAULT_TEMPLATES, getTemplatesLocal, loadTemplatesFromDb, saveTemplatesToDb,
  type MessageTemplates, type MessageTip, type MessageKanal,
} from '../lib/messageTemplates';
import { useAuth } from '../contexts/AuthContext';

type SettingsTab = 'sms' | 'viber' | 'podsjetnici' | 'sabloni' | 'korisnik';

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

  // Omni / Viber
  const [omniUserId, setOmniUserId] = useState('');
  const [omniAuthKey, setOmniAuthKey] = useState('');
  const [omniChannelMode, setOmniChannelMode] = useState<ChannelMode>('sms');
  const [omniSaved, setOmniSaved] = useState(false);
  const [omniTesting, setOmniTesting] = useState(false);
  const [omniTestResult, setOmniTestResult] = useState<{ success: boolean; error?: string; balance?: number; username?: string } | null>(null);
  const [omniTestPhone, setOmniTestPhone] = useState('');
  const [omniSendingTest, setOmniSendingTest] = useState(false);
  const [omniTestSendResult, setOmniTestSendResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Sabloni poruka (SMS + Viber)
  const [templates, setTemplates] = useState<MessageTemplates>(DEFAULT_TEMPLATES);
  const [templatesSaved, setTemplatesSaved] = useState(false);
  const [activeTemplateKanal, setActiveTemplateKanal] = useState<MessageKanal>('sms');

  const configured = isSmsConfigured();
  const omniConfigured = isOmniConfigured();

  useEffect(() => {
    const config = getSmsConfig();
    setApiKey(config.apiKey);
    setSenderName(config.senderName);
    setEmail(config.email);

    const omni = getOmniConfig();
    setOmniUserId(omni.userId);
    setOmniAuthKey(omni.authKey);
    setOmniChannelMode(omni.channelMode);

    const rs = getReminderSettings();
    setReminderEnabled(rs.enabled);
    setReminderTiming(rs.timing);
    setReminderVrijeme(rs.vrijeme);

    setTemplates(getTemplatesLocal());

    (async () => {
      const loaded = await loadSmsConfigFromDb();
      if (loaded) {
        const fresh = getSmsConfig();
        setApiKey(fresh.apiKey);
        setSenderName(fresh.senderName);
        setEmail(fresh.email);
      }

      const omniLoaded = await loadOmniConfigFromDb();
      if (omniLoaded) {
        const freshOmni = getOmniConfig();
        setOmniUserId(freshOmni.userId);
        setOmniAuthKey(freshOmni.authKey);
        setOmniChannelMode(freshOmni.channelMode);
      }

      const db = await loadReminderSettingsFromDb();
      if (db) { setReminderEnabled(db.enabled); setReminderTiming(db.timing); setReminderVrijeme(db.vrijeme); setReminderSettings(db); }

      const tmpl = await loadTemplatesFromDb();
      if (tmpl) setTemplates(tmpl);
    })();
  }, []);

  async function handleSaveOmniConfig() {
    const cfg = { userId: omniUserId, authKey: omniAuthKey, channelMode: omniChannelMode };
    setOmniConfig(cfg);
    const result = await syncOmniConfigToDb(cfg);
    if (!result.success) { alert('Greska: ' + (result.error || 'nepoznato')); return; }
    setOmniSaved(true);
    setTimeout(() => setOmniSaved(false), 3000);
  }

  async function handleTestOmni() {
    setOmniTesting(true); setOmniTestResult(null);
    setOmniTestResult(await testOmniConnection());
    setOmniTesting(false);
  }

  async function handleSendOmniTest() {
    if (!omniTestPhone) return;
    setOmniSendingTest(true); setOmniTestSendResult(null);
    setOmniTestSendResult(await sendTestOmniMessage(omniTestPhone, 'Test Viber poruka iz MOA sistema', 'viber'));
    setOmniSendingTest(false);
  }

  async function handleSaveTemplates() {
    const result = await saveTemplatesToDb(templates);
    if (!result.success) { alert('Greska pri snimanju sablona: ' + (result.error || 'nepoznato')); return; }
    setTemplatesSaved(true);
    setTimeout(() => setTemplatesSaved(false), 3000);
  }

  function updateTemplate(kanal: MessageKanal, tip: MessageTip, value: string) {
    setTemplates((prev) => ({
      ...prev,
      [kanal]: { ...prev[kanal], [tip]: value },
    }));
  }

  function resetTemplate(kanal: MessageKanal, tip: MessageTip) {
    setTemplates((prev) => ({
      ...prev,
      [kanal]: { ...prev[kanal], [tip]: DEFAULT_TEMPLATES[kanal][tip] },
    }));
  }

  async function handleSaveConfig() {
    setSmsConfig(apiKey, senderName, email);
    const result = await syncSmsConfigToDb(apiKey, senderName, email);
    if (!result.success) {
      alert('Greska pri snimanju u bazu: ' + (result.error || 'nepoznato'));
      return;
    }
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

        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6 flex-wrap">
          {([
            { key: 'sms' as const,         label: 'SMS (rakunat)', icon: Smartphone },
            { key: 'viber' as const,       label: 'Viber (Omni)',  icon: MessageSquare },
            { key: 'podsjetnici' as const, label: 'Podsjetnici',   icon: Bell },
            { key: 'sabloni' as const,     label: 'Sabloni poruka', icon: FileText },
            { key: 'korisnik' as const,    label: 'Korisnik',      icon: UserIcon },
          ]).map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2
                ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              <t.icon size={14} />
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
                  <option value="sat_prije">Sat prije termina</option>
                </select>
              </div>
              {reminderTiming !== 'sat_prije' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vrijeme slanja</label>
                  <input type="time" value={reminderVrijeme} onChange={(e) => setReminderVrijeme(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              )}
              {reminderTiming === 'sat_prije' && (
                <p className="text-xs text-gray-500">SMS se salje oko sat prije svakog pojedinacnog termina.</p>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={handleSaveReminders}>Sacuvaj</Button>
                {reminderSaved && <span className="flex items-center gap-1 text-green-600 text-sm"><CheckCircle size={16} /> Sacuvano</span>}
              </div>
            </div>
          </Card>
        )}

        {tab === 'viber' && (
          <div className="space-y-6">
            {omniConfigured ? (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-center gap-2">
                <CheckCircle size={18} className="text-purple-600" />
                <p className="text-sm text-purple-800">Omni (Viber) konfigurisan. Kanal: <strong>{omniChannelMode}</strong></p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-2">
                <SettingsIcon size={18} className="text-amber-600" />
                <p className="text-sm text-amber-800">Omni (Viber) nije konfigurisan.</p>
              </div>
            )}
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Omni kredencijali</h3>
              <div className="space-y-4 max-w-md">
                <Input label="User ID *" value={omniUserId} onChange={(e) => setOmniUserId(e.target.value)} placeholder="Omni User ID" />
                <Input label="Auth Key *" type="password" value={omniAuthKey} onChange={(e) => setOmniAuthKey(e.target.value)} placeholder="Auth Key" />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kanal za kampanje i podsjetnike</label>
                  <select
                    value={omniChannelMode}
                    onChange={(e) => setOmniChannelMode(e.target.value as ChannelMode)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="sms">Samo SMS (rakunat)</option>
                    <option value="viber">Samo Viber (Omni)</option>
                    <option value="viber_then_sms">Viber + SMS fallback (preporuceno)</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveOmniConfig} disabled={!omniUserId || !omniAuthKey}>Sacuvaj</Button>
                  <Button variant="secondary" onClick={handleTestOmni} disabled={!omniUserId || !omniAuthKey || omniTesting}>
                    {omniTesting ? <Loader2 size={16} className="animate-spin" /> : 'Test konekcije'}
                  </Button>
                </div>
                {omniSaved && <div className="flex items-center gap-2 text-green-600 text-sm"><CheckCircle size={16} /> Sacuvano</div>}
                {omniTestResult && (
                  <div className={`flex items-center gap-2 text-sm ${omniTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {omniTestResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {omniTestResult.success
                      ? `Konekcija OK${omniTestResult.balance !== undefined ? ` · Balance: ${omniTestResult.balance}` : ''}`
                      : `Greska: ${omniTestResult.error}`}
                  </div>
                )}
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Test Viber poruka</h3>
              <div className="space-y-4 max-w-md">
                <Input label="Telefon *" value={omniTestPhone} onChange={(e) => setOmniTestPhone(e.target.value)} placeholder="+38269..." />
                <Button onClick={handleSendOmniTest} disabled={!omniTestPhone || !omniConfigured || omniSendingTest}>
                  {omniSendingTest ? <><Loader2 size={16} className="animate-spin" /> Saljem...</> : <><Send size={16} /> Posalji test Viber</>}
                </Button>
                {omniTestSendResult && (
                  <div className={`flex items-center gap-2 text-sm ${omniTestSendResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {omniTestSendResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    {omniTestSendResult.success ? 'Poslano preko Omni' : `Greska: ${omniTestSendResult.error}`}
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {tab === 'sabloni' && (
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Sabloni poruka</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Placeholder-i: <code>{'{ime}'}</code>, <code>{'{prezime}'}</code>, <code>{'{ime_prezime}'}</code>, <code>{'{datum}'}</code>, <code>{'{vrijeme}'}</code>, <code>{'{doktor}'}</code>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                    {(['sms', 'viber'] as MessageKanal[]).map((k) => (
                      <button
                        key={k}
                        onClick={() => setActiveTemplateKanal(k)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors uppercase ${
                          activeTemplateKanal === k
                            ? k === 'sms' ? 'bg-sky-100 text-sky-700' : 'bg-purple-100 text-purple-700'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                {(['potvrda', 'podsjetnik', 'otkazivanje', 'potvrdjivanje'] as MessageTip[]).map((tip) => {
                  const labels: Record<MessageTip, string> = {
                    potvrda: 'Potvrda termina',
                    podsjetnik: 'Podsjetnik',
                    otkazivanje: 'Otkazivanje termina',
                    potvrdjivanje: 'Potvrda statusa',
                  };
                  const value = templates[activeTemplateKanal][tip];
                  const isDefault = value === DEFAULT_TEMPLATES[activeTemplateKanal][tip];

                  return (
                    <div key={tip}>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-semibold text-gray-700">
                          {labels[tip]}
                          <span className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full uppercase ${
                            activeTemplateKanal === 'sms' ? 'bg-sky-50 text-sky-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {activeTemplateKanal}
                          </span>
                        </label>
                        {!isDefault && (
                          <button
                            onClick={() => resetTemplate(activeTemplateKanal, tip)}
                            className="text-[10px] text-gray-400 hover:text-gray-600 uppercase tracking-wider"
                          >
                            Vrati na podrazumjevano
                          </button>
                        )}
                      </div>
                      <textarea
                        value={value}
                        onChange={(e) => updateTemplate(activeTemplateKanal, tip, e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                      />
                      <p className="text-[10px] text-gray-400 mt-0.5">{value.length} karaktera</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-border flex items-center gap-3">
                <Button onClick={handleSaveTemplates}>Sacuvaj sve sablone</Button>
                {templatesSaved && (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle size={16} /> Sacuvano
                  </span>
                )}
              </div>
            </Card>
          </div>
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
