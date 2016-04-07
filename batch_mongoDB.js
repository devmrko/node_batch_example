
var schedule = require('node-schedule');
var async = require('async');
var nodemailer = require('nodemailer');
var db;

//var rule = '*/5 * * * * *';// every 5 seconds
// var rule = '*/1 * * * *';// every 1 min

var rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [0, new schedule.Range(0, 6)];// day of week(mon - sun)
rule.hour = 6;
rule.minute = 30;

function zeroPad(num, places) {
    var zero = places - num.toString().length + 1;
    return Array(+(zero > 0 && zero)).join("0") + num;
}

function convertDateFormat(date) {
    return zeroPad(date.getMonth() + 1, 2) + '/' + zeroPad(date.getDate(), 2) + '/' + date.getFullYear()
}

function processBatch() {
    var self = this;
    db = require('monk')('');
    self.doBatch();
}

processBatch.prototype.doBatch = function () {
    // console.log("run doBatch");
    var self = this;
    async.parallel([
        // get user list
        function (callback) {
            // console.log("run 1st paralled process - get user");
            callback(null, ['jmko79', 'jmko09']);
        }
    ], function (err, results) {
        async.eachSeries(results[0], self.dataHandling, function (contents) {

            var transporter = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'devmrko@gmail.com',
                    pass: ''
                }
            });

            var mailOptions = {
                from: 'Joungmin Ko <devmrko@gmail.com>',
                to: 'jmko79@gmail.com',
                subject: 'Checklist today',
                html: contents
            };

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Message Sent: ' + info.response);
                }
            });

            // console.log("end of series processes");
        });
    });
}

processBatch.prototype.dataHandling = function (userId, callback) {
    // console.log("run dataHandling, user id is " + userId);

    var resultArry = [];
    var rowObj = {};

    async.waterfall([
        function (callback) {
            // console.log("1st waterfall async process");
            var retrieveParam = 'first process';
            var retrieveParam2 = 'second process';
            callback(null, retrieveParam, retrieveParam2);
        },
        function (retrieveParam, retrieveParam2, callback) {
            // console.log("2nd waterfall async process");
            // console.log("parameters check: " + retrieveParam + ", " + retrieveParam2);
            var chklstDb = db.get('checklist');
            chklstDb.find({ notice_bool: 'true' }, { sort: { done_bool: 1, due_date: -1 }, limit: 3 },
                function (err, result) {
                    callback(null, result);
                }
                );

        }, function (retrieveResult, callback) {
            // console.log("3rd waterfall async process");
            var chklstDtlDb = db.get('checklistDtl');

            async.eachSeries(retrieveResult,
                function (retrieveResult, callback) {
                    rowObj = {};
                    rowObj.parents = retrieveResult;
                    chklstDtlDb.find({ chklst_id: retrieveResult._id, done_bool: false, due_date: convertDateFormat(new Date()) }, {},
                        function (err, result) {
                            rowObj.child = result;
                            resultArry[resultArry.length] = rowObj;
                            callback(null, result);
                        }
                        );
                }, function () {
                    // console.log("end of series processes");
                    callback(null, resultArry);
                });


        }], function (err, results) {
            // console.log("end of waterfall process, result is " + results);
            var contents = '<p>You have these checklist to do today.</p>';
            for (var i = 0; i < results.length; i++) {
                contents += '<ul><li>Title: ' + results[i].parents.title + "</li>";

                for (var j = 0; j < results[i].child.length; j++) {
                    contents += "<li>Due date: " + results[i].child[j].due_date + "</li>";
                }
                contents += '</ul>';
            }
            // console.dir(contents);
            callback(contents);
        });
}

var j = schedule.scheduleJob(rule, function () {
    console.log("run scheduler");
    new processBatch();
});

