import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class AiEvalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // an API Gateway RESTful API 
    new cdk.aws_apigateway.RestApi(this, 'ai-eval-api', {
      restApiName: 'ai-eval-api',
      description: 'AI Evaluation API',
    });

    // an SQS queue that receives events from the API endpoints
    new cdk.aws_sqs.Queue(this, 'ai-eval-queue', {
      queueName: 'ai-eval-queue',
    });


  }
}
