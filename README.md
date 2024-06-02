# AI 2030 AI Evaluation Engine

This application is designed to evaluate AI model artifacts against a set of metrics aligned with the six pillars of responsible AI: sustainability, transparency, privacy, data management, accountability, and fairness. It allows users to invoke evaluations, calculate metric scores, and generate reports summarizing the evaluation results.

## Core Requirements

- AWS account with appropriate permissions
- AWS CDK installed and configured
- Node.js and npm installed

## Deployment Process

1. Clone the repository:

```
git clone https://github.com/your-repo/ai-evaluation-app.git
cd ai-evaluation-app
```

2. Install dependencies:

```
npm install
```

3. Bootstrap the CDK environment (if not done before):
```
cdk bootstrap aws://ACCOUNT-NUMBER/REGION
```

Replace `ACCOUNT-NUMBER` and `REGION` with your AWS account number and desired region.

4. Deploy the CDK application:

cdk deploy

This will deploy the necessary resources, including the API Gateway, Lambda functions, Step Functions state machine, and other components.

5. After the deployment is complete, retrieve the Step Functions state machine ARN from the CloudFormation stack outputs:

aws cloudformation describe-stacks --stack-name <YOUR_STACK_NAME> --query 'Stacks[0].Outputs[?OutputKey==StateMachineArn].OutputValue' --output text

Replace `<YOUR_STACK_NAME>` with the name of your CDK stack.

6. Update the `InvokeStateMachineLambda` function's environment variable with the retrieved state machine ARN:
aws lambda update-function-configuration --function-name <INVOKE_LAMBDA_NAME> --environment "Variables={STATE_MACHINE_ARN=<STATE_MACHINE_ARN>}"

Replace `<INVOKE_LAMBDA_NAME>` with the name of your `InvokeStateMachineLambda` function, and `<STATE_MACHINE_ARN>` with the ARN retrieved in the previous step.

7. The AI Evaluation Application is now deployed and ready to use. You can invoke the `/evaluate` endpoint of the API Gateway with the S3 URI of the model artifact you want to evaluate.

Please note that you may need to adjust the instructions based on your specific environment and requirements. Additionally, ensure that you have the necessary permissions and configurations set up for your AWS account and CDK environment.
