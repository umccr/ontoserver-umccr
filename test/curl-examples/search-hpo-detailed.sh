curl -sS --location --request POST 'http://localhost:8080/fhir/ValueSet/$expand' \
  --header 'Content-Type: application/fhir+json' \
  --data-raw '{
                "resourceType": "Parameters",
                "parameter": [
                   {"name": "filter", "valueString": "Pituicytoma"},
                   {"name": "property", "valueString": "*"},
	                 {"name": "url", "valueUri": "http://human-phenotype-ontology.org?vs"}
                 ]
              }' | jq .
