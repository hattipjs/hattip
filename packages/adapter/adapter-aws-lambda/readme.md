# `@hattip/adapter-aws-lambda`

Hattip adapter for [AWS Lambda](https://aws.amazon.com/lambda/).

## Usage

Assuming you have your Hattip handler defined in `handler.js`, create an entry file like the following and use [`@hattip/bundler-aws-lambda`](../../bundler/bundler-aws-lambda) or another tool to bundle it:

```js
import awsLambdaAdapter from "@hattip/adapter-aws-lambda";
// or import from "@hattip/adapter-aws-lambda/streaming" for streaming responses
import hattipHandler from "./handler.js";

export const handler = awsLambdaAdapter(hattipHandler);
```

If you want to use streaming responses, you should set the InvokeMode of your Lambda function to `RESPONSE_STREAM`.

## Serving static files

For simple use cases, you can use the `@hattip/static` package along with `@hattip/walk` to serve static files. Alternatively, you can use `@hattip/walk` at build time to generate a list of files to be served to reduce cold start times.

```js
import awsLambdaAdapter from "@hattip/adapter-aws-lambda/streaming";
import hattipHandler from "./handler.js";
import { walk } from "@hattip/walk";
import { createStaticMiddleware } from "@hattip/static";
import { createFileReader } from "@hattip/static/fs";

const root = new URL("./public", import.meta.url);
const files = walk(root);
const staticMiddleware = createStaticMiddleware(files, createFileReader(root), {
  gzip: true,
});

export const handler = awsLambdaAdapter((ctx) => {
  return staticMiddleware(ctx) || hattipHandler(ctx);
});
```

Note that in this setup, static files are served from the lambda function itself. For serious production use cases, you might want to consider using a CDN like CloudFront instead.

Another option is to use an edge runtime like [Cloudflare Workers](https://workers.cloudflare.com) or [Deno Deploy](https://deno.com/deploy) in front of your Lambda function. This will give you a multicloud setup similar to Vercel's and Netlify's respectively.

## Deploying

You can use the AWS Console, the AWS CLI, infrastructure-as-code tools like AWS CDK, Terraform, or Pulumi to deploy your Lambda function. A very simple example using the AWS SDK v3 is shown below.

Assuming your AWS CLI is configured correctly and you saved this file as `aws.js`, you can run `node aws.js deploy` to deploy the function and `node deploy.js destroy` to destroy it.

It bundles the app starting from `entry-aws.js` into `dist/aws-lambda.zip` and deploys it as a Lambda function and prints the function URL that you can use to invoke it. Make sure to change `InvokeMode` to `RESPONSE_STREAM` if you want to use streaming responses.

Note that this example is for demonstration purposes only. A full devops solution is beyond the scope of this readme.

```js
// @ts-check
import { IAM, NoSuchEntityException } from "@aws-sdk/client-iam";
import {
  Lambda,
  ResourceNotFoundException,
  ResourceConflictException,
  InvalidParameterValueException,
} from "@aws-sdk/client-lambda";
import {
  CloudWatchLogs,
  ResourceNotFoundException as LogsResourceNotFoundException,
  ResourceAlreadyExistsException as LogsResourceAlreadyExistsException,
} from "@aws-sdk/client-cloudwatch-logs";
import fs from "node:fs";
import { bundle } from "@hattip/bundler-aws-lambda";

const PREFIX = "hattip";
const LAMBDA_EXECUTION_ROLE_NAME = `${PREFIX}-lambda-execution-role`;
const FUNCTION_NAME = `${PREFIX}-function`;

async function deploy() {
  await bundle({
    input: "entry-aws.js",
    output: "dist/aws-lambda.zip",
    copy: ["public"],
    zip: true,
  });

  const iam = new IAM();

  let role = await iam
    .getRole({ RoleName: LAMBDA_EXECUTION_ROLE_NAME })
    .catch((error) => {
      if (error instanceof NoSuchEntityException) {
        return null;
      }
      throw error;
    });

  if (!role) {
    console.log("Creating Lambda Execution Role", LAMBDA_EXECUTION_ROLE_NAME);
    role = await iam.createRole({
      RoleName: LAMBDA_EXECUTION_ROLE_NAME,
      AssumeRolePolicyDocument: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "lambda.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });
  }

  await iam.attachRolePolicy({
    RoleName: LAMBDA_EXECUTION_ROLE_NAME,
    PolicyArn:
      "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
  });

  if (!role.Role) {
    throw new Error("Role not found");
  }

  const lambda = new Lambda();

  let fn = await lambda
    .getFunction({ FunctionName: FUNCTION_NAME })
    .catch((error) => {
      if (error instanceof ResourceNotFoundException) {
        return null;
      }
      throw error;
    });

  const zipFile = fs.readFileSync("dist/aws-lambda.zip");

  if (fn) {
    console.log("Updating Lambda Function", FUNCTION_NAME);
    await lambda.updateFunctionCode({
      FunctionName: FUNCTION_NAME,
      ZipFile: zipFile,
    });
  } else {
    console.log("Creating Lambda Function", FUNCTION_NAME);

    while (!fn) {
      fn = await lambda
        .createFunction({
          FunctionName: FUNCTION_NAME,
          Role: role.Role.Arn,
          Runtime: "nodejs20.x",
          Handler: "index.handler",
          Code: { ZipFile: zipFile },
          LoggingConfig: {},
        })
        .catch((error) => {
          if (
            error instanceof InvalidParameterValueException &&
            error.message ===
              "The role defined for the function cannot be assumed by Lambda."
          ) {
            // Ignore this error until the role propagates
            return null;
          }
          throw error;
        });
    }
  }

  /** @type import("@aws-sdk/client-lambda").CreateFunctionUrlConfigCommandOutput | import("@aws-sdk/client-lambda").GetFunctionUrlConfigCommandOutput | null */
  let url = await lambda
    .getFunctionUrlConfig({ FunctionName: FUNCTION_NAME })
    .catch((error) => {
      if (error instanceof ResourceNotFoundException) {
        return null;
      }
      throw error;
    });

  if (!url) {
    console.log("Creating Lambda Function URL", FUNCTION_NAME);
    url = await lambda.createFunctionUrlConfig({
      FunctionName: FUNCTION_NAME,
      InvokeMode: "BUFFERED",
      AuthType: "NONE",
    });
  }

  await lambda
    .addPermission({
      FunctionName: FUNCTION_NAME,
      Action: "lambda:InvokeFunctionUrl",
      Principal: "*",
      StatementId: PREFIX + "-permission-statement",
      FunctionUrlAuthType: "NONE",
    })
    .catch((error) => {
      if (error instanceof ResourceConflictException) {
        return null;
      }

      throw error;
    });

  const cloudwatch = new CloudWatchLogs();

  await cloudwatch
    .createLogGroup({
      logGroupName: `/aws/lambda/${FUNCTION_NAME}`,
    })
    .catch((error) => {
      if (error instanceof LogsResourceAlreadyExistsException) {
        return null;
      }

      throw error;
    });

  await cloudwatch.putRetentionPolicy({
    logGroupName: `/aws/lambda/${FUNCTION_NAME}`,
    retentionInDays: 7,
  });

  console.log(url.FunctionUrl);
}

async function destroy() {
  const lambda = new Lambda();

  const lambdaResult = await lambda
    .deleteFunction({ FunctionName: FUNCTION_NAME })
    .catch((error) => {
      if (error instanceof ResourceNotFoundException) {
        return null;
      }
      throw error;
    });

  if (lambdaResult) {
    console.log("Deleted Lambda Function", FUNCTION_NAME);
  }

  const cloudwatch = new CloudWatchLogs();
  const logResult = await cloudwatch
    .deleteLogGroup({
      logGroupName: `/aws/lambda/${FUNCTION_NAME}`,
    })
    .catch((error) => {
      if (error instanceof LogsResourceNotFoundException) {
        return null;
      }
      throw error;
    });

  if (logResult) {
    console.log("Deleted CloudWatch Log Group", `/aws/lambda/${FUNCTION_NAME}`);
  }

  const iam = new IAM();

  await iam
    .detachRolePolicy({
      RoleName: LAMBDA_EXECUTION_ROLE_NAME,
      PolicyArn:
        "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    })
    .catch((error) => {
      if (error instanceof NoSuchEntityException) {
        return null;
      }
      throw error;
    });

  const iamResult = await iam
    .deleteRole({ RoleName: LAMBDA_EXECUTION_ROLE_NAME })
    .catch((error) => {
      if (error instanceof NoSuchEntityException) {
        return null;
      }
      throw error;
    });

  if (iamResult) {
    console.log("Deleted Lambda Execution Role", LAMBDA_EXECUTION_ROLE_NAME);
  }
}

if (process.argv[2] === "destroy") {
  destroy().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else if (process.argv[2] === "deploy") {
  deploy().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  console.error("Must specify deploy or destroy");
  process.exit(1);
}
```
