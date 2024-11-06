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

const PREFIX = "hattip-streaming";
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
			InvokeMode: "RESPONSE_STREAM",
			// InvokeMode: "BUFFERED",
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
