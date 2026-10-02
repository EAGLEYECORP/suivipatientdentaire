import { useCallback, useEffect, useRef, useState } from 'react';
import type { ImageClinique, Patient, TypeImage } from '@/types';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import {
  ID_VIGNETTE,
  creerVignette,
  enregistrerFichier,
  indexedDbDisponible,
  lireFichier,
  mesurerImage,
  supprimerFichier,
} from '@/lib/imagerie';
import { cx, formatDate, uid } from '@/lib/utils';

const TYPES: Array<{ cle: TypeImage; libelle: string }> = [
  { cle: 'retroalveolaire', libelle: 'Rétro-alvéolaire' },
  { cle: 'bitewing', libelle: 'Bitewing' },
  { cle: 'panoramique', libelle: 'Panoramique' },
  { cle: 'cone_beam', libelle: 'Cone beam' },
  { cle: 'photo', libelle: 'Photo intra-orale' },
  { cle: 'autre', libelle: 'Autre' },
];

const LIBELLE_TYPE = Object.fromEntries(TYPES.map((t) => [t.cle, t.libelle])) as Record<TypeImage, string>;

/** Charge une image depuis IndexedDB et en expose une URL temporaire. */
function useFichier(id: string | null): { url: string | null; erreur: string } {
  const { coffre } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!id) {
      setUrl(null);
      return;
    }
    let annule = false;
    let objectUrl = '';
    setErreur('');
    lireFichier(id, coffre)
      .then((blob) => {
        if (annule || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch((e: unknown) => {
        if (!annule) setErreur(e instanceof Error ? e.message : 'Lecture impossible.');
      });
    return () => {
      annule = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, coffre]);

  return { url, erreur };
}

function Vignette({ image, onOuvrir }: { image: ImageClinique; onOuvrir: () => void }) {
  const { url, erreur } = useFichier(ID_VIGNETTE(image.id));
  return (
    <button
      type="button"
      onClick={onOuvrir}
      className="group overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition hover:border-brand-400 hover:shadow-md"
    >
      <span className="flex aspect-[4/3] items-center justify-center bg-slate-900">
        {url ? (
          <img src={url} alt={image.libelle} className="h-full w-full object-contain" />
        ) : (
          <span className="px-2 text-center text-xs text-slate-400">{erreur || 'Chargement…'}</span>
        )}
      </span>
      <span className="block px-2.5 py-2">
        <span className="block truncate text-sm font-medium text-slate-800">{image.libelle}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <Badge ton="info">{LIBELLE_TYPE[image.type]}</Badge>
          {image.dents.length > 0 ? <Badge ton="neutre">{image.dents.join(', ')}</Badge> : null}
          <span className="text-xs text-slate-400">{formatDate(image.date)}</span>
        </span>
      </span>
    </button>
  );
}

function Visionneuse({ image, onFermer }: { image: ImageClinique; onFermer: () => void }) {
  const { url, erreur } = useFichier(image.id);
  const { majImage, supprimerImage } = useApp();
  const [zoom, setZoom] = useState(1);
  const [inverse, setInverse] = useState(false);
  const [contraste, setContraste] = useState(100);
  const [annotation, setAnnotation] = useState('');
  const zone = useRef<HTMLDivElement>(null);

  const poser = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotation.trim() || !zone.current) return;
    const r = zone.current.getBoundingClientRect();
    majImage(image.id, {
      annotations: [
        ...image.annotations,
        {
          id: uid('ann'),
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
          texte: annotation.trim(),
        },
      ],
    });
    setAnnotation('');
  };

  return (
    <Modal
      ouvert
      titre={image.libelle}
      sousTitre={`${LIBELLE_TYPE[image.type]} · ${formatDate(image.date)}${
        image.dents.length ? ` · dents ${image.dents.join(', ')}` : ''
      }`}
      onFermer={onFermer}
      largeur="xl"
      pied={
        <>
          <Button
            variante="danger"
            className="mr-auto"
            onClick={() => {
              void supprimerFichier(image.id);
              void supprimerFichier(ID_VIGNETTE(image.id));
              supprimerImage(image.id);
              onFermer();
            }}
          >
            Supprimer
          </Button>
          <Button variante="secondaire" onClick={onFermer}>
            Fermer
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="no-print flex flex-wrap items-center gap-2">
          <Button taille="sm" variante="secondaire" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
            Agrandir
          </Button>
          <Button taille="sm" variante="secondaire" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>
            Réduire
          </Button>
          <Button taille="sm" variante={inverse ? 'primaire' : 'secondaire'} onClick={() => setInverse((v) => !v)}>
            Négatif
          </Button>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            Contraste
            <input
              type="range"
              min={50}
              max={200}
              value={contraste}
              onChange={(e) => setContraste(Number(e.target.value))}
              className="w-28 accent-brand-600"
            />
          </label>
          <span className="ml-auto text-xs text-slate-400">{Math.round(zoom * 100)} %</span>
        </div>

        <div
          ref={zone}
          onClick={poser}
          className={cx(
            'relative max-h-[60vh] overflow-auto rounded-lg bg-slate-900',
            annotation.trim() && 'cursor-crosshair',
          )}
        >
          {url ? (
            <>
              <img
                src={url}
                alt={image.libelle}
                className="mx-auto block"
                style={{
                  width: `${zoom * 100}%`,
                  filter: `contrast(${contraste}%) ${inverse ? 'invert(1)' : ''}`,
                }}
              />
              {image.annotations.map((a) => (
                <span
                  key={a.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${a.x}%`, top: `${a.y}%` }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-brand-600 text-[10px] font-bold text-white">
                    !
                  </span>
                  <span className="absolute left-6 top-0 whitespace-nowrap rounded bg-white/95 px-1.5 py-0.5 text-xs font-medium text-slate-800 shadow">
                    {a.texte}
                  </span>
                </span>
              ))}
            </>
          ) : (
            <p className="p-10 text-center text-sm text-slate-400">{erreur || 'Chargement de l’image…'}</p>
          )}
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <Input
            value={annotation}
            onChange={(e) => setAnnotation(e.target.value)}
            placeholder="Saisir une annotation puis cliquer sur l’image…"
            className="max-w-sm"
          />
          {image.annotations.length > 0 ? (
            <Button
              taille="sm"
              variante="secondaire"
              onClick={() => majImage(image.id, { annotations: [] })}
            >
              Effacer les annotations ({image.annotations.length})
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

export function OngletImagerie({ patient, dentsSelectionnees }: { patient: Patient; dentsSelectionnees: number[] }) {
  const { data, ajouterImage, coffre } = useApp();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState('');
  const [type, setType] = useState<TypeImage>('retroalveolaire');
  const [dents, setDents] = useState(dentsSelectionnees.join(', '));
  const champ = useRef<HTMLInputElement>(null);

  const images = data.images
    .filter((i) => i.patientId === patient.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const importer = useCallback(
    async (fichiers: FileList | null) => {
      if (!fichiers || fichiers.length === 0) return;
      if (!indexedDbDisponible()) {
        setErreur('Ce navigateur ne permet pas le stockage local des images.');
        return;
      }
      setOccupe(true);
      setErreur('');
      try {
        for (const fichier of Array.from(fichiers)) {
          if (!fichier.type.startsWith('image/')) {
            setErreur(`« ${fichier.name} » n’est pas une image.`);
            continue;
          }
          const id = uid('img');
          const dimensions = await mesurerImage(fichier);
          const vignette = await creerVignette(fichier);
          await enregistrerFichier(id, fichier, coffre);
          await enregistrerFichier(ID_VIGNETTE(id), vignette, coffre);
          ajouterImage(
            {
              patientId: patient.id,
              dents: dents
                .split(',')
                .map((x) => Number.parseInt(x.trim(), 10))
                .filter((n) => Number.isFinite(n)),
              type,
              date: new Date().toISOString().slice(0, 10),
              libelle: fichier.name.replace(/\.[^.]+$/, ''),
              mime: fichier.type,
              taille: fichier.size,
              largeur: dimensions.largeur,
              hauteur: dimensions.hauteur,
              annotations: [],
            },
            id,
          );
        }
      } catch (e) {
        setErreur(e instanceof Error ? e.message : 'Import impossible.');
      } finally {
        setOccupe(false);
      }
    },
    [ajouterImage, coffre, dents, patient.id, type],
  );

  const image = images.find((i) => i.id === ouverte);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          titre="Imagerie"
          sousTitre={`${images.length} document(s) · stockés sur ce poste${coffre ? ', chiffrés avec le coffre' : ''}`}
          action={
            <Button onClick={() => champ.current?.click()} disabled={occupe}>
              {occupe ? 'Import…' : '+ Importer des images'}
            </Button>
          }
        />
        <CardBody className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Type d’examen">
              <Select value={type} onChange={(e) => setType(e.target.value as TypeImage)}>
                {TYPES.map((t) => (
                  <option key={t.cle} value={t.cle}>
                    {t.libelle}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Dents concernées" aide="Numéros FDI séparés par une virgule.">
              <Input value={dents} onChange={(e) => setDents(e.target.value)} placeholder="16, 17" />
            </Field>
            <div className="flex items-end">
              <p className="text-xs text-slate-500">
                Ces réglages s’appliquent aux images importées juste après.
              </p>
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void importer(e.dataTransfer.files);
            }}
            className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center"
          >
            <p className="text-sm font-medium text-slate-700">
              Glissez vos clichés ici, ou{' '}
              <button
                type="button"
                className="font-semibold text-brand-600 underline"
                onClick={() => champ.current?.click()}
              >
                parcourez vos fichiers
              </button>
              .
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Les images restent sur ce poste : aucun envoi vers un serveur.
            </p>
          </div>

          <input
            ref={champ}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void importer(e.target.files);
              e.target.value = '';
            }}
          />

          {erreur ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
          ) : null}

          {images.length === 0 ? (
            <EmptyState
              titre="Aucune image"
              description="Importez les rétro-alvéolaires, panoramiques et photos du patient pour les retrouver dent par dent."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((i) => (
                <Vignette key={i.id} image={i} onOuvrir={() => setOuverte(i.id)} />
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {image ? <Visionneuse image={image} onFermer={() => setOuverte(null)} /> : null}
    </div>
  );
}
