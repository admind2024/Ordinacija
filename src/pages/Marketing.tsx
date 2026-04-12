import { useState, useEffect, useMemo } from 'react';
import {
  Megaphone, Users, Tags, Plus, Send, Trash2, Edit, Upload,
  CheckCircle, XCircle, Loader2, ChevronRight, BarChart3, Eye, MousePointer,
  Type as TypeIcon, Square, Image as ImageIcon, Video, Layers,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import {
  isOmniConfigured, estimateSmsParts, sendCampaign, estimateCampaignCost,
  type ChannelMode,
} from '../lib/omniService';

// ============================================================
// Tipovi
// ============================================================
type MarketingTab = 'kontakti' | 'grupe' | 'nova_kampanja' | 'kampanje' | 'izvjestaj';

interface Contact {
  id: string;
  ime: string;
  prezime: string | null;
  telefon: string;
  email: string | null;
  tags: string[] | null;
  napomena: string | null;
  created_at: string;
}

interface Group {
  id: string;
  naziv: string;
  tip: 'staticka' | 'dinamicka';
  filter_json: any;
  napomena: string | null;
  created_at: string;
  members_count?: number;
}

interface Campaign {
  id: string;
  naziv: string;
  channel_mode: ChannelMode;
  sms_text: string | null;
  viber_text: string | null;
  viber_caption: string | null;
  viber_action_url: string | null;
  viber_image_url: string | null;
  viber_video_url: string | null;
  viber_type: string | null;
  target_type: string;
  status: string;
  total_recipients: number;
  sent_viber: number;
  sent_sms: number;
  delivered_count: number;
  viber_delivered_count: number;
  sms_delivered_count: number;
  seen_count: number;
  clicked_count: number;
  fallback_count: number;
  failed_count: number;
  cost_estimation: number | null;
  cost_actual: number | null;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
  error: string | null;
}

interface PatientLite {
  id: string;
  ime: string;
  prezime: string;
  telefon: string | null;
  grad: string | null;
  datum_rodjenja: string | null;
  tagovi: string[] | null;
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-blue-100 text-blue-700',
  sending: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-200 text-gray-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  scheduled: 'Zakazana',
  sending: 'Slanje',
  completed: 'Zavrsena',
  failed: 'Neuspjesna',
  cancelled: 'Otkazana',
};

// ============================================================
// MAIN
// ============================================================
export default function Marketing() {
  const [tab, setTab] = useState<MarketingTab>('kampanje');
  const omniOk = isOmniConfigured();

  return (
    <div>
      {!omniOk && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-2">
          <Megaphone size={18} className="text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-800">
            Omni Messaging nije konfigurisan — Viber kampanje nece raditi. Podesi kredencijale u <strong>Notifikacije → Konfiguracija → Omni Messaging</strong>.
          </p>
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit mb-6 flex-wrap">
        {[
          { key: 'kampanje' as const, label: 'Kampanje', icon: Megaphone },
          { key: 'nova_kampanja' as const, label: 'Nova kampanja', icon: Plus },
          { key: 'izvjestaj' as const, label: 'Izvjestaj', icon: BarChart3 },
          { key: 'kontakti' as const, label: 'Kontakti', icon: Users },
          { key: 'grupe' as const, label: 'Grupe', icon: Tags },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2
              ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'kontakti' && <KontaktiTab />}
      {tab === 'grupe' && <GrupeTab />}
      {tab === 'nova_kampanja' && <NovaKampanjaTab onDone={() => setTab('kampanje')} />}
      {tab === 'kampanje' && <KampanjeTab />}
      {tab === 'izvjestaj' && <IzvjestajTab />}
    </div>
  );
}

// ============================================================
// TAB: IZVJESTAJ — objedinjeni izvjestaj svih poruka (kampanje + notifikacije)
// ============================================================

interface UnifiedMessage {
  id: string;
  source: 'kampanja' | 'podsjetnik' | 'potvrda' | 'otkazivanje' | 'potvrdjivanje' | 'test' | 'kontrola' | 'post_procedura';
  source_label: string;
  datum: string;
  primalac: string;
  telefon: string;
  kanal: string;
  status: string;
  viber_dlr: string | null;
  viber_message_status: string | null;
  sms_dlr: string | null;
  fallbacked: boolean;
  clicked: boolean;
  error: string | null;
  tekst: string | null;
  campaign_id?: string | null;
  /** Izracunat DLR za prikaz u Izvjestaju (uzima u obzir Omni DLR + rakunat status). */
  display_dlr: string;
}

/**
 * Finalni DLR prikaz po Omni semantici + rakunat-u:
 * - Ako je Viber DLR dostupan, on je primarni (ukljucuje i pending/expired/failed...)
 * - Ako je samo SMS DLR, mapiraj submitted -> delivered (rakunat gateway accepted)
 * - Ako nijedno, ali row ima `sent` status (SMS kroz rakunat), prikazi `sent`
 * - Ako je `failed`, prikazi `failed`
 * - Fallback: `pending`
 */
function computeDisplayDlr(m: {
  viber_dlr: string | null;
  sms_dlr: string | null;
  status: string;
  fallbacked: boolean;
  kanal: string;
}): string {
  // Viber kanal dominira ako postoji
  if (m.viber_dlr) {
    if (m.viber_dlr === 'delivered') return 'delivered';
    if (m.viber_dlr === 'pending') {
      // Ako je fallback vec prosao i SMS submitted, nije vise pending
      if (m.fallbacked && (m.sms_dlr === 'delivered' || m.sms_dlr === 'submitted')) return 'delivered';
      return 'pending';
    }
    // Failed/expired/blocked/not_viber_user/no_suitable_device
    if (m.fallbacked && (m.sms_dlr === 'delivered' || m.sms_dlr === 'submitted')) return 'delivered';
    return m.viber_dlr;
  }
  // SMS kroz Omni
  if (m.sms_dlr) {
    if (m.sms_dlr === 'delivered' || m.sms_dlr === 'submitted') return 'delivered';
    if (m.sms_dlr === 'pending') return 'pending';
    return m.sms_dlr;
  }
  // Nema DLR-a — SMS kroz rakunat ili failed
  if (m.status === 'failed') return 'failed';
  if (m.status === 'sent' || m.status === 'delivered') return 'sent';
  return 'pending';
}

function IzvjestajTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recipients, setRecipients] = useState<any[]>([]);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'sve' | 'kampanja' | 'podsjetnik' | 'potvrda' | 'test'>('sve');
  const [channelFilter, setChannelFilter] = useState<'sve' | 'viber' | 'sms'>('sve');

  async function load() {
    setLoading(true);

    // 1. Kampanje
    let cq = supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    if (dateFrom) cq = cq.gte('created_at', `${dateFrom}T00:00:00`);
    if (dateTo) cq = cq.lte('created_at', `${dateTo}T23:59:59`);
    const { data: camps, error: campsErr } = await cq;
    if (campsErr) console.error('[Izvjestaj] campaigns error:', campsErr);
    setCampaigns((camps || []) as Campaign[]);

    // 2. Campaign recipients za hronoloski feed
    const ids = (camps || []).map((c: any) => c.id);
    if (ids.length > 0) {
      const { data: recs, error: recsErr } = await supabase
        .from('campaign_recipients')
        .select('id, campaign_id, ime, telefon, channel_used, viber_dlr, viber_message_status, sms_dlr, fallbacked, clicked, error, created_at')
        .in('campaign_id', ids)
        .order('created_at', { ascending: false });
      if (recsErr) console.error('[Izvjestaj] campaign_recipients error:', recsErr);
      setRecipients(recs || []);
    } else {
      setRecipients([]);
    }

    // 3. Notifikacije (podsjetnici, potvrde, test poruke, itd. — sve osim campaign recipient-a)
    let nq = supabase
      .from('notifications')
      .select('id, tip, kanal, status, sadrzaj, patient_ime, patient_telefon, error, datum_slanja, channel_used, viber_dlr, viber_message_status, sms_dlr, fallbacked, omni_sending_id')
      .order('datum_slanja', { ascending: false });
    if (dateFrom) nq = nq.gte('datum_slanja', `${dateFrom}T00:00:00`);
    if (dateTo) nq = nq.lte('datum_slanja', `${dateTo}T23:59:59`);
    const { data: nsData, error: nsErr } = await nq;
    let ns: any[] = nsData || [];
    if (nsErr) {
      // Fallback: ako neka kolona fali (npr. prije migracije), ucitaj minimalan set kolona
      console.error('[Izvjestaj] notifications error, retrying with minimal columns:', nsErr);
      let fallback = supabase
        .from('notifications')
        .select('id, tip, kanal, status, sadrzaj, patient_ime, patient_telefon, error, datum_slanja')
        .order('datum_slanja', { ascending: false });
      if (dateFrom) fallback = fallback.gte('datum_slanja', `${dateFrom}T00:00:00`);
      if (dateTo) fallback = fallback.lte('datum_slanja', `${dateTo}T23:59:59`);
      const { data: ns2, error: ns2Err } = await fallback;
      if (ns2Err) console.error('[Izvjestaj] notifications fallback error:', ns2Err);
      ns = (ns2 || []) as any[];
    }
    setNotifs(ns);

    setLoading(false);
  }

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  // Objedinjen hronoloski feed
  const unifiedMessages = useMemo<UnifiedMessage[]>(() => {
    const campaignMap = new Map(campaigns.map((c) => [c.id, c]));

    const fromRecipients: UnifiedMessage[] = recipients.map((r: any) => {
      const camp = campaignMap.get(r.campaign_id);
      const kanal = r.channel_used || '—';
      const fallbacked = !!r.fallbacked;
      const status = r.viber_dlr === 'delivered' || r.sms_dlr === 'delivered' || r.sms_dlr === 'submitted' ? 'sent' : (r.viber_dlr || r.sms_dlr || 'pending');
      return {
        id: `cr-${r.id}`,
        source: 'kampanja',
        source_label: camp ? `Kampanja: ${camp.naziv}` : 'Kampanja',
        datum: r.created_at,
        primalac: r.ime,
        telefon: r.telefon,
        kanal,
        status,
        viber_dlr: r.viber_dlr,
        viber_message_status: r.viber_message_status,
        sms_dlr: r.sms_dlr,
        fallbacked,
        clicked: !!r.clicked,
        error: r.error,
        tekst: camp?.viber_text || camp?.sms_text || null,
        campaign_id: r.campaign_id,
        display_dlr: computeDisplayDlr({ viber_dlr: r.viber_dlr, sms_dlr: r.sms_dlr, status, fallbacked, kanal }),
      };
    });

    const fromNotifs: UnifiedMessage[] = notifs.map((n: any) => {
      const kanal = n.channel_used || n.kanal || '—';
      const fallbacked = !!n.fallbacked;
      return {
        id: `n-${n.id}`,
        source: n.tip as any,
        source_label: n.tip === 'podsjetnik' ? 'Podsjetnik'
          : n.tip === 'potvrda' ? 'Potvrda termina'
          : n.tip === 'otkazivanje' ? 'Otkazivanje'
          : n.tip === 'potvrdjivanje' ? 'Potvrda statusa'
          : n.tip === 'test' ? 'Test poruka'
          : n.tip,
        datum: n.datum_slanja,
        primalac: n.patient_ime || '—',
        telefon: n.patient_telefon || '—',
        kanal,
        status: n.status,
        viber_dlr: n.viber_dlr,
        viber_message_status: n.viber_message_status,
        sms_dlr: n.sms_dlr,
        fallbacked,
        clicked: false,
        error: n.error,
        tekst: n.sadrzaj,
        display_dlr: computeDisplayDlr({ viber_dlr: n.viber_dlr, sms_dlr: n.sms_dlr, status: n.status, fallbacked, kanal }),
      };
    });

    return [...fromRecipients, ...fromNotifs]
      .filter((m) => {
        if (sourceFilter !== 'sve' && m.source !== sourceFilter) return false;
        if (channelFilter !== 'sve' && m.kanal !== channelFilter) return false;
        return true;
      })
      .sort((a, b) => new Date(b.datum).getTime() - new Date(a.datum).getTime());
  }, [campaigns, recipients, notifs, sourceFilter, channelFilter]);

  // Ukupna statistika PREKO OBA izvora (kampanje + notifikacije)
  const stats = useMemo(() => {
    const all = unifiedMessages;
    const total = all.length;
    // Delivered = display_dlr == 'delivered' ili 'sent' (SMS kroz rakunat — gateway accepted)
    const viberDelivered = all.filter((m) => m.kanal === 'viber' && m.display_dlr === 'delivered').length;
    const smsDelivered = all.filter((m) => m.kanal === 'sms' && (m.display_dlr === 'delivered' || m.display_dlr === 'sent')).length;
    const seen = all.filter((m) => m.viber_message_status === 'seen').length;
    const clicked = all.filter((m) => m.clicked).length;
    const fallback = all.filter((m) => m.fallbacked).length;
    const notViberUser = all.filter((m) => m.viber_dlr === 'not_viber_user').length;
    const noSuitableDevice = all.filter((m) => m.viber_dlr === 'no_suitable_device').length;
    const blocked = all.filter((m) => m.viber_dlr === 'blocked').length;
    const expired = all.filter((m) => m.viber_dlr === 'expired').length;
    const failed = all.filter((m) => m.viber_dlr === 'failed').length;

    return {
      total, viberDelivered, smsDelivered, seen, clicked, fallback,
      viberFailReasons: { notViberUser, noSuitableDevice, blocked, expired, failed },
    };
  }, [unifiedMessages]);

  const pct = (num: number, denom: number) => denom > 0 ? Math.round((num / denom) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Filter po datumu */}
      <Card>
        <div className="flex items-center gap-3 flex-wrap">
          <BarChart3 size={18} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-600">Izvjestaj Viber/SMS kampanja</h3>
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs text-gray-500">Od</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-2 py-1 border border-border rounded text-xs" />
            <label className="text-xs text-gray-500">Do</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-2 py-1 border border-border rounded text-xs" />
            <Button variant="secondary" onClick={load}>Osvjezi</Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card><div className="py-8 text-center text-gray-400">Ucitavam...</div></Card>
      ) : (
        <>
          {/* Summary stats — 6 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card>
              <p className="text-xs text-gray-500">Ukupno primalaca</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-400 mt-1">{campaigns.length} kampanja</p>
            </Card>
            <Card>
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle size={14} className="text-purple-600" />
                <p className="text-xs text-purple-600 font-medium">Viber isporuceno</p>
              </div>
              <p className="text-2xl font-bold text-purple-700">{stats.viberDelivered}</p>
              <p className="text-xs text-gray-400 mt-1">{pct(stats.viberDelivered, stats.total)}% ukupnog</p>
            </Card>
            <Card>
              <div className="flex items-center gap-1 mb-1">
                <Eye size={14} className="text-green-600" />
                <p className="text-xs text-green-600 font-medium">Viber seen</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{stats.seen}</p>
              <p className="text-xs text-gray-400 mt-1">{pct(stats.seen, stats.viberDelivered)}% od delivered</p>
            </Card>
            <Card>
              <div className="flex items-center gap-1 mb-1">
                <MousePointer size={14} className="text-blue-600" />
                <p className="text-xs text-blue-600 font-medium">Viber kliknuto</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">{stats.clicked}</p>
              <p className="text-xs text-gray-400 mt-1">{pct(stats.clicked, stats.viberDelivered)}% od delivered</p>
            </Card>
            <Card>
              <div className="flex items-center gap-1 mb-1">
                <Send size={14} className="text-amber-600" />
                <p className="text-xs text-amber-600 font-medium">SMS fallback</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">{stats.fallback}</p>
              <p className="text-xs text-gray-400 mt-1">{pct(stats.fallback, stats.total)}% ukupnog</p>
            </Card>
            <Card>
              <div className="flex items-center gap-1 mb-1">
                <CheckCircle size={14} className="text-sky-600" />
                <p className="text-xs text-sky-600 font-medium">SMS isporuceno</p>
              </div>
              <p className="text-2xl font-bold text-sky-700">{stats.smsDelivered}</p>
              <p className="text-xs text-gray-400 mt-1">ukupno SMS</p>
            </Card>
          </div>

          {/* Viber fail reasons breakdown */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Viber neisporuceno — razlozi</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { label: 'Not Viber user', value: stats.viberFailReasons.notViberUser, color: 'bg-gray-100 text-gray-700' },
                { label: 'No suitable device', value: stats.viberFailReasons.noSuitableDevice, color: 'bg-gray-100 text-gray-700' },
                { label: 'Blocked', value: stats.viberFailReasons.blocked, color: 'bg-red-100 text-red-700' },
                { label: 'Expired', value: stats.viberFailReasons.expired, color: 'bg-amber-100 text-amber-700' },
                { label: 'Failed', value: stats.viberFailReasons.failed, color: 'bg-red-100 text-red-700' },
              ].map((r) => (
                <div key={r.label} className={`rounded-lg p-3 ${r.color}`}>
                  <p className="text-xs font-medium">{r.label}</p>
                  <p className="text-xl font-bold">{r.value}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              Za sve nabrojane razloge koji su u kampanji <strong>Viber + SMS fallback</strong>, SMS je automatski poslat preko rakunat-a.
              Kolona "Fallback" gore pokazuje koliko ih je realno prebaceno.
            </p>
          </Card>

          {/* Hronoloski feed svih poruka (kampanje + podsjetnici + potvrde + testovi) */}
          <Card padding={false}>
            <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-semibold text-gray-600">Sve poruke — hronoloski</h3>
              <div className="flex items-center gap-2">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as any)}
                  className="px-2 py-1 border border-border rounded text-xs"
                >
                  <option value="sve">Svi tipovi</option>
                  <option value="kampanja">Kampanje</option>
                  <option value="podsjetnik">Podsjetnici</option>
                  <option value="potvrda">Potvrde termina</option>
                  <option value="test">Test poruke</option>
                </select>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value as any)}
                  className="px-2 py-1 border border-border rounded text-xs"
                >
                  <option value="sve">Svi kanali</option>
                  <option value="viber">Viber</option>
                  <option value="sms">SMS</option>
                </select>
                <span className="text-xs text-gray-500">{unifiedMessages.length} poruka</span>
              </div>
            </div>
            {unifiedMessages.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                Nema poruka u izabranom periodu / filteru
              </div>
            ) : (
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                <div className="px-4 py-2 bg-gray-50 text-[10px] text-gray-500 font-medium flex items-center gap-2 sticky top-0">
                  <span className="w-28">Vrijeme</span>
                  <span className="w-36">Primalac</span>
                  <span className="w-28">Telefon</span>
                  <span className="w-16">Kanal</span>
                  <span className="w-20">DLR</span>
                  <span className="w-14 text-center">Seen</span>
                  <span className="w-16 text-center">Fallback</span>
                  <span className="flex-1">Izvor / Tekst</span>
                </div>
                {unifiedMessages.slice(0, 300).map((m) => {
                  const dlr = m.display_dlr;
                  const dlrColor = dlr === 'delivered' || dlr === 'sent'
                    ? 'text-green-700 bg-green-50'
                    : dlr === 'pending'
                    ? 'text-amber-700 bg-amber-50'
                    : 'text-red-700 bg-red-50';
                  return (
                    <div
                      key={m.id}
                      className="px-4 py-2 flex items-center gap-2 text-xs hover:bg-gray-50"
                      onClick={() => m.campaign_id && setSelectedId(m.campaign_id)}
                      style={{ cursor: m.campaign_id ? 'pointer' : 'default' }}
                    >
                      <span className="w-28 text-gray-500">
                        {new Date(m.datum).toLocaleString('sr-Latn-ME', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span className="w-36 font-medium text-gray-900 truncate">{m.primalac}</span>
                      <span className="w-28 text-gray-600 font-mono">{m.telefon}</span>
                      <span className={`w-16 px-1.5 py-0.5 rounded text-[10px] font-medium text-center ${
                        m.kanal === 'viber' ? 'bg-purple-100 text-purple-700'
                        : m.kanal === 'sms' ? 'bg-sky-100 text-sky-700'
                        : 'bg-gray-100 text-gray-500'
                      }`}>{m.kanal}</span>
                      <span className={`w-20 px-1.5 py-0.5 rounded text-[10px] font-medium text-center truncate ${dlrColor}`}>
                        {dlr}
                      </span>
                      <span className="w-14 text-center">
                        {m.viber_message_status === 'seen' ? <Eye size={12} className="text-green-600 inline" /> : <span className="text-gray-300">—</span>}
                      </span>
                      <span className="w-16 text-center">
                        {m.fallbacked ? <span className="text-[10px] text-amber-700 bg-amber-100 px-1 py-0.5 rounded">SMS</span> : <span className="text-gray-300">—</span>}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded mr-1 ${
                          m.source === 'kampanja' ? 'bg-purple-100 text-purple-700'
                          : m.source === 'podsjetnik' ? 'bg-blue-100 text-blue-700'
                          : m.source === 'potvrda' ? 'bg-green-100 text-green-700'
                          : m.source === 'test' ? 'bg-gray-100 text-gray-700'
                          : 'bg-gray-100 text-gray-600'
                        }`}>{m.source_label}</span>
                        {m.error && <span className="text-red-500 ml-1">· {m.error}</span>}
                      </span>
                    </div>
                  );
                })}
                {unifiedMessages.length > 300 && (
                  <div className="px-4 py-2 text-center text-xs text-gray-400 bg-gray-50">
                    Prikazano prvih 300 od {unifiedMessages.length} — suzi filter po datumu
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Tabela kampanja sa stats */}
          <Card padding={false}>
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-gray-600">Kampanje sa statistikom</h3>
            </div>
            {campaigns.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                <Megaphone size={48} className="mx-auto mb-3" />
                <p>Nema kampanja u izabranom periodu</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="px-4 py-2 bg-gray-50 text-[11px] text-gray-500 font-medium flex items-center gap-3">
                  <span className="flex-1">Naziv</span>
                  <span className="w-16 text-right">Poslato</span>
                  <span className="w-16 text-right">Viber ✓</span>
                  <span className="w-16 text-right">Seen</span>
                  <span className="w-16 text-right">Click</span>
                  <span className="w-16 text-right">Fallback</span>
                  <span className="w-16 text-right">SMS ✓</span>
                  <span className="w-16 text-right">Failed</span>
                </div>
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="px-4 py-2 flex items-center gap-3 text-sm hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{c.naziv}</p>
                      <p className="text-xs text-gray-400">{c.channel_mode} · {new Date(c.created_at).toLocaleDateString('sr-Latn-ME')}</p>
                    </div>
                    <span className="w-16 text-right text-gray-600">{c.total_recipients}</span>
                    <span className="w-16 text-right text-purple-700 font-medium">{c.viber_delivered_count || 0}</span>
                    <span className="w-16 text-right text-green-700 font-medium">{c.seen_count || 0}</span>
                    <span className="w-16 text-right text-blue-700 font-medium">{c.clicked_count || 0}</span>
                    <span className="w-16 text-right text-amber-700 font-medium">{c.fallback_count || 0}</span>
                    <span className="w-16 text-right text-sky-700 font-medium">{c.sms_delivered_count || 0}</span>
                    <span className="w-16 text-right text-red-700 font-medium">{c.failed_count || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {selectedId && <CampaignDetails campaignId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

// ============================================================
// TAB: KONTAKTI
// ============================================================
function KontaktiTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [importing, setImporting] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    setContacts((data || []) as Contact[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Obrisati ovaj kontakt?')) return;
    await supabase.from('contacts').delete().eq('id', id);
    load();
  }

  function handleEdit(c: Contact) {
    setEditing(c);
    setShowForm(true);
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const header = lines[0].split(',').map((h) => h.trim().toLowerCase());

      const idxIme = header.findIndex((h) => h === 'ime' || h === 'first_name' || h === 'name');
      const idxPrezime = header.findIndex((h) => h === 'prezime' || h === 'last_name' || h === 'surname');
      const idxTelefon = header.findIndex((h) => h === 'telefon' || h === 'phone' || h === 'broj');
      const idxEmail = header.findIndex((h) => h === 'email' || h === 'e-mail');
      const idxTags = header.findIndex((h) => h === 'tags' || h === 'tagovi');

      if (idxTelefon < 0 || idxIme < 0) {
        alert('CSV mora imati kolone "ime" i "telefon".');
        return;
      }

      const rows = lines.slice(1).map((line) => {
        const cols = line.split(',').map((c) => c.trim());
        return {
          ime: cols[idxIme] || '',
          prezime: idxPrezime >= 0 ? cols[idxPrezime] || null : null,
          telefon: cols[idxTelefon] || '',
          email: idxEmail >= 0 ? cols[idxEmail] || null : null,
          tags: idxTags >= 0 && cols[idxTags] ? cols[idxTags].split(';').map((t) => t.trim()).filter(Boolean) : [],
        };
      }).filter((r) => r.ime && r.telefon);

      if (rows.length === 0) {
        alert('Nema validnih redova u CSV fajlu.');
        return;
      }

      const { error } = await supabase.from('contacts').insert(rows);
      if (error) {
        alert('Greska pri uvozu: ' + error.message);
      } else {
        alert(`Uvezeno ${rows.length} kontakata.`);
        load();
      }
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.ime.toLowerCase().includes(q) ||
        (c.prezime || '').toLowerCase().includes(q) ||
        c.telefon.includes(q),
    );
  }, [contacts, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pretraga po imenu, prezimenu, telefonu..."
          className="max-w-sm"
        />
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={16} /> Novi kontakt
        </Button>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-border rounded-lg text-sm cursor-pointer hover:bg-gray-50">
          {importing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          CSV uvoz
          <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
        </label>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} kontakata</span>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Ucitavam...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Users size={48} className="mx-auto mb-3" />
            <p>Nema kontakata</p>
            <p className="text-xs mt-1">Dodaj rucno ili uvezi CSV fajl</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="px-6 py-2 bg-gray-50 text-xs text-gray-500 font-medium flex items-center gap-4">
              <span className="flex-1">Ime i prezime</span>
              <span className="w-36">Telefon</span>
              <span className="w-48">Email</span>
              <span className="w-32">Tagovi</span>
              <span className="w-20 text-right">Akcije</span>
            </div>
            {filtered.map((c) => (
              <div key={c.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{c.ime} {c.prezime}</p>
                  {c.napomena && <p className="text-xs text-gray-400 truncate">{c.napomena}</p>}
                </div>
                <div className="w-36 text-sm text-gray-600">{c.telefon}</div>
                <div className="w-48 text-xs text-gray-500 truncate">{c.email || '—'}</div>
                <div className="w-32 flex flex-wrap gap-1">
                  {(c.tags || []).map((t) => (
                    <span key={t} className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{t}</span>
                  ))}
                </div>
                <div className="w-20 flex justify-end gap-1">
                  <button onClick={() => handleEdit(c)} className="p-1 text-gray-400 hover:text-blue-600">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && (
        <ContactForm
          contact={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function ContactForm({ contact, onClose, onSaved }: { contact: Contact | null; onClose: () => void; onSaved: () => void }) {
  const [ime, setIme] = useState(contact?.ime || '');
  const [prezime, setPrezime] = useState(contact?.prezime || '');
  const [telefon, setTelefon] = useState(contact?.telefon || '');
  const [email, setEmail] = useState(contact?.email || '');
  const [tagsStr, setTagsStr] = useState((contact?.tags || []).join(', '));
  const [napomena, setNapomena] = useState(contact?.napomena || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!ime || !telefon) return;
    setSaving(true);
    const payload = {
      ime, prezime: prezime || null, telefon, email: email || null,
      tags: tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      napomena: napomena || null,
      updated_at: new Date().toISOString(),
    };
    if (contact) {
      await supabase.from('contacts').update(payload).eq('id', contact.id);
    } else {
      await supabase.from('contacts').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
        <h3 className="text-lg font-semibold">{contact ? 'Uredi kontakt' : 'Novi kontakt'}</h3>
        <Input label="Ime *" value={ime} onChange={(e) => setIme(e.target.value)} />
        <Input label="Prezime" value={prezime} onChange={(e) => setPrezime(e.target.value)} />
        <Input label="Telefon *" value={telefon} onChange={(e) => setTelefon(e.target.value)} placeholder="+38267..." />
        <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Tagovi (odvojeni zarezima)" value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
          <textarea
            value={napomena}
            onChange={(e) => setNapomena(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
          />
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Otkazi</Button>
          <Button onClick={handleSave} disabled={!ime || !telefon || saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Sacuvaj'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// TAB: GRUPE
// ============================================================
function GrupeTab() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('contact_groups').select('*').order('created_at', { ascending: false });
    setGroups((data || []) as Group[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm('Obrisati ovu grupu?')) return;
    await supabase.from('contact_groups').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nova grupa
        </Button>
        <span className="text-xs text-gray-500 ml-auto">{groups.length} grupa</span>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Ucitavam...</div>
        ) : groups.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Tags size={48} className="mx-auto mb-3" />
            <p>Nema grupa</p>
            <p className="text-xs mt-1">Grupe omogucavaju ciljanje kampanja na odredjene skupove primalaca</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {groups.map((g) => (
              <div key={g.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{g.naziv}</p>
                  <p className="text-xs text-gray-500">
                    {g.tip === 'staticka' ? 'Staticka grupa' : 'Dinamicka grupa (filter)'}
                    {g.napomena && ` · ${g.napomena}`}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${g.tip === 'staticka' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                  {g.tip}
                </span>
                <button onClick={() => handleDelete(g.id)} className="p-1 text-gray-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showForm && <GroupForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function GroupForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [naziv, setNaziv] = useState('');
  const [tip, setTip] = useState<'staticka' | 'dinamicka'>('staticka');
  const [napomena, setNapomena] = useState('');
  const [saving, setSaving] = useState(false);

  // Static: izabrani pacijenti + contacts
  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');

  // Dynamic: filter
  const [grad, setGrad] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from('patients').select('id, ime, prezime, telefon, grad, datum_rodjenja, tagovi').not('telefon', 'is', null).limit(500);
      setPatients((p || []) as PatientLite[]);
      const { data: c } = await supabase.from('contacts').select('*').limit(500);
      setContacts((c || []) as Contact[]);
    })();
  }, []);

  const filteredPatients = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => `${p.ime} ${p.prezime}`.toLowerCase().includes(q) || (p.telefon || '').includes(q));
  }, [patients, memberSearch]);

  const filteredContacts = useMemo(() => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => `${c.ime} ${c.prezime || ''}`.toLowerCase().includes(q) || c.telefon.includes(q));
  }, [contacts, memberSearch]);

  async function handleSave() {
    if (!naziv) return;
    setSaving(true);

    if (tip === 'dinamicka') {
      const filter: any = {};
      if (grad) filter.grad = grad;
      if (yearFrom) filter.year_from = parseInt(yearFrom);
      if (yearTo) filter.year_to = parseInt(yearTo);
      if (tagFilter) filter.tagovi = tagFilter.split(',').map((t) => t.trim()).filter(Boolean);

      await supabase.from('contact_groups').insert({
        naziv, tip: 'dinamicka', filter_json: filter, napomena: napomena || null,
      });
    } else {
      const { data: grp } = await supabase.from('contact_groups').insert({
        naziv, tip: 'staticka', napomena: napomena || null,
      }).select('id').single();

      if (grp?.id) {
        const members = [
          ...Array.from(selectedPatientIds).map((pid) => ({ group_id: grp.id, patient_id: pid, contact_id: null })),
          ...Array.from(selectedContactIds).map((cid) => ({ group_id: grp.id, patient_id: null, contact_id: cid })),
        ];
        if (members.length > 0) {
          await supabase.from('contact_group_members').insert(members);
        }
      }
    }

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <h3 className="text-lg font-semibold">Nova grupa</h3>
        <Input label="Naziv *" value={naziv} onChange={(e) => setNaziv(e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tip grupe</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTip('staticka')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm border ${tip === 'staticka' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-border'}`}
            >
              <strong>Staticka</strong>
              <p className="text-xs">Fiksna lista u momentu kreiranja</p>
            </button>
            <button
              onClick={() => setTip('dinamicka')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm border ${tip === 'dinamicka' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'border-border'}`}
            >
              <strong>Dinamicka</strong>
              <p className="text-xs">Filter koji se primjenjuje pri svakoj kampanji</p>
            </button>
          </div>
        </div>

        {tip === 'staticka' && (
          <div className="space-y-3">
            <Input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Pretraga pacijenata i kontakata..."
            />
            <div className="text-xs text-gray-500">
              Izabrano: {selectedPatientIds.size} pacijenata, {selectedContactIds.size} kontakata
            </div>
            <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
              <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600">Pacijenti ({filteredPatients.length})</div>
              {filteredPatients.slice(0, 100).map((p) => (
                <label key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedPatientIds.has(p.id)}
                    onChange={(e) => {
                      const s = new Set(selectedPatientIds);
                      if (e.target.checked) s.add(p.id); else s.delete(p.id);
                      setSelectedPatientIds(s);
                    }}
                  />
                  {p.ime} {p.prezime} <span className="text-xs text-gray-400">{p.telefon}</span>
                </label>
              ))}
              <div className="px-3 py-2 bg-gray-50 text-xs font-medium text-gray-600">Kontakti ({filteredContacts.length})</div>
              {filteredContacts.slice(0, 100).map((c) => (
                <label key={c.id} className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedContactIds.has(c.id)}
                    onChange={(e) => {
                      const s = new Set(selectedContactIds);
                      if (e.target.checked) s.add(c.id); else s.delete(c.id);
                      setSelectedContactIds(s);
                    }}
                  />
                  {c.ime} {c.prezime || ''} <span className="text-xs text-gray-400">{c.telefon}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {tip === 'dinamicka' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              Filter se izvrsava nad pacijentima kad god se kampanja pokrene. Ostavite polja prazna da ignorisete filter.
            </p>
            <Input label="Grad" value={grad} onChange={(e) => setGrad(e.target.value)} placeholder="npr. Niksic" />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Godiste od" type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} placeholder="1960" />
              <Input label="Godiste do" type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} placeholder="2010" />
            </div>
            <Input label="Tagovi (odvojeni zarezima)" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} placeholder="vip, dugogodisnji" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Napomena</label>
          <textarea value={napomena} onChange={(e) => setNapomena(e.target.value)} rows={2} className="w-full px-3 py-2 border border-border rounded-lg text-sm" />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Otkazi</Button>
          <Button onClick={handleSave} disabled={!naziv || saving}>
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Sacuvaj grupu'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Viber bubble preview — simulira kako ce poruka izgledati u Viber-u
// ============================================================
function ViberPreview({ viberType = 'text_image_button', text, caption, actionUrl, imageUrl, videoUrl }: {
  viberType?: 'text_only' | 'text_button' | 'text_image_button' | 'video_text' | 'media_only';
  text: string;
  caption?: string;
  actionUrl?: string;
  imageUrl?: string;
  videoUrl?: string;
}) {
  const showText = viberType !== 'media_only';
  const showButton = viberType === 'text_button' || viberType === 'text_image_button';
  const showImage = viberType === 'text_image_button' || (viberType === 'media_only' && !videoUrl);
  const showVideo = viberType === 'video_text' || (viberType === 'media_only' && !!videoUrl);

  const hasButton = showButton && !!(caption && actionUrl);
  const hasImage = showImage && !!imageUrl;
  const hasVideo = showVideo && !!videoUrl;
  const isEmpty = (!showText || !text) && !hasImage && !hasButton && !hasVideo;

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Viber preview</p>

      {/* Telefon mockup */}
      <div className="bg-gradient-to-b from-purple-100 to-purple-50 rounded-2xl p-4 border border-purple-200">
        {/* Header — avatar + sender name */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-purple-200">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold">
            V
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-800">Ordinacija</p>
            <p className="text-[10px] text-gray-500">Business account</p>
          </div>
        </div>

        {isEmpty ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Popuni polja lijevo — preview ce se pojaviti ovdje
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm max-w-[280px] overflow-hidden">
            {/* Image (poster) */}
            {hasImage && (
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={imageUrl}
                  alt="Viber poster"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallback = (e.target as HTMLImageElement).nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="absolute inset-0 hidden items-center justify-center text-xs text-gray-400 bg-gray-100">
                  Slika se ne ucitava
                </div>
              </div>
            )}

            {/* Video */}
            {hasVideo && (
              <div className="aspect-video bg-black relative">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLVideoElement).style.display = 'none';
                    const fallback = (e.target as HTMLVideoElement).nextElementSibling as HTMLElement | null;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="absolute inset-0 hidden items-center justify-center text-xs text-gray-400 bg-gray-800">
                  Video se ne ucitava
                </div>
              </div>
            )}

            {/* Text */}
            {showText && text && (
              <div className="px-3 py-2">
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-snug">{text}</p>
              </div>
            )}

            {/* Button */}
            {hasButton && (
              <div className="px-3 pb-3">
                <div className="bg-purple-600 text-white text-center text-sm font-medium py-2 rounded-lg">
                  {caption}
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-1 truncate">{actionUrl}</p>
              </div>
            )}

            {/* Timestamp (as Viber shows) */}
            <div className="px-3 pb-2 text-right">
              <span className="text-[10px] text-gray-400">
                {new Date().toLocaleTimeString('sr-Latn-ME', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Cena estimate info */}
      <p className="text-[11px] text-gray-400 mt-2">
        Viber poruka kod Omni-ja: ~€0.003 · ograniceno na 1000 karaktera · validity 5 min (za fallback) ili 60 min (Viber only)
      </p>
    </div>
  );
}

// ============================================================
// TAB: NOVA KAMPANJA (wizard)
// ============================================================
type ViberType = 'text_only' | 'text_button' | 'text_image_button' | 'video_text' | 'media_only';

const VIBER_TYPES: Array<{ value: ViberType; label: string; icon: any; needsText: boolean; needsButton: boolean; needsImage: boolean; needsVideo: boolean }> = [
  { value: 'text_only',         label: 'Text only',          icon: TypeIcon,  needsText: true,  needsButton: false, needsImage: false, needsVideo: false },
  { value: 'text_button',       label: 'Text & Button',      icon: Square,    needsText: true,  needsButton: true,  needsImage: false, needsVideo: false },
  { value: 'text_image_button', label: 'Text & Image & Button', icon: ImageIcon, needsText: true, needsButton: true, needsImage: true, needsVideo: false },
  { value: 'video_text',        label: 'Video & Text',       icon: Video,     needsText: true,  needsButton: false, needsImage: false, needsVideo: true  },
  { value: 'media_only',        label: 'Media only',         icon: Layers,    needsText: false, needsButton: false, needsImage: true,  needsVideo: false },
];

function NovaKampanjaTab({ onDone }: { onDone: () => void }) {
  const [naziv, setNaziv] = useState('');
  const [channelMode, setChannelMode] = useState<ChannelMode>('viber_then_sms');
  const [smsText, setSmsText] = useState('');
  const [smsSender, setSmsSender] = useState('');
  const [viberType, setViberType] = useState<ViberType>('text_image_button');
  const [viberText, setViberText] = useState('');
  const [viberCaption, setViberCaption] = useState('');
  const [viberActionUrl, setViberActionUrl] = useState('');
  const [viberImageUrl, setViberImageUrl] = useState('');
  const [viberVideoUrl, setViberVideoUrl] = useState('');

  const [targetType, setTargetType] = useState<'svi_pacijenti' | 'grupa' | 'rucni' | 'filter'>('svi_pacijenti');
  const [groups, setGroups] = useState<Group[]>([]);
  const [targetGroupId, setTargetGroupId] = useState<string>('');

  const [patients, setPatients] = useState<PatientLite[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set());
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState('');
  // Per-recipient kanal override: id -> 'sms' | 'viber' | default (kampanjin channelMode)
  const [recipientChannels, setRecipientChannels] = useState<Map<string, 'sms' | 'viber'>>(new Map());

  // Filter
  const [filterGrad, setFilterGrad] = useState('');
  const [filterYearFrom, setFilterYearFrom] = useState('');
  const [filterYearTo, setFilterYearTo] = useState('');
  const [filterTags, setFilterTags] = useState('');

  // Scheduling
  const [sendMode, setSendMode] = useState<'now' | 'later'>('now');
  const [scheduledAt, setScheduledAt] = useState('');

  const [estimating, setEstimating] = useState(false);
  const [estimate, setEstimate] = useState<{ total: number; cost: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; error?: string; sending_id?: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: g } = await supabase.from('contact_groups').select('*').order('naziv');
      setGroups((g || []) as Group[]);
      const { data: p } = await supabase.from('patients').select('id, ime, prezime, telefon, grad, datum_rodjenja, tagovi').not('telefon', 'is', null).limit(500);
      setPatients((p || []) as PatientLite[]);
      const { data: c } = await supabase.from('contacts').select('*').limit(500);
      setContacts((c || []) as Contact[]);
    })();
  }, []);

  const smsInfo = useMemo(() => estimateSmsParts(smsText), [smsText]);

  function renderPersonalizedPreview(tpl: string): string {
    return tpl.replaceAll('{ime}', 'Marko').replaceAll('{prezime}', 'Petrovic').replaceAll('{ime_prezime}', 'Marko Petrovic');
  }

  async function handleSubmit() {
    if (!naziv) return alert('Naziv kampanje je obavezan');

    if (channelMode !== 'sms') {
      const cfg = VIBER_TYPES.find((t) => t.value === viberType)!;
      if (cfg.needsText && !viberText) return alert('Viber tekst je obavezan za ovaj tip poruke');
      if (cfg.needsButton && (!viberCaption || !viberActionUrl)) return alert('Caption i Action URL su obavezni za tip sa dugmetom');
      if (cfg.needsImage && !viberImageUrl) return alert('Image URL je obavezan za ovaj tip poruke');
      if (cfg.needsVideo && !viberVideoUrl) return alert('Video URL je obavezan za ovaj tip poruke');
      if (viberType === 'media_only' && !viberImageUrl && !viberVideoUrl) return alert('Za Media only treba Image URL ili Video URL');
    }

    if (channelMode !== 'viber' && !smsText) return alert('SMS tekst je obavezan (fallback ili primarni)');
    if (sendMode === 'later' && !scheduledAt) return alert('Izaberite datum i vrijeme zakazivanja');

    setSubmitting(true);
    setSubmitResult(null);

    const transactionId = `camp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const targetRucniIds = targetType === 'rucni'
      ? { patient_ids: Array.from(selectedPatients), contact_ids: Array.from(selectedContacts) }
      : null;
    const targetFilter = targetType === 'filter'
      ? {
          grad: filterGrad || undefined,
          year_from: filterYearFrom ? parseInt(filterYearFrom) : undefined,
          year_to: filterYearTo ? parseInt(filterYearTo) : undefined,
          tagovi: filterTags ? filterTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        }
      : null;

    const { data: inserted, error } = await supabase
      .from('campaigns')
      .insert({
        naziv,
        channel_mode: channelMode,
        sms_text: smsText || null,
        sms_sender: smsSender || null,
        viber_type: viberType,
        viber_text: viberText || null,
        viber_caption: viberCaption || null,
        viber_action_url: viberActionUrl || null,
        viber_image_url: viberImageUrl || null,
        viber_video_url: viberVideoUrl || null,
        target_type: targetType,
        target_group_id: targetType === 'grupa' ? targetGroupId || null : null,
        target_rucni_ids: targetRucniIds,
        target_filter: targetFilter,
        scheduled_at: sendMode === 'later' ? new Date(scheduledAt).toISOString() : null,
        status: 'draft',
        omni_transaction_id: transactionId,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      setSubmitting(false);
      setSubmitResult({ success: false, error: error?.message || 'Greska' });
      return;
    }

    // Pokreni slanje
    const result = await sendCampaign(inserted.id);
    setSubmitResult(result);
    setSubmitting(false);

    if (result.success) {
      setTimeout(() => onDone(), 1500);
    }
  }

  async function handleEstimate() {
    if (!naziv) return alert('Unesi naziv prvo');
    setEstimating(true);
    setEstimate(null);

    // Kreiraj privremenu kampanju za estimate
    const transactionId = `est-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const { data: inserted } = await supabase
      .from('campaigns')
      .insert({
        naziv: `${naziv} (estimate)`,
        channel_mode: channelMode,
        sms_text: smsText || null,
        viber_text: viberText || null,
        target_type: targetType,
        target_group_id: targetType === 'grupa' ? targetGroupId || null : null,
        target_rucni_ids: targetType === 'rucni' ? { patient_ids: Array.from(selectedPatients), contact_ids: Array.from(selectedContacts) } : null,
        target_filter: targetType === 'filter' ? {
          grad: filterGrad || undefined,
          year_from: filterYearFrom ? parseInt(filterYearFrom) : undefined,
          year_to: filterYearTo ? parseInt(filterYearTo) : undefined,
          tagovi: filterTags ? filterTags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        } : null,
        status: 'draft',
        omni_transaction_id: transactionId,
      })
      .select('id')
      .single();

    if (!inserted) { setEstimating(false); return; }

    const result = await estimateCampaignCost(inserted.id);
    await supabase.from('campaigns').delete().eq('id', inserted.id);

    if (result.success) {
      setEstimate({ total: result.total_recipients || 0, cost: result.cost_estimation || 0 });
    } else {
      alert('Greska pri procjeni: ' + result.error);
    }
    setEstimating(false);
  }

  return (
    <div className="w-full space-y-6">
      {/* 1. Naziv + kanal */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">1. Osnovno</h3>
        <div className="space-y-4">
          <Input label="Naziv kampanje *" value={naziv} onChange={(e) => setNaziv(e.target.value)} placeholder="npr. Promocija stomatologija - april" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kanal</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { v: 'sms' as const, t: 'Samo SMS', d: 'Preko rakunat' },
                { v: 'viber' as const, t: 'Samo Viber', d: 'Preko Omni' },
                { v: 'viber_then_sms' as const, t: 'Viber + SMS fallback', d: 'Preporuceno' },
              ]).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setChannelMode(opt.v)}
                  className={`px-3 py-2 rounded-lg text-sm border text-left ${channelMode === opt.v ? 'bg-primary-50 border-primary-500' : 'border-border'}`}
                >
                  <div className="font-medium">{opt.t}</div>
                  <div className="text-xs text-gray-500">{opt.d}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Poruka */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">2. Poruka</h3>
        <p className="text-xs text-gray-500 mb-3">
          Placeholders: <code>{'{ime}'}</code>, <code>{'{prezime}'}</code>, <code>{'{ime_prezime}'}</code>
        </p>

        {channelMode !== 'sms' && (
          <div className="space-y-4 mb-4">
            {/* Viber type selector — 5 kartica kao u Omni composer-u */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tip Viber poruke</label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {VIBER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setViberType(t.value)}
                    className={`relative px-2 py-3 rounded-lg text-center border transition-colors ${
                      viberType === t.value
                        ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500'
                        : 'border-border hover:border-gray-400'
                    }`}
                  >
                    <t.icon size={24} className={`mx-auto mb-1 ${viberType === t.value ? 'text-purple-600' : 'text-gray-500'}`} />
                    <p className={`text-xs ${viberType === t.value ? 'font-semibold text-purple-700' : 'text-gray-600'}`}>{t.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                {(() => {
                  const cfg = VIBER_TYPES.find((t) => t.value === viberType)!;
                  return (
                    <>
                      {cfg.needsText && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Viber tekst *</label>
                          <textarea
                            value={viberText}
                            onChange={(e) => setViberText(e.target.value)}
                            rows={4}
                            maxLength={1000}
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                            placeholder="Postovani/a {ime}, pozivamo vas..."
                          />
                          <p className="text-xs text-gray-400 mt-1">{viberText.length} / 1000</p>
                        </div>
                      )}
                      {cfg.needsButton && (
                        <>
                          <Input label="Caption (tekst dugmeta) *" value={viberCaption} onChange={(e) => setViberCaption(e.target.value)} placeholder="Rezervisi termin" />
                          <Input label="Action URL (link dugmeta) *" value={viberActionUrl} onChange={(e) => setViberActionUrl(e.target.value)} placeholder="https://..." />
                        </>
                      )}
                      {cfg.needsImage && (
                        <Input label="Image URL (poster) *" value={viberImageUrl} onChange={(e) => setViberImageUrl(e.target.value)} placeholder="https://.../slika.jpg" />
                      )}
                      {cfg.needsVideo && (
                        <Input label="Video URL *" value={viberVideoUrl} onChange={(e) => setViberVideoUrl(e.target.value)} placeholder="https://.../video.mp4" />
                      )}
                      {viberType === 'media_only' && !cfg.needsImage && !cfg.needsVideo && (
                        <Input label="Image URL *" value={viberImageUrl} onChange={(e) => setViberImageUrl(e.target.value)} placeholder="https://.../slika.jpg" />
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Viber preview */}
              <ViberPreview
                viberType={viberType}
                text={renderPersonalizedPreview(viberText)}
                caption={viberCaption}
                actionUrl={viberActionUrl}
                imageUrl={viberImageUrl}
                videoUrl={viberVideoUrl}
              />
            </div>
          </div>
        )}

        {channelMode !== 'viber' && (
          <div className="space-y-3">
            <Input label="SMS Sender (alphanumeric, max 11)" value={smsSender} onChange={(e) => setSmsSender(e.target.value)} placeholder="Ordinacija" maxLength={11} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SMS tekst {channelMode === 'viber_then_sms' ? '(fallback)' : '*'}
              </label>
              <textarea
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                placeholder="Postovani/a {ime}, ..."
              />
              <p className="text-xs text-gray-400 mt-1">
                {smsInfo.chars} char · {smsInfo.parts} {smsInfo.parts === 1 ? 'poruka' : 'poruke'} · {smsInfo.encoding.toUpperCase()}
              </p>
            </div>
            {smsText && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">SMS preview:</p>
                <p className="text-sm whitespace-pre-wrap">{renderPersonalizedPreview(smsText)}</p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* 3. Target */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">3. Ciljna grupa</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 'svi_pacijenti' as const, t: 'Svi pacijenti' },
              { v: 'grupa' as const, t: 'Grupa' },
              { v: 'rucni' as const, t: 'Rucna selekcija' },
              { v: 'filter' as const, t: 'Filter' },
            ]).map((opt) => (
              <button
                key={opt.v}
                onClick={() => setTargetType(opt.v)}
                className={`px-3 py-2 rounded-lg text-sm border ${targetType === opt.v ? 'bg-primary-50 border-primary-500' : 'border-border'}`}
              >
                {opt.t}
              </button>
            ))}
          </div>

          {targetType === 'grupa' && (
            <select
              value={targetGroupId}
              onChange={(e) => setTargetGroupId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm"
            >
              <option value="">-- izaberi grupu --</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.naziv} ({g.tip})</option>
              ))}
            </select>
          )}

          {targetType === 'rucni' && (
            <div className="space-y-2">
              <Input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Pretraga..." />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Izabrano: {selectedPatients.size} pacijenata, {selectedContacts.size} kontakata</span>
                <span className="text-gray-400">Kanal: default = kampanjin ({channelMode})</span>
              </div>
              <div className="border border-border rounded-lg max-h-72 overflow-y-auto">
                {/* Header */}
                <div className="px-3 py-2 bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2 sticky top-0 z-10">
                  <span className="w-5" />
                  <span className="flex-1">Ime</span>
                  <span className="w-24 text-center">Telefon</span>
                  <span className="w-20 text-center">Kanal</span>
                </div>

                {/* Pacijenti */}
                <div className="px-3 py-1.5 bg-primary-50/50 text-[10px] font-semibold text-primary-700 uppercase tracking-wider">Pacijenti</div>
                {patients
                  .filter((p) => !memberSearch || `${p.ime} ${p.prezime}`.toLowerCase().includes(memberSearch.toLowerCase()))
                  .slice(0, 50)
                  .map((p) => {
                    const checked = selectedPatients.has(p.id);
                    const ch = recipientChannels.get(p.id);
                    return (
                      <div key={p.id} className={`flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 ${checked ? 'bg-primary-50/30' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const s = new Set(selectedPatients);
                            if (e.target.checked) s.add(p.id); else { s.delete(p.id); recipientChannels.delete(p.id); setRecipientChannels(new Map(recipientChannels)); }
                            setSelectedPatients(s);
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="flex-1 truncate text-gray-900">{p.ime} {p.prezime}</span>
                        <span className="w-24 text-center text-xs text-gray-400 font-mono">{p.telefon}</span>
                        <div className="w-20 flex justify-center">
                          {checked && (
                            <select
                              value={ch || ''}
                              onChange={(e) => {
                                const m = new Map(recipientChannels);
                                if (e.target.value) m.set(p.id, e.target.value as 'sms' | 'viber');
                                else m.delete(p.id);
                                setRecipientChannels(m);
                              }}
                              className="px-1 py-0.5 text-[10px] border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="">Auto</option>
                              <option value="sms">SMS</option>
                              <option value="viber">Viber</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {/* Kontakti */}
                <div className="px-3 py-1.5 bg-accent-50/50 text-[10px] font-semibold text-accent-700 uppercase tracking-wider">Kontakti</div>
                {contacts
                  .filter((c) => !memberSearch || `${c.ime} ${c.prezime || ''}`.toLowerCase().includes(memberSearch.toLowerCase()))
                  .slice(0, 50)
                  .map((c) => {
                    const checked = selectedContacts.has(c.id);
                    const ch = recipientChannels.get(c.id);
                    return (
                      <div key={c.id} className={`flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50 ${checked ? 'bg-accent-50/30' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const s = new Set(selectedContacts);
                            if (e.target.checked) s.add(c.id); else { s.delete(c.id); recipientChannels.delete(c.id); setRecipientChannels(new Map(recipientChannels)); }
                            setSelectedContacts(s);
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="flex-1 truncate text-gray-900">{c.ime} {c.prezime || ''}</span>
                        <span className="w-24 text-center text-xs text-gray-400 font-mono">{c.telefon}</span>
                        <div className="w-20 flex justify-center">
                          {checked && (
                            <select
                              value={ch || ''}
                              onChange={(e) => {
                                const m = new Map(recipientChannels);
                                if (e.target.value) m.set(c.id, e.target.value as 'sms' | 'viber');
                                else m.delete(c.id);
                                setRecipientChannels(m);
                              }}
                              className="px-1 py-0.5 text-[10px] border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="">Auto</option>
                              <option value="sms">SMS</option>
                              <option value="viber">Viber</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {targetType === 'filter' && (
            <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
              <Input label="Grad" value={filterGrad} onChange={(e) => setFilterGrad(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Godiste od" type="number" value={filterYearFrom} onChange={(e) => setFilterYearFrom(e.target.value)} />
                <Input label="Godiste do" type="number" value={filterYearTo} onChange={(e) => setFilterYearTo(e.target.value)} />
              </div>
              <Input label="Tagovi (zarez)" value={filterTags} onChange={(e) => setFilterTags(e.target.value)} />
            </div>
          )}

          <div className="flex gap-2 items-center">
            <Button variant="secondary" onClick={handleEstimate} disabled={estimating || !naziv}>
              {estimating ? <Loader2 size={14} className="animate-spin" /> : 'Procijeni broj primalaca'}
            </Button>
            {estimate && (
              <span className="text-sm text-gray-700">
                <strong>{estimate.total}</strong> primalaca · procjena: ~{estimate.cost.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Scheduling */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">4. Vrijeme slanja</h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setSendMode('now')}
            className={`px-4 py-2 rounded-lg text-sm border ${sendMode === 'now' ? 'bg-primary-50 border-primary-500' : 'border-border'}`}
          >
            Posalji odmah
          </button>
          <button
            onClick={() => setSendMode('later')}
            className={`px-4 py-2 rounded-lg text-sm border ${sendMode === 'later' ? 'bg-primary-50 border-primary-500' : 'border-border'}`}
          >
            Zakazi za kasnije
          </button>
        </div>
        {sendMode === 'later' && (
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="px-3 py-2 border border-border rounded-lg text-sm"
          />
        )}
      </Card>

      {/* Submit */}
      <div className="flex gap-2 items-center">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sendMode === 'now' ? 'Posalji kampanju' : 'Zakazi kampanju'}
        </Button>
        {submitResult && (
          <div className={`flex items-center gap-2 text-sm ${submitResult.success ? 'text-green-600' : 'text-red-600'}`}>
            {submitResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {submitResult.success
              ? `Kampanja pokrenuta! ${submitResult.sending_id ? `Sending ID: ${submitResult.sending_id}` : ''}`
              : `Greska: ${submitResult.error}`}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// TAB: KAMPANJE (lista + detalji)
// ============================================================
function KampanjeTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns((data || []) as Campaign[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCancel(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Otkazati ovu kampanju? Ako je vec zakazana kod Omni-ja, mozda je vec obradjena.')) return;
    await supabase.from('campaigns').update({ status: 'cancelled' }).eq('id', id);
    load();
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Obrisati kampanju zajedno sa svim primaocima? Ovo se ne moze ponistiti.')) return;
    await supabase.from('campaigns').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={load}>Osvjezi</Button>
        <span className="text-xs text-gray-500 ml-auto">{campaigns.length} kampanja</span>
      </div>

      <Card padding={false}>
        {loading ? (
          <div className="py-12 text-center text-gray-400">Ucitavam...</div>
        ) : campaigns.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Megaphone size={48} className="mx-auto mb-3" />
            <p>Nema kampanja</p>
            <p className="text-xs mt-1">Kreiraj prvu kampanju na tabu "Nova kampanja"</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <div className="px-4 py-2 bg-gray-50 text-[11px] text-gray-500 font-medium flex items-center gap-2">
              <span className="flex-1">Naziv</span>
              <span className="w-24 text-center">Status</span>
              <span className="w-12 text-right" title="Ukupno primalaca">∑</span>
              <span className="w-12 text-right text-purple-700" title="Viber isporuceno">V✓</span>
              <span className="w-12 text-right text-green-700" title="Viber seen">Seen</span>
              <span className="w-12 text-right text-blue-700" title="Viber kliknuto">Click</span>
              <span className="w-14 text-right text-amber-700" title="SMS fallback">Fall</span>
              <span className="w-12 text-right text-sky-700" title="SMS isporuceno">S✓</span>
              <span className="w-12 text-right text-red-700" title="Neuspjesno">Fail</span>
              <span className="w-28 text-right">Kreirano</span>
              <span className="w-20 text-right">Akcije</span>
            </div>
            {campaigns.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="px-4 py-2.5 flex items-center gap-2 hover:bg-gray-50 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{c.naziv}</p>
                  <p className="text-[11px] text-gray-400 truncate">{c.channel_mode}{c.viber_type ? ` · ${c.viber_type}` : ''}</p>
                  {c.error && <p className="text-[11px] text-red-500 truncate">{c.error}</p>}
                </div>
                <div className="w-24 text-center">
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100'}`}>
                    {statusLabels[c.status] || c.status}
                  </span>
                </div>
                <span className="w-12 text-right text-sm text-gray-600">{c.total_recipients}</span>
                <span className="w-12 text-right text-sm text-purple-700 font-medium">{c.viber_delivered_count || 0}</span>
                <span className="w-12 text-right text-sm text-green-700 font-medium">{c.seen_count || 0}</span>
                <span className="w-12 text-right text-sm text-blue-700 font-medium">{c.clicked_count || 0}</span>
                <span className="w-14 text-right text-sm text-amber-700 font-medium">{c.fallback_count || 0}</span>
                <span className="w-12 text-right text-sm text-sky-700 font-medium">{c.sms_delivered_count || 0}</span>
                <span className="w-12 text-right text-sm text-red-700 font-medium">{c.failed_count || 0}</span>
                <div className="w-28 text-right text-[11px] text-gray-400">
                  {new Date(c.created_at).toLocaleString('sr-Latn-ME', { dateStyle: 'short', timeStyle: 'short' })}
                </div>
                <div className="w-20 flex justify-end gap-1">
                  {(c.status === 'scheduled' || c.status === 'sending') && (
                    <button
                      onClick={(e) => handleCancel(c.id, e)}
                      className="p-1 text-gray-400 hover:text-amber-600"
                      title="Otkazi"
                    >
                      <XCircle size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(c.id, e)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Obrisi"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ChevronRight size={14} className="text-gray-400 self-center" />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {selectedId && <CampaignDetails campaignId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function CampaignDetails({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from('campaigns').select('*').eq('id', campaignId).maybeSingle();
      setCampaign(c as Campaign);
      const { data: r } = await supabase.from('campaign_recipients').select('*').eq('campaign_id', campaignId).order('created_at');
      setRecipients(r || []);
    })();
  }, [campaignId]);

  if (!campaign) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{campaign.naziv}</h3>
            <p className="text-xs text-gray-500">Kanal: {campaign.channel_mode} · Status: {statusLabels[campaign.status]}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded p-3"><p className="text-xs text-gray-500">Primaoca</p><p className="text-xl font-bold">{campaign.total_recipients}</p></div>
          <div className="bg-purple-50 rounded p-3">
            <p className="text-xs text-purple-600">Viber isporuceno</p>
            <p className="text-xl font-bold text-purple-700">{campaign.viber_delivered_count || 0}</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-xs text-green-600 flex items-center gap-1"><Eye size={11} /> Viber seen</p>
            <p className="text-xl font-bold text-green-700">{campaign.seen_count || 0}</p>
          </div>
          <div className="bg-blue-50 rounded p-3">
            <p className="text-xs text-blue-600 flex items-center gap-1"><MousePointer size={11} /> Kliknuto</p>
            <p className="text-xl font-bold text-blue-700">{campaign.clicked_count || 0}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-amber-50 rounded p-3">
            <p className="text-xs text-amber-600">SMS fallback</p>
            <p className="text-xl font-bold text-amber-700">{campaign.fallback_count || 0}</p>
          </div>
          <div className="bg-sky-50 rounded p-3">
            <p className="text-xs text-sky-600">SMS isporuceno</p>
            <p className="text-xl font-bold text-sky-700">{campaign.sms_delivered_count || 0}</p>
          </div>
          <div className="bg-red-50 rounded p-3">
            <p className="text-xs text-red-600">Neuspjesno</p>
            <p className="text-xl font-bold text-red-700">{campaign.failed_count || 0}</p>
          </div>
          <div className="bg-gray-50 rounded p-3">
            <p className="text-xs text-gray-500">Cost</p>
            <p className="text-xl font-bold text-gray-700">{campaign.cost_estimation ? `€${Number(campaign.cost_estimation).toFixed(3)}` : '—'}</p>
          </div>
        </div>

        {/* DLR breakdown — Viber razlozi neuspjeha */}
        {(() => {
          const dlrGroups = recipients.reduce((acc: Record<string, number>, r: any) => {
            const k = r.viber_dlr || 'nema_dlr';
            acc[k] = (acc[k] || 0) + 1;
            return acc;
          }, {});
          const total = recipients.length;
          if (total === 0) return null;
          return (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Viber DLR breakdown</p>
              <div className="flex h-6 rounded-full overflow-hidden border border-border">
                {Object.entries(dlrGroups).map(([k, v]: [string, any]) => {
                  const pctVal = (v / total) * 100;
                  const colorMap: Record<string, string> = {
                    delivered: 'bg-green-500',
                    pending: 'bg-amber-400',
                    expired: 'bg-amber-600',
                    failed: 'bg-red-600',
                    blocked: 'bg-red-700',
                    no_suitable_device: 'bg-gray-400',
                    not_viber_user: 'bg-gray-500',
                    nema_dlr: 'bg-gray-200',
                  };
                  return (
                    <div
                      key={k}
                      className={`${colorMap[k] || 'bg-gray-300'} flex items-center justify-center text-[10px] text-white font-medium`}
                      style={{ width: `${pctVal}%` }}
                      title={`${k}: ${v} (${Math.round(pctVal)}%)`}
                    >
                      {pctVal > 8 ? `${Math.round(pctVal)}%` : ''}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 mt-2 text-[11px]">
                {Object.entries(dlrGroups).map(([k, v]: [string, any]) => (
                  <span key={k} className="px-2 py-0.5 bg-gray-100 rounded">
                    <strong>{k}:</strong> {v}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {campaign.viber_text && (
          <div className="bg-purple-50 p-3 rounded">
            <p className="text-xs font-medium text-purple-600 mb-1">Viber poruka:</p>
            <p className="text-sm whitespace-pre-wrap">{campaign.viber_text}</p>
          </div>
        )}
        {campaign.sms_text && (
          <div className="bg-blue-50 p-3 rounded">
            <p className="text-xs font-medium text-blue-600 mb-1">SMS poruka:</p>
            <p className="text-sm whitespace-pre-wrap">{campaign.sms_text}</p>
          </div>
        )}

        <div className="border border-border rounded-lg">
          <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-600 flex items-center gap-4">
            <span className="flex-1">Primalac</span>
            <span className="w-32">Telefon</span>
            <span className="w-20">Kanal</span>
            <span className="w-24">DLR</span>
            <span className="w-20">Fallback</span>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-border">
            {recipients.map((r) => (
              <div key={r.id} className="px-4 py-2 flex items-center gap-4 text-xs">
                <span className="flex-1 truncate">{r.ime}</span>
                <span className="w-32">{r.telefon}</span>
                <span className="w-20">{r.channel_used || '—'}</span>
                <span className="w-24">{r.viber_dlr || r.sms_dlr || '—'}</span>
                <span className="w-20">{r.fallbacked ? 'DA' : '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
