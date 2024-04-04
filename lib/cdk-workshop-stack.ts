import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AWS lambda resource
    const hello = new lambda.Function(this, "HelloHandler", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from lambda folder in root
      handler: "hello.handler", // File is hello function name is handler
    });
  }
}
