import type { ComponentProps } from 'react';

interface FormFieldProps extends ComponentProps<'input'> {
  label: string;
}

export function FormField({ id, label, ...inputProps }: FormFieldProps) {
  return (
    <label className="block text-sm font-medium text-neutral-700" htmlFor={id}>
      {label}
      <input
        className="mt-2 h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
        id={id}
        {...inputProps}
      />
    </label>
  );
}
