import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider } from '@/store/AppContext';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { Patients } from '@/pages/Patients';
import { PatientDetail } from '@/pages/PatientDetail';
import { Agenda } from '@/pages/Agenda';
import { Traitements } from '@/pages/Traitements';
import { Facturation } from '@/pages/Facturation';
import { Parametres } from '@/pages/Parametres';

export function App() {
  return (
    <AppProvider>
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
    </AppProvider>
  );
}
