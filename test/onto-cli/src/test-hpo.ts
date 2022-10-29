import { assertDisplayValue } from "./test-common";

const HPO_NS = "http://human-phenotype-ontology.org";

export async function testHpo(cs: any, client: any) {
  const gaitAtaxiaLookup = await client.request(
    `CodeSystem/$lookup?system=${HPO_NS}&code=HP:0002066&_format=json`,
    { pageLimit: 0, flat: true }
  );

  assertDisplayValue(gaitAtaxiaLookup, "Gait ataxia");
}
