/** Aggregate the physical units consumed, including products used in multiple treatments. */
export function totalProductUsage(treatments = []) {
  const totals = new Map();
  for (const treatment of treatments) {
    for (const product of treatment.products || []) {
      totals.set(product.productId,
        (totals.get(product.productId) || 0) + Number(product.quantity || 0));
    }
  }
  return totals;
}

/** Positive delta means restock; negative delta means consume units. */
export function inventoryDeltas(nextTreatments, previousTreatments = []) {
  const current = totalProductUsage(nextTreatments);
  const previous = totalProductUsage(previousTreatments);
  return new Map([...new Set([...current.keys(), ...previous.keys()])]
    .map((id) => [id, (previous.get(id) || 0) - (current.get(id) || 0)])
    .filter(([, delta]) => delta !== 0));
}
