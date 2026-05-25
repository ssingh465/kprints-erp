import { CurrencyPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'inr',
  standalone: true,
})
export class InrPipe implements PipeTransform {
  private readonly currencyPipe = new CurrencyPipe('en-IN');

  transform(value: number): string {
    return this.currencyPipe.transform(value, 'INR', 'symbol', '1.0-0') ?? `₹${value}`;
  }
}
