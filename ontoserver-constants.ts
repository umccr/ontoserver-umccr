/**
 * The value of the Stack tag that we try to set throughout the entire deployment (for accurate costing)
 */
export const TAG_STACK_VALUE = "Ontoserver";

/**
 * The value of the CloudFormation description set throughout all stacks
 */
export const STACK_DESCRIPTION =
  "Ontoserver is a service for storing/querying medical ontologies such as SNOMED";

// can track releases at
// HGNC  http://ftp.ebi.ac.uk/pub/databases/genenames/hgnc/archive/quarterly/json
// HPO  https://github.com/obophenotype/human-phenotype-ontology/releases
// HANCESTRO  https://github.com/EBISPOT/ancestro/releases
// Mondo  https://github.com/monarch-initiative/mondo/releases
// SNOMED  see NCTS
export const CURRENT_ONTOLOGIES: { [n: string]: string } = {
  HGNC_RELEASE: "2022-01-01",
  HPO_RELEASE: "2022-02-14",
  HANCESTRO_RELEASE: "2.5",
  MONDO_RELEASE: "2022-03-01",
  SNOMED_RELEASE: "20211231",
};

export const HOST_PREFIX = "onto";