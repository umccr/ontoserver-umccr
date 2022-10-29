# normally this image should be built as part of the CDK stack, but if you are making changes
# to the docker image and want to test things outside of CDK, this script is just a normal
# Docker built with args set

NCTS_ID=$(aws ssm get-parameter --name ncts_client_id --output text --query Parameter.Value)
NCTS_SECRET=$(aws ssm get-parameter --name ncts_client_secret --output text --query Parameter.Value)

echo "Using NCTS $NCTS_ID with secret $NCTS_SECRET"

docker build . --progress plain \
         --build-arg HGNC_RELEASE=2021-10-01 \
         --build-arg HANCESTRO_RELEASE=2.5 \
         --build-arg MONDO_RELEASE=2021-12-01 \
         --build-arg HPO_RELEASE=2022-10-05 \
         -t onto

#         --build-arg NCTS_CLIENT_ID=$NCTS_ID \
#         --build-arg NCTS_CLIENT_SECRET=$NCTS_SECRET \
#         --build-arg SNOMED_RELEASE=20210930 \
#
