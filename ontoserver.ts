import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { OntoserverPipelineStack } from "./ontoserver-pipeline-stack";

const AWS_BUILD_ACCOUNT = "383856791668";
const AWS_BUILD_REGION = "ap-southeast-2";

const app = new cdk.App();

new OntoserverPipelineStack(app, "OntoserverPipelineStack", {
  // the pipeline can only be deployed to 'build' and this should only happen once
  env: {
    account: AWS_BUILD_ACCOUNT,
    region: AWS_BUILD_REGION,
  },
});
