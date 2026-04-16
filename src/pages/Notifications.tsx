import { useState, useEffect, useMemo } from 'react';
import { Bell, Send, Settings, CheckCircle, XCircle, Loader2, Clock, BarChart3, Filter } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { getSmsConfig, setSmsConfig, isSmsConfigured, sendSms, testSmsConnection, loadSmsConfigFromDb, syncSmsConfigToDb } from '../lib/smsService';
import {
  getOmniConfig, setOmniConfig, isOmniConfigured, testOmniConnection, sendTestOmniMessage,
  loadOmniConfigFromDb, syncOmniConfigToDb, type ChannelMode,
} from '../lib/omniService';
import {
  getReminderSettings, setReminderSettings, syncReminderSettingsToDb,
  loadReminderSettingsFromDb, type ReminderTiming,
} from '../lib/reminderSettings';
import { useCalendar } from '../contexts/CalendarContext';

type NotifyTab = 'reminders' | 'config' | 'templates' | 'log' | 'izvjestaj';

const statusColors: Record<string, string> = {
  sent: 'text-green-600 bg-green-100',
  delivered: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
  pending: 'text-amber-600 bg-amber-100',
};
const statusLabels: Record<string, string> = {
  sent: 'Poslano',
  delivered: 'Isporuceno',
  failed: 'Neuspjelo',
  pending: 'Na cekanju',
};
const tipLabels: Record<string, string> = {
  potvrda: 'Potvrda',
  podsjetnik: 'Podsjetnik',
  otkazivanje: 'Otkazivanje',
  potvrdjivanje: 'Potvrda statusa',
  anketa: 'Anketa',
};

