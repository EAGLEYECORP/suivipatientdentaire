import { Suspense, lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppProvider, useApp } from '@/store/AppContext';
import { EcranVerrouillage } from '@/components/EcranVerrouillage';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';

/*
 * Le tableau de bord est chargé d'emblée : c'est l'écran d'ouverture du
 * cabinet. Les autres sont découpés en fragments chargés à la demande, pour
 * que le premier affichage ne transporte pas le charting parodontal, la
 * visionneuse d'imagerie et le module de pilotage. Les fragments compilés
 * entrent dans le précache du service worker : le hors-ligne reste complet.
 */
const Patients = lazy(() => import('@/pages/Patients').then((m) => ({ default: m.Patients })));
const PatientDetail = lazy(() =>
  import('@/pages/PatientDetail').then((m) => ({ default: m.PatientDetail })),
);
const Agenda = lazy(() => import('@/pages/Agenda').then((m) => ({ default: m.Agenda })));
const Traitements = lazy(() => import('@/pages/Traitements').then((m) => ({ default: m.Traitements })));
const Facturation = lazy(() => import('@/pages/Facturation').then((m) => ({ default: m.Facturation })));
const Pilotage = lazy(() => import('@/pages/Pilotage').then((m) => ({ default: m.Pilotage })));
const Parametres = lazy(() => import('@/pages/Parametres').then((m) => ({ default: m.Parametres })));

function Chargement() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <span className="text-sm text-slate-400">Chargement…</span>
    </div>
  );
}

function Racine() {
  const { etatCoffre } = useApp();
  if (etatCoffre === 'verrouille') return <EcranVerrouillage />;
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<Chargement />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route
            path="/patients"
            element={
              <Suspense fallback={<Chargement />}>
                <Patients />
              </Suspense>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <Suspense fallback={<Chargement />}>
                <PatientDetail />
              </Suspense>
            }
          />
          <Route
            path="/agenda"
            element={
              <Suspense fallback={<Chargement />}>
                <Agenda />
              </Suspense>
            }
          />
          <Route
            path="/traitements"
            element={
              <Suspense fallback={<Chargement />}>
                <Traitements />
              </Suspense>
            }
          />
          <Route
            path="/facturation"
            element={
              <Suspense fallback={<Chargement />}>
                <Facturation />
              </Suspense>
            }
          />
          <Route
            path="/pilotage"
            element={
              <Suspense fallback={<Chargement />}>
                <Pilotage />
              </Suspense>
            }
          />
          <Route
            path="/parametres"
            element={
              <Suspense fallback={<Chargement />}>
                <Parametres />
              </Suspense>
            }
          />
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
