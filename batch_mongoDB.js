
var schedule = require('node-schedule');
var async = require('async');
var nodemailer = require('nodemailer');
var db;
db = require('monk')('');

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
    console.log("run processBatch");
    var self = this;
    self.doBatch();
}

processBatch.prototype.doBatch = function () {
    console.log("run doBatch");
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
            chklstDb.find({ notice_bool: true, complete: "n"}, { sort: { done_bool: 1, due_date: -1 }},
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
                    // , due_date: {"$lte": convertDateFormat(new Date()) }
                    chklstDtlDb.find({ chklst_id: retrieveResult._id, done_bool: false}, {},
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
        }, function (chklstContents, callback) {
                  // console.log("3rd waterfall async process");
            var memoDb = db.get('memo');
            // , due_date: {"$lte": convertDateFormat(new Date()) }
            memoDb.find({ complete: "n", tags: "todo" }, {},
                function (err, result) {
                    callback(null, chklstContents, result);
                }
            );

        }], function (err, chklstContents, todoContents) {
            // console.log("end of waterfall process, result is " + results);
            var contents = '<p>You have these checklists to do today.</p>';
            for (var i = 0; i < chklstContents.length; i++) {
                contents += '<ul><li>Title: ' + chklstContents[i].parents.title + "</li>";

                for (var j = 0; j < chklstContents[i].child.length; j++) {
                    contents += "<li>Due date: " + chklstContents[i].child[j].due_date + "</li>";
                }
                contents += '</ul>';
            }

            contents += '<p>You have these todo lists today.</p>';
            for (var i = 0; i < todoContents.length; i++) {
                contents += '<ul>';
                contents += '<li>Contents: ' + todoContents[i].contents + "</li>";
                contents += '<li>Due date: ' + todoContents[i].due_date + "</li>";
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
/*
new processBatch();
*/
