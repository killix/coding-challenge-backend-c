// @class master

var logger = require('../helpers/logger'),
    cluster = require('cluster'),
    Application = require('./application'),
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    DEBUG_MODE = process.env.DEBUG_MODE || 'false';

module.exports = (function() {
  'use strict';

  //@constructor
  function Worker(name, options) {
    var self = this;
    this.log = logger('cluster:' + name + ':worker:'+process.pid);
    this.options = options || {};
    this.application = new Application(this.options);

    this.run = __bind(this.run, this);

    //TODO: is not perfect because can be use lot of memory in other case of data.
    //use database like mongodb is good solution for lot of shared data between fork
    this.application.initialize(function(err){
      if(err) process.exit(1);
      self.run();
    });
  }

  Worker.prototype.run = function(){
    this.log('run application...');
    this.application.run();
  }

  return Worker;

})();