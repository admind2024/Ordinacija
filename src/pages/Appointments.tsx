import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../components/ui/Tabs';
import AppointmentsTable from '../components/appointments/AppointmentsTable';
import WaitingList from '../components/appointments/WaitingList';
import PatientProtocol from '../components/appointments/PatientProtocol';

type Tab = 'termini' | 'cekanje' | 'protokol';

export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const p = params.get('tab');
  const tab: Tab = p === 'cekanje' || p === 'protokol' ? p : 'termini';
  const [cekaju, setCekaju] = useState<number | undefined>(undefined);

  return (
    <div>
      <Tabs
        label="Termini"
        active={tab}
        onChange={(t) => setParams(t === 'termini' ? {} : { tab: t }, { replace: true })}
        tabs={[
          { id: 'termini', label: 'Svi termini' },
          { id: 'cekanje', label: 'Lista čekanja', count: cekaju },
          { id: 'protokol', label: 'Protokol bolesnika' },
        ]}
      />
      {tab === 'termini' && <AppointmentsTable />}
      {tab === 'cekanje' && <WaitingList onCountChange={setCekaju} />}
      {tab === 'protokol' && <PatientProtocol />}
    </div>
  );
}
