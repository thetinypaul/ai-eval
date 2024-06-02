import * as cdk from 'aws-cdk-lib';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as stepfunctions from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as outputs from 'aws-cdk-lib/core';

class AIEvaluationApplicationStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the WAF
    const webAcl = new wafv2.CfnWebACL(this, 'WebAcl', {
      defaultAction: {
        allow: {}
      },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'MetricForWebACLCDK',
        sampledRequestsEnabled: true,
      },
      name: 'WebAcl',
      rules: [{
        name: 'CRSRule',
        priority: 0,
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesCommonRuleSet',
            vendorName: 'AWS'
          }
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'MetricForWebACLCDK-CRS',
          sampledRequestsEnabled: true,
        },
        overrideAction: {
          none: {}
        },
      }]
    });

    // API Gateway REST API
    const api = new apigateway.RestApi(this, 'EvaluationAPI', {
      restApiName: 'evaluate',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const deployment = new apigateway.Deployment(this, 'Deployment', {
      api: api,
    });

    const devStage = new apigateway.Stage(this, 'DevStage', {
      deployment: deployment,
      stageName: 'dev',
    });

    // WAF Association
    const cfnWebACLAssociation = new wafv2.CfnWebACLAssociation(this, 'MyCDKWebACLAssociation', {
      resourceArn: devStage.stageArn,
      webAclArn: webAcl.attrArn,
    });

    // API Routes

    const evaluateResource = api.root.addResource('evaluate');
    const evaluateMethod = evaluateResource.addMethod('POST', new apigateway.AwsIntegration({ service: 'sqs', path: 'evaluate' }), {
      methodResponses: [{ statusCode: '200' }],
    });

    // SNS Topic
    const evaluationTopic = new sns.Topic(this, 'EvaluationTopic', {
      topicName: 'evaluation-topic',
    });


    // Step Functions State Machine
    const evaluationLambda = new lambda.Function(this, 'EvaluationLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('lambdas/evaluate'),
      handler: 'index.handler',
    });

    const publishMessageTask = new tasks.LambdaInvoke(this, 'PublishMessageTask', {
      lambdaFunction: evaluationLambda,
      outputPath: '$.Payload',
    });

    const snsTask = new tasks.SnsPublish(this, 'SnsPublishTask', {
      topic: evaluationTopic,
      message: stepfunctions.TaskInput.fromJsonPathAt('$.'),
      resultPath: '$.Payload'
    })

    const stateMachine = new stepfunctions.StateMachine(this, 'EvaluationStateMachine', {
      definition: publishMessageTask.next(snsTask),
    });

    new outputs.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'State Machine ARN'
    })

    // SQS Queue
    const evaluationQueue = new sqs.Queue(this, 'EvaluationQueue', {
      queueName: 'evaluation-queue',
    });

    // Invoke Lambda
    const invokeStateMachineLambda = new lambda.Function(this, 'InvokeStateMachineLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      code: lambda.Code.fromAsset('lambdas/invokeStateMachine'),
      handler: 'index.handler',
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn
      }
    });

    invokeStateMachineLambda.addEventSource(new SqsEventSource(evaluationQueue));

    // DynamoDB Table
    const evaluationTable = new dynamodb.Table(this, 'EvaluationTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    // S3 Bucket
    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      bucketName: 'artifact-bucket',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}

const app = new cdk.App();
new AIEvaluationApplicationStack(app, 'AIEvaluationApplicationStack');