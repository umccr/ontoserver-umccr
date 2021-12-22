# normally this image should be built as part of the CDK stack, but if you are making changes
# to the docker image and want to test things outside of CDK, this script is just a normal
# Docker built with args set

docker build . \
         --build-arg HGNC_RELEASE=2021-10-01 \
         --build-arg HPO_RELEASE=2021-10-10 \
         --build-arg HANCESTRO_RELEASE=2.5 \
         --build-arg MONDO_RELEASE=2021-12-01 \
         -t onto

#         --build-arg client_id_arg=xxx \
#         --build-arg client_secret_arg=yyy \
#         --build-arg SNOMED_RELEASE=2021-09-30 \
