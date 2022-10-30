#!/bin/bash

# no idea if necessary but before we yank the db away from the onto server we
# give it a bit of time

echo Sleeping before shutting down db
sleep 120
echo About to shut down db

su - postgres -c "pg_ctl stop -D /var/lib/postgresql/data"
