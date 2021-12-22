#!/bin/bash

# Note that this starts relevant services such that they are available *during* the Docker
# build

# That is because we want a running postgres/onto in order that we can instruct it to
# load SNOMED etc. Then the services will shut down - but we will be left with all the data
# loaded in the right spots for when the Docker image runs for real.

# Start postgres
su - postgres -c "pg_ctl start -o ' -c listen_addresses=''localhost'' ' -D /var/lib/postgresql/data"

# Call base docker image entrypoint script (starts ontoserver itself)
/run.sh &

# Wait for ontoserver to start up
until $(curl --output /dev/null --silent --fail http://localhost:8080/fhir/metadata); do
    printf '.'
    sleep 5
done

sleep 5

echo "Ontoserver (and Postgres) have been started inside the Docker build"
