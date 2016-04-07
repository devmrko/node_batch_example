
var schedule = require('node-schedule');
var async = require('async');
var db;

//var rule = '*/5 * * * * *';// every 5 seconds
var rule = '*/1 * * * *';// every 1 min
/*
var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];// day of week(mon - sun)
rule.hour = 6;
rule.minute = 30;
*/

function processBatch() {
    var self = this;
    db = require('monk')('');
    self.doBatch();
}

processBatch.prototype.doBatch = function () {
    console.log("run doBatch");
    var self = this;
    async.parallel([
        // get user list
        function (callback) {
            console.log("run 1st paralled process - get user");
            callback(null, ['jmko79', 'jmko09']);
        }
    ], function (err, results) {
        async.eachSeries(results[0], self.dataHandling, function () {
            console.log("end of series processes");
        });
    });
}

processBatch.prototype.dataHandling = function (userId, callback) {
    console.log("run dataHandling, user id is " + userId);
    async.waterfall([
        function (callback) {
            console.log("1st waterfall async process");
            var retrieveParam = 'first process';
            var retrieveParam2 = 'second process';
            callback(null, retrieveParam, retrieveParam2);
        },
        function (retrieveParam, retrieveParam2, callback) {
            console.log("2nd waterfall async process");
            console.log("parameters check: " + retrieveParam + ", " + retrieveParam2);
            var result = 'something';
            callback(null, result);
            // var chklstDb = db.get('checklist');
            // chklstDb.find({}, { sort: { done_bool: 1, due_date: -1 }, limit: 3 },
            //     function (err, result) {
            //         callback(null, result);
            //     }
            //     );

        }], function (err, results) {
            console.log("end of waterfall process, result is " + results);
            callback();
        });
}

var j = schedule.scheduleJob(rule, function () {
    console.log("run scheduler");
    new processBatch();
});

