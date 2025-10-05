export class Calculator {
  // Magic numbers - should be detected
  calculate(x: number): number {
    return x * 3.14159 + 42 - 999;
  }
  
  processData(items: any[]) {
    // More magic numbers
    if (items.length > 100) {
      return items.slice(0, 50);
    }
    return items;
  }
}