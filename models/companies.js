var Deferred = require("promised-io/promise").Deferred,
async = require('async'),
http = require('http'),
rate_limit = require('rate-limit'),
graphdb = require('../graphdb.js'),
_ = require('underscore'),
clean_JSON = require('../clean_JSON.js');

var crunchbase_queue = rate_limit.createQueue({interval: 250}); 
var neo4j_queue = rate_limit.createQueue({interval:100});

var Company = function() {
}; 


var find_or_create = Company.prototype.find_or_create = function(company, count) {
	var deferred = new Deferred;
	var count = count || 0;
	try {
	company = clean_JSON(company);
	} catch(e) {
		console.log(e.message);
		company.error = 'Could not clean JSON';
	}
	if (company.error) {
		deferred.resolve([]);
	} else {
		self = this;
		self.name = company.name;
		if (company.tag_list) {
			self.tags = company.tag_list.split(',').map(function(tag) {return tag.trim()});
		} else {
			self.tags = [];
		}
		if (company.overview) {
			self.overview = company.overview.replace(/\"/g, '\\"');
		} else {
			self.overview = '';
		}
		if (company.description) {
			self.description = company.description.replace(/\"/g, '\\"');			
		} else {
			self.description = '';
		}
		self.founded = company.founded_year;
		self.homepage = company.homepage_url;
		self.crunchbase_url = company.crunchbase_url;
		//self.people = company.relationships;
		self.raised = company.total_money_raised;
		//self.rounds = company.funding_rounds;
		var neo4jquery = 'MERGE (c:Company {' +
			'name:"' + self.name + '",'+
			'permalink:"' + company.permalink + '",' +
			'tags: '+ JSON.stringify(self.tags) +',' + 
			'description: '+ JSON.stringify(self.description) + ', ' + 
			'overview: ' + JSON.stringify(self.overview) + ', ' +
			'founded: "' + self.founded + '", ' +
			'homepage: "' + self.homepage + '", ' +
			//"people: '" + JSON.stringify(self.people) + "'," +
			'crunchbase_url: "' + self.crunchbase_url + '", ' +
			'raised: "' + self.raised + '"' +
			//"rounds: '" + JSON.stringify(self.rounds) + "'" +
			'}) ';
		self.tags.forEach(function(tag, index) {
			neo4jquery += 'MERGE (t' + index + ':Tag {name:"' + tag +'"}) CREATE UNIQUE (t' + index + ')-[:DESCRIBES]->(c) '
		});
	 
		neo4jquery += 'WITH c AS company ' + 
		'MATCH (tag:Tag)-[:DESCRIBES]->(company) ' +  
	    'WITH COLLECT(tag) AS tags ' +  
	    'FOREACH (i in RANGE(0, length(tags)-1) | ' + 
	    'FOREACH (j in RANGE(0, length(tags)-1) | ' +
	    'FOREACH (t1 in [tags[i]] | ' +
	    'FOREACH (t2 in [tags[j]] | ' +
	    'CREATE UNIQUE (t1)-[r:LINKED {company: "' + this.name +'", raised:"' + this.raised + '"}]->(t2) ' +
	    '))));'
		
		neo4j_queue.add(function() {
			graphdb.cypherQuery(neo4jquery, function(err, result) {
				if (err) 
				{
					console.log(err);
					console.log(neo4jquery); 
					if (count < 3) {
						setTimeout(function() {find_or_create(company)}, 500);
					} else {
						deferred.resovle(self.tags);
					}
				};
				console.log('Creating company ' + company.name);
				deferred.resolve(self.tags);
			});
		});

	};

	return deferred.promise;

};

var check_company = Company.prototype.check_company = function(name) {
	var deferred = new Deferred;
	var neo4jquery = 'MATCH (c:Company {permalink:"' + name + '"}) RETURN c;'
		neo4j_queue.add(function() {
			graphdb.cypherQuery(neo4jquery, function(err, result) {
				//console.log("Company matching results: " + JSON.stringify(result));
				if (err) {console.log(err)};
				if (result.data.length > 0) {
					deferred.resolve(result.data[0].data.tags);
				} else {
					deferred.resolve(false);
				}
			});
		});
	return deferred.promise;
};


var get_co_info = Company.prototype.get_co_info = function(permalink, callback, count) {
	var options = {
	  host: 'api.crunchbase.com',
	  path: '/v/1/company/' + encodeURIComponent(permalink) + '.js?api_key=' + process.env.CRUNCHBASE_API_KEY
	};
	count = count || 0;
	crunchbase_queue.add(
		function() {
			var req = http.get(options, function(res) {	
				var body = [];
				var code = res.statusCode;
				if (code >= 400) {
		       		console.log("Got error " + code + ' retrying.');
		       		count += 1;
		       		if (count <= 10) {
		       			console.log('Trying again');
		       			setTimeout(function() {get_co_info(permalink, callback, count)}, 500)
		       		} else {
		       			console.log('Giving up.')
		       			callback('Received Error ' + code);
		       		};

				} else {
				  	res.on('data', function(chunk) {
				    	body.push(chunk);
				  		})
				  	.on('end', function() {
				  		var data;
				  		try {
				  			data = JSON.parse(Buffer.concat(body));
				  		} catch (e) {
				  			console.log(e.message);
				  			//var err = {error: e.message};
				  			callback(e.message);
				  		};
				  		if (data) {
							callback(null,data);
							console.log('Got info for: ' + permalink);				  			
				  		};	
				  	});
			    };
			});
		}
	);

};

var get_companies = Company.prototype.get_companies = function(companies) {
	var deferred = new Deferred;

	//Filter out companies that already exist in the DB
	var filter_companies = function(companies, callback) {
		async.filterSeries(companies, function(company, callback) {
			check_company(company).then(function(exists) {
				callback(!exists);
			});
		}, 
		function(results) {
			callback(null, results);
		});
	};

	var check_api = function(companies, callback) {
		async.map(companies,
		function(company, callback) {
			get_co_info(company, callback)
		}, 
		function(err, results) {
			if(err) {
				console.log('Error: ' + err);
				callback(null, {error: err});
			} else {
				callback(null, results);				
			};
		});
	};
	//TODO: check_co then CB if tags, otherwise check_api and save
	// async.waterfall([function (callback) {
	// 	console.log('Filtering companies');
	// 	filter_companies(companies, callback);
	// }, function (filtered_companies, callback) {
	// 	console.log(filtered_companies);
	// 	check_api(filtered_companies, callback);
	// }], function (err, result) {
	// 	if (err) {
	// 		console.log('Error: ' + err);
	// 		throw err;
	// 	};
	// 	deferred.resolve(result); 
	// });

	async.mapLimit(companies, 2, function(company, callback) {
		check_company(company).then(function(res) {
			if (res) {
				console.log('Company exists: ' + company);
				callback(null, res);
			} else {
				console.log('Checking API for: ' + company);
				get_co_info(company, function(err, res) {
					if (err) {
						console.log('Error getting info for: ' + company)
						callback(null, []);
					} else {
						find_or_create(res).then(function(results) {
							callback(null, results)
						});
					};
				});
				//Return blank if no response in 10 seconds.
				setTimeout(function () {
					callback(null, []);
				}, 10000);
			}
		})
	}, function (err, results) {
		if (err) {
			console.log(err);
			throw err;
		} else {
			var tag_list = []
			results.forEach(function(tags) {
				tag_list = tag_list.concat(tags);
			});
			deferred.resolve(_.uniq(tag_list));
		};

	})

	return deferred.promise;
};

module.exports = Company;