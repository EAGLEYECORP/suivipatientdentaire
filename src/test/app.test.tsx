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
    expect(screen.getByRole('img', { name: /schéma dentaire interactif/i })).toBeInTheDocument();
  });

  it('permet de sélectionner une dent et d’en modifier l’état', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('link', { name: /patients/i }));
    await user.click(await screen.findByText('Marie Durand'));

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