export default function Notifications() {
  const [tab, setTab] = useState<NotifyTab>('config');
  const { smsLog, refreshSmsLog } = useCalendar();

  // SMS Config state
  const [apiKey, setApiKey] = useState('');
  const [senderName, setSenderName] = useState('');
  const [email, setEmail] = useState('');
  const [configSaved, setConfigSaved] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Test SMS
  const [testPhone, setTestPhone] = useState('');
  const [testText, setTestText] = useState('Test poruka iz Ordinacija sistema');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ success: boolean; error?: string } | null>(null);

  // Omni (Viber) Config state
  const [omniUserId, setOmniUserId] = useState('');
  const [omniAuthKey, setOmniAuthKey] = useState('');
  const [omniChannelMode, setOmniChannelMode] = useState<ChannelMode>('sms');
  const [omniSaved, setOmniSaved] = useState(false);
  const [omniTesting, setOmniTesting] = useState(false);
  const [omniTestResult, setOmniTestResult] = useState<{ success: boolean; error?: string; balance?: number; username?: string } | null>(null);
  const [omniTestPhone, setOmniTestPhone] = useState('');
  const [omniTestText, setOmniTestText] = useState('Test Viber poruka iz Ordinacija sistema');
  const [omniSendingTest, setOmniSendingTest] = useState(false);
  const [omniTestSendResult, setOmniTestSendResult] = useState<{ success: boolean; error?: string; sending_id?: string } | null>(null);

  // Reminder settings
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTiming, setReminderTiming] = useState<ReminderTiming>('dan_termina');
  const [reminderVrijeme, setReminderVrijeme] = useState('08:00');
  const [reminderSaved, setReminderSaved] = useState(false);

  // Izvjestaj filter
  const [izvjestajFilter, setIzvjestajFilter] = useState<'sve' | 'sent' | 'failed'>('sve');
  const [izvjestajTip, setIzvjestajTip] = useState<'sve' | 'potvrda' | 'podsjetnik' | 'otkazivanje' | 'potvrdjivanje'>('sve');
  const [izvjestajDateFrom, setIzvjestajDateFrom] = useState('');
  const [izvjestajDateTo, setIzvjestajDateTo] = useState('');
  const [izvjestajRefreshing, setIzvjestajRefreshing] = useState(false);

  useEffect(() => {
    // Prvo ucitaj iz localStorage za instant prikaz
    const localConfig = getSmsConfig();
    setApiKey(localConfig.apiKey);
    setSenderName(localConfig.senderName);
    setEmail(localConfig.email);

    const rs = getReminderSettings();
    setReminderEnabled(rs.enabled);
    setReminderTiming(rs.timing);
    setReminderVrijeme(rs.vrijeme);

    // Omni (Viber) config iz localStorage
    const localOmni = getOmniConfig();
    setOmniUserId(localOmni.userId);
    setOmniAuthKey(localOmni.authKey);
    setOmniChannelMode(localOmni.channelMode);

    // Zatim sinhronizuj iz Supabase (za novi uredjaj / drugi PC)
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

      const dbSettings = await loadReminderSettingsFromDb();
      if (dbSettings) {
        setReminderEnabled(dbSettings.enabled);
        setReminderTiming(dbSettings.timing);
        setReminderVrijeme(dbSettings.vrijeme);
        setReminderSettings(dbSettings);
      }
    })();
  }, []);

  async function handleSaveOmniConfig() {
    const cfg = { userId: omniUserId, authKey: omniAuthKey, channelMode: omniChannelMode };
    setOmniConfig(cfg);
    const result = await syncOmniConfigToDb(cfg);
    if (!result.success) {
      alert('Greska pri snimanju Omni konfiguracije: ' + (result.error || 'nepoznato'));
      return;
    }
    setOmniSaved(true);
    setTimeout(() => setOmniSaved(false), 3000);
  }

  async function handleTestOmniConnection() {
    setOmniTesting(true);
    setOmniTestResult(null);
    const result = await testOmniConnection();
    setOmniTestResult(result);
    setOmniTesting(false);
  }

  async function handleSendOmniTest() {
    if (!omniTestPhone) return;
    setOmniSendingTest(true);
    setOmniTestSendResult(null);
    const result = await sendTestOmniMessage(omniTestPhone, omniTestText, 'viber');
    setOmniTestSendResult(result);
    setOmniSendingTest(false);
  }

  async function handleSaveReminders() {
    const settings = { enabled: reminderEnabled, timing: reminderTiming, vrijeme: reminderVrijeme };
    setReminderSettings(settings);
    await syncReminderSettingsToDb(settings);
    setReminderSaved(true);
    setTimeout(() => setReminderSaved(false), 3000);
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
    setTesting(true);
    setTestResult(null);
    const result = await testSmsConnection();
    setTestResult(result);
    setTesting(false);
  }

  async function handleSendTestSms() {
    if (!testPhone) return;
    setSendingTest(true);
    setTestSendResult(null);
    const result = await sendSms(testPhone, testText);
    setTestSendResult(result);
    setSendingTest(false);
  }

  const configured = isSmsConfigured();

  const sentToday = smsLog.filter((l) => {
    const today = new Date().toISOString().slice(0, 10);
    return l.datum.startsWith(today);
  });
  const sentCount = sentToday.filter((l) => l.status === 'sent').length;
  const failedCount = sentToday.filter((l) => l.status === 'failed').length;

  // Auto-refresh kad se otvori izvjestaj tab
  useEffect(() => {
    if (tab !== 'izvjestaj') return;
    (async () => {
      setIzvjestajRefreshing(true);
      await refreshSmsLog();
      setIzvjestajRefreshing(false);
    })();
  }, [tab, refreshSmsLog]);

  async function handleRefreshIzvjestaj() {
    setIzvjestajRefreshing(true);
    await refreshSmsLog();
    setIzvjestajRefreshing(false);
  }

  // Filtrirani log za izvjestaj (sort po datumu, najnovije prvo)
  const filteredLog = useMemo(() => {
    const fromTs = izvjestajDateFrom ? new Date(`${izvjestajDateFrom}T00:00:00`).getTime() : null;
    const toTs = izvjestajDateTo ? new Date(`${izvjestajDateTo}T23:59:59`).getTime() : null;

    return smsLog
      .filter((entry) => {
        if (izvjestajFilter !== 'sve' && entry.status !== izvjestajFilter) return false;
        if (izvjestajTip !== 'sve' && entry.tip !== izvjestajTip) return false;
        if (fromTs || toTs) {
          const ts = new Date(entry.datum).getTime();
          if (fromTs && ts < fromTs) return false;
          if (toTs && ts > toTs) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [smsLog, izvjestajFilter, izvjestajTip, izvjestajDateFrom, izvjestajDateTo]);

  // Statistika za izvjestaj
  const stats = useMemo(() => {
    const total = smsLog.length;
    const sent = smsLog.filter((l) => l.status === 'sent').length;
    const failed = smsLog.filter((l) => l.status === 'failed').length;
    const byTip: Record<string, { sent: number; failed: number; total: number }> = {};
    for (const entry of smsLog) {
      if (!byTip[entry.tip]) byTip[entry.tip] = { sent: 0, failed: 0, total: 0 };
      byTip[entry.tip].total++;
      if (entry.status === 'sent') byTip[entry.tip].sent++;
      else byTip[entry.tip].failed++;
    }
    return { total, sent, failed, byTip };
  }, [smsLog]);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Notifikacije</h2>
        <p className="text-sm text-gray-500 mt-1">SMS/Viber log i izvjestaj poruka</p>
      </div>

      {/* Banner: podesavanja su premjestena u Settings */}
      <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-primary-600" />
          <div>
            <p className="text-sm font-semibold text-primary-900">Konfiguracija, Podsjetnici i Sabloni poruka su premjesteni u Podesavanja</p>
            <p className="text-xs text-primary-700 mt-0.5">SMS/Viber kredencijali, timing podsjetnika i uredjivanje template-a dostupni su na stranici Podesavanja (sifrom zasticeno).</p>
          </div>
        </div>
        <a
          href="/settings"
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors whitespace-nowrap"
        >
          Otvori Podesavanja →
        </a>
      </div>

      {/* Status banner */}
      {configured ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <CheckCircle size={18} className="text-green-600" />
          <p className="text-sm text-green-800">
            SMS je konfigurisan. Sender: <strong>{getSmsConfig().senderName}</strong>
          </p>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-2">
          <Settings size={18} className="text-amber-600" />
          <p className="text-sm text-amber-800">
            SMS nije konfigurisan. Unesite API kljuc i sender name na tabu <strong>Konfiguracija</strong>.
          </p>
        </div>
      )}

      {/* Tabovi */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6 flex-wrap">
        {[
          { key: 'config' as const, label: 'Konfiguracija' },
          { key: 'reminders' as const, label: 'Podsjetnici' },
          { key: 'templates' as const, label: 'Sabloni' },
          { key: 'log' as const, label: 'Log poruka' },
          { key: 'izvjestaj' as const, label: 'Izvjestaj' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'config' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">SMS API konfiguracija</h3>
            <div className="space-y-4 max-w-md">
              <Input
                label="API kljuc *"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Unesite API kljuc iz radiant-sms"
              />
              <Input
                label="Sender Name *"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="npr. Ordinacija"
              />
              <Input
                label="Email (za logovanje)"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@ordinacija.me"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveConfig} disabled={!apiKey || !senderName}>
                  Sacuvaj konfiguraciju
                </Button>
                <Button variant="secondary" onClick={handleTestConnection} disabled={!apiKey || testing}>
                  {testing ? <Loader2 size={16} className="animate-spin" /> : 'Test konekcije'}
                </Button>
              </div>

              {configSaved && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle size={16} /> Konfiguracija sacuvana
                </div>
              )}
              {testResult && (
                <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {testResult.success ? 'Konekcija uspjesna!' : `Greska: ${testResult.error}`}
                </div>
              )}
            </div>
          </Card>

          {/* Test SMS slanje */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Posalji test SMS</h3>
            <div className="space-y-4 max-w-md">
              <Input
                label="Broj telefona *"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+38269123456"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tekst poruke</label>
                <textarea
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <Button onClick={handleSendTestSms} disabled={!testPhone || !configured || sendingTest}>
                {sendingTest ? (
                  <><Loader2 size={16} className="animate-spin" /> Saljem...</>
                ) : (
                  <><Send size={16} /> Posalji test SMS</>
                )}
              </Button>
              {testSendResult && (
                <div className={`flex items-center gap-2 text-sm ${testSendResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {testSendResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {testSendResult.success ? 'SMS uspjesno poslan!' : `Greska: ${testSendResult.error}`}
                </div>
              )}
            </div>
          </Card>

          {/* Omni Messaging (Viber) konfiguracija */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Omni Messaging (Viber) — konfiguracija</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Viber Business</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Kredencijali za api.omni-messaging.com. Viber poruke se salju direktno na broj telefona bez opt-in-a.
              SMS i dalje ide preko licnog SMS provajdera (rakunat).
            </p>
            <div className="space-y-4 max-w-md">
              <Input
                label="User ID (Omni) *"
                value={omniUserId}
                onChange={(e) => setOmniUserId(e.target.value)}
                placeholder="Omni User ID iz admin panela"
              />
              <Input
                label="Auth Key (Omni) *"
                type="password"
                value={omniAuthKey}
                onChange={(e) => setOmniAuthKey(e.target.value)}
                placeholder="Omni Auth Key"
              />
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
                <p className="text-xs text-gray-400 mt-1">
                  {omniChannelMode === 'viber_then_sms'
                    ? 'Prvo se salje Viber. Ako ne stigne u 5 min ili primalac nije Viber korisnik, automatski SMS preko rakunat.'
                    : omniChannelMode === 'viber'
                    ? 'Samo Viber. Ako primalac nije Viber korisnik, poruka nece biti isporucena.'
                    : 'Samo SMS preko rakunat. Omni se ne koristi.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveOmniConfig} disabled={!omniUserId || !omniAuthKey}>
                  Sacuvaj Omni konfiguraciju
                </Button>
                <Button variant="secondary" onClick={handleTestOmniConnection} disabled={!omniUserId || !omniAuthKey || omniTesting}>
                  {omniTesting ? <Loader2 size={16} className="animate-spin" /> : 'Test konekcije'}
                </Button>
              </div>

              {omniSaved && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle size={16} /> Omni konfiguracija sacuvana
                </div>
              )}
              {omniTestResult && (
                <div className={`flex items-center gap-2 text-sm ${omniTestResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {omniTestResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {omniTestResult.success
                    ? `Povezano! Balance: ${omniTestResult.balance?.toFixed(2) ?? '—'} ${omniTestResult.username ? `(${omniTestResult.username})` : ''}`
                    : `Greska: ${omniTestResult.error}`}
                </div>
              )}
            </div>
          </Card>

          {/* Test Viber slanje */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Posalji test Viber poruku</h3>
            <div className="space-y-4 max-w-md">
              <Input
                label="Broj telefona *"
                value={omniTestPhone}
                onChange={(e) => setOmniTestPhone(e.target.value)}
                placeholder="+38267123456"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tekst poruke (max 1000 char)</label>
                <textarea
                  value={omniTestText}
                  onChange={(e) => setOmniTestText(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{omniTestText.length} / 1000</p>
              </div>
              <Button onClick={handleSendOmniTest} disabled={!omniTestPhone || !isOmniConfigured() || omniSendingTest}>
                {omniSendingTest ? (
                  <><Loader2 size={16} className="animate-spin" /> Saljem...</>
                ) : (
                  <><Send size={16} /> Posalji test Viber</>
                )}
              </Button>
              {omniTestSendResult && (
                <div className={`flex items-center gap-2 text-sm ${omniTestSendResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {omniTestSendResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                  {omniTestSendResult.success
                    ? `Poslato! Sending ID: ${omniTestSendResult.sending_id}`
                    : `Greska: ${omniTestSendResult.error}`}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {tab === 'reminders' && (
        <div className="space-y-6">
          {/* Aktivne notifikacije */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Aktivne notifikacije</h3>
            <div className="space-y-3">
              {[
                { name: 'Potvrda zakazivanja', active: configured, kanal: 'SMS pri kreiranju termina' },
                { name: 'Obavijest o otkazivanju', active: configured, kanal: 'SMS kad se termin otkaze' },
                { name: 'Potvrda statusa', active: configured, kanal: 'SMS kad se termin potvrdi' },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.name}</p>
                      <p className="text-xs text-gray-400">{item.kanal}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {item.active ? 'Aktivan' : 'Neaktivan'}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Podesavanja automatskih podsjetnika */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Automatski SMS podsjetnici</h3>
            </div>

            <div className="space-y-4 max-w-md">
              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Omoguci automatske podsjetnike</p>
                  <p className="text-xs text-gray-400">SMS se salje automatski putem Supabase Edge Function</p>
                </div>
                <button
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    reminderEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Timing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kada slati podsjetnik</label>
                <select
                  value={reminderTiming}
                  onChange={(e) => setReminderTiming(e.target.value as ReminderTiming)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="dan_termina">Na dan termina</option>
                  <option value="dan_prije">Dan prije termina</option>
                  <option value="sat_prije">Sat prije termina</option>
                </select>
              </div>

              {/* Vrijeme — samo za dan_termina / dan_prije */}
              {reminderTiming !== 'sat_prije' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vrijeme slanja</label>
                  <input
                    type="time"
                    value={reminderVrijeme}
                    onChange={(e) => setReminderVrijeme(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {reminderTiming === 'dan_termina'
                      ? 'SMS ce biti poslan u ovo vrijeme na dan termina'
                      : 'SMS ce biti poslan u ovo vrijeme dan prije termina'}
                  </p>
                </div>
              )}
              {reminderTiming === 'sat_prije' && (
                <p className="text-xs text-gray-500">
                  SMS ce biti automatski poslan oko sat prije svakog pojedinacnog termina.
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={handleSaveReminders}>
                  Sacuvaj podesavanja
                </Button>
                {reminderSaved && (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle size={16} /> Sacuvano
                  </span>
                )}
              </div>

              {!configured && reminderEnabled && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  SMS API nije konfigurisan. Podsjetnici nece raditi dok ne podesite API na tabu Konfiguracija.
                </div>
              )}
            </div>
          </Card>

          {/* Status podsjetnika */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Status</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full ${reminderEnabled && configured ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <p className="text-sm text-gray-700">
                {reminderEnabled && configured
                  ? reminderTiming === 'sat_prije'
                    ? 'Podsjetnici aktivni — sat prije svakog termina'
                    : `Podsjetnici aktivni — slanje u ${reminderVrijeme}h, ${reminderTiming === 'dan_termina' ? 'na dan termina' : 'dan prije termina'}`
                  : 'Podsjetnici neaktivni'}
              </p>
            </div>
          </Card>

          {/* Statistika */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <p className="text-sm text-gray-500">Poslano danas</p>
              <p className="text-2xl font-bold text-gray-900">{sentToday.length}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Uspjesno</p>
              <p className="text-2xl font-bold text-green-600">{sentCount}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Neuspjelo</p>
              <p className="text-2xl font-bold text-red-600">{failedCount}</p>
            </Card>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">SMS sabloni</h3>
          <div className="space-y-3">
            {[
              { name: 'Potvrda zakazivanja', text: 'Postovani/a {ime}, vas termin je zakazan za {datum} u {vrijeme}h. Ljekar: {doctor}.' },
              { name: 'Otkazivanje', text: 'Postovani/a {ime}, vas termin zakazan za {datum} u {vrijeme}h je otkazan. Molimo kontaktirajte nas za novi termin.' },
              { name: 'Potvrda statusa', text: 'Postovani/a {ime}, vas termin za {datum} u {vrijeme}h je potvrdjen. Ljekar: {doctor}.' },
              { name: 'Podsjetnik', text: 'Podsjetnik: {ime}, imate termin {datum} u {vrijeme}h. Molimo potvrdite dolazak.' },
            ].map((tmpl) => (
              <div key={tmpl.name} className="border border-border rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 mb-1">{tmpl.name}</p>
                <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">{tmpl.text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'log' && (
        <Card padding={false}>
          <div className="px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Log poslanih poruka</h3>
          </div>
          {smsLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Bell size={48} className="mb-4" />
              <p className="text-lg font-medium">Nema poslanih poruka</p>
              <p className="text-sm mt-1">SMS poruke ce se pojaviti ovdje nakon slanja</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {smsLog.map((entry) => {
                const sColor = statusColors[entry.status] || 'text-gray-600 bg-gray-100';
                const sLabel = statusLabels[entry.status] || entry.status;

                return (
                  <div key={entry.id} className="px-6 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                      <Send size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{entry.patient}</p>
                      <p className="text-xs text-gray-500 truncate">{entry.text}</p>
                      {entry.error && <p className="text-xs text-red-500 mt-0.5">{entry.error}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sColor}`}>{sLabel}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                          {tipLabels[entry.tip] || entry.tip}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{entry.datum.replace('T', ' ').slice(0, 16)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === 'izvjestaj' && (
        <div className="space-y-6">
          {/* Ukupna statistika */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card>
              <p className="text-sm text-gray-500">Ukupno poruka</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Uspjesno poslano</p>
              <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Neuspjelo</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </Card>
            <Card>
              <p className="text-sm text-gray-500">Uspjesnost</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
              </p>
            </Card>
          </div>

          {/* Statistika po tipu */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Po tipu poruke</h3>
            </div>
            <div className="space-y-3">
              {Object.entries(stats.byTip).map(([tip, data]) => (
                <div key={tip} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tipLabels[tip] || tip}</p>
                    <p className="text-xs text-gray-400">Ukupno: {data.total}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">{data.sent} poslano</span>
                    {data.failed > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">{data.failed} neuspjelo</span>
                    )}
                    {/* Progress bar */}
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${data.total > 0 ? (data.sent / data.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              {Object.keys(stats.byTip).length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Nema podataka</p>
              )}
            </div>
          </Card>

          {/* Filtrirani detaljan izvjestaj */}
          <Card padding={false}>
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Detaljan izvjestaj</h3>
                </div>
                <div className="flex gap-2 flex-wrap items-center">
                  <input
                    type="date"
                    value={izvjestajDateFrom}
                    onChange={(e) => setIzvjestajDateFrom(e.target.value)}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    title="Od datuma"
                  />
                  <span className="text-xs text-gray-400">–</span>
                  <input
                    type="date"
                    value={izvjestajDateTo}
                    onChange={(e) => setIzvjestajDateTo(e.target.value)}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    title="Do datuma"
                  />
                  <select
                    value={izvjestajFilter}
                    onChange={(e) => setIzvjestajFilter(e.target.value as any)}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="sve">Svi statusi</option>
                    <option value="sent">Poslano</option>
                    <option value="failed">Neuspjelo</option>
                  </select>
                  <select
                    value={izvjestajTip}
                    onChange={(e) => setIzvjestajTip(e.target.value as any)}
                    className="px-3 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="sve">Svi tipovi</option>
                    <option value="potvrda">Potvrda</option>
                    <option value="podsjetnik">Podsjetnik</option>
                    <option value="otkazivanje">Otkazivanje</option>
                    <option value="potvrdjivanje">Potvrda statusa</option>
                    <option value="anketa">Anketa</option>
                  </select>
                  <button
                    onClick={handleRefreshIzvjestaj}
                    disabled={izvjestajRefreshing}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 disabled:opacity-50"
                  >
                    {izvjestajRefreshing ? 'Osvjezavam...' : 'Osvjezi'}
                  </button>
                </div>
              </div>
            </div>

            {filteredLog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <BarChart3 size={48} className="mb-4" />
                <p className="text-lg font-medium">Nema rezultata</p>
                <p className="text-sm mt-1">Promijenite filtere ili sacekajte slanje poruka</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-2 bg-gray-50 border-b border-border text-xs text-gray-500 font-medium flex items-center gap-4">
                  <span className="w-44">Pacijent</span>
                  <span className="flex-1">Poruka</span>
                  <span className="w-24 text-center">Tip</span>
                  <span className="w-20 text-center">Status</span>
                  <span className="w-32 text-right">Datum</span>
                </div>
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {filteredLog.map((entry) => {
                    const sColor = statusColors[entry.status] || 'text-gray-600 bg-gray-100';
                    const sLabel = statusLabels[entry.status] || entry.status;

                    return (
                      <div key={entry.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                        <div className="w-44 shrink-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.patient || '—'}</p>
                          {entry.phone && <p className="text-xs text-gray-400">{entry.phone}</p>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 truncate">{entry.text}</p>
                          {entry.error && <p className="text-xs text-red-500 mt-0.5">{entry.error}</p>}
                        </div>
                        <div className="w-24 text-center shrink-0">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                            {tipLabels[entry.tip] || entry.tip}
                          </span>
                        </div>
                        <div className="w-20 text-center shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sColor}`}>{sLabel}</span>
                        </div>
                        <div className="w-32 text-right shrink-0">
                          <p className="text-xs text-gray-400">{entry.datum.replace('T', ' ').slice(0, 16)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-6 py-3 border-t border-border bg-gray-50 text-xs text-gray-500">
                  Prikazano {filteredLog.length} od {smsLog.length} poruka
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
