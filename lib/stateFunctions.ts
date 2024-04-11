import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

export class StateFunctions extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    const myTable = new dynamodb.Table(this, "LogTable", {
      partitionKey: { name: "RequestId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const submitLambda = new lambda.Function(this, "SubmitLambda", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "stateMachine.submitHandler",
      code: lambda.Code.fromAsset("lambda"),
    });

    const getStatusLambda = new lambda.Function(
      this,
      "GetStatusLambda-Cristian",
      {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: "stateMachine.stateHandler",
        code: lambda.Code.fromAsset("lambda"),
      },
    );

    const submitJob = new tasks.LambdaInvoke(this, "SubmitJob", {
      lambdaFunction: submitLambda,
      // Lambda's result is in the attribute `guid`
      resultPath: "$.guid",
    });

    const getStatus = new tasks.LambdaInvoke(this, "GetStatus", {
      lambdaFunction: getStatusLambda,
      // Pass just the field named "guid" into the Lambda, put the
      // Lambda's result in a field called "status" in the response
      inputPath: "$.guid",
      resultPath: "$.status",
    });

    const waitX = new sfn.Wait(this, "Wait X Seconds", {
      time: sfn.WaitTime.secondsPath("$.waitSeconds"),
    });

    const jobFailed = new sfn.Fail(this, "Job Failed", {
      cause: "AWS Batch Job Failed",
      error: "DescribeJob returned FAILED",
    });

    const finalStatus = new tasks.LambdaInvoke(this, "Get Final Job Status", {
      lambdaFunction: getStatusLambda,
      // Use "guid" field as input
      inputPath: "$.guid",
      resultPath: "$.status.Payload",
    });

    const putItemInTable = new tasks.DynamoPutItem(this, "PutItemInTable", {
      table: myTable,
      item: {
        RequestId: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.guid.SdkResponseMetadata.RequestId"),
        ),
        TraceId: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt(
            "$.guid.SdkHttpMetadata.HttpHeaders.X-Amzn-Trace-Id",
          ),
        ),
        Status: tasks.DynamoAttributeValue.fromString(
          sfn.JsonPath.stringAt("$.status.Payload"),
        ),
      },
      inputPath: "$",
      resultPath: "$.dynamodb",
    });

    putItemInTable.next(finalStatus);

    const definition = submitJob
      .next(waitX)
      .next(getStatus)
      .next(
        new sfn.Choice(this, "Job Complete?")
          // Look at the "status" field
          .when(
            sfn.Condition.stringEquals("$.status.Payload", "FAILED"),
            jobFailed,
          )
          .when(
            sfn.Condition.stringEquals("$.status.Payload", "SUCCEEDED"),
            putItemInTable,
          )
          .otherwise(waitX),
      );

    new sfn.StateMachine(this, "StateMachine", {
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      timeout: cdk.Duration.minutes(1),
      comment: "a super cool state machine",
    });
  }
}
