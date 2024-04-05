import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";

import { Construct } from "constructs";

export interface WebpageProps {
  // Entry point on the bucket
  websiteIndexDocument: string;
}

export class Webpage extends Construct {
  constructor(scope: Construct, id: string, props: WebpageProps) {
    super(scope, id);

    const webPageBucket = new s3.Bucket(this, "WebpageBucket", {
      accessControl: s3.BucketAccessControl.PRIVATE,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new s3deploy.BucketDeployment(this, "WepPageDeployment", {
      sources: [s3deploy.Source.asset("./webpage")],
      destinationBucket: webPageBucket,
      retainOnDelete: false,
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "webPageOriginAccessIdentity",
    );
    webPageBucket.grantRead(originAccessIdentity);

    const distribution = new cloudfront.Distribution(
      this,
      "webPageDistribution",
      {
        defaultRootObject: props.websiteIndexDocument,
        defaultBehavior: {
          origin: new cloudfrontOrigins.S3Origin(webPageBucket, {
            originAccessIdentity,
          }),
        },
        enableIpv6: false,
        priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      },
    );

    new cdk.CfnOutput(this, "webPageDistributionDomain", {
      value: distribution.distributionDomainName,
      description: "The domain name of the distribution",
      exportName: "webPageDistributionDomain",
    });
  }
}
