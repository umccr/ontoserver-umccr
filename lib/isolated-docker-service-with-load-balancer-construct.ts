import { Construct } from "constructs";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { SslPolicy } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import {
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancedFargateService } from "aws-cdk-lib/aws-ecs-patterns";
import { Cluster, ContainerImage } from "aws-cdk-lib/aws-ecs";
import { Duration } from "aws-cdk-lib";

type IsolatedDockerServiceWithLoadBalancerProps = {
  hostPrefix: string;
  hostZoneName: string;
  hostCert: string;

  imageAsset: DockerImageAsset;
  environment: { [p: string]: string };
  awsPrivateLinksServices: InterfaceVpcEndpointAwsService[];
  memoryLimitMiB: number;
  cpu: number;
  desiredCount: number;
  healthCheckPath?: string;
};

export class IsolatedDockerServiceWithLoadBalancerConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: IsolatedDockerServiceWithLoadBalancerProps
  ) {
    super(scope, id);

    const certificate = Certificate.fromCertificateArn(
      this,
      "SslCert",
      props.hostCert
    );
    const domainZone = HostedZone.fromLookup(this, "Zone", {
      domainName: props.hostZoneName,
    });

    const vpc: Vpc = new Vpc(this, "Vpc", {
      // we mind as well span all azs available (our desired count defines the number of actual servers)
      maxAzs: 99,
      // our services work when wholly isolated - so no NAT needed
      natGateways: 0,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      // as far as I can tell there is no downside to always having these
      gatewayEndpoints: {
        S3: {
          service: GatewayVpcEndpointAwsService.S3,
        },
        Dynamo: {
          service: GatewayVpcEndpointAwsService.DYNAMODB,
        },
      },
    });

    let i = 0;
    for (const pl of props.awsPrivateLinksServices) {
      vpc.addInterfaceEndpoint(`Endpoint${i++}`, {
        service: pl,
        privateDnsEnabled: true,
        subnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      });
    }

    const cluster: Cluster = new Cluster(this, "Cluster", {
      vpc: vpc,
    });

    const loadBalancedFargateService =
      new ApplicationLoadBalancedFargateService(this, "Service", {
        cluster,
        certificate,
        sslPolicy: SslPolicy.RECOMMENDED,
        domainName: `${props.hostPrefix}.${props.hostZoneName}`,
        domainZone,
        redirectHTTP: true,
        memoryLimitMiB: props.memoryLimitMiB,
        cpu: props.cpu,
        desiredCount: props.desiredCount,
        publicLoadBalancer: true,
        taskImageOptions: {
          image: ContainerImage.fromDockerImageAsset(props.imageAsset),
          containerPort: 80,
          environment: props.environment,
        },
        healthCheckGracePeriod: Duration.minutes(5),
      });

    if (props.healthCheckPath) {
      loadBalancedFargateService.targetGroup.configureHealthCheck({
        path: props.healthCheckPath,
      });
    }
  }
}
