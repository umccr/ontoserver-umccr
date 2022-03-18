#!/usr/bin/env node

import { program, Option } from "commander";
import { testHpo } from "./test-hpo";
import { testMondo } from "./test-mondo";

// we have a bunch of identifiers as markers of our tests... often these correspond directly
// with the FHIR id of the codesystem in ontoserver (but not all the time - especially if
// we end up loading multiple versions of each codesystem we will have to be more clever about
// what codesystem instance in particular we are testing against)
const HPO_TEST_ID = "hpo";
const MONDO_TEST_ID = "mondo";
const SNOMED_TEST_ID = "snomed";
const ANCESTRO_TEST_ID = "ancestro";
const HGNC_TEST_ID = "hgnc";
const ROR_TEST_ID = "ror";

// definitions of the code systems and value sets that we know how to test
// (the ontoserver instance could have others that we don't test so this is not exhaustive)
const knownCodeSystems = [MONDO_TEST_ID, HPO_TEST_ID] as const;
const knownValueSets = ["pierian", "parkville"] as const;

// it is possibly theoretically useful to have these choices as a typescript type
type CodeSystemType = typeof knownCodeSystems[number];
type ValueSetType = typeof knownValueSets[number];

// ok the import/es interop for this fhir client is terrible... I can't be bothered debugging though
// we use FHIR() and seem to be able to get a client which is what we want...
const FHIR = require("fhirclient");

const testAction = async (ontoserver: string, options: any) => {
  const client = FHIR().client(ontoserver);

  const codeSystems = await client.request("CodeSystem", {
    pageLimit: 0,
    flat: true,
  });

  // if the user specifies no specific codesystems or valuesets on the command line then we test all the
  // ones we know (this is probably the default invocation)
  const testAllCodesystems = !options.codesystem;
  const testAllValueSets = !options.valueset;

  const didTest: { [c: string]: boolean } = {};

  for (const cs of codeSystems) {
    // I know this doesn't actually enforce the id being part of our known code systems - but
    // it does warn on comparisons in the code later if we get the values wrong
    const csId: CodeSystemType = cs.id;

    switch (csId) {
      case HPO_TEST_ID:
        if (testAllCodesystems || options.codesystem.includes(HPO_TEST_ID)) {
          await testHpo(cs, client);
          console.log(`Success testing ${HPO_TEST_ID}`);
          didTest[HPO_TEST_ID] = true;
        }
        break;

      case MONDO_TEST_ID:
        if (testAllCodesystems || options.codesystem.includes(MONDO_TEST_ID)) {
          await testMondo(cs, client);
          console.log(`Success testing ${MONDO_TEST_ID}`);
          didTest[MONDO_TEST_ID] = true;
        }
        break;
    }
  }

  for (const testCs of testAllCodesystems
    ? knownCodeSystems
    : options.codesystem) {
    if (!didTest[testCs])
      throw new Error(
        `Did not end up testing against ${testCs} because Ontoserver did not list it as a loaded CodeSystem`
      );
  }

  // TODO: Valueset loaders
  // const vs = await client.request("ValueSet", { pageLimit: 0, flat: true });
};

program
  .argument("<ontoserver>", "ontoserver url (including /fhir)")
  .addOption(
    new Option("--codesystem <cs...>", "codesystem test name(s)").choices(
      knownCodeSystems
    )
  )
  .addOption(
    new Option("--valueset <vs...>", "valueset test name(s)").choices(
      knownValueSets
    )
  )
  .action(testAction);

(async () => {
  await program.parseAsync();
})();
