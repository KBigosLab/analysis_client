
var CloudWatch = require('aws-sdk/clients/cloudwatch');
var Shell = require('fusion/Shell');
var Fiber = require('fibers');
var sleep = require('fusion/sleep');
var _ = require('underscore');

function putMetricAlarm(region,params) {
  var cw = new CloudWatch({
    region: region,
    accessKeyId: Const.AWSAccessKeyID,
    secretAccessKey: Const.AWSSecretAccessKey,
    apiVersion: '2010-08-01',
  });

  // Lowercase "fiber" will now reference the currently running fiber
  var fiber = Fiber.current;

  cw.putMetricAlarm(params, function(err, data) {
    console.log(err);
    console.log(data);
    // This kicks the execution back to where the Fiber.yield() statement stopped it
    fiber.resume();
  });

  // Yield so the server can do something else, since fs access is slow!
  Fiber.yield();
}

function setAlarmState(region,params) {
  var cw = new CloudWatch({
    region: region,
    accessKeyId: Const.AWSAccessKeyID,
    secretAccessKey: Const.AWSSecretAccessKey,
    apiVersion: '2010-08-01',
  });

  // Lowercase "fiber" will now reference the currently running fiber
  var fiber = Fiber.current;

  cw.setAlarmState(params, function(err, data) {
    console.log(err);
    console.log(data);
    // This kicks the execution back to where the Fiber.yield() statement stopped it
    fiber.resume();
  });

  // Yield so the server can do something else, since fs access is slow!
  Fiber.yield();
}

function getAWSInstanceID() {
  var shell = new Shell();
  return shell.run('wget -q -O - http://169.254.169.254/latest/meta-data/instance-id',[]);
}

function getAWSRegion() {
  var shell = new Shell();
  var region = shell.run('wget -q -O - http://169.254.169.254/latest/meta-data/placement/availability-zone',[]);
  return region.slice(0,region.length-1);
}

exports.reset = function() {

  var region = getAWSRegion();
  var instanceId = getAWSInstanceID();

  setAlarmState(region,{
    AlarmName: 'CPU_Utilization_'+instanceId,
    StateReason: 'Reset for system restart',
    StateValue: 'OK',
    StateReasonData: '{"version": "1.0"}'
  });
}

exports.set = function() {

  var region = getAWSRegion();
  var instanceId = getAWSInstanceID();

  putMetricAlarm(region,{
    AlarmName: 'CPU_Utilization_'+instanceId,
    ComparisonOperator: 'LessThanThreshold',
    EvaluationPeriods: 2,
    MetricName: 'CPUUtilization',
    Namespace: 'AWS/EC2',
    Statistic: 'Average',
    Period: 300,
    Threshold: 65.0,
    ActionsEnabled: true,
//    AlarmActions: ['arn:aws:swf:'+region+':'+Const.AWSAccountNumber+':action/actions/AWS_EC2.InstanceId.Reboot/1.0'],
    AlarmActions: ['arn:aws:swf:'+region+':'+Const.AWSAccountNumber+':action/actions/AWS_EC2.InstanceId.Terminate/1.0'],
    AlarmDescription: 'Alarm when server CPU drops below 65%',
    Dimensions: [{
      Name: 'InstanceId',
      Value: instanceId,
    }],
  });

}

function listAlarms(region,params) {
  var cw = new CloudWatch({
    region: region,
    accessKeyId: Const.AWSAccessKeyID,
    secretAccessKey: Const.AWSSecretAccessKey,
    apiVersion: '2010-08-01',
  });

  // Lowercase "fiber" will now reference the currently running fiber
  var fiber = Fiber.current;

  var res = null;
  cw.describeAlarms(params, function(err, data) {
    console.log(err);
    res = data;
    // This kicks the execution back to where the Fiber.yield() statement stopped it
    fiber.resume();
  });

  // Yield so the server can do something else, since fs access is slow!
  Fiber.yield();

  return res;
}

function listAlarms(region,params) {
  var cw = new CloudWatch({
    region: region,
    accessKeyId: Const.AWSAccessKeyID,
    secretAccessKey: Const.AWSSecretAccessKey,
    apiVersion: '2010-08-01',
  });

  // Lowercase "fiber" will now reference the currently running fiber
  var fiber = Fiber.current;

  var res = null;
  cw.describeAlarms(params, function(err, data) {
    console.log(err);
    res = data;
    // This kicks the execution back to where the Fiber.yield() statement stopped it
    fiber.resume();
  });

  // Yield so the server can do something else, since fs access is slow!
  Fiber.yield();

  return res;
}

function deleteAlarm(region,params) {
  var cw = new CloudWatch({
    region: region,
    accessKeyId: Const.AWSAccessKeyID,
    secretAccessKey: Const.AWSSecretAccessKey,
    apiVersion: '2010-08-01',
  });

  // Lowercase "fiber" will now reference the currently running fiber
  var fiber = Fiber.current;

  var res = null;
  cw.deleteAlarms(params, function(err, data) {
    console.log(err);
    res = data;
    // This kicks the execution back to where the Fiber.yield() statement stopped it
    fiber.resume();
  });

  // Yield so the server can do something else, since fs access is slow!
  Fiber.yield();

  return res;
}

function deleteAlarms(region) {
  var list = listAlarms(region,{
    StateValue: 'INSUFFICIENT_DATA',
    MaxRecords: 100,
  });

  var alarms = list.MetricAlarms;
  deleteAlarm(region,{AlarmNames: _.map(alarms,'AlarmName')});
}

exports.deleteInactiveAlarms = function(region) {
  for (var k=0;k<5;k++) {
    deleteAlarms(region);
    sleep(1000);
  }
}


