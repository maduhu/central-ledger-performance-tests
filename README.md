# central-ledger-performance-tests
Performance tests for the Central Ledger

## Before starting
Define all environment variables cited in the header of `run.sh`. The majority of variables have
sensible defaults, but some require the user specify their own value.

* Verify that your docker daemon is running by checking "docker ps"
* You currently need to create a KeyPair to ssh into the boxes to pull the performance test results. After you make this new keypair you will need to change the accessibility of the file with "chmod 400 <pemfilelocation>"
* The stack won't work in newer regions (Ohio) because of the ServiceRole setup requirements that the stack does not follow.

## Usage
Execute `run.sh` to perform tests.

After a run, results of the test can be found at `run/performance-tests-metrics.json`.
