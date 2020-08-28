import AWS from 'aws-sdk';

const profileArg = process.argv.filter((x) => x.startsWith('-profile='))[0];
const profile = profileArg ? profileArg.split('=')[1] : 'default';
const stackArg = process.argv.filter((x) => x.startsWith('-stack='))[0];
const regionArg = process.argv.filter((x) => x.startsWith('-region='))[0];

export const stackName = stackArg.split('=')[1];

let region = 'eu-west-2';

if (regionArg) {
  region = regionArg.split('=')[1];
}

jest.setTimeout(50000); // jest needs to wait for page render on Lambda.

let creds;

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  creds = new AWS.Credentials({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  });
} else {
  creds = new AWS.SharedIniFileCredentials({
    profile,
    callback: (err) => {
      if (err) {
        console.error(`SharedIniFileCreds Error: ${err}`);
      }
    },
  });
}

AWS.config.credentials = creds;
AWS.config.region = region;
const cloudformation = new AWS.CloudFormation();
export const ssm = new AWS.SSM();

export const getStackResources = (stackName) =>
  cloudformation
    .describeStacks({ StackName: stackName })
    .promise()
    .catch((error) => {
      console.error(error);
    });

const apigateway = new AWS.APIGateway();
let apiKey = null;
export const getOptions = async () => {
  if (!apiKey) {
    const resources = await cloudformation.listStackResources({ StackName: stackName }).promise();
    const id = resources.StackResourceSummaries.find(
      r => r.ResourceType == 'AWS::ApiGateway::ApiKey'
    ).PhysicalResourceId;
    const params = {
      apiKey: id,
      includeValue: true
    };
    const data = await apigateway.getApiKey(params).promise();
    apiKey = data.value;
  }

  return {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    }
  }
}

