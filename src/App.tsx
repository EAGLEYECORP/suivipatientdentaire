import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from '@/store/AppContext';
import { EcranVerrouillage } from '@/components/EcranVerrouillage';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Patients } from '@/pages/Patients';
import { PatientDetail } from '@/pages/PatientDetail';
import { Agenda } from '@/pages/Agenda';
import { Traitements } from '@/pages/Traitements';
import { Facturation } from '@/pages/Facturation';
import { Parametres } from '@/pages/Parametres';

function Racine() {
  const { etatCoffre } = useApp();
  if (etatCoffre === 'verrouille') return <EcranVerrouillage />;
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id" element={<PatientDetail />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/traitements" element={<Traitements />} />
          <Route path="/facturation" element={<Facturation />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export function App() {
  return (
    <AppProvider>
      <Racine />
    </AppProvider>
  );
}
