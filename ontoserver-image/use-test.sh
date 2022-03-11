# normally this image should be built as part of the CDK stack, but if you are making changes
# to the docker image and want to test things outside of CDK this script will run some
# standard queries on the image as build by the build script

docker run onto --rm -P 8080:8080
