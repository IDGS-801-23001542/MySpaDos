// Integer-cent accounting avoids floating point accumulation in services.
export function cents(value) {
  return Math.round(Number(value) * 100);
}

export function productCost(unitPrice, quantity) {
  return cents(unitPrice) * quantity / 100;
}

export function sumCosts(values) {
  return values.reduce((sum, value) => sum + cents(value), 0) / 100;
}
