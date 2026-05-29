import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Letters only, words separated by a single space. */
export const ALPHABETIC_NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

/** Each word starts with a capital letter, rest lowercase. */
export const PROPER_NAME_PATTERN = /^[A-Z][a-z]+(?: [A-Z][a-z]+)*$/;

/** Format input to title case: "jane doe" → "Jane Doe". */
export function formatProperName(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function properNameValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return null;
    }

    if (!ALPHABETIC_NAME_PATTERN.test(raw)) {
      return { alphabeticOnly: true };
    }

    if (!PROPER_NAME_PATTERN.test(raw)) {
      return { properCase: true };
    }

    return null;
  };
}
