import { CfnOutput, Stack, StackProps, Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import { join } from "path";
import { InterfaceVpcEndpointAwsService } from "aws-cdk-lib/aws-ec2";
import { IsolatedDockerServiceWithLoadBalancerConstruct } from "./isolated-docker-service-with-load-balancer-construct";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export interface OntoserverSettings {
  /**
   * The host name prefix (name before first dot in hostname)
   */
  readonly hostNamePrefix: string;

  /**
   * A dictionary of ontologies and their versions. Ontology names
   * must match those understood by the Onto dockerfile.
   * e.g.
   *  { HGNC_RELEASE: "2021-10-01",
   *    HPO_RELEASE: "2021-10-10" }
   */
  readonly ontologies: { [id: string]: string };

  /**
   * The number of services to have run concurrently. Needs to be greater than 1
   * in order to get cross availability zone
   */
  readonly desiredCount: number;

  /**
   * The memory assigned to each service
   */
  readonly memoryLimitMiB: number;
}

export class OntoserverApplicationStage extends Stage {
  // the output of our built ontoserver asset Uri
  public readonly assetUriOutput: CfnOutput;

  // the output of what we believe will be the deployed FHIR base url (e.g. https://onto.prod.umccr.org/fhir)
  public readonly deployFhirBaseUrlOutput: CfnOutput;

  constructor(
    scope: Construct,
    id: string,
    props: StageProps & OntoserverSettings
  ) {
    super(scope, id, props);

    const stack = new OntoserverStack(this, "Ontoserver", props);

    this.assetUriOutput = stack.assetUriOutput;
    this.deployFhirBaseUrlOutput = stack.deployFhirBaseUrlOutput;
  }
}

export class OntoserverStack extends Stack {
  public readonly assetUriOutput: CfnOutput;
  public readonly deployFhirBaseUrlOutput: CfnOutput;

  constructor(
    scope: Construct,
    id: string,
    props: StackProps & OntoserverSettings
  ) {
    super(scope, id, props);

    // the ontoserver image is a relatively complex build - with sub-builders for fetching each terminology
    // files downloaded from the internet are meant to be stable (hgnc quarterly release json etc)
    // - but there are no guarantees
    const dockerImageFolder = join(__dirname, "..", "ontoserver-image");

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
