import { pipelines, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { OntoserverBuildStage } from "./ontoserver-build-stage";
import {
  AWS_DEV_ACCOUNT,
  AWS_DEV_REGION,
  AWS_PROD_ACCOUNT,
  AWS_PROD_REGION,
} from "./umccr-constants";
import {
  CURRENT_ONTOLOGIES,
  HOST_PREFIX,
  STACK_DESCRIPTION,
} from "./ontoserver-constants";
import { ComputeType, LinuxBuildImage } from "aws-cdk-lib/aws-codebuild";

/**
 * Stack to hold the self mutating pipeline, and all the relevant settings for deployments
 */
export class OntoserverPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.templateOptions.description = STACK_DESCRIPTION;

    // these are *build* parameters that we either want to re-use across lots of stacks, or are
    // 'sensitive' enough we don't want them checked into Git - but not sensitive enough to record as a Secret
    const codeStarArn = StringParameter.valueFromLookup(
      this,
      "codestar_github_arn"
    );
    const nctsClientId = StringParameter.valueFromLookup(
      this,
      "ncts_client_id"
    );
    const nctsClientSecret = StringParameter.valueFromLookup(
      this,
      "ncts_client_secret"
    );

    // this secret has username/password fields in it - and AWS pipeline itself knows how
    // to convert those into docker auth credentials
    // this credentials is needed to access the base Ontoserver image published by CSIRO/AEHRC
    const quayIoSecret = Secret.fromSecretNameV2(
      this,
      "QuayIoBotSecret",
      "QuayIoBot"
    );

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      // should normally be commented out - only use when debugging pipeline itself
      // selfMutation: false,
      // give permissions to get our custom/authenticated images from quay.io
      dockerCredentials: [
        pipelines.DockerCredential.customRegistry("quay.io", quayIoSecret),
      ],
      // turned on because our stack makes docker assets
      dockerEnabledForSynth: true,
      dockerEnabledForSelfMutation: true,
      synth: new pipelines.CodeBuildStep("Synth", {
        // Use a connection created using the AWS console to authenticate to GitHub
        // Other sources are available.
        input: pipelines.CodePipelineSource.connection(
          "umccr/ontoserver-umccr",
          "main",
          {
            connectionArn: codeStarArn,
          }
        ),
        buildEnvironment: {
          computeType: ComputeType.LARGE,
          //buildImage: LinuxBuildImage.AMAZON_LINUX_2_ARM_2,
          //privileged: true,
        },
        env: {},
        commands: [
          // need to think how to get pre-commit to run in CI given .git is not present
          // "pip install pre-commit",
          // "git init . && pre-commit run --all-files",
          "npm ci",
          // our cdk is configured to use ts-node - so we don't need any build step - just synth
          "npx cdk synth",
        ],
        rolePolicyStatements: [
          new PolicyStatement({
            actions: ["sts:AssumeRole"],
            resources: ["*"],
            conditions: {
              StringEquals: {
                "iam:ResourceTag/aws-cdk:bootstrap-role": "lookup",
              },
            },
          }),
        ],
      }),
      crossAccountKeys: true,
    });

    const ontologies = { ...CURRENT_ONTOLOGIES };

    // need to augment this to allow credentials for SNOMED loading
    ontologies["NCTS_CLIENT_ID"] = nctsClientId;
    ontologies["NCTS_CLIENT_SECRET"] = nctsClientSecret;

    const devStage = new OntoserverBuildStage(this, "Dev", {
      env: {
        account: AWS_DEV_ACCOUNT,
        region: AWS_DEV_REGION,
      },
      hostNamePrefix: HOST_PREFIX,
      ontologies: ontologies,
      desiredCount: 1,
      memoryLimitMiB: 2048,
    });

    const prodStage = new OntoserverBuildStage(this, "Prod", {
      env: {
        account: AWS_PROD_ACCOUNT,
        region: AWS_PROD_REGION,
      },
      hostNamePrefix: HOST_PREFIX,
      ontologies: ontologies,
      desiredCount: 2,
      memoryLimitMiB: 4096,
    });

    pipeline.addStage(devStage, {
      post: [
        new pipelines.ShellStep("Validate Endpoint", {
          envFromCfnOutputs: {
            FHIR_BASE_URL: devStage.deployFhirBaseUrlOutput,
          },
          commands: [
            "echo $FHIR_BASE_URL",
            "cd test/onto-cli",
            "npm ci",
            `npm run test -- "$FHIR_BASE_URL"`,
          ],
        }),
      ],
    });

    pipeline.addStage(prodStage, {
      pre: [new pipelines.ManualApprovalStep("PromoteToProd")],
    });
  }
}
