import { assertDisplayValue } from "./test-common";

const MONDO_NS = "http://purl.obolibrary.org/obo/mondo.owl";

/* TODO: test against
{
    resourceType: 'CodeSystem',
    id: 'mondo',
    meta: {
      versionId: '1',
      lastUpdated: '2022-03-11T05:48:56.849+00:00',
      tag: [Array]
    },
    url: 'http://purl.obolibrary.org/obo/mondo.owl',
    version: '2021-12-01',
    name: 'MONDO: Monarch Disease Ontology',
    status: 'active',
    experimental: false,
    valueSet: 'http://purl.obolibrary.org/obo/mondo.owl?vs',
    hierarchyMeaning: 'is-a',
    compositional: false,
    versionNeeded: false,
    content: 'complete',
    count: 41103,
    filter: [ [Object], [Object], [Object] ],
    property: [ [Object], [Object], [Object], [Object] ]
  }

 */
export async function testMondo(cs: any, client: any) {
  const ushersLookup = await client.request(
    `CodeSystem/$lookup?system=${MONDO_NS}&code=MONDO:0019501&_format=json`,
    { pageLimit: 0, flat: true }
  );

  assertDisplayValue(ushersLookup, "Usher syndrome");
}
