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

/**
 * Otvara novi prozor sa profesionalnim izvjestajem i pokrece print.
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

  // Sekcije pregleda
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
  <title>Nalaz — ${patient.ime} ${patient.prezime}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      padding: 0;
      position: relative;
    }
    /* Teal header bar */
    .header-bar {
      background: linear-gradient(135deg, #2BA5A5 0%, #1B6F6F 100%);
      padding: 25px 35px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .header-bar img {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: white;
      padding: 5px;
      object-fit: contain;
    }
    .header-info {
      text-align: right;
      color: white;
      font-size: 11px;
      line-height: 1.7;
    }
    .header-info .clinic-name {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: 0.3px;
    }
    /* Gold accent line */
    .accent-line {
      height: 3px;
      background: linear-gradient(90deg, #D4AA8C 0%, #C4956F 50%, #D4AA8C 100%);
    }
    /* Content */
    .content {
      padding: 30px 40px;
    }
    .patient-info {
      background: #F8FAFA;
      border-left: 4px solid #2BA5A5;
      padding: 16px 20px;
      margin-bottom: 28px;
      border-radius: 0 8px 8px 0;
    }
    .patient-info p {
      font-size: 13px;
      line-height: 1.8;
      color: #333;
    }
    .patient-info strong {
      color: #1a1a1a;
    }
    .exam-content {
      font-size: 12.5px;
      line-height: 1.8;
      color: #2a2a2a;
      padding: 0 5px;
    }
    /* Footer / doctor signature */
    .signature {
      margin-top: 50px;
      text-align: right;
      padding-right: 10px;
    }
    .signature .doctor-name {
      font-size: 14px;
      font-weight: 600;
      color: #1B6F6F;
    }
    .signature .doctor-spec {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }
    .signature .sig-line {
      width: 200px;
      border-top: 1px solid #ccc;
      margin: 8px 0 8px auto;
    }
    /* Bottom accent */
    .footer-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 6px;
      background: linear-gradient(90deg, #2BA5A5 0%, #D4AA8C 100%);
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header-bar">
      <img src="/logo.png" alt="MOA" />
      <div class="header-info">
        <div class="clinic-name">${esc(clinicName)}</div>
        <div>${esc(clinicAddress)}</div>
        <div>${esc(clinicCity)}</div>
        <div>PIB: ${esc(clinicPib)}</div>
        <div>${esc(clinicPhone)}</div>
        <div>${esc(clinicEmail)}</div>
        <div>www.moa.clinic</div>
      </div>
    </div>
    <div class="accent-line"></div>
    <div class="content">
      <div class="patient-info">
        <p>Ime i prezime: <strong>${esc(patient.ime)} ${esc(patient.prezime)}</strong></p>
        <p>Datum: <strong>${datumStr}</strong></p>
        ${datumRodjenja ? `<p>Datum rodjenja: <strong>${datumRodjenja}</strong></p>` : ''}
      </div>
      <div class="exam-content">
        ${sections.join('\n        ')}
      </div>
      <div class="signature">
        <div class="sig-line"></div>
        <div class="doctor-name">${esc(doctorFullName)}</div>
        ${spec ? `<div class="doctor-spec">${esc(spec)}</div>` : ''}
      </div>
    </div>
    <div class="footer-bar"></div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 300);
    };
  </script>
</body>
</html>`;

  const printWindow = window.open('', '_blank', 'width=800,height=1000');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Keep default export for backwards compat but it's no longer used
export default function PrintReport() {
  return null;
}
