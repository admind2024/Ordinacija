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
  const datumRodjenja = patient.datum_rodjenja ? fmtDate(patient.datum_rodjenja) : '';
  const doctorFullName = `${doctor.titula || 'Dr'} ${doctor.ime} ${doctor.prezime}`.trim();
  const spec = doctor.specijalizacija ? `spec.${doctor.specijalizacija}` : '';

  const clinicName = establishment?.naziv || 'PZU Poliklinika "Ministry of Aesthetics - MOA"';
  const clinicAddress = establishment?.adresa || 'Ul Seika Zaida, The Capital Plaza';
  const clinicCity = establishment?.grad || 'Podgorica';
  const clinicPib = establishment?.pib || '03706273';
  const clinicPhone = establishment?.telefon || '+382 67/941-941';
  const clinicEmail = establishment?.email || 'info@moa.clinic';

  // Sadrzaj pregleda
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

  // Tabela usluga
  let servicesHtml = '';
  if (services && services.length > 0) {
    const total = services.reduce((s, svc) => s + svc.ukupno, 0);
    servicesHtml = `
      <div style="margin: 20px 0; border-top: 1px solid #ddd; padding-top: 15px;">
        <p style="font-size:10px; font-weight:700; color:#1B6F6F; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Izvrsene usluge</p>
        <table style="width:100%; border-collapse:collapse; font-size:11px;">
          <thead>
            <tr style="border-bottom:1px solid #ddd;">
              <th style="text-align:left; padding:6px 0; color:#555;">Usluga</th>
              <th style="text-align:center; padding:6px 0; color:#555; width:50px;">Kol.</th>
              <th style="text-align:right; padding:6px 0; color:#555; width:80px;">Cijena</th>
              <th style="text-align:right; padding:6px 0; color:#555; width:80px;">Ukupno</th>
            </tr>
          </thead>
          <tbody>
            ${services.map((svc) => `
              <tr style="border-bottom:1px solid #eee;">
                <td style="padding:5px 0;">${esc(svc.naziv)}</td>
                <td style="text-align:center; padding:5px 0;">${svc.kolicina}</td>
                <td style="text-align:right; padding:5px 0;">${svc.cijena.toFixed(2)}</td>
                <td style="text-align:right; padding:5px 0; font-weight:600;">${svc.ukupno.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="border-top:2px solid #1B6F6F;">
              <td colspan="3" style="padding:8px 0; font-weight:700; color:#1B6F6F;">UKUPNO</td>
              <td style="text-align:right; padding:8px 0; font-weight:700; font-size:13px; color:#1B6F6F;">${total.toFixed(2)} EUR</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
  }

  // Fiskalni podaci
  let fiscalHtml = '';
  if (fiscal?.fic) {
    fiscalHtml = `
      <div style="margin-top:20px; border:1px solid #ddd; border-radius:6px; padding:12px; background:#fafafa; font-size:10px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <p style="font-weight:700; color:#1B6F6F; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Fiskalni podaci</p>
            ${fiscal.invoiceNumber ? `<p><span style="color:#666;">Broj racuna:</span> <strong>${esc(fiscal.invoiceNumber)}</strong></p>` : ''}
            <p><span style="color:#666;">FIC:</span> <strong>${esc(fiscal.fic)}</strong></p>
            ${fiscal.iic ? `<p><span style="color:#666;">IIC:</span> ${esc(fiscal.iic)}</p>` : ''}
            ${fiscal.totalWithoutVAT != null ? `
              <div style="margin-top:6px; padding-top:6px; border-top:1px solid #eee;">
                <p><span style="color:#666;">Bez PDV:</span> ${fiscal.totalWithoutVAT.toFixed(2)} EUR</p>
                <p><span style="color:#666;">PDV (21%):</span> ${(fiscal.totalVAT || 0).toFixed(2)} EUR</p>
                <p style="font-weight:700;"><span style="color:#666;">Sa PDV:</span> ${(fiscal.totalPrice || 0).toFixed(2)} EUR</p>
              </div>
            ` : ''}
          </div>
          ${fiscal.qrCodeUrl ? `
            <div style="text-align:center;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(fiscal.qrCodeUrl)}"
                   style="width:90px;height:90px;" alt="QR" />
              <p style="font-size:8px; color:#999; margin-top:2px;">Verifikacija</p>
            </div>
          ` : ''}
        </div>
      </div>`;
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
    .header img { width: 70px; height: 70px; object-fit: contain; }
    .header-info { text-align: right; font-size: 10px; line-height: 1.6; color: #444; }
    .header-info .name { font-size: 12px; font-weight: 700; color: #1B6F6F; margin-bottom: 2px; }
    .patient-box {
      background: #f7fafa; border-left: 3px solid #2BA5A5;
      padding: 12px 16px; margin-bottom: 22px; font-size: 12px; line-height: 1.8;
    }
    .patient-box strong { color: #111; }
    .content { font-size: 12px; line-height: 1.8; color: #222; }
    .signature { margin-top: 40px; text-align: right; }
    .sig-line { width: 180px; border-top: 1px solid #bbb; margin: 8px 0 6px auto; }
    .sig-name { font-size: 12px; font-weight: 600; color: #1B6F6F; }
    .sig-spec { font-size: 10px; color: #666; }
    table { display: table !important; }
    tbody { display: table-row-group !important; }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr { display: table-row !important; }
    td, th { display: table-cell !important; }
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
    ${servicesHtml}
    <div class="signature">
      <div class="sig-line"></div>
      <div class="sig-name">${esc(doctorFullName)}</div>
      ${spec ? `<div class="sig-spec">${esc(spec)}</div>` : ''}
    </div>
    ${fiscalHtml}
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
