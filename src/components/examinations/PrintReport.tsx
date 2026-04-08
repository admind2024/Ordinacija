import { forwardRef } from 'react';
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

const PrintReport = forwardRef<HTMLDivElement, PrintReportProps>(
  ({ examination, patient, doctor, establishment }, ref) => {
    const datumStr = examination.datum ? fmtDate(examination.datum) : '';
    const datumRodjenja = patient.datum_rodjenja ? fmtDate(patient.datum_rodjenja) : '';
    const doctorFullName = `${doctor.titula || 'Dr'} ${doctor.ime} ${doctor.prezime}`.trim();

    return (
      <div ref={ref} className="print-report">
        <div className="print-page">
          {/* Header — logo lijevo, podaci desno */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <tbody>
              <tr>
                <td style={{ width: '120px', verticalAlign: 'top', paddingRight: '20px' }}>
                  <img
                    src="/logo.png"
                    alt="MOA"
                    style={{ width: '100px', height: '100px', objectFit: 'contain' }}
                  />
                </td>
                <td style={{ verticalAlign: 'top', textAlign: 'right', fontSize: '11pt', lineHeight: '1.6' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>
                    {establishment?.naziv || 'PZU Poliklinika "Ministry of Aesthetics - MOA"'}
                  </div>
                  <div>{establishment?.adresa || 'Ul Seika Zaida, The Capital Plaza'}</div>
                  <div>{establishment?.grad || 'Podgorica'}</div>
                  <div>PIB: {establishment?.pib || '03706273'}</div>
                  <div>{establishment?.telefon || '+382 67/941-941'}</div>
                  <div>{establishment?.email || 'info@moa.clinic'}</div>
                  <div>www.moa.clinic</div>
                </td>
              </tr>
            </tbody>
          </table>

          <hr style={{ border: 'none', borderTop: '1px solid #333', margin: '15px 0 25px 0' }} />

          {/* Podaci o pacijentu */}
          <div style={{ fontSize: '12pt', lineHeight: '1.8', marginBottom: '25px' }}>
            <div>Ime i prezime: <strong>{patient.ime} {patient.prezime}</strong></div>
            <div>Datum: <strong>{datumStr}</strong></div>
            {datumRodjenja && <div>Datum rodjenja: <strong>{datumRodjenja}</strong></div>}
          </div>

          {/* Sadrzaj pregleda */}
          <div style={{ fontSize: '12pt', lineHeight: '1.8', marginBottom: '60px' }}>
            {examination.razlog_dolaska && (
              <div style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }}>
                {examination.razlog_dolaska}
              </div>
            )}

            {examination.nalaz && (
              <div style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }}>
                {examination.nalaz}
              </div>
            )}

            {examination.terapija && (
              <div style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }}>
                Th: {examination.terapija}
              </div>
            )}

            {examination.preporuke && (
              <div style={{ marginBottom: '15px', whiteSpace: 'pre-wrap' }}>
                {examination.preporuke}
              </div>
            )}

            {examination.kontrolni_pregled && (
              <div style={{ marginBottom: '15px' }}>
                Kontrolni pregled {examination.kontrolni_pregled}
              </div>
            )}
          </div>

          {/* Potpis doktora — desno dolje */}
          <div style={{ textAlign: 'right', marginTop: '40px' }}>
            <div style={{ fontSize: '12pt', fontWeight: '500' }}>{doctorFullName}</div>
            {doctor.specijalizacija && (
              <div style={{ fontSize: '10pt', color: '#555' }}>spec.{doctor.specijalizacija}</div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

PrintReport.displayName = 'PrintReport';
export default PrintReport;
