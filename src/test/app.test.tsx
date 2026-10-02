import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';

describe('application', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('affiche le tableau de bord avec les données de démonstration', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /tableau de bord/i })).toBeInTheDocument();
    expect(screen.getByText(/patients suivis/i)).toBeInTheDocument();
  });

  it('navigue vers la liste des patients et ouvre un dossier', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    const titre = await screen.findByRole('heading', { name: /^patients$/i });
    expect(titre).toBeInTheDocument();

    const lien = await screen.findByText('Marie Durand');
    await user.click(lien);

    expect(await screen.findByRole('heading', { name: /marie durand/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /schéma dentaire anatomique/i })).toBeInTheDocument();
  });

  it('permet de sélectionner une dent et d’en modifier l’état', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    await user.click(await screen.findByText('Marie Durand'));

    // La vue grille reste disponible et sert ici de surface de test stable.
    await user.click(await screen.findByRole('button', { name: /^grille$/i }));
    const schema = await screen.findByRole('img', { name: /schéma dentaire interactif/i });
    const zones = within(schema).getAllByLabelText(/^Dent 21 — face/);
    await user.click(zones[0]);

    expect(await screen.findByRole('heading', { name: /^dent 21$/i })).toBeInTheDocument();

    expect(screen.getByText(/incisive centrale maxillaire gauche/i)).toBeInTheDocument();

    // The palette and the tooth panel both expose a "Carie" button; the panel's is last.
    const boutonsCarie = screen.getAllByRole('button', { name: /^carie$/i });
    await user.click(boutonsCarie[boutonsCarie.length - 1]);

    const zonesApres = within(schema).getAllByLabelText(/^Dent 21 — face/);
    expect(zonesApres[0]).toHaveAttribute('fill', '#ef4444');
  });

  it('crée un nouveau patient', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    await user.click(await screen.findByRole('button', { name: /nouveau patient/i }));

    const dialogue = await screen.findByRole('dialog');
    await user.type(within(dialogue).getByLabelText('Nom *'), 'Rossi');
    await user.type(within(dialogue).getByLabelText('Prénom *'), 'Giulia');
    await user.type(within(dialogue).getByLabelText('Date de naissance *'), '1992-05-04');
    await user.type(within(dialogue).getByLabelText('Téléphone *'), '0601020304');
    await user.click(within(dialogue).getByRole('button', { name: /créer le dossier/i }));

    expect(await screen.findByRole('heading', { name: /giulia rossi/i })).toBeInTheDocument();
  });
});

describe('charting parodontal', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('affiche le diagnostic 2018 calculé à partir du sondage', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    await user.click(await screen.findByText('Thomas Bernard'));
    await user.click(await screen.findByRole('button', { name: /parodontie/i }));

    expect(await screen.findByText(/parodontite/i)).toBeInTheDocument();
    expect(screen.getByText('Stade III')).toBeInTheDocument();
    expect(screen.getByText('Grade C')).toBeInTheDocument();
    expect(screen.getByText(/raisonnement/i)).toBeInTheDocument();
    // La 47 étant absente, elle ne doit pas peser dans le décompte.
    expect(screen.getByText(/sur 31 dent\(s\)/)).toBeInTheDocument();
  });

  it('exclut du sondage les dents absentes du schéma', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    await user.click(await screen.findByText('Thomas Bernard'));
    await user.click(await screen.findByRole('button', { name: /parodontie/i }));

    // La 47 est absente chez ce patient : ses cases sont désactivées et vides.
    const cellule = await screen.findByLabelText('Profondeur dent 47 site MV');
    expect(cellule).toBeDisabled();
    expect(cellule).toHaveValue('');
  });
});

describe('cohérence du schéma dentaire', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it('affiche la denture temporaire d’un jeune enfant', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    await user.click(await screen.findByText('Inès Lopez'));

    const schema = await screen.findByRole('img', { name: /schéma dentaire anatomique/i });
    // 54 est une molaire temporaire : elle doit être dessinée.
    expect(within(schema).getAllByLabelText(/^Dent 54 — face/).length).toBeGreaterThan(0);
    // 14 est sa remplaçante permanente : absente de cette vue.
    expect(within(schema).queryByLabelText(/^Dent 14 — face/)).toBeNull();
  });

  it('ne masque jamais silencieusement une dent relevée hors de la dentition affichée', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    await user.click(await screen.findByText('Inès Lopez'));
    await screen.findByRole('img', { name: /schéma dentaire anatomique/i });

    // En basculant en denture permanente, ses relevés temporaires sortent du
    // champ : l'application doit le dire au lieu de les faire disparaître.
    await user.selectOptions(screen.getByLabelText(/type de dentition/i), 'permanente');
    expect(await screen.findByText(/dent\(s\) relevée\(s\) hors de cette dentition/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /basculer en dentition temporaire/i }));
    expect(screen.queryByText(/hors de cette dentition/i)).toBeNull();
  });
});
