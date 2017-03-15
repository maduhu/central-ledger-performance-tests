#!/usr/bin/env node

const Fs = require('fs');
const Shell = require('shelljs');
const PerformanceTestRequestBuilder = require('./PerformanceTestRequestBuilder');
const PrepareRequestBodyTemplate = require('./PrepareRequestBodyTemplate');
const uuidV4 = require('uuid/v4');

const commandLineArguments = process.argv.slice(2);

//break down args
const testName = commandLineArguments[0];
const rate = parseInt(commandLineArguments[1], 10);
const duration = parseInt(commandLineArguments[2], 10);
const hostNameUrl = commandLineArguments[3];
const runPath = commandLineArguments[4];

let requestTemplate = PrepareRequestBodyTemplate(Fs, testName);
let builder = PerformanceTestRequestBuilder(Shell, Fs, uuidV4, requestTemplate);
let outputPath = `${runPath}/perf-test-scenarios/${testName}`;
builder.build(rate, duration, hostNameUrl, outputPath);
