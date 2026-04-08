import { forwardRef } from 'react';
import { format, parseISO } from 'date-fns';
import type { Examination, Doctor, Patient, Establishment } from '../../types';

interface PrintReportProps {
  examination: Examination;
  patient: Patient;
  doctor: Doctor;
  establishment: Establishment | null;
}

const PrintReport = forwardRef<HTMLDivElement, PrintReportProps>(
  ({ examination, patient, doctor, establishment }, ref) => {
    const datumStr = examination.datum
      ? format(parseISO(examination.datum), 'dd.MM.yyyy.')
      : '';
    const datumRodjenja = patient.datum_rodjenja
      ? format(parseISO(patient.datum_rodjenja), 'dd.MM.yyyy.')
      : '';
    const doctorFullName = `${doctor.titula || 'Dr'} ${doctor.ime} ${doctor.prezime}`.trim();

    return (
      <div ref={ref} className="print-report hidden print:block">
        <div className="print-page">
          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-4">
              {establishment?.logo_url ? (
                <img src={establishment.logo_url} alt="" className="w-20 h-20 object-contain" />
              ) : (
                <img src="/logo.png" alt="" className="w-16 h-16 object-contain" />
              )}
            </div>
            <div className="text-right text-sm leading-relaxed">
              <p className="font-semibold text-base">
                {establishment?.naziv || 'PZU Poliklinika "Ministry of Aesthetics - MOA"'}
              </p>
              <p>{establishment?.adresa || 'Ul Seika Zaida, The Capital Plaza'}</p>
              <p>{establishment?.grad || 'Podgorica'}</p>
              <p>PIB: {establishment?.pib || '03706273'}</p>
              <p>{establishment?.telefon || '+382 67/941-941'}</p>
              <p>{establishment?.email || 'info@moa.clinic'}</p>
              <p>www.moa.clinic</p>
            </div>
          </div>

          <hr className="border-gray-300 mb-6" />

          {/* Podaci o pacijentu */}
          <div className="mb-6 text-sm leading-relaxed">
            <p>Ime i prezime: <strong>{patient.ime} {patient.prezime}</strong></p>
            <p>Datum: <strong>{datumStr}</strong></p>
            {datumRodjenja && <p>Datum rodjenja: <strong>{datumRodjenja}</strong></p>}
          </div>

          {/* Sadrzaj pregleda */}
          <div className="space-y-4 text-sm leading-relaxed mb-16">
            {examination.razlog_dolaska && (
              <div>
                <p className="whitespace-pre-wrap">{examination.razlog_dolaska}</p>
              </div>
            )}

            {examination.nalaz && (
              <div>
                <p className="whitespace-pre-wrap">{examination.nalaz}</p>
              </div>
            )}

            {examination.terapija && (
              <div>
                <p className="whitespace-pre-wrap">Th: {examination.terapija}</p>
              </div>
            )}

            {examination.preporuke && (
              <div>
                <p className="whitespace-pre-wrap">{examination.preporuke}</p>
              </div>
            )}

            {examination.kontrolni_pregled && (
              <div>
                <p>Kontrolni pregled: {examination.kontrolni_pregled}</p>
              </div>
            )}
          </div>

          {/* Potpis doktora */}
          <div className="text-right mt-auto pt-8">
            <p className="text-sm font-medium">{doctorFullName}</p>
            <p className="text-xs text-gray-600">{doctor.specijalizacija ? `spec.${doctor.specijalizacija}` : ''}</p>
          </div>
        </div>
      </div>
    );
  }
);

PrintReport.displayName = 'PrintReport';
export default PrintReport;
