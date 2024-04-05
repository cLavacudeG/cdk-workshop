import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";

export class Purchase extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Create the SQS queues for payment and shipping
    const paymentQueue = new sqs.Queue(this, "PaymentQueue");
    const shippingQueue = new sqs.Queue(this, "ShippingQueue");

    // Define the lambda function for processing purchase

    const purchaseHandler = new lambda.Function(this, "PurchaseHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "purchase.purchaseHandler",
      environment: {
        PAYMENT_QUEUE_URL: paymentQueue.queueUrl,
        SHIPPING_QUEUE_URL: shippingQueue.queueUrl,
      },
    });

    // Grant permissions to access SQS to purchaseHandler
    paymentQueue.grantSendMessages(purchaseHandler);
    shippingQueue.grantSendMessages(purchaseHandler);

    // Define lambda function for payment
    const paymentHandler = new lambda.Function(this, "PaymentHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "purchase.paymentHandler",
    });

    paymentHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(paymentQueue),
    );

    // Grant permissions to access SQS to paymentHandler
    paymentQueue.grantConsumeMessages(paymentHandler);

    // Define lambda function for shipping
    const shippingHandler = new lambda.Function(this, "ShippingHandler", {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset("lambda"),
      handler: "purchase.shippingHandler",
    });

    shippingHandler.addEventSource(
      new lambdaEventSources.SqsEventSource(shippingQueue),
    );

    // Grant permissions to access SQS to shippingHandler
    shippingQueue.grantConsumeMessages(shippingHandler);

    // Create the apiGateway
    const api = new apigw.LambdaRestApi(this, "PurchaseApi", {
      handler: purchaseHandler,
      proxy: false,
    });

    const purchases = api.root.addResource("purchase");
    const purchaseItem = purchases.addResource("{itemId}");
    purchaseItem.addMethod("POST");
  }
}
