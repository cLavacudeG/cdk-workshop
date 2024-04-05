import { Template, Capture } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

import { HitCounter } from "../lib/hitcounter";

describe("DynamoDB", () => {
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

  test("DynamoDB Table Created With Encryption", () => {
    const stack = new cdk.Stack();

    // WHEN
    new HitCounter(stack, "HitCounterTestConstruct", {
      downstream: new lambda.Function(stack, "TestFunction", {
        runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
        code: lambda.Code.fromAsset("lambda"), // Code loaded from lambda folder in root
        handler: "hello.handler",
      }),
    });

    //THEN

    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::DynamoDB::Table", {
      SSESpecification: {
        SSEEnabled: true,
      },
    });
  });

  test("DynamoDB Table read capacity can be configured", () => {
    const stack = new cdk.Stack();

    expect(() => {
      new HitCounter(stack, "HitCounterTestConstruct", {
        downstream: new lambda.Function(stack, "TestFunction", {
          runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
          code: lambda.Code.fromAsset("lambda"), // Code loaded from lambda folder in root
          handler: "hello.handler",
        }),
        readCapacity: 3,
      });
    }).toThrowError("readCapacity must be between 5 and 20");
  });
});

describe("Lambda", () => {
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
});
