var neo4j = require('node-neo4j'), 
db,
config = require('./config.js');

if ('development' == process.env.NODE_ENV) {
	config.setup();
	db = new neo4j('localhost:7474');
} else if ('production' == process.env.NODE_ENV) {
	db = new neo4j(process.env.NEO4J_DB);
} else if ('test' == process.env.NODE_ENV) {
	db = new neo4j('localhost:7474');
	config.setup();
};

module.exports = db;