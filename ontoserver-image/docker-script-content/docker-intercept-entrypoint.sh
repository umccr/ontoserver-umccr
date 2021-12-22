#!/bin/bash

# Start postgres
su - postgres -c "pg_ctl start -D /var/lib/postgresql/data"

# The run.sh file only exists in the base docker image
# and is responsible for starting up onto server
/run.sh
