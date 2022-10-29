curl --location --request POST 'http://localhost:8080/fhir/ValueSet/$expand' \
--header 'Content-Type: application/fhir+json' \
--data-raw '{
        "resourceType": "Parameters",
        "parameter": [
            {"name": "filter", "valueString": "Hyperornithinemia"},
            {"name": "property", "valueString": "*"},
            {"name": "url", "valueUri": "http://purl.obolibrary.org/obo/hp.fhir?vs"},
            {"name": "includeDesignations", "valueBoolean": "true"}
        ]
    }' | jq .
