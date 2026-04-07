import { useState, useEffect } from 'react';
import { Bell, Send, MessageSquare, Mail, Settings, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { getSmsConfig, setSmsConfig, isSmsConfigured, sendSms, testSmsConnection } from '../lib/smsService';
import { useCalendar } from '../contexts/CalendarContext';

type NotifyTab = 'reminders' | 'config' | 'templates' | 'log';

const statusColors: Record<string, string> = {
  sent: 'text-green-600 bg-green-100',
  failed: 'text-red-600 bg-red-100',
};
const statusLabels: Record<string, string> = {
  sent: 'Poslano',
  failed: 'Neuspjelo',
};
const tipLabels: Record<string, string> = {
  potvrda: 'Potvrda',
  podsjetnik: 'Podsjetnik',
  otkazivanje: 'Otkazivanje',
  potvrdjivanje: 'Potvrda statusa',
};

export default function Notifications() {
  const [tab, setTab] = useState<NotifyTab>('config');
  const { smsLog } = useCalendar();

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

  useEffect(() => {
    const config = getSmsConfig();
    setApiKey(config.apiKey);
    setSenderName(config.senderName);
    setEmail(config.email);
  }, []);

  function handleSaveConfig() {
    setSmsConfig(apiKey, senderName, email);
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

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Notifikacije</h2>
        <p className="text-sm text-gray-500 mt-1">SMS obavijesti za pacijente</p>
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
      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6">
        {[
          { key: 'config' as const, label: 'Konfiguracija' },
          { key: 'reminders' as const, label: 'Podsjetnici' },
          { key: 'templates' as const, label: 'Sabloni' },
          { key: 'log' as const, label: 'Log poruka' },
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
        </div>
      )}

      {tab === 'reminders' && (
        <div className="space-y-6">
          <Card>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Automatski podsjetnici</h3>
            <div className="space-y-3">
              {[
                { name: 'Potvrda zakazivanja', active: configured, kanal: 'SMS pri kreiranju termina' },
                { name: 'Obavijest o otkazivanju', active: configured, kanal: 'SMS kad se termin otkaze' },
                { name: 'Potvrda statusa', active: configured, kanal: 'SMS kad se termin potvrdi' },
                { name: '24h prije termina (planirano)', active: false, kanal: 'Faza 2' },
                { name: '2h prije termina (planirano)', active: false, kanal: 'Faza 2' },
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
    </div>
  );
}
