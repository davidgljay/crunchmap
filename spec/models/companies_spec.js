// tests/tags-spec.js
var company = require("../../models/companies.js");
var nock = require('nock');

var fakeCrunch = function (url, obj) {
			nock('http://api.crunchbase.com')
                .get(url)
                .reply(200, obj)
            };
 
xdescribe('find_or_create', function() {
	it ("should find an existing company", function() {
		var test_co = new company;
		var result, done;
		runs (function() { 
			test_co.find_or_create(example_co).then(function(res) {
				result = res;
				done = true;
			})
		})

		waitsFor(function() {
			return done;
		}, 'waiting for graphDB to create a company', 5000); 

		runs(function() {
			expect(done).toEqual(true);
		});
	});

});

xdescribe('check_company', function() {
	it ("should return true for a company already in the DB", function() {
		var test_co = new company;
		var result, done;
		runs( function() {
			test_co.check_company('Canary').then(function(res) {
			result = res;
			done = true;
		  });
		});

		waitsFor(function() {
			return done;
		}, "checking graphDB", 5000);

		runs( function() {
			expect(result).toEqual(true);
		});
	});

	it ("should return false for a company not in the DB", function() {
		var test_co = new company;
		var result, done;
		runs( function() {
			test_co.check_company('ha9sfd7asdfhj').then(function(res) {
			result = res;
			done = true;
		  });
		});

		waitsFor(function() {
			return done;
		}, "checking graphDB", 5000);

		runs( function() {
			expect(result).toEqual(false);
		});
	});


});

xdescribe('get_companies', function() {
	it('should get company data from the crunchbase API', function() {
		var companies = ['whatsapp', 'pinterest'];
		var test_co = new company;
		var result, done;

		
		runs(function() {
			test_co.get_companies(companies).then(function(res) {
				result = res;
				done = true;
			});
		});

		waitsFor(function() {
			return done;
		}, 'waiting for response from Crunchbase API', 10000);

		runs(function() {
			expect(result[0].permalink).toEqual('whatsapp');
		});

	});

});

var example_co = {name:"Canary",permalink:"canary",crunchbase_url:"http://www.crunchbase.com/company/canary",homepage_url:"http://canary.is",blog_url:"http://blog.canary.is",blog_feed_url:"",twitter_username:"Canary",category_code:"hardware",number_of_employees:null,founded_year:2012,founded_month:null,founded_day:null,deadpooled_year:null,deadpooled_month:null,deadpooled_day:null,deadpooled_url:null,tag_list:"security, home-monitoring, smart-home, crowdfunding, indiegogo, startup, nyc, new-york, new-york-city, home-automation",alias_list:null,email_address:"info@canary.is",phone_number:"",description:"Smart home security",created_at:"Wed Apr 24 22:02:52 UTC 2013",updated_at:"Mon Jan 27 03:30:14 UTC 2014",overview:"<p>Canary has done away with everything that makes security intolerable, and brought back the roots of what peace of mind truly is: Empowerment. Information. Community.</p>",image:{available_sizes:[[[150,150],"assets/images/resized/0025/4717/254717v6-max-150x150.png"],[[250,250],"assets/images/resized/0025/4717/254717v6-max-250x250.png"],[[450,450],"assets/images/resized/0025/4717/254717v6-max-450x450.png"]],attribution:null},products:[{name:"Canary",permalink:"canary"}],relationships:[{is_past:false,title:"Founder & Design Director",person:{first_name:"Jon",last_name:"Troutman",permalink:"jon-troutman-3"}},{is_past:false,title:"Founder & CTO",person:{first_name:"Chris",last_name:"Rill",permalink:"chris-rill"}},{is_past:false,title:"Founder & CEO",person:{first_name:"Adam",last_name:"Sager",permalink:"adam-sager"}},{is_past:false,title:"Head of Marketing",person:{first_name:"Andrew",last_name:"Kippen",permalink:"andrew-kippen"}},{is_past:true,title:"",person:{first_name:"Justin",last_name:"Mound",permalink:"justin-mound"}}],competitions:[],providerships:[],total_money_raised:"$0",funding_rounds:[{id:62040,round_code:"seed",source_url:"",source_description:"",raised_amount:null,raised_currency_code:"USD",funded_year:2013,funded_month:7,funded_day:1,investments:[{company:null,financial_org:{name:"Brooklyn Bridge Ventures",permalink:"brooklyn-bridge-ventures"},person:null},{company:null,financial_org:{name:"Two Sigma Ventures",permalink:"two-sigma-ventures"},person:null}]}],investments:[],acquisition:null,acquisitions:[],offices:[{description:"",address1:"96 Spring St",address2:"7th Floor",zip_code:"10012",city:"New York",state_code:"NY",country_code:"USA",latitude:null,longitude:null}],milestones:[],ipo:null,screenshots:[{available_sizes:[[[150,131],"assets/images/resized/0029/6514/296514v1-max-150x150.png"],[[250,218],"assets/images/resized/0029/6514/296514v1-max-250x250.png"],[[450,393],"assets/images/resized/0029/6514/296514v1-max-450x450.png"]],attribution:null}],external_links:[{external_url:"http://www.adweek.com/news/technology/check-ces-new-home-security-154836",title:"New Home Security One single, elegant device"}],partners:[]}