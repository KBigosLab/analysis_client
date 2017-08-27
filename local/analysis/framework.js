
module.exports = {
  mode: 'web-server',

  dirs: {
    apps: '/apps',
    includes: '/includes',
  },

  routes: {
    /*cron: Const.cronEnabled ? 'icron' : null,*/
    custom: 'custom',
  },

  request: {
    dir: 'request',
    require: 'Roles',
  },

  web: ['genes'],

  sharedModules: ['shared'],
  projectNodeModules: 'node_modules/analysis',

  // Variables that should persist across requests for the same session
  persistVars: {
    csrfToken: '',
  },

  // Sanity check to make sure globals aren't being leaked
  globalSizeLimit: 42,
}

