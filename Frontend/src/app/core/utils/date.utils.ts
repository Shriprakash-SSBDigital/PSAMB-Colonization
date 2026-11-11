import {
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';

export class DateUtils {

  static todayAsDateString(): string {
    const today = new Date();
    return this.toDateString(today);
  }

  static todayAsDatetimeLocalString(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    return `${this.toDateString(now)}T${hh}:${mm}`;
  }

  static noFutureDate(includeTime = false): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) return null;

      const selected = new Date(control.value);
      if (isNaN(selected.getTime())) return null;

      const today = new Date();

      if (includeTime) {
        return selected > today ? { futureDate: true } : null;
      }

      return this.toDateString(selected) > this.toDateString(today)
        ? { futureDate: true }
        : null;
    };
  }

  static formatForDisplay(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = value instanceof Date ? value : new Date(value);

    if (isNaN(date.getTime())) return '';

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');

    return `${dd}/${mm}/${date.getFullYear()}`;
  }

  static parseDisplayDate(display: string): string {
    if (!display) return '';

    const [dd, mm, yyyy] = display.split('/');

    if (!dd || !mm || !yyyy) return '';

    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }

  private static toDateString(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }
}
