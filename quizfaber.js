//=========================================
// File name: quizfaber.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

// APIs get + post = 76
// core : 4 + 6  = 10
// portal : 24 + 32 = 56
// result : 5 + 5 = 10

var express = require('express');
var cors = require('cors');
var app = express();
app.disable('x-powered-by');

const fileSystem = require('fs');
const fileupload = require('express-fileupload');
const dotenv = require("dotenv");
const { format } = require('date-fns');

const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require(process.env.SWAGGER_FILENAME || './swagger-base.json');

var port = process.env.PORT || 3313;
var useSession;

const homePageFile = "home.html";
const notFoundPageFile = "404.html";

const qfService = require('./services');
const qfDb = require('./database');
const qfHelper = require('./helper');
const qfLogger = require('./logger');
const pjson = require('./package.json');

const corsOptions = {
	origin: process.env.ORIGIN_ALLOWED || "*",
	methods: "GET,POST"
}

/// <summary>
/// Set the favicon
/// </summary>
app.use('/favicon.ico', express.static('public/images/faviconV2.png'));

/// <summary>
/// Running server 
/// </summary>
var server = app.listen(port, InitServer);


/// <summary>
/// Starting with release 4.16.0, a new express.json() middleware is available : body is already parsed json
/// </summary>
app.use(express.json());

/// <summary>
/// Bypass the CORS policy: 'Access-Control-Allow-Origin' header accept all domains.
/// </summary>
//app.use(cors());

/// <summary>
/// CORS policy: 'Access-Control-Allow-Origin' header is present on the requested resource with a domain.
/// </summary>
app.use(cors(corsOptions));

/// <summary>
/// Bypass the CORS policy: 'Access-Control-Allow-Origin' header accept all domains.
/// </summary>
app.use(function (req, res, next)
{
	//res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
	//res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
	var cspHost = process.env.CSP_HOST_SOURCE || "*";

	res.header(
		"Content-Security-Policy",
		"default-src 'self' " + cspHost + ";" +
		" font-src 'self' " + cspHost + ";" +
		" img-src 'self' " + cspHost + ";" +
		" script-src 'self' 'unsafe-inline' " + cspHost + ";" +
		" style-src 'self' 'unsafe-inline' " + cspHost + ";" +
		" frame-src 'none';" +
		" frame-ancestors 'none'"
	);
	res.header(
		"X-Content-Type-Options",
		"nosniff"
	);

	next();
});

/// <summary>
/// Middleware for public files (css, js, images)
/// </summary>
app.use(express.static('public'));

/// <summary>
/// Middleware for file upload
/// </summary>
app.use(fileupload());

/// <summary>
/// Swagger of APIs documentation
/// </summary>
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/// <summary>
/// ROUTE PER API 
/// </summary>
var apiCore = require('./quizfaber.api.core');
var apiResult = require('./quizfaber.api.result');
app.use('/', apiCore);
app.use('/', apiResult);


/// <summary>
/// Manage listen event
/// </summary>
function InitServer()
{
	var host = server.address().address;

	qfLogger.Log("###############################################");
	qfLogger.Log("#     QuizFaber project - Node.js server      #");
	qfLogger.Log("###############################################");
	qfLogger.Log("");
	qfLogger.Log("Listening at host %s port %s", host, port);
	qfLogger.Log("Node.js version : " + process.version);
	qfLogger.Log("Package version : " + pjson.version);

	// get config vars
	dotenv.config({
		path: `${__dirname}/process.env`
	});
	qfLogger.Log("Log level : " + process.env.LOG_LEVEL);

	useSession = (process.env.USE_SESSION === '1');
	app.set('useSession', useSession);

	// create db pool
	qfDb.InitDatabase();

	// set timezone
	process.env.TZ = 'Europe/Rome';
	qfLogger.Log("Set timezone in Node.js : " + process.env.TZ);
	qfLogger.Log("Now in Node.js : " + format(new Date(), 'dd/MM/yyyy HH:mm'));

	if (useSession) {
		qfLogger.Log("start dispatcher for update sessions");
		qfService.dispatcher();
	}
	else {
		qfLogger.LogWarn("sessions disabled");
	}

	if (qfHelper.IsDbLogEnabled()) {
		qfLogger.Log("start log dispatcher");
		qfService.dispatcherLog();
	}
}

/// <summary>
/// Getting the home page
/// </summary>
app.get('/', function (req, res) {
	qfLogger.Log("GET index");
	SendHomeResponse(req, res);
});


/// <summary>
/// Returns the html of the home page
/// </summary>
function SendHomeResponse(req, res) {

	// read home page file
	fileSystem.readFile(homePageFile, 'utf8', function (err, data) {
		if (err)
		{
			qfLogger.LogWarn('home page file not found!');
			var html = "<body><h1>Server up and running</h1></body>";
			qfHelper.SendResponseSuccess(req,res,html);
		}
		else
		{
			qfLogger.Log('found home page file');

			data = data.replace("{SERVER_NAME}", qfDb.getServerName());
			data = data.replace("{SERVER_DESCR}", qfDb.getServerDescription());

			if (qfDb.isConnected()) {
				if (qfDb.getVersion() > 0) {
					data = data.replace("{ERR_CONFIG}", "");
				}
				else {
					data = data.replace("{ERR_CONFIG}", "<div class='alert alert-warning'><b>Database is not configurated</b>. Popolate the database running the sql script <b>DB_QF_CreateTables.MySQL.sql</b></div>");
				}
			}
			else {
				data = data.replace("{ERR_CONFIG}", "<div class='alert alert-danger'><b>Not connected to database</b>. Check database connection parameters into <b>db.conf</b> file</div>");
			}

			data = data.replace("{NODE_VERS}", process.version);
			data = data.replace("{PKG_VERS}", pjson.version);

			if (qfDb.getVersion() > 0) {
				data = data.replace("{DB_VERS}", qfDb.getVersion());
			}
			else {
				data = data.replace("{DB_VERS}", "<span style='color:red'>Unknown</span>");
			}

			if (qfDb.getSize() > 0) {
				data = data.replace("{DB_SIZE}", qfDb.getSize() + " MBytes");
			}
			else {
				data = data.replace("{DB_SIZE}", "<span style='color:red'>Unknown</span>");
			}

			SendPage(res, data, 200);
		}
	});
}


// This route will handle all the requests that are 
// not handled by any other route handler. In 
// this hanlder we will redirect the user to 
// an error page with NOT FOUND message and status
// code as 404 (HTTP status code for NOT found)
app.all('*', (req, res) => {
	SendNotFoundResponse(req, res);
});

/// <summary>
/// Returns the html of the "not found" page
/// </summary>
function SendNotFoundResponse(req, res) {

	// read home page file
	fileSystem.readFile(notFoundPageFile, 'utf8', function (err, data) {
		if (err) {
			qfLogger.LogWarn('404 page file not found!');
			var html = "<body><h1>Page not found</h1></body>";
			qfHelper.SendResponseFailed(req, res, html, 404);
		}
		else {
			qfLogger.Log('found 404 page file');
			data = data.replace("{SERVER_NAME}", qfDb.getServerName());
			data = data.replace("{SERVER_DESCR}", qfDb.getServerDescription());
			SendPage(res,data,404);
		}
	});
}

function SendPage(res, data, statusCode)
{
	res.writeHead(statusCode, { 'Content-Type': 'text/html' });
	res.write(data);
	res.end();
}
