const execSync = require('child_process').execSync;
const Fs = require('fs');
const Shell = require('shelljs');
const createAccount = require('./shared/AccountCreator');
const createPercentCharge = require('./shared/ChargeCreator');
const WebsocketBuilder = require('./shared/WebsocketBuilder');
const Websocket = require('ws');

const Vegeta = (config) => {
  const ledgerSetup = (testName, rate, duration, hostNameUrl, runPath, outputPath, setupConfig) => {
    const promises = [];
    if (setupConfig.accountCreation) {
      console.log("Creating accounts");
      setupConfig.accounts.forEach((account) => {
        const accountPromise = createAccount({hostNameUrl, name: account.name, password: account.password});
        promises.push(accountPromise);
        if (account.createListener) {
          console.log("Creating websocket listener for account" + account.name);
          const wsPromise = WebsocketBuilder(hostNameUrl).listen(account.name, account.password);
          promises.push(wsPromise);
        }
      });
    }
    if (setupConfig.chargeCreation) {
      console.log("Creating Charges");
      setupConfig.charges.forEach((charge) => {
        let adminUrlHostName = `${hostNameUrl}`;
        if (hostNameUrl.includes("3000"))
          adminUrlHostName = adminUrlHostName.replace("3000", "3001");
        else {
          adminUrlHostName = `${adminUrlHostName}:3001`;
        }
        const chargePromise = createPercentCharge(adminUrlHostName, charge.name);
        promises.push(chargePromise);
      });
    }
    return Promise.all(promises);
  };

  const setup = (testName, rate, duration, hostNameUrl, runPath, outputPath, setupConfig) => {
    const filePath = `${testName}/${testName}-setup.js`;

    return new Promise((resolve, reject) => {
      if (Fs.existsSync(filePath)) {
        console.log("Found setup file to run.");
        const testSetup = require(`./${testName}/${testName}-setup`);
        testSetup(rate, duration, hostNameUrl, outputPath, setupConfig)
        .then((values) => {
          resolve();
        })
        .catch((reason) => {
          console.log(reason);
          reject();
        });
      } else {
        console.log("No setup file to run at path: " + filePath);
        resolve(); //setup is not required.
      }
    });
  };

  const buildTargets = (testName, rate, duration, hostNameUrl, runPath, outputPath, setupConfig) => {
    const filePath = `${testName}/${testName}-exec.js`;
    if (Fs.existsSync(filePath)) {
      console.log("Found exec file to run.");
      const testExec = require(`./${testName}/${testName}-exec`);
      testExec(rate, duration, hostNameUrl, outputPath, setupConfig);
    } else {
      console.log("No exec file to run at path: " + filePath);
    }
  };

  const executePerformanceTest = (outputPath, workers, rate, duration) => {
    if (Fs.existsSync(`${outputPath}/targets.txt`))
      execSync(`vegeta attack -targets="${outputPath}/targets.txt" -workers=${workers} -rate ${rate} -duration ${duration}s > "${outputPath}/results.bin"`);
    else {
      console.warn(`Tests did not run. No targets.txt file was found on ${outputPath}/targets.txt.`);
    }
  };

  const buildReport = (testName, outputPath, rate, duration, type, setupConfig) => {
    if (!Fs.existsSync(`${outputPath}/results.bin`)) {
      console.warn(`No results to report on. ${outputPath}/results.bin does not exist.`)
      return;
    }
    const withCharges = setupConfig.chargeCreation ? `_withCharges${setupConfig.charges.length}` : "";
    const hasListener = setupConfig.accounts.find((el)=> el.createListener);
    const withListeners = hasListener ? `_withListeners` : "";


    const reportsPath = `${outputPath}/reports`;
    const reportName = `${reportsPath}/${testName}_rate${rate}_dur${duration}${withCharges}${withListeners}`;
    Shell.mkdir('-p', reportsPath);

    if (type.indexOf('json') !== -1)
      execSync(`vegeta report -inputs="${outputPath}/results.bin" -reporter=json > "${reportName}.json"`);
    if (type.indexOf('text') !== -1)
      execSync(`vegeta report -inputs="${outputPath}/results.bin" -reporter=text > "${reportName}.txt"`);
    if (type.indexOf('graph') !== -1)
      execSync(`vegeta report -inputs="${outputPath}/results.bin" -reporter=plot > "${reportName}.html"`);
  };

  const run = (testName, hostNameUrl, runPath, outputPath, rate, duration, workers, setupConfig) => {
    Shell.rm('-rf', outputPath);
    Shell.mkdir('-p', outputPath);

    const closeableResources = [];

    ledgerSetup(testName, rate, duration, hostNameUrl, runPath, outputPath, setupConfig)
      .then((resources) => {
        console.log("ledgerSetup Complete.");
        resources.forEach((res) => {
          if (res instanceof Websocket) {
            closeableResources.push(res);
          }
        });
        return setup(testName, rate, duration, hostNameUrl, runPath, outputPath, setupConfig);
      })
      .then((values) => {
        console.log("Setup complete");
        buildTargets(testName, rate, duration, hostNameUrl, runPath, outputPath, setupConfig);
        executePerformanceTest(outputPath, workers, rate, duration);
        buildReport(testName, outputPath, rate, duration, "json,text,graph", setupConfig);
        return Promise.resolve();
      })
      .then((values) => {
        closeableResources.forEach((resource) => {
          resource.close(1000, "Done with test closing websocket.");
        });
      })
      .catch((reason) => console.log(reason));
  };

  return {run};
}

module.exports = Vegeta;
