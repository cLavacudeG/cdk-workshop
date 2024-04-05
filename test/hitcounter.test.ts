import { Template, Capture } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { HitCounter } from "../lib/hitcounter";
import { Environment } from "aws-cdk-lib/aws-appconfig";

test("DynamoDB Table Created", () => {
  const stack = new cdk.Stack();

  // WHEN

  new HitCounter(stack, "HitCounterTestConstruct", {
    downstream: new lambda.Function(stack, "TestFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from lambda folder in root
      handler: "hello.handler",
    }),
  });

  // THEN

  const template = Template.fromStack(stack);
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
});

test("Lambda Has Environment Variables", () => {
  const stack = new cdk.Stack();

  // WHEN
  new HitCounter(stack, "HitCounterTestConstruct", {
    downstream: new lambda.Function(stack, "TestFunction", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from lambda folder in root
      handler: "hello.handler",
    }),
  });

  // THEN
  const template = Template.fromStack(stack);
  const envCapture = new Capture();

  template.hasResourceProperties("AWS::Lambda::Function", {
    Environment: envCapture,
  });

  expect(envCapture.asObject()).toEqual({
    Variables: {
      DOWNSTREAM_FUNCTION_NAME: {
        Ref: "TestFunction22AD90FC",
      },
      HITS_TABLE_NAME: {
        Ref: "HitCounterTestConstructHitsB2E940F2",
      },
    },
  });
});
