import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Tabs from '../components/ui/Tabs';
import AppointmentsTable from '../components/appointments/AppointmentsTable';
import WaitingList from '../components/appointments/WaitingList';

type Tab = 'termini' | 'cekanje';

export default function Appointments() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'cekanje' ? 'cekanje' : 'termini';
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
        ]}
      />
      {tab === 'termini' ? <AppointmentsTable /> : <WaitingList onCountChange={setCekaju} />}
    </div>
  );
}
