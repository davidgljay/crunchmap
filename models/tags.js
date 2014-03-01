var neo4j = require('node-neo4j');
var db = new neo4j(process.env.NEO4J_DB);
var async = require('async');