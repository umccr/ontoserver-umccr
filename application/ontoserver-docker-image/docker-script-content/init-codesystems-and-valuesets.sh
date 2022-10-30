#!/bin/bash

. "${SCRIPT_LOCATION}/start-services-during-build.sh"

function putCodeSystem ()
{
    curl -sS --fail -X PUT "http://localhost:8080/fhir/CodeSystem/$1" -H 'Prefer: return=OperationOutcome' -H 'Content-Type: application/fhir+json' --data "@$2"
}

function postCodeSystem ()
{
    curl -sS --fail -X POST "http://localhost:8080/fhir/CodeSystem" -H 'Prefer: return=OperationOutcome' -H 'Content-Type: application/fhir+json' --data "@$2"
}

function putValueSet ()
{
    curl -sS --fail -X PUT "http://localhost:8080/fhir/ValueSet/$1" -H 'Prefer: return=OperationOutcome' -H 'Content-Type: application/fhir+json' --data "@$2"
}

if [ -n "$SNOMED_RELEASE" ]
then
  # Run ontoserver SNOMED index script
  # This file (index.sh) only exists in the base docker image provided as part of Ontoserver
  # We want the calling Docker to be able to fail so we need to print the result output
  /index.sh -v "${SNOMED_RELEASE}"

  # Let the database recover a bit from the SNOMED load
  sleep 60
fi

putValueSet pieriandx-disease "${TO_LOAD_LOCATION}/disease.json"
putValueSet pieriandx-mass "${TO_LOAD_LOCATION}/mass.json"
putValueSet pieriandx-uncertain-diagnosis "${TO_LOAD_LOCATION}/uncertain.json"
putValueSet pieriandx-specimen-type "${TO_LOAD_LOCATION}/specimen.json"

if [ -n "$HGNC_RELEASE" ]
then
  postCodeSystem hgnc "${TO_LOAD_LOCATION}/hgnc.json"
fi

if [ -n "$HPO_RELEASE" ]
then
  putCodeSystem hpo "${TO_LOAD_LOCATION}/hp.json"
fi

if [ -n "$HANCESTRO_RELEASE" ]
then
  putCodeSystem hancestro "${TO_LOAD_LOCATION}/hancestro.json"
fi

if [ -n "$MONDO_RELEASE" ]
then
  putCodeSystem mondo "${TO_LOAD_LOCATION}/mondo.json"
fi

curl -sS --fail "http://localhost:8080/api/jobs" | jq .

curl --request POST --url 'http://localhost:8080/api/vacuum?cleanup=true' --header 'Content-Type: application/json'

. "${SCRIPT_LOCATION}/stop-services-during-build.sh"
