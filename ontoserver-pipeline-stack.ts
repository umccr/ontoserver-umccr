import { pipelines, Stack, StackProps, Stage, StageProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OntoserverApplicationStage } from "./lib/ontoserver-stack";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

/**
 * Stack to hold the self mutating pipeline, and all the relevant settings for deployments
 */
export class OntoserverPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const codeStarArn = StringParameter.valueFromLookup(
      this,
      "codestar_github_arn"
    );

    const customRegSecret = Secret.fromSecretPartialArn(
      this,
      "QuayIoSecret",
      "arn:aws:secretsmanager:ap-southeast-2:383856791668:secret:QuayIoBot"
    );

    const pipeline = new pipelines.CodePipeline(this, "Pipeline", {
      // should normally be commented out - only use when debugging pipeline itself
      // selfMutation: false,
      dockerCredentials: [
        pipelines.DockerCredential.customRegistry("quay.io", customRegSecret),
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

    const ontologies = {
      HGNC_RELEASE: "2021-10-01",
      HPO_RELEASE: "2021-10-10",
      HANCESTRO_RELEASE: "2.5",
      MONDO_RELEASE: "2021-12-01",
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
          commands: [
            `curl -Ssf https://${hostNamePrefix}.dev.umccr.org/fhir/CodeSystem?_elements=name,url,version&_format=json`,
          ],
        }),
      ],
    });

    // pipeline.addStage(prodStage, {
    //  pre: [new pipelines.ManualApprovalStep("PromoteToProd")],
    // });
  }
}
