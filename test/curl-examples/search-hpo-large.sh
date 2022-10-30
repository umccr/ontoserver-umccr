curl -sS --location --request POST 'http://localhost:8080/fhir/ValueSet/$expand' \
--header 'Content-Type: application/fhir+json' \
--data-raw '{
        "resourceType": "Parameters",
        "parameter": [
            {"name": "filter", "valueString": "large"},
            {
                "name": "valueSet",
                "resource": {
                    "resourceType": "ValueSet",
                    "status": "active",
                    "compose": {
                        "include": [
                            {
                                "system": "http://human-phenotype-ontology.org",
                                "filter": [
                                    {
                                        "property": "concept",
                                        "op": "is-a",
                                        "value": "HP:0000598"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        ]
    }' | jq .

