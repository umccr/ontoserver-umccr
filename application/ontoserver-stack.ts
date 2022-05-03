import { CfnOutput, Stack, StackProps, Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { join } from "path";
import { InterfaceVpcEndpointAwsService } from "aws-cdk-lib/aws-ec2";
import { IsolatedDockerServiceWithLoadBalancerConstruct } from "./lib/isolated-docker-service-with-load-balancer-construct";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { OntoserverSettings } from "./ontoserver-settings";
import { STACK_DESCRIPTION } from "../ontoserver-constants";

export class OntoserverStack extends Stack {
  public readonly assetUriOutput: CfnOutput;
  public readonly deployFhirBaseUrlOutput: CfnOutput;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & OntoserverSettings
  ) {
    super(scope, id, props);

    this.templateOptions.description = STACK_DESCRIPTION;

    // the ontoserver image is a relatively complex build - with sub-builders for fetching each terminology...
    // the files we downloaded from the internet are meant to be stable (hgnc quarterly release json etc)
    // - but there are no guarantees (i.e. if in the future this build is going to break - this is where it
    // will happen and I don't have any solution other than trace through the docker build)
    const dockerImageFolder = join(__dirname, "ontoserver-docker-image");

    const asset = new DockerImageAsset(this, "OntoserverImage", {
      directory: dockerImageFolder,
      // the build args feed into the docker build - and where they match our known ontologies
      // it triggers the load of that ontology
      buildArgs: props.ontologies,
    });

    const ontoserverSettings = {
      ontoserver: { security: { enabled: true, readOnly: { fhir: true } } },
      server: { port: 80 },
    };

    // we have some parameters that are shared amongst a lot of stacks - and rather than repeat in each repo,
    // we look them on synthesis from parameter store
    const hostedZoneName = StringParameter.valueFromLookup(
      this,
      "hosted_zone_name"
    );
    const certApse2Arn = StringParameter.valueFromLookup(
      this,
      "cert_apse2_arn"
    );

    const isolated = new IsolatedDockerServiceWithLoadBalancerConstruct(
      this,
      "Isolated",
      {
        hostPrefix: props.hostNamePrefix,
        hostZoneName: hostedZoneName,
        hostCert: certApse2Arn,
        imageAsset: asset,
        awsPrivateLinksServices: [
          // without these 3 service endpoints, Fargate itself will not work
          InterfaceVpcEndpointAwsService.ECR_DOCKER,
          InterfaceVpcEndpointAwsService.ECR,
          InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        ],
        memoryLimitMiB: props.memoryLimitMiB,
        cpu: 1024,
        desiredCount: props.desiredCount,
        healthCheckPath: "/fhir/metadata",
        environment: {
          SPRING_APPLICATION_JSON: JSON.stringify(ontoserverSettings, null, 0),
          LOG4J_FORMAT_MSG_NO_LOOKUPS: "true",
        },
      }
    );

    this.assetUriOutput = new CfnOutput(this, "AssetUriOutput", {
      value: asset.imageUri,
    });

    this.deployFhirBaseUrlOutput = new CfnOutput(
      this,
      "DeployFhirBaseUrlOutput",
      {
        value: `https://${props.hostNamePrefix}.${hostedZoneName}/fhir`,
      }
    );
  }
}
