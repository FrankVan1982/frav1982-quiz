//=========================================
// File name: database.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const mariadb = require('mariadb');

const qfQuery = require('./queries');
const qfLogger = require('./logger');

const TIME_REFRESH_POOL_CONN = 600000;  // 10 minutes
const CONNECTION_LIMIT = 50;

var numOfConnections = 0;
var pool;

var connected = false;
var version = 0;
var serverName = '';
var serverDescription = '';
var size = 0;
var timezone = 0;

var connStats = new Map();

/// <summary>
/// Gets connections pool
/// </summary>
function getPool() {
	return pool;
}

/// <summary>
/// True if connected to database
/// </summary>
function isConnected() {
	return connected;
}

/// <summary>
/// Gets the number of connections
/// </summary>
function getConnectionLimit() {
	return process.env.DB_CONNECTION_LIMIT || CONNECTION_LIMIT;
}

/// <summary>
/// Gets server name
/// </summary>
function getServerName() {
	return serverName;
}

/// <summary>
/// Gets server description
/// </summary>
function getServerDescription() {
	return serverDescription;
}

/// <summary>
/// Gets database version
/// </summary>
function getVersion() {
	return version;
}

/// <summary>
/// Gets database size (MBytes)
/// </summary>
function getSize() {
	return size;
}

/// <summary>
/// Gets database timezone 
/// </summary>
function getTimezone() {
	return timezone;
}

/// <summary>
/// Database inizialization 
/// </summary>
async function InitDatabase()
{
	qfLogger.Log("connecting to db host : " + process.env.DB_HOST + " , database : " + process.env.DB_NAME + "..");

	var pwd = "";
	if (process.env.DB_PASSWORD) {
		pwd = process.env.DB_PASSWORD.trim();
	}

	// create connection pool
	pool = mariadb.createPool({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: pwd,
		database: process.env.DB_NAME,
		connectionLimit: getConnectionLimit(),
		//waitForConnections: true,
		//acquireTimeout: 20000,
		//queueLimit: 0,
		multipleStatements: true
		//timezone: 'UTC'
	});

	qfLogger.Log("created connection pool for db : " + process.env.DB_HOST);

	pool.on('connection', connection => ManageCreateConn(connection));
	pool.on('acquire', connection => ManageAquireConn(connection));
	pool.on('release', connection => ManageReleaseConn (connection));
	pool.on('enqueue', () => ManageEnqueueConn());

	// check connection , read table 'Settings' and check db size
	pool.getConnection()
		.then(conn => ReadDbInfo(conn))
		.catch(err => {
			//not connected
			qfLogger.LogError('Cannot connect to database : ' + err);
			throw err;
		});
}

/// <summary>
/// Create connection
/// </summary>
function ManageCreateConn(connection)
{
	numOfConnections++;
	qfLogger.Log("CREATE CONN :" + numOfConnections + ", ID = " + connection.threadId);

	// set the time zone
	/*connection.query("SET time_zone='+00:00';", err => {
	  if (err) {
		  qfLogger.Log('cannot set timezone');
		  console.error('ERROR : ' + err);
		  throw err;
	  }
	})*/

	// keep the connection alive
	setInterval(function () {
		pool.query('SELECT 1');
	}, TIME_REFRESH_POOL_CONN);
}

/// <summary>
/// Aquire connection
/// </summary>
function ManageAquireConn(connection)
{
	qfLogger.LogDebug('--> Connection ' + connection.threadId + ' acquired')

	if (qfLogger.GetLogLevel() <= 0)
	{
		var stat = connStats.get(connection.threadId);
		if (stat) {
			stat.timeStart = new Date().getTime();
			stat.used++;
		}
		else {
			stat = { timeStart: new Date().getTime(), used: 1, duration: 0 }
		}
		connStats.set(connection.threadId, stat);
	}
}

/// <summary>
/// Release connection
/// </summary>
function ManageReleaseConn(connection)
{
	qfLogger.LogDebug('--> Connection ' + connection.threadId + ' released');

	if (qfLogger.GetLogLevel() <= 0)
	{
		var stat = connStats.get(connection.threadId);
		if (stat) {
			var timeStop = new Date().getTime();
			stat.duration += timeStop - stat.timeStart;
			connStats.set(connection.threadId, stat);
		}

		for (let [key, value] of connStats) {
			qfLogger.LogDebug(key + " : used = " + value.used + " , duration = " + value.duration);
		}
	}
}

/// <summary>
/// Enqueue connection
/// </summary>
function ManageEnqueueConn()
{
	qfLogger.Log('--> Waiting for available connection slot');
}

/// <summary>
/// Reads database info (db settings and db size)
/// </summary>
function ReadDbInfo(conn)
{
	qfLogger.LogDebug("Connection opened, ID=" + conn.threadId);
	connected = true;

	conn.query(qfQuery.GetQueryStringForGetServerSettings())
		.then((rows) => {
			if (rows.length >= 1) {

				version = rows[0].DbVersion;
				serverName = rows[0].ServerName;
				serverDescription = rows[0].ServerDescription;

				qfLogger.Log("found QuizFaber DB version : " + version);

				conn.query(qfQuery.GetQueryStringForDbSize(process.env.DB_NAME))
					.then((rows) => {

						if (rows.length >= 1) {
							size = rows[0].dbsize;

							qfLogger.Log("found QuizFaber DB size : " + size);

							conn.query(qfQuery.GetQueryStringForDbTimezone())
								.then((rows) => {
									if (rows.length >= 1) {
										timezone = rows[0].tz;
										qfLogger.Log("Timezone : " + timezone);
									}
								})
								.catch(err => {
									qfLogger.LogError('Cannot read timezone, ' + err);
								});
						}
						else {
							qfLogger.LogError("Unable to check QuizFaber DB size");
						}
					})
					.catch(err => {
						// select db size failed
						qfLogger.LogError('Cannot check database size, ' + err);
					})
			}
			else {
				qfLogger.LogError("Unable to find QuizFaber DB version");
			}
		})
		.catch(err => {
			qfLogger.LogError('Cannot select from table Settings, ' + err);
		})
		.finally(() => {
			qfLogger.LogDebug("Connection closed, ID=" + conn.threadId);
			conn.end();
		});
}

module.exports = { InitDatabase, getPool, isConnected, getConnectionLimit, getServerName, getVersion, getServerDescription, getSize, getTimezone };