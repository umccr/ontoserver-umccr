export interface OntoserverSettings {
  /**
   * The host name prefix (name before first dot in hostname)
   */
  readonly hostNamePrefix: string;

  /**
   * A dictionary of ontologies and their versions. Ontology names
   * must match those understood by the Onto dockerfile.
   * e.g.
   *  { HGNC_RELEASE: "2021-10-01",
   *    HPO_RELEASE: "2021-10-10" }
   */
  readonly ontologies: { [id: string]: string };

  /**
   * The number of services to have run concurrently. Needs to be greater than 1
   * in order to get cross availability zone
   */
  readonly desiredCount: number;

  /**
   * The memory assigned to each service
   */
  readonly memoryLimitMiB: number;
}
