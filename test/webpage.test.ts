import { Webpage, WebpageProps } from "../lib/webpage";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { Capture, Template } from "aws-cdk-lib/assertions";

describe("Webpage Construct", () => {
  let stack: cdk.Stack;

  beforeEach(() => {
    const app = new cdk.App();
    stack = new cdk.Stack(app, "TestStack");
  });

  test("Creates a S3 bucket and CloudFront distribution with the specified properties", () => {
    const webpageProps: WebpageProps = {
      websiteIndexDocument: "index.html",
    };

    // When
    new Webpage(stack, "WebpageTestConstruct", webpageProps);

    // Assert
    // Check if an S3 bucket is created with the specified properties
    const template = Template.fromStack(stack);

    template.resourceCountIs("AWS::S3::Bucket", 1);
    template.hasResourceProperties("AWS::S3::Bucket", {
      AccessControl: "Private",
    });

    // Check if a CloudFront distribution is created with the specified properties
    template.resourceCountIs("AWS::CloudFront::Distribution", 1);

    const distributionOriginCapture = new Capture();

    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: {
        DefaultRootObject: webpageProps.websiteIndexDocument,
        Origins: [
          {
            S3OriginConfig: {
              OriginAccessIdentity: distributionOriginCapture,
            },
          },
        ],
        IPV6Enabled: false,
        PriceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      },
    });

    expect(distributionOriginCapture.asObject()).toEqual({
      "Fn::Join": [
        "",
        [
          "origin-access-identity/cloudfront/",
          {
            Ref: "WebpageTestConstructwebPageOriginAccessIdentity576B3173",
          },
        ],
      ],
    });
  });

  test("Webpage Grants Read Access to CloudFront Origin Access Identity", () => {
    // WHEN
    const webpageProps: WebpageProps = {
      websiteIndexDocument: "index.html",
    };

    // When
    new Webpage(stack, "WebpageTestConstruct", webpageProps);

    // THEN
    const template = Template.fromStack(stack);

    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: [
          {
            Action: ["s3:GetObject*", "s3:GetBucket*", "s3:List*"],
            Effect: "Allow",
            Principal: {
              CanonicalUser: {
                "Fn::GetAtt": [
                  "WebpageTestConstructwebPageOriginAccessIdentity576B3173",
                  "S3CanonicalUserId",
                ],
              },
            },
            Resource: [
              {
                "Fn::GetAtt": [
                  "WebpageTestConstructWebpageBucketE598912D",
                  "Arn",
                ],
              },
              {
                "Fn::Join": [
                  "",
                  [
                    {
                      "Fn::GetAtt": [
                        "WebpageTestConstructWebpageBucketE598912D",
                        "Arn",
                      ],
                    },
                    "/*",
                  ],
                ],
              },
            ],
          },
          {
            Action: "s3:GetObject",
            Effect: "Allow",
            Principal: {
              CanonicalUser: {
                "Fn::GetAtt": [
                  "WebpageTestConstructwebPageOriginAccessIdentity576B3173",
                  "S3CanonicalUserId",
                ],
              },
            },
            Resource: {
              "Fn::Join": [
                "",
                [
                  {
                    "Fn::GetAtt": [
                      "WebpageTestConstructWebpageBucketE598912D",
                      "Arn",
                    ],
                  },
                  "/*",
                ],
              ],
            },
          },
        ],
      },
    });
  });
});
