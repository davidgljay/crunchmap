var graphdb = require('../graphdb.js'),
Deferred = require("promised-io/promise").Deferred,
async = require('async'),
http = require('http'),
cheerio = require('cheerio'),
rate_limit = require('rate-limit'),
_ = require('underscore'),
Company = require('./companies.js');

var crunchbase_queue = rate_limit.createQueue({interval: 200}); 


var Tag = function () {
};
 
var handle = function (error, text) {
	if (error) {
		console.log("Error in " + text + ": " + error);
		throw error;
	};
}; 
 
Tag.prototype.find_or_create = function(name) {
	this.name = name;
	var deferred = new Deferred;
	var neo4jquery = 'MERGE (t:Tag {name:"' + name + '"}) RETURN t;'
	graphdb.cypherQuery(neo4jquery, function(err, result) {
		if (err) {console.log(err)};
		console.log('Creating tag ' + name);
		deferred.resolve(result);
	});

	return deferred.promise;
};

var check_tag = Tag.prototype.check_tag = function(name) {
	var deferred = new Deferred;
	var neo4jquery = 'MATCH (t:Tag {name:"' + name + '"}) RETURN t;'
	graphdb.cypherQuery(neo4jquery, function(err, result) {
		if (err) {console.log(err)};
		if (result.data.length > 0) {
			deferred.resolve(true);
		} else {
			deferred.resolve(false);
		}

	});

	return deferred.promise;
};

Tag.prototype.get_tags = function(tags) {
	var deferred = new Deferred;
	
	var get_tag = function(tag, callback) {
		var options = {
		  host: 'www.crunchbase.com',
		  path: '/tag/' + tag
		};


		crunchbase_queue.add(function() {
			http.get(options, function(res) {
			  	var bodyChunks = [],
			  	body,
			  	companies = [];
			  	res.on('data', function(chunk) {
			    		bodyChunks.push(chunk);
			  		})
			  	.on('end', function() {
			    		body = Buffer.concat(bodyChunks);
			    		$ = cheerio.load(body);

			    		var table = $('div.float_photo td').first().find('a');
			    		Object.keys(table).slice(0,-2).forEach(function (key) {
							  companies.push(table[key].attribs.href.slice(9));
						});
					callback(null,companies);
				});


			});
		});
	}; 

	async.mapSeries(tags, 
		function(tag, callback) {
			console.log('Getting companies for tag: ' + tag);
			get_tag(tag, callback) 
		},
		function(err, results) {
			handle(err);
			var companies = [];
			results.forEach(function(result) {
				companies = companies.concat(result);
			}); 
			deferred.resolve(_.uniq(companies));
		});
 


	return deferred.promise;
};
 
Tag.prototype.map_tag = function(tag) {
	var deferred = new Deferred,
	company = new Company,
	self = this,
	tag_list = []; 

	// check_tag(tag).then(function (exists) {
	// 	if(!exists) { 
			async.waterfall([
				//First, check for companies matching the tag
				function(callback) {
					self.get_tags([tag]).then(function(companies_list) {
						callback(null, companies_list);
					});
				},
				// Then ping the API to get information, including tags, for those companies
				function(companies_list, callback) { 
					console.log('Pinging the API:' + companies_list);
					company.get_companies(companies_list).then(function(tag_list) {
						callback(null, tag_list);
					});
				},
				//Then get info for the collected tags;
				function(tag_list, callback) {
					console.log('Getting big list of tags: ' + tag_list);
					self.get_tags(tag_list).then(function(big_companies_list) {
						callback(null, big_companies_list);
					});
				}, //Then get infor for each of their companies
				function(big_companies_list, callback) { 
					console.log('Pinging API for Big Companies list');
					crunchbase_queue = rate_limit.createQueue({interval: 500}); 
					company.get_companies(big_companies_list).then(function(companies_with_info) {
						callback(null, _.uniq(tag_list));
					});
				}],
				function(err, result) {
					console.log('Reached end of waterfall:' + result);
					deferred.resolve(result);
				}
			);
		//}; 
	// });

	return deferred.promise;
};

module.exports = Tag;



