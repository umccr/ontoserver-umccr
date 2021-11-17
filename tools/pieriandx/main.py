from typing import Any

from openpyxl import load_workbook
import json

import xlrd

from value_set_builder import ValueSetBuilder


def generate_xlsx_value_set(vsb: ValueSetBuilder, ws: Any, filename: str):
    for row in ws.values:
        if row[0] == "Code":
            continue

        if row[1] != "SNOMEDCT":
            raise Exception("We can only currently deal with valuesets made up of SNOMED codes")

        vsb.add_concept(str(int(row[0])))

    with open(filename, "w") as fp:
        json.dump(vsb.as_value_set(), fp, indent=2)


def generate_diseases_value_sets():
    workbook = load_workbook("disease.xlsx")

    # sheet 1 is the diseases
    generate_xlsx_value_set(
        ValueSetBuilder(
            "pieriandx-disease",
            "http://pieriandx.com/fhir/disease",
            "1.0.0",
            "Pierian Dx Disease",
        ),
        workbook["Disease tree"],
        "disease.json",
    )

    # sheet 2 is the mass tree
    generate_xlsx_value_set(
        ValueSetBuilder(
            "pieriandx-mass",
            "http://pieriandx.com/fhir/mass",
            "1.0.0",
            "Pierian Dx Mass",
        ),
        workbook["Mass tree"],
        "mass.json",
    )

    # sheet 3 is the uncertain types
    generate_xlsx_value_set(
        ValueSetBuilder(
            "pieriandx-uncertain-diagnosis",
            "http://pieriandx.com/fhir/uncertain-diagnosis",
            "1.0.0",
            "Pierian Dx Uncertain Diagnosis",
        ),
        workbook["Uncertain diagnosis"],
        "uncertain.json",
    )


def generate_specimen_type_value_set():
    workbook = xlrd.open_workbook("specimen.xls")

    vsb = ValueSetBuilder(
        "pieriandx-specimen-type",
        "http://pieriandx.com/fhir/specimen-type",
        "1.0.0",
        "Pierian Dx Specimen Type",
    )

    # Select sheet.
    worksheet = workbook.sheet_by_index(0)

    row = 1

    while row < worksheet.nrows:
        code = worksheet.cell_value(rowx=row, colx=0)

        # I don't quite now how robust the XLS cell_value thing is in butchering large numbers, so we
        # convert to int and back to hopefully trap dud data?
        vsb.add_concept(str(int(code)))

        row = row + 1

    with open("specimen.json", "w") as fp:
        json.dump(vsb.as_value_set(), fp, indent=2)


if __name__ == "__main__":
    generate_specimen_type_value_set()

    generate_diseases_value_sets()
