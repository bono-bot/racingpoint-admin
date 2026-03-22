import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { $ZodType } from 'zod/v4/core';

/**
 * useZodForm — wraps react-hook-form with automatic zod validation.
 *
 * Usage:
 *   const schema = z.object({ name: z.string().min(3), email: z.string().email() });
 *   type FormData = z.infer<typeof schema>;
 *   const form = useZodForm(schema, { defaultValues: { name: '', email: '' } });
 *
 *   <form onSubmit={form.handleSubmit(onSubmit)}>
 *     <FormField label="Name" name="name" registration={form.register('name')} error={form.formState.errors.name} />
 *     <button type="submit" disabled={form.formState.isSubmitting}>Save</button>
 *   </form>
 */
export function useZodForm<T extends FieldValues>(
  schema: $ZodType<T, T>,
  options?: Omit<UseFormProps<T>, 'resolver'>
) {
  return useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    ...options,
  });
}
