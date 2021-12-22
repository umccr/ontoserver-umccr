import {Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {DockerImageAsset} from 'aws-cdk-lib/aws-ecr-assets';
import {HostedZone} from 'aws-cdk-lib/aws-route53';
import {Certificate} from 'aws-cdk-lib/aws-certificatemanager';
import {SslPolicy} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as path from "path";
import {GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService, SubnetType, Vpc} from "aws-cdk-lib/aws-ec2";
import {ApplicationLoadBalancedFargateService} from "aws-cdk-lib/aws-ecs-patterns";
import {Cluster, ContainerImage} from "aws-cdk-lib/aws-ecs";
import {StringParameter} from "aws-cdk-lib/aws-ssm";

type IsolatedDockerServiceWithLoadBalancerProps = {

    hostPrefix: string;
    imageAsset: DockerImageAsset;
    environment: {[p: string]: string};
    awsPrivateLinksServices: InterfaceVpcEndpointAwsService[];
    memoryLimitMiB: number;
    cpu: number;
    desiredCount: number;
    healthCheckPath?: string;
}

export class IsolatedDockerServiceWithLoadBalancerConstruct extends Construct {
    constructor(scope: Construct, id: string, props: IsolatedDockerServiceWithLoadBalancerProps) {
        super(scope, id);

        // we have some parameters that are shared amongst a lot of stacks - and rather than repeat in each repo,
        // we look them on synthesis from parameter store
        const certApse2Arn = StringParameter.valueFromLookup(this, "cert_apse2_arn");
        const hostedZoneId = StringParameter.valueFromLookup(this, "hosted_zone_id");
        const hostedZoneName = StringParameter.valueFromLookup(this, "hosted_zone_name");

        const certificate = Certificate.fromCertificateArn(this, "SslCert", certApse2Arn);
        const domainZone = HostedZone.fromLookup(this, 'Zone', {
            domainName: hostedZoneName
        });

        const vpc: Vpc = new Vpc(this, 'Vpc', {
            maxAzs: 3,
            natGateways: 0,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            gatewayEndpoints: {
                S3: {
                    service: GatewayVpcEndpointAwsService.S3,
                },
                Dynamo: {
                    service: GatewayVpcEndpointAwsService.DYNAMODB,
                }
            },
        });

        let i = 0;
        for(const pl of props.awsPrivateLinksServices) {
            vpc.addInterfaceEndpoint(`Endpoint${i++}`, {
                service: pl,
                privateDnsEnabled: true,
                subnets: {subnetType: SubnetType.PRIVATE_ISOLATED}
            });

        }

        const cluster: Cluster = new Cluster(this, 'Cluster', {
            vpc: vpc
        });

        const loadBalancedFargateService = new ApplicationLoadBalancedFargateService(this, 'Service', {
            cluster,
            certificate,
            sslPolicy: SslPolicy.RECOMMENDED,
            domainName: `${props.hostPrefix}.${hostedZoneName}`,
            domainZone,
            redirectHTTP: true,
            memoryLimitMiB: props.memoryLimitMiB,
            cpu: props.cpu,
            desiredCount: props.desiredCount,
            publicLoadBalancer: true,
            taskImageOptions: {
                image: ContainerImage.fromDockerImageAsset(props.imageAsset),
                containerPort: 80,
                environment: props.environment
            },
        });

        if (props.healthCheckPath) {
            loadBalancedFargateService.targetGroup.configureHealthCheck({
                path: props.healthCheckPath
            })
        }
    }
}
