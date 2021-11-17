FROM python:3.8 AS pierianbuilder

COPY tools/pieriandx/* /app/
WORKDIR /app
RUN pip install -r requirements.txt
RUN wget "https://tools.pieriandx.com/confluence/download/attachments/37980477/SNOMED_CT%20Disease_trees.xlsx?version=1&modificationDate=1561395438000&api=v2" -O disease.xlsx
RUN wget "https://tools.pieriandx.com/confluence/download/attachments/37980477/SnomedCT-Term_For_SpecimenType.xls?version=1&modificationDate=1561395451000&api=v2" -O specimen.xls
RUN python main.py

FROM openjdk:18 AS owlbuilder

ARG HPO_RELEASE=""
ARG HANCESTRO_RELEASE=""
ARG MONDO_RELEASE=""

WORKDIR /app
RUN microdnf install wget unzip
RUN wget https://github.com/aehrc/fhir-owl/releases/download/v1.1/fhir-owl-v1.1.jar -O fhir-owl.jar

RUN test ! -z "$HPO_RELEASE" && wget "https://github.com/obophenotype/human-phenotype-ontology/archive/refs/tags/v$HPO_RELEASE.zip" -O hpo.zip || true
RUN test ! -z "$HPO_RELEASE" && unzip -j hpo.zip "*/hp.owl" || true
RUN test ! -z "$HPO_RELEASE" && java -jar fhir-owl.jar -i hp.owl -v "$HPO_RELEASE" -o hp.json \
         -id hpo -name "Human Phenotype Ontology" -content not-present \
         -mainNs http://purl.obolibrary.org/obo/HP_ \
         -descriptionProp http://purl.org/dc/elements/1.1/subject \
         -status active -codeReplace "_,:" || true

RUN test ! -z "$HANCESTRO_RELEASE" && wget "https://github.com/EBISPOT/ancestro/archive/refs/tags/$HANCESTRO_RELEASE.zip" -O hancestro.zip || true
RUN test ! -z "$HANCESTRO_RELEASE" && unzip -j hancestro.zip "*/hancestro.owl" || true
RUN test ! -z "$HANCESTRO_RELEASE" && java -jar fhir-owl.jar -i hancestro.owl -v "$HANCESTRO_RELEASE" -o hancestro.json \
                                           -id hancestro -name "Human Ancestry Ontology" \
                                           -mainNs http://purl.obolibrary.org/obo/HANCESTRO_ \
                                           -status active -codeReplace "_,:" || true

#      - gzip -dc reference-data/mondo/mondo-${MONDO_RELEASE}/mondo.owl.gz > mondo.owl
#      - >
#        java -jar ${FHIR_OWL_JAR} -i mondo.owl -v ${MONDO_RELEASE} -o docker-to-load-content/mondo.json \
#                                           -id mondo -name "MONDO: Monarch Disease Ontology" \
#                                           -mainNs http://purl.obolibrary.org/obo/MONDO_ \
#                                           -status active -codeReplace "_,:"




FROM quay.io/aehrc/ontoserver:ctsa-6.6.1

ARG client_id_arg=""
ARG client_secret_arg=""
ARG SNOMED_RELEASE=""
ARG HPO_RELEASE=""
ARG HANCESTRO_RELEASE=""
ARG MONDO_RELEASE=""

# Install postgresql (initdb as postgres user or else the perms are wrong)
RUN apk update && apk upgrade && apk add postgresql
RUN mkdir /var/run/postgresql && chown -R postgres:postgres /var/run/postgresql
USER postgres
RUN initdb -D /var/lib/postgresql/data

# Switch back to root
USER root

# Docker build variables
ENV authentication.oauth.endpoint.client_id.0 $client_id_arg
ENV authentication.oauth.endpoint.client_secret.0 $client_secret_arg
ENV ONTOSERVER_INSECURE 'true'

# Copy content into required locations
# (other build things may have already been run to place the required files into the docker-*-content folders
#  before the Docker build even started)
ENV SCRIPT_LOCATION '/script'
ENV TO_LOAD_LOCATION '/to-load'

COPY docker-root-content/* /
COPY docker-script-content/* $SCRIPT_LOCATION/
COPY --from=pierianbuilder /app/*.json $TO_LOAD_LOCATION/
COPY --from=owlbuilder /app/*.json $TO_LOAD_LOCATION/

# Do the actual data loading
RUN echo Settings are HPOs $HPO_RELEASE - SNOMED $SNOMED_RELEASE - HANCESTRO $HANCESTRO_RELEASE - MONDO $MONDO_RELEASE
RUN /script/init-codesystems-and-valuesets.sh

# Data has been loaded into the onto db - no longer need the files on disk
RUN rm -rf "$TO_LOAD_LOCATION"

# We want our regular ontoserver entrypoint - but we need to get in first and start postgres
ENTRYPOINT ["/script/docker-intercept-entrypoint.sh"]
