import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { OntoserverPipelineStack } from "./ontoserver-pipeline-stack";
import { TAG_STACK_VALUE } from "./ontoserver-constants";
import { AWS_BUILD_ACCOUNT, AWS_BUILD_REGION } from "./umccr-constants";

const app = new cdk.App();

new OntoserverPipelineStack(app, "OntoserverPipelineStack", {
  // the pipeline can only be deployed to 'build' and this should only happen once
  env: {
    account: AWS_BUILD_ACCOUNT,
    region: AWS_BUILD_REGION,
  },
  tags: {
    Stack: TAG_STACK_VALUE,
  },
});
