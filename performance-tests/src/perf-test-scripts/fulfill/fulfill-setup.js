#!/usr/bin/env node

const Fs = require('fs');
const Shell = require('shelljs');
const PrepareRequestBuilder = require('./PrepareRequestBuilder');
const PrepareRequestBodyTemplate = require('./PrepareRequestBodyTemplate');
const uuidV4 = require('uuid/v4');
const Unirest = require('unirest');

const commandLineArguments = process.argv.slice(2);

//break down args
const testName = commandLineArguments[0];
const rate = parseInt(commandLineArguments[1], 10);
const duration = parseInt(commandLineArguments[2], 10);
const hostNameUrl = commandLineArguments[3];
const runPath = commandLineArguments[4];

console.log(hostNameUrl);
console.log(runPath);

let outputPath = `${runPath}/perf-test-scripts/${testName}/setup`;
Shell.rm('-rf', outputPath);
Shell.mkdir('-p', outputPath);
console.log(outputPath);

let templateFile = `perf-test-scripts/${testName}/prepare-request.json.template`
let requestTemplate = PrepareRequestBodyTemplate(Fs, templateFile);
let builder = PrepareRequestBuilder(Shell, Fs, Unirest, uuidV4, requestTemplate);


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

builder.build(rate * duration, hostNameUrl, outputPath, setupComplete);
