import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { cx, correspond, initiales } from '@/lib/utils';

interface Lien {
  to: string;
  label: string;
  icone: JSX.Element;
}

function Icone({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const LIENS: Lien[] = [
  { to: '/', label: 'Tableau de bord', icone: <Icone d="M4 13h7V4H4v9Zm9 7h7v-9h-7v9ZM4 20h7v-4H4v4Zm9-11h7V4h-7v5Z" /> },
  { to: '/patients', label: 'Patients', icone: <Icone d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M21 19v-1a4 4 0 0 0-3-3.87M9.5 10a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm6.5-6.87a3.5 3.5 0 0 1 0 6.74" /> },
  { to: '/agenda', label: 'Agenda', icone: <Icone d="M8 3v3m8-3v3M3.5 9h17M5 5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 21H5a1.5 1.5 0 0 1-1.5-1.5v-13A1.5 1.5 0 0 1 5 5Z" /> },
  { to: '/traitements', label: 'Traitements', icone: <Icone d="M9 3c-2.2 0-3.5 1.8-3.5 4 0 1.4-.5 2.4-.5 4 0 4 1.5 10 3 10s1.5-4 4-4 2.5 4 4 4 3-6 3-10c0-1.6-.5-2.6-.5-4 0-2.2-1.3-4-3.5-4-1.4 0-2.2.8-3 .8S10.4 3 9 3Z" /> },
  { to: '/facturation', label: 'Facturation', icone: <Icone d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h3" /> },
  { to: '/pilotage', label: 'Pilotage', icone: <Icone d="M4 19V10m5 9V5m5 14v-7m5 7V8" /> },
  { to: '/parametres', label: 'Paramètres', icone: <Icone d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.4 3H9.6l-.5 2.6c-.7.3-1.4.7-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2l.5 2.6h4.8l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" /> },
];

export function Layout() {
  const { data } = useApp();
  const navigate = useNavigate();
  const [recherche, setRecherche] = useState('');
  const [menuOuvert, setMenuOuvert] = useState(false);

  const resultats = useMemo(() => {
    if (recherche.trim().length < 2) return [];
    return data.patients
      .filter(
        (p) =>
          correspond(`${p.prenom} ${p.nom}`, recherche) ||
          correspond(p.telephone, recherche) ||
          correspond(p.email, recherche),
      )
      .slice(0, 6);
  }, [data.patients, recherche]);

  return (
    <div className="app-shell flex min-h-screen bg-slate-100">
      <aside
        className={cx(
          'no-print fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          menuOuvert ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 3c-2.2 0-3.5 1.8-3.5 4 0 1.4-.5 2.4-.5 4 0 4 1.5 10 3 10s1.5-4 4-4 2.5 4 4 4 3-6 3-10c0-1.6-.5-2.6-.5-4 0-2.2-1.3-4-3.5-4-1.4 0-2.2.8-3 .8S10.4 3 9 3Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold text-slate-900">Suivi Patient</p>
            <p className="text-xs text-slate-500">Dentaire</p>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5 p-3">
          {LIENS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={() => setMenuOuvert(false)}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                )
              }
            >
              {l.icone}
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">{data.cabinet.nom}</p>
          <p className="mt-1">{data.cabinet.telephone}</p>
          <p className="mt-2 text-[11px] text-slate-400">
            {data.patients.length} patients · {data.rendezVous.length} rendez-vous
          </p>
        </div>
      </aside>

      {menuOuvert ? (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="no-print fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setMenuOuvert(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <button
            type="button"
            aria-label="Ouvrir le menu"
            onClick={() => setMenuOuvert((v) => !v)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          <div className="relative w-full max-w-md">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m21 21-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher un patient (nom, téléphone, e-mail)…"
              className="champ pl-9"
              aria-label="Rechercher un patient"
            />
            {resultats.length > 0 ? (
              <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                {resultats.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setRecherche('');
                        navigate(`/patients/${p.id}`);
                      }}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {initiales(p.prenom, p.nom)}
                      </span>
                      <span>
                        <span className="font-medium text-slate-800">
                          {p.prenom} {p.nom}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">{p.telephone}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right text-xs leading-tight text-slate-500 sm:block">
              <span className="block font-semibold text-slate-700">
                {data.cabinet.praticiens[0]?.nom ?? 'Praticien'}
              </span>
              {data.cabinet.praticiens[0]?.specialite ?? ''}
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
              {initiales(
                data.cabinet.praticiens[0]?.nom.split(' ')[1] ?? 'C',
                data.cabinet.praticiens[0]?.nom.split(' ')[2] ?? 'D',
              )}
            </span>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
