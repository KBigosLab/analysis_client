
require('app-module-path').addPath('local');

require('debug-trace')({
  always: true,
})

require('fusion/root/cron').run('routes/cron');

