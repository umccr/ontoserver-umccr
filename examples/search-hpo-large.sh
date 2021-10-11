curl --location --request POST 'http://localhost:8080/fhir/ValueSet/$expand' \
--header 'Content-Type: application/json' \
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
                                "version": "2019-06-03",
                                "filter": [
                                    {
                                        "property": "concept",
                                        "op": "is-a",
                                        "value": "HP:0000118"
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        ]
    }' | jq .

