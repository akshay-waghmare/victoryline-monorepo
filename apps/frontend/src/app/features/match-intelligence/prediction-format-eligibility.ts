/** Formats intentionally held out from the first prediction rollout. */
export function isHundredMatch(...values: any[]): boolean {
  var text = values
    .filter((value) => value !== null && value !== undefined)
    .map((value) => typeof value === 'string' ? value : JSON.stringify(value))
    .join(' ')
    .toLowerCase();

  return /the[\s-]?hundred|100[\s-]?balls?|hundred[\s-]?balls?/.test(text);
}
