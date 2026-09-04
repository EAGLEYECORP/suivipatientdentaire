import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/utils';

export function Field({
  label,
  children,
  aide,
  className,
}: {
  label: string;
  children: ReactNode;
  aide?: string;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="etiquette">{label}</span>
      {children}
      {aide ? <span className="mt-1 block text-xs text-slate-400">{aide}</span> : null}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx('champ', className)} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx('champ', className)}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx('champ', className)} />;
}

/** Comma/newline separated list editor used for allergies, history, alerts. */
export function ListeTexte({
  label,
  valeur,
  onChange,
  placeholder,
}: {
  label: string;
  valeur: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <Field label={label} aide="Séparer les éléments par une virgule.">
      <Input
        value={valeur.join(', ')}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(
            e.target.value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          )
        }
      />
    </Field>
  );
}
