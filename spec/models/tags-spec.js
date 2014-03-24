// tests/tags-spec.js
var tag = require("../../models/tags.js");
var nock = require('nock'); 

var fakeCrunch = function (url, obj) {
			nock('http://www.crunchbase.com')
                .get(url)
                .reply(200, obj)
            };
 
var promise_test = function(promise, expects, wait) {
	var result, done;
	runs (function() { 
		promise.then(function(res) {
			result = res;
			done = true;
		});
	});

	wait != 5000;

	waitsFor(function() {
		return done;
	}, 'waiting for promise to complete', wait);

	runs(function() {
		expects(result)
	});
};

describe('get_tags', function() {
	xit('should get tags from crunchbase', function() {
		var test_tag = new tag;
		var expects = function(result) {
					expect(result.length).toBeGreaterThan(1);
				};

		promise_test(test_tag.get_tags(['smart-home', 'homeautomation']), expects);
	});
});


describe('find_or_create', function() {
	xit ("should find an existing tag", function() {
		var test_tag = new tag;
		promise_test(test_tag.find_or_create('smart_home'), 
			function (result) {
				expect(result.data[0].data.name).toEqual('smart_home');
		});
	});

});


describe('check_tag', function() {
	it ("should return true for a tag already in the DB", function() {
		var test_tag = new tag;
		var result, done1, done2;
		runs( function() {
			test_tag.find_or_create('smart_home').then(function(res) {
			done1 = true;
		  });
		});

		waitsFor(function() {
			return done1;
		}, 'waiting for tag to be created', 5000)

		runs( function() {
			test_tag.check_tag('smart_home').then(function(res) {
			result = res;
			done2 = true;
		  });
		});

		waitsFor(function() {
			return done2;
		}, 'waiting to check that tag exists', 5000);

		runs( function() {
			expect(result).toEqual(true);
		});
	});

	it ("should return false for a tag not in the DB", function() {
		var test_tag = new tag;
		var result, done;
		runs( function() {
			test_tag.check_tag('ha9sfd7asdfhj').then(function(res) {
			result = res;
			done = true;
		  });
		});

		waitsFor(function() {
			return done;
		});

		runs( function() {
			expect(result).toEqual(false);
		}); 
	});

});

describe("Tag mapping", function() {
 	it("should map a tag", function() {
 		var test_tag = new tag;
 		promise_test(test_tag.map_tag('smart-home'), function(result) {
 			expect(result).toBe('Bugs Bunny');
 		}, 360000)
 	})
});
