// @class cluster
// This class help to manage the cluster 


var logger = require('../helpers/logger'),
    cluster = require('cluster'),
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    os = require('os'),
    DEBUG_MODE = process.env.DEBUG_MODE || 'false';

var Master = require('./master'),
    Worker = require('./worker');

module.exports = (function() {
  'use strict';

  function Cluster(name, port, cpus, address, autoRestart, reportMemoryUsageInterval) {
    this.log = logger('cluster:'+name);
    this.name = name;
    this.port = port;
    this.address = address || '127.0.0.1';
    
    this.cpus = cpus || os.cpus().length;
    this.autoRestart = autoRestart || true;
    this.reportMemoryUsageInterval = reportMemoryUsageInterval || 5;

    this.master = __bind(this.master, this);
    this.worker = __bind(this.worker, this);
    this.setUpWorkEvents = __bind(this.setUpWorkEvents, this);
  }

  Cluster.prototype.initialize = function() {
    var self = this;
    if (DEBUG_MODE) this.setUpLogWorkEvents();

    if (cluster.isMaster) {
      this.master();
    } else {
      this.worker();
    }

    if(this.autoRestart){
      cluster.on('death', function (worker) {
        self.log(' worker %s died.', worker.pid);
        self.log('Restarting worker thread...');
        cluster.fork();
      });
    }

    // ensure that Server exits correctly on Ctrl+C
    process.on('SIGINT', function() {
      self.log('Server has shutdown - Server was running for %s seconds', Math.round(process.uptime()));
      process.exit(0);
    });
  }

  Cluster.prototype.master = function() {
    var m = new Master(this.name, this.cpus);
  }

  Cluster.prototype.worker = function() {
    var w = new Worker(this.name, {
      'port':this.port,
      'address':this.address
    });
  }

  Cluster.prototype.setUpLogWorkEvents = function(){
    var self = this;
    cluster.on('fork', function(worker) {
      self.log('Forking worker %s ....', worker.process.pid);
    });

    cluster.on('online', function(worker) {
      self.log('Worker %s online', worker.process.pid);
    });

    cluster.on('listening', function(worker, address) {
      self.log('Worker %s is now listening at %s on %s', worker.process.pid, address.address, address.port);
    });

    cluster.on('exit', function(worker, code, signal) {
      self.log('Worker %s died. Restarting...', worker.process.pid);
    });
  }

  Cluster.prototype.watchMemory = function() {
    var self = this;
    setInterval(function () {
      var memusage = process.memoryUsage();
      self.log([
        'report  -  Physical: ',
        parseInt(memusage.rss / 1024 / 10.24) / 100,
        '  -  Heap: ',
        parseInt(memusage.heapUsed / 1024 / 10.24) / 100,
        ' / ' + parseInt(memusage.heapTotal / 1024 / 10.24) / 100
      ].join(''));
    }, this.reportMemoryUsageInterval * 1000);
  }


  return Cluster;

})();