var Deferred = require("promised-io/promise").Deferred,
async = require('async'),
http = require('http'),
rate_limit = require('rate-limit'),
graphdb = require('../graphdb.js');

var crunchbase_queue = rate_limit.createQueue({interval: 750}); 

var Company = function() {
}; 

var clean = function (text) {
	text = text || '';
	return text.replace(/\'/g, "\\'").replace(/[^a-zA-Z0-9 #@.,:<>\/]/g,'');
};

var find_or_create = Company.prototype.find_or_create = function(company) {
	self = this;
	console.log('Starting assignment');
	self.name = clean(company.name);
	self.tags = clean(company.tag_list).split(',');
	self.overview = clean(company.overview);
	self.description = clean(company.description);
	if (company.image) {
			self.image = company.image.available_sizes[0][1];
	} else {
		self.image = '';
	}
	self.founded = company.founded_year;
	self.homepage = clean(company.homepage_url);
	self.crunchbase_url = clean(company.crunchbase_url);
	console.log('Just relationships and rounds left');
	self.people = company.relationships;
	self.raised = clean(company.total_money_raised);
	self.rounds = company.funding_rounds;
	var deferred = new Deferred;
	var neo4jquery = 'MERGE (c:Company {' +
		'name:"' + self.name + '",'+
		'tags: '+ JSON.stringify(self.tags) +',' + 
		'description: "'+ self.description + '", ' + 
		'overview: "' + self.overview + '", ' +
		'image: ' + JSON.stringify(self.image) + ', ' +
		'founded: "' + self.founded + '", ' +
		'homepage: "' + self.homepage + '", ' +
		"people: '" + JSON.stringify(self.people) + "'," +
		'crunchbase_url: "' + self.crunchbase_url + '", ' +
		'raised: "' + self.raised + '",' +
		"rounds: '" + JSON.stringify(self.rounds) + "'" +
		'}) ';
	self.tags.forEach(function(tag, index) {
		neo4jquery += 'MERGE (t' + index + ':Tag {name:"' + tag +'"}) CREATE (t' + index + ')-[:DESCRIBES]->(c) '
	});
 
	neo4jquery += 'WITH c AS company ' + 
	'MATCH (tag:Tag)-[:DESCRIBES]->(company) ' +  
    'WITH COLLECT(tag) AS tags ' +  
    'FOREACH (i in RANGE(0, length(tags)-1) | ' + 
    'FOREACH (j in RANGE(0, length(tags)-1) | ' +
    'FOREACH (t1 in [tags[i]] | ' +
    'FOREACH (t2 in [tags[j]] | ' +
    'CREATE UNIQUE (t1)-[r:LINKED {company: "' + this.name +'", raised:"' + this.raised + '"}]->(t2) ' +
    ')))) RETURN tags;'
	

	graphdb.cypherQuery(neo4jquery, function(err, result) {
		if (err) {console.log(err);console.log(neo4jquery); throw err;};
		console.log('Finding or creating company ' + company.name);
		deferred.resolve(result.data);;
	});

	return deferred.promise;

};

var check_company = Company.prototype.check_company = function(name) {
	var deferred = new Deferred;
	var neo4jquery = 'MATCH (c:Company {name:"' + name + '"}) RETURN c;'
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

var get_companies = Company.prototype.get_companies = function(companies) {
	var deferred = new Deferred;
	var get_co_permalink = function(company, callback) {
		var options = {
		  host: 'api.crunchbase.com',
		  path: '/v/1/companies/permalink?name=' + encodeURIComponent(company) + '&api_key=' + process.env.CRUNCHBASE_API_KEY
		};

		crunchbase_queue.add(
			function() {
				console.log('Getting permalink for: ' + company)
				http.get(options, function(res) {
					var body = [], err;
					console.log(res.statusCode);
					if (res.statusCode >= 400) {
						callback(null, '');
					};
				  	res.on('data', function(chunk) {
				    	body.push(chunk);
				  		})
				  	.on('end', function() {
						callback(null,JSON.parse(Buffer.concat(body)).permalink);
				  		})
				 //  	.on('error', function(e) {
			  //     		console.log("Got error: ", e);
			  //     		callback(e);
					// });
				});
			}
		);

	}

	var get_co_info = function(permalink, callback) {
		var options = {
		  host: 'api.crunchbase.com',
		  path: '/v/1/company/' + encodeURIComponent(permalink) + '.js?api_key=' + process.env.CRUNCHBASE_API_KEY
		};


			crunchbase_queue.add(
			function() {
				http.get(options, function(res) {
					var body = [];
					console.log("Response: " + res.statusCode);
					if (res.statusCode >= 400) {
						callback(null, '');
					};
				  	res.on('data', function(chunk) {
				    	body.push(chunk);
				  		})
				  	.on('end', function() {
				  		console.log('Got co info for: ' + permalink);
						callback(null,JSON.parse(Buffer.concat(body)));
				  		})
				 //  	.on('error', function(e) {
			  //     		console.log("Got error: ", e);
			  //     		callback(e);
					// });
				});
			}
		);
   
    });
    req.end();

    req.on('error', function(e) {
        // Decide what to do here
        // if error is recoverable
        //     tryUntilSuccess(options, callback);
        // else
        //     callback(e);
    });
}


		
	};

	//Filter out companies that already exist in the DB
	var filter_companies = function(companies, callback) {
		async.filterSeries(companies, function(company, callback) {
			console.log('Filtering: ' + company);
			check_company(company).then(function(exists) {
				callback(!exists);
			});
		}, 
		function(results) {
			callback(null, results);
		});
	};

	var check_api = function(companies, callback1) {
		async.map(companies,
		function(company, callback2) {
			async.waterfall([
				function(callback3) {
					get_co_permalink(company, callback3)
				},
				function(permalink, callback4) {
					console.log('Getting info for: ' + permalink)
					get_co_info(permalink, callback4)
				}
				],
				function(err, results)
				{
					if (err) {
						console.log('Error: ' + err);
						throw err
					};
					callback2(err, results);
				}
			);
		}, 
		function(err, results) {
			console.log('Done checking API for: ' + results)
			callback1(null,results);
		});
	};

	async.waterfall([function (callback) {
		console.log('Filtering companies');
		filter_companies(companies, callback);
	}, function (filtered_companies, callback) {
		console.log(filtered_companies);
		check_api(filtered_companies, callback);
	}], function (err, result) {
		if (err) {
			console.log('Error: ' + err);
			throw err
		};
		deferred.resolve(result); 
	});

	return deferred.promise;
};

module.exports = Company;