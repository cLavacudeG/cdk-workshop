import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

// import * as apigw from "aws-cdk-lib/aws-apigateway";
// import { HitCounter } from "./hitcounter";
// import { TableViewer } from "cdk-dynamo-table-viewer";
// import { Webpage } from "./webpage";
// import { Purchase } from "./purchase";

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // AWS lambda resource
    // const hello = new lambda.Function(this, "HelloHandler-Cristian", {
    //   runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
    //   code: lambda.Code.fromAsset("lambda"), // Code loaded from lambda folder in root
    //   handler: "hello.handler", // File is hello function name is handler
    // });
    //
    // const helloWithCounter = new HitCounter(this, "HelloHitCounter-Cristian", {
    //   downstream: hello,
    // });
    //
    // // defines an API Gateway REST API resource backed by our "hello" function.
    // new apigw.LambdaRestApi(this, "Endpoint-Cristian", {
    //   handler: helloWithCounter.handler,
    // });
    //
    // new TableViewer(this, "ViewHitCounter-Cristian", {
    //   title: "Hits table",
    //   table: helloWithCounter.table,
    //   sortBy: "-hits",
    // });
    //
    // // Web page - Exercise 1
    // new Webpage(this, "Webpage-Cristian", {
    //   websiteIndexDocument: "index.html",
    // });
    //
    // // Purchase item - Exercise 2
    // new Purchase(this, "Purchase-Cristian");
    // // Step functions

    const myTable = new dynamodb.Table(this, "MyTable-Cristian", {
      partitionKey: { name: "RequestId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const submitLambda = new lambda.Function(this, "SubmitLambda-Cristian", {
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

    const submitJob = new tasks.LambdaInvoke(this, "SubmitJob-Cristian", {
      lambdaFunction: submitLambda,
      // Lambda's result is in the attribute `guid`
      resultPath: "$.guid",
    });

    const getStatus = new tasks.LambdaInvoke(this, "GetStatus-Cristian", {
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
