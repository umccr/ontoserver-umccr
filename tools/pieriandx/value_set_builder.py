from typing import Dict


class ValueSetBuilder:

    def __init__(self, id: str, url: str, ver: str, name: str):
        self.concepts = set()

        self.id = id
        self.url = url
        self.ver = ver
        self.name = name

    def add_concept(self, s: str):
        self.concepts.add(s)

    def as_value_set(self) -> Dict:
        return {
            "resourceType": "ValueSet",
            "id": self.id,
            "url": self.url,
            "version": self.ver,
            "name": self.name,
            "publisher": "UMCCR (via PierianDx website)",
            "status": "active",
            "compose": {
                "include": [
                    {
                        "system": "http://snomed.info/sct",
                        "concept": list(map(lambda x: {"code": x}, self.concepts)),
                    }
                ]
            },
        }
