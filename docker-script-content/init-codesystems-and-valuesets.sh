#!/bin/bash

. "${SCRIPT_LOCATION}/start-services-during-build.sh"

function putCodeSystem ()
{
    curl -sS --fail -X PUT "http://localhost:8080/fhir/CodeSystem/$1" -H 'Prefer: return=OperationOutcome' -H 'Content-Type: application/fhir+json' --data "@$2"
}

function putValueSet ()
{
    curl -sS --fail -X PUT "http://localhost:8080/fhir/ValueSet/$1" -H 'Prefer: return=OperationOutcome' -H 'Content-Type: application/fhir+json' --data "@$2"
}

putValueSet pieriandx-disease "${TO_LOAD_LOCATION}/disease.json"
putValueSet pieriandx-mass "${TO_LOAD_LOCATION}/mass.json"
putValueSet pieriandx-uncertain-diagnosis "${TO_LOAD_LOCATION}/uncertain.json"
putValueSet pieriandx-specimen-type "${TO_LOAD_LOCATION}/specimen.json"

if [ -n "$SNOMED_RELEASE" ]
then
  # Run ontoserver SNOMED index script
  # This file (index.sh) only exists in the base docker image provided as part of Ontoserver
  # We want the calling Docker to be able to fail so we need to print the result output
  echo $(/index.sh -v ${SNOMED_RELEASE})
fi

if [ -n "$HPO_RELEASE" ]
then
  putCodeSystem hpo "${TO_LOAD_LOCATION}/hp.json"
fi

. "${SCRIPT_LOCATION}/stop-services-during-build.sh"
