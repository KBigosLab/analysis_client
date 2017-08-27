
require('debug-trace')({
  always: true,
})

require('fusion/root/cron').run('routes/cron');

