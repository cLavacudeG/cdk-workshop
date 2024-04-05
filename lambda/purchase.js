const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");

exports.purchaseHandler = async (event) => {
  console.log("request:", JSON.stringify(event, undefined, 2));

  const sqs = new SQSClient({});

  const item = JSON.parse(event.body);

  const paymentQueueUrl = process.env.PAYMENT_QUEUE_URL;
  const shippingQueueUrl = process.env.SHIPPING_QUEUE_URL;

  try {
    const paymentCommand = await generateSendCommand(paymentQueueUrl, item);
    const shippingCommand = await generateSendCommand(shippingQueueUrl, item);

    await Promise.all([sqs.send(paymentCommand), sqs.send(shippingCommand)]);

    return { statusCode: 200, body: "Purchase process initiated successfully" };
  } catch (error) {
    return { statusCode: 500, body: error.message };
  }
};

async function generateSendCommand(queueUrl, item) {
  const command = new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(item),
  });
  return command;
}

exports.paymentHandler = async (event) => {
  console.log("request:", JSON.stringify(event, undefined, 2));
  console.log("Processing item from Payment Queue:", event);
  // Add your processing logic here
};

exports.shippingHandler = async (event) => {
  console.log("request:", JSON.stringify(event, undefined, 2));
  console.log("Processing item from Shipping Queue:", event);
  // Add your processing logic here
};
