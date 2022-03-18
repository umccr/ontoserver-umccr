curl -s --location --request POST 'https://onto.dev.umccr.org/fhir/ValueSet/$expand' \
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
                                "system": "http://purl.obolibrary.org/obo/hp.owl",
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

