# Boombox API
An express server on a Lambda function behind the AWS's API Gateway that is used by the react app (in www).

## Development Setup

1. Checkout this repository to your machine:
 ```
 git clone https://github.com/ian97531/boombox.git
 ```
2. Open your terminal and cd the pipeline directory in the repo.
3. Install the [Serverless Framework](https://serverless.com/framework/docs/providers/aws/guide/quick-start/):
```
npm install -g serverless
```
4. Install the node dependencies:
```
npm install
```
5. Obtain an AWS access key and secret from Ian.  Use these credentials to set up your local Serverless credentials ([link](https://serverless.com/framework/docs/providers/aws/guide/credentials/)):
```
serverless config credentials --provider aws --key [ACCESS KEY] --secret [SECRET]
```
6. Set up an environement variable called AWS_STAGE with the value of the environment you want to deploy into ("prod", "test", "andrew", or "ian"). Put this in your ~/.profile, or other shell init file if you want:
```
AWS_STAGE=andrew
```
7. If this environment has never been deployed before, the DNS and CDN need to be set up to support it. Give it a few minutes to initialize the CDN before proceeding on:
```
yarn domain
```
8. Do a test deploy:
```
yarn deploy
```


## API Endpoints
Are documented [here](https://docs.google.com/document/d/1Sb2m7nD0JcTbVk0s5eioHk6-bStxEi7BzhB9uPgVNFw/edit).


## AWS Services (currently in use)
### [API Gateway](https://console.aws.amazon.com/apigateway/home?region=us-east-1#/apis)
**Description:** Amazon API Gateway is an AWS service that enables developers to create, publish, maintain, monitor, and secure APIs at any scale.

**How Boombox Uses This Service:** API Gateway forwards requests to our Lambda functions.

The boombox api exposes one endpoint:
* GET, POST, PUT, DELETE `/` - Returns "Hello World"

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Certificate Manager](https://console.aws.amazon.com/acm/home?region=us-east-1#/)
**Description:** AWS Certificate Manager handles the complexity of creating and managing public SSL/TLS certificates for your AWS based websites and applications.

**How Boombox Uses This Service:** We use the Certificate Manager to create and manage our boombox.bingo and &ast;.boombox.bingo SSL certificate.

### [CloudFormation](https://console.aws.amazon.com/cloudformation/home?region=us-east-1#/stacks?filter=active)
**Description:** AWS CloudFormation enables you to create and provision AWS infrastructure deployments predictably and repeatedly by capturing all of the configuration information in document that can be version controlled.

**How Boombox Uses This Service:** The Serverless Framework automatically generates a CloudFormation config file each time you run `sls deploy` or `yarn deploy`.  You generally don’t need to worry about this service, unless you’d like to delete and re-deploy the entirety of the boombox pipeline. The CloudFormation web console can be used to delete all pipeline AWS resources. Running  `sls deploy` will set everything up from scratch once again.

### [CloudWatch](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#)
**Description:** Amazon CloudWatch provides a reliable, scalable, and flexible monitoring solution that you can start using within minutes. You no longer need to set up, manage, and scale your own monitoring systems and infrastructure.

**How Boombox Uses This Service:** All of the boombox api Lambdas write there log files into Cloudwatch.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [IAM](https://console.aws.amazon.com/iam/home?region=us-east-1#/home)
**Description:** AWS Identity and Access Management (IAM) is a web service for securely controlling access to AWS services. With IAM, you can centrally manage users, security credentials such as access keys, and permissions that control which AWS resources users and applications can access.

**How Boombox Uses This Service:** Each service used by the boombox api is granted the minimum permissions it needs (to other resources and actions within those resources) in order to complete it’s task. 

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Lambda](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions)
**Description:** With AWS Lambda, you can run code without provisioning or managing servers. You pay only for the compute time you consume—there’s no charge when your code isn’t running. You can run code for virtually any type of application or backend service—all with zero administration. Just upload your code and Lambda takes care of everything required to run and scale your code with high availability. You can set up your code to automatically trigger from other AWS services or call it directly from any web or mobile app.

**How Boombox Uses This Service:** The logic of each API endpoint is executed by Lambda functions.

**This service is managed by the serverless.yml file. Do not alter this services configuration settings via the AWS console.**

### [Route53](https://console.aws.amazon.com/route53/home?region=us-east-1#)
**Description:** Amazon Route 53 is a highly available and scalable Domain Name System (DNS) web service. 

**How Boombox Uses This Service:** We use this service to handle the DNS services for the boombox.bingo and &ast;.boombox.bingo domains.
