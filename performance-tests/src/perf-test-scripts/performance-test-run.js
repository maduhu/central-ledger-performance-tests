#!/usr/bin/env node
const Vegeta = require('./Vegeta');

const toBoolean = (str) => {
    return str && str.toLowerCase() == 'true'
}

const commandLineArguments = process.argv.slice(2);

const testName = commandLineArguments[0];
const hostNameUrl = commandLineArguments[1];
const runPath = commandLineArguments[2] + "/run";
const rate = parseInt(commandLineArguments[3], 10);
const duration = parseInt(commandLineArguments[4], 10);
const chargeCreation = toBoolean(commandLineArguments[5]);
const accountListenerCreation = toBoolean(commandLineArguments[6]);
const outputPath = runPath + "/perf-test-scripts/" + testName;
const workers = 10;

console.log([testName, rate, duration, hostNameUrl, runPath, outputPath, chargeCreation, accountListenerCreation].join(", "));

const buildSetupConfig = (chargeCreation, listenerCreation) => {
  const setupConfig = {
    accountCreation:true,
    accounts: [
      {
        name:"PerformanceTestDFSP1",
        password:"12345"
      },
      {
        name:"PerformanceTestDFSP2",
        password:"12345"
      }
    ]
  };

  if (chargeCreation) {
    setupConfig.chargeCreation = true;
    setupConfig.charges = [
      {name: "BasicPercentFee"}
    ];
    console.log("Charges added to setupConfig");
  } else {
    console.log("No charges will be created");
  }

  if (listenerCreation) {
    setupConfig.accounts.forEach((account) => {
      account.createListener = true;
    });
  }

  return setupConfig;
}

Vegeta().run(testName,
  hostNameUrl,
  runPath,
  outputPath,
  rate,
  duration,
  workers,
  buildSetupConfig(chargeCreation, accountListenerCreation));
