import type { Examination, Doctor, Patient, Establishment } from '../../types';

interface PrintReportProps {
  examination: Examination;
  patient: Patient;
  doctor: Doctor;
  establishment: Establishment | null;
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

/**
 * Otvara print dijalog direktno bez novog prozora.
 * Koristi iframe koji se automatski uklanja nakon stampe.
 */
export function openPrintReport({ examination, patient, doctor, establishment }: PrintReportProps) {
  const datumStr = examination.datum ? fmtDate(examination.datum) : '';
  const datumRodjenja = patient.datum_rodjenja ? fmtDate(patient.datum_rodjenja) : '';
  const doctorFullName = `${doctor.titula || 'Dr'} ${doctor.ime} ${doctor.prezime}`.trim();
  const spec = doctor.specijalizacija ? `spec.${doctor.specijalizacija}` : '';

  const clinicName = establishment?.naziv || 'PZU Poliklinika "Ministry of Aesthetics - MOA"';
  const clinicAddress = establishment?.adresa || 'Ul Seika Zaida, The Capital Plaza';
  const clinicCity = establishment?.grad || 'Podgorica';
  const clinicPib = establishment?.pib || '03706273';
  const clinicPhone = establishment?.telefon || '+382 67/941-941';
  const clinicEmail = establishment?.email || 'info@moa.clinic';

  const sections: string[] = [];
  if (examination.razlog_dolaska) {
    sections.push(`<p style="margin-bottom:12px;white-space:pre-wrap">${esc(examination.razlog_dolaska)}</p>`);
  }
  if (examination.nalaz) {
    sections.push(`<p style="margin-bottom:12px;white-space:pre-wrap">${esc(examination.nalaz)}</p>`);
  }
  if (examination.terapija) {
    sections.push(`<p style="margin-bottom:12px;white-space:pre-wrap">Th: ${esc(examination.terapija)}</p>`);
  }
  if (examination.preporuke) {
    sections.push(`<p style="margin-bottom:12px;white-space:pre-wrap">${esc(examination.preporuke)}</p>`);
  }
  if (examination.kontrolni_pregled) {
    sections.push(`<p style="margin-bottom:12px">Kontrolni pregled: ${esc(examination.kontrolni_pregled)}</p>`);
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Nalaz</title>
  <style>
    @page { size: A4; margin: 15mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 100%; position: relative; }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 15px;
      border-bottom: 2px solid #2BA5A5;
      margin-bottom: 25px;
    }
    .header img {
      width: 70px;
      height: 70px;
      object-fit: contain;
    }
    .header-info {
      text-align: right;
      font-size: 10px;
      line-height: 1.6;
      color: #444;
    }
    .header-info .name {
      font-size: 12px;
      font-weight: 700;
      color: #1B6F6F;
      margin-bottom: 2px;
    }
    .patient-box {
      background: #f7fafa;
      border-left: 3px solid #2BA5A5;
      padding: 12px 16px;
      margin-bottom: 22px;
      font-size: 12px;
      line-height: 1.8;
    }
    .patient-box strong { color: #111; }
    .content {
      font-size: 12px;
      line-height: 1.8;
      color: #222;
    }
    .signature {
      margin-top: 50px;
      text-align: right;
    }
    .sig-line {
      width: 180px;
      border-top: 1px solid #bbb;
      margin: 8px 0 6px auto;
    }
    .sig-name { font-size: 12px; font-weight: 600; color: #1B6F6F; }
    .sig-spec { font-size: 10px; color: #666; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <img src="/logo.png" alt="MOA" />
      <div class="header-info">
        <div class="name">${esc(clinicName)}</div>
        <div>${esc(clinicAddress)}</div>
        <div>${esc(clinicCity)}</div>
        <div>PIB: ${esc(clinicPib)}</div>
        <div>${esc(clinicPhone)}</div>
        <div>${esc(clinicEmail)}</div>
        <div>www.moa.clinic</div>
      </div>
    </div>
    <div class="patient-box">
      <div>Ime i prezime: <strong>${esc(patient.ime)} ${esc(patient.prezime)}</strong></div>
      <div>Datum: <strong>${datumStr}</strong></div>
      ${datumRodjenja ? `<div>Datum rodjenja: <strong>${datumRodjenja}</strong></div>` : ''}
    </div>
    <div class="content">
      ${sections.join('\n      ')}
    </div>
    <div class="signature">
      <div class="sig-line"></div>
      <div class="sig-name">${esc(doctorFullName)}</div>
      ${spec ? `<div class="sig-spec">${esc(spec)}</div>` : ''}
    </div>
  </div>
</body>
</html>`;

  // Koristimo skriveni iframe umjesto novog prozora
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
