
var CloudWatch = require('aws-sdk/clients/cloudwatch');
var Shell = require('fusion/Shell');
var Fiber = require('fibers');

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

function getAWSInstanceID() {
  var shell = new Shell();
  return shell.run('wget -q -O - http://169.254.169.254/latest/meta-data/instance-id',[]);
}

function getAWSRegion() {
  var shell = new Shell();
  var region = shell.run('wget -q -O - http://169.254.169.254/latest/meta-data/placement/availability-zone',[]);
  return region.slice(0,region.length-1);
}

exports.set = function() {

  var region = getAWSRegion();

  putMetricAlarm(region,{
    AlarmName: 'Web_Server_CPU_Utilization',
    ComparisonOperator: 'LessThanThreshold',
    EvaluationPeriods: 2,
    MetricName: 'CPUUtilization',
    Namespace: 'AWS/EC2',
    Statistic: 'Average',
    Period: 300,
    Threshold: 80.0,
    ActionsEnabled: true,
    AlarmActions: ['arn:aws:swf:'+region+':'+Const.AWSAccountNumber+':action/actions/AWS_EC2.InstanceId.Reboot/1.0'],
    AlarmDescription: 'Alarm when server CPU drops below 70%',
    Dimensions: [{
      Name: 'InstanceId',
      Value: getAWSInstanceID(),
    }],
  });

}

