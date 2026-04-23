import type { Examination, Doctor, Patient, Establishment, AppointmentService } from '../../types';

export interface FiscalPrintData {
  fic?: string;
  iic?: string;
  invoiceNumber?: string;
  qrCodeUrl?: string;
  totalWithoutVAT?: number;
  totalVAT?: number;
  totalPrice?: number;
}

interface PrintReportProps {
  examination: Examination;
  patient: Patient;
  doctor: Doctor;
  establishment: Establishment | null;
  services?: AppointmentService[];
  fiscal?: FiscalPrintData;
}

function fmtDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}.`;
  } catch {
    return dateStr;
  }
}

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function openPrintReport({ examination, patient, doctor, establishment, services, fiscal }: PrintReportProps) {
  const datumStr = examination.datum ? fmtDate(examination.datum) : '';
  const godinaRodjenja = patient.datum_rodjenja ? new Date(patient.datum_rodjenja).getFullYear().toString() : '';
  const doctorFullName = `${doctor.titula || 'Dr'} ${doctor.ime} ${doctor.prezime}`.trim();
  const spec = doctor.specijalizacija ? `spec. ${doctor.specijalizacija}` : '';

  const clinicName = establishment?.naziv || 'PZU Poliklinika "Ministry of Aesthetics - MOA"';
  const clinicAddress = establishment?.adresa || 'Ul Seika Zaida, The Capital Plaza';
  const clinicCity = establishment?.grad || 'Podgorica';
  const clinicPib = establishment?.pib || '03706273';
  const clinicPhone = establishment?.telefon || '+382 67/941-941';
  const clinicEmail = establishment?.email || 'info@moa.clinic';

  const mjestoStanovanja = [patient.adresa, patient.grad].filter(Boolean).join(', ');

  // KCCG-stil sekcije
  const anamnezaHtml =
    (examination.razlog_dolaska || examination.nalaz)
      ? `
        <div class="section">
          <p class="section-title">ANAMNEZA I KLINIČKI NALAZ:</p>
          ${examination.razlog_dolaska ? `<p class="section-body">${esc(examination.razlog_dolaska)}</p>` : ''}
          ${examination.nalaz ? `<p class="section-body">${esc(examination.nalaz)}</p>` : ''}
        </div>`
      : '';

  const rezultatiHtml = examination.rezultati
    ? `
      <div class="section">
        <p class="section-title">REZULTATI (LABORATORIJSKI I RTG):</p>
        <p class="section-body">${esc(examination.rezultati)}</p>
      </div>`
    : '';

  const terapijaHtml = examination.terapija
    ? `
      <div class="section">
        <p class="section-title">TERAPIJA:</p>
        <p class="section-body">${esc(examination.terapija)}</p>
      </div>`
    : '';

  const preporukeHtml = examination.preporuke
    ? `
      <div class="section">
        <p class="section-title">PREPORUKE:</p>
        <p class="section-body">${esc(examination.preporuke)}</p>
      </div>`
    : '';

  const kontrolniHtml = examination.kontrolni_pregled
    ? `<p class="footer-note">Kontrolni pregled: <strong>${esc(examination.kontrolni_pregled)}</strong></p>`
    : '';

  // Usluge i fiskalni podaci se namjerno ne stampaju na medicinskom izvjestaju
  void services; void fiscal;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Izvjestaj ljekara specijaliste</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 100%; position: relative; }

    /* MOA header — stil KCCG-a (logo lijevo, info desno kao 'JZU | vrijednost') */
    .header { display: flex; align-items: flex-start; gap: 20px; margin-bottom: 18px; }
    .header img { width: 70px; height: 70px; object-fit: contain; flex-shrink: 0; }
    .header-table { flex: 1; border-collapse: collapse; font-size: 11px; }
    .header-table td { padding: 4px 8px; vertical-align: top; }
    .header-table td.label { color: #444; white-space: nowrap; width: 1%; }
    .header-table td.value { border-bottom: 1px solid #333; font-weight: 600; }

    /* Naslov */
    .title { text-align: center; font-size: 15px; font-weight: 700; letter-spacing: 0.5px; margin: 18px 0 14px; }

    /* Tabela pacijenta — kao KCCG (border grid) */
    .info-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11px; }
    .info-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: top; }
    .info-table .cell-label { font-size: 10px; color: #333; }
    .info-table .cell-value { font-weight: 600; font-size: 12px; margin-top: 2px; }

    /* Sekcije sadrzaja */
    .section { margin-bottom: 14px; }
    .section-title { font-size: 12px; font-weight: 700; color: #000; margin-bottom: 4px; letter-spacing: 0.3px; }
    .section-body { font-size: 11.5px; line-height: 1.55; color: #222; white-space: pre-wrap; }

    .footer-note { font-size: 11px; margin-top: 16px; color: #333; }

    .signature { margin-top: 40px; text-align: right; }
    .sig-line { width: 200px; border-top: 1px solid #333; margin: 8px 0 4px auto; }
    .sig-name { font-size: 12px; font-weight: 700; color: #000; }
    .sig-spec { font-size: 10px; color: #555; }

    table { display: table !important; }
    tbody { display: table-row-group !important; }
    tr { display: table-row !important; }
    td, th { display: table-cell !important; }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header: MOA logo + info u KCCG stilu -->
    <div class="header">
      <img src="/logo.png" alt="MOA" />
      <table class="header-table">
        <tr>
          <td class="label">Ustanova</td>
          <td class="value">${esc(clinicName)}</td>
        </tr>
        <tr>
          <td class="label">Adresa</td>
          <td class="value">${esc(clinicAddress)}, ${esc(clinicCity)}</td>
        </tr>
        <tr>
          <td class="label">Kontakt</td>
          <td class="value">${esc(clinicPhone)} · ${esc(clinicEmail)} · PIB ${esc(clinicPib)}</td>
        </tr>
      </table>
    </div>

    <!-- Naslov -->
    <div class="title">IZVJEŠTAJ LJEKARA SPECIJALISTE</div>

    <!-- Datum pregleda -->
    <table class="info-table">
      <tr>
        <td style="width:50%">
          <div class="cell-label">Datum pregleda</div>
          <div class="cell-value">${datumStr || '—'}</div>
        </td>
        <td style="width:50%">
          <div class="cell-label">Ljekar</div>
          <div class="cell-value">${esc(doctorFullName)}${spec ? ` — ${esc(spec)}` : ''}</div>
        </td>
      </tr>
    </table>

    <!-- Podaci pacijenta (KCCG grid) -->
    <table class="info-table">
      <tr>
        <td style="width:50%">
          <div class="cell-label">Prezime i ime pacijenta</div>
          <div class="cell-value">${esc(patient.prezime)} ${esc(patient.ime)}</div>
        </td>
        <td style="width:20%">
          <div class="cell-label">Godina rođenja</div>
          <div class="cell-value">${godinaRodjenja || '—'}</div>
        </td>
        <td style="width:30%">
          <div class="cell-label">JMBG</div>
          <div class="cell-value">${esc(patient.jmbg || '—')}</div>
        </td>
      </tr>
      <tr>
        <td colspan="2">
          <div class="cell-label">Mjesto stanovanja — adresa</div>
          <div class="cell-value">${esc(mjestoStanovanja || '—')}</div>
        </td>
        <td>
          <div class="cell-label">Telefon</div>
          <div class="cell-value">${esc(patient.telefon || '—')}</div>
        </td>
      </tr>
    </table>

    <!-- Sekcije nalaza -->
    ${anamnezaHtml}
    ${rezultatiHtml}
    ${terapijaHtml}
    ${preporukeHtml}
    ${kontrolniHtml}

    <div class="signature">
      <div class="sig-line"></div>
      <div class="sig-name">${esc(doctorFullName)}</div>
      ${spec ? `<div class="sig-spec">${esc(spec)}</div>` : ''}
    </div>
  </div>
</body>
</html>`;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 200);
    };
  }
}

export default function PrintReport() {
  return null;
}
