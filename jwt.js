//=========================================
// File name: jwt.js
//-----------------------------------------
// Project : QuizFaber 
// Licence : MIT
// Author  : Luca Galli
// Email   : info@quizfaber.com
//=========================================

const jwt = require("jsonwebtoken");
const helper = require('./helper');

/// <summary>
/// Return the expires in time of a token
/// </summary>
function GetExpiresIn()
{
	if (process.env.TOKEN_EXPIRESIN_SEC) {
		return parseInt(process.env.TOKEN_EXPIRESIN_SEC);
	}
	return 10800; // 3 hours
}

/// <summary>
/// Authenticate the token.
/// </summary>
function authenticateToken(req, res, next)
{
	//helper.Log("Autenticate with token..");

	// Gather the jwt access token from the request header
	const authHeader = req.headers['authorization']
	const token = authHeader && authHeader.split(' ')[1]

	if (token === null)
	{
		helper.SendUnauthorized(req, res, "no token found"); // if there isn't any token
	}
	else
	{
		jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
			if (err)
			{
				var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
				helper.SendForbidden(req, res, "token mismatch from " + fullUrl);
			}
			else
			{
				req.user = user;
				//helper.Log("Autenticate ok for user " + JSON.stringify(user));
				next(); // pass the execution off to whatever request the client intended
			}
		})
	}
}

/// <summary>
/// Generate access token.
/// </summary>
function generateAccessToken(username)
{
	return jwt.sign({ id: username }, process.env.TOKEN_SECRET, { expiresIn: GetExpiresIn() });
}


module.exports = { GetExpiresIn, authenticateToken, generateAccessToken }