import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {DockerImageAsset} from 'aws-cdk-lib/aws-ecr-assets';
import * as path from "path";
import {InterfaceVpcEndpointAwsService} from "aws-cdk-lib/aws-ec2";
import {IsolatedDockerServiceWithLoadBalancerConstruct} from "./isolated-docker-service-with-load-balancer-construct";


export class OntoserverStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // the ontoserver image is a relatively complex build - with sub-builders for fetching each terminology
        // files downloaded from the internet are meant to be stable (hgnc quarterly release json etc)
        // - but there are no guarantees
        const dockerImageFolder = path.join(__dirname, '..', 'ontoserver-image');

        const asset = new DockerImageAsset(this, 'OntoserverImage', {
            directory: dockerImageFolder,
            buildArgs: {
                "HGNC_RELEASE": "2021-10-01",
                "HPO_RELEASE": "2021-10-10",
                "HANCESTRO_RELEASE": "2.5",
                "MONDO_RELEASE": "2021-12-01",
            }
        });

        const ontoserverSettings = {
            "ontoserver": {"security": {"enabled": true, "readOnly": {"fhir": true}}},
            "server": {"port": 80}
        }

        const isolated = new IsolatedDockerServiceWithLoadBalancerConstruct(this, 'Isolated', {
            hostPrefix: 'ontotest',
            imageAsset: asset,
            awsPrivateLinksServices: [
                InterfaceVpcEndpointAwsService.ECR_DOCKER,
                InterfaceVpcEndpointAwsService.ECR,
                InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS
            ],
            memoryLimitMiB: 2048,
            cpu: 1024,
            desiredCount: 2,
            healthCheckPath: "/fhir/metadata",
            environment: {
                "SPRING_APPLICATION_JSON": JSON.stringify(ontoserverSettings, null, 0),
                "LOG4J_FORMAT_MSG_NO_LOOKUPS": "true"
            }
        });
    }
}
