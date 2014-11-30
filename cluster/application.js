// @class app
// This class holds the city information and the logic for calculating  the 
// the distance with a reference latitude and longitude.

var logger = require('../helpers/logger'),
    path = require('path'),
    http = require('http'),
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    DEBUG_MODE = process.env.DEBUG_MODE || 'false';

var LoadFileInMemory = require('../helpers/load_file_memory'),
    routesSuggestions = require('../routes/suggestions'),
    routesWildcard = require('../routes/wildcard');

var modelsCity = require('../models/city'),
    cities = [];

module.exports = (function() {
  'use strict';
  
  // @constructor
  // @param {Object} options
  function Application(options) {
    this.log = logger('Application');
    this.port = options.port || 2345;
    this.address = options.address || '127.0.0.1';
    this.inMemoryDatabase = [];
    this.loadDatas = __bind(this.loadDatas, this);

    this.filters = {
      'population':5000,
      'country':['CA','US']
    };
  }

  Application.prototype.initialize = function(callback) {
    callback = callback || function(){};
    this.loadDatas(function(err){
      callback(err);
    });
  }

  Application.prototype.loadDatas = function(callback) {
    var self = this;
    callback = callback || function(){};

    var datasCities = new LoadFileInMemory(path.join(process.cwd(),'data/cities_canada-usa.tsv'));
    datasCities.load(function(datas, err){
      if(typeof(err) != 'undefined'){
        self.log(err);
        callback(err);
      } else {
        // Now put each city in model city
        datas.forEach(function(data,index){
          if(data.population >= self.filters.population && self.filters.country.indexOf(data.country.toUpperCase()) >= 0) {
            var city = new modelsCity(data.name, data.ascii, data.admin1, data.country, data.population, data.lat, data.long);
            self.inMemoryDatabase.push(city);
          }
        });
        datas = null; //clear
        callback();
      }
    });
  }

  Application.prototype.run = function() {
    var self = this;
    http.createServer(function (request, response) {
      if (request.url.indexOf('/suggestions') === 0) {
        routesSuggestions(request, response, self.inMemoryDatabase);
      } else {
        routesWildcard(request, response);
      }
    }).listen(self.port, self.address, function() {
      self.log('server running at http://%s on %s/suggestions',self.address, self.port);
    });
  }

  return Application;
})();