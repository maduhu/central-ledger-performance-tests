#!/usr/bin/env node

const Fs = require('fs');
const Shell = require('shelljs');
const PrepareRequestBuilder = require('../shared/PrepareRequestBuilder');
const PrepareRequestBodyTemplate = require('../shared/PrepareRequestBodyTemplate');
const ChargeRequestBuilder = require('./ChargeRequestBuilder');
const uuidV4 = require('uuid/v4');
const Unirest = require('unirest');

const commandLineArguments = process.argv.slice(2);

//break down args
const testName = commandLineArguments[0];
const rate = parseInt(commandLineArguments[1], 10);
const duration = parseInt(commandLineArguments[2], 10);
const hostNameUrl = commandLineArguments[3];
const runPath = commandLineArguments[4];
const adminUrl = `${hostNameUrl}:3001`;

console.log(hostNameUrl);
console.log(runPath);

let outputPath = `${runPath}/perf-test-scripts/${testName}/setup`;
Shell.rm('-rf', outputPath);
Shell.mkdir('-p', outputPath);
console.log(outputPath);

let templateFile = `perf-test-scripts/shared/prepare-request.json.template`
let requestTemplate = PrepareRequestBodyTemplate(Fs, templateFile);
let builder = PrepareRequestBuilder(Shell, Fs, Unirest, uuidV4, requestTemplate);
let chargeCreator = ChargeRequestBuilder(Unirest, adminUrl);


let setupComplete = (complete) => {
  if (!complete) {
    console.log("Failed to complete the necessary number of transactions");
    process.exitCode = 1;
  } else {
    console.log("Completed all necessary transactions");
    //Cooldown
    let coolDownSeconds = 5;
    let waitTill = new Date(new Date().getTime() + coolDownSeconds * 1000);
    while(waitTill > new Date()){}
    console.log("Cool down done.");
  }
};

let chargesCreated = (complete) => {
  console.log("charges created");
  if (complete)
    builder.build(rate * duration, hostNameUrl, outputPath, setupComplete);
  else {
    console.log("Charges did not complete successfully.");
  }
}

chargeCreator.build(chargesCreated);
