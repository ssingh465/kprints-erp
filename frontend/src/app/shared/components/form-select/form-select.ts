import { Component, forwardRef, Input } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { SelectModule } from 'primeng/select';

export interface SelectOption<T = string> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-form-select',
  standalone: true,
  imports: [FormsModule, SelectModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => FormSelect),
      multi: true,
    },
  ],
  template: `
    <p-select
      [options]="options"
      [(ngModel)]="innerValue"
      (ngModelChange)="onChange($event)"
      (onBlur)="onTouched()"
      [optionLabel]="optionLabel"
      [optionValue]="optionValue"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [showClear]="showClear"
      styleClass="w-full"
      [inputId]="inputId"
    />
  `,
})
export class FormSelect<T = string> implements ControlValueAccessor {
  @Input() options: SelectOption<T>[] | T[] = [];
  @Input() optionLabel = 'label';
  @Input() optionValue = 'value';
  @Input() placeholder = 'Select…';
  @Input() showClear = false;
  @Input() inputId = '';

  innerValue: T | null = null;
  disabled = false;

  private onValueChange: (value: T | null) => void = () => undefined;
  onTouched: () => void = () => undefined;

  writeValue(value: T | null): void {
    this.innerValue = value;
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onValueChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onChange(value: T | null): void {
    this.innerValue = value;
    this.onValueChange(value);
  }
}
