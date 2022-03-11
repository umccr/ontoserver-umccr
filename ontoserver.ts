import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { OntoserverPipelineStack } from "./ontoserver-pipeline-stack";

const app = new cdk.App();

new OntoserverPipelineStack(app, "OntoserverPipelineStack", {
  // the pipeline can only be deployed to 'build' and this should only happen once
  env: {
    account: "383856791668",
    region: "ap-southeast-2",
  },
});
