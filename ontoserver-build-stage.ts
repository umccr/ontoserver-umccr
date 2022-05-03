import { CfnOutput, Stage, StageProps, Tags } from "aws-cdk-lib";
import { Construct } from "constructs";
import { OntoserverSettings } from "./application/ontoserver-settings";
import { OntoserverStack } from "./application/ontoserver-stack";
import { TAG_STACK_VALUE } from "./ontoserver-constants";

export class OntoserverBuildStage extends Stage {
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

    Tags.of(stack).add("Stack", TAG_STACK_VALUE);

    this.assetUriOutput = stack.assetUriOutput;
    this.deployFhirBaseUrlOutput = stack.deployFhirBaseUrlOutput;
  }
}
