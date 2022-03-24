import {
  pipelines,
  Stack,
  StackProps,
  Stage,
  StageProps,
  Token,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { OntoserverApplicationStage } from "./lib/ontoserver-stack";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

/**
 * Stack to hold the self mutating pipeline, and all the relevant settings for deployments
 */
export class OntoserverPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

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
        env: {},
        commands: [
          // need to think how to get pre-commit to run in CI given .git is not present
          // "pip install pre-commit",
          // "git init . && pre-commit run --all-files",
          // "pip install -U ggshield",
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

    const ontologies = {
      HGNC_RELEASE: "2021-10-01",
      HPO_RELEASE: "2021-10-10",
      HANCESTRO_RELEASE: "2.5",
      MONDO_RELEASE: "2021-12-01",
      SNOMED_RELEASE: "20211231",
      NCTS_CLIENT_ID: nctsClientId,
      NCTS_CLIENT_SECRET: nctsClientSecret,
    };
    const hostNamePrefix = "onto";

    const devStage = new OntoserverApplicationStage(this, "Dev", {
      env: {
        account: "843407916570",
        region: "ap-southeast-2",
      },
      hostNamePrefix: hostNamePrefix,
      ontologies: ontologies,
      desiredCount: 1,
      memoryLimitMiB: 2048,
    });

    const prodStage = new OntoserverApplicationStage(this, "Prod", {
      env: {
        account: "472057503814",
        region: "ap-southeast-2",
      },
      hostNamePrefix: hostNamePrefix,
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
