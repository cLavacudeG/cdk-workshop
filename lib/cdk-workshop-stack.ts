import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { HitCounter } from "./hitcounter";
import { TableViewer } from "cdk-dynamo-table-viewer";
import { Webpage } from "./webpage";
import { Purchase } from "./purchase";
import { StateFunctions } from "./stateFunctions";

export class CdkWorkshopStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //AWS lambda resource
    const hello = new lambda.Function(this, "HelloHandler-Cristian", {
      runtime: lambda.Runtime.NODEJS_16_X, // Execution environment
      code: lambda.Code.fromAsset("lambda"), // Code loaded from lambda folder in root
      handler: "hello.handler", // File is hello function name is handler
    });

    const helloWithCounter = new HitCounter(this, "HelloHitCounter-Cristian", {
      downstream: hello,
    });

    // defines an API Gateway REST API resource backed by our "hello" function.
    new apigw.LambdaRestApi(this, "Endpoint-Cristian", {
      handler: helloWithCounter.handler,
    });

    new TableViewer(this, "ViewHitCounter-Cristian", {
      title: "Hits table",
      table: helloWithCounter.table,
      sortBy: "-hits",
    });

    // Web page - Exercise 1
    new Webpage(this, "Webpage-Cristian", {
      websiteIndexDocument: "index.html",
    });

    // Purchase item - Exercise 2
    new Purchase(this, "Purchase-Cristian");
    // Step functions
    new StateFunctions(this, "StateFunctions-Cristian");
  }
}
