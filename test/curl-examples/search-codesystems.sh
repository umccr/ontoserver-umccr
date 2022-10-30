curl -sS --location --request GET 'http://localhost:8080/fhir/CodeSystem?_elements=name,url,version&_format=json' | jq .
