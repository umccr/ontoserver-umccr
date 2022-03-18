/**
 * Assert that the result from an Ontoserver expand is a single result matching what we expect.
 *
 * @param result
 * @param displayValue
 */
export function assertDisplayValue(result: any, displayValue: string): void {
  if (result?.resourceType !== "Parameters")
    throw new Error("Result of lookup was not Parameters resource");

  for (const p of result?.parameter || []) {
    if (p?.name === "display") {
      if (p?.valueString === displayValue) {
        return;
      } else
        throw new Error(
          `Lookup display value did not match - expected ${displayValue} but got ${p?.valueString}`
        );
    }
  }

  throw new Error("Did not find display result");
}
