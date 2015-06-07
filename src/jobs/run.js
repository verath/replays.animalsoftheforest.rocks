// node run.js jobName

let jobName = process.argv[2];
require(__dirname + "/" + jobName + ".js");
