# central-ledger-performance-tests
Performance tests for the Central Ledger

## Before starting
1. Make sure you have **aws-cli** and **jq** installed. 
  * Run `brew install awscli`
  * Run `aws configure` to set the AWS Access Key and AWS Access Secret, they should be stored in LastPass under **Gates Performance Test User SSH Key/Secret**
  * Run `brew install jq`

2. Locate `run.sh` the beginning of this file will show all the environment variables you have the option of setting.

* The only two environment variables currently required are:
  * PERF_EC2_KEY_PAIR_NAME
  * PERF_EC2_KEY_PAIR

  >These are meant to point to the keypair that will be able to access your ec2 instance and ssh in to copy the final results. (Eventually we hope to have these results placed in S3 so this is not necessary.)
  For now you can go to the console and go to EC2 and select Key Pairs under Network & Security. Create a pair (be sure to generate the key pair in the region you will be testing in) and then make PERF_ECS_KEY_PAIR_NAME whatever you specified and the PERF_EC2_KEY_PAIR should point to the .pem file.

* Verify that your docker daemon is running by checking "docker ps"
* You currently need to create a KeyPair to ssh into the boxes to pull the performance test results. After you make this new keypair you will need to change the accessibility of the file with "chmod 400 <pemfilelocation>"
* The stack won't work in newer regions (e.g. Ohio) because of the ServiceRole setup requirements that the stack does not follow.

## Usage
Execute `run.sh` to perform tests.
Execute `run.sh <STACK_NAME>` to override the stack_name default or environment variable.

Results of the test can be found at `run/<testName>/<timestampoftestrun>/reports`.

## Advanced
The `main()` method near the end of the `run.sh` file has a list of all main steps.

Feel free to comment out the `force_delete_stack` step if you want to experiment with your environment or run tests multiple times.

Once created the only step you need to re-run tests is `run_all_performance_tests`. (Note that some things like creation of fees there is currently no way to reset.)
